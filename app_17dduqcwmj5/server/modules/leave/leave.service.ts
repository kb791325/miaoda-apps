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
  inArray,
  or,
  sql,
  type Column,
  type SQL,
} from 'drizzle-orm';
import {
  attendanceRecordTable,
  courseScheduleTable,
  leaveApplicationTable,
  studentRegistrationTable,
} from '@server/database/schema';
import { BitableSyncService } from '@server/src/common/bitable-sync/bitable-sync.service';
import { toIsoOrNull } from '@server/src/common/utils/date';
import { APP_ROLES } from '@shared/roles';
import { resolveDisplaySyncStatus } from '@shared/bitable-sync';
import type {
  BitableSyncResult,
} from '@shared/bitable-sync';
import type {
  ApproveLeaveRequest,
  ApproveLeaveResponse,
  CreateLeaveRequest,
  CreateLeaveResponse,
  LeaveListItem,
  LeaveListQuery,
  LeaveListResponse,
} from '@shared/leave';

type LeaveRow = typeof leaveApplicationTable.$inferSelect;
type StudentRow = typeof studentRegistrationTable.$inferSelect;
type ScheduleRow = typeof courseScheduleTable.$inferSelect;
type AttendanceRow = typeof attendanceRecordTable.$inferSelect;

const LEAVE_TYPE_SET: ReadonlySet<string> = new Set<string>([
  '事假',
  '病假',
  '其他',
]);

const APPROVAL_STATUS_SET: ReadonlySet<string> = new Set<string>([
  '通过',
  '不通过',
]);

const UUID_PATTERN: RegExp =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

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

function splitUuidAndBaseIds(keys: string[]): {
  uuidIds: string[];
  baseRecordIds: string[];
} {
  return {
    uuidIds: keys.filter((value: string) => UUID_PATTERN.test(value)),
    baseRecordIds: keys.filter((value: string) => !UUID_PATTERN.test(value)),
  };
}

@Injectable()
export class LeaveService {
  private readonly logger = new Logger(LeaveService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    private readonly bitableSyncService: BitableSyncService,
  ) {}

  private linkContains(column: Column, key: string): SQL {
    return sql`${column}->'link_record_ids' @> ${JSON.stringify([key])}::jsonb`;
  }

  /** 关联查询双条件：uuid 与 baseRecordId 任一命中即可 */
  private linkCondition(column: Column, keys: string[]): SQL {
    const conditions: SQL[] = keys.map((key: string) =>
      this.linkContains(column, key),
    );
    if (conditions.length === 1) {
      return conditions[0];
    }
    return or(...conditions) as SQL;
  }

