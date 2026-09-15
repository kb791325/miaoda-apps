import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from '@lark-apaas/fullstack-nestjs-core';
import {
  and,
  count,
  desc,
  eq,
  ilike,
  inArray,
  like,
  or,
  sql,
  type Column,
  type SQL,
} from 'drizzle-orm';
import {
  courseGeneralTable,
  graduationRecordTable,
  studentRegistrationTable,
} from '@server/database/schema';
import { BitableSyncService } from '@server/src/common/bitable-sync/bitable-sync.service';
import { computeNextCertNo } from '@server/src/common/utils/cert-no';
import {
  containsPattern,
  escapeLikePattern,
} from '@server/src/common/utils/like';
import { normalizeAttendancePercent } from '@server/src/common/utils/percent';
import { isValidDay, shanghaiDayKey } from '@server/src/common/utils/date';
import { resolveDisplaySyncStatus } from '@shared/bitable-sync';
import type { BitableSyncResult } from '@shared/bitable-sync';
import {
  CERT_ISSUANCE_ISSUED,
  CERT_ISSUANCE_NOT_ISSUED,
} from '@shared/graduation';
import type {
  CreateGraduationRequest,
  CreateGraduationResponse,
  GraduationCourseRef,
  GraduationListResponse,
  GraduationRecordItem,
  IssueCertificateResponse,
  UpdateGraduationRequest,
  UpdateGraduationResponse,
} from '@shared/graduation';

export interface GraduationListQuery {
  studentId?: string;
  keyword?: string;
  page: number;
  pageSize: number;
}

type GraduationRow = typeof graduationRecordTable.$inferSelect;
type GraduationInsert = typeof graduationRecordTable.$inferInsert;
type StudentRow = typeof studentRegistrationTable.$inferSelect;
type CourseRow = typeof courseGeneralTable.$inferSelect;
type StudentInsert = typeof studentRegistrationTable.$inferInsert;
/** Drizzle 事务实例类型（从 PostgresJsDatabase.transaction 推导） */
type DbTransaction = Parameters<
  Parameters<PostgresJsDatabase['transaction']>[0]
>[0];

/** 证书编号冲突乐观重试上限（graduation_cert_no 唯一索引兜底） */
const CERT_NO_MAX_RETRIES = 5;

function extractPostgresErrorCode(error: unknown): string | undefined {
  let current: unknown = error;
  for (
    let depth = 0;
    depth < 4 && current && typeof current === 'object';
    depth += 1
  ) {
    const { code, cause } = current as { code?: unknown; cause?: unknown };
    if (typeof code === 'string') {
      return code;
    }
    current = cause;
  }
  return undefined;
}

const UUID_PATTERN: RegExp =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

function extractLinkRecordIds(value: unknown): string[] {
  if (typeof value !== 'object' || value === null) {
    return [];
  }
  const candidate: { link_record_ids?: unknown } = value as {
    link_record_ids?: unknown;
  };
  if (!Array.isArray(candidate.link_record_ids)) {
    return [];
  }
  return (candidate.link_record_ids as unknown[]).filter(
    (id: unknown): id is string => typeof id === 'string',
  );
}

@Injectable()
export class GraduationService {
  private readonly logger = new Logger(GraduationService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    private readonly bitableSyncService: BitableSyncService,
  ) {}

  private linkContains(column: Column, linkKey: string): SQL {
    return sql`${column}->'link_record_ids' @> ${JSON.stringify(
      [linkKey],
    )}::jsonb`;
  }

  private studentLinkCondition(student: StudentRow): SQL {
    const conditions: SQL[] = [
      this.linkContains(graduationRecordTable.relatedStudent, student.id),
    ];
    if (student.baseRecordId) {
      conditions.push(
        this.linkContains(
          graduationRecordTable.relatedStudent,
          student.baseRecordId,
        ),
      );
    }
    if (conditions.length === 1) {
      return conditions[0];
    }
    const combined: SQL | undefined = or(...conditions);
    return combined as SQL;
  }

  private async getStudentRow(studentId: string): Promise<StudentRow> {
    const rows: StudentRow[] = await this.db
      .select()
      .from(studentRegistrationTable)
      .where(eq(studentRegistrationTable.id, studentId));
    const row: StudentRow | undefined = rows[0];
    if (!row) {
      throw new NotFoundException(`学员 ${studentId} 不存在`);
    }
    return row;
  }

