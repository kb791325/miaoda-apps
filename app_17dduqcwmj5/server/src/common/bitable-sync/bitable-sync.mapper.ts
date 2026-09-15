import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from '@lark-apaas/fullstack-nestjs-core';
import { eq, inArray } from 'drizzle-orm';
import {
  attendanceRecordTable,
  contentMaterialLibrary,
  courseCategory,
  courseGeneralTable,
  courseScheduleTable,
  enrollmentLeadTable,
  equipmentToolTable,
  faqKnowledgeBase,
  faqMiss,
  followUpRecordTable,
  formulaDetailTable,
  graduationRecordTable,
  leaveApplicationTable,
  marketingContent,
  processFlowTable,
  studentRegistrationTable,
} from '@server/database/schema';
import { toIsoOrNull } from '@server/src/common/utils/date';
import { normalizeAttendancePercent } from '@server/src/common/utils/percent';
import type { BitableRecordType } from '@shared/bitable-sync';

export interface BitableRecordSnapshot {
  bitableRecordId: string | null;
  baseRecordId: string | null;
  fields: Record<string, unknown>;
}

type StudentRow = typeof studentRegistrationTable.$inferSelect;
type ScheduleRow = typeof courseScheduleTable.$inferSelect;
type AttendanceRow = typeof attendanceRecordTable.$inferSelect;
type CourseRow = typeof courseGeneralTable.$inferSelect;
type CategoryRow = typeof courseCategory.$inferSelect;
type FaqRow = typeof faqKnowledgeBase.$inferSelect;
type FaqMissRow = typeof faqMiss.$inferSelect;
type MarketingContentRow = typeof marketingContent.$inferSelect;
type MaterialRow = typeof contentMaterialLibrary.$inferSelect;
type EquipmentRow = typeof equipmentToolTable.$inferSelect;
type ProcessFlowRow = typeof processFlowTable.$inferSelect;
type FormulaRow = typeof formulaDetailTable.$inferSelect;
type LeadRow = typeof enrollmentLeadTable.$inferSelect;
type FollowUpRow = typeof followUpRecordTable.$inferSelect;
type LeaveRow = typeof leaveApplicationTable.$inferSelect;
type GraduationRow = typeof graduationRecordTable.$inferSelect;

const CONTENT_TYPE_BITABLE_LABEL: Record<string, string> = {
  enrollment_copy: '招生文案',
  video_script: '短视频脚本',
  moments: '朋友圈',
  poster_copy: '海报文案',
};

const CONTENT_STATUS_BITABLE_LABEL: Record<string, string> = {
  pending_review: '待审核',
  available: '可用',
  rejected: '已驳回',
  used: '已使用',
};

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

function toDateTimestamp(
  value: Date | string | null | undefined,
): number | null {
  if (!value) {
    return null;
  }
  const parsed: number = new Date(value).getTime();
  return Number.isNaN(parsed) ? null : parsed;
}

@Injectable()
export class BitableSyncMapper {
  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  async loadSnapshot(
    recordType: BitableRecordType,
    recordId: string,
  ): Promise<BitableRecordSnapshot> {
    if (recordType === 'student') {
      return this.loadStudent(recordId);
    }
    if (recordType === 'schedule') {
      return this.loadSchedule(recordId);
    }
    if (recordType === 'attendance') {
      return this.loadAttendance(recordId);
    }
    if (recordType === 'course') {
      return this.loadCourse(recordId);
    }
    if (recordType === 'category') {
      return this.loadCategory(recordId);
    }
    if (recordType === 'faq') {
      return this.loadFaq(recordId);
    }
    if (recordType === 'faqMiss') {
      return this.loadFaqMiss(recordId);
    }
    if (recordType === 'marketingContent') {
      return this.loadMarketingContent(recordId);
    }
    if (recordType === 'material') {
      return this.loadMaterial(recordId);
    }
    if (recordType === 'equipment') {
      return this.loadEquipment(recordId);
    }
    if (recordType === 'processFlow') {
      return this.loadProcessFlow(recordId);
    }
    if (recordType === 'lead') {
      return this.loadLead(recordId);
    }
    if (recordType === 'followUp') {
      return this.loadFollowUp(recordId);
    }
    if (recordType === 'leave') {
      return this.loadLeave(recordId);
    }
    if (recordType === 'graduation') {
      return this.loadGraduation(recordId);
    }
    return this.loadFormula(recordId);
  }

