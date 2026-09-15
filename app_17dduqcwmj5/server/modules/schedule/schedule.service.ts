import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  AuthNPaasService,
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from '@lark-apaas/fullstack-nestjs-core';
import {
  and,
  count,
  desc,
  eq,
  gte,
  inArray,
  lte,
  or,
  sql,
  type Column,
  type SQL,
} from 'drizzle-orm';
import {
  attendanceRecordTable,
  courseGeneralTable,
  courseScheduleTable,
  studentRegistrationTable,
} from '@server/database/schema';
import { FeishuMessageService } from '@server/src/common/feishu-message/feishu-message.service';
import { isValidDay, isValidHm } from '@server/src/common/utils/date';
import { BitableSyncService } from '@server/src/common/bitable-sync/bitable-sync.service';
import { resolveDisplaySyncStatus } from '@shared/bitable-sync';
import type {
  BitableSyncResult,
  BitableSyncStatus,
} from '@shared/bitable-sync';
import type {
  AttendanceItem,
  AttendanceListResponse,
  AttendanceStats,
  BatchAttendanceItem,
  BatchAttendanceRequest,
  CreateScheduleRequest,
  CreateScheduleResponse,
  DeleteScheduleResponse,
  EnrolledStudentItem,
  EnrolledStudentsResponse,
  SaveAttendanceRecord,
  SaveAttendanceRequest,
  ScheduleAttendanceSummary,
  ScheduleBitableSyncResponse,
  ScheduleListItem,
  ScheduleListResponse,
  StudentAttendanceSummary,
} from '@shared/schedule';

export interface ScheduleListQuery {
  courseId?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  page: number;
  pageSize: number;
}

type ScheduleRow = typeof courseScheduleTable.$inferSelect;
type CourseRow = typeof courseGeneralTable.$inferSelect;
type StudentRow = typeof studentRegistrationTable.$inferSelect;
type AttendanceRow = typeof attendanceRecordTable.$inferSelect;
/** Drizzle 事务实例类型（从 PostgresJsDatabase.transaction 推导） */
type DbTransaction = Parameters<
  Parameters<PostgresJsDatabase['transaction']>[0]
>[0];

const ATTENDANCE_STATUS_SET: ReadonlySet<string> = new Set<string>([
  '出勤',
  '迟到',
  '早退',
  '旷课',
  '请假',
]);

