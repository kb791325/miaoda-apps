import {
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
  not,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import {
  attendanceRecordTable,
  courseGeneralTable,
  courseScheduleTable,
  graduationRecordTable,
  studentRegistrationTable,
} from '@server/database/schema';
import { FeishuMessageService } from '@server/src/common/feishu-message/feishu-message.service';
import { BitableSyncService } from '@server/src/common/bitable-sync/bitable-sync.service';
import { resolveDisplaySyncStatus } from '@shared/bitable-sync';
import type { BitableSyncResult } from '@shared/bitable-sync';
import type { StudentGraduationSummary } from '@shared/graduation';
import type {
  CreateStudentRequest,
  CreateStudentResponse,
  StudentAttendanceItem,
  StudentBitableSyncResponse,
  StudentCourseRef,
  StudentDetail,
  StudentDetailResponse,
  StudentListItem,
  StudentListResponse,
  UpdatePaymentRequest,
  UpdatePaymentResponse,
  UpdateStudentRequest,
  UpdateStudentResponse,
} from '@shared/student';

export interface StudentListQuery {
  paymentStatus?: string;
  channel?: string;
  progress?: string;
  graduationStatus?: string;
  keyword?: string;
  page: number;
  pageSize: number;
}

const UUID_PATTERN: RegExp =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

type StudentRow = typeof studentRegistrationTable.$inferSelect;
type StudentInsert = typeof studentRegistrationTable.$inferInsert;
type AttendanceRow = typeof attendanceRecordTable.$inferSelect;
type ScheduleRow = typeof courseScheduleTable.$inferSelect;
type GraduationLinkRow = {
  relatedStudent: unknown;
  graduationCertNo: string | null;
  graduationDate: string | null;
};

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
export class StudentService {
  private readonly logger = new Logger(StudentService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    private readonly feishuMessageService: FeishuMessageService,
    private readonly bitableSyncService: BitableSyncService,
  ) {}

  private linkContainsStudent(baseRecordId: string): SQL {
    return sql`${attendanceRecordTable.appStudent}->'link_record_ids' @> ${JSON.stringify(
      [baseRecordId],
    )}::jsonb`;
  }

  async listStudents(query: StudentListQuery): Promise<StudentListResponse> {
    const conditions: SQL[] = [];
    if (query.paymentStatus) {
      conditions.push(
        eq(studentRegistrationTable.paymentStatus, query.paymentStatus),
      );
    }
    if (query.channel) {
      conditions.push(eq(studentRegistrationTable.sourceChannel, query.channel));
    }
    if (query.progress) {
      conditions.push(eq(studentRegistrationTable.studyProgress, query.progress));
    }
    const hasGraduationFilter: boolean =
      query.graduationStatus === 'graduated' ||
      query.graduationStatus === 'not_graduated';
    const graduationSummaryByLinkKey: Map<string, StudentGraduationSummary> =
      new Map<string, StudentGraduationSummary>();
    let graduatedLinkKeys: string[] = [];
    if (hasGraduationFilter) {
      // 带结业状态过滤时需要全量 linkKeys 参与过滤，保留全量查询结业记录
      const graduationRows: GraduationLinkRow[] = await this.db
        .select({
          relatedStudent: graduationRecordTable.relatedStudent,
          graduationCertNo: graduationRecordTable.graduationCertNo,
          graduationDate: graduationRecordTable.graduationDate,
        })
        .from(graduationRecordTable);
      graduationRows.forEach((row: GraduationLinkRow) => {
        extractLinkRecordIds(row.relatedStudent).forEach((key: string) => {
          if (!graduatedLinkKeys.includes(key)) {
            graduatedLinkKeys.push(key);
          }
          if (!graduationSummaryByLinkKey.has(key)) {
            graduationSummaryByLinkKey.set(key, {
              graduationCertNo: row.graduationCertNo,
              graduationDate: row.graduationDate,
            });
          }
        });
      });
    }
    if (hasGraduationFilter) {
      const uuidKeys: string[] = graduatedLinkKeys.filter((key: string) =>
        UUID_PATTERN.test(key),
      );
      const baseKeys: string[] = graduatedLinkKeys.filter(
        (key: string) => !UUID_PATTERN.test(key),
      );
      const graduatedCondition: SQL | undefined = or(
        baseKeys.length > 0
          ? inArray(studentRegistrationTable.baseRecordId, baseKeys)
          : undefined,
        uuidKeys.length > 0
          ? inArray(studentRegistrationTable.id, uuidKeys)
          : undefined,
      );
      if (query.graduationStatus === 'graduated') {
        conditions.push(graduatedCondition ?? sql`false`);
      } else if (graduatedCondition) {
        conditions.push(not(graduatedCondition));
      }
    }
    if (query.keyword) {
      const keywordCondition: SQL | undefined = or(
        ilike(studentRegistrationTable.studentName, `%${query.keyword}%`),
        ilike(studentRegistrationTable.contactPhone, `%${query.keyword}%`),
      );
      if (keywordCondition) {
        conditions.push(keywordCondition);
      }
    }
    const whereClause: SQL | undefined =
      conditions.length > 0 ? and(...conditions) : undefined;

    const rows: StudentRow[] = await this.db
      .select()
      .from(studentRegistrationTable)
      .where(whereClause)
      .orderBy(desc(studentRegistrationTable.createdAt))
      .limit(query.pageSize)
      .offset((query.page - 1) * query.pageSize);

    const totalRows: Array<{ count: number }> = await this.db
      .select({ count: count() })
      .from(studentRegistrationTable)
      .where(whereClause);
    const total: number = Number(totalRows[0]?.count ?? 0);

    this.logger.log(
      `学员列表查询：page=${query.page}, pageSize=${query.pageSize}, total=${total}`,
    );

    if (!hasGraduationFilter) {
      // 无结业状态过滤时，仅按当页 linkIds 裁剪查询结业记录，避免每次分页全表扫描
      const pageLinkIds: string[] = [];
      rows.forEach((row: StudentRow) => {
        if (row.baseRecordId) {
          pageLinkIds.push(row.baseRecordId);
        }
        pageLinkIds.push(row.id);
      });
      const uniqueLinkIds: string[] = [...new Set(pageLinkIds)];
      if (uniqueLinkIds.length > 0) {
        const linkConditions: SQL[] = uniqueLinkIds.map((key: string) => {
          return sql`${graduationRecordTable.relatedStudent}->'link_record_ids' @> ${JSON.stringify(
            [key],
          )}::jsonb`;
        });
        const graduationRows: GraduationLinkRow[] = await this.db
          .select({
            relatedStudent: graduationRecordTable.relatedStudent,
            graduationCertNo: graduationRecordTable.graduationCertNo,
            graduationDate: graduationRecordTable.graduationDate,
          })
          .from(graduationRecordTable)
          .where(or(...linkConditions));
        graduationRows.forEach((row: GraduationLinkRow) => {
          extractLinkRecordIds(row.relatedStudent).forEach((key: string) => {
            if (!graduationSummaryByLinkKey.has(key)) {
              graduationSummaryByLinkKey.set(key, {
                graduationCertNo: row.graduationCertNo,
                graduationDate: row.graduationDate,
              });
            }
          });
        });
      }
    }

    const items: StudentListItem[] = rows.map((row: StudentRow) => {
      const summary: StudentGraduationSummary | undefined = row.baseRecordId
        ? graduationSummaryByLinkKey.get(row.baseRecordId) ??
          graduationSummaryByLinkKey.get(row.id)
        : graduationSummaryByLinkKey.get(row.id);
      return {
        id: row.id,
        studentName: row.studentName ?? '',
        contactPhone: row.contactPhone ?? '',
        sourceChannel: row.sourceChannel,
        enrollmentDate: row.enrollmentDate,
        paymentStatus: row.paymentStatus,
        paymentAmount: Number(row.paymentAmount ?? 0),
        studyProgress: row.studyProgress,
        learningManager: row.learningManager,
        bitableRecordId: row.bitableRecordId,
        syncStatus: resolveDisplaySyncStatus(
          row.syncStatus,
          row.bitableRecordId,
          row.baseRecordId,
        ),
        graduation: summary ?? null,
      };
    });

    return { items, total };
  }

  async getStudentDetail(studentId: string): Promise<StudentDetailResponse> {
    const rows: StudentRow[] = await this.db
      .select()
      .from(studentRegistrationTable)
      .where(eq(studentRegistrationTable.id, studentId));
    const row: StudentRow | undefined = rows[0];
    if (!row) {
      throw new NotFoundException(`学员 ${studentId} 不存在`);
    }

    const courseRecordIds: string[] = extractLinkRecordIds(row.enrollCourse);
    let courses: StudentCourseRef[] = [];
    if (courseRecordIds.length > 0) {
      const uuidCourseIds: string[] = courseRecordIds.filter((value: string) =>
        UUID_PATTERN.test(value),
      );
      const baseCourseIds: string[] = courseRecordIds.filter(
        (value: string) => !UUID_PATTERN.test(value),
      );
      const courseRows: Array<{ id: string; courseName: string | null }> =
        await this.db
          .select({
            id: courseGeneralTable.id,
            courseName: courseGeneralTable.courseName,
          })
          .from(courseGeneralTable)
          .where(
            or(
              baseCourseIds.length > 0
                ? inArray(courseGeneralTable.baseRecordId, baseCourseIds)
                : undefined,
              uuidCourseIds.length > 0
                ? inArray(courseGeneralTable.id, uuidCourseIds)
                : undefined,
            ),
          );
      courses = courseRows.map(
        (course: { id: string; courseName: string | null }) => ({
          id: course.id,
          courseName: course.courseName ?? '',
        }),
      );
    }

    let attendanceRecords: StudentAttendanceItem[] = [];
    {
      const studentLinkKey: string = row.baseRecordId ?? row.id;
      const attendanceRows: AttendanceRow[] = await this.db
        .select()
        .from(attendanceRecordTable)
        .where(this.linkContainsStudent(studentLinkKey))
        .orderBy(desc(attendanceRecordTable.createdAt));

      const scheduleRecordIds: string[] = [];
      attendanceRows.forEach((record: AttendanceRow) => {
        extractLinkRecordIds(record.courseSchedule).forEach((id: string) => {
          if (!scheduleRecordIds.includes(id)) {
            scheduleRecordIds.push(id);
          }
        });
      });

      const scheduleInfoMap = new Map<
        string,
        { scheduleName: string | null; classDate: string | null }
      >();
      if (scheduleRecordIds.length > 0) {
        const uuidPattern: RegExp =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;
        const uuidIds: string[] = scheduleRecordIds.filter((value: string) =>
          uuidPattern.test(value),
        );
        const baseRecordIds: string[] = scheduleRecordIds.filter(
          (value: string) => !uuidPattern.test(value),
        );
        const scheduleRows: ScheduleRow[] = await this.db
          .select()
          .from(courseScheduleTable)
          .where(
            or(
              baseRecordIds.length > 0
                ? inArray(courseScheduleTable.baseRecordId, baseRecordIds)
                : undefined,
              uuidIds.length > 0
                ? inArray(courseScheduleTable.id, uuidIds)
                : undefined,
            ),
          );
        scheduleRows.forEach((schedule: ScheduleRow) => {
          if (schedule.baseRecordId) {
            scheduleInfoMap.set(schedule.baseRecordId, {
              scheduleName: schedule.scheduleName,
              classDate: schedule.classDate,
            });
          }
          scheduleInfoMap.set(schedule.id, {
            scheduleName: schedule.scheduleName,
            classDate: schedule.classDate,
          });
        });
      }

      attendanceRecords = attendanceRows.map(
        (record: AttendanceRow): StudentAttendanceItem => {
          const recordScheduleIds: string[] = extractLinkRecordIds(
            record.courseSchedule,
          );
          const firstScheduleId: string | undefined = recordScheduleIds[0];
          const scheduleInfo: { scheduleName: string | null; classDate: string | null } | undefined = firstScheduleId
            ? scheduleInfoMap.get(firstScheduleId)
            : undefined;
          return {
            scheduleName: scheduleInfo?.scheduleName ?? null,
            classDate: scheduleInfo?.classDate ?? null,
            attendanceStatus: record.attendanceStatus,
            remark: record.remark,
          };
        },
      );
    }

    const student: StudentDetail = {
      id: row.id,
      studentName: row.studentName ?? '',
      contactPhone: row.contactPhone ?? '',
      wechatId: row.wechatId,
      sourceChannel: row.sourceChannel,
      learningManager: row.learningManager,
      enrollmentDate: row.enrollmentDate,
      paymentStatus: row.paymentStatus,
      paymentAmount: Number(row.paymentAmount ?? 0),
      studyProgress: row.studyProgress,
      graduationDate: row.graduationDate,
      remark: row.remark,
      managerProfile: row.managerProfile,
    };

    return { student, courses, attendanceRecords };
  }

  async createStudent(
    dto: CreateStudentRequest,
  ): Promise<CreateStudentResponse> {
    const courseBaseRecordIds: string[] = [];
    if (dto.courseIds.length > 0) {
      const courseRows: Array<{ baseRecordId: string | null }> =
        await this.db
          .select({ baseRecordId: courseGeneralTable.baseRecordId })
          .from(courseGeneralTable)
          .where(inArray(courseGeneralTable.id, dto.courseIds));
      courseRows.forEach((course: { baseRecordId: string | null }) => {
        if (course.baseRecordId) {
          courseBaseRecordIds.push(course.baseRecordId);
        }
      });
    }

    const insertValue: StudentInsert = {
      studentName: dto.studentName,
      contactPhone: dto.contactPhone,
      wechatId: dto.wechatId ?? null,
      sourceChannel: dto.sourceChannel,
      enrollmentDate: dto.enrollmentDate,
      paymentStatus: dto.paymentStatus,
      paymentAmount:
        dto.paymentAmount === undefined ? null : String(dto.paymentAmount),
      enrollCourse: { link_record_ids: courseBaseRecordIds },
      managerProfile: dto.managerProfile ?? null,
    };

    const inserted: Array<{ id: string }> = await this.db
      .insert(studentRegistrationTable)
      .values(insertValue)
      .returning({ id: studentRegistrationTable.id });
    const insertedId: string | undefined = inserted[0]?.id;
    if (!insertedId) {
      throw new NotFoundException('学员报名写入失败');
    }

    let notified = false;
    if (dto.managerProfile) {
      try {
        const result = await this.feishuMessageService.sendTextMessage(
          dto.managerProfile,
          `新学员 ${dto.studentName}（${dto.contactPhone}）已报名，请及时跟进`,
        );
        notified = result.success;
      } catch (error) {
        this.logger.error(
          `飞书提醒发送失败：${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }

    this.logger.log(
      `学员报名登记成功：${JSON.stringify({
        id: insertedId,
        studentName: dto.studentName,
        courseCount: courseBaseRecordIds.length,
        notified,
      })}`,
    );

    const syncResult: BitableSyncResult =
      await this.bitableSyncService.syncRecord('student', insertedId);

    return {
      id: insertedId,
      notified,
      syncStatus: syncResult.syncStatus,
    };
  }

  async updateStudent(
    studentId: string,
    dto: UpdateStudentRequest,
  ): Promise<UpdateStudentResponse> {
    const patch: Partial<StudentInsert> = {
      studentName: dto.studentName,
      contactPhone: dto.contactPhone,
      wechatId: dto.wechatId ?? null,
      sourceChannel: dto.sourceChannel,
      enrollmentDate: dto.enrollmentDate,
      studyProgress: dto.studyProgress ?? null,
      graduationDate: dto.graduationDate ?? null,
      remark: dto.remark ?? null,
      updatedAt: new Date(),
    };
    const updated: Array<{ id: string }> = await this.db
      .update(studentRegistrationTable)
      .set(patch)
      .where(eq(studentRegistrationTable.id, studentId))
      .returning({ id: studentRegistrationTable.id });
    const updatedRow: { id: string } | undefined = updated[0];
    if (!updatedRow) {
      throw new NotFoundException(`学员 ${studentId} 不存在`);
    }
    this.logger.log(
      `学员信息更新：${JSON.stringify({
        id: studentId,
        studentName: dto.studentName,
      })}`,
    );
    const updateSyncResult: BitableSyncResult =
      await this.bitableSyncService.syncRecord('student', studentId);
    return {
      id: updatedRow.id,
      syncStatus: updateSyncResult.syncStatus,
    };
  }

  async updatePayment(
    studentId: string,
    dto: UpdatePaymentRequest,
  ): Promise<UpdatePaymentResponse> {
    const updated: Array<{ id: string }> = await this.db
      .update(studentRegistrationTable)
      .set({
        paymentAmount: String(dto.paymentAmount),
        paymentStatus: dto.paymentStatus,
        updatedAt: new Date(),
      })
      .where(eq(studentRegistrationTable.id, studentId))
      .returning({ id: studentRegistrationTable.id });
    const updatedRow: { id: string } | undefined = updated[0];
    if (!updatedRow) {
      throw new NotFoundException(`学员 ${studentId} 不存在`);
    }
    this.logger.log(
      `缴费信息更新：${JSON.stringify({
        id: studentId,
        paymentStatus: dto.paymentStatus,
        paymentAmount: dto.paymentAmount,
      })}`,
    );
    const paymentSyncResult: BitableSyncResult =
      await this.bitableSyncService.syncRecord('student', studentId);
    return {
      id: updatedRow.id,
      syncStatus: paymentSyncResult.syncStatus,
    };
  }

  async retryBitableSync(
    studentId: string,
  ): Promise<StudentBitableSyncResponse> {
    return this.bitableSyncService.syncRecord('student', studentId);
  }

  async deleteStudent(studentId: string): Promise<void> {
    const rows: StudentRow[] = await this.db
      .select()
      .from(studentRegistrationTable)
      .where(eq(studentRegistrationTable.id, studentId));
    const row: StudentRow | undefined = rows[0];
    if (!row) {
      throw new NotFoundException(`学员 ${studentId} 不存在`);
    }
    const studentLinkKey: string = row.baseRecordId ?? row.id;
    const attendanceCountRows: Array<{ count: number }> = await this.db
      .select({ count: count() })
      .from(attendanceRecordTable)
      .where(this.linkContainsStudent(studentLinkKey));
    const attendanceCount: number = Number(attendanceCountRows[0]?.count ?? 0);
    if (attendanceCount > 0) {
      throw new ConflictException(
        `该学员仍有 ${attendanceCount} 条考勤记录，请先清理关联数据后再删除`,
      );
    }
    await this.bitableSyncService.deleteRecord('student', studentId);
    const deleted: Array<{ id: string }> = await this.db
      .delete(studentRegistrationTable)
      .where(eq(studentRegistrationTable.id, studentId))
      .returning({ id: studentRegistrationTable.id });
    if (deleted.length === 0) {
      throw new NotFoundException(`学员 ${studentId} 不存在`);
    }
    this.logger.log(
      `学员已删除：${JSON.stringify({
        id: studentId,
        studentName: row.studentName,
      })}`,
    );
  }
}