  private async resolveBaseRecordIds(
    ids: string[],
    source: 'student' | 'schedule' | 'course' | 'lead',
  ): Promise<string[]> {
    const resolved: string[] = [];
    const uuidIds: string[] = [];
    ids.forEach((id: string) => {
      if (UUID_PATTERN.test(id)) {
        uuidIds.push(id);
      } else {
        resolved.push(id);
      }
    });
    if (uuidIds.length === 0) {
      return resolved;
    }
    if (source === 'student') {
      const rows: Array<{
        baseRecordId: string | null;
        bitableRecordId: string | null;
      }> = await this.db
        .select({
          baseRecordId: studentRegistrationTable.baseRecordId,
          bitableRecordId: studentRegistrationTable.bitableRecordId,
        })
        .from(studentRegistrationTable)
        .where(inArray(studentRegistrationTable.id, uuidIds));
      rows.forEach((row: { baseRecordId: string | null; bitableRecordId: string | null }) => {
        const recordId: string | null = row.baseRecordId ?? row.bitableRecordId;
        if (recordId) {
          resolved.push(recordId);
        }
      });
    } else if (source === 'schedule') {
      const rows: Array<{
        baseRecordId: string | null;
        bitableRecordId: string | null;
      }> = await this.db
        .select({
          baseRecordId: courseScheduleTable.baseRecordId,
          bitableRecordId: courseScheduleTable.bitableRecordId,
        })
        .from(courseScheduleTable)
        .where(inArray(courseScheduleTable.id, uuidIds));
      rows.forEach((row: { baseRecordId: string | null; bitableRecordId: string | null }) => {
        const recordId: string | null = row.baseRecordId ?? row.bitableRecordId;
        if (recordId) {
          resolved.push(recordId);
        }
      });
    } else if (source === 'course') {
      const rows: Array<{
        baseRecordId: string | null;
        bitableRecordId: string | null;
      }> = await this.db
        .select({
          baseRecordId: courseGeneralTable.baseRecordId,
          bitableRecordId: courseGeneralTable.bitableRecordId,
        })
        .from(courseGeneralTable)
        .where(inArray(courseGeneralTable.id, uuidIds));
      rows.forEach((row: { baseRecordId: string | null; bitableRecordId: string | null }) => {
        const recordId: string | null = row.baseRecordId ?? row.bitableRecordId;
        if (recordId) {
          resolved.push(recordId);
        }
      });
    } else {
      const rows: Array<{
        baseRecordId: string | null;
        bitableRecordId: string | null;
      }> = await this.db
        .select({
          baseRecordId: enrollmentLeadTable.baseRecordId,
          bitableRecordId: enrollmentLeadTable.bitableRecordId,
        })
        .from(enrollmentLeadTable)
        .where(inArray(enrollmentLeadTable.id, uuidIds));
      rows.forEach((row: { baseRecordId: string | null; bitableRecordId: string | null }) => {
        const recordId: string | null = row.baseRecordId ?? row.bitableRecordId;
        if (recordId) {
          resolved.push(recordId);
        }
      });
    }
    return resolved;
  }

  private async resolveCourseLink(value: unknown): Promise<string[]> {
    return this.resolveBaseRecordIds(parseLinkRecordIds(value), 'course');
  }

  private async loadStudent(recordId: string): Promise<BitableRecordSnapshot> {
    const rows: StudentRow[] = await this.db
      .select()
      .from(studentRegistrationTable)
      .where(eq(studentRegistrationTable.id, recordId));
    const row: StudentRow | undefined = rows[0];
    if (!row) {
      throw new NotFoundException(`学员 ${recordId} 不存在`);
    }

    const courseIds: string[] = await this.resolveBaseRecordIds(
      parseLinkRecordIds(row.enrollCourse),
      'course',
    );
    const fields: Record<string, unknown> = {
      学员姓名: row.studentName ?? '',
      联系电话: row.contactPhone ?? '',
    };
    if (row.wechatId) {
      fields['微信号'] = row.wechatId;
    }
    if (row.sourceChannel) {
      fields['来源渠道'] = row.sourceChannel;
    }
    const enrollmentTimestamp: number | null = toDateTimestamp(
      row.enrollmentDate,
    );
    if (enrollmentTimestamp !== null) {
      fields['报名日期'] = enrollmentTimestamp;
    }
    if (row.paymentStatus) {
      fields['缴费状态'] = row.paymentStatus;
    }
    if (row.paymentAmount !== null) {
      fields['缴费金额'] = Number(row.paymentAmount);
    }
    if (row.studyProgress) {
      fields['学习进度'] = row.studyProgress;
    }
    const graduationTimestamp: number | null = toDateTimestamp(
      row.graduationDate,
    );
    if (graduationTimestamp !== null) {
      fields['结业日期'] = graduationTimestamp;
    }
    if (row.remark) {
      fields['备注'] = row.remark;
    }
    if (courseIds.length > 0) {
      fields['报名课程'] = courseIds;
    }

    return {
      bitableRecordId: row.bitableRecordId,
      baseRecordId: row.baseRecordId,
      fields,
    };
  }