  async createLeave(dto: CreateLeaveRequest): Promise<CreateLeaveResponse> {
    if (!dto || !dto.studentId || !dto.scheduleId) {
      throw new BadRequestException('缺少学员或排期');
    }
    if (!LEAVE_TYPE_SET.has(dto.leaveType)) {
      throw new BadRequestException('请假类型必须为事假、病假或其他');
    }
    if (!dto.leaveReason || dto.leaveReason.trim().length === 0) {
      throw new BadRequestException('请假原因不能为空');
    }

    const studentRows: StudentRow[] = await this.db
      .select()
      .from(studentRegistrationTable)
      .where(eq(studentRegistrationTable.id, dto.studentId));
    const student: StudentRow | undefined = studentRows[0];
    if (!student) {
      throw new NotFoundException('学员不存在');
    }

    const scheduleRows: ScheduleRow[] = await this.db
      .select()
      .from(courseScheduleTable)
      .where(eq(courseScheduleTable.id, dto.scheduleId));
    const schedule: ScheduleRow | undefined = scheduleRows[0];
    if (!schedule) {
      throw new NotFoundException('排期不存在');
    }

    const studentKey: string = student.baseRecordId ?? student.id;
    const scheduleKey: string = schedule.baseRecordId ?? schedule.id;
    const duplicates: Array<{ id: string }> = await this.db
      .select({ id: leaveApplicationTable.id })
      .from(leaveApplicationTable)
      .where(
        and(
          eq(leaveApplicationTable.approvalStatus, '待审批'),
          sql`${leaveApplicationTable.relatedStudent}::jsonb -> 'link_record_ids' @> to_jsonb(${studentKey}::text)`,
          sql`${leaveApplicationTable.relatedSchedule}::jsonb -> 'link_record_ids' @> to_jsonb(${scheduleKey}::text)`,
        ),
      );
    if (duplicates.length > 0) {
      throw new ConflictException('该学员在此排期已有待审批的请假申请，请勿重复提交');
    }

    const applyTime: Date = dto.applyTime ? new Date(dto.applyTime) : new Date();
    if (Number.isNaN(applyTime.getTime())) {
      throw new BadRequestException('申请时间格式不正确');
    }

    const inserted: Array<{ id: string }> = await this.db
      .insert(leaveApplicationTable)
      .values({
        leaveReason: dto.leaveReason,
        relatedStudent: {
          link_record_ids: [student.baseRecordId ?? student.id],
        },
        relatedSchedule: {
          link_record_ids: [schedule.baseRecordId ?? schedule.id],
        },
        leaveType: dto.leaveType,
        applyTime,
        approvalStatus: '待审批',
      })
      .returning({ id: leaveApplicationTable.id });
    const newId: string | undefined = inserted[0]?.id;
    if (!newId) {
      throw new BadRequestException('请假申请提交失败');
    }

    const syncResult: BitableSyncResult =
      await this.bitableSyncService.syncRecord('leave', newId);

    this.logger.log(
      `请假申请已提交：${JSON.stringify({
        id: newId,
        studentId: dto.studentId,
        scheduleId: dto.scheduleId,
        leaveType: dto.leaveType,
      })}`,
    );

    return { id: newId, syncStatus: syncResult.syncStatus };
  }

  async listLeaves(
    query: LeaveListQuery,
    caller?: { userId?: string; roles: string[] },
  ): Promise<LeaveListResponse> {
    const conditions: SQL[] = [];
    const staffRoles: string[] = [
      APP_ROLES.principal,
      APP_ROLES.recruitmentTeacher,
      APP_ROLES.teachingTeacher,
    ];
    if (
      caller &&
      !caller.roles.some((role: string) => staffRoles.includes(role))
    ) {
      if (!caller.userId) {
        return { items: [], total: 0 };
      }
      conditions.push(eq(leaveApplicationTable.createdBy, caller.userId));
    }
    if (query.approvalStatus) {
      conditions.push(
        eq(leaveApplicationTable.approvalStatus, query.approvalStatus),
      );
    }
    if (query.scheduleId) {
      const scheduleRows: ScheduleRow[] = await this.db
        .select()
        .from(courseScheduleTable)
        .where(eq(courseScheduleTable.id, query.scheduleId));
      const schedule: ScheduleRow | undefined = scheduleRows[0];
      if (!schedule) {
        return { items: [], total: 0 };
      }
      const scheduleKeys: string[] = [schedule.id];
      if (schedule.baseRecordId) {
        scheduleKeys.push(schedule.baseRecordId);
      }
      conditions.push(
        this.linkCondition(leaveApplicationTable.relatedSchedule, scheduleKeys),
      );
    }
    const whereClause: SQL | undefined =
      conditions.length > 0 ? and(...conditions) : undefined;

    const rows: LeaveRow[] = await this.db
      .select()
      .from(leaveApplicationTable)
      .where(whereClause)
      .orderBy(
        sql`${leaveApplicationTable.applyTime} DESC NULLS LAST`,
        desc(leaveApplicationTable.createdAt),
      )
      .limit(query.pageSize)
      .offset((query.page - 1) * query.pageSize);

    const totalRows: Array<{ count: number }> = await this.db
      .select({ count: count() })
      .from(leaveApplicationTable)
      .where(whereClause);
    const total: number = Number(totalRows[0]?.count ?? 0);

    const studentKeys: string[] = [];
    const scheduleKeys: string[] = [];
    rows.forEach((row: LeaveRow) => {
      parseLinkRecordIds(row.relatedStudent).forEach((key: string) => {
        if (!studentKeys.includes(key)) {
          studentKeys.push(key);
        }
      });
      parseLinkRecordIds(row.relatedSchedule).forEach((key: string) => {
        if (!scheduleKeys.includes(key)) {
          scheduleKeys.push(key);
        }
      });
    });
    const studentNameMap: Map<string, string> =
      await this.buildStudentNameMap(studentKeys);
    const scheduleNameMap: Map<string, string> =
      await this.buildScheduleNameMap(scheduleKeys);

    const items: LeaveListItem[] = rows.map((row: LeaveRow): LeaveListItem => {
      const studentKey: string | undefined =
        parseLinkRecordIds(row.relatedStudent)[0];
      const scheduleKey: string | undefined =
        parseLinkRecordIds(row.relatedSchedule)[0];
      return {
        id: row.id,
        leaveType: row.leaveType,
        leaveReason: row.leaveReason,
        applyTime: toIsoOrNull(row.applyTime),
        approvalStatus: row.approvalStatus,
        approvalRemark: row.approvalRemark,
        studentName: studentKey
          ? (studentNameMap.get(studentKey) ?? '')
          : '',
        scheduleName: scheduleKey
          ? (scheduleNameMap.get(scheduleKey) ?? '')
          : '',
        syncStatus: resolveDisplaySyncStatus(
          row.syncStatus,
          row.bitableRecordId,
          row.baseRecordId,
        ),
      };
    });

    this.logger.log(
      `请假列表查询：page=${query.page}, pageSize=${query.pageSize}, total=${total}`,
    );

    return { items, total };
  }

