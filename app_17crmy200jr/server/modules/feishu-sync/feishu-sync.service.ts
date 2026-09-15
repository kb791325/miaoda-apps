import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  CapabilityService,
  DRIZZLE_DATABASE,
} from '@lark-apaas/fullstack-nestjs-core';
import type { PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { sql, type SQL } from 'drizzle-orm';
import {
  safeParseTimestamptz,
  safeParseUserProfile,
} from '@server/common/utils/safe-custom-type';

import {
  BATCH_WRITE_LIMIT,
  DOMAIN_BASE_TOKEN_MAP,
  DOMAIN_DEFAULT_UNIQUE_KEY,
  DOMAIN_FIELDS_MAP,
  DOMAIN_FIELD_NAME_MAP,
  DOMAIN_TABLE_ID_MAP,
  DOMAIN_PLUGIN_ID_MAP,
  PULL_PAGE_SIZE,
  SYNC_DOMAINS,
  type SyncDirection,
  type SyncDomain,
  type SyncStatus,
} from './feishu-sync.constants';
import type {
  FeishuSyncConfig,
  FeishuSyncLog,
  FieldMapping,
  SyncLogQuery,
  SyncResult,
  UpdateSyncConfigDto,
} from './feishu-sync.types';
import {
  extractFeishuFieldNames,
  feishuRecordToLocal,
  localRecordToFeishu,
  validateFieldMapping,
} from './feishu-sync.field-mapper';

/**
 * 飞书多维表格同步服务
 *
 * 注意：feishu_sync_configs / feishu_sync_logs 以及各业务域表
 * 暂时通过 raw SQL 操作。建表任务完成、schema.ts 自动生成后，
 * 应替换为 Drizzle ORM 原生 helper。
 */
@Injectable()
export class FeishuSyncService {
  private readonly logger = new Logger(FeishuSyncService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    private readonly capabilityService: CapabilityService,
  ) {}

  /** 本地表名映射（大部分与 domain 一致，data 域单独映射） */
  private getLocalTableName(domain: SyncDomain): string {
    if (domain === 'data') return 'data_records';
    return domain;
  }

  /**
   * 用完整字段配置加载飞书多维表格插件
   *
   * 背景：插件实例 JSON 中 fields 为空数组时，filterReadableFields 会把
   * record 过滤成空对象。通过 loadWithConfig 注入完整字段定义可绕过此问题。
   */
  private loadPluginWithFields(domain: SyncDomain) {
    const pluginId = DOMAIN_PLUGIN_ID_MAP[domain];
    const baseConfig = this.capabilityService.getCapability(pluginId);
    const fields = DOMAIN_FIELDS_MAP[domain] ?? [];

    const config = {
      ...baseConfig,
      formValue: {
        ...(baseConfig?.formValue ?? {}),
        fields,
      },
    };

    return this.capabilityService.loadWithConfig(config);
  }

  // ============================================================
  // 调试辅助
  // ============================================================

  /** 探测飞书多维表格实际字段名（用 aggregateQuery 返回维度字段） */
  async probeFeishuFields(
    domain: SyncDomain,
  ): Promise<{ fields: string[]; sample: Record<string, unknown>; allFields?: string[] }> {
    const config = await this.ensureConfig(domain);
    const plugin = this.loadPluginWithFields(domain);

    let fieldNames: string[] = [];
    let sample: Record<string, unknown> = {};
    let allFields: string[] = [];

    // 用 aggregateQuery 获取表的全部维度字段（dimension 列表）
    try {
      const agg = (await plugin.call('aggregateQuery', {
        baseToken: config.baseToken,
        tableId: config.tableId,
        dimensions: [{ fieldName: '差异数量' }],
        measures: [{ fieldName: '', aggregation: 'count', alias: 'cnt' }],
        pageSize: 1,
      })) as unknown as { fieldList?: Array<{ fieldName: string; bizType: string }>; result: unknown };
      allFields = (agg.fieldList ?? []).map((f) => f.fieldName).sort();
      sample = { fieldList: agg.fieldList };
    } catch (aggErr) {
      sample = { aggregateError: String(aggErr) };
    }

    // 用 searchRecords 空 fieldNames 拉一条记录看实际字段键名（可能因 filterReadableFields 被过滤掉不可写字段）
    try {
      const response = (await plugin.call('searchRecords', {
        baseToken: config.baseToken,
        tableId: config.tableId,
        pageSize: 1,
      })) as {
        records: Array<{ id: string; record: Record<string, unknown> }>;
        hasMore: boolean;
        total?: number;
      };
      const first = response.records[0]?.record ?? {};
      fieldNames = Object.keys(first).sort();
      if (fieldNames.length > 0) sample.record = first;
    } catch (_e) {
      this.logger.warn('飞书多维表格 searchRecords 字段探检失败，可能因类型校验', _e);
    }

    return { fields: fieldNames, sample, allFields };
  }

  // ============================================================
  // 配置管理
  // ============================================================

  /** 获取所有同步配置 */
  async getAllConfigs(): Promise<FeishuSyncConfig[]> {
    const rows = await this.db.execute(sql`
      SELECT
        id,
        domain,
        base_token AS "baseToken",
        table_id AS "tableId",
        sync_direction AS "syncDirection",
        field_mapping AS "fieldMapping",
        unique_key AS "uniqueKey",
        is_enabled AS "isEnabled",
        last_sync_time AS "lastSyncTime",
        last_sync_status AS "lastSyncStatus",
        _created_at AS "createdAt",
        _updated_at AS "updatedAt"
      FROM feishu_sync_configs
      ORDER BY domain ASC
    `);
    return (rows as unknown as FeishuSyncConfig[]).map(
      (item) => ({
        ...item,
        lastSyncTime: safeParseTimestamptz(item.lastSyncTime),
        createdAt: safeParseTimestamptz(item.createdAt),
        updatedAt: safeParseTimestamptz(item.updatedAt),
      }),
    );
  }

  /** 按 domain 获取配置，找不到时返回 null */
  async getConfigByDomain(domain: SyncDomain): Promise<FeishuSyncConfig | null> {
    const rows = await this.db.execute(sql`
      SELECT
        id,
        domain,
        base_token AS "baseToken",
        table_id AS "tableId",
        sync_direction AS "syncDirection",
        field_mapping AS "fieldMapping",
        unique_key AS "uniqueKey",
        is_enabled AS "isEnabled",
        last_sync_time AS "lastSyncTime",
        last_sync_status AS "lastSyncStatus",
        _created_at AS "createdAt",
        _updated_at AS "updatedAt"
      FROM feishu_sync_configs
      WHERE domain = ${domain}
      LIMIT 1
    `);
    const arr = rows as unknown as FeishuSyncConfig[];
    if (arr.length === 0) return null;
    const item = arr[0];
    return {
      ...item,
      lastSyncTime: safeParseTimestamptz(item.lastSyncTime),
      createdAt: safeParseTimestamptz(item.createdAt),
      updatedAt: safeParseTimestamptz(item.updatedAt),
    };
  }

  /** 确保配置存在；不存在则基于默认常量初始化一条（原子 upsert） */
  async ensureConfig(domain: SyncDomain): Promise<FeishuSyncConfig> {
    const baseToken = DOMAIN_BASE_TOKEN_MAP[domain];
    const tableId = DOMAIN_TABLE_ID_MAP[domain];

    // 使用 ON CONFLICT 保证原子性：并发调用不会导致重复插入或失败
    // DO UPDATE 是为了让 RETURNING 同时覆盖「新插入」和「已存在」两种情况
    const rows = await this.db.execute(sql`
      INSERT INTO feishu_sync_configs
        (domain, base_token, table_id, sync_direction, field_mapping, unique_key, is_enabled)
      VALUES
        (${domain}, ${baseToken}, ${tableId}, 'bidirectional', '[]'::jsonb, 'id', false)
      ON CONFLICT (domain) DO UPDATE SET
        domain = EXCLUDED.domain
      RETURNING
        id,
        domain,
        base_token AS "baseToken",
        table_id AS "tableId",
        sync_direction AS "syncDirection",
        field_mapping AS "fieldMapping",
        unique_key AS "uniqueKey",
        is_enabled AS "isEnabled",
        last_sync_time AS "lastSyncTime",
        last_sync_status AS "lastSyncStatus",
        _created_at AS "createdAt",
        _updated_at AS "updatedAt"
    `);
    const arr = rows as unknown as FeishuSyncConfig[];
    if (arr.length === 0) {
      // 理论上不会发生（ON CONFLICT DO UPDATE + RETURNING 必有返回）
      throw new NotFoundException(`feishu_sync_configs upsert 无返回: domain=${domain}`);
    }
    const item = arr[0];
    const config: FeishuSyncConfig = {
      ...item,
      lastSyncTime: safeParseTimestamptz(item.lastSyncTime),
      createdAt: safeParseTimestamptz(item.createdAt),
      updatedAt: safeParseTimestamptz(item.updatedAt),
    };

    if (!config.fieldMapping || config.fieldMapping.length === 0) {
      this.logger.log(
        `[feishu-sync] fieldMapping empty for domain=${domain}, rebuilding default mapping`,
      );
      const rebuilt = await this.rebuildDefaultFieldMapping(domain, config);
      this.logger.log(
        `[feishu-sync] rebuilt fieldMapping for domain=${domain}: ${JSON.stringify(
          rebuilt.fieldMapping,
        ).slice(0, 300)}`,
      );
      return rebuilt;
    }
    return config;
  }

  /**
   * 当配置中 field_mapping 为空时，基于内置的字段映射表重建默认映射并写回数据库
   */
  private async rebuildDefaultFieldMapping(
    domain: SyncDomain,
    config: FeishuSyncConfig,
  ): Promise<FeishuSyncConfig> {
    const fieldNameMap = DOMAIN_FIELD_NAME_MAP[domain] ?? {};
    const fields = DOMAIN_FIELDS_MAP[domain] ?? [];
    const fieldMapping: FieldMapping[] = fields
      .filter((f) => f.readable)
      .map((f) => ({
        feishuField: f.name,
        localField: fieldNameMap[f.name] ?? f.id.replace(/^fld_/, ''),
        bizType: f.bizType,
        skipOnPush: !f.writeable,
      }));

    const uniqueKey = DOMAIN_DEFAULT_UNIQUE_KEY[domain] ?? 'feishu_record_id';

    const rows = await this.db.execute(sql`
      UPDATE feishu_sync_configs
      SET
        field_mapping = ${JSON.stringify(fieldMapping)}::jsonb,
        unique_key = ${uniqueKey},
        is_enabled = true
      WHERE id = ${config.id}
      RETURNING
        id,
        domain,
        base_token AS "baseToken",
        table_id AS "tableId",
        sync_direction AS "syncDirection",
        field_mapping AS "fieldMapping",
        unique_key AS "uniqueKey",
        is_enabled AS "isEnabled",
        last_sync_time AS "lastSyncTime",
        last_sync_status AS "lastSyncStatus",
        _created_at AS "createdAt",
        _updated_at AS "updatedAt"
    `);
    const arr = rows as unknown as FeishuSyncConfig[];
    const item = arr[0];
    return {
      ...item,
      lastSyncTime: safeParseTimestamptz(item.lastSyncTime),
      createdAt: safeParseTimestamptz(item.createdAt),
      updatedAt: safeParseTimestamptz(item.updatedAt),
    };
  }

  /** 更新同步配置 */
  async updateConfig(
    domain: SyncDomain,
    dto: UpdateSyncConfigDto,
  ): Promise<FeishuSyncConfig> {
    const config = await this.ensureConfig(domain);

    const sets: SQL[] = [];
    if (dto.baseToken !== undefined) {
      sets.push(sql`base_token = ${dto.baseToken}`);
    }
    if (dto.tableId !== undefined) {
      sets.push(sql`table_id = ${dto.tableId}`);
    }
    if (dto.syncDirection !== undefined) {
      sets.push(sql`sync_direction = ${dto.syncDirection}`);
    }
    if (dto.fieldMapping !== undefined) {
      sets.push(
        sql`field_mapping = ${JSON.stringify(dto.fieldMapping)}::jsonb`,
      );
    }
    if (dto.uniqueKey !== undefined) {
      sets.push(sql`unique_key = ${dto.uniqueKey}`);
    }
    if (dto.isEnabled !== undefined) {
      sets.push(sql`is_enabled = ${dto.isEnabled}`);
    }

    if (sets.length === 0) {
      return config;
    }

    sets.push(sql`_updated_at = now()`);

    const setClause = sql.join(sets, sql`, `);

    const rows = await this.db.execute(sql`
      UPDATE feishu_sync_configs
      SET ${setClause}
      WHERE id = ${config.id}
      RETURNING
        id,
        domain,
        base_token AS "baseToken",
        table_id AS "tableId",
        sync_direction AS "syncDirection",
        field_mapping AS "fieldMapping",
        unique_key AS "uniqueKey",
        is_enabled AS "isEnabled",
        last_sync_time AS "lastSyncTime",
        last_sync_status AS "lastSyncStatus",
        _created_at AS "createdAt",
        _updated_at AS "updatedAt"
    `);
    const arr = rows as unknown as FeishuSyncConfig[];
    if (arr.length === 0) {
      throw new NotFoundException('同步配置不存在');
    }
    const item = arr[0];
    return {
      ...item,
      lastSyncTime: safeParseTimestamptz(item.lastSyncTime),
      createdAt: safeParseTimestamptz(item.createdAt),
      updatedAt: safeParseTimestamptz(item.updatedAt),
    };
  }

  // ============================================================
  // 同步日志
  // ============================================================

  /** 创建同步日志记录，返回日志 ID */
  async createLog(params: {
    domain: SyncDomain;
    direction: SyncDirection;
    status: SyncStatus;
    syncType: string;
    recordCount?: number;
    errorMessage?: string;
    syncStartedAt: string;
    syncFinishedAt?: string;
  }): Promise<string> {
    const rows = await this.db.execute<{ id: string }>(sql`
      INSERT INTO feishu_sync_logs
        (domain, sync_type, direction, status, record_count,
         error_message, sync_started_at, sync_finished_at)
      VALUES
        (${params.domain}, ${params.syncType}, ${params.direction}, ${params.status},
         ${params.recordCount ?? 0},
         ${params.errorMessage ?? null},
         ${params.syncStartedAt}::timestamptz,
         ${params.syncFinishedAt
           ? sql`${params.syncFinishedAt}::timestamptz`
           : sql`NULL`})
      RETURNING id
    `);
    const arr = rows as unknown as { id: string }[];
    return arr[0].id;
  }

  /** 更新同步日志（完成时调用） */
  async updateLog(
    logId: string,
    params: {
      status: SyncStatus;
      recordCount?: number;
      errorMessage?: string;
      syncFinishedAt?: string;
    },
  ): Promise<void> {
    const sets: SQL[] = [sql`status = ${params.status}`];
    if (params.recordCount !== undefined) {
      sets.push(sql`record_count = ${params.recordCount}`);
    }
    if (params.errorMessage !== undefined) {
      sets.push(sql`error_message = ${params.errorMessage}`);
    }
    if (params.syncFinishedAt !== undefined) {
      sets.push(
        sql`sync_finished_at = ${params.syncFinishedAt}::timestamptz`,
      );
    }

    const setClause = sql.join(sets, sql`, `);

    await this.db.execute(sql`
      UPDATE feishu_sync_logs
      SET ${setClause}
      WHERE id = ${logId}
    `);
  }

  /** 查询同步日志（分页） */
  async getLogs(query: SyncLogQuery): Promise<{
    items: FeishuSyncLog[];
    total: number;
  }> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const offset = (page - 1) * pageSize;

    const whereClauses: SQL[] = [];
    if (query.domain) {
      whereClauses.push(sql`domain = ${query.domain}`);
    }
    if (query.direction) {
      whereClauses.push(sql`direction = ${query.direction}`);
    }
    if (query.status) {
      whereClauses.push(sql`status = ${query.status}`);
    }

    const whereSql =
      whereClauses.length > 0
        ? sql`WHERE ${sql.join(whereClauses, sql` AND `)}`
        : sql``;

    const countRows = await this.db.execute<{ count: string }>(sql`
      SELECT COUNT(*)::text AS count
      FROM feishu_sync_logs
      ${whereSql}
    `);
    const total = Number(
      (countRows as unknown as { count: string }[])[0].count,
    );

    const rows = await this.db.execute(sql`
      SELECT
        id,
        domain,
        sync_type AS "syncType",
        direction,
        status,
        record_count AS "recordCount",
        error_message AS "errorMessage",
        sync_started_at AS "syncStartedAt",
        sync_finished_at AS "syncFinishedAt",
        _created_at AS "createdAt"
      FROM feishu_sync_logs
      ${whereSql}
      ORDER BY _created_at DESC
      LIMIT ${pageSize}
      OFFSET ${offset}
    `);

    return {
      items: (rows as unknown as FeishuSyncLog[]).map((item) => ({
        ...item,
        syncStartedAt: safeParseTimestamptz(item.syncStartedAt),
        syncFinishedAt: safeParseTimestamptz(item.syncFinishedAt),
        createdAt: safeParseTimestamptz(item.createdAt),
      })),
      total,
    };
  }

  // ============================================================
  // 核心同步逻辑
  // ============================================================

  /**
   * 从飞书多维表格拉取数据到本地数据库（upsert）
   */
  async pull(domain: SyncDomain, operatorId?: string): Promise<SyncResult> {
    const startTime = new Date();
    let logId: string | undefined;
    const result: SyncResult = {
      domain,
      direction: 'pull',
      status: 'success',
      recordCount: 0,
      durationMs: 0,
    };

    try {
      const config = await this.ensureConfig(domain);
      if (!config.isEnabled) {
        throw new BadRequestException(`业务域 ${domain} 同步未启用`);
      }

      const fieldMapping = config.fieldMapping as FieldMapping[];
      validateFieldMapping(fieldMapping, config.uniqueKey);

      const startTimeIso = startTime.toISOString();
      logId = await this.createLog({
        domain,
        direction: 'pull',
        status: 'syncing',
        syncType: 'full',
        syncStartedAt: startTimeIso,
      });

      // 1. 分页拉取全部飞书记录
      const allFeishuRecords = await this.fetchAllFeishuRecords(
        domain,
        config.baseToken,
        config.tableId,
        fieldMapping,
      );
      result.recordCount = allFeishuRecords.length;

      if (allFeishuRecords.length === 0) {
        // 无数据，直接成功
        await this.finalizeLogAndConfig(config.id, logId, result, startTime);
        return result;
      }

      // 2. 转换为本地字段
      const localRecords = allFeishuRecords
        .map((item) => {
          const local = feishuRecordToLocal(item.record, fieldMapping);
          return { feishuId: item.id, local };
        })
        .filter((rec) => {
          const writableFields = fieldMapping.filter((m) => !m.skipOnPush);
          const hasBusinessValue = writableFields.some((m) => {
            const v = rec.local[m.localField];
            return v !== null && v !== undefined && v !== '' && v !== 0;
          });
          return hasBusinessValue;
        });

      const skippedEmpty = allFeishuRecords.length - localRecords.length;
      if (skippedEmpty > 0) {
        this.logger.log(
          `[feishu-sync] skipped ${skippedEmpty} empty records (all writable fields empty) for domain=${domain}`,
        );
      }

      // 2.5 填充衍生字段与默认值
      if (domain === 'expenses') {
        const hasDepartment = fieldMapping.some((m) => m.localField === 'department');
        for (const rec of localRecords) {
          const dateVal = rec.local['expense_date'] ?? rec.local['expenseDate'];
          if (dateVal && typeof dateVal === 'string') {
            const dateStr = dateVal.slice(0, 10);
            rec.local['expense_date'] = dateStr;
            const d = new Date(dateStr);
            if (!isNaN(d.getTime())) {
              const y = d.getFullYear();
              const m = d.getMonth() + 1;
              const q = Math.ceil(m / 3);
              rec.local['year'] = y;
              rec.local['month'] = m;
              rec.local['quarter'] = q;
            }
          }
          if (!rec.local['department'] && !hasDepartment) {
            rec.local['department'] = '未分配';
          }
        }
        const extraMappings: FieldMapping[] = [
          { localField: 'year', feishuField: '', bizType: 'Number' },
          { localField: 'month', feishuField: '', bizType: 'Number' },
          { localField: 'quarter', feishuField: '', bizType: 'Number' },
        ];
        if (!hasDepartment) {
          extraMappings.push({ localField: 'department', feishuField: '', bizType: 'Text' });
        }
        fieldMapping.push(...extraMappings);
      }

      if (domain === 'fixed_assets') {
        const hasCurrentStock = fieldMapping.some((m) => m.localField === 'current_stock');
        const hasAssetStatus = fieldMapping.some((m) => m.localField === 'asset_status');
        const hasAssetType = fieldMapping.some((m) => m.localField === 'asset_type');
        for (const rec of localRecords) {
          const purchaseAmount = Number(rec.local['purchase_amount'] ?? rec.local['purchaseAmount'] ?? 0);
          const months = 36;
          const monthlyDep = purchaseAmount > 0 ? purchaseAmount / months : 0;
          let accumulatedDep = 0;
          const dateVal = rec.local['purchase_date'] ?? rec.local['purchaseDate'];
          if (dateVal && typeof dateVal === 'string') {
            rec.local['purchase_date'] = dateVal.slice(0, 10);
          }
          if (dateVal && typeof dateVal === 'string' && purchaseAmount > 0) {
            const purchaseDate = new Date(dateVal);
            const now = new Date();
            if (!isNaN(purchaseDate.getTime())) {
              const diffMonths = Math.max(0,
                (now.getFullYear() - purchaseDate.getFullYear()) * 12
                + (now.getMonth() - purchaseDate.getMonth())
              );
              const elapsed = Math.min(diffMonths, months);
              accumulatedDep = Math.round(monthlyDep * elapsed * 100) / 100;
            }
          }
          rec.local['original_value'] = purchaseAmount;
          rec.local['monthly_depreciation'] = Math.round(monthlyDep * 100) / 100;
          rec.local['accumulated_depreciation'] = accumulatedDep;
          rec.local['depreciation_months'] = months;
          if (!hasCurrentStock && (rec.local['current_stock'] === null || rec.local['current_stock'] === undefined)) {
            rec.local['current_stock'] = 1;
          }
          if (!hasAssetStatus && !rec.local['asset_status']) {
            rec.local['asset_status'] = 'in_stock';
          }
          if (!hasAssetType && !rec.local['asset_type']) {
            rec.local['asset_type'] = 'other';
          }
        }
        const extraMappings: FieldMapping[] = [
          { localField: 'original_value', feishuField: '', bizType: 'Currency' },
          { localField: 'monthly_depreciation', feishuField: '', bizType: 'Currency' },
          { localField: 'accumulated_depreciation', feishuField: '', bizType: 'Currency' },
          { localField: 'depreciation_months', feishuField: '', bizType: 'Number' },
        ];
        if (!hasCurrentStock) extraMappings.push({ localField: 'current_stock', feishuField: '', bizType: 'Number' });
        if (!hasAssetStatus) extraMappings.push({ localField: 'asset_status', feishuField: '', bizType: 'Text' });
        if (!hasAssetType) extraMappings.push({ localField: 'asset_type', feishuField: '', bizType: 'Text' });
        fieldMapping.push(...extraMappings);
      }

      // 3. 批量 upsert 到本地表
      await this.upsertLocalBatch(
        this.getLocalTableName(domain),
        localRecords,
        fieldMapping,
        config.uniqueKey,
      );

      await this.finalizeLogAndConfig(config.id, logId, result, startTime);
      return result;
    } catch (error) {
      result.status = 'failed';
      let detail = '';
      if (error && typeof error === 'object') {
        const err = error as Record<string, unknown>;
        if (err.code) detail += ` code=${err.code}`;
        if (err.message) detail += ` msg=${String(err.message).slice(0, 200)}`;
        const cause = err.cause as Record<string, unknown> | undefined;
        if (cause?.code) detail += ` cause_code=${cause.code}`;
      }
      result.errorMessage =
        (error instanceof Error ? error.message : String(error)) + detail;

      this.logger.error(
        `[feishu-sync] pull failed for domain=${domain}: ${result.errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );

      if (logId) {
        await this.updateLog(logId, {
          status: 'failed',
          recordCount: result.recordCount,
          errorMessage: result.errorMessage,
          syncFinishedAt: new Date().toISOString(),
        });
      }

      return result;
    }
  }

  /**
   * 将本地数据库数据推送到飞书多维表格（upsert）
   */
  async push(domain: SyncDomain, operatorId?: string): Promise<SyncResult> {
    const startTime = new Date();
    let logId: string | undefined;
    const result: SyncResult = {
      domain,
      direction: 'push',
      status: 'success',
      recordCount: 0,
      durationMs: 0,
    };

    try {
      const config = await this.ensureConfig(domain);
      if (!config.isEnabled) {
        throw new BadRequestException(`业务域 ${domain} 同步未启用`);
      }

      const fieldMapping = config.fieldMapping as FieldMapping[];
      validateFieldMapping(fieldMapping, config.uniqueKey);

      const feishuIdField = 'feishu_record_id';

      const startTimeIso = startTime.toISOString();
      logId = await this.createLog({
        domain,
        direction: 'push',
        status: 'syncing',
        syncType: 'full',
        syncStartedAt: startTimeIso,
      });

      // 1. 查询本地全部记录
      const localRecords = await this.fetchAllLocalRecords(
        this.getLocalTableName(domain),
        fieldMapping,
        feishuIdField,
      );
      result.recordCount = localRecords.length;

      if (localRecords.length === 0) {
        await this.finalizeLogAndConfig(config.id, logId, result, startTime);
        return result;
      }

      // 2. 按是否有 feishu_record_id 分为「新增」和「更新」两组
      const toAdd: Array<Record<string, unknown>> = [];
      const toUpdate: Array<{ id: string; record: Record<string, unknown> }> =
        [];

      for (const rec of localRecords) {
        const fid = rec[feishuIdField] as string | undefined;
        const feishuRecord = localRecordToFeishu(rec, fieldMapping);
        if (fid) {
          toUpdate.push({ id: fid, record: feishuRecord });
        } else {
          toAdd.push(feishuRecord);
        }
      }

      // 3. 批量新增到飞书
      if (toAdd.length > 0) {
        const addedIds = await this.batchAddFeishuRecords(
          domain,
          config.baseToken,
          config.tableId,
          toAdd,
        );

        // 把飞书生成的 record_id 回写到本地
        await this.backfillFeishuRecordIds(
          this.getLocalTableName(domain),
          fieldMapping,
          config.uniqueKey,
          feishuIdField,
          toAdd,
          addedIds,
        );
      }

      // 4. 批量更新飞书记录
      if (toUpdate.length > 0) {
        await this.batchUpdateFeishuRecords(
          domain,
          config.baseToken,
          config.tableId,
          toUpdate,
        );
      }

      await this.finalizeLogAndConfig(config.id, logId, result, startTime);
      return result;
    } catch (error) {
      result.status = 'failed';
      result.errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error(
        `[feishu-sync] push failed for domain=${domain}: ${result.errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );

      if (logId) {
        await this.updateLog(logId, {
          status: 'failed',
          recordCount: result.recordCount,
          errorMessage: result.errorMessage,
          syncFinishedAt: new Date().toISOString(),
        });
      }

      return result;
    }
  }

  /**
   * 删除飞书多维表格中的记录（按 feishu_record_id）
   */
  async pushDelete(domain: SyncDomain, feishuRecordId: string): Promise<void> {
    this.logger.log(
      `[feishu-sync] pushDelete called: domain=${domain}, feishuRecordId=${feishuRecordId}`,
    );
    const config = await this.ensureConfig(domain);
    this.logger.log(
      `[feishu-sync] pushDelete config: baseToken=${config.baseToken}, tableId=${config.tableId}`,
    );
    if (!feishuRecordId) {
      this.logger.warn(`[feishu-sync] pushDelete skipped: empty feishuRecordId`);
      return;
    }
    const deleted = await this.batchDeleteFeishuRecords(
      domain,
      config.baseToken,
      config.tableId,
      [feishuRecordId],
    );
    this.logger.log(
      `[feishu-sync] pushDelete result: domain=${domain}, deleted=${deleted}`,
    );
  }

  /**
   * 单条记录推送到飞书（供 record_change 触发器调用）
   */
  async pushSingle(
    domain: SyncDomain,
    record: Record<string, unknown>,
    isUpdate: boolean,
  ): Promise<void> {
    const config = await this.ensureConfig(domain);
    if (!config.fieldMapping) return;

    const fieldMapping = config.fieldMapping as FieldMapping[];
    const feishuRecord = localRecordToFeishu(record, fieldMapping);
    const feishuId = record.feishu_record_id as string | undefined;

    if (isUpdate && feishuId) {
      await this.batchUpdateFeishuRecords(domain, config.baseToken, config.tableId, [
        { id: feishuId, record: feishuRecord },
      ]);
    } else if (!feishuId) {
      const addedIds = await this.batchAddFeishuRecords(
        domain,
        config.baseToken,
        config.tableId,
        [feishuRecord],
      );
      if (addedIds.length > 0 && record.id) {
        await this.db.execute(sql`
          UPDATE ${sql.identifier(this.getLocalTableName(domain))}
          SET feishu_record_id = ${addedIds[0]}
          WHERE id = ${record.id}::uuid
        `);
      }
    }
  }

  /**
   * 双向同步：先 pull 再 push
   */
  async syncBidirectional(
    domain: SyncDomain,
    operatorId?: string,
  ): Promise<SyncResult> {
    const startTime = new Date();
    const pullResult = await this.pull(domain, operatorId);

    // pull 失败就不执行 push
    if (pullResult.status === 'failed') {
      return {
        ...pullResult,
        direction: 'bidirectional',
        durationMs: Date.now() - startTime.getTime(),
      };
    }

    const pushResult = await this.push(domain, operatorId);

    const combined: SyncResult = {
      domain,
      direction: 'bidirectional',
      status: pushResult.status,
      recordCount: pullResult.recordCount + pushResult.recordCount,
      errorMessage: pushResult.errorMessage,
      durationMs: Date.now() - startTime.getTime(),
    };

    return combined;
  }

  /** 执行同步（根据方向分发） */
  async runSync(
    domain: string,
    direction: SyncDirection,
    operatorId?: string,
  ): Promise<SyncResult> {
    if (!SYNC_DOMAINS.includes(domain as SyncDomain)) {
      throw new BadRequestException(`不支持的业务域：${domain}`);
    }
    const d = domain as SyncDomain;

    switch (direction) {
      case 'pull':
        return this.pull(d, operatorId);
      case 'push':
        return this.push(d, operatorId);
      case 'bidirectional':
        return this.syncBidirectional(d, operatorId);
      default:
        throw new BadRequestException(`不支持的同步方向：${direction}`);
    }
  }

  // ============================================================
  // 私有方法：飞书侧
  // ============================================================

  /** 分页拉取全部飞书记录 */
  private async fetchAllFeishuRecords(
    domain: SyncDomain,
    baseToken: string,
    tableId: string,
    fieldMapping: FieldMapping[],
  ): Promise<Array<{ id: string; record: Record<string, unknown> }>> {
    const allRecords: Array<{
      id: string;
      record: Record<string, unknown>;
    }> = [];
    let pageToken: string | undefined;

    const plugin = this.loadPluginWithFields(domain);

    do {
      const response = (await plugin.call('searchRecords', {
        baseToken,
        tableId,
        pageToken,
        pageSize: PULL_PAGE_SIZE,
      })) as {
        hasMore: boolean;
        pageToken?: string;
        records: Array<{ id: string; record: Record<string, unknown> }>;
        total?: number;
      };

      if (allRecords.length === 0 && response.records.length > 0) {
        this.logger.log(
          `[feishu-sync] feishu pull sample: domain=${domain}, total=${response.total ?? 'unknown'}, ` +
            `firstRecordKeys=${Object.keys(response.records[0].record).join(', ')}, ` +
            `firstRecord=${JSON.stringify(response.records[0].record)}`,
        );
      }

      allRecords.push(...response.records);
      pageToken = response.hasMore ? response.pageToken : undefined;
    } while (pageToken);

    return allRecords;
  }

  /** 批量新增到飞书（分批） */
  private async batchAddFeishuRecords(
    domain: SyncDomain,
    baseToken: string,
    tableId: string,
    records: Array<Record<string, unknown>>,
  ): Promise<string[]> {
    const plugin = this.loadPluginWithFields(domain);
    const allIds: string[] = [];

    for (let i = 0; i < records.length; i += BATCH_WRITE_LIMIT) {
      const batch = records.slice(i, i + BATCH_WRITE_LIMIT);
      const input = {
        baseToken,
        tableId,
        records: batch.map((r) => ({ record: r })),
      };
      if (i === 0) {
        this.logger.log(
          `[feishu-sync] batchAdd sample keys=${Object.keys(batch[0] ?? {}).join(', ')} ` +
            `first=${JSON.stringify(batch[0] ?? {}).slice(0, 300)}`,
        );
      }
      const response = (await plugin.call('batchAddRecords', input)) as {
        records: Array<{ id: string }>;
      };
      allIds.push(...response.records.map((r) => r.id));
    }

    return allIds;
  }

  /** 批量更新飞书记录（分批） */
  private async batchUpdateFeishuRecords(
    domain: SyncDomain,
    baseToken: string,
    tableId: string,
    records: Array<{ id: string; record: Record<string, unknown> }>,
  ): Promise<number> {
    const plugin = this.loadPluginWithFields(domain);
    let updated = 0;

    for (let i = 0; i < records.length; i += BATCH_WRITE_LIMIT) {
      const batch = records.slice(i, i + BATCH_WRITE_LIMIT);
      const response = (await plugin.call('batchUpdateRecords', {
        baseToken,
        tableId,
        records: batch,
      })) as { records: Array<{ id: string }> };
      updated += response.records.length;
    }

    return updated;
  }

  /** 批量删除飞书记录 */
  private async batchDeleteFeishuRecords(
    domain: SyncDomain,
    baseToken: string,
    tableId: string,
    recordIds: string[],
  ): Promise<number> {
    if (recordIds.length === 0) return 0;
    const plugin = this.loadPluginWithFields(domain);
    let deleted = 0;

    this.logger.log(
      `[feishu-sync] batchDelete start: domain=${domain}, table=${tableId}, count=${recordIds.length}, ids=${recordIds.join(',')}`,
    );

    for (let i = 0; i < recordIds.length; i += BATCH_WRITE_LIMIT) {
      const batch = recordIds.slice(i, i + BATCH_WRITE_LIMIT);
      const response = (await plugin.call('deleteRecords', {
        baseToken,
        tableId,
        recordIDs: batch,
      })) as { success: boolean; records?: Array<{ id: string }> };

      const batchDeleted = response.records?.length ?? batch.length;
      deleted += batchDeleted;
      this.logger.log(
        `[feishu-sync] batchDelete batch ${i / BATCH_WRITE_LIMIT + 1}: ` +
          `success=${response.success}, deletedInBatch=${batchDeleted}`,
      );
    }

    this.logger.log(
      `[feishu-sync] batchDelete finished: domain=${domain}, totalDeleted=${deleted}`,
    );
    return deleted;
  }

  // ============================================================
  // 私有方法：本地数据库
  // ============================================================

  /** 查询本地表全部记录 */
  private async fetchAllLocalRecords(
    tableName: string,
    fieldMapping: FieldMapping[],
    feishuIdField: string,
  ): Promise<Array<Record<string, unknown>>> {
    const localFields = fieldMapping.map((m) => m.localField);
    const columns = sql.join(
      localFields.map((f) => sql.identifier(f)),
      sql`, `,
    );
    const userFields = new Set(
      fieldMapping
        .filter((m) => m.bizType === 'User' || m.bizType === 'CreatedUser' || m.bizType === 'ModifiedUser')
        .map((m) => m.localField),
    );

    const rows = await this.db.execute(sql`
      SELECT ${columns}, ${sql.identifier(feishuIdField)} AS ${sql.raw(`"${feishuIdField}"`)}
      FROM ${sql.identifier(tableName)}
    `);

    const records = rows as unknown as Array<Record<string, unknown>>;
    if (userFields.size === 0) return records;

    return records.map((rec) => {
      const next = { ...rec };
      for (const f of userFields) {
        next[f] = safeParseUserProfile(rec[f]);
      }
      return next;
    });
  }

  /**
   * 批量 upsert 到本地表（数据库原子操作，单条 SQL 完成全部写入）
   * - 根据 uniqueKey 匹配，存在则更新，不存在则插入
   * - 同时回写 feishu_record_id
   * - 使用 ON CONFLICT 保证原子性，并发写入不会产生重复记录
   */
  private async upsertLocalBatch(
    tableName: string,
    records: Array<{ feishuId: string; local: Record<string, unknown> }>,
    fieldMapping: FieldMapping[],
    uniqueKey: string,
  ): Promise<void> {
    const feishuIdField = 'feishu_record_id';
    const userFields = new Set(
      fieldMapping
        .filter((m) => m.bizType === 'User')
        .map((m) => m.localField),
    );
    const uniqueKeys = uniqueKey.split(',').map((k) => k.trim());
    const validRecords = records.filter(({ feishuId, local }) =>
      uniqueKeys.every((key) => {
        const value =
          key === feishuIdField ? feishuId : local[key];
        return value !== null && value !== undefined && value !== '';
      }),
    );
    if (validRecords.length === 0) {
      this.logger.log(
        `[feishu-sync] upsert skip all records (empty unique key): table=${tableName}, total=${records.length}`,
      );
      return;
    }
    if (validRecords.length < records.length) {
      this.logger.log(
        `[feishu-sync] upsert skip ${records.length - validRecords.length} records with empty unique key: table=${tableName}`,
      );
    }

    // 构造所有列名（业务字段 + feishu_record_id）
    const allColumns = [...fieldMapping.map((m) => m.localField), feishuIdField];
    const insertColumns = sql.join(
      allColumns.map((f) => sql.identifier(f)),
      sql`, `,
    );

    // 为每条记录构造一行 VALUES
    const valueRows: SQL[] = validRecords.map(({ feishuId, local }) => {
      const valueParts: SQL[] = [];
      for (const m of fieldMapping) {
        const val = local[m.localField];
        if (userFields.has(m.localField)) {
          if (val && typeof val === 'string') {
            valueParts.push(sql`ROW(${val})::user_profile`);
          } else {
            valueParts.push(sql`NULL::user_profile`);
          }
        } else if (val === null || val === undefined) {
          valueParts.push(sql`NULL`);
        } else {
          valueParts.push(sql`${val}`);
        }
      }
      valueParts.push(sql`${feishuId}`);
      return sql`(${sql.join(valueParts, sql`, `)})`;
    });
    const valuesClause = sql.join(valueRows, sql`,\n  `);

    // ON CONFLICT 目标列
    const uniqueKeyCols = sql.join(
      uniqueKeys.map((k) => sql.identifier(k)),
      sql`, `,
    );

    // ON CONFLICT DO UPDATE 时需要更新的列（排除 unique key 列）
    const uniqueKeySet = new Set(uniqueKeys);
    const nonUniqueFields = fieldMapping.filter(
      (m) => !uniqueKeySet.has(m.localField),
    );
    const updateFields = [
      ...nonUniqueFields.map((m) => m.localField),
      feishuIdField,
    ];
    const updateSets = sql.join(
      updateFields.map(
        (f) =>
          sql`${sql.identifier(f)} = EXCLUDED.${sql.identifier(f)}`,
      ),
      sql`, `,
    );

    // CTE + xmax 判断统计插入/更新数量
    // xmax = 0 表示该行是新插入的，否则是被更新的
    const resultRows = await this.db.execute<{
      inserted_count: string;
      updated_count: string;
    }>(sql`
      WITH upserted AS (
        INSERT INTO ${sql.identifier(tableName)} (${insertColumns})
        VALUES
          ${valuesClause}
        ON CONFLICT (${uniqueKeyCols}) DO UPDATE SET
          ${updateSets}
        RETURNING xmax
      )
      SELECT
        COUNT(*) FILTER (WHERE xmax = 0)::text AS inserted_count,
        COUNT(*) FILTER (WHERE xmax <> 0)::text AS updated_count
      FROM upserted
    `);

    const arr = resultRows as unknown as {
      inserted_count: string;
      updated_count: string;
    }[];
    const inserted = Number(arr[0]?.inserted_count ?? 0);
    const updated = Number(arr[0]?.updated_count ?? 0);

    this.logger.log(
      `[feishu-sync] upsertLocalBatch completed: table=${tableName}, ` +
        `total=${validRecords.length}, inserted=${inserted}, updated=${updated}, ` +
        `skipped=${records.length - validRecords.length}`,
    );
  }

  /** 把 push 新增产生的飞书 record_id 回写到本地表 */
  private async backfillFeishuRecordIds(
    tableName: string,
    fieldMapping: FieldMapping[],
    uniqueKey: string,
    feishuIdField: string,
    addedRecords: Array<Record<string, unknown>>,
    addedIds: string[],
  ): Promise<void> {
    if (addedRecords.length !== addedIds.length) {
      this.logger.warn(
        `[feishu-sync] backfillFeishuRecordIds: record count mismatch ` +
          `(${addedRecords.length} vs ${addedIds.length}), skipping backfill`,
      );
      return;
    }

    const uniqueKeys = uniqueKey.split(',').map((k) => k.trim());
    const uniqueMappings = uniqueKeys
      .map((k) => fieldMapping.find((m) => m.localField === k))
      .filter((m): m is FieldMapping => m !== undefined);
    if (uniqueMappings.length === 0) {
      this.logger.warn(
        `[feishu-sync] backfillFeishuRecordIds: uniqueKey ${uniqueKey} not in fieldMapping`,
      );
      return;
    }

    for (let i = 0; i < addedRecords.length; i += 1) {
      const rec = addedRecords[i];
      const feishuId = addedIds[i];

      const conditions = uniqueMappings.map((m) => {
        const value = rec[m.feishuField];
        return sql`${sql.identifier(m.localField)} = ${value}`;
      });
      const whereClause = sql.join(conditions, sql` AND `);

      await this.db.execute(sql`
        UPDATE ${sql.identifier(tableName)}
        SET ${sql.identifier(feishuIdField)} = ${feishuId}
        WHERE ${whereClause}
      `);
    }
  }

  // ============================================================
  // 私有方法：日志与配置收尾
  // ============================================================

  private async finalizeLogAndConfig(
    configId: string,
    logId: string,
    result: SyncResult,
    startTime: Date,
  ): Promise<void> {
    const endTime = new Date();
    result.durationMs = endTime.getTime() - startTime.getTime();

    await this.updateLog(logId, {
      status: result.status,
      recordCount: result.recordCount,
      errorMessage: result.errorMessage,
      syncFinishedAt: endTime.toISOString(),
    });

    // 更新配置表的 last_sync_*
    const endTimeIso = endTime.toISOString();
    await this.db.execute(sql`
      UPDATE feishu_sync_configs
      SET
        last_sync_time = ${endTimeIso}::timestamptz,
        last_sync_status = ${result.status},
        sync_direction = ${result.direction},
        _updated_at = now()
      WHERE id = ${configId}
    `);
  }
}