  private async loadSchedule(
    recordId: string,
  ): Promise<BitableRecordSnapshot> {
    const rows: ScheduleRow[] = await this.db
      .select()
      .from(courseScheduleTable)
      .where(eq(courseScheduleTable.id, recordId));
    const row: ScheduleRow | undefined = rows[0];
    if (!row) {
      throw new NotFoundException(`排期 ${recordId} 不存在`);
    }

    const courseIds: string[] = await this.resolveBaseRecordIds(
      parseLinkRecordIds(row.courseName),
      'course',
    );
    const studentIds: string[] = await this.resolveBaseRecordIds(
      parseLinkRecordIds(row.enrollStudent),
      'student',
    );
    const fields: Record<string, unknown> = {
      排期名称: row.scheduleName ?? '',
    };
    if (courseIds.length > 0) {
      fields['课程名称'] = courseIds;
    }
    const classTimestamp: number | null = toDateTimestamp(row.classDate);
    if (classTimestamp !== null) {
      fields['上课日期'] = classTimestamp;
    }
    if (row.startTime) {
      fields['开始时间'] = row.startTime;
    }
    if (row.endTime) {
      fields['结束时间'] = row.endTime;
    }
    if (row.lecturer) {
      const lecturerId: number = Number(row.lecturer);
      if (Number.isFinite(lecturerId)) {
        fields['授课讲师'] = [lecturerId];
      }
    }
    if (row.classroom) {
      fields['教室场地'] = row.classroom;
    }
    if (row.enrollmentCapacity !== null) {
      fields['招生容量'] = Number(row.enrollmentCapacity);
    }
    if (row.registeredCount !== null) {
      fields['已报名人数'] = Number(row.registeredCount);
    }
    if (row.remainingQuota !== null) {
      fields['剩余名额'] = Number(row.remainingQuota);
    }
    if (studentIds.length > 0) {
      fields['报名学员'] = studentIds;
    }
    if (row.appStatus) {
      fields['状态'] = row.appStatus;
    }

    return {
      bitableRecordId: row.bitableRecordId,
      baseRecordId: row.baseRecordId,
      fields,
    };
  }

  private async loadAttendance(
    recordId: string,
  ): Promise<BitableRecordSnapshot> {
    const rows: AttendanceRow[] = await this.db
      .select()
      .from(attendanceRecordTable)
      .where(eq(attendanceRecordTable.id, recordId));
    const row: AttendanceRow | undefined = rows[0];
    if (!row) {
      throw new NotFoundException(`考勤记录 ${recordId} 不存在`);
    }

    const studentIds: string[] = await this.resolveBaseRecordIds(
      parseLinkRecordIds(row.appStudent),
      'student',
    );
    const scheduleIds: string[] = await this.resolveBaseRecordIds(
      parseLinkRecordIds(row.courseSchedule),
      'schedule',
    );
    const fields: Record<string, unknown> = {};
    if (studentIds.length > 0) {
      fields['学员'] = studentIds;
    }
    if (scheduleIds.length > 0) {
      fields['课程排期'] = scheduleIds;
    }
    if (row.attendanceStatus) {
      fields['出勤状态'] = row.attendanceStatus;
    }
    if (row.remark) {
      fields['备注'] = row.remark;
    }

    return {
      bitableRecordId: row.bitableRecordId,
      baseRecordId: row.baseRecordId,
      fields,
    };
  }

