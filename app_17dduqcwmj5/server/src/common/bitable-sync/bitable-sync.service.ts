import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  CapabilityService,
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from '@lark-apaas/fullstack-nestjs-core';
import { eq, isNull } from 'drizzle-orm';
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
import type {
  BitableRecordType,
  BitableRepairSummary,
  BitableSyncResult,
  BitableSyncStatus,
} from '@shared/bitable-sync';
import {
  ACTION_KEY_BATCH_ADD_RECORDS,
  ACTION_KEY_BATCH_DELETE_RECORDS,
  ACTION_KEY_BATCH_UPDATE_RECORDS,
  ACTION_KEY_DELETE_RECORDS,
  BITABLE_ATTENDANCE_PLUGIN_ID,
  BITABLE_COURSE_PLUGIN_ID,
  BITABLE_EQUIPMENT_PLUGIN_ID,
  BITABLE_FAQ_PLUGIN_ID,
  BITABLE_FOLLOW_UP_PLUGIN_ID,
  BITABLE_FORMULA_PLUGIN_ID,
  BITABLE_GRADUATION_PLUGIN_ID,
  BITABLE_LEAD_PLUGIN_ID,
  BITABLE_LEAVE_PLUGIN_ID,
  BITABLE_MARKETING_CONTENT_PLUGIN_ID,
  BITABLE_MATERIAL_PLUGIN_ID,
  BITABLE_PROCESS_PLUGIN_ID,
  BITABLE_SCHEDULE_PLUGIN_ID,
  BITABLE_STUDENT_PLUGIN_ID,
} from './bitable-sync.constants';
import {
  BitableSyncMapper,
  type BitableRecordSnapshot,
} from './bitable-sync.mapper';

interface BitableBatchOutputRecord {
  id: string;
}

interface BitableBatchOutput {
  records?: BitableBatchOutputRecord[];
}

const COURSE_LINK_FIELD_NAME = '所属课程';
const LINKED_CLEANUP_PAGE_SIZE = 100;
const LINKED_CLEANUP_MAX_PAGES = 20;

interface RemoteRecordShape {
  id?: unknown;
  record?: Record<string, unknown>;
}

function extractLinkRecordIds(value: unknown): string[] {
  const ids: string[] = [];
  const pushId = (candidate: unknown): void => {
    if (typeof candidate === 'string' && candidate.length > 0) {
      ids.push(candidate);
    }
  };
  if (Array.isArray(value)) {
    value.forEach((item: unknown) => {
      if (typeof item === 'string') {
        pushId(item);
        return;
      }
      if (typeof item === 'object' && item !== null) {
        extractLinkRecordIds(item).forEach(pushId);
      }
    });
    return ids;
  }
  if (typeof value === 'object' && value !== null) {
    const shape: Record<string, unknown> = value as Record<string, unknown>;
    const candidates: unknown[] = [
      shape.link_record_ids,
      shape.record_ids,
      shape.linkRecordIds,
    ];
    candidates.forEach((candidate: unknown) => {
      if (Array.isArray(candidate)) {
        candidate.forEach(pushId);
      }
    });
  }
  return ids;
}

// TODO: 课程类别表、未命中问题表在多维表格中建好后，
// 创建对应回写插件实例并接入 faqMiss / category 映射
const PLUGIN_ID_BY_TYPE: Partial<Record<BitableRecordType, string>> = {
  student: BITABLE_STUDENT_PLUGIN_ID,
  schedule: BITABLE_SCHEDULE_PLUGIN_ID,
  attendance: BITABLE_ATTENDANCE_PLUGIN_ID,
  course: BITABLE_COURSE_PLUGIN_ID,
  faq: BITABLE_FAQ_PLUGIN_ID,
  material: BITABLE_MATERIAL_PLUGIN_ID,
  equipment: BITABLE_EQUIPMENT_PLUGIN_ID,
  processFlow: BITABLE_PROCESS_PLUGIN_ID,
  formula: BITABLE_FORMULA_PLUGIN_ID,
  lead: BITABLE_LEAD_PLUGIN_ID,
  followUp: BITABLE_FOLLOW_UP_PLUGIN_ID,
  leave: BITABLE_LEAVE_PLUGIN_ID,
  graduation: BITABLE_GRADUATION_PLUGIN_ID,
  marketingContent: BITABLE_MARKETING_CONTENT_PLUGIN_ID,
};