  private async resolveLinkedEntities(
    rows: GraduationRow[],
  ): Promise<{
    studentByLinkKey: Map<string, { id: string; studentName: string }>;
    courseByLinkKey: Map<string, GraduationCourseRef>;
  }> {
    const linkKeys: Set<string> = new Set<string>();
    rows.forEach((row: GraduationRow) => {
      extractLinkRecordIds(row.relatedStudent).forEach((key: string) =>
        linkKeys.add(key),
      );
      extractLinkRecordIds(row.relatedCourse).forEach((key: string) =>
        linkKeys.add(key),
      );
    });

    const studentByLinkKey = new Map<
      string,
      { id: string; studentName: string }
    >();
    const courseByLinkKey = new Map<string, GraduationCourseRef>();
    if (linkKeys.size === 0) {
      return { studentByLinkKey, courseByLinkKey };
    }

    const allKeys: string[] = [...linkKeys];
    const uuidKeys: string[] = allKeys.filter((key: string) =>
      UUID_PATTERN.test(key),
    );
    const baseKeys: string[] = allKeys.filter(
      (key: string) => !UUID_PATTERN.test(key),
    );

    if (uuidKeys.length > 0 || baseKeys.length > 0) {
      const studentRows: StudentRow[] = await this.db
        .select()
        .from(studentRegistrationTable)
        .where(
          or(
            baseKeys.length > 0
              ? inArray(studentRegistrationTable.baseRecordId, baseKeys)
              : undefined,
            uuidKeys.length > 0
              ? inArray(studentRegistrationTable.id, uuidKeys)
              : undefined,
          ),
        );
      studentRows.forEach((student: StudentRow) => {
        const entry: { id: string; studentName: string } = {
          id: student.id,
          studentName: student.studentName ?? '',
        };
        studentByLinkKey.set(student.id, entry);
        if (student.baseRecordId) {
          studentByLinkKey.set(student.baseRecordId, entry);
        }
      });

      const courseRows: CourseRow[] = await this.db
        .select()
        .from(courseGeneralTable)
        .where(
          or(
            baseKeys.length > 0
              ? inArray(courseGeneralTable.baseRecordId, baseKeys)
              : undefined,
            uuidKeys.length > 0
              ? inArray(courseGeneralTable.id, uuidKeys)
              : undefined,
          ),
        );
      courseRows.forEach((course: CourseRow) => {
        const entry: GraduationCourseRef = {
          id: course.id,
          courseName: course.courseName ?? '',
        };
        courseByLinkKey.set(course.id, entry);
        if (course.baseRecordId) {
          courseByLinkKey.set(course.baseRecordId, entry);
        }
      });
    }

    return { studentByLinkKey, courseByLinkKey };
  }

  private toItem(
    row: GraduationRow,
    studentByLinkKey: Map<string, { id: string; studentName: string }>,
    courseByLinkKey: Map<string, GraduationCourseRef>,
  ): GraduationRecordItem {
    const studentLinkIds: string[] = extractLinkRecordIds(row.relatedStudent);
    const studentEntry:
      | { id: string; studentName: string }
      | undefined = studentLinkIds
      .map((key: string) => studentByLinkKey.get(key))
      .find((entry): entry is { id: string; studentName: string } =>
        Boolean(entry),
      );
    const courseLinkIds: string[] = extractLinkRecordIds(row.relatedCourse);
    const courses: GraduationCourseRef[] = [];
    const seenCourseIds: Set<string> = new Set<string>();
    courseLinkIds.forEach((key: string) => {
      const courseEntry: GraduationCourseRef | undefined =
        courseByLinkKey.get(key);
      if (courseEntry && !seenCourseIds.has(courseEntry.id)) {
        seenCourseIds.add(courseEntry.id);
        courses.push(courseEntry);
      }
    });
    return {
      id: row.id,
      graduationCertNo: row.graduationCertNo,
      studentId: studentEntry?.id ?? null,
      studentName: studentEntry?.studentName ?? '',
      courses,
      trainingStartDate: row.trainingStartDate,
      trainingEndDate: row.trainingEndDate,
      totalClassHours: Number(row.totalClassHours ?? 0),
      attendanceHours: Number(row.attendanceHours ?? 0),
      attendanceRate: normalizeAttendancePercent({
        attendanceRate: row.attendanceRate,
        attendanceHours: row.attendanceHours,
        totalClassHours: row.totalClassHours,
      }),
      practicalEvaluation: row.practicalEvaluation,
      theoreticalEvaluation: row.theoreticalEvaluation,
      graduationDate: row.graduationDate,
      certificateIssuanceStatus:
        row.certificateIssuanceStatus ?? CERT_ISSUANCE_NOT_ISSUED,
      syncStatus: resolveDisplaySyncStatus(
        row.syncStatus,
        row.bitableRecordId,
        row.baseRecordId,
      ),
    };
  }