  private async loadCourse(recordId: string): Promise<BitableRecordSnapshot> {
    const rows: CourseRow[] = await this.db
      .select()
      .from(courseGeneralTable)
      .where(eq(courseGeneralTable.id, recordId));
    const row: CourseRow | undefined = rows[0];
    if (!row) {
      throw new NotFoundException(`课程 ${recordId} 不存在`);
    }

    const fields: Record<string, unknown> = {
      课程名称: row.courseName ?? '',
      课程分类: row.courseCategory ?? '',
      难度等级: row.difficultyLevel ?? '',
      学习时长: row.studyDuration ?? '',
      课程简介: row.courseIntro ?? '',
      状态: row.status ?? '',
    };
    if (row.tuitionFee) {
      fields['学费'] = Number(row.tuitionFee);
    }

    return {
      bitableRecordId: row.bitableRecordId,
      baseRecordId: row.baseRecordId,
      fields,
    };
  }

  private async loadCategory(
    recordId: string,
  ): Promise<BitableRecordSnapshot> {
    const rows: CategoryRow[] = await this.db
      .select()
      .from(courseCategory)
      .where(eq(courseCategory.id, recordId));
    const row: CategoryRow | undefined = rows[0];
    if (!row) {
      throw new NotFoundException(`课程类别 ${recordId} 不存在`);
    }

    const fields: Record<string, unknown> = {
      类别名称: row.name,
    };

    return { bitableRecordId: row.bitableRecordId, baseRecordId: null, fields };
  }

  private async loadFaq(recordId: string): Promise<BitableRecordSnapshot> {
    const rows: FaqRow[] = await this.db
      .select()
      .from(faqKnowledgeBase)
      .where(eq(faqKnowledgeBase.id, recordId));
    const row: FaqRow | undefined = rows[0];
    if (!row) {
      throw new NotFoundException(`FAQ ${recordId} 不存在`);
    }

    const fields: Record<string, unknown> = {
      问题: row.appQuestion ?? '',
      标准答案: row.standardAnswer ?? '',
      分类: row.appCategory ?? '',
      相似问法: row.similarQuestion ?? '',
      状态: row.appStatus ?? '',
    };
    const keywords: string[] = (row.appKeyword ?? []).filter(
      (keyword: string | null): keyword is string => Boolean(keyword),
    );
    if (keywords.length > 0) {
      fields['关键词'] = keywords;
    }
    const faqUpdateTime: Date | null | undefined = row.updateTime;
    fields['更新时间'] =
      toIsoOrNull(faqUpdateTime) !== null && faqUpdateTime
        ? faqUpdateTime.getTime()
        : Date.now();
    fields['命中次数'] = Number(row.hitCount ?? 0);

    return {
      bitableRecordId: row.bitableRecordId,
      baseRecordId: row.baseRecordId,
      fields,
    };
  }

  private async loadFaqMiss(recordId: string): Promise<BitableRecordSnapshot> {
    const rows: FaqMissRow[] = await this.db
      .select()
      .from(faqMiss)
      .where(eq(faqMiss.id, recordId));
    const row: FaqMissRow | undefined = rows[0];
    if (!row) {
      throw new NotFoundException(`未命中问题 ${recordId} 不存在`);
    }

    const fields: Record<string, unknown> = {
      问题: row.question,
      状态: row.status === 'converted' ? '已转化' : '待处理',
    };

    return { bitableRecordId: row.bitableRecordId, baseRecordId: null, fields };
  }

  private async loadMarketingContent(
    recordId: string,
  ): Promise<BitableRecordSnapshot> {
    const rows: MarketingContentRow[] = await this.db
      .select()
      .from(marketingContent)
      .where(eq(marketingContent.id, recordId));
    const row: MarketingContentRow | undefined = rows[0];
    if (!row) {
      throw new NotFoundException(`营销内容 ${recordId} 不存在`);
    }

    const fields: Record<string, unknown> = {
      内容标题: row.title,
      内容类型: CONTENT_TYPE_BITABLE_LABEL[row.contentType] ?? row.contentType,
      正文: row.body,
      状态: CONTENT_STATUS_BITABLE_LABEL[row.status] ?? row.status,
    };
    const scheduleTimestamp: number | null = toDateTimestamp(row.scheduleDate);
    if (scheduleTimestamp !== null) {
      fields['计划发布日期'] = scheduleTimestamp;
    }
    if (row.rejectReason) {
      fields['驳回原因'] = row.rejectReason;
    }
    if (row.publishPlatform) {
      fields['发布平台'] = row.publishPlatform;
    }
    if (row.likeCount !== null) {
      fields['点赞数'] = row.likeCount;
    }
    if (row.conversionCount !== null) {
      fields['转化数'] = row.conversionCount;
    }
    const posterImages: unknown = row.posterImages;
    if (Array.isArray(posterImages) && posterImages.length > 0) {
      fields['海报图'] = JSON.stringify(posterImages);
    }
    const attachments: unknown = row.attachments;
    if (Array.isArray(attachments) && attachments.length > 0) {
      fields['附件清单'] = JSON.stringify(attachments);
    }
    if (row.courseId) {
      const courseRecordIds: string[] = await this.resolveBaseRecordIds(
        [row.courseId],
        'course',
      );
      if (courseRecordIds.length > 0) {
        fields['关联课程'] = courseRecordIds;
      }
    }

    return {
      bitableRecordId: row.bitableRecordId,
      baseRecordId: row.baseRecordId,
      fields,
    };
  }