const DELETABLE_RECORD_TYPES: BitableRecordType[] = [
  'course',
  'student',
  'schedule',
  'equipment',
  'processFlow',
  'formula',
  'category',
  'material',
  'lead',
  'followUp',
  'leave',
  'graduation',
  'marketingContent',
];

function isBitableBatchOutput(value: unknown): value is BitableBatchOutput {
  return typeof value === 'object' && value !== null;
}

const BITABLE_CALL_TIMEOUT_MS: number = 20_000;

@Injectable()
export class BitableSyncService {
  private readonly logger = new Logger(BitableSyncService.name);

  constructor(
    @Inject(CapabilityService)
    private readonly capabilityService: CapabilityService,
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    private readonly mapper: BitableSyncMapper,
  ) {}

  private async callWithTimeout(
    pluginId: string,
    actionKey: string,
    payload: Record<string, unknown>,
  ): Promise<unknown> {
    const callPromise: Promise<unknown> = this.capabilityService
      .load(pluginId)
      .call(actionKey, payload);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise: Promise<never> = new Promise(
      (_resolve, reject) => {
        timer = setTimeout(() => {
          reject(
            new Error(
              `bitable ${actionKey} 调用超时（${BITABLE_CALL_TIMEOUT_MS}ms）`,
            ),
          );
        }, BITABLE_CALL_TIMEOUT_MS);
      },
    );
    try {
      return await Promise.race([callPromise, timeoutPromise]);
    } finally {
      if (timer !== undefined) {
        clearTimeout(timer);
      }
    }
  }