  async listGraduations(
    query: GraduationListQuery,
  ): Promise<GraduationListResponse> {
    const conditions: SQL[] = [];

    if (query.studentId) {
      const student: StudentRow = await this.getStudentRow(query.studentId);
      conditions.push(this.studentLinkCondition(student));
    }

    const trimmedKeyword: string = (query.keyword ?? '').trim();
    if (trimmedKeyword) {
      const matchedStudents: Array<{
        id: string;
        baseRecordId: string | null;
      }> = await this.db
        .select({
          id: studentRegistrationTable.id,
          baseRecordId: studentRegistrationTable.baseRecordId,
        })
        .from(studentRegistrationTable)
        .where(
          ilike(studentRegistrationTable.studentName, containsPattern(trimmedKeyword)),
        );
      const keyConditions: SQL[] = [];
      matchedStudents.forEach(
        (student: { id: string; baseRecordId: string | null }) => {
          keyConditions.push(
            this.linkContains(graduationRecordTable.relatedStudent, student.id),
          );
          if (student.baseRecordId) {
            keyConditions.push(
              this.linkContains(
                graduationRecordTable.relatedStudent,
                student.baseRecordId,
              ),
            );
          }
        },
      );
      const certCondition: SQL = ilike(
        graduationRecordTable.graduationCertNo,
        containsPattern(trimmedKeyword),
      );
      const keywordCondition: SQL | undefined =
        keyConditions.length > 0
          ? or(certCondition, ...keyConditions)
          : certCondition;
      if (keywordCondition) {
        conditions.push(keywordCondition);
      }
    }

    const whereClause: SQL | undefined =
      conditions.length > 0 ? and(...conditions) : undefined;

    const rows: GraduationRow[] = await this.db
      .select()
      .from(graduationRecordTable)
      .where(whereClause)
      .orderBy(desc(graduationRecordTable.createdAt))
      .limit(query.pageSize)
      .offset((query.page - 1) * query.pageSize);

    const totalRows: Array<{ count: number }> = await this.db
      .select({ count: count() })
      .from(graduationRecordTable)
      .where(whereClause);
    const total: number = Number(totalRows[0]?.count ?? 0);

    const { studentByLinkKey, courseByLinkKey } =
      await this.resolveLinkedEntities(rows);
    const items: GraduationRecordItem[] = rows.map((row: GraduationRow) =>
      this.toItem(row, studentByLinkKey, courseByLinkKey),
    );

    this.logger.log(
      `结业档案列表查询：page=${query.page}, pageSize=${query.pageSize}, total=${total}`,
    );

    return { items, total };
  }

  /** 证书编号：前缀 = PPX + 结业年月，序号取同前缀最大值 +1；调用方在事务咨询锁内执行 */
  private async generateCertNo(
    tx: PostgresJsDatabase | DbTransaction,
    baseDate: string,
  ): Promise<string> {
    const certRows: Array<{ graduationCertNo: string | null }> = await tx
      .select({ graduationCertNo: graduationRecordTable.graduationCertNo })
      .from(graduationRecordTable);
    const existing: Array<string | null> = certRows.map(
      (row: { graduationCertNo: string | null }): string | null =>
        row.graduationCertNo,
    );
    return computeNextCertNo(existing, baseDate);
  }

