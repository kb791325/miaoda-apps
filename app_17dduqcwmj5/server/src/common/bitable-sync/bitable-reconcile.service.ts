import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from '@lark-apaas/fullstack-nestjs-core';
import { inArray } from 'drizzle-orm';
import type { PgColumn, PgTable } from 'drizzle-orm/pg-core';
import {
  attendanceRecordTable,
  contentMaterialLibrary,
  courseGeneralTable,
  courseScheduleTable,
  equipmentToolTable,
  faqKnowledgeBase,
  formulaDetailTable,
  marketingContent,
  processFlowTable,
  studentRegistrationTable,
} from '@server/database/schema';
import type {
  BitableReconcileResponse,
  BitableReconcileResultItem,
  BitableRecordType,
} from '@shared/bitable-sync';
import {
  BITABLE_ATTENDANCE_PLUGIN_ID,
  BITABLE_COURSE_PLUGIN_ID,
  BITABLE_EQUIPMENT_PLUGIN_ID,
  BITABLE_FAQ_PLUGIN_ID,
  BITABLE_FORMULA_PLUGIN_ID,
  BITABLE_MARKETING_CONTENT_PLUGIN_ID,
  BITABLE_MATERIAL_PLUGIN_ID,
  BITABLE_PROCESS_PLUGIN_ID,
  BITABLE_SCHEDULE_PLUGIN_ID,
  BITABLE_STUDENT_PLUGIN_ID,
} from './bitable-sync.constants';
import { BitableSyncService } from './bitable-sync.service';

const RECONCILE_TTL_MS: number = 60_000;
const REMOTE_PAGE_SIZE: number = 500;
const MAX_REMOTE_PAGES: number = 20;

interface ReconcileTarget {
  pluginId: string;
  table: PgTable;
  idColumn: PgColumn;
  baseRecordIdColumn: PgColumn;
  bitableRecordIdColumn: PgColumn;
}

interface LocalAnchorRow {
  id: string;
  baseRecordId: string | null;
  bitableRecordId: string | null;
}

interface ReconcileOutcome {
  deleted: number;
  skipped: boolean;
  message?: string;
}

const RECONCILE_TARGETS: Partial<Record<BitableRecordType, ReconcileTarget>> = {
  student: {
    pluginId: BITABLE_STUDENT_PLUGIN_ID,
    table: studentRegistrationTable,
    idColumn: studentRegistrationTable.id,
    baseRecordIdColumn: studentRegistrationTable.baseRecordId,
    bitableRecordIdColumn: studentRegistrationTable.bitableRecordId,
  },
  schedule: {
    pluginId: BITABLE_SCHEDULE_PLUGIN_ID,
    table: courseScheduleTable,
    idColumn: courseScheduleTable.id,
    baseRecordIdColumn: courseScheduleTable.baseRecordId,
    bitableRecordIdColumn: courseScheduleTable.bitableRecordId,
  },
  attendance: {
    pluginId: BITABLE_ATTENDANCE_PLUGIN_ID,
    table: attendanceRecordTable,
    idColumn: attendanceRecordTable.id,
    baseRecordIdColumn: attendanceRecordTable.baseRecordId,
    bitableRecordIdColumn: attendanceRecordTable.bitableRecordId,
  },
  course: {
    pluginId: BITABLE_COURSE_PLUGIN_ID,
    table: courseGeneralTable,
    idColumn: courseGeneralTable.id,
    baseRecordIdColumn: courseGeneralTable.baseRecordId,
    bitableRecordIdColumn: courseGeneralTable.bitableRecordId,
  },
  material: {
    pluginId: BITABLE_MATERIAL_PLUGIN_ID,
    table: contentMaterialLibrary,
    idColumn: contentMaterialLibrary.id,
    baseRecordIdColumn: contentMaterialLibrary.baseRecordId,
    bitableRecordIdColumn: contentMaterialLibrary.bitableRecordId,
  },
  faq: {
    pluginId: BITABLE_FAQ_PLUGIN_ID,
    table: faqKnowledgeBase,
    idColumn: faqKnowledgeBase.id,
    baseRecordIdColumn: faqKnowledgeBase.baseRecordId,
    bitableRecordIdColumn: faqKnowledgeBase.bitableRecordId,
  },
  equipment: {
    pluginId: BITABLE_EQUIPMENT_PLUGIN_ID,
    table: equipmentToolTable,
    idColumn: equipmentToolTable.id,
    baseRecordIdColumn: equipmentToolTable.baseRecordId,
    bitableRecordIdColumn: equipmentToolTable.bitableRecordId,
  },
  processFlow: {
    pluginId: BITABLE_PROCESS_PLUGIN_ID,
    table: processFlowTable,
    idColumn: processFlowTable.id,
    baseRecordIdColumn: processFlowTable.baseRecordId,
    bitableRecordIdColumn: processFlowTable.bitableRecordId,
  },
  formula: {
    pluginId: BITABLE_FORMULA_PLUGIN_ID,
    table: formulaDetailTable,
    idColumn: formulaDetailTable.id,
    baseRecordIdColumn: formulaDetailTable.baseRecordId,
    bitableRecordIdColumn: formulaDetailTable.bitableRecordId,
  },
  marketingContent: {
    pluginId: BITABLE_MARKETING_CONTENT_PLUGIN_ID,
    table: marketingContent,
    idColumn: marketingContent.id,
    baseRecordIdColumn: marketingContent.baseRecordId,
    bitableRecordIdColumn: marketingContent.bitableRecordId,
  },
};