  async syncRecord(
    recordType: BitableRecordType,
    recordId: string,
  ): Promise<BitableSyncResult> {
    const pluginId: string | undefined = PLUGIN_ID_BY_TYPE[recordType];
    if (!pluginId) {
      this.logger.log(
        `bitable sync skipped: ${JSON.stringify({
          recordType,
          recordId,
          reason: '该类型暂未配置多维表格回写插件',
        })}`,
      );
      return { syncStatus: 'not_synced' };
    }
    try {
      const snapshot: BitableRecordSnapshot = await this.mapper.loadSnapshot(
        recordType,
        recordId,
      );
      const anchorRecordId: string | null =
        snapshot.bitableRecordId ?? snapshot.baseRecordId;
      let bitableRecordId: string;
      if (anchorRecordId) {
        bitableRecordId = await this.callBitable(
          pluginId,
          ACTION_KEY_BATCH_UPDATE_RECORDS,
          {
            records: [{ id: anchorRecordId, record: snapshot.fields }],
          },
          recordType,
          recordId,
        );
      } else {
        bitableRecordId = await this.callBitable(
          pluginId,
          ACTION_KEY_BATCH_ADD_RECORDS,
          { records: [{ record: snapshot.fields }] },
          recordType,
          recordId,
        );
      }
      await this.markSynced(
        recordType,
        recordId,
        bitableRecordId,
        anchorRecordId ? undefined : bitableRecordId,
      );
      return { syncStatus: 'synced', bitableRecordId };
    } catch (error) {
      const errorMessage: string =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `bitable sync failed: ${JSON.stringify({
          recordType,
          recordId,
          error: errorMessage,
        })}`,
        error instanceof Error ? error.stack : undefined,
      );
      await this.markFailed(recordType, recordId);
      return { syncStatus: 'failed', message: errorMessage };
    }
  }

  async deleteRecord(
    recordType: BitableRecordType,
    recordId: string,
  ): Promise<BitableSyncResult> {
    if (!DELETABLE_RECORD_TYPES.includes(recordType)) {
      this.logger.log(
        `bitable delete skipped: ${JSON.stringify({
          recordType,
          recordId,
          reason:
            '该类型未列入可删除白名单（如课程回写插件未确认支持 deleteRecords，保守跳过远端删除，仅本地删除）',
        })}`,
      );
      return { syncStatus: 'not_synced' };
    }
    const snapshot: BitableRecordSnapshot = await this.mapper.loadSnapshot(
      recordType,
      recordId,
    );
    if (!snapshot.bitableRecordId) {
      return { syncStatus: 'not_synced' };
    }
    const pluginId: string | undefined = PLUGIN_ID_BY_TYPE[recordType];
    if (!pluginId) {
      this.logger.log(
        `bitable delete skipped: ${JSON.stringify({
          recordType,
          recordId,
          reason: '该类型暂未配置多维表格回写插件',
        })}`,
      );
      return { syncStatus: 'not_synced' };
    }
    try {
      await this.callWithTimeout(pluginId, ACTION_KEY_DELETE_RECORDS, {
        recordIDs: [snapshot.bitableRecordId],
      });
      await this.updateSyncColumns(recordType, recordId, 'not_synced', null);
      this.logger.log(
        `bitable ${ACTION_KEY_DELETE_RECORDS} done: ${JSON.stringify({
          pluginId,
          recordType,
          recordId,
          bitableRecordId: snapshot.bitableRecordId,
        })}`,
      );
      return { syncStatus: 'not_synced' };
    } catch (error) {
      const errorMessage: string =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `bitable delete failed: ${JSON.stringify({
          recordType,
          recordId,
          error: errorMessage,
        })}`,
        error instanceof Error ? error.stack : undefined,
      );
      return { syncStatus: 'failed', message: errorMessage };
    }
  }

  async deleteRemoteRecordsLinkedToCourse(
    courseAnchorId: string,
  ): Promise<{ deleted: number }> {
    const targets: Array<{ label: string; pluginId: string }> = [
      { label: '配方明细', pluginId: BITABLE_FORMULA_PLUGIN_ID },
      { label: '工艺流程', pluginId: BITABLE_PROCESS_PLUGIN_ID },
      { label: '器材工具', pluginId: BITABLE_EQUIPMENT_PLUGIN_ID },
    ];
    let deletedTotal: number = 0;
    for (const target of targets) {
      const matchedIds: string[] = await this.findRemoteRecordsLinkedTo(
        target.pluginId,
        courseAnchorId,
      );
      if (matchedIds.length === 0) {
        continue;
      }
      await this.callWithTimeout(
        target.pluginId,
        ACTION_KEY_BATCH_DELETE_RECORDS,
        { recordIDs: matchedIds },
      );
      deletedTotal += matchedIds.length;
      this.logger.log(
        `bitable linked cleanup done: ${JSON.stringify({
          target: target.label,
          pluginId: target.pluginId,
          courseAnchorId,
          deleted: matchedIds.length,
        })}`,
      );
    }
    return { deleted: deletedTotal };
  }

  private async findRemoteRecordsLinkedTo(
    pluginId: string,
    courseAnchorId: string,
  ): Promise<string[]> {
    const matchedIds: string[] = [];
    let pageToken: string | undefined;
    for (
      let page: number = 0;
      page < LINKED_CLEANUP_MAX_PAGES;
      page += 1
    ) {
      const payload: Record<string, unknown> = {
        pageSize: LINKED_CLEANUP_PAGE_SIZE,
      };
      if (pageToken) {
        payload.pageToken = pageToken;
      }
      const result: Record<string, unknown> = await this.queryBitable(
        pluginId,
        'searchRecords',
        payload,
      );
      const records: unknown = result.records;
      if (Array.isArray(records)) {
        records.forEach((item: unknown) => {
          if (typeof item !== 'object' || item === null) return;
          const shape: RemoteRecordShape = item as RemoteRecordShape;
          const recordId: string =
            typeof shape.id === 'string' ? shape.id : '';
          if (!recordId) return;
          const linkIds: string[] = extractLinkRecordIds(
            shape.record?.[COURSE_LINK_FIELD_NAME],
          );
          if (linkIds.includes(courseAnchorId)) {
            matchedIds.push(recordId);
          }
        });
      }
      if (result.hasMore !== true) break;
      const nextToken: unknown = result.pageToken;
      if (typeof nextToken !== 'string' || nextToken.length === 0) break;
      pageToken = nextToken;
    }
    return matchedIds;
  }

  async repairAll(): Promise<BitableRepairSummary> {
    const targets: Array<{ recordType: BitableRecordType; id: string }> = [];
    const push = (
      recordType: BitableRecordType,
      rows: Array<{ id: string }>,
    ): void => {
      rows.forEach((row: { id: string }) => {
        targets.push({ recordType, id: row.id });
      });
    };
    push(
      'student',
      await this.db
        .select({ id: studentRegistrationTable.id })
        .from(studentRegistrationTable)
        .where(isNull(studentRegistrationTable.bitableRecordId)),
    );
    push(
      'schedule',
      await this.db
        .select({ id: courseScheduleTable.id })
        .from(courseScheduleTable)
        .where(isNull(courseScheduleTable.bitableRecordId)),
    );
    push(
      'attendance',
      await this.db
        .select({ id: attendanceRecordTable.id })
        .from(attendanceRecordTable)
        .where(isNull(attendanceRecordTable.bitableRecordId)),
    );
    push(
      'course',
      await this.db
        .select({ id: courseGeneralTable.id })
        .from(courseGeneralTable)
        .where(isNull(courseGeneralTable.bitableRecordId)),
    );
    push(
      'faq',
      await this.db
        .select({ id: faqKnowledgeBase.id })
        .from(faqKnowledgeBase)
        .where(isNull(faqKnowledgeBase.bitableRecordId)),
    );
    push(
      'material',
      await this.db
        .select({ id: contentMaterialLibrary.id })
        .from(contentMaterialLibrary)
        .where(isNull(contentMaterialLibrary.bitableRecordId)),
    );
    push(
      'equipment',
      await this.db
        .select({ id: equipmentToolTable.id })
        .from(equipmentToolTable)
        .where(isNull(equipmentToolTable.bitableRecordId)),
    );
    push(
      'processFlow',
      await this.db
        .select({ id: processFlowTable.id })
        .from(processFlowTable)
        .where(isNull(processFlowTable.bitableRecordId)),
    );
    push(
      'formula',
      await this.db
        .select({ id: formulaDetailTable.id })
        .from(formulaDetailTable)
        .where(isNull(formulaDetailTable.bitableRecordId)),
    );
    push(
      'lead',
      await this.db
        .select({ id: enrollmentLeadTable.id })
        .from(enrollmentLeadTable)
        .where(isNull(enrollmentLeadTable.bitableRecordId)),
    );
    push(
      'followUp',
      await this.db
        .select({ id: followUpRecordTable.id })
        .from(followUpRecordTable)
        .where(isNull(followUpRecordTable.bitableRecordId)),
    );
    push(
      'leave',
      await this.db
        .select({ id: leaveApplicationTable.id })
        .from(leaveApplicationTable)
        .where(isNull(leaveApplicationTable.bitableRecordId)),
    );
    push(
      'graduation',
      await this.db
        .select({ id: graduationRecordTable.id })
        .from(graduationRecordTable)
        .where(isNull(graduationRecordTable.bitableRecordId)),
    );
    push(
      'marketingContent',
      await this.db
        .select({ id: marketingContent.id })
        .from(marketingContent)
        .where(isNull(marketingContent.bitableRecordId)),
    );

    const summary: BitableRepairSummary = {
      total: targets.length,
      synced: 0,
      failed: 0,
      skipped: 0,
    };
    for (const target of targets) {
      const result: BitableSyncResult = await this.syncRecord(
        target.recordType,
        target.id,
      );
      if (result.syncStatus === 'synced') {
        summary.synced += 1;
      } else if (result.syncStatus === 'failed') {
        summary.failed += 1;
      } else {
        summary.skipped += 1;
      }
    }
    this.logger.log(`bitable repairAll done: ${JSON.stringify(summary)}`);
    return summary;
  }

  async queryBitable(
    pluginId: string,
    actionKey: string,
    payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const rawResult: unknown = await this.callWithTimeout(
      pluginId,
      actionKey,
      payload,
    );
    return typeof rawResult === 'object' && rawResult !== null
      ? (rawResult as Record<string, unknown>)
      : {};
  }

  private async callBitable(
    pluginId: string,
    actionKey: string,
    input: {
      records: Array<{ id?: string; record?: Record<string, unknown> }>;
    },
    recordType: BitableRecordType,
    recordId: string,
  ): Promise<string> {
    const rawResult: unknown = await this.callWithTimeout(
      pluginId,
      actionKey,
      input as unknown as Record<string, unknown>,
    );
    const output: BitableBatchOutput | undefined = isBitableBatchOutput(
      rawResult,
    )
      ? rawResult
      : undefined;
    const resultId: string | undefined = output?.records?.[0]?.id;
    if (!resultId) {
      throw new Error(
        `bitable ${actionKey} 未返回记录 ID: ${JSON.stringify(rawResult)}`,
      );
    }
    this.logger.log(
      `bitable ${actionKey} done: ${JSON.stringify({
        pluginId,
        recordType,
        recordId,
        bitableRecordId: resultId,
      })}`,
    );
    return resultId;
  }

  private async updateSyncColumns(
    recordType: BitableRecordType,
    recordId: string,
    syncStatus: BitableSyncStatus,
    bitableRecordId?: string | null,
    baseRecordId?: string,
  ): Promise<void> {
    const patch: {
      bitableRecordId?: string | null;
      syncStatus: BitableSyncStatus;
      baseRecordId?: string;
    } = { syncStatus };
    if (bitableRecordId !== undefined) {
      patch.bitableRecordId = bitableRecordId;
    }
    if (baseRecordId !== undefined) {
      patch.baseRecordId = baseRecordId;
    }
    if (recordType === 'student') {
      await this.db
        .update(studentRegistrationTable)
        .set(patch)
        .where(eq(studentRegistrationTable.id, recordId));
      return;
    }
    if (recordType === 'schedule') {
      await this.db
        .update(courseScheduleTable)
        .set(patch)
        .where(eq(courseScheduleTable.id, recordId));
      return;
    }
    if (recordType === 'attendance') {
      await this.db
        .update(attendanceRecordTable)
        .set(patch)
        .where(eq(attendanceRecordTable.id, recordId));
      return;
    }
    if (recordType === 'course') {
      await this.db
        .update(courseGeneralTable)
        .set(patch)
        .where(eq(courseGeneralTable.id, recordId));
      return;
    }
    if (recordType === 'category') {
      await this.db
        .update(courseCategory)
        .set(patch)
        .where(eq(courseCategory.id, recordId));
      return;
    }
    if (recordType === 'faq') {
      await this.db
        .update(faqKnowledgeBase)
        .set(patch)
        .where(eq(faqKnowledgeBase.id, recordId));
      return;
    }
    if (recordType === 'faqMiss') {
      await this.db
        .update(faqMiss)
        .set(patch)
        .where(eq(faqMiss.id, recordId));
      return;
    }
    if (recordType === 'marketingContent') {
      await this.db
        .update(marketingContent)
        .set(patch)
        .where(eq(marketingContent.id, recordId));
      return;
    }
    if (recordType === 'material') {
      await this.db
        .update(contentMaterialLibrary)
        .set(patch)
        .where(eq(contentMaterialLibrary.id, recordId));
      return;
    }
    if (recordType === 'equipment') {
      await this.db
        .update(equipmentToolTable)
        .set(patch)
        .where(eq(equipmentToolTable.id, recordId));
      return;
    }
    if (recordType === 'processFlow') {
      await this.db
        .update(processFlowTable)
        .set(patch)
        .where(eq(processFlowTable.id, recordId));
      return;
    }
    if (recordType === 'lead') {
      await this.db
        .update(enrollmentLeadTable)
        .set(patch)
        .where(eq(enrollmentLeadTable.id, recordId));
      return;
    }
    if (recordType === 'followUp') {
      await this.db
        .update(followUpRecordTable)
        .set(patch)
        .where(eq(followUpRecordTable.id, recordId));
      return;
    }
    if (recordType === 'leave') {
      await this.db
        .update(leaveApplicationTable)
        .set(patch)
        .where(eq(leaveApplicationTable.id, recordId));
      return;
    }
    if (recordType === 'graduation') {
      await this.db
        .update(graduationRecordTable)
        .set(patch)
        .where(eq(graduationRecordTable.id, recordId));
      return;
    }
    await this.db
      .update(formulaDetailTable)
      .set(patch)
      .where(eq(formulaDetailTable.id, recordId));
  }

  private async markSynced(
    recordType: BitableRecordType,
    recordId: string,
    bitableRecordId: string,
    baseRecordId?: string,
  ): Promise<void> {
    if (baseRecordId) {
      await this.updateSyncColumns(
        recordType,
        recordId,
        'synced',
        bitableRecordId,
        baseRecordId,
      );
      return;
    }
    await this.updateSyncColumns(recordType, recordId, 'synced', bitableRecordId);
  }

  private async markFailed(
    recordType: BitableRecordType,
    recordId: string,
  ): Promise<void> {
    try {
      await this.updateSyncColumns(recordType, recordId, 'failed');
    } catch (error) {
      this.logger.error(
        `bitable markFailed error: ${JSON.stringify({
          recordType,
          recordId,
          error: error instanceof Error ? error.message : 'Unknown error',
        })}`,
      );
    }
  }
}
