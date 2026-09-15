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
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  isNotNull,
  lt,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import {
  courseGeneralTable,
  enrollmentLeadTable,
  followUpRecordTable,
  studentRegistrationTable,
} from '@server/database/schema';
import { BitableSyncService } from '@server/src/common/bitable-sync/bitable-sync.service';
import {
  isValidDateTime,
  shanghaiDayKey,
  shanghaiDayRange,
  toIsoOrNull,
} from '@server/src/common/utils/date';
import { resolveDisplaySyncStatus } from '@shared/bitable-sync';
import type { BitableSyncResult } from '@shared/bitable-sync';
import {
  LEAD_STATUS_ENROLLED,
  LEAD_STATUS_FOLLOWING,
  LEAD_STATUS_NEW,
} from '@shared/lead';
import type {
  ConvertLeadResponse,
  CreateFollowUpRequest,
  CreateFollowUpResponse,
  CreateLeadRequest,
  CreateLeadResponse,
  DeleteLeadResponse,
  FollowUpRecordItem,
  LeadChannelCountItem,
  LeadCourseRef,
  LeadDetail,
  LeadDetailResponse,
  LeadIntentionCountItem,
  LeadListItem,
  LeadListResponse,
  LeadStatsResponse,
  LeadStatusCountItem,
  LeadTodoItem,
  LeadTodoResponse,
  UpdateLeadRequest,
  UpdateLeadResponse,
} from '@shared/lead';

export interface LeadListQuery {
  clueStatus?: string;
  intentionDegree?: string;
  sourceChannel?: string;
  personInCharge?: string;
  keyword?: string;
  page: number;
  pageSize: number;
}

type LeadRow = typeof enrollmentLeadTable.$inferSelect;
type LeadInsert = typeof enrollmentLeadTable.$inferInsert;
type FollowUpRow = typeof followUpRecordTable.$inferSelect;

const UUID_PATTERN: RegExp =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;
const TODO_STATUS_LIST: string[] = [LEAD_STATUS_NEW, LEAD_STATUS_FOLLOWING];
const TODO_LIMIT: number = 20;
const SHANGHAI_DATE_PATTERN: RegExp = /(\d{4})-(\d{1,2})-(\d{1,2})/u;

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