  private async loadMaterial(
    recordId: string,
  ): Promise<BitableRecordSnapshot> {
    const rows: MaterialRow[] = await this.db
      .select()
      .from(contentMaterialLibrary)
      .where(eq(contentMaterialLibrary.id, recordId));
    const row: MaterialRow | undefined = rows[0];
    if (!row) {
      throw new NotFoundException(`素材 ${recordId} 不存在`);
    }

    const fields: Record<string, unknown> = {
      素材标题: row.materialTitle ?? '',
      素材类型: row.materialType ?? '',
      核心内容: row.coreContent ?? '',
      状态: row.status ?? '',
    };
    const platforms: string[] = (row.applicablePlatform ?? []).filter(
      (platform: string | null): platform is string => Boolean(platform),
    );
    if (platforms.length > 0) {
      fields['适用平台'] = platforms;
    }
    const tags: string[] = (row.tag ?? []).filter(
      (tag: string | null): tag is string => Boolean(tag),
    );
    if (tags.length > 0) {
      fields['标签'] = tags;
    }
    const courseIds: string[] = await this.resolveCourseLink(row.relatedCourse);
    if (courseIds.length > 0) {
      fields['关联课程'] = courseIds;
    }

    return {
      bitableRecordId: row.bitableRecordId,
      baseRecordId: row.baseRecordId,
      fields,
    };
  }

  private async loadEquipment(
    recordId: string,
  ): Promise<BitableRecordSnapshot> {
    const rows: EquipmentRow[] = await this.db
      .select()
      .from(equipmentToolTable)
      .where(eq(equipmentToolTable.id, recordId));
    const row: EquipmentRow | undefined = rows[0];
    if (!row) {
      throw new NotFoundException(`设备工具 ${recordId} 不存在`);
    }

    const fields: Record<string, unknown> = {
      设备工具名称: row.equipmentToolName ?? '',
      规格: row.specification ?? '',
      备注: row.remark ?? '',
    };
    if (row.quantity !== null) {
      fields['数量'] = Number(row.quantity);
    }
    const courseIds: string[] = await this.resolveCourseLink(
      row.courseAffiliation,
    );
    if (courseIds.length > 0) {
      fields['所属课程'] = courseIds;
    }

    return {
      bitableRecordId: row.bitableRecordId,
      baseRecordId: row.baseRecordId,
      fields,
    };
  }

  private async loadProcessFlow(
    recordId: string,
  ): Promise<BitableRecordSnapshot> {
    const rows: ProcessFlowRow[] = await this.db
      .select()
      .from(processFlowTable)
      .where(eq(processFlowTable.id, recordId));
    const row: ProcessFlowRow | undefined = rows[0];
    if (!row) {
      throw new NotFoundException(`工艺流程 ${recordId} 不存在`);
    }

    const fields: Record<string, unknown> = {
      步骤名称: row.stepName ?? '',
      操作描述: row.operationDesc ?? '',
      关键控制点: row.keyControlPoint ?? '',
      预计时长: row.estimatedDuration ?? '',
    };
    if (row.stepNo !== null) {
      fields['步骤序号'] = Number(row.stepNo);
    }
    const videos: string[] = (row.operationVideo ?? []).filter(
      (video: string | null): video is string => Boolean(video),
    );
    if (videos.length > 0) {
      fields['操作视频'] = videos.join('，');
    }
    const courseIds: string[] = await this.resolveCourseLink(row.course);
    if (courseIds.length > 0) {
      fields['所属课程'] = courseIds;
    }

    return {
      bitableRecordId: row.bitableRecordId,
      baseRecordId: row.baseRecordId,
      fields,
    };
  }