  /**
   * 并发登记防重号：依赖 graduation_cert_no 唯一索引，
   * 编号冲突（23505）时重新读取已有编号并重试，绝不产生重复编号。
   */
  private async insertWithUniqueCertNo(
    insertValue: GraduationInsert,
    baseDate: string,
  ): Promise<{ graduationCertNo: string; insertedId: string | undefined }> {
    for (let attempt = 0; attempt < CERT_NO_MAX_RETRIES; attempt += 1) {
      const graduationCertNo: string = await this.generateCertNo(
        this.db,
        baseDate,
      );
      try {
        const inserted: Array<{ id: string }> = await this.db
          .insert(graduationRecordTable)
          .values({ ...insertValue, graduationCertNo })
          .returning({ id: graduationRecordTable.id });
        return { graduationCertNo, insertedId: inserted[0]?.id };
      } catch (error: unknown) {
        const isLastAttempt: boolean = attempt === CERT_NO_MAX_RETRIES - 1;
        if (extractPostgresErrorCode(error) === '23505' && !isLastAttempt) {
          this.logger.warn(
            `结业证书编号冲突重试：${JSON.stringify({ attempt, baseDate })}`,
          );
          continue;
        }
        throw error;
      }
    }
    throw new ConflictException('证书编号生成失败，请重试');
  }

  async createGraduation(
    dto: CreateGraduationRequest,
    operatorId: string,
  ): Promise<CreateGraduationResponse> {
    if (dto.graduationDate && !isValidDay(dto.graduationDate)) {
      throw new BadRequestException('结业日期格式不正确，应为 YYYY-MM-DD');
    }
    if (dto.trainingStartDate && !isValidDay(dto.trainingStartDate)) {
      throw new BadRequestException('培训开始日期格式不正确，应为 YYYY-MM-DD');
    }
    if (dto.trainingEndDate && !isValidDay(dto.trainingEndDate)) {
      throw new BadRequestException('培训结束日期格式不正确，应为 YYYY-MM-DD');
    }
    const student: StudentRow = await this.getStudentRow(dto.studentId);

    const courseRows: CourseRow[] = await this.db
      .select()
      .from(courseGeneralTable)
      .where(inArray(courseGeneralTable.id, dto.courseIds));
    if (courseRows.length !== dto.courseIds.length) {
      throw new NotFoundException('存在不存在的课程');
    }

    const studentRecords: GraduationRow[] = await this.db
      .select()
      .from(graduationRecordTable)
      .where(this.studentLinkCondition(student));
    const existingCourseKeys: Set<string> = new Set<string>();
    studentRecords.forEach((record: GraduationRow) => {
      extractLinkRecordIds(record.relatedCourse).forEach((key: string) =>
        existingCourseKeys.add(key),
      );
    });
    for (const course of courseRows) {
      const courseKeys: string[] = course.baseRecordId
        ? [course.baseRecordId, course.id]
        : [course.id];
      if (courseKeys.some((key: string) => existingCourseKeys.has(key))) {
        throw new ConflictException(
          `该学员在课程「${course.courseName ?? course.id}」下已有结业档案`,
        );
      }
    }

    if (dto.totalClassHours <= 0) {
      throw new BadRequestException('总课时必须大于 0');
    }
    if (dto.attendanceHours < 0) {
      throw new BadRequestException('出勤课时不能为负数');
    }

    const baseDate: string = dto.graduationDate ?? shanghaiDayKey();
    const attendanceRate: number =
      Math.round((dto.attendanceHours / dto.totalClassHours) * 1000) / 10;

    const courseLinkIds: string[] = courseRows.map(
      (course: CourseRow) => course.baseRecordId ?? course.id,
    );

    const insertValue: GraduationInsert = {
      graduationCertNo: '',
      relatedStudent: { link_record_ids: [student.baseRecordId ?? student.id] },
      relatedCourse: { link_record_ids: courseLinkIds },
      trainingStartDate: dto.trainingStartDate,
      trainingEndDate: dto.trainingEndDate,
      totalClassHours: String(dto.totalClassHours),
      attendanceHours: String(dto.attendanceHours),
      attendanceRate: String(attendanceRate),
      practicalEvaluation: dto.practicalEvaluation ?? null,
      theoreticalEvaluation: dto.theoreticalEvaluation ?? null,
      graduationDate: dto.graduationDate ?? baseDate,
      certificateIssuanceStatus: CERT_ISSUANCE_NOT_ISSUED,
      createdBy: operatorId,
      updatedBy: operatorId,
    };

    const certResult: { graduationCertNo: string; insertedId: string | undefined } =
      await this.insertWithUniqueCertNo(insertValue, baseDate);
    const graduationCertNo: string = certResult.graduationCertNo;
    const insertedId: string | undefined = certResult.insertedId;
    if (!insertedId) {
      throw new NotFoundException('结业档案写入失败');
    }

    this.logger.log(
      `结业登记成功：${JSON.stringify({
        id: insertedId,
        studentId: dto.studentId,
        graduationCertNo,
        courseCount: courseRows.length,
      })}`,
    );

    const syncResult: BitableSyncResult =
      await this.bitableSyncService.syncRecord('graduation', insertedId);

    return {
      id: insertedId,
      graduationCertNo,
      attendanceRate,
      syncStatus: syncResult.syncStatus,
    };
  }