function padTwo(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

function parsePlanDate(plan: string): Date | null {
  const matched: RegExpExecArray | null =
    SHANGHAI_DATE_PATTERN.exec(plan);
  if (!matched) {
    return null;
  }
  const year: string = matched[1];
  const month: string = padTwo(Number(matched[2]));
  const day: string = padTwo(Number(matched[3]));
  const parsed: Date = new Date(`${year}-${month}-${day}T10:00:00+08:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

@Injectable()
export class LeadService {
  private readonly logger = new Logger(LeadService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    private readonly bitableSyncService: BitableSyncService,
  ) {}

  private linkContains(key: string): SQL {
    return sql`${followUpRecordTable.relatedClue}->'link_record_ids' @> ${JSON.stringify(
      [key],
    )}::jsonb`;
  }

  private leadLinkCondition(row: LeadRow): SQL {
    const conditions: SQL[] = [this.linkContains(row.id)];
    if (row.baseRecordId) {
      conditions.push(this.linkContains(row.baseRecordId));
    }
    if (conditions.length === 1) {
      return conditions[0];
    }
    const combined: SQL | undefined = or(...conditions);
    return combined as SQL;
  }

  /** 课程 uuid → 多维表格关联 id（有 baseRecordId 用之，否则用自身 uuid） */
  private async resolveCourseLinkIds(
    courseIds: string[],
  ): Promise<string[]> {
    if (courseIds.length === 0) {
      return [];
    }
    const courseRows: Array<{
      id: string;
      baseRecordId: string | null;
    }> = await this.db
      .select({
        id: courseGeneralTable.id,
        baseRecordId: courseGeneralTable.baseRecordId,
      })
      .from(courseGeneralTable)
      .where(inArray(courseGeneralTable.id, courseIds));
    const foundIds: Set<string> = new Set(
      courseRows.map((course: { id: string }) => course.id),
    );
    const linkIds: string[] = courseRows.map(
      (course: { id: string; baseRecordId: string | null }) =>
        course.baseRecordId ?? course.id,
    );
    courseIds.forEach((courseId: string) => {
      if (!foundIds.has(courseId) && !linkIds.includes(courseId)) {
        linkIds.push(courseId);
      }
    });
    return linkIds;
  }

  /** 根据 link_record_ids 批量解析课程名（双条件：uuid / baseRecordId） */
  private async resolveCourseNames(
    linkIds: string[],
  ): Promise<Map<string, LeadCourseRef>> {
    const resultMap: Map<string, LeadCourseRef> = new Map();
    if (linkIds.length === 0) {
      return resultMap;
    }
    const uuidIds: string[] = linkIds.filter((value: string) =>
      UUID_PATTERN.test(value),
    );
    const baseRecordIds: string[] = linkIds.filter(
      (value: string) => !UUID_PATTERN.test(value),
    );
    const courseRows: Array<{
      id: string;
      courseName: string | null;
      baseRecordId: string | null;
    }> = await this.db
      .select({
        id: courseGeneralTable.id,
        courseName: courseGeneralTable.courseName,
        baseRecordId: courseGeneralTable.baseRecordId,
      })
      .from(courseGeneralTable)
      .where(
        or(
          baseRecordIds.length > 0
            ? inArray(courseGeneralTable.baseRecordId, baseRecordIds)
            : undefined,
          uuidIds.length > 0
            ? inArray(courseGeneralTable.id, uuidIds)
            : undefined,
        ),
      );
    courseRows.forEach(
      (course: {
        id: string;
        courseName: string | null;
        baseRecordId: string | null;
      }) => {
        const ref: LeadCourseRef = {
          id: course.id,
          courseName: course.courseName ?? '',
        };
        resultMap.set(course.id, ref);
        if (course.baseRecordId) {
          resultMap.set(course.baseRecordId, ref);
        }
      },
    );
    return resultMap;
  }

  async listLeads(query: LeadListQuery): Promise<LeadListResponse> {
    const conditions: SQL[] = [];
    if (query.clueStatus) {
      conditions.push(eq(enrollmentLeadTable.clueStatus, query.clueStatus));
    }
    if (query.intentionDegree) {
      conditions.push(
        eq(enrollmentLeadTable.intentionDegree, query.intentionDegree),
      );
    }
    if (query.sourceChannel) {
      conditions.push(
        eq(enrollmentLeadTable.sourceChannel, query.sourceChannel),
      );
    }
    if (query.personInCharge) {
      conditions.push(
        sql`(${enrollmentLeadTable.personInCharge}).user_id = ${query.personInCharge}`,
      );
    }
    if (query.keyword) {
      const keywordCondition: SQL | undefined = or(
        ilike(enrollmentLeadTable.clueName, `%${query.keyword}%`),
        ilike(enrollmentLeadTable.phoneNumber, `%${query.keyword}%`),
      );
      if (keywordCondition) {
        conditions.push(keywordCondition);
      }
    }
    const whereClause: SQL | undefined =
      conditions.length > 0 ? and(...conditions) : undefined;

    const rows: LeadRow[] = await this.db
      .select()
      .from(enrollmentLeadTable)
      .where(whereClause)
      .orderBy(desc(enrollmentLeadTable.createdAt))
      .limit(query.pageSize)
      .offset((query.page - 1) * query.pageSize);

    const totalRows: Array<{ count: number }> = await this.db
      .select({ count: count() })
      .from(enrollmentLeadTable)
      .where(whereClause);
    const total: number = Number(totalRows[0]?.count ?? 0);

    const allLinkIds: string[] = [];
    rows.forEach((row: LeadRow) => {
      extractLinkRecordIds(row.intendedCourse).forEach((id: string) => {
        if (!allLinkIds.includes(id)) {
          allLinkIds.push(id);
        }
      });
    });
    const courseMap: Map<string, LeadCourseRef> =
      await this.resolveCourseNames(allLinkIds);

    const items: LeadListItem[] = rows.map((row: LeadRow) => {
      const courseRefs: LeadCourseRef[] = [];
      extractLinkRecordIds(row.intendedCourse).forEach((id: string) => {
        const ref: LeadCourseRef | undefined = courseMap.get(id);
        if (ref && !courseRefs.some((item: LeadCourseRef) => item.id === ref.id)) {
          courseRefs.push(ref);
        }
      });
      return {
        id: row.id,
        clueName: row.clueName ?? '',
        phoneNumber: row.phoneNumber ?? '',
        sourceChannel: row.sourceChannel,
        intendedCourses: courseRefs,
        intentionDegree: row.intentionDegree,
        clueStatus: row.clueStatus,
        personInCharge: row.personInCharge,
        nextFollowTime: toIsoOrNull(row.nextFollowTime),
        syncStatus: resolveDisplaySyncStatus(
          row.syncStatus,
          row.bitableRecordId,
          row.baseRecordId,
        ),
        createdAt: row.createdAt.toISOString(),
      };
    });

    this.logger.log(
      `线索列表查询：page=${query.page}, pageSize=${query.pageSize}, total=${total}`,
    );
    return { items, total };
  }

  async getLeadDetail(leadId: string): Promise<LeadDetailResponse> {
    const rows: LeadRow[] = await this.db
      .select()
      .from(enrollmentLeadTable)
      .where(eq(enrollmentLeadTable.id, leadId));
    const row: LeadRow | undefined = rows[0];
    if (!row) {
      throw new NotFoundException(`线索 ${leadId} 不存在`);
    }

    const courseLinkIds: string[] = extractLinkRecordIds(row.intendedCourse);
    const courseMap: Map<string, LeadCourseRef> =
      await this.resolveCourseNames(courseLinkIds);
    const courses: LeadCourseRef[] = [];
    courseLinkIds.forEach((id: string) => {
      const ref: LeadCourseRef | undefined = courseMap.get(id);
      if (ref && !courses.some((item: LeadCourseRef) => item.id === ref.id)) {
        courses.push(ref);
      }
    });

    const followUpRows: FollowUpRow[] = await this.db
      .select()
      .from(followUpRecordTable)
      .where(this.leadLinkCondition(row))
      .orderBy(sql`${followUpRecordTable.followUpTime} DESC NULLS LAST`);

    const followUps: FollowUpRecordItem[] = followUpRows.map(
      (record: FollowUpRow) => ({
        id: record.id,
        followUpContent: record.followUpContent,
        followUpMethod: record.followUpMethod,
        followUpTime: toIsoOrNull(record.followUpTime),
        nextFollowUpPlan: record.nextFollowUpPlan,
        follower: record.follower,
      }),
    );

    const lead: LeadDetail = {
      id: row.id,
      clueName: row.clueName ?? '',
      phoneNumber: row.phoneNumber ?? '',
      sourceChannel: row.sourceChannel,
      intentionDegree: row.intentionDegree,
      clueStatus: row.clueStatus,
      personInCharge: row.personInCharge,
      firstConsultTime: toIsoOrNull(row.firstConsultTime),
      nextFollowTime: toIsoOrNull(row.nextFollowTime),
      remark: row.remark,
      syncStatus: resolveDisplaySyncStatus(
        row.syncStatus,
        row.bitableRecordId,
        row.baseRecordId,
      ),
      createdAt: row.createdAt.toISOString(),
    };

    return { lead, courses, followUps };
  }

  async createLead(
    dto: CreateLeadRequest,
    userId: string,
  ): Promise<CreateLeadResponse> {
    const courseLinkIds: string[] = await this.resolveCourseLinkIds(
      dto.intendedCourseIds ?? [],
    );

    if (dto.firstConsultTime && !isValidDateTime(dto.firstConsultTime)) {
      throw new BadRequestException('首次咨询时间格式不正确');
    }
    if (dto.nextFollowTime && !isValidDateTime(dto.nextFollowTime)) {
      throw new BadRequestException('下次跟进时间格式不正确');
    }

    const insertValue: LeadInsert = {
      clueName: dto.clueName,
      phoneNumber: dto.phoneNumber,
      sourceChannel: dto.sourceChannel,
      intendedCourse: { link_record_ids: courseLinkIds },
      intentionDegree: dto.intentionDegree ?? null,
      clueStatus: LEAD_STATUS_NEW,
      personInCharge: dto.personInCharge ?? null,
      firstConsultTime: dto.firstConsultTime
        ? new Date(dto.firstConsultTime)
        : null,
      nextFollowTime: dto.nextFollowTime
        ? new Date(dto.nextFollowTime)
        : null,
      remark: dto.remark ?? null,
      createdBy: userId,
      updatedBy: userId,
    };

    const inserted: Array<{ id: string }> = await this.db
      .insert(enrollmentLeadTable)
      .values(insertValue)
      .returning({ id: enrollmentLeadTable.id });
    const insertedId: string | undefined = inserted[0]?.id;
    if (!insertedId) {
      throw new NotFoundException('线索写入失败');
    }

    this.logger.log(
      `招生线索创建成功：${JSON.stringify({
        id: insertedId,
        clueName: dto.clueName,
      })}`,
    );

    const syncResult: BitableSyncResult =
      await this.bitableSyncService.syncRecord('lead', insertedId);
    return { id: insertedId, syncStatus: syncResult.syncStatus };
  }

  async updateLead(
    leadId: string,
    dto: UpdateLeadRequest,
    userId: string,
  ): Promise<UpdateLeadResponse> {
    const patch: Partial<LeadInsert> = {};
    if (dto.clueName !== undefined) {
      patch.clueName = dto.clueName;
    }
    if (dto.phoneNumber !== undefined) {
      patch.phoneNumber = dto.phoneNumber;
    }
    if (dto.sourceChannel !== undefined) {
      patch.sourceChannel = dto.sourceChannel;
    }
    if (dto.intendedCourseIds !== undefined) {
      const linkIds: string[] = await this.resolveCourseLinkIds(
        dto.intendedCourseIds,
      );
      patch.intendedCourse = { link_record_ids: linkIds };
    }
    if (dto.intentionDegree !== undefined) {
      patch.intentionDegree = dto.intentionDegree;
    }
    if (dto.clueStatus !== undefined) {
      patch.clueStatus = dto.clueStatus;
    }
    if (dto.personInCharge !== undefined) {
      patch.personInCharge = dto.personInCharge;
    }
    if (dto.firstConsultTime !== undefined) {
      patch.firstConsultTime = dto.firstConsultTime
        ? new Date(dto.firstConsultTime)
        : null;
      if (
        patch.firstConsultTime !== null &&
        Number.isNaN(patch.firstConsultTime.getTime())
      ) {
        throw new BadRequestException('首次咨询时间格式不正确');
      }
    }
    if (dto.nextFollowTime !== undefined) {
      patch.nextFollowTime = dto.nextFollowTime
        ? new Date(dto.nextFollowTime)
        : null;
      if (
        patch.nextFollowTime !== null &&
        Number.isNaN(patch.nextFollowTime.getTime())
      ) {
        throw new BadRequestException('下次跟进时间格式不正确');
      }
    }
    if (dto.remark !== undefined) {
      patch.remark = dto.remark;
    }
    if (Object.keys(patch).length === 0) {
      throw new NotFoundException('未提供可更新字段');
    }
    patch.updatedAt = new Date();
    patch.updatedBy = userId;

    const updated: Array<{ id: string }> = await this.db
      .update(enrollmentLeadTable)
      .set(patch)
      .where(eq(enrollmentLeadTable.id, leadId))
      .returning({ id: enrollmentLeadTable.id });
    if (updated.length === 0) {
      throw new NotFoundException(`线索 ${leadId} 不存在`);
    }

    this.logger.log(`线索信息更新：${JSON.stringify({ id: leadId })}`);
    const syncResult: BitableSyncResult =
      await this.bitableSyncService.syncRecord('lead', leadId);
    return { id: leadId, syncStatus: syncResult.syncStatus };
  }

  async deleteLead(leadId: string): Promise<DeleteLeadResponse> {
    const rows: LeadRow[] = await this.db
      .select()
      .from(enrollmentLeadTable)
      .where(eq(enrollmentLeadTable.id, leadId));
    const row: LeadRow | undefined = rows[0];
    if (!row) {
      throw new NotFoundException(`线索 ${leadId} 不存在`);
    }

    const followUpCountRows: Array<{ count: number }> = await this.db
      .select({ count: count() })
      .from(followUpRecordTable)
      .where(this.leadLinkCondition(row));
    const followUpCount: number = Number(followUpCountRows[0]?.count ?? 0);
    if (followUpCount > 0) {
      throw new ConflictException(
        `该线索仍有 ${followUpCount} 条跟进记录，无法删除`,
      );
    }

    const syncResult: BitableSyncResult =
      await this.bitableSyncService.deleteRecord('lead', leadId);
    if (syncResult.syncStatus === 'failed') {
      this.logger.warn(
        `线索删除时多维表格同步异常，本地仍继续删除：${JSON.stringify({
          id: leadId,
          message: syncResult.message,
        })}`,
      );
    }

    const deleted: Array<{ id: string }> = await this.db
      .delete(enrollmentLeadTable)
      .where(eq(enrollmentLeadTable.id, leadId))
      .returning({ id: enrollmentLeadTable.id });
    if (deleted.length === 0) {
      throw new NotFoundException(`线索 ${leadId} 不存在`);
    }

    this.logger.log(
      `线索已删除：${JSON.stringify({ id: leadId, clueName: row.clueName })}`,
    );
    return { id: leadId, syncStatus: syncResult.syncStatus };
  }

  async createFollowUp(
    leadId: string,
    dto: CreateFollowUpRequest,
    userId: string,
  ): Promise<CreateFollowUpResponse> {
    const leadRows: LeadRow[] = await this.db
      .select()
      .from(enrollmentLeadTable)
      .where(eq(enrollmentLeadTable.id, leadId));
    const leadRow: LeadRow | undefined = leadRows[0];
    if (!leadRow) {
      throw new NotFoundException(`线索 ${leadId} 不存在`);
    }

    const followUpTime: Date = dto.followUpTime
      ? new Date(dto.followUpTime)
      : new Date();
    if (Number.isNaN(followUpTime.getTime())) {
      throw new BadRequestException('跟进时间格式不正确');
    }
    const relatedClueKey: string = leadRow.baseRecordId ?? leadRow.id;

    const followUpId: string = await this.db.transaction(async (tx) => {
      const inserted: Array<{ id: string }> = await tx
        .insert(followUpRecordTable)
        .values({
          followUpContent: dto.followUpContent,
          relatedClue: { link_record_ids: [relatedClueKey] },
          followUpMethod: dto.followUpMethod,
          followUpTime,
          nextFollowUpPlan: dto.nextFollowUpPlan ?? null,
          follower: userId,
          createdBy: userId,
          updatedBy: userId,
        })
        .returning({ id: followUpRecordTable.id });
      const newFollowUpId: string | undefined = inserted[0]?.id;
      if (!newFollowUpId) {
        throw new NotFoundException('跟进记录写入失败');
      }

      const leadPatch: Partial<LeadInsert> = {
        updatedAt: new Date(),
        updatedBy: userId,
      };
      if (leadRow.clueStatus === LEAD_STATUS_NEW) {
        leadPatch.clueStatus = LEAD_STATUS_FOLLOWING;
      }
      if (dto.nextFollowUpPlan) {
        const planDate: Date | null = parsePlanDate(dto.nextFollowUpPlan);
        if (planDate) {
          leadPatch.nextFollowTime = planDate;
        }
      }
      await tx
        .update(enrollmentLeadTable)
        .set(leadPatch)
        .where(eq(enrollmentLeadTable.id, leadId));
      return newFollowUpId;
    });

    this.logger.log(
      `跟进记录创建成功：${JSON.stringify({ followUpId, leadId })}`,
    );

    const followUpSyncResult: BitableSyncResult =
      await this.bitableSyncService.syncRecord('followUp', followUpId);
    const leadSyncResult: BitableSyncResult =
      await this.bitableSyncService.syncRecord('lead', leadId);
    return {
      id: followUpId,
      syncStatus: followUpSyncResult.syncStatus,
      leadSyncStatus: leadSyncResult.syncStatus,
    };
  }

  async convertLead(
    leadId: string,
    userId: string,
  ): Promise<ConvertLeadResponse> {
    const leadRows: LeadRow[] = await this.db
      .select()
      .from(enrollmentLeadTable)
      .where(eq(enrollmentLeadTable.id, leadId));
    const leadRow: LeadRow | undefined = leadRows[0];
    if (!leadRow) {
      throw new NotFoundException(`线索 ${leadId} 不存在`);
    }
    if (leadRow.clueStatus === LEAD_STATUS_ENROLLED) {
      throw new ConflictException('该线索已报名，请勿重复转化');
    }

    const enrollmentDate: string = shanghaiDayKey();
    const studentId: string = await this.db.transaction(async (tx) => {
      const inserted: Array<{ id: string }> = await tx
        .insert(studentRegistrationTable)
        .values({
          studentName: leadRow.clueName,
          contactPhone: leadRow.phoneNumber,
          sourceChannel: leadRow.sourceChannel,
          enrollCourse: leadRow.intendedCourse ?? { link_record_ids: [] },
          enrollmentDate,
          studyProgress: '未开始',
          managerProfile: leadRow.personInCharge,
          createdBy: userId,
          updatedBy: userId,
        })
        .returning({ id: studentRegistrationTable.id });
      const newStudentId: string | undefined = inserted[0]?.id;
      if (!newStudentId) {
        throw new NotFoundException('学员登记写入失败');
      }

      const leadPatch: Partial<LeadInsert> = {
        clueStatus: LEAD_STATUS_ENROLLED,
        updatedAt: new Date(),
        updatedBy: userId,
      };
      await tx
        .update(enrollmentLeadTable)
        .set(leadPatch)
        .where(eq(enrollmentLeadTable.id, leadId));
      return newStudentId;
    });

    const studentSyncResult: BitableSyncResult =
      await this.bitableSyncService.syncRecord('student', studentId);
    const leadSyncResult: BitableSyncResult =
      await this.bitableSyncService.syncRecord('lead', leadId);

    this.logger.log(
      `线索转学员成功：${JSON.stringify({ leadId, studentId })}`,
    );
    return {
      studentId,
      syncStatus: studentSyncResult.syncStatus,
      leadSyncStatus: leadSyncResult.syncStatus,
    };
  }

  async getLeadStats(): Promise<LeadStatsResponse> {
    const statusRows: Array<{ status: string | null; count: number }> =
      await this.db
        .select({ status: enrollmentLeadTable.clueStatus, count: count() })
        .from(enrollmentLeadTable)
        .groupBy(enrollmentLeadTable.clueStatus);
    const channelRows: Array<{ channel: string | null; count: number }> =
      await this.db
        .select({
          channel: enrollmentLeadTable.sourceChannel,
          count: count(),
        })
        .from(enrollmentLeadTable)
        .where(isNotNull(enrollmentLeadTable.sourceChannel))
        .groupBy(enrollmentLeadTable.sourceChannel);
    const intentionRows: Array<{
      intentionDegree: string | null;
      count: number;
    }> = await this.db
      .select({
        intentionDegree: enrollmentLeadTable.intentionDegree,
        count: count(),
      })
      .from(enrollmentLeadTable)
      .where(isNotNull(enrollmentLeadTable.intentionDegree))
      .groupBy(enrollmentLeadTable.intentionDegree);

    const statusCounts: LeadStatusCountItem[] = statusRows
      .filter((rowItem: { status: string | null }) => Boolean(rowItem.status))
      .map((rowItem: { status: string | null; count: number }) => ({
        status: rowItem.status ?? '',
        count: Number(rowItem.count),
      }));
    const channelCounts: LeadChannelCountItem[] = channelRows
      .filter((rowItem: { channel: string | null }) =>
        Boolean(rowItem.channel?.trim()),
      )
      .map((rowItem: { channel: string | null; count: number }) => ({
        channel: (rowItem.channel ?? '').trim(),
        count: Number(rowItem.count),
      }))
      .sort(
        (a: LeadChannelCountItem, b: LeadChannelCountItem) =>
          b.count - a.count,
      );
    const intentionCounts: LeadIntentionCountItem[] = intentionRows.map(
      (rowItem: { intentionDegree: string | null; count: number }) => ({
        intentionDegree: rowItem.intentionDegree ?? '',
        count: Number(rowItem.count),
      }),
    );

    const total: number = statusCounts.reduce(
      (sum: number, item: LeadStatusCountItem) => sum + item.count,
      0,
    );
    const enrolledCount: number = statusCounts
      .filter((item: LeadStatusCountItem) => item.status === LEAD_STATUS_ENROLLED)
      .reduce((sum: number, item: LeadStatusCountItem) => sum + item.count, 0);
    const conversionRate: number =
      total > 0 ? Number((enrolledCount / total).toFixed(4)) : 0;

    return { total, statusCounts, channelCounts, intentionCounts, conversionRate };
  }

  async getLeadTodos(): Promise<LeadTodoResponse> {
    const todayRange: { start: Date; end: Date } = shanghaiDayRange();

    const rows: LeadRow[] = await this.db
      .select()
      .from(enrollmentLeadTable)
      .where(
        and(
          inArray(enrollmentLeadTable.clueStatus, TODO_STATUS_LIST),
          isNotNull(enrollmentLeadTable.nextFollowTime),
          lt(enrollmentLeadTable.nextFollowTime, todayRange.end),
        ),
      )
      .orderBy(asc(enrollmentLeadTable.nextFollowTime))
      .limit(TODO_LIMIT);

    const items: LeadTodoItem[] = rows.map((row: LeadRow) => ({
      leadId: row.id,
      name: row.clueName ?? '',
      phone: row.phoneNumber ?? '',
      nextFollowTime: toIsoOrNull(row.nextFollowTime),
      overdue: row.nextFollowTime
        ? row.nextFollowTime.getTime() < todayRange.start.getTime()
        : false,
    }));

    return { items };
  }
}