@Injectable()
export class BitableReconcileService {
  private readonly logger = new Logger(BitableReconcileService.name);
  private readonly lastReconciledAt: Map<string, number> = new Map();

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    private readonly bitableSyncService: BitableSyncService,
  ) {}

  async reconcile(
    recordTypes: BitableRecordType[],
  ): Promise<BitableReconcileResponse> {
    const results: BitableReconcileResultItem[] = await Promise.all(
      recordTypes.map((recordType: BitableRecordType) =>
        this.reconcileType(recordType),
      ),
    );
    return { results };
  }

  private async reconcileType(
    recordType: BitableRecordType,
  ): Promise<BitableReconcileResultItem> {
    const target: ReconcileTarget | undefined = RECONCILE_TARGETS[recordType];
    if (!target) {
      return {
        recordType,
        deleted: 0,
        skipped: true,
        message: '该类型无多维表格数据源',
      };
    }
    const lastRun: number = this.lastReconciledAt.get(recordType) ?? 0;
    if (Date.now() - lastRun < RECONCILE_TTL_MS) {
      return { recordType, deleted: 0, skipped: true };
    }
    try {
      const outcome: ReconcileOutcome = await this.reconcileTarget(
        recordType,
        target,
      );
      if (outcome.skipped) {
        return { recordType, deleted: 0, skipped: true, ...(
          outcome.message ? { message: outcome.message } : {}
        ) };
      }
      this.lastReconciledAt.set(recordType, Date.now());
      return { recordType, deleted: outcome.deleted, skipped: false };
    } catch (error) {
      const message: string =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`对账清理失败 ${recordType}: ${message}`);
      return { recordType, deleted: 0, skipped: true, message };
    }
  }

  private async reconcileTarget(
    recordType: BitableRecordType,
    target: ReconcileTarget,
  ): Promise<ReconcileOutcome> {
    const remoteIds: Set<string> = await this.fetchRemoteRecordIds(
      target.pluginId,
    );
    const rows: LocalAnchorRow[] = await this.listLocalAnchors(target);
    const orphanIds: string[] = rows
      .filter((row: LocalAnchorRow) => {
        const anchor: string | null = row.baseRecordId ?? row.bitableRecordId;
        return anchor !== null && !remoteIds.has(anchor);
      })
      .map((row: LocalAnchorRow) => row.id);
    if (orphanIds.length === 0) {
      return { deleted: 0, skipped: false };
    }
    await this.db
      .delete(target.table)
      .where(inArray(target.idColumn, orphanIds));
    this.logger.log(
      `对账清理 ${recordType}: 删除多维表格已不存在的记录 ${orphanIds.length} 条`,
    );
    return { deleted: orphanIds.length, skipped: false };
  }

  private async listLocalAnchors(
    target: ReconcileTarget,
  ): Promise<LocalAnchorRow[]> {
    const rows: Array<{
      id: unknown;
      baseRecordId: unknown;
      bitableRecordId: unknown;
    }> = await this.db
      .select({
        id: target.idColumn,
        baseRecordId: target.baseRecordIdColumn,
        bitableRecordId: target.bitableRecordIdColumn,
      })
      .from(target.table);
    return rows.map(
      (row: {
        id: unknown;
        baseRecordId: unknown;
        bitableRecordId: unknown;
      }): LocalAnchorRow => ({
        id: String(row.id),
        baseRecordId:
          typeof row.baseRecordId === 'string' ? row.baseRecordId : null,
        bitableRecordId:
          typeof row.bitableRecordId === 'string' ? row.bitableRecordId : null,
      }),
    );
  }

  private async fetchRemoteRecordIds(pluginId: string): Promise<Set<string>> {
    const ids: Set<string> = new Set<string>();
    let pageToken: string | undefined;
    for (let page: number = 0; page < MAX_REMOTE_PAGES; page += 1) {
      const payload: Record<string, unknown> = {
        pageSize: REMOTE_PAGE_SIZE,
      };
      if (pageToken) {
        payload.pageToken = pageToken;
      }
      const result: Record<string, unknown> =
        await this.bitableSyncService.queryBitable(
          pluginId,
          'searchRecords',
          payload,
        );
      const records: unknown = result.records;
      if (Array.isArray(records)) {
        records.forEach((record: unknown) => {
          if (typeof record !== 'object' || record === null) return;
          const recordId: unknown = (record as { id?: unknown }).id;
          if (typeof recordId === 'string' && recordId.length > 0) {
            ids.add(recordId);
          }
        });
      }
      if (result.hasMore !== true) break;
      const nextToken: unknown = result.pageToken;
      if (typeof nextToken !== 'string' || nextToken.length === 0) break;
      pageToken = nextToken;
    }
    return ids;
  }
}