  private async loadFormula(
    recordId: string,
  ): Promise<BitableRecordSnapshot> {
    const rows: FormulaRow[] = await this.db
      .select()
      .from(formulaDetailTable)
      .where(eq(formulaDetailTable.id, recordId));
    const row: FormulaRow | undefined = rows[0];
    if (!row) {
      throw new NotFoundException(`配方明细 ${recordId} 不存在`);
    }

    const fields: Record<string, unknown> = {
      食材名称: row.ingredientName ?? '',
      单位: row.unit ?? '',
      食材分类: row.ingredientCategory ?? '',
      备注: row.remark ?? '',
    };
    if (row.quantity) {
      fields['用量'] = Number(row.quantity);
    }
    const courseIds: string[] = await this.resolveCourseLink(row.courseRelated);
    if (courseIds.length > 0) {
      fields['所属课程'] = courseIds;
    }

    return {
      bitableRecordId: row.bitableRecordId,
      baseRecordId: row.baseRecordId,
      fields,
    };
  }

  private async loadLead(recordId: string): Promise<BitableRecordSnapshot> {
    const rows: LeadRow[] = await this.db
      .select()
      .from(enrollmentLeadTable)
      .where(eq(enrollmentLeadTable.id, recordId));
    const row: LeadRow | undefined = rows[0];
    if (!row) {
      throw new NotFoundException(`招生线索 ${recordId} 不存在`);
    }

    const courseIds: string[] = await this.resolveBaseRecordIds(
      parseLinkRecordIds(row.intendedCourse),
      'course',
    );
    const fields: Record<string, unknown> = {
      线索姓名: row.clueName ?? '',
      手机号: row.phoneNumber ?? '',
    };
    if (row.sourceChannel) {
      fields['来源渠道'] = row.sourceChannel;
    }
    if (courseIds.length > 0) {
      fields['意向课程'] = courseIds;
    }
    if (row.intentionDegree) {
      fields['意向度'] = row.intentionDegree;
    }
    if (row.clueStatus) {
      fields['线索状态'] = row.clueStatus;
    }
    if (row.personInCharge) {
      const personId: number = Number(row.personInCharge);
      if (Number.isFinite(personId)) {
        fields['负责人'] = [personId];
      }
    }
    const firstConsultTimestamp: number | null = toDateTimestamp(
      row.firstConsultTime,
    );
    if (firstConsultTimestamp !== null) {
      fields['首次咨询时间'] = firstConsultTimestamp;
    }
    const nextFollowTimestamp: number | null = toDateTimestamp(
      row.nextFollowTime,
    );
    if (nextFollowTimestamp !== null) {
      fields['下次跟进时间'] = nextFollowTimestamp;
    }
    if (row.remark) {
      fields['备注'] = row.remark;
    }

    return {
      bitableRecordId: row.bitableRecordId,
      baseRecordId: row.baseRecordId,
      fields,
    };
  }

  private async loadFollowUp(
    recordId: string,
  ): Promise<BitableRecordSnapshot> {
    const rows: FollowUpRow[] = await this.db
      .select()
      .from(followUpRecordTable)
      .where(eq(followUpRecordTable.id, recordId));
    const row: FollowUpRow | undefined = rows[0];
    if (!row) {
      throw new NotFoundException(`跟进记录 ${recordId} 不存在`);
    }

    const leadIds: string[] = await this.resolveBaseRecordIds(
      parseLinkRecordIds(row.relatedClue),
      'lead',
    );
    const fields: Record<string, unknown> = {
      跟进内容: row.followUpContent ?? '',
    };
    if (leadIds.length > 0) {
      fields['关联线索'] = leadIds;
    }
    if (row.followUpMethod) {
      fields['跟进方式'] = row.followUpMethod;
    }
    const followTimestamp: number | null = toDateTimestamp(row.followUpTime);
    if (followTimestamp !== null) {
      fields['跟进时间'] = followTimestamp;
    }
    if (row.nextFollowUpPlan) {
      fields['下次跟进计划'] = row.nextFollowUpPlan;
    }
    if (row.follower) {
      const followerId: number = Number(row.follower);
      if (Number.isFinite(followerId)) {
        fields['跟进人'] = [followerId];
      }
    }

    return {
      bitableRecordId: row.bitableRecordId,
      baseRecordId: row.baseRecordId,
      fields,
    };
  }