  private async buildStudentNameMap(keys: string[]): Promise<Map<string, string>> {
    const nameMap: Map<string, string> = new Map<string, string>();
    if (keys.length === 0) {
      return nameMap;
    }
    const { uuidIds, baseRecordIds } = splitUuidAndBaseIds(keys);
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
      const name: string = row.studentName ?? '';
      if (row.baseRecordId) {
        nameMap.set(row.baseRecordId, name);
      }
      nameMap.set(row.id, name);
    });
    return nameMap;
  }

  private async buildScheduleNameMap(
    keys: string[],
  ): Promise<Map<string, string>> {
    const nameMap: Map<string, string> = new Map<string, string>();
    if (keys.length === 0) {
      return nameMap;
    }
    const { uuidIds, baseRecordIds } = splitUuidAndBaseIds(keys);
    const rows: ScheduleRow[] = await this.db
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
    rows.forEach((row: ScheduleRow) => {
      const name: string = row.scheduleName ?? '';
      if (row.baseRecordId) {
        nameMap.set(row.baseRecordId, name);
      }
      nameMap.set(row.id, name);
    });
    return nameMap;
  }

  async approveLeave(
    id: string,
    dto: ApproveLeaveRequest,
    userId: string,
  ): Promise<ApproveLeaveResponse> {
    if (!dto || !APPROVAL_STATUS_SET.has(dto.approvalStatus)) {
      throw new BadRequestException('审批状态必须为通过或不通过');
    }
    const rows: LeaveRow[] = await this.db
      .select()
      .from(leaveApplicationTable)
      .where(eq(leaveApplicationTable.id, id));
    const leave: LeaveRow | undefined = rows[0];
    if (!leave) {
      throw new NotFoundException('请假记录不存在');
    }

    const attendanceIdsToMark: string[] =
      dto.approvalStatus === '通过'
        ? await this.findAttendanceIdsToMark(leave)
        : [];

    const patch: Partial<typeof leaveApplicationTable.$inferInsert> = {
      approvalStatus: dto.approvalStatus,
      updatedAt: new Date(),
      updatedBy: userId,
    };
    if (dto.approvalRemark !== undefined) {
      patch.approvalRemark = dto.approvalRemark;
    }

    const markedAttendanceIds: string[] = await this.db.transaction(
      async (tx) => {
        const updated: Array<{ id: string }> = await tx
          .update(leaveApplicationTable)
          .set(patch)
          .where(eq(leaveApplicationTable.id, id))
          .returning({ id: leaveApplicationTable.id });
        if (updated.length === 0) {
          throw new NotFoundException('请假记录不存在');
        }

        if (attendanceIdsToMark.length === 0) {
          return [];
        }
        const marked: Array<{ id: string }> = await tx
          .update(attendanceRecordTable)
          .set({
            attendanceStatus: '请假',
            updatedAt: new Date(),
            updatedBy: userId,
          })
          .where(inArray(attendanceRecordTable.id, attendanceIdsToMark))
          .returning({ id: attendanceRecordTable.id });
        return marked.map((item: { id: string }): string => item.id);
      },
    );

    const syncResult: BitableSyncResult =
      await this.bitableSyncService.syncRecord('leave', id);
    for (const attendanceId of markedAttendanceIds) {
      // 回写失败不回滚本地（由 syncRecord 内部记录失败状态）
      await this.bitableSyncService.syncRecord('attendance', attendanceId);
    }

    this.logger.log(
      `请假审批完成：id=${id}, approvalStatus=${dto.approvalStatus}`,
    );
    if (markedAttendanceIds.length > 0) {
      this.logger.log(
        `请假审批通过同步考勤：leaveId=${id}, attendanceCount=${markedAttendanceIds.length}`,
      );
    }

    return { id, approvalStatus: dto.approvalStatus, syncStatus: syncResult.syncStatus };
  }

  /** 审批通过后，找出该学员该排期已有且状态非「请假」的考勤记录 ID；无记录则不创建 */
  private async findAttendanceIdsToMark(leave: LeaveRow): Promise<string[]> {
    const studentKeys: string[] = parseLinkRecordIds(leave.relatedStudent);
    const scheduleKeys: string[] = parseLinkRecordIds(leave.relatedSchedule);
    if (studentKeys.length === 0 || scheduleKeys.length === 0) {
      return [];
    }
    const expandedStudentKeys: string[] =
      await this.expandStudentKeys(studentKeys);
    const expandedScheduleKeys: string[] =
      await this.expandScheduleKeys(scheduleKeys);

    const attendanceRows: AttendanceRow[] = await this.db
      .select()
      .from(attendanceRecordTable)
      .where(
        and(
          this.linkCondition(
            attendanceRecordTable.appStudent,
            expandedStudentKeys,
          ),
          this.linkCondition(
            attendanceRecordTable.courseSchedule,
            expandedScheduleKeys,
          ),
        ),
      );

    return attendanceRows
      .filter((row: AttendanceRow): boolean => row.attendanceStatus !== '请假')
      .map((row: AttendanceRow): string => row.id);
  }

  private async expandStudentKeys(keys: string[]): Promise<string[]> {
    const { uuidIds, baseRecordIds } = splitUuidAndBaseIds(keys);
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
    const expanded: Set<string> = new Set<string>(keys);
    rows.forEach((row: StudentRow) => {
      expanded.add(row.id);
      if (row.baseRecordId) {
        expanded.add(row.baseRecordId);
      }
    });
    return Array.from(expanded);
  }

  private async expandScheduleKeys(keys: string[]): Promise<string[]> {
    const { uuidIds, baseRecordIds } = splitUuidAndBaseIds(keys);
    const rows: ScheduleRow[] = await this.db
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
    const expanded: Set<string> = new Set<string>(keys);
    rows.forEach((row: ScheduleRow) => {
      expanded.add(row.id);
      if (row.baseRecordId) {
        expanded.add(row.baseRecordId);
      }
    });
    return Array.from(expanded);
  }

}
