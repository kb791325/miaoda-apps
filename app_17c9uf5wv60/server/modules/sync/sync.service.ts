import {
  Injectable,
  Inject,
  Logger,
  BadRequestException,
  NotFoundException,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
  CapabilityService,
} from '@lark-apaas/fullstack-nestjs-core';
import { eq, and, desc, count, sql, gte, lt, inArray, isNotNull, isNull } from 'drizzle-orm';
import { decode, encode } from 'js-base64';
import { randomUUID } from 'crypto';
import { FeishuApiService } from '@server/common/services/feishu-api.service';
import {
  syncConfig,
  syncLog,
  products,
  stockTransactions,
  transfers,
  inventoryChecks,
  inventoryCheckItems,
  warehouseInventory,
  notifications,
} from '@server/database/schema';
import type {
  SyncDomain,
  SyncConfig,
  SyncResult,
  SaveSyncConfigRequest,
  SyncLogListResponse,
  SyncTaskStatus,
  FeishuFieldInfo,
  SmartMatchResult,
  SyncStats as SyncStatsType,
  AuditActionType,
} from '@shared/api.interface';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

const PLUGIN_INSTANCE_MAP: Record<SyncDomain, string> = {
  products: 'feishu_bitable_product_sync_v2_1',
  warehouse_inventory: 'feishu_bitable_warehouse_stock_sync_v3_1',
  transactions: 'feishu_bitable_in_out_record_sync_v3_1',
  inventory_checks: 'feishu_bitable_inventory_record_sync_v3_2',
  transfers: 'feishu_bitable_allocation_sync_v3_3',
};
const BATCH_SIZE = 500;
const DEFAULT_POLL_INTERVAL_MIN = 5;
const MAX_RETRY_COUNT = 3;
const RETRY_DELAYS_MIN = [1, 5, 15]; // 指数退避: 1min → 5min → 15min
const RETRY_SCAN_INTERVAL_MS = 60 * 1000; // 重试扫描间隔 1 分钟
const CURRENT_USER = 'system_sync_service';

const VALID_DOMAINS: SyncDomain[] = [
  'products',
  'transactions',
  'transfers',
  'inventory_checks',
  'warehouse_inventory',
];

type FeishuRecord = Record<string, unknown>;

interface FeishuSearchResponse {
  records: Array<{ id: string; record: FeishuRecord }>;
  hasMore: boolean;
  pageToken?: string;
  total: number;
}