  private async loadLeave(recordId: string): Promise<BitableRecordSnapshot> {
    const rows: LeaveRow[] = await this.db
      .select()
      .from(leaveApplicationTable)
      .where(eq(leaveApplicationTable.id, recordId));
    const row: LeaveRow | undefined = rows[0];
    if (!row) {
      throw new NotFoundException(`请假登记 ${recordId} 不存在`);
    }

    const studentIds: string[] = await this.resolveBaseRecordIds(
      parseLinkRecordIds(row.relatedStudent),
      'student',
    );
    const scheduleIds: string[] = await this.resolveBaseRecordIds(
      parseLinkRecordIds(row.relatedSchedule),
      'schedule',
    );
    const fields: Record<string, unknown> = {
      请假事由: row.leaveReason ?? '',
    };
    if (studentIds.length > 0) {
      fields['关联学员'] = studentIds;
    }
    if (scheduleIds.length > 0) {
      fields['关联排期'] = scheduleIds;
    }
    if (row.leaveType) {
      fields['请假类型'] = row.leaveType;
    }
    const applyTimestamp: number | null = toDateTimestamp(row.applyTime);
    if (applyTimestamp !== null) {
      fields['申请时间'] = applyTimestamp;
    }
    if (row.approvalStatus) {
      fields['审批状态'] = row.approvalStatus;
    }
    if (row.approvalRemark) {
      fields['审批备注'] = row.approvalRemark;
    }

    return {
      bitableRecordId: row.bitableRecordId,
      baseRecordId: row.baseRecordId,
      fields,
    };
  }

  private async loadGraduation(
    recordId: string,
  ): Promise<BitableRecordSnapshot> {
    const rows: GraduationRow[] = await this.db
      .select()
      .from(graduationRecordTable)
      .where(eq(graduationRecordTable.id, recordId));
    const row: GraduationRow | undefined = rows[0];
    if (!row) {
      throw new NotFoundException(`结业档案 ${recordId} 不存在`);
    }

    const studentIds: string[] = await this.resolveBaseRecordIds(
      parseLinkRecordIds(row.relatedStudent),
      'student',
    );
    const courseIds: string[] = await this.resolveBaseRecordIds(
      parseLinkRecordIds(row.relatedCourse),
      'course',
    );
    const fields: Record<string, unknown> = {
      结业证书编号: row.graduationCertNo ?? '',
    };
    if (studentIds.length > 0) {
      fields['关联学员'] = studentIds;
    }
    if (courseIds.length > 0) {
      fields['关联课程'] = courseIds;
    }
    const startTimestamp: number | null = toDateTimestamp(
      row.trainingStartDate,
    );
    if (startTimestamp !== null) {
      fields['培训开始日期'] = startTimestamp;
    }
    const endTimestamp: number | null = toDateTimestamp(row.trainingEndDate);
    if (endTimestamp !== null) {
      fields['培训结束日期'] = endTimestamp;
    }
    if (row.totalClassHours !== null) {
      fields['总课时'] = Number(row.totalClassHours);
    }
    if (row.attendanceHours !== null) {
      fields['出勤课时'] = Number(row.attendanceHours);
    }
    if (row.attendanceRate !== null || row.attendanceHours !== null) {
      const percent: number = normalizeAttendancePercent({
        attendanceRate: row.attendanceRate,
        attendanceHours: row.attendanceHours,
        totalClassHours: row.totalClassHours,
      });
      fields['出勤率'] = Number((percent / 100).toFixed(4));
    }
    if (row.practicalEvaluation) {
      fields['实操评价'] = row.practicalEvaluation;
    }
    if (row.theoreticalEvaluation) {
      fields['理论评价'] = row.theoreticalEvaluation;
    }
    const graduationTimestamp: number | null = toDateTimestamp(
      row.graduationDate,
    );
    if (graduationTimestamp !== null) {
      fields['结业日期'] = graduationTimestamp;
    }
    if (row.certificateIssuanceStatus) {
      fields['发证状态'] = row.certificateIssuanceStatus;
    }

    return {
      bitableRecordId: row.bitableRecordId,
      baseRecordId: row.baseRecordId,
      fields,
    };
  }
}