function parseLinkRecordIds(value: unknown): string[] {
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
export class ScheduleService {
  private readonly logger = new Logger(ScheduleService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    private readonly authnPaasService: AuthNPaasService,
    private readonly feishuMessageService: FeishuMessageService,
    private readonly bitableSyncService: BitableSyncService,
  ) {}

  private linkContains(column: Column, baseRecordId: string): SQL {
    return sql`${column}->'link_record_ids' @> ${JSON.stringify([baseRecordId])}::jsonb`;
  }

  private scheduleLinkCondition(column: Column, schedule: ScheduleRow): SQL {
    const conditions: SQL[] = [this.linkContains(column, schedule.id)];
    if (schedule.baseRecordId) {
      conditions.push(this.linkContains(column, schedule.baseRecordId));
    }
    if (conditions.length === 1) {
      return conditions[0];
    }
    const combined: SQL | undefined = or(...conditions);
    return combined as SQL;
  }

  private async resolveLecturerNames(
    userIds: string[],
  ): Promise<Map<string, string>> {
    const nameMap: Map<string, string> = new Map<string, string>();
    if (userIds.length === 0) {
      return nameMap;
    }
    const users = await this.authnPaasService.listUsersByIds(userIds);
    userIds.forEach((userId: string, index: number) => {
      const user = users[index];
      const name: string = user?.name?.zh_cn ?? user?.name?.en_us ?? '';
      nameMap.set(userId, name);
    });
    return nameMap;
  }

  async listSchedules(query: ScheduleListQuery): Promise<ScheduleListResponse> {
    const conditions: SQL[] = [];
    if (query.courseId) {
      const courseRows: CourseRow[] = await this.db
        .select()
        .from(courseGeneralTable)
        .where(eq(courseGeneralTable.id, query.courseId));
      const course: CourseRow | undefined = courseRows[0];
      if (!course || !course.baseRecordId) {
        return { items: [], total: 0 };
      }
      conditions.push(
        this.linkContains(courseScheduleTable.courseName, course.baseRecordId),
      );
    }
    if (query.status) {
      conditions.push(eq(courseScheduleTable.appStatus, query.status));
    }
    if (query.dateFrom) {
      conditions.push(gte(courseScheduleTable.classDate, query.dateFrom));
    }
    if (query.dateTo) {
      conditions.push(lte(courseScheduleTable.classDate, query.dateTo));
    }
    const whereClause: SQL | undefined =
      conditions.length > 0 ? and(...conditions) : undefined;

    const rows: ScheduleRow[] = await this.db
      .select()
      .from(courseScheduleTable)
      .where(whereClause)
      .orderBy(desc(courseScheduleTable.classDate), desc(courseScheduleTable.createdAt))
      .limit(query.pageSize)
      .offset((query.page - 1) * query.pageSize);

    const totalRows: Array<{ count: number }> = await this.db
      .select({ count: count() })
      .from(courseScheduleTable)
      .where(whereClause);
    const total: number = Number(totalRows[0]?.count ?? 0);

    const courseBaseIds: string[] = [];
    rows.forEach((row: ScheduleRow) => {
      parseLinkRecordIds(row.courseName).forEach((baseId: string) => {
        if (!courseBaseIds.includes(baseId)) {
          courseBaseIds.push(baseId);
        }
      });
    });
    const courseNameMap: Map<string, string> = new Map<string, string>();
    if (courseBaseIds.length > 0) {
      const courseRows: CourseRow[] = await this.db
        .select()
        .from(courseGeneralTable)
        .where(inArray(courseGeneralTable.baseRecordId, courseBaseIds));
      courseRows.forEach((courseRow: CourseRow) => {
        if (courseRow.baseRecordId) {
          courseNameMap.set(courseRow.baseRecordId, courseRow.courseName ?? '');
        }
      });
    }

    const lecturerIds: string[] = [];
    rows.forEach((row: ScheduleRow) => {
      if (row.lecturer && !lecturerIds.includes(row.lecturer)) {
        lecturerIds.push(row.lecturer);
      }
    });
    const lecturerNameMap: Map<string, string> =
      await this.resolveLecturerNames(lecturerIds);

    const items: ScheduleListItem[] = rows.map(
      (row: ScheduleRow): ScheduleListItem => {
        const courseBaseId: string | undefined =
          parseLinkRecordIds(row.courseName)[0];
        return {
          id: row.id,
          scheduleName: row.scheduleName ?? '',
          courseName: courseBaseId ? courseNameMap.get(courseBaseId) ?? '' : '',
          classDate: row.classDate,
          startTime: row.startTime,
          endTime: row.endTime,
          lecturerName: row.lecturer
            ? lecturerNameMap.get(row.lecturer) ?? ''
            : '',
          classroom: row.classroom,
          enrollmentCapacity: row.enrollmentCapacity ?? 0,
          registeredCount: row.registeredCount ?? 0,
          remainingQuota: row.remainingQuota ?? 0,
          status: row.appStatus,
          bitableRecordId: row.bitableRecordId,
          syncStatus: resolveDisplaySyncStatus(
            row.syncStatus,
            row.bitableRecordId,
            row.baseRecordId,
          ),
        };
      },
    );

    this.logger.log(
      `排期列表查询：page=${query.page}, pageSize=${query.pageSize}, total=${total}`,
    );

    return { items, total };
  }

  async createSchedule(
    dto: CreateScheduleRequest,
  ): Promise<CreateScheduleResponse> {
    if (
      !dto.scheduleName ||
      !dto.courseId ||
      !dto.lecturer ||
      !dto.classroom ||
      !dto.classDate ||
      !dto.startTime ||
      !dto.endTime
    ) {
      throw new BadRequestException('缺少必填字段');
    }
    const capacity: number = dto.enrollmentCapacity;
    if (!Number.isInteger(capacity) || capacity <= 0) {
      throw new BadRequestException('招生容量必须为正整数');
    }
    if (!isValidDay(dto.classDate)) {
      throw new BadRequestException('上课日期格式不正确，应为 YYYY-MM-DD');
    }
    if (!isValidHm(dto.startTime) || !isValidHm(dto.endTime)) {
      throw new BadRequestException('上课时间格式不正确，应为 HH:mm');
    }
    if (dto.startTime >= dto.endTime) {
      throw new BadRequestException('结束时间必须晚于开始时间');
    }

    const studentIds: string[] = Array.from(new Set(dto.studentIds ?? []));
    const registeredCount: number = studentIds.length;
    if (registeredCount >= capacity) {
      throw new BadRequestException('报名人数已达上限');
    }

    const courseRows: CourseRow[] = await this.db
      .select()
      .from(courseGeneralTable)
      .where(eq(courseGeneralTable.id, dto.courseId));
    const course: CourseRow | undefined = courseRows[0];
    if (!course || !course.baseRecordId) {
      throw new NotFoundException('课程不存在或尚未同步关联记录');
    }

    const studentBaseIds: string[] = [];
    if (studentIds.length > 0) {
      const studentRows: StudentRow[] = await this.db
        .select()
        .from(studentRegistrationTable)
        .where(inArray(studentRegistrationTable.id, studentIds));
      const uuidToBaseId: Map<string, string> = new Map<string, string>();
      studentRows.forEach((studentRow: StudentRow) => {
        uuidToBaseId.set(studentRow.id, studentRow.baseRecordId ?? studentRow.id);
      });
      for (const studentId of studentIds) {
        const baseId: string | undefined = uuidToBaseId.get(studentId);
        if (!baseId) {
          throw new BadRequestException(`学员不存在：${studentId}`);
        }
        studentBaseIds.push(baseId);
      }
    }

    const sameDayRows: ScheduleRow[] = await this.db
      .select()
      .from(courseScheduleTable)
      .where(eq(courseScheduleTable.classDate, dto.classDate));
    for (const existing of sameDayRows) {
      const existingStart: string = existing.startTime ?? '';
      const existingEnd: string = existing.endTime ?? '';
      const overlaps: boolean =
        dto.startTime < existingEnd && existingStart < dto.endTime;
      if (!overlaps) {
        continue;
      }
      if (existing.lecturer && existing.lecturer === dto.lecturer) {
        const lecturerNameMap: Map<string, string> =
          await this.resolveLecturerNames([dto.lecturer]);
        const lecturerName: string =
          lecturerNameMap.get(dto.lecturer) ?? dto.lecturer;
        throw new BadRequestException(
          `讲师 ${lecturerName} 在 ${existingStart}-${existingEnd} 已有排期《${
            existing.scheduleName ?? '未命名排期'
          }》，请调整时间或更换讲师`,
        );
      }
      if (existing.classroom && existing.classroom === dto.classroom) {
        throw new BadRequestException(
          `教室 ${dto.classroom} 在 ${existingStart}-${existingEnd} 时段已被占用，请调整时间或更换教室`,
        );
      }
    }

    const remainingQuota: number = capacity - registeredCount;
    const inserted: Array<{ id: string }> = await this.db
      .insert(courseScheduleTable)
      .values({
        scheduleName: dto.scheduleName,
        courseName: { link_record_ids: [course.baseRecordId] },
        classDate: dto.classDate,
        startTime: dto.startTime,
        endTime: dto.endTime,
        lecturer: dto.lecturer,
        classroom: dto.classroom,
        enrollmentCapacity: capacity,
        registeredCount,
        remainingQuota,
        enrollStudent: { link_record_ids: studentBaseIds },
        appStatus: '招生中',
      })
      .returning({ id: courseScheduleTable.id });
    const newId: string | undefined = inserted[0]?.id;
    if (!newId) {
      throw new BadRequestException('排期创建失败');
    }

    this.logger.log(`排期创建成功：id=${newId}, name=${dto.scheduleName}`);

    const syncResult: BitableSyncResult =
      await this.bitableSyncService.syncRecord('schedule', newId);

    if (remainingQuota === 0) {
      try {
        await this.feishuMessageService.sendTextMessage(
          dto.lecturer,
          `您负责的排期「${dto.scheduleName}」已满员，请留意`,
        );
      } catch (error) {
        this.logger.error(
          `满员预警消息发送失败：scheduleId=${newId}, error=${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }

    return { id: newId, remainingQuota, syncStatus: syncResult.syncStatus };
  }

  async retryBitableSync(
    scheduleId: string,
  ): Promise<ScheduleBitableSyncResponse> {
    return this.bitableSyncService.syncRecord('schedule', scheduleId);
  }

  private async getScheduleRow(scheduleId: string): Promise<ScheduleRow> {
    const rows: ScheduleRow[] = await this.db
      .select()
      .from(courseScheduleTable)
      .where(eq(courseScheduleTable.id, scheduleId));
    const row: ScheduleRow | undefined = rows[0];
    if (!row) {
      throw new NotFoundException(`排期 ${scheduleId} 不存在`);
    }
    return row;
  }

  private async loadStudentsByBaseIds(
    baseIds: string[],
  ): Promise<Map<string, StudentRow>> {
    const studentMap: Map<string, StudentRow> = new Map<string, StudentRow>();
    if (baseIds.length === 0) {
      return studentMap;
    }
    const uuidPattern: RegExp =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;
    const uuidIds: string[] = baseIds.filter((value: string) =>
      uuidPattern.test(value),
    );
    const baseRecordIds: string[] = baseIds.filter(
      (value: string) => !uuidPattern.test(value),
    );
    const rows: StudentRow[] = await this.db
      .select()
      .from(studentRegistrationTable)
      .where(
        or(
          baseRecordIds.length > 0
            ? inArray(studentRegistrationTable.baseRecordId, baseRecordIds)
            : undefined,
          uuidIds.length > 0
            ? inArray(studentRegistrationTable.id, uuidIds)
            : undefined,
        ),
      );
    rows.forEach((row: StudentRow) => {
      if (row.baseRecordId) {
        studentMap.set(row.baseRecordId, row);
      }
      studentMap.set(row.id, row);
    });
    return studentMap;
  }

  private computeStats(items: AttendanceItem[]): AttendanceStats {
    const presentCount: number = items.filter(
      (item: AttendanceItem) => item.attendanceStatus === '出勤',
    ).length;
    const absentCount: number = items.filter(
      (item: AttendanceItem) =>
        item.attendanceStatus === '请假' || item.attendanceStatus === '旷课',
    ).length;
    const denominator: number = presentCount + absentCount;
    const attendanceRate: number =
      denominator === 0
        ? 0
        : Math.round((presentCount / denominator) * 1000) / 10;
    return { presentCount, absentCount, attendanceRate };
  }

  async listAttendances(scheduleId: string): Promise<AttendanceListResponse> {
    const schedule: ScheduleRow = await this.getScheduleRow(scheduleId);
    const enrolledBaseIds: string[] = parseLinkRecordIds(schedule.enrollStudent);
    const studentMap: Map<string, StudentRow> =
      await this.loadStudentsByBaseIds(enrolledBaseIds);

    const scheduleLinkKey: string = schedule.baseRecordId ?? schedule.id;
    const attendanceRows: AttendanceRow[] = await this.db
      .select()
      .from(attendanceRecordTable)
      .where(
        this.linkContains(
          attendanceRecordTable.courseSchedule,
          scheduleLinkKey,
        ),
      );

    if (enrolledBaseIds.length === 0) {
      const recordBaseIds: string[] = Array.from(
        new Set(
          attendanceRows.flatMap((row: AttendanceRow) =>
            parseLinkRecordIds(row.appStudent),
          ),
        ),
      );
      const recordStudentMap: Map<string, StudentRow> =
        await this.loadStudentsByBaseIds(recordBaseIds);
      const items: AttendanceItem[] = attendanceRows.map(
        (row: AttendanceRow): AttendanceItem => {
          const baseId: string = parseLinkRecordIds(row.appStudent)[0] ?? '';
          const student: StudentRow | undefined =
            recordStudentMap.get(baseId);
          return {
            studentId: student?.id ?? '',
            studentName: student?.studentName ?? '',
            attendanceStatus: row.attendanceStatus,
            remark: row.remark,
          };
        },
      );
      return { items, stats: this.computeStats(items) };
    }

    const items: AttendanceItem[] = enrolledBaseIds.map(
      (baseId: string): AttendanceItem => {
        const student: StudentRow | undefined = studentMap.get(baseId);
        const record: AttendanceRow | undefined = attendanceRows.find(
          (row: AttendanceRow) =>
            parseLinkRecordIds(row.appStudent).includes(baseId),
        );
        return {
          studentId: student?.id ?? '',
          studentName: student?.studentName ?? '',
          attendanceStatus: record?.attendanceStatus ?? null,
          remark: record?.remark ?? null,
        };
      },
    );

    return { items, stats: this.computeStats(items) };
  }

  async saveAttendances(
    scheduleId: string,
    dto: SaveAttendanceRequest,
  ): Promise<AttendanceListResponse> {
    if (!Array.isArray(dto?.records)) {
      throw new BadRequestException('点名记录不能为空');
    }
    const schedule: ScheduleRow = await this.getScheduleRow(scheduleId);
    const scheduleBaseId: string = schedule.baseRecordId ?? schedule.id;

    const studentUuids: string[] = Array.from(
      new Set(dto.records.map((record) => record.studentId)),
    );
    const uuidToBaseId: Map<string, string> = new Map<string, string>();
    if (studentUuids.length > 0) {
      const studentRows: StudentRow[] = await this.db
        .select()
        .from(studentRegistrationTable)
        .where(inArray(studentRegistrationTable.id, studentUuids));
      studentRows.forEach((row: StudentRow) => {
        uuidToBaseId.set(row.id, row.baseRecordId ?? row.id);
      });
    }

    const existingRows: AttendanceRow[] = await this.db
      .select()
      .from(attendanceRecordTable)
      .where(
        this.linkContains(
          attendanceRecordTable.courseSchedule,
          scheduleBaseId,
        ),
      );
    const baseIdToAttendanceId: Map<string, string> = new Map<string, string>();
    existingRows.forEach((row: AttendanceRow) => {
      parseLinkRecordIds(row.appStudent).forEach((baseId: string) => {
        baseIdToAttendanceId.set(baseId, row.id);
      });
    });

    const attendanceIds: string[] = [];
    await this.db.transaction(async (tx: DbTransaction) => {
      for (const record of dto.records) {
        const studentBaseId: string | undefined = uuidToBaseId.get(
          record.studentId,
        );
        if (!studentBaseId) {
          throw new BadRequestException(`学员不存在：${record.studentId}`);
        }
        const existingId: string | undefined =
          baseIdToAttendanceId.get(studentBaseId);
        if (existingId) {
          const updated: Array<{ id: string }> = await tx
            .update(attendanceRecordTable)
            .set({
              attendanceStatus: record.attendanceStatus,
              remark: record.remark ?? null,
            })
            .where(eq(attendanceRecordTable.id, existingId))
            .returning({ id: attendanceRecordTable.id });
          if (updated.length === 0) {
            throw new NotFoundException('考勤记录不存在');
          }
          attendanceIds.push(existingId);
        } else {
          const inserted: Array<{ id: string }> = await tx
            .insert(attendanceRecordTable)
            .values({
              appStudent: { link_record_ids: [studentBaseId] },
              courseSchedule: { link_record_ids: [scheduleBaseId] },
              attendanceStatus: record.attendanceStatus,
              remark: record.remark ?? null,
            })
            .returning({ id: attendanceRecordTable.id });
          const insertedId: string | undefined = inserted[0]?.id;
          if (!insertedId) {
            throw new BadRequestException('考勤记录保存失败');
          }
          baseIdToAttendanceId.set(studentBaseId, insertedId);
          attendanceIds.push(insertedId);
        }
      }
    });

    let anySyncFailed: boolean = false;
    for (const attendanceId of attendanceIds) {
      const syncResult: BitableSyncResult =
        await this.bitableSyncService.syncRecord('attendance', attendanceId);
      if (syncResult.syncStatus === 'failed') {
        anySyncFailed = true;
      }
    }
    const syncStatus: BitableSyncStatus =
      attendanceIds.length === 0
        ? 'not_synced'
        : anySyncFailed
          ? 'failed'
          : 'synced';

    this.logger.log(
      `考勤保存完成：scheduleId=${scheduleId}, records=${dto.records.length}, syncStatus=${syncStatus}`,
    );

    const response: AttendanceListResponse =
      await this.listAttendances(scheduleId);
    return { ...response, syncStatus };
  }

  async deleteSchedule(scheduleId: string): Promise<DeleteScheduleResponse> {
    const rows: ScheduleRow[] = await this.db
      .select()
      .from(courseScheduleTable)
      .where(eq(courseScheduleTable.id, scheduleId));
    const row: ScheduleRow | undefined = rows[0];
    if (!row) {
      throw new NotFoundException(`排期 ${scheduleId} 不存在`);
    }
    const enrolledStudentIds: string[] = parseLinkRecordIds(row.enrollStudent);
    if (
      enrolledStudentIds.length > 0 ||
      (row.registeredCount ?? 0) > 0
    ) {
      throw new ConflictException(
        '该排期仍有报名学员，请先清理关联数据后再删除',
      );
    }
    const scheduleLinkKey: string = row.baseRecordId ?? row.id;
    const attendanceCountRows: Array<{ count: number }> = await this.db
      .select({ count: count() })
      .from(attendanceRecordTable)
      .where(
        this.linkContains(
          attendanceRecordTable.courseSchedule,
          scheduleLinkKey,
        ),
      );
    const attendanceCount: number = Number(attendanceCountRows[0]?.count ?? 0);
    if (attendanceCount > 0) {
      throw new ConflictException(
        `该排期仍有 ${attendanceCount} 条考勤记录，请先清理关联数据后再删除`,
      );
    }
    let syncResult: BitableSyncResult;
    try {
      syncResult = await this.bitableSyncService.deleteRecord(
        'schedule',
        scheduleId,
      );
    } catch (error) {
      const errorMessage: string =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `排期删除回写 bitable 失败，继续本地删除：${JSON.stringify({
          id: scheduleId,
          error: errorMessage,
        })}`,
        error instanceof Error ? error.stack : undefined,
      );
      syncResult = { syncStatus: 'failed', message: errorMessage };
    }
    const deleted: Array<{ id: string }> = await this.db
      .delete(courseScheduleTable)
      .where(eq(courseScheduleTable.id, scheduleId))
      .returning({ id: courseScheduleTable.id });
    if (deleted.length === 0) {
      throw new NotFoundException(`排期 ${scheduleId} 不存在`);
    }
    this.logger.log(
      `排期已删除：${JSON.stringify({
        id: scheduleId,
        scheduleName: row.scheduleName,
        syncStatus: syncResult.syncStatus,
      })}`,
    );
    const response: DeleteScheduleResponse = { id: scheduleId, ...syncResult };
    return response;
  }

  async getEnrolledStudents(
    scheduleId: string,
  ): Promise<EnrolledStudentsResponse> {
    const schedule: ScheduleRow = await this.getScheduleRow(scheduleId);
    const enrolledBaseIds: string[] = parseLinkRecordIds(schedule.enrollStudent);
    const studentMap: Map<string, StudentRow> =
      await this.loadStudentsByBaseIds(enrolledBaseIds);

    const attendanceRows: AttendanceRow[] = await this.db
      .select()
      .from(attendanceRecordTable)
      .where(
        this.scheduleLinkCondition(
          attendanceRecordTable.courseSchedule,
          schedule,
        ),
      );

    const items: EnrolledStudentItem[] = enrolledBaseIds.map(
      (baseId: string): EnrolledStudentItem => {
        const student: StudentRow | undefined = studentMap.get(baseId);
        const record: AttendanceRow | undefined = attendanceRows.find(
          (row: AttendanceRow) =>
            parseLinkRecordIds(row.appStudent).includes(baseId),
        );
        return {
          studentId: student?.id ?? '',
          studentName: student?.studentName ?? '',
          contactPhone: student?.contactPhone ?? '',
          paymentStatus: student?.paymentStatus ?? null,
          studyProgress: student?.studyProgress ?? null,
          attendanceStatus: record?.attendanceStatus ?? null,
          attendanceRemark: record?.remark ?? null,
        };
      },
    );

    this.logger.log(
      `学员名单查询：scheduleId=${scheduleId}, count=${items.length}`,
    );

    return { items };
  }

  async batchSaveAttendance(
    body: BatchAttendanceRequest,
  ): Promise<AttendanceListResponse> {
    if (!body || !body.scheduleId) {
      throw new BadRequestException('缺少排期 ID');
    }
    if (!Array.isArray(body.items) || body.items.length === 0) {
      throw new BadRequestException('点名记录不能为空');
    }
    for (const item of body.items) {
      const record: BatchAttendanceItem = item;
      if (!record.studentId) {
        throw new BadRequestException('点名记录缺少学员 ID');
      }
      if (!ATTENDANCE_STATUS_SET.has(record.status)) {
        throw new BadRequestException(`非法考勤状态：${record.status}`);
      }
    }
    const request: SaveAttendanceRequest = {
      records: body.items.map(
        (item: BatchAttendanceItem): SaveAttendanceRecord => ({
          studentId: item.studentId,
          attendanceStatus: item.status,
          remark: item.remark,
        }),
      ),
    };
    return this.saveAttendances(body.scheduleId, request);
  }

  async getScheduleSummary(
    scheduleId: string,
  ): Promise<ScheduleAttendanceSummary> {
    const schedule: ScheduleRow = await this.getScheduleRow(scheduleId);
    const enrolledBaseIds: string[] = parseLinkRecordIds(schedule.enrollStudent);
    const expected: number = enrolledBaseIds.length;

    const attendanceRows: AttendanceRow[] = await this.db
      .select()
      .from(attendanceRecordTable)
      .where(
        this.scheduleLinkCondition(
          attendanceRecordTable.courseSchedule,
          schedule,
        ),
      );

    const enrolledSet: Set<string> = new Set<string>(enrolledBaseIds);
    const present: number = attendanceRows.filter(
      (row: AttendanceRow) =>
        row.attendanceStatus === '出勤' &&
        parseLinkRecordIds(row.appStudent).some((id: string) =>
          enrolledSet.has(id),
        ),
    ).length;
    const attendanceRate: number =
      expected === 0 ? 0 : Math.round((present / expected) * 1000) / 10;

    return { expected, present, attendanceRate };
  }

  async getStudentSummary(studentId: string): Promise<StudentAttendanceSummary> {
    const studentRows: StudentRow[] = await this.db
      .select()
      .from(studentRegistrationTable)
      .where(eq(studentRegistrationTable.id, studentId));
    const student: StudentRow | undefined = studentRows[0];
    if (!student) {
      throw new NotFoundException(`学员 ${studentId} 不存在`);
    }

    const conditions: SQL[] = [
      this.linkContains(attendanceRecordTable.appStudent, student.id),
    ];
    if (student.baseRecordId) {
      conditions.push(
        this.linkContains(attendanceRecordTable.appStudent, student.baseRecordId),
      );
    }
    const whereClause: SQL =
      conditions.length > 1 ? (or(...conditions) as SQL) : conditions[0];

    const attendanceRows: AttendanceRow[] = await this.db
      .select()
      .from(attendanceRecordTable)
      .where(whereClause);

    const countByStatus = (status: string): number =>
      attendanceRows.filter(
        (row: AttendanceRow) => row.attendanceStatus === status,
      ).length;

    const total: number = attendanceRows.length;
    const present: number = countByStatus('出勤');
    const attendanceRate: number =
      total === 0 ? 0 : Math.round((present / total) * 1000) / 10;

    return {
      total,
      present,
      late: countByStatus('迟到'),
      earlyLeave: countByStatus('早退'),
      absent: countByStatus('旷课'),
      leave: countByStatus('请假'),
      attendanceRate,
    };
  }
}