@Injectable()
export class SyncService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SyncService.name);

  private pollingTimer: ReturnType<typeof setInterval> | null = null;
  private retryTimer: ReturnType<typeof setInterval> | null = null;
  private readonly pollingLocks = new Set<string>();
  private currentPollIntervalMs = DEFAULT_POLL_INTERVAL_MIN * 60 * 1000;

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    @Inject() private readonly capabilityService: CapabilityService,
    @Inject() private readonly feishuApiService: FeishuApiService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  private fireAndForgetAuditLog(
    actionType: AuditActionType,
    targetType: string,
    targetId: string,
    operatorUserId: string,
    detail?: { before?: Record<string, unknown>; after?: Record<string, unknown>; changes?: Record<string, unknown> },
  ): void {
    const isUuid: boolean = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetId);
    void this.auditLogsService.createLog({
      actionType,
      targetType,
      targetId: isUuid ? targetId : undefined,
      operatorUserId,
      detail,
    });
  }

  private maskSensitive(
    obj: Record<string, unknown>,
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (/secret|password|token|key/i.test(key)) {
        result[key] = value ? '***' : value;
      } else if (value && typeof value === 'object' && !Array.isArray(value)) {
        result[key] = this.maskSensitive(value as Record<string, unknown>);
      } else {
        result[key] = value;
      }
    }
    return result;
  }

  private readonly UNIQUE_KEY_MAP: Record<string, { localKey: string; feishuKey: string }> = {
    products: { localKey: 'code', feishuKey: '商品编码' },
    transactions: { localKey: 'orderNo', feishuKey: '记录编号' },
    transfers: { localKey: 'transferNo', feishuKey: '调拨单号' },
    warehouse_inventory: { localKey: 'productName+warehouse', feishuKey: '商品名称+仓库' },
    inventory_checks: { localKey: 'checkNo', feishuKey: '盘点单号' },
  };

  private getUniqueKey(domain: string, record: Record<string, unknown>, side: 'local' | 'feishu'): string {
    const keyConfig = this.UNIQUE_KEY_MAP[domain as SyncDomain];
    if (!keyConfig) return String(record['id'] ?? record['record_id'] ?? '');
    const keyField = side === 'local' ? keyConfig.localKey : keyConfig.feishuKey;
    const extractVal = (k: string): string => {
      const raw = record[k];
      if (raw === undefined || raw === null) return '';
      if (typeof raw === 'string') return raw;
      if (typeof raw === 'object' && 'text' in (raw as Record<string, unknown>)) {
        return String((raw as Record<string, unknown>)['text'] ?? '');
      }
      return String(raw);
    };
    if (keyField.includes('+')) {
      return keyField.split('+').map((k: string) => extractVal(k)).join('||');
    }
    return extractVal(keyField);
  }

  private async fetchAllFeishuRecords(
    domain: string,
  ): Promise<Array<{ id: string; record: FeishuRecord }>> {
    const allRecords: Array<{ id: string; record: FeishuRecord }> = [];
    let pageToken: string | undefined;
    let hasMore = true;

    while (hasMore) {
      const resp = (await this.callFeishu(domain, 'searchRecords', {
        pageSize: 500,
        pageToken,
      })) as {
        records: Array<{ id: string; record: FeishuRecord }>;
        hasMore: boolean;
        pageToken?: string;
      };
      allRecords.push(...resp.records);
      hasMore = resp.hasMore;
      pageToken = resp.pageToken;
    }
    return allRecords;
  }

  private buildFeishuKeyMap(
    domain: string,
    feishuRecords: Array<{ id: string; record: FeishuRecord }>,
  ): Map<string, string> {
    const keyMap = new Map<string, string>();
    for (const fr of feishuRecords) {
      const uk = this.getUniqueKey(domain, fr.record, 'feishu');
      if (uk && uk !== '') {
        keyMap.set(uk, fr.id);
      }
    }
    return keyMap;
  }

  private getRecordMap(config: { extra: unknown }): Record<string, string> {
    const extra = (config.extra as Record<string, unknown>) ?? {};
    return (extra['recordMap'] as Record<string, string>) ?? {};
  }

  private async saveRecordMap(domain: string, recordMap: Record<string, string>): Promise<void> {
    const config = await this.getConfigByDomain(domain);
    const extra = (config.extra as Record<string, unknown>) ?? {};
    await this.db
      .update(syncConfig)
      .set({ extra: { ...extra, recordMap }, updatedAt: new Date() })
      .where(eq(syncConfig.domain, domain));
  }

  private getLocalRecordId(domain: string, localData: Record<string, unknown>): string | null {
    if (localData['id']) return String(localData['id']);
    return null;
  }

  private async fetchDeletedLocalRecords(
    domain: string,
  ): Promise<Array<{ id: string; record: Record<string, unknown> }>> {
    switch (domain) {
      case 'products': {
        const rows = await this.db
          .select()
          .from(products)
          .where(isNotNull(products.deletedAt));
        return rows.map((r: typeof products.$inferSelect) => ({
          id: r.id,
          record: r as unknown as Record<string, unknown>,
        }));
      }
      default:
        return [];
    }
  }

  // ====== Public API ======

  async getConfigs(): Promise<SyncConfig[]> {
    const rows = await this.db.select().from(syncConfig);
    const existing = new Set(rows.map((r: typeof syncConfig.$inferSelect) => r.domain));
    const toInsert: Array<typeof syncConfig.$inferInsert> = [];
    for (const domain of VALID_DOMAINS) {
      if (!existing.has(domain)) {
        toInsert.push({
          domain,
          feishuAppToken: '',
          tableId: '',
          tableName: this.getDefaultTableName(domain),
          enabled: false,
          autoRealtime: false,
          bidirectional: false,
          pollIntervalMin: DEFAULT_POLL_INTERVAL_MIN,
          status: 'unconfigured',
        });
      }
    }
    if (toInsert.length > 0) {
      await this.db.insert(syncConfig).values(toInsert);
    }
    const allRows = await this.db.select().from(syncConfig);
    return allRows.map((r: typeof syncConfig.$inferSelect) => this.mapConfigRow(r));
  }

  async saveConfig(
    domain: string,
    dto: SaveSyncConfigRequest,
    userId?: string,
  ): Promise<SyncConfig> {
    this.validateDomain(domain);

    const existing = await this.db
      .select()
      .from(syncConfig)
      .where(eq(syncConfig.domain, domain))
      .limit(1);

    if (existing.length === 0) {
      const extraData: Record<string, unknown> = {};
      if (dto.extra?.fieldMap) extraData.fieldMap = dto.extra.fieldMap;
      if (dto.extra?.feishuAppId) extraData.feishuAppId = encode(dto.extra.feishuAppId);
      if (dto.extra?.feishuAppSecret) extraData.feishuAppSecret = encode(dto.extra.feishuAppSecret);

      const [inserted] = await this.db
        .insert(syncConfig)
        .values({
          domain,
          feishuAppToken: dto.feishuAppToken,
          tableId: dto.tableId ?? '',
          tableName: dto.tableName,
          enabled: dto.enabled,
          autoRealtime: dto.autoRealtime,
          bidirectional: dto.bidirectional,
          pollIntervalMin: dto.pollIntervalMin ?? DEFAULT_POLL_INTERVAL_MIN,
          status: 'unconfigured',
          extra: Object.keys(extraData).length > 0 ? extraData : null,
        })
         .returning();

       if (userId) {
         const afterData: Record<string, unknown> = {
           domain,
           feishuAppToken: dto.feishuAppToken ? '***' : '',
           tableId: dto.tableId ?? '',
           tableName: dto.tableName,
           enabled: dto.enabled,
           autoRealtime: dto.autoRealtime,
           bidirectional: dto.bidirectional,
           pollIntervalMin: dto.pollIntervalMin ?? DEFAULT_POLL_INTERVAL_MIN,
           status: 'unconfigured',
         };
         if (dto.extra) {
           afterData.extra = this.maskSensitive({ ...dto.extra });
         }
         this.fireAndForgetAuditLog('update', 'sync_config', domain, userId, {
           after: afterData,
         });
       }

       return this.mapConfigRow(inserted);
     }

    const patch: Partial<typeof syncConfig.$inferInsert> = {};
    if (dto.feishuAppToken !== undefined) patch.feishuAppToken = dto.feishuAppToken;
    if (dto.tableId !== undefined) patch.tableId = dto.tableId;
    if (dto.tableName !== undefined) patch.tableName = dto.tableName;
    if (dto.enabled !== undefined) patch.enabled = dto.enabled;
    if (dto.autoRealtime !== undefined) patch.autoRealtime = dto.autoRealtime;
    if (dto.bidirectional !== undefined) patch.bidirectional = dto.bidirectional;
    if (dto.pollIntervalMin !== undefined) {
      patch.pollIntervalMin = dto.pollIntervalMin;
    }

    if (dto.extra) {
      const existingExtra = (existing[0].extra as Record<string, unknown>) ?? {};
      const newExtra: Record<string, unknown> = { ...existingExtra };
      if (dto.extra.fieldMap !== undefined) newExtra.fieldMap = dto.extra.fieldMap;
      if (dto.extra.feishuAppId !== undefined) {
        newExtra.feishuAppId = dto.extra.feishuAppId ? encode(dto.extra.feishuAppId) : null;
      }
      if (dto.extra.feishuAppSecret !== undefined) {
        newExtra.feishuAppSecret = dto.extra.feishuAppSecret ? encode(dto.extra.feishuAppSecret) : null;
      }
      for (const key of Object.keys(newExtra)) {
        if (newExtra[key] === null || newExtra[key] === undefined) {
          delete newExtra[key];
        }
      }
      patch.extra = Object.keys(newExtra).length > 0 ? newExtra : null;
    }
    patch.updatedAt = new Date();

    const [updated] = await this.db
       .update(syncConfig)
       .set(patch)
       .where(eq(syncConfig.domain, domain))
       .returning();

     if (userId) {
       const beforeExtra = (existing[0].extra as Record<string, unknown>) ?? {};
       const maskedBefore: Record<string, unknown> = {
         ...existing[0],
         extra: Object.keys(beforeExtra).length > 0 ? this.maskSensitive(beforeExtra) : null,
       };
       const patchEntries: Record<string, unknown> = {};
       for (const key of Object.keys(patch)) {
         patchEntries[key] = (updated as Record<string, unknown>)[key];
       }
       const maskedAfter: Record<string, unknown> = { ...patchEntries };
       if (maskedAfter.extra && typeof maskedAfter.extra === 'object') {
         maskedAfter.extra = this.maskSensitive(
           maskedAfter.extra as Record<string, unknown>,
         );
       }
       const beforeChanged: Record<string, unknown> = {};
       for (const key of Object.keys(patchEntries)) {
         beforeChanged[key] = (existing[0] as Record<string, unknown>)[key];
       }
       if (beforeChanged.extra && typeof beforeChanged.extra === 'object') {
         beforeChanged.extra = this.maskSensitive(
           beforeChanged.extra as Record<string, unknown>,
         );
       }
       this.fireAndForgetAuditLog('update', 'sync_config', domain, userId, {
         before: beforeChanged,
         after: maskedAfter,
       });
     }

     return this.mapConfigRow(updated);
  }

  async initialize(
    domain: string,
    userId: string,
  ): Promise<SyncResult> {
    this.validateDomain(domain);
    const config = await this.getConfigByDomain(domain);
    if (!config.feishuAppToken) {
      throw new BadRequestException('请先配置飞书 AppToken');
    }

    const startTime = Date.now();
    try {
      await this.callFeishu(domain, 'searchRecords', { pageSize: 1 });
      await this.db
        .update(syncConfig)
        .set({
          status: 'configured',
          errorMessage: null,
          updatedAt: new Date(),
        })
        .where(eq(syncConfig.domain, domain));

       await this.logSync({
         domain,
         direction: 'push',
         action: 'initialize',
         status: 'success',
         durationMs: Date.now() - startTime,
         createdBy: userId,
       });

       this.fireAndForgetAuditLog('system', 'sync', domain, userId, {
         after: { domain, action: 'initialize', status: 'success' },
       });

       return { success: true, syncedCount: 0, failedCount: 0 };
    } catch (error: unknown) {
      const errMsg = this.extractErrorMessage(error);
      await this.db
        .update(syncConfig)
        .set({
          status: 'error',
          errorMessage: errMsg,
          updatedAt: new Date(),
        })
        .where(eq(syncConfig.domain, domain));

      await this.logSync({
        domain,
        direction: 'push',
        action: 'initialize',
        status: 'error',
        errorMessage: errMsg,
        durationMs: Date.now() - startTime,
        createdBy: userId,
      });

      throw new BadRequestException(`初始化失败: ${errMsg}`);
    }
  }

  async pushAll(domain: string, userId?: string): Promise<SyncResult> {
    this.validateDomain(domain);
    const config = await this.getConfigByDomain(domain);
    this.ensureConfigured(config);

    const startTime = Date.now();
    try {
      const rows = await this.fetchAllLocalRecords(domain);
      const feishuRecords = rows.map((row: Record<string, unknown>) =>
        this.toFeishuRecord(domain, row),
      );

      const existingFeishuRecords = await this.fetchAllFeishuRecords(domain);
      const feishuKeyMap = this.buildFeishuKeyMap(domain, existingFeishuRecords);

      const oldRecordMap = this.getRecordMap(config);
      const recordMap: Record<string, string> = { ...oldRecordMap };

      const toUpdate: Array<{ id: string; record: FeishuRecord; localId: string }> = [];
      const toInsert: Array<{ record: FeishuRecord; localId: string }> = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i] as Record<string, unknown>;
        const feishuRecord = feishuRecords[i];
        const localId = String(row['id'] ?? '');
        const uk = this.getUniqueKey(domain, feishuRecord, 'feishu');

        let feishuRecordId: string | undefined;
        if (uk) feishuRecordId = feishuKeyMap.get(uk);
        if (!feishuRecordId) feishuRecordId = oldRecordMap[localId];

        if (feishuRecordId) {
          toUpdate.push({ id: feishuRecordId, record: feishuRecord, localId });
          recordMap[localId] = feishuRecordId;
        } else {
          toInsert.push({ record: feishuRecord, localId });
        }
      }

      let syncedCount = 0;
      let insertCount = 0;
      let updateCount = 0;
      let deleteCount = 0;

      for (let i = 0; i < toUpdate.length; i += BATCH_SIZE) {
        const batch = toUpdate.slice(i, i + BATCH_SIZE);
        try {
          await this.callFeishu(domain, 'batchUpdateRecords', {
            records: batch.map((b: { id: string; record: FeishuRecord }) => ({
              id: b.id,
              record: b.record,
            })),
          });
          updateCount += batch.length;
          syncedCount += batch.length;
        } catch (updateErr: unknown) {
          if (this.isRecordNotFoundError(updateErr)) {
            for (const item of batch) {
              delete recordMap[item.localId];
              toInsert.push({ record: item.record, localId: item.localId });
            }
          } else {
            throw updateErr;
          }
        }
      }

      for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
        const batch = toInsert.slice(i, i + BATCH_SIZE);
        const result = (await this.callFeishu(domain, 'batchAddRecords', {
          records: batch.map((b: { record: FeishuRecord }) => ({ record: b.record })),
        })) as { recordIDs?: string[]; records?: Array<{ id: string }> };
        const newIds = result?.recordIDs ?? (result?.records ?? []).map((r: { id: string }) => r.id);
        for (let j = 0; j < newIds.length && j < batch.length; j++) {
          recordMap[batch[j].localId] = newIds[j];
        }
        insertCount += batch.length;
        syncedCount += batch.length;
      }

      const deletedRecords = await this.fetchDeletedLocalRecords(domain);
      const toDelete: string[] = [];
      for (const dr of deletedRecords) {
        const feishuRecord = this.toFeishuRecord(domain, dr.record);
        const uk = this.getUniqueKey(domain, feishuRecord, 'feishu');
        let feishuRecordId: string | undefined = recordMap[dr.id];
        if (!feishuRecordId && uk) {
          feishuRecordId = feishuKeyMap.get(uk);
        }
        if (feishuRecordId) {
          toDelete.push(feishuRecordId);
          delete recordMap[dr.id];
        }
      }
      if (toDelete.length > 0) {
        for (let i = 0; i < toDelete.length; i += BATCH_SIZE) {
          const batch = toDelete.slice(i, i + BATCH_SIZE);
          await this.callFeishu(domain, 'deleteRecords', { recordIDs: batch });
          deleteCount += batch.length;
        }
      }

      await this.saveRecordMap(domain, recordMap);

      await this.db
        .update(syncConfig)
        .set({
          lastSyncedAt: new Date(),
          status: 'configured',
          errorMessage: null,
          updatedAt: new Date(),
        })
        .where(eq(syncConfig.domain, domain));

       await this.logSync({
         domain,
         direction: 'push',
         action: 'push_all',
         status: 'success',
         durationMs: Date.now() - startTime,
          payload: { syncedCount, insertCount, updateCount, deleteCount },
       });

       if (userId) {
         this.fireAndForgetAuditLog('system', 'sync', domain, userId, {
           after: { domain, action: 'push_all', syncedCount, status: 'success' },
         });
       }

       return { success: true, syncedCount, insertCount, updateCount, deleteCount, failedCount: 0 };
    } catch (error: unknown) {
      const errMsg = this.extractErrorMessage(error);
      await this.db
        .update(syncConfig)
        .set({
          status: 'error',
          errorMessage: errMsg,
          updatedAt: new Date(),
        })
        .where(eq(syncConfig.domain, domain));

      await this.logSync({
        domain,
        direction: 'push',
        action: 'push_all',
        status: 'error',
        errorMessage: errMsg,
        durationMs: Date.now() - startTime,
      });

      return { success: false, syncedCount: 0, failedCount: 0, errorMessage: errMsg };
    }
  }

  async pullAll(domain: string): Promise<SyncResult> {
    this.validateDomain(domain);
    const config = await this.getConfigByDomain(domain);
    this.ensureConfigured(config);

    const startTime = Date.now();
    try {
      const allFeishuRecords: Array<{ id: string; record: FeishuRecord }> = [];
      let pageToken: string | undefined;
      let hasMore = true;

      while (hasMore) {
        const params: Record<string, unknown> = { pageSize: 500 };
        if (pageToken) {
          params['pageToken'] = pageToken;
        }
        const resp = (await this.callFeishu(
          domain,
          'searchRecords',
          params,
        )) as FeishuSearchResponse;

        allFeishuRecords.push(...resp.records);
        hasMore = resp.hasMore;
        pageToken = resp.pageToken;
      }

      let syncedCount = 0;
      for (const fr of allFeishuRecords) {
        const localData = this.fromFeishuRecord(domain, fr.record);
        if (localData) {
          await this.upsertLocalRecord(domain, fr.id, localData);
          syncedCount++;
        }
      }

      const recordMap: Record<string, string> = {};
      for (const fr of allFeishuRecords) {
        const localData = this.fromFeishuRecord(domain, fr.record);
        if (!localData) continue;
        const localId = this.getLocalRecordId(domain, localData);
        if (localId) recordMap[localId] = fr.id;
      }
      const existingExtra = (config.extra as Record<string, unknown>) ?? {};
      await this.db
        .update(syncConfig)
        .set({
          lastSyncedAt: new Date(),
          status: 'configured',
          errorMessage: null,
          extra: { ...existingExtra, recordMap },
          updatedAt: new Date(),
        })
        .where(eq(syncConfig.domain, domain));

      await this.logSync({
        domain,
        direction: 'pull',
        action: 'pull_all',
        status: 'success',
        durationMs: Date.now() - startTime,
        payload: { syncedCount, totalFetched: allFeishuRecords.length },
      });

      return { success: true, syncedCount, failedCount: 0 };
    } catch (error: unknown) {
      const errMsg = this.extractErrorMessage(error);
      await this.db
        .update(syncConfig)
        .set({
          status: 'error',
          errorMessage: errMsg,
          updatedAt: new Date(),
        })
        .where(eq(syncConfig.domain, domain));

      await this.logSync({
        domain,
        direction: 'pull',
        action: 'pull_all',
        status: 'error',
        errorMessage: errMsg,
        durationMs: Date.now() - startTime,
      });

      return { success: false, syncedCount: 0, failedCount: 0, errorMessage: errMsg };
    }
  }

  async pushOne(
    domain: string,
    recordId: string,
    action: 'create' | 'update' | 'delete',
  ): Promise<SyncResult> {
    this.validateDomain(domain);
    const config = await this.getConfigByDomain(domain);

    if (!config.enabled || !config.feishuAppToken) {
      return { success: false, syncedCount: 0, failedCount: 0, errorMessage: '同步未启用或未配置' };
    }

    const startTime = Date.now();
    try {
      const recordMap = this.getRecordMap(config);

      if (action === 'delete') {
        const feishuRecordId = recordMap[recordId];
        if (feishuRecordId) {
          await this.callFeishu(domain, 'deleteRecords', {
            recordIDs: [feishuRecordId],
          });
          delete recordMap[recordId];
          await this.saveRecordMap(domain, recordMap);
        }
      } else if (action === 'create' || action === 'update') {
        const row = await this.fetchLocalRecord(domain, recordId);
        if (row) {
          const feishuRecord = this.toFeishuRecord(domain, row as Record<string, unknown>);
          let feishuRecordId: string | undefined = recordMap[recordId];

          if (!feishuRecordId) {
            const uk = this.getUniqueKey(domain, feishuRecord, 'feishu');
            if (uk) {
              const resp = (await this.callFeishu(domain, 'searchRecords', {
                filter: {
                  conjunction: 'and',
                  conditions: [{
                    fieldName: this.UNIQUE_KEY_MAP[domain as SyncDomain]?.feishuKey ?? '',
                    operator: 'is',
                    value: [uk],
                  }],
                },
                pageSize: 10,
              })) as {
                records: Array<{ id: string; record: FeishuRecord }>;
              };
              if (resp.records && resp.records.length > 0) {
                feishuRecordId = resp.records[0].id;
              }
            }
          }

          if (feishuRecordId) {
            try {
              await this.callFeishu(domain, 'batchUpdateRecords', {
                records: [{ id: feishuRecordId, record: feishuRecord }],
              });
              recordMap[recordId] = feishuRecordId;
              await this.saveRecordMap(domain, recordMap);
            } catch (updateErr: unknown) {
              if (this.isRecordNotFoundError(updateErr)) {
                delete recordMap[recordId];
                const result = (await this.callFeishu(domain, 'batchAddRecords', {
                  records: [{ record: feishuRecord }],
                })) as { recordIDs?: string[]; records?: Array<{ id: string }> };
                const newId = result?.recordIDs?.[0] ?? result?.records?.[0]?.id;
                if (newId) {
                  recordMap[recordId] = newId;
                  await this.saveRecordMap(domain, recordMap);
                }
              } else {
                throw updateErr;
              }
            }
          } else {
            const result = (await this.callFeishu(domain, 'batchAddRecords', {
              records: [{ record: feishuRecord }],
            })) as { recordIDs?: string[]; records?: Array<{ id: string }> };
            const newId = result?.recordIDs?.[0] ?? result?.records?.[0]?.id;
            if (newId) {
              recordMap[recordId] = newId;
              await this.saveRecordMap(domain, recordMap);
            }
          }
        }
      }

      await this.logSync({
        domain,
        direction: 'push',
        action: `push_one_${action}`,
        recordId,
        status: 'success',
        durationMs: Date.now() - startTime,
      });

      return { success: true, syncedCount: 1, failedCount: 0 };
    } catch (error: unknown) {
      const errMsg = this.extractErrorMessage(error);
      this.logger.error(`pushOne failed: ${errMsg}`);

      await this.logSync({
        domain,
        direction: 'push',
        action: `push_one_${action}`,
        recordId,
        status: 'error',
        errorMessage: errMsg,
        durationMs: Date.now() - startTime,
      });

      return { success: false, syncedCount: 0, failedCount: 1, errorMessage: errMsg };
    }
  }

  async pullOne(
    domain: string,
    feishuRecordId: string,
  ): Promise<SyncResult> {
    this.validateDomain(domain);
    const config = await this.getConfigByDomain(domain);
    this.ensureConfigured(config);

    const startTime = Date.now();
    try {
      const resp = (await this.callFeishu(domain, 'getRecord', {
        recordID: feishuRecordId,
      })) as { id: string; record: FeishuRecord };

      const localData = this.fromFeishuRecord(domain, resp.record);
      if (localData) {
        await this.upsertLocalRecord(domain, resp.id, localData);
      }

      await this.logSync({
        domain,
        direction: 'pull',
        action: 'pull_one',
        recordId: feishuRecordId,
        status: 'success',
        durationMs: Date.now() - startTime,
      });

      return { success: true, syncedCount: 1, failedCount: 0 };
    } catch (error: unknown) {
      const errMsg = this.extractErrorMessage(error);
      await this.logSync({
        domain,
        direction: 'pull',
        action: 'pull_one',
        recordId: feishuRecordId,
        status: 'error',
        errorMessage: errMsg,
        durationMs: Date.now() - startTime,
      });

      return { success: false, syncedCount: 0, failedCount: 1, errorMessage: errMsg };
    }
  }

  async getLogs(
    page: number,
    pageSize: number,
    domain?: string,
  ): Promise<SyncLogListResponse> {
    const conditions = [];
    if (domain) {
      conditions.push(eq(syncLog.domain, domain));
    }

    const whereClause = conditions.length > 0
      ? and(...conditions)
      : undefined;

    const totalResult = await this.db
      .select({ count: count() })
      .from(syncLog)
      .where(whereClause);
    const total = Number(totalResult[0]?.count ?? 0);

    const rows = await this.db
      .select()
      .from(syncLog)
      .where(whereClause)
      .orderBy(desc(syncLog.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const items = rows.map((r: typeof syncLog.$inferSelect) => ({
      id: r.id,
      domain: r.domain as SyncDomain,
      direction: r.direction as 'push' | 'pull' | 'bi',
      action: r.action,
      recordId: r.recordId,
      status: r.status,
      errorMessage: r.errorMessage,
      durationMs: r.durationMs ?? 0,
      payload: r.payload as Record<string, unknown> | null,
      retryCount: r.retryCount ?? 0,
      progress: r.progress ?? 0,
      insertCount: r.insertCount ?? 0,
      updateCount: r.updateCount ?? 0,
      skipCount: r.skipCount ?? 0,
      taskId: r.taskId,
      createdAt: r.createdAt.toISOString(),
    }));

    return { items, total, page, pageSize };
  }

  async isConfigured(domain: string): Promise<boolean> {
    const config = await this.getConfigByDomain(domain);
    return config.enabled && !!config.feishuAppToken && config.status !== 'unconfigured';
  }

  async logSync(entry: {
    domain: string;
    direction: string;
    action: string;
    recordId?: string;
    status: string;
    errorMessage?: string;
    durationMs?: number;
    payload?: Record<string, unknown>;
    createdBy?: string;
    retryCount?: number;
    nextRetryAt?: Date;
    progress?: number;
    insertCount?: number;
    updateCount?: number;
    skipCount?: number;
    taskId?: string;
  }): Promise<string | null> {
    try {
      const [inserted] = await this.db.insert(syncLog).values({
        domain: entry.domain,
        direction: entry.direction,
        action: entry.action,
        recordId: entry.recordId ?? null,
        status: entry.status,
        errorMessage: entry.errorMessage ?? null,
        durationMs: entry.durationMs ?? 0,
        payload: entry.payload ?? null,
        retryCount: entry.retryCount ?? 0,
        nextRetryAt: entry.nextRetryAt ?? null,
        progress: entry.progress ?? 0,
        insertCount: entry.insertCount ?? 0,
        updateCount: entry.updateCount ?? 0,
        skipCount: entry.skipCount ?? 0,
        taskId: entry.taskId ?? null,
      }).returning({ id: syncLog.id });
      return inserted?.id ?? null;
    } catch (err: unknown) {
      this.logger.error(`Failed to write sync log: ${this.extractErrorMessage(err)}`);
      return null;
    }
  }

  // ====== Private Helpers ======

  private validateDomain(domain: string): void {
    if (!VALID_DOMAINS.includes(domain as SyncDomain)) {
      throw new BadRequestException(
        `无效的同步域: ${domain}，有效值: ${VALID_DOMAINS.join(', ')}`,
      );
    }
  }

  private getDefaultTableName(domain: string): string {
    const names: Record<string, string> = {
      'products': '商品数据',
      'transactions': '出入库记录',
      'transfers': '调拨记录',
      'inventory_checks': '盘点记录',
      'warehouse_inventory': '仓库库存',
    };
    return names[domain] ?? domain;
  }

  private async getConfigByDomain(
    domain: string,
  ): Promise<typeof syncConfig.$inferSelect> {
    const rows = await this.db
      .select()
      .from(syncConfig)
      .where(eq(syncConfig.domain, domain))
      .limit(1);
    if (rows.length === 0) {
      throw new NotFoundException(`同步配置不存在: ${domain}`);
    }
    return rows[0];
  }

  private ensureConfigured(config: typeof syncConfig.$inferSelect): void {
    if (!config.feishuAppToken) {
      throw new BadRequestException('请先配置飞书 AppToken');
    }
    if (!config.enabled) {
      throw new BadRequestException('同步功能未启用');
    }
  }

  private mapConfigRow(r: typeof syncConfig.$inferSelect): SyncConfig {
    const extra = (r.extra as Record<string, unknown>) ?? {};
    const fieldMap = (extra['fieldMap'] as Record<string, string>) ?? {};
    const hasAppId = !!extra['feishuAppId'];
    const hasAppSecret = !!extra['feishuAppSecret'];
    return {
      id: r.id,
      domain: r.domain as SyncDomain,
      feishuAppToken: r.feishuAppToken,
      tableId: r.tableId,
      tableName: r.tableName,
      enabled: r.enabled,
      autoRealtime: r.autoRealtime,
      bidirectional: r.bidirectional,
      pollIntervalMin: r.pollIntervalMin,
      lastSyncedAt: r.lastSyncedAt ? r.lastSyncedAt.toISOString() : null,
      status: r.status as SyncConfig['status'],
      errorMessage: r.errorMessage,
      extra: {
        fieldMap,
        feishuAppId: hasAppId ? 'configured' : '',
        feishuAppSecret: hasAppSecret ? 'configured' : '',
      },
    };
  }

  private getPluginInstanceId(domain: string): string {
    const key = domain as SyncDomain;
    return PLUGIN_INSTANCE_MAP[key] ?? 'feishu_bitable_product_sync_1';
  }

  private async callFeishu(
    domain: string,
    actionKey: string,
    input: Record<string, unknown>,
  ): Promise<unknown> {
    const pluginId = this.getPluginInstanceId(domain);
    try {
      const result = await this.capabilityService
        .load(pluginId)
        .call(actionKey, input);
      return result;
    } catch (error: unknown) {
      const errName = (error as { name?: string })?.name;
      if (errName === 'CapabilityNotFoundError') {
        this.logger.log(
          `Plugin ${pluginId} not found for ${domain}/${actionKey}, ` +
          `falling back to Feishu Open API`,
        );
        return this.callFeishuFallback(domain, actionKey, input);
      }
      this.logger.error(`callFeishu ${domain}/${actionKey} failed: ${this.extractErrorMessage(error)}`);
      throw error;
    }
  }

  private async getFallbackCredentials(
    domain: string,
  ): Promise<{ appToken: string; tableId: string; appId: string; appSecret: string }> {
    const config = await this.getConfigByDomain(domain);
    const extra = (config.extra as Record<string, unknown>) ?? {};
    const feishuAppIdB64 = extra['feishuAppId'] as string | undefined;
    const feishuAppSecretB64 = extra['feishuAppSecret'] as string | undefined;

    if (!feishuAppIdB64 || !feishuAppSecretB64) {
      throw new BadRequestException(
        '未检测到飞书多维表格插件实例。请在同步设置中配置飞书应用凭证' +
        '（app_id + app_secret）以启用同步，或在妙搭平台插件面板配置 ' +
        'feishu_bitable_sync_rw 插件实例。',
      );
    }

    let appId: string;
    let appSecret: string;
    try {
      appId = decode(feishuAppIdB64);
      appSecret = decode(feishuAppSecretB64);
    } catch {
      throw new BadRequestException(
        '飞书应用凭证解码失败，请检查同步配置中的 app_id / app_secret 是否正确编码。',
      );
    }

    if (!config.feishuAppToken) {
      throw new BadRequestException('请先配置飞书 AppToken');
    }
    if (!config.tableId) {
      throw new BadRequestException('请先配置飞书多维表格 tableId');
    }

    return {
      appToken: config.feishuAppToken,
      tableId: config.tableId,
      appId,
      appSecret,
    };
  }

  private async callFeishuFallback(
    domain: string,
    actionKey: string,
    input: Record<string, unknown>,
  ): Promise<unknown> {
    const creds = await this.getFallbackCredentials(domain);
    const { appToken, tableId, appId, appSecret } = creds;

    switch (actionKey) {
      case 'searchRecords': {
        const params: {
          pageSize?: number;
          pageToken?: string;
          viewId?: string;
          filter?: Record<string, unknown>;
          sort?: Array<{ field_name: string; desc: boolean }>;
        } = {};
        if (input['pageSize'] !== undefined) {
          params.pageSize = Number(input['pageSize']);
        }
        if (typeof input['pageToken'] === 'string') {
          params.pageToken = input['pageToken'];
        }
        if (typeof input['viewID'] === 'string') {
          params.viewId = input['viewID'];
        }
        if (input['filter'] && typeof input['filter'] === 'object') {
          params.filter = input['filter'] as Record<string, unknown>;
        }
        if (input['sort'] && Array.isArray(input['sort'])) {
          params.sort = input['sort'] as Array<{ field_name: string; desc: boolean }>;
        }
        const resp = await this.feishuApiService.listRecords(
          appToken,
          tableId,
          params,
          appId,
          appSecret,
        );
        return {
          records: resp.items.map((item: { record_id: string; fields: Record<string, unknown> }) => ({
            id: item.record_id,
            record: item.fields,
          })),
          hasMore: resp.has_more,
          pageToken: resp.page_token,
          total: resp.total ?? 0,
        };
      }

      case 'batchAddRecords': {
        const recordsInput = input['records'] as Array<{ record: Record<string, unknown> }> | undefined;
        if (!Array.isArray(recordsInput)) {
          throw new BadRequestException('batchAddRecords: records 必须为数组');
        }
        const records = recordsInput.map((r: { record: Record<string, unknown> }) => ({
          fields: r.record,
        }));
        const resp = await this.feishuApiService.batchCreateRecords(
          appToken,
          tableId,
          records,
          appId,
          appSecret,
        );
        return {
          recordIDs: resp.records.map((r: { record_id: string }) => r.record_id),
        };
      }

      case 'batchUpdateRecords': {
        const recordsInput = input['records'] as
          | Array<{ id: string; record: Record<string, unknown> }>
          | undefined;
        if (!Array.isArray(recordsInput)) {
          throw new BadRequestException('batchUpdateRecords: records 必须为数组');
        }
        const records = recordsInput.map((r: { id: string; record: Record<string, unknown> }) => ({
          record_id: r.id,
          fields: r.record,
        }));
        return this.feishuApiService.batchUpdateRecords(
          appToken,
          tableId,
          records,
          appId,
          appSecret,
        );
      }

      case 'deleteRecords': {
        const recordIDs = input['recordIDs'] as string[] | undefined;
        if (!Array.isArray(recordIDs)) {
          throw new BadRequestException('deleteRecords: recordIDs 必须为数组');
        }
        return this.feishuApiService.batchDeleteRecords(
          appToken,
          tableId,
          recordIDs,
          appId,
          appSecret,
        );
      }

      case 'getRecord': {
        const recordID = input['recordID'] as string | undefined;
        if (!recordID) {
          throw new BadRequestException('getRecord: recordID 必填');
        }
        const resp = await this.feishuApiService.getRecord(
          appToken,
          tableId,
          recordID,
          appId,
          appSecret,
        );
        return {
          id: resp.record_id,
          record: resp.fields,
        };
      }

      case 'listFields': {
        const resp = await this.feishuApiService.listFields(
          appToken,
          tableId,
          appId,
          appSecret,
        );
        return {
          fields: resp.items.map((item: { field_id: string; field_name: string; type: number; description?: string }) => ({
            fieldId: item.field_id,
            fieldName: item.field_name,
            fieldType: String(item.type),
            description: item.description,
          })),
        };
      }

      case 'getView': {
        throw new BadRequestException('getView not supported in fallback mode');
      }

      default:
        throw new BadRequestException(`fallback 模式不支持的操作: ${actionKey}`);
    }
  }

  private extractErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (error && typeof error === 'object') {
      try {
        const obj = error as Record<string, unknown>;
        if (typeof obj['message'] === 'string') return obj['message'];
        if (typeof obj['msg'] === 'string') return obj['msg'];
        if (typeof obj['error'] === 'string') return obj['error'];
        return JSON.stringify(error);
      } catch {
        return String(error);
      }
    }
    return String(error);
  }

  private isRecordNotFoundError(error: unknown): boolean {
    const msg = this.extractErrorMessage(error);
    return /record not found/i.test(msg);
  }

  // ====== Data Mapping: Local DB → Feishu Record ======

  private toFeishuRecord(
    domain: string,
    row: Record<string, unknown>,
  ): FeishuRecord {
    const record: FeishuRecord = {};
    switch (domain) {
      case 'products': {
        record['商品编码'] = String(row['code'] ?? '');
        record['商品名称'] = String(row['name'] ?? '');
        record['品类'] = String(row['category'] ?? '');
        record['单位'] = String(row['unit'] ?? '');
        record['安全库存'] = Number(row['safetyStock'] ?? 0);
        record['参考单价'] = Number(row['unitPrice'] ?? 0);
        break;
      }
      case 'transactions': {
        record['出入库单号'] = String(row['orderNo'] ?? '');
        const typeMap: Record<string, string> = {
          inbound: '入库',
          outbound: '出库',
          transfer: '调拨',
        };
        const typeVal = typeMap[String(row['type'] ?? '')] ?? String(row['type'] ?? '');
        if (typeVal) record['类型'] = typeVal;
        record['类型细分'] = String(row['subType'] ?? '');
        record['商品名'] = String(row['productName'] ?? '');
        record['仓库'] = String(row['warehouse'] ?? '');
        record['数量'] = Number(row['quantity'] ?? 0);
        record['金额'] = Number(row['totalAmount'] ?? 0);
        record['操作人'] = String(row['operator'] ?? '');
        const txnDate = row['transactionDate'];
        if (txnDate instanceof Date) {
          record['操作时间'] = txnDate.getTime();
        } else if (typeof txnDate === 'string') {
          record['操作时间'] = new Date(txnDate).getTime();
        }
        break;
      }
      case 'transfers': {
        record['调拨单号'] = String(row['transferNo'] ?? '');
        record['商品名'] = String(row['productName'] ?? '');
        record['源仓库'] = String(row['sourceWarehouse'] ?? '');
        record['目标仓库'] = String(row['targetWarehouse'] ?? '');
        record['数量'] = Number(row['quantity'] ?? 0);
        const tfDate = row['transferDate'];
        if (tfDate instanceof Date) {
          record['调拨时间'] = tfDate.getTime();
        } else if (typeof tfDate === 'string') {
          record['调拨时间'] = new Date(tfDate).getTime();
        }
        break;
      }
      case 'inventory_checks': {
        record['盘点单号'] = String(row['checkNo'] ?? '');
        record['盘点人'] = String(row['createdBy'] ?? '');
        record['仓库'] = String(row['warehouse'] ?? '');
        record['状态'] = String(row['status'] ?? '');
        const checkDate = row['checkDate'];
        if (checkDate instanceof Date) {
          record['盘点时间'] = checkDate.getTime();
        } else if (typeof checkDate === 'string') {
          record['盘点时间'] = new Date(checkDate).getTime();
        }
        record['商品数'] = Number(row['productCount'] ?? 0);
        record['差异数'] = Number(row['differenceCount'] ?? 0);
        record['备注'] = String(row['remark'] ?? '');
        break;
      }
      case 'warehouse_inventory': {
        record['商品名称'] = String(row['productName'] ?? '');
        record['SKU'] = String(row['productCode'] ?? '');
        record['仓库'] = String(row['warehouse'] ?? '');
        record['当前库存'] = Number(row['quantity'] ?? 0);
        record['安全库存'] = Number(row['safetyStock'] ?? 0);
        record['库存状态'] = String(row['status'] ?? '');
        const updAt = row['updatedAt'];
        if (updAt instanceof Date) {
          record['最后更新时间'] = updAt.getTime();
        } else if (typeof updAt === 'string') {
          record['最后更新时间'] = new Date(updAt).getTime();
        }
        break;
      }
    }
    return record;
  }

  // ====== Data Mapping: Feishu Record → Local DB ======

  private fromFeishuRecord(
    domain: string,
    record: FeishuRecord,
  ): Record<string, unknown> | null {
    const getText = (key: string): string => {
      const val = record[key];
      if (val === undefined || val === null) return '';
      if (typeof val === 'string') return val;
      if (typeof val === 'object' && 'text' in (val as Record<string, unknown>)) {
        return String((val as Record<string, unknown>)['text'] ?? '');
      }
      return String(val);
    };
    const getNum = (key: string): number => {
      const val = record[key];
      if (val === undefined || val === null) return 0;
      return Number(val) || 0;
    };
    const getDate = (key: string): Date | null => {
      const val = record[key];
      if (val === undefined || val === null) return null;
      const ms = Number(val);
      if (isNaN(ms)) return null;
      return new Date(ms);
    };

    switch (domain) {
      case 'products':
        return {
          code: getText('商品编码'),
          name: getText('商品名称'),
          category: getText('品类'),
          unit: getText('单位'),
          safetyStock: getNum('安全库存'),
          unitPrice: String(getNum('参考单价')),
          status: 'active',
        };
      case 'transactions': {
        const getText = (key: string): string => {
          const val = record[key];
          if (val == null) return '';
          if (typeof val === 'string') return val;
          if (typeof val === 'object' && val !== null && 'text' in (val as Record<string, unknown>)) {
            return String((val as Record<string, unknown>).text ?? '');
          }
          return String(val);
        };
        const getNum = (key: string): number => {
          const val = record[key];
          if (val == null || val === '') return 0;
          const num = Number(val);
          return isNaN(num) ? 0 : num;
        };
        const getDate = (key: string): Date | null => {
          const val = record[key];
          if (val == null || val === '') return null;
          if (val instanceof Date) return val;
          if (typeof val === 'number') return new Date(val);
          if (typeof val === 'string') {
            const d = new Date(val);
            return isNaN(d.getTime()) ? null : d;
          }
          return null;
        };
        const result: Record<string, unknown> = {
          orderNo: getText('出入库单号'),
          productName: getText('商品名'),
          warehouse: getText('仓库'),
          subType: getText('类型细分'),
          quantity: getNum('数量'),
          totalAmount: String(getNum('金额')),
          operator: getText('操作人'),
        };
        const typeText = getText('类型');
        const reverseTypeMap: Record<string, string> = {
          '入库': 'inbound',
          '出库': 'outbound',
          '调拨': 'transfer',
        };
        result['type'] = reverseTypeMap[typeText] ?? typeText;
        result['transactionDate'] = getDate('操作时间') ?? new Date();
        return result;
      }
      case 'transfers':
        return {
          transferNo: getText('调拨单号'),
          productName: getText('商品名'),
          sourceWarehouse: getText('源仓库'),
          targetWarehouse: getText('目标仓库'),
          quantity: getNum('数量'),
          transferDate: getDate('调拨时间') ?? new Date(),
        };
      case 'inventory_checks':
        return {
          checkNo: getText('盘点单号'),
          createdBy: getText('盘点人'),
          warehouse: getText('仓库'),
          status: getText('状态') || 'pending',
          checkDate: getDate('盘点时间') ?? new Date(),
          productCount: getNum('商品数'),
          differenceCount: getNum('差异数'),
          remark: getText('备注'),
        };
      case 'warehouse_inventory':
        return {
          productName: getText('商品名称'),
          productCode: getText('SKU'),
          warehouse: getText('仓库'),
          quantity: getNum('当前库存'),
          safetyStock: getNum('安全库存'),
          status: getText('库存状态'),
          updatedAt: getDate('最后更新时间'),
        };
      default:
        return null;
    }
  }

  // ====== Local DB Operations ======

  private async fetchAllLocalRecords(
    domain: string,
  ): Promise<Record<string, unknown>[]> {
    switch (domain) {
      case 'products': {
        const rows = await this.db
          .select()
          .from(products)
          .where(isNull(products.deletedAt));
        return rows as unknown as Record<string, unknown>[];
      }
      case 'transactions': {
        const rows = await this.db
          .select({
            id: stockTransactions.id,
            orderNo: stockTransactions.orderNo,
            type: stockTransactions.type,
            subType: stockTransactions.subType,
            productName: products.name,
            warehouse: stockTransactions.warehouse,
            quantity: stockTransactions.quantity,
            totalAmount: stockTransactions.totalAmount,
            operator: stockTransactions.operator,
            transactionDate: stockTransactions.transactionDate,
            createdAt: stockTransactions.createdAt,
            updatedAt: stockTransactions.updatedAt,
          })
          .from(stockTransactions)
          .leftJoin(products, eq(stockTransactions.productId, products.id));
        return rows as unknown as Record<string, unknown>[];
      }
      case 'transfers': {
        const rows = await this.db
          .select({
            id: transfers.id,
            transferNo: transfers.transferNo,
            productName: products.name,
            sourceWarehouse: transfers.sourceWarehouse,
            targetWarehouse: transfers.targetWarehouse,
            quantity: transfers.quantity,
            transferDate: transfers.transferDate,
            createdAt: transfers.createdAt,
            updatedAt: transfers.updatedAt,
          })
          .from(transfers)
          .leftJoin(products, eq(transfers.productId, products.id));
        return rows as unknown as Record<string, unknown>[];
      }
      case 'inventory_checks': {
        const rows = await this.db
          .select({
            id: inventoryChecks.id,
            warehouse: inventoryChecks.warehouse,
            status: inventoryChecks.status,
            checkDate: inventoryChecks.checkDate,
            createdBy: sql<string>`(${inventoryChecks.createdBy}).user_id`,
            createdAt: inventoryChecks.createdAt,
            updatedAt: inventoryChecks.updatedAt,
             checkNo: inventoryChecks.checkNo,
            productCount: sql<number>`
              (SELECT COUNT(*) FROM inventory_check_items ici WHERE ici.check_id = ${inventoryChecks.id})
            `,
            differenceCount: sql<number>`
              (SELECT COUNT(*) FROM inventory_check_items ici WHERE ici.check_id = ${inventoryChecks.id} AND ici.difference != 0)
            `,
          })
          .from(inventoryChecks);
        return rows as unknown as Record<string, unknown>[];
      }
      case 'warehouse_inventory': {
        const rows = await this.db
          .select({
            id: warehouseInventory.id,
            productId: warehouseInventory.productId,
            productName: products.name,
            productCode: products.code,
            warehouse: warehouseInventory.warehouse,
            quantity: warehouseInventory.quantity,
            safetyStock: products.safetyStock,
            status: warehouseInventory.status,
            stockValue: warehouseInventory.stockValue,
            updatedAt: warehouseInventory.updatedAt,
          })
          .from(warehouseInventory)
          .leftJoin(products, eq(warehouseInventory.productId, products.id));
        return rows as unknown as Record<string, unknown>[];
      }
      default:
        return [];
    }
  }

  private async fetchLocalRecord(
    domain: string,
    recordId: string,
  ): Promise<Record<string, unknown> | null> {
    switch (domain) {
      case 'products': {
        const rows = await this.db
          .select()
          .from(products)
          .where(eq(products.id, recordId))
          .limit(1);
        return rows.length > 0 ? (rows[0] as unknown as Record<string, unknown>) : null;
      }
      case 'transactions': {
        const rows = await this.db
          .select({
            id: stockTransactions.id,
            orderNo: stockTransactions.orderNo,
            type: stockTransactions.type,
            subType: stockTransactions.subType,
            productName: products.name,
            warehouse: stockTransactions.warehouse,
            quantity: stockTransactions.quantity,
            totalAmount: stockTransactions.totalAmount,
            operator: stockTransactions.operator,
            transactionDate: stockTransactions.transactionDate,
            createdAt: stockTransactions.createdAt,
            updatedAt: stockTransactions.updatedAt,
          })
          .from(stockTransactions)
          .leftJoin(products, eq(stockTransactions.productId, products.id))
          .where(eq(stockTransactions.id, recordId))
          .limit(1);
        return rows.length > 0 ? (rows[0] as unknown as Record<string, unknown>) : null;
      }
      case 'transfers': {
        const rows = await this.db
          .select({
            id: transfers.id,
            transferNo: transfers.transferNo,
            productName: products.name,
            sourceWarehouse: transfers.sourceWarehouse,
            targetWarehouse: transfers.targetWarehouse,
            quantity: transfers.quantity,
            transferDate: transfers.transferDate,
            createdAt: transfers.createdAt,
            updatedAt: transfers.updatedAt,
          })
          .from(transfers)
          .leftJoin(products, eq(transfers.productId, products.id))
          .where(eq(transfers.id, recordId))
          .limit(1);
        return rows.length > 0 ? (rows[0] as unknown as Record<string, unknown>) : null;
      }
      case 'inventory_checks': {
        const rows = await this.db
          .select({
            id: inventoryChecks.id,
            warehouse: inventoryChecks.warehouse,
            status: inventoryChecks.status,
            checkDate: inventoryChecks.checkDate,
            createdBy: sql<string>`(${inventoryChecks.createdBy}).user_id`,
            createdAt: inventoryChecks.createdAt,
            updatedAt: inventoryChecks.updatedAt,
             checkNo: inventoryChecks.checkNo,
            productCount: sql<number>`0`,
            differenceCount: sql<number>`0`,
          })
          .from(inventoryChecks)
          .where(eq(inventoryChecks.id, recordId))
          .limit(1);
        if (rows.length > 0) {
          const row = rows[0] as Record<string, unknown>;
          const itemStats = await this.db
            .select({
              total: count(),
              diffCount: sql<number>`
                count(*) filter (where ${inventoryCheckItems.difference} != 0)
              `,
            })
            .from(inventoryCheckItems)
            .where(eq(inventoryCheckItems.checkId, recordId));
          if (itemStats.length > 0) {
            row['productCount'] = Number(itemStats[0].total) || 0;
            row['differenceCount'] = Number(itemStats[0].diffCount) || 0;
          }
          return row;
        }
        return null;
      }
      case 'warehouse_inventory': {
        const rows = await this.db
          .select({
            id: warehouseInventory.id,
            productId: warehouseInventory.productId,
            productName: products.name,
            productCode: products.code,
            warehouse: warehouseInventory.warehouse,
            quantity: warehouseInventory.quantity,
            safetyStock: products.safetyStock,
            status: warehouseInventory.status,
            stockValue: warehouseInventory.stockValue,
            updatedAt: warehouseInventory.updatedAt,
          })
          .from(warehouseInventory)
          .leftJoin(products, eq(warehouseInventory.productId, products.id))
          .where(eq(warehouseInventory.id, recordId))
          .limit(1);
        return rows.length > 0 ? (rows[0] as unknown as Record<string, unknown>) : null;
      }
      default:
        return null;
    }
  }

  private async upsertLocalRecord(
    domain: string,
    _feishuRecordId: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    // Upsert based on natural keys for each domain
    try {
      switch (domain) {
        case 'products': {
          const code = String(data['code'] ?? '');
          if (!code) return;
          const existing = await this.db
            .select()
            .from(products)
            .where(eq(products.code, code))
            .limit(1);
          if (existing.length > 0) {
            await this.db
              .update(products)
              .set({
                name: String(data['name'] ?? existing[0].name),
                category: String(data['category'] ?? existing[0].category),
                brand: String(data['brand'] ?? existing[0].brand ?? ''),
                spec: String(data['spec'] ?? existing[0].spec ?? ''),
                unit: String(data['unit'] ?? existing[0].unit),
                safetyStock: Number(data['safetyStock'] ?? existing[0].safetyStock),
                unitPrice: String(data['unitPrice'] ?? existing[0].unitPrice),
                status: String(data['status'] ?? existing[0].status),
                updatedAt: new Date(),
              })
              .where(eq(products.id, existing[0].id));
          } else {
            await this.db.insert(products).values({
              code,
              name: String(data['name'] ?? ''),
              category: String(data['category'] ?? ''),
              brand: String(data['brand'] ?? '') || null,
              spec: String(data['spec'] ?? '') || null,
              unit: String(data['unit'] ?? ''),
              safetyStock: Number(data['safetyStock'] ?? 0),
              unitPrice: String(data['unitPrice'] ?? '0'),
              status: String(data['status'] ?? 'active'),
            });
          }
          break;
        }
        case 'transactions': {
          const orderNo = String(data['orderNo'] ?? '');
          if (!orderNo) return;
          const existing = await this.db
            .select()
            .from(stockTransactions)
            .where(eq(stockTransactions.orderNo, orderNo))
            .limit(1);
          if (existing.length > 0) return;
          let productId: string | null = null;
          const productName = String(data['productName'] ?? '');
          if (productName) {
            const prod = await this.db
              .select({ id: products.id })
              .from(products)
              .where(eq(products.name, productName))
              .limit(1);
            if (prod.length > 0) productId = prod[0].id;
          }
          await this.db.insert(stockTransactions).values({
            productId: productId || undefined,
            warehouse: String(data['warehouse'] ?? ''),
            type: String(data['type'] ?? ''),
            subType: String(data['subType'] ?? '') || null,
            quantity: Number(data['quantity'] ?? 0),
            totalAmount: String(data['totalAmount'] ?? '0'),
            orderNo,
            operator: String(data['operator'] ?? '') || null,
            transactionDate: data['transactionDate'] instanceof Date
              ? data['transactionDate'] as Date
              : new Date(),
          }).onConflictDoNothing();
          break;
        }
        case 'transfers': {
          const transferNo = String(data['transferNo'] ?? '');
          if (!transferNo) return;
          const existing = await this.db
            .select()
            .from(transfers)
            .where(eq(transfers.transferNo, transferNo))
            .limit(1);
          if (existing.length === 0) {
            let productId: string | null = null;
            const productName = String(data['productName'] ?? '');
            if (productName) {
              const prod = await this.db
                .select({ id: products.id })
                .from(products)
                .where(eq(products.name, productName))
                .limit(1);
              if (prod.length > 0) productId = prod[0].id;
            }
            await this.db.insert(transfers).values({
              transferNo,
              productId: productId || undefined,
              sourceWarehouse: String(data['sourceWarehouse'] ?? ''),
              targetWarehouse: String(data['targetWarehouse'] ?? ''),
              quantity: Number(data['quantity'] ?? 0),
              transferDate: data['transferDate'] instanceof Date
                ? data['transferDate'] as Date
                : new Date(),
            });
          }
          break;
        }
        case 'inventory_checks': {
          const warehouse = String(data['warehouse'] ?? '');
          if (!warehouse) return;
          const checkNo = String(data['checkNo'] ?? '');
          let existing: Record<string, unknown> | null = null;
          if (checkNo) {
             const rows = await this.db
               .select()
               .from(inventoryChecks)
               .where(eq(inventoryChecks.checkNo, checkNo))
               .limit(1);
             if (rows.length > 0) existing = rows[0] as Record<string, unknown>;
           }
           if (existing) {
             const patch: Partial<typeof inventoryChecks.$inferInsert> = {
               warehouse,
               status: String(data['status'] ?? existing['status']),
               checkDate: data['checkDate'] instanceof Date
                 ? data['checkDate'] as Date
                 : (existing['checkDate'] as Date),
               updatedAt: new Date(),
             };
             await this.db
               .update(inventoryChecks)
               .set(patch)
               .where(eq(inventoryChecks.checkNo, checkNo));
           } else {
             await this.db.insert(inventoryChecks).values({
               checkNo: checkNo || undefined,
               warehouse,
               status: String(data['status'] ?? 'pending'),
               checkDate: data['checkDate'] instanceof Date
                 ? data['checkDate'] as Date
                 : new Date(),
             });
           }
          break;
        }
        case 'warehouse_inventory': {
          const productCode = String(data['productCode'] ?? '');
          const productName = String(data['productName'] ?? '');
          const warehouse = String(data['warehouse'] ?? '');
          if ((!productCode && !productName) || !warehouse) return;
          let productId: string | null = null;
          if (productCode) {
            const prod = await this.db
              .select({ id: products.id })
              .from(products)
              .where(eq(products.code, productCode))
              .limit(1);
            if (prod.length > 0) productId = prod[0].id;
          }
          if (!productId && productName) {
            const prod = await this.db
              .select({ id: products.id })
              .from(products)
              .where(eq(products.name, productName))
              .limit(1);
            if (prod.length > 0) productId = prod[0].id;
          }
          if (!productId) return;
          const existing = await this.db
            .select()
            .from(warehouseInventory)
            .where(
              and(
                eq(warehouseInventory.productId, productId),
                eq(warehouseInventory.warehouse, warehouse),
              ),
            )
            .limit(1);
          if (existing.length > 0) {
            const patch: Partial<typeof warehouseInventory.$inferInsert> = {
              quantity: Number(data['quantity'] ?? existing[0].quantity),
              updatedAt: new Date(),
            };
            if (data['status'] !== undefined && data['status'] !== null) {
              patch.status = String(data['status']);
            }
            await this.db
              .update(warehouseInventory)
              .set(patch)
              .where(eq(warehouseInventory.id, existing[0].id));
          } else {
            await this.db.insert(warehouseInventory).values({
              productId,
              warehouse,
              quantity: Number(data['quantity'] ?? 0),
              status: String(data['status'] ?? 'active'),
            });
          }
          break;
        }
      }
    } catch (error: unknown) {
      this.logger.warn(`upsertLocalRecord failed for ${domain}: ${this.extractErrorMessage(error)}`);
    }
  }

  // ====== Lifecycle Hooks ======

  onModuleInit(): void {
    this.startBidirectionalPolling();
  }

  onModuleDestroy(): void {
    this.stopBidirectionalPolling();
  }

  // ====== Bidirectional Polling ======

  startBidirectionalPolling(): void {
    if (this.pollingTimer) return;
    this.logger.log('Starting bidirectional sync polling');
    this.pollingTimer = setInterval(() => {
      this.runPollingCycle().catch((err: unknown) => {
        this.logger.error(`Polling cycle error: ${this.extractErrorMessage(err)}`);
      });
    }, this.currentPollIntervalMs);

    // Start retry scanner
    this.retryTimer = setInterval(() => {
      this.processRetries().catch((err: unknown) => {
        this.logger.error(`Retry scan error: ${this.extractErrorMessage(err)}`);
      });
    }, RETRY_SCAN_INTERVAL_MS);

    // Run first cycle after a short delay to let services warm up
    setTimeout(() => {
      this.runPollingCycle().catch((err: unknown) => {
        this.logger.error(`Initial polling error: ${this.extractErrorMessage(err)}`);
      });
    }, 10000);
  }

  stopBidirectionalPolling(): void {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
      this.logger.log('Stopped bidirectional sync polling');
    }
    if (this.retryTimer) {
      clearInterval(this.retryTimer);
      this.retryTimer = null;
    }
    this.pollingLocks.clear();
  }

  private async runPollingCycle(): Promise<void> {
    const configs = await this.db
      .select()
      .from(syncConfig)
      .where(and(eq(syncConfig.enabled, true), eq(syncConfig.bidirectional, true)));

    if (configs.length === 0) return;

    // Adjust polling interval to the shortest configured interval
    let minInterval = DEFAULT_POLL_INTERVAL_MIN;
    for (const cfg of configs) {
      if (cfg.pollIntervalMin && cfg.pollIntervalMin > 0) {
        minInterval = Math.min(minInterval, cfg.pollIntervalMin);
      }
    }
    const newIntervalMs = minInterval * 60 * 1000;
    if (newIntervalMs !== this.currentPollIntervalMs && this.pollingTimer) {
      this.currentPollIntervalMs = newIntervalMs;
      clearInterval(this.pollingTimer);
      this.pollingTimer = setInterval(() => {
        this.runPollingCycle().catch((err: unknown) => {
          this.logger.error(`Polling cycle error: ${this.extractErrorMessage(err)}`);
        });
      }, this.currentPollIntervalMs);
    }

    // Poll each domain with per-domain lock
    for (const cfg of configs) {
      const domain = cfg.domain;
      if (this.pollingLocks.has(domain)) continue;
      this.pollingLocks.add(domain);

      this.pullIncremental(domain)
        .catch((err: unknown) => {
          this.logger.error(
            `Incremental pull failed for ${domain}: ${this.extractErrorMessage(err)}`,
          );
        })
        .finally(() => {
          this.pollingLocks.delete(domain);
        });
    }
  }

  // ====== Incremental Pull ======

  private async pullIncremental(domain: string): Promise<void> {
    const config = await this.getConfigByDomain(domain);
    if (!config.enabled || !config.feishuAppToken) return;

    const startTime = Date.now();
    const extra = (config.extra as Record<string, unknown>) ?? {};
    const lastSyncCursor = extra['lastSyncCursor'] as string | undefined;

    // If no cursor, fall back to full pull
    if (!lastSyncCursor) {
      this.logger.log(`No lastSyncCursor for ${domain}, falling back to full pull`);
      const result = await this.pullAll(domain);
      if (result.success) {
        const updatedConfig = await this.getConfigByDomain(domain);
        const updatedExtra = (updatedConfig.extra as Record<string, unknown>) ?? {};
        await this.db
          .update(syncConfig)
          .set({
            extra: { ...updatedExtra, lastSyncCursor: new Date().toISOString() },
            updatedAt: new Date(),
          })
          .where(eq(syncConfig.domain, domain));
      }
      return;
    }

    try {
      this.logger.log(`Incremental pull for ${domain} since ${lastSyncCursor}`);

      const allRecords: Array<{ id: string; record: FeishuRecord }> = [];
      let pageToken: string | undefined;
      let hasMore = true;

      while (hasMore) {
        const params: Record<string, unknown> = { pageSize: 500 };
        if (pageToken) params['pageToken'] = pageToken;

        const resp = (await this.callFeishu(
          domain,
          'searchRecords',
          params,
        )) as FeishuSearchResponse;
        allRecords.push(...resp.records);
        hasMore = resp.hasMore;
        pageToken = resp.pageToken;
      }

      let insertCount = 0;
      let updateCount = 0;
      let skipCount = 0;

      for (const fr of allRecords) {
        const localData = this.fromFeishuRecord(domain, fr.record);
        if (!localData) {
          skipCount++;
          continue;
        }
        const exists = await this.checkLocalRecordExists(domain, localData);
        await this.upsertLocalRecord(domain, fr.id, localData);
        if (exists) {
          updateCount++;
        } else {
          insertCount++;
        }
      }

      const nowIso = new Date().toISOString();
      const newExtra = { ...extra, lastSyncCursor: nowIso };
      await this.db
        .update(syncConfig)
        .set({
          lastSyncedAt: new Date(),
          status: 'configured',
          errorMessage: null,
          extra: newExtra,
          updatedAt: new Date(),
        })
        .where(eq(syncConfig.domain, domain));

      await this.logSync({
        domain,
        direction: 'pull',
        action: 'pull_incremental',
        status: 'success',
        durationMs: Date.now() - startTime,
        insertCount,
        updateCount,
        skipCount,
        payload: { totalFetched: allRecords.length, cursor: lastSyncCursor },
      });
    } catch (error: unknown) {
      const errMsg = this.extractErrorMessage(error);
      this.logger.error(`Incremental pull error for ${domain}: ${errMsg}`);

      const logId = await this.logSync({
        domain,
        direction: 'pull',
        action: 'pull_incremental',
        status: 'failed',
        errorMessage: errMsg,
        durationMs: Date.now() - startTime,
      });

      if (logId) {
        await this.scheduleRetry(logId, errMsg, 0);
      }

      await this.notifySyncFailure(domain, errMsg, 0);
    }
  }

  private async checkLocalRecordExists(
    domain: string,
    data: Record<string, unknown>,
  ): Promise<boolean> {
    try {
      switch (domain) {
        case 'products': {
          const code = String(data['code'] ?? '');
          if (!code) return false;
          const rows = await this.db
            .select({ id: products.id })
            .from(products)
            .where(eq(products.code, code))
            .limit(1);
          return rows.length > 0;
        }
        case 'transactions': {
          return false; // append-only
        }
        case 'transfers': {
          const transferNo = String(data['transferNo'] ?? '');
          if (!transferNo) return false;
          const rows = await this.db
            .select({ id: transfers.id })
            .from(transfers)
            .where(eq(transfers.transferNo, transferNo))
            .limit(1);
          return rows.length > 0;
        }
        case 'inventory_checks': {
          return false;
        }
        case 'warehouse_inventory': {
          const productCode = String(data['productCode'] ?? '');
          const productName = String(data['productName'] ?? '');
          const warehouse = String(data['warehouse'] ?? '');
          if ((!productCode && !productName) || !warehouse) return false;
          let productId: string | null = null;
          if (productCode) {
            const prod = await this.db
              .select({ id: products.id })
              .from(products)
              .where(eq(products.code, productCode))
              .limit(1);
            if (prod.length > 0) productId = prod[0].id;
          }
          if (!productId && productName) {
            const prod = await this.db
              .select({ id: products.id })
              .from(products)
              .where(eq(products.name, productName))
              .limit(1);
            if (prod.length > 0) productId = prod[0].id;
          }
          if (!productId) return false;
          const rows = await this.db
            .select({ id: warehouseInventory.id })
            .from(warehouseInventory)
            .where(
              and(
                eq(warehouseInventory.productId, productId),
                eq(warehouseInventory.warehouse, warehouse),
              ),
            )
            .limit(1);
          return rows.length > 0;
        }
        default:
          return false;
      }
    } catch {
      return false;
    }
  }

  // ====== Retry Mechanism ======

  async scheduleRetry(logId: string, errorMsg: string, retryCount: number): Promise<void> {
    if (retryCount >= MAX_RETRY_COUNT) return;

    const delayMin = RETRY_DELAYS_MIN[retryCount] ?? RETRY_DELAYS_MIN[RETRY_DELAYS_MIN.length - 1];
    const nextRetryAt = new Date(Date.now() + delayMin * 60 * 1000);

    try {
      await this.db
        .update(syncLog)
        .set({
          status: 'failed',
          errorMessage: errorMsg,
          retryCount: retryCount + 1,
          nextRetryAt,
        })
        .where(eq(syncLog.id, logId));
    } catch (err: unknown) {
      this.logger.error(`Failed to schedule retry: ${this.extractErrorMessage(err)}`);
    }
  }

  private async processRetries(): Promise<void> {
    const now = new Date();
    try {
      const pendingRetries = await this.db
        .select()
        .from(syncLog)
        .where(
          and(
            eq(syncLog.status, 'failed'),
            sql`${syncLog.nextRetryAt} IS NOT NULL`,
            sql`${syncLog.nextRetryAt} <= ${now.toISOString()}`,
            gte(syncLog.retryCount, 0),
            lt(syncLog.retryCount, MAX_RETRY_COUNT + 1),
          ),
        )
        .orderBy(syncLog.nextRetryAt)
        .limit(20);

      for (const log of pendingRetries) {
        try {
          await this.executeRetry(
            log.id,
            log.domain,
            log.action,
            log.retryCount ?? 0,
            log.recordId ?? undefined,
          );
        } catch (err: unknown) {
          this.logger.error(
            `Retry execution failed for log ${log.id}: ${this.extractErrorMessage(err)}`,
          );
        }
      }
    } catch (err: unknown) {
      this.logger.error(`Retry scan failed: ${this.extractErrorMessage(err)}`);
    }
  }

  private async executeRetry(
    logId: string,
    domain: string,
    action: string,
    currentRetryCount: number,
    recordId?: string,
  ): Promise<void> {
    this.logger.log(`Executing retry ${currentRetryCount} for ${domain}/${action}`);
    const startTime = Date.now();

    try {
      let success = false;
      let insertCount = 0;
      let updateCount = 0;
      let skipCount = 0;

      if (action === 'push_all' || action === 'initialize') {
        const result = await this.pushAll(domain);
        success = result.success;
        if (result.success) insertCount = result.syncedCount;
      } else if (action === 'pull_all') {
        const result = await this.pullAll(domain);
        success = result.success;
        if (result.success) insertCount = result.syncedCount;
      } else if (action === 'pull_incremental') {
        await this.pullIncremental(domain);
        success = true;
      } else if (action.startsWith('push_one_') && recordId) {
        const pushAction = action.replace('push_one_', '') as 'create' | 'update' | 'delete';
        const result = await this.pushOne(domain, recordId, pushAction);
        success = result.success;
        if (result.success) insertCount = 1;
      } else if (action === 'pull_one' && recordId) {
        const result = await this.pullOne(domain, recordId);
        success = result.success;
        if (result.success) insertCount = 1;
      }

      if (success) {
        await this.db
          .update(syncLog)
          .set({
            status: 'success',
            errorMessage: null,
            durationMs: Date.now() - startTime,
            insertCount,
            updateCount,
            skipCount,
            nextRetryAt: null,
          })
          .where(eq(syncLog.id, logId));

        if (currentRetryCount > 0) {
          await this.notifySyncRecovery(domain, currentRetryCount);
        }
      } else {
        const errMsg = 'Retry completed without success';
        if (currentRetryCount < MAX_RETRY_COUNT) {
          await this.scheduleRetry(logId, errMsg, currentRetryCount);
        } else {
          await this.db
            .update(syncLog)
            .set({
              status: 'failed',
              errorMessage: errMsg,
              nextRetryAt: null,
            })
            .where(eq(syncLog.id, logId));
          await this.notifySyncFailure(domain, errMsg, currentRetryCount);
        }
      }
    } catch (error: unknown) {
      const errMsg = this.extractErrorMessage(error);
      if (currentRetryCount < MAX_RETRY_COUNT) {
        await this.scheduleRetry(logId, errMsg, currentRetryCount);
      } else {
        await this.db
          .update(syncLog)
          .set({
            status: 'failed',
            errorMessage: errMsg,
            nextRetryAt: null,
          })
          .where(eq(syncLog.id, logId));
        await this.notifySyncFailure(domain, errMsg, currentRetryCount);
      }
    }
  }

  // ====== Async Task Management ======

  startAsyncTask(
    domain: string,
    action: 'push_all' | 'pull_all' | 'initialize',
  ): string {
    const taskId = this.generateUuid();
    const direction: 'push' | 'pull' =
      action.startsWith('push') || action === 'initialize' ? 'push' : 'pull';

    void this.logSync({
      domain,
      direction,
      action,
      status: 'pending',
      taskId,
      progress: 0,
    });

    setImmediate(() => {
      this.runAsyncTask(taskId, domain, action).catch((err: unknown) => {
        this.logger.error(`Async task ${taskId} failed: ${this.extractErrorMessage(err)}`);
      });
    });

    return taskId;
  }

  private async runAsyncTask(
    taskId: string,
    domain: string,
    action: 'push_all' | 'pull_all' | 'initialize',
  ): Promise<void> {
    const startTime = Date.now();
    try {
      await this.updateTaskProgress(taskId, 1, 'running');

      if (action === 'initialize') {
        const config = await this.getConfigByDomain(domain);
        if (!config.feishuAppToken) {
          throw new BadRequestException('请先配置飞书 AppToken');
        }
        await this.callFeishu(domain, 'searchRecords', { pageSize: 1 });
        await this.db
          .update(syncConfig)
          .set({ status: 'configured', errorMessage: null, updatedAt: new Date() })
          .where(eq(syncConfig.domain, domain));
        await this.updateTaskProgress(taskId, 100, 'completed');
      } else if (action === 'push_all') {
        await this.runPushAllWithProgress(taskId, domain);
      } else {
        await this.runPullAllWithProgress(taskId, domain);
      }

      await this.db
        .update(syncLog)
        .set({
          status: 'completed',
          progress: 100,
          durationMs: Date.now() - startTime,
        })
        .where(eq(syncLog.taskId, taskId));
    } catch (error: unknown) {
      const errMsg = this.extractErrorMessage(error);
      await this.db
        .update(syncLog)
        .set({
          status: 'failed',
          errorMessage: errMsg,
          progress: 100,
          durationMs: Date.now() - startTime,
        })
        .where(eq(syncLog.taskId, taskId));
      await this.notifySyncFailure(domain, errMsg, 0);
    }
  }

  private async updateTaskProgress(
    taskId: string,
    progress: number,
    status: string,
  ): Promise<void> {
    try {
      await this.db
        .update(syncLog)
        .set({ progress, status })
        .where(eq(syncLog.taskId, taskId));
    } catch (err: unknown) {
      this.logger.warn(`Failed to update task progress: ${this.extractErrorMessage(err)}`);
    }
  }

  private async runPushAllWithProgress(taskId: string, domain: string): Promise<void> {
    const config = await this.getConfigByDomain(domain);
    this.ensureConfigured(config);

    const rows = await this.fetchAllLocalRecords(domain);
    const feishuRecords = rows.map((row: Record<string, unknown>) =>
      this.toFeishuRecord(domain, row),
    );

    const existingFeishuRecords = await this.fetchAllFeishuRecords(domain);
    const feishuKeyMap = this.buildFeishuKeyMap(domain, existingFeishuRecords);

    const oldRecordMap = this.getRecordMap(config);
    const recordMap: Record<string, string> = { ...oldRecordMap };

    const toUpdate: Array<{ id: string; record: FeishuRecord; localId: string }> = [];
    const toInsert: Array<{ record: FeishuRecord; localId: string }> = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i] as Record<string, unknown>;
      const feishuRecord = feishuRecords[i];
      const localId = String(row['id'] ?? '');
      const uk = this.getUniqueKey(domain, feishuRecord, 'feishu');

      let feishuRecordId: string | undefined;
      if (uk) feishuRecordId = feishuKeyMap.get(uk);
      if (!feishuRecordId) feishuRecordId = oldRecordMap[localId];

      if (feishuRecordId) {
        toUpdate.push({ id: feishuRecordId, record: feishuRecord, localId });
        recordMap[localId] = feishuRecordId;
      } else {
        toInsert.push({ record: feishuRecord, localId });
      }
    }

    const total = feishuRecords.length;
    let syncedCount = 0;
    let insertCount = 0;
    let updateCount = 0;
    let deleteCount = 0;

    for (let i = 0; i < toUpdate.length; i += BATCH_SIZE) {
      const batch = toUpdate.slice(i, i + BATCH_SIZE);
      try {
        await this.callFeishu(domain, 'batchUpdateRecords', {
          records: batch.map((b: { id: string; record: FeishuRecord }) => ({
            id: b.id,
            record: b.record,
          })),
        });
        updateCount += batch.length;
        syncedCount += batch.length;
      } catch (updateErr: unknown) {
        if (this.isRecordNotFoundError(updateErr)) {
          for (const item of batch) {
            delete recordMap[item.localId];
            toInsert.push({ record: item.record, localId: item.localId });
          }
        } else {
          throw updateErr;
        }
      }
      const progress = Math.min(100, Math.round((syncedCount / Math.max(1, total)) * 100));
      await this.updateTaskProgress(taskId, progress, 'running');
    }

    for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
      const batch = toInsert.slice(i, i + BATCH_SIZE);
      const result = (await this.callFeishu(domain, 'batchAddRecords', {
        records: batch.map((b: { record: FeishuRecord }) => ({ record: b.record })),
      })) as { recordIDs?: string[]; records?: Array<{ id: string }> };
      const newIds = result?.recordIDs ?? (result?.records ?? []).map((r: { id: string }) => r.id);
      for (let j = 0; j < newIds.length && j < batch.length; j++) {
        recordMap[batch[j].localId] = newIds[j];
      }
      insertCount += batch.length;
      syncedCount += batch.length;
      const progress = Math.min(100, Math.round((syncedCount / Math.max(1, total)) * 100));
      await this.updateTaskProgress(taskId, progress, 'running');
    }

    const deletedRecords = await this.fetchDeletedLocalRecords(domain);
    const toDelete: string[] = [];
    for (const dr of deletedRecords) {
      const feishuRecord = this.toFeishuRecord(domain, dr.record);
      const uk = this.getUniqueKey(domain, feishuRecord, 'feishu');
      let feishuRecordId: string | undefined = recordMap[dr.id];
      if (!feishuRecordId && uk) {
        feishuRecordId = feishuKeyMap.get(uk);
      }
      if (feishuRecordId) {
        toDelete.push(feishuRecordId);
        delete recordMap[dr.id];
      }
    }
    if (toDelete.length > 0) {
      for (let i = 0; i < toDelete.length; i += BATCH_SIZE) {
        const batch = toDelete.slice(i, i + BATCH_SIZE);
        await this.callFeishu(domain, 'deleteRecords', { recordIDs: batch });
        deleteCount += batch.length;
      }
    }

    await this.saveRecordMap(domain, recordMap);

    await this.db
      .update(syncConfig)
      .set({
        lastSyncedAt: new Date(),
        status: 'configured',
        errorMessage: null,
        updatedAt: new Date(),
      })
      .where(eq(syncConfig.domain, domain));

    await this.db
      .update(syncLog)
      .set({ insertCount, updateCount, skipCount: 0 })
      .where(eq(syncLog.taskId, taskId));
  }

  private async runPullAllWithProgress(taskId: string, domain: string): Promise<void> {
    const config = await this.getConfigByDomain(domain);
    this.ensureConfigured(config);

    const allFeishuRecords: Array<{ id: string; record: FeishuRecord }> = [];
    let pageToken: string | undefined;
    let hasMore = true;

    while (hasMore) {
      const params: Record<string, unknown> = { pageSize: 500 };
      if (pageToken) params['pageToken'] = pageToken;
      const resp = (await this.callFeishu(
        domain,
        'searchRecords',
        params,
      )) as FeishuSearchResponse;
      allFeishuRecords.push(...resp.records);
      hasMore = resp.hasMore;
      pageToken = resp.pageToken;
    }

    const total = allFeishuRecords.length;
    let insertCount = 0;
    let updateCount = 0;
    let skipCount = 0;

    for (let i = 0; i < total; i++) {
      const fr = allFeishuRecords[i];
      const localData = this.fromFeishuRecord(domain, fr.record);
      if (!localData) {
        skipCount++;
        continue;
      }
      const exists = await this.checkLocalRecordExists(domain, localData);
      await this.upsertLocalRecord(domain, fr.id, localData);
      if (exists) {
        updateCount++;
      } else {
        insertCount++;
      }

      // Update progress every batch
      if ((i + 1) % BATCH_SIZE === 0 || i === total - 1) {
        const progress = Math.min(100, Math.round(((i + 1) / Math.max(1, total)) * 100));
        await this.updateTaskProgress(taskId, progress, 'running');
        await this.db
          .update(syncLog)
          .set({ insertCount, updateCount, skipCount })
          .where(eq(syncLog.taskId, taskId));
      }
    }

    const recordMap: Record<string, string> = {};
    for (const fr of allFeishuRecords) {
      const localData = this.fromFeishuRecord(domain, fr.record);
      if (!localData) continue;
      const localId = this.getLocalRecordId(domain, localData);
      if (localId) recordMap[localId] = fr.id;
    }
    const existingExtra = (config.extra as Record<string, unknown>) ?? {};
    await this.db
      .update(syncConfig)
      .set({
        lastSyncedAt: new Date(),
        status: 'configured',
        errorMessage: null,
        extra: {
          ...existingExtra,
          recordMap,
          lastSyncCursor: new Date().toISOString(),
        },
        updatedAt: new Date(),
      })
      .where(eq(syncConfig.domain, domain));
  }

  async getTaskStatus(taskId: string): Promise<SyncTaskStatus> {
    const rows = await this.db
      .select()
      .from(syncLog)
      .where(eq(syncLog.taskId, taskId))
      .limit(1);

    if (rows.length === 0) {
      throw new NotFoundException(`任务不存在: ${taskId}`);
    }
    const r = rows[0];
    return {
      taskId,
      status: r.status,
      progress: r.progress ?? 0,
      insertCount: r.insertCount ?? 0,
      updateCount: r.updateCount ?? 0,
      skipCount: r.skipCount ?? 0,
      errorMessage: r.errorMessage ?? undefined,
      durationMs: r.durationMs ?? undefined,
    };
  }

  // ====== Field Discovery ======

  async listFeishuFields(domain: string): Promise<FeishuFieldInfo[]> {
    this.validateDomain(domain);
    const config = await this.getConfigByDomain(domain);
    this.ensureConfigured(config);

    try {
      const result = await this.callFeishu(domain, 'listFields', {});
      const fieldsResult = result as { fields?: Array<Record<string, unknown>> };
      if (fieldsResult && Array.isArray(fieldsResult.fields)) {
        return fieldsResult.fields.map((f: Record<string, unknown>) => ({
          fieldName: String(f['fieldName'] ?? f['name'] ?? ''),
          fieldType: String(f['fieldType'] ?? f['type'] ?? 'unknown'),
          description: f['description'] ? String(f['description']) : undefined,
        }));
      }
    } catch (err: unknown) {
      this.logger.warn(
        `listFields action not available for ${domain}: ${this.extractErrorMessage(err)}`,
      );
    }

    // Fallback: try getView to extract field info
    try {
      const result = await this.callFeishu(domain, 'getView', { viewID: '' });
      void result;
    } catch {
      // Ignore fallback failures
    }

    return [];
  }

  smartMatchFields(
    domain: string,
    feishuFields: Array<{ fieldName: string }>,
  ): SmartMatchResult[] {
    const localFields = this.getLocalFieldNames(domain);
    const results: SmartMatchResult[] = [];

    for (const ff of feishuFields) {
      const feishuName = ff.fieldName.trim().toLowerCase();
      let bestMatch: string | null = null;
      let bestConfidence: 'high' | 'medium' | 'low' = 'low';

      for (const localName of localFields) {
        const localLower = localName.toLowerCase();

        // Exact match → high
        if (feishuName === localLower) {
          bestMatch = localName;
          bestConfidence = 'high';
          break;
        }

        // Contains → medium
        if (feishuName.includes(localLower) || localLower.includes(feishuName)) {
          if (bestConfidence === 'low') {
            bestMatch = localName;
            bestConfidence = 'medium';
          }
        }
      }

      // Try Chinese-to-English mapping for better matches
      if (!bestMatch || bestConfidence === 'low') {
        const mappedEnglish = this.mapChineseFieldName(ff.fieldName).toLowerCase();
        for (const localName of localFields) {
          const localLower = localName.toLowerCase();
          if (mappedEnglish === localLower) {
            bestMatch = localName;
            bestConfidence = 'high';
            break;
          }
          if (
            mappedEnglish.includes(localLower) ||
            localLower.includes(mappedEnglish)
          ) {
            if (bestConfidence === 'low') {
              bestMatch = localName;
              bestConfidence = 'medium';
            }
          }
        }
      }

      if (bestMatch) {
        results.push({
          localField: bestMatch,
          feishuField: ff.fieldName,
          confidence: bestConfidence,
        });
      }
    }

    return results;
  }

  private getLocalFieldNames(domain: string): string[] {
    const fieldMap: Record<string, string[]> = {
      products: [
        'code', 'name', 'category', 'brand', 'spec', 'unit',
        'safetyStock', 'unitPrice', 'status',
      ],
      transactions: [
        'orderNo', 'type', 'subType', 'productName', 'warehouse',
        'quantity', 'totalAmount', 'operator', 'transactionDate',
      ],
      transfers: [
        'transferNo', 'productName', 'sourceWarehouse', 'targetWarehouse',
        'quantity', 'transferDate',
      ],
      inventory_checks: ['checkNo', 'createdBy', 'warehouse', 'status', 'checkDate', 'productCount', 'differenceCount', 'remark'],
      warehouse_inventory: ['productName', 'productCode', 'warehouse', 'quantity', 'safetyStock', 'status', 'updatedAt'],
    };
    return fieldMap[domain] ?? [];
  }

  private mapChineseFieldName(chineseName: string): string {
    const mapping: Record<string, string> = {
      '商品编码': 'code',
      '商品名称': 'productName',
      '商品名': 'productName',
      'SKU': 'productCode',
      '品类': 'category',
      '品牌': 'brand',
      '规格': 'spec',
      '单位': 'unit',
      '安全库存': 'safetyStock',
      '参考单价': 'unitPrice',
      '当前库存': 'quantity',
      '库存状态': 'status',
      '最后更新时间': 'updatedAt',
      '仓库': 'warehouse',
      '类型': 'type',
      '类型细分': 'subType',
      '数量': 'quantity',
      '金额': 'totalAmount',
      '出入库单号': 'orderNo',
      '操作人': 'operator',
      '操作时间': 'transactionDate',
      '调拨单号': 'transferNo',
      '源仓库': 'sourceWarehouse',
      '目标仓库': 'targetWarehouse',
      '调拨时间': 'transferDate',
      '盘点单号': 'checkNo',
      '盘点人': 'createdBy',
      '盘点时间': 'checkDate',
      '商品数': 'productCount',
      '差异数': 'differenceCount',
      '备注': 'remark',
    };
    return mapping[chineseName] ?? chineseName;
  }

  // ====== Notifications ======

  private async notifySyncFailure(
    domain: string,
    errorMsg: string,
    retryCount: number,
  ): Promise<void> {
    try {
      const content = `业务域: ${domain}\n错误信息: ${errorMsg}\n重试次数: ${retryCount}/${MAX_RETRY_COUNT}`;
      await this.db.insert(notifications).values({
        type: 'system',
        title: '同步失败告警',
        content,
        recipient: CURRENT_USER,
      });
    } catch (err: unknown) {
      this.logger.warn(
        `Failed to send sync failure notification: ${this.extractErrorMessage(err)}`,
      );
    }
  }

  private async notifySyncRecovery(domain: string, retryCount: number): Promise<void> {
    try {
      const content = `业务域: ${domain}\n同步已自动恢复\n重试次数: ${retryCount}/${MAX_RETRY_COUNT}`;
      await this.db.insert(notifications).values({
        type: 'system',
        title: '同步恢复通知',
        content,
        recipient: CURRENT_USER,
      });
    } catch (err: unknown) {
      this.logger.warn(
        `Failed to send sync recovery notification: ${this.extractErrorMessage(err)}`,
      );
    }
  }

  // ====== Deduplication ======

  async cleanupInvalidRecordMap(domain: string): Promise<{ cleaned: number; remaining: number }> {
    this.validateDomain(domain);
    const config = await this.getConfigByDomain(domain);
    this.ensureConfigured(config);

    const oldRecordMap = this.getRecordMap(config);
    const feishuRecords = await this.fetchAllFeishuRecords(domain);
    const validIds = new Set(feishuRecords.map((r: { id: string }) => r.id));

    const newRecordMap: Record<string, string> = {};
    let cleaned = 0;
    for (const [localId, feishuId] of Object.entries(oldRecordMap)) {
      if (validIds.has(feishuId)) {
        newRecordMap[localId] = feishuId;
      } else {
        cleaned += 1;
      }
    }

    await this.saveRecordMap(domain, newRecordMap);
    return { cleaned, remaining: Object.keys(newRecordMap).length };
  }

  async cleanupDuplicates(domain: string): Promise<{ deletedCount: number; remainingCount: number }> {
    this.validateDomain(domain);
    const config = await this.getConfigByDomain(domain);
    this.ensureConfigured(config);

    const allRecords = await this.fetchAllFeishuRecords(domain);
    const groups = new Map<string, string[]>();

    for (const fr of allRecords) {
      const uk = this.getUniqueKey(domain, fr.record, 'feishu');
      if (!uk) continue;
      const list = groups.get(uk) ?? [];
      list.push(fr.id);
      groups.set(uk, list);
    }

    const toDelete: string[] = [];
    for (const [, ids] of groups) {
      if (ids.length > 1) {
        toDelete.push(...ids.slice(0, -1));
      }
    }

    const mainField = this.UNIQUE_KEY_MAP[domain as SyncDomain]?.feishuKey;
    if (mainField && !mainField.includes('+')) {
      for (const fr of allRecords) {
        const val = (fr.record as Record<string, unknown>)[mainField];
        if (val === undefined || val === null || val === '') {
          toDelete.push(fr.id);
        }
      }
    }

    if (toDelete.length > 0) {
      for (let i = 0; i < toDelete.length; i += BATCH_SIZE) {
        const batch = toDelete.slice(i, i + BATCH_SIZE);
        await this.callFeishu(domain, 'deleteRecords', { recordIDs: batch });
      }
    }

    const remainingCount = allRecords.length - toDelete.length;
    return { deletedCount: toDelete.length, remainingCount };
  }

  async clearFeishuRecords(domain: string): Promise<{ deletedCount: number }> {
    this.validateDomain(domain);
    const config = await this.getConfigByDomain(domain);
    this.ensureConfigured(config);

    const allRecords = await this.fetchAllFeishuRecords(domain);
    const ids = allRecords.map((r: { id: string }) => r.id);

    for (let i = 0; i < ids.length; i += BATCH_SIZE) {
      const batch = ids.slice(i, i + BATCH_SIZE);
      await this.callFeishu(domain, 'deleteRecords', { recordIDs: batch });
    }

    return { deletedCount: ids.length };
  }

  async clearFeishuRecordsAsync(domain: string): Promise<string> {
    this.validateDomain(domain);
    const config = await this.getConfigByDomain(domain);
    this.ensureConfigured(config);

    const taskId = randomUUID();
    const startTime = Date.now();

    this.logSync({
      domain,
      direction: 'push',
      action: 'clear_feishu',
      status: 'pending',
      taskId,
    }).catch(() => {});

    setImmediate(async () => {
      try {
        const { deletedCount } = await this.clearFeishuRecords(domain);
        await this.db
          .update(syncLog)
          .set({
            status: 'success',
            durationMs: Date.now() - startTime,
            insertCount: deletedCount,
          })
          .where(eq(syncLog.taskId, taskId));
      } catch (err: unknown) {
        await this.db
          .update(syncLog)
          .set({
            status: 'error',
            errorMessage: this.extractErrorMessage(err),
            durationMs: Date.now() - startTime,
          })
          .where(eq(syncLog.taskId, taskId));
      }
    });

    return taskId;
  }

  // ====== Sync Statistics ======

  async getSyncStats(): Promise<SyncStatsType> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const results = await this.db
      .select({
        domain: syncLog.domain,
        status: syncLog.status,
        count: count(),
        lastSync: sql<Date>`MAX(${syncLog.createdAt})`,
      })
      .from(syncLog)
      .where(gte(syncLog.createdAt, sevenDaysAgo))
      .groupBy(syncLog.domain, syncLog.status);

    const stats: SyncStatsType = {};

    for (const domain of VALID_DOMAINS) {
      stats[domain] = {
        lastSyncedAt: null,
        successCount: 0,
        failCount: 0,
        status: 'idle',
      };
    }

    for (const row of results) {
      const domainKey = row.domain;
      if (!stats[domainKey]) continue;
      const cnt = Number(row.count ?? 0);
      if (row.status === 'success' || row.status === 'completed') {
        stats[domainKey].successCount += cnt;
      } else if (row.status === 'error' || row.status === 'failed') {
        stats[domainKey].failCount += cnt;
      }
      const lastSyncVal = row.lastSync;
      if (lastSyncVal) {
        const current = stats[domainKey].lastSyncedAt;
        const lastIso = lastSyncVal instanceof Date
          ? lastSyncVal.toISOString()
          : String(lastSyncVal);
        if (!current || lastIso > current) {
          stats[domainKey].lastSyncedAt = lastIso;
        }
      }
    }

    // Derive status from config
    const configs = await this.db.select().from(syncConfig);
    for (const cfg of configs) {
      if (!stats[cfg.domain]) continue;
      if (cfg.status === 'error') {
        stats[cfg.domain].status = 'error';
      } else if (cfg.enabled && cfg.status === 'configured') {
        stats[cfg.domain].status = 'normal';
      } else if (cfg.status === 'unconfigured') {
        stats[cfg.domain].status = 'unconfigured';
      } else {
        stats[cfg.domain].status = cfg.status;
      }
    }

    return stats;
  }

  // ====== Utility ======

  private generateUuid(): string {
    if (typeof globalThis.crypto !== 'undefined'
        && 'randomUUID' in globalThis.crypto) {
      return globalThis.crypto.randomUUID();
    }
    return randomUUID();
  }
}