  async updateGraduation(
    graduationId: string,
    dto: UpdateGraduationRequest,
    operatorId: string,
  ): Promise<UpdateGraduationResponse> {
    const patch: Partial<GraduationInsert> = {};
    if (dto.practicalEvaluation !== undefined) {
      patch.practicalEvaluation = dto.practicalEvaluation;
    }
    if (dto.theoreticalEvaluation !== undefined) {
      patch.theoreticalEvaluation = dto.theoreticalEvaluation;
    }
    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('未提供可更新字段');
    }
    patch.updatedAt = new Date();
    patch.updatedBy = operatorId;

    const updated: Array<{ id: string }> = await this.db
      .update(graduationRecordTable)
      .set(patch)
      .where(eq(graduationRecordTable.id, graduationId))
      .returning({ id: graduationRecordTable.id });
    if (updated.length === 0) {
      throw new NotFoundException(`结业档案 ${graduationId} 不存在`);
    }

    this.logger.log(
      `结业档案更新：${JSON.stringify({ id: graduationId })}`,
    );

    const syncResult: BitableSyncResult =
      await this.bitableSyncService.syncRecord('graduation', graduationId);
    return { id: graduationId, syncStatus: syncResult.syncStatus };
  }

  async issueCertificate(
    graduationId: string,
    operatorId: string,
  ): Promise<IssueCertificateResponse> {
    const rows: GraduationRow[] = await this.db
      .select()
      .from(graduationRecordTable)
      .where(eq(graduationRecordTable.id, graduationId));
    const row: GraduationRow | undefined = rows[0];
    if (!row) {
      throw new NotFoundException(`结业档案 ${graduationId} 不存在`);
    }
    if (row.certificateIssuanceStatus === CERT_ISSUANCE_ISSUED) {
      throw new ConflictException('该档案已发证，请勿重复操作');
    }

    await this.db.transaction(async (tx: DbTransaction) => {
      const updated: Array<{ id: string }> = await tx
        .update(graduationRecordTable)
        .set({
          certificateIssuanceStatus: CERT_ISSUANCE_ISSUED,
          updatedAt: new Date(),
          updatedBy: operatorId,
        })
        .where(eq(graduationRecordTable.id, graduationId))
        .returning({ id: graduationRecordTable.id });
      if (updated.length === 0) {
        throw new NotFoundException(`结业档案 ${graduationId} 不存在`);
      }

      const studentLinkIds: string[] = extractLinkRecordIds(row.relatedStudent);
      if (studentLinkIds.length > 0) {
        const uuidIds: string[] = studentLinkIds.filter((key: string) =>
          UUID_PATTERN.test(key),
        );
        const baseIds: string[] = studentLinkIds.filter(
          (key: string) => !UUID_PATTERN.test(key),
        );
        const studentPatch: Partial<StudentInsert> = {
          studyProgress: '已结业',
          graduationDate: row.graduationDate,
          updatedAt: new Date(),
          updatedBy: operatorId,
        };
        await tx
          .update(studentRegistrationTable)
          .set(studentPatch)
          .where(
            or(
              baseIds.length > 0
                ? inArray(studentRegistrationTable.baseRecordId, baseIds)
                : undefined,
              uuidIds.length > 0
                ? inArray(studentRegistrationTable.id, uuidIds)
                : undefined,
            ),
          );
      }
    });

    this.logger.log(
      `结业档案发证：${JSON.stringify({
        id: graduationId,
        graduationCertNo: row.graduationCertNo,
      })}`,
    );

    const syncResult: BitableSyncResult =
      await this.bitableSyncService.syncRecord('graduation', graduationId);
    return {
      id: graduationId,
      graduationDate: row.graduationDate,
      syncStatus: syncResult.syncStatus,
    };
  }
}
