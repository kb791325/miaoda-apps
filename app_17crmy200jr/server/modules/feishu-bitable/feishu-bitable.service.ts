import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CapabilityService } from '@lark-apaas/fullstack-nestjs-core';
import { CacheService } from '@server/common/cache/cache.service';
import {
  BITABLE_BASE_TOKEN,
  BITABLE_DOMAINS,
  BITABLE_PLUGIN_MAP,
  BitableFieldDef,
  PULL_PAGE_SIZE,
  BATCH_WRITE_LIMIT,
} from './feishu-bitable.constants';

export interface BitableFilterCondition {
  fieldName: string;
  operator:
    | 'is'
    | 'isNot'
    | 'contains'
    | 'doesNotContain'
    | 'isEmpty'
    | 'isNotEmpty'
    | 'isGreater'
    | 'isGreaterEqual'
    | 'isLess'
    | 'isLessEqual';
  value: string[];
}

export interface BitableFilter {
  conjunction?: 'and' | 'or';
  conditions: BitableFilterCondition[];
}

export interface BitableSortItem {
  fieldName: string;
  desc?: boolean;
}

export interface BitableListParams {
  domain: string;
  page?: number;
  pageSize?: number;
  filter?: BitableFilter;
  sort?: BitableSortItem[];
  viewId?: string;
}

export interface BitableListResult<T> {
  items: T[];
  total: number;
  hasMore: boolean;
  pageToken?: string;
}

interface FeishuPluginRecord {
  id: string;
  record: Record<string, unknown>;
}

interface SearchRecordsResponse {
  records: FeishuPluginRecord[];
  hasMore: boolean;
  pageToken?: string;
  total?: number;
}

interface AggregateQueryResponse {
  result: Array<Record<string, unknown>>;
  fieldList?: Array<{ fieldName: string; bizType: string }>;
  hasMore: boolean;
  pageToken?: string;
}

interface FeishuUserFieldItem {
  id: number;
  name: string;
}

@Injectable()
export class FeishuBitableService {
  private readonly logger = new Logger(FeishuBitableService.name);

  constructor(
    private readonly capabilityService: CapabilityService,
    private readonly cache: CacheService,
  ) {}

  getDomainConfig(domain: string) {
    const config = BITABLE_DOMAINS[domain as keyof typeof BITABLE_DOMAINS];
    if (!config) {
      throw new BadRequestException(`未知业务域: ${domain}`);
    }
    return config;
  }

  findFeishuFieldByLocal(domain: string, localField: string): string | null {
    const config = this.getDomainConfig(domain);
    const found = config.fields.find((f) => f.localField === localField);
    return found ? found.feishuField : null;
  }

  private async getPlugin(domain: string) {
    const pluginId = BITABLE_PLUGIN_MAP[domain];
    if (!pluginId) {
      throw new BadRequestException(`业务域 ${domain} 无对应插件实例`);
    }
    const fields = await this.getFeishuFieldList(domain);
    const capability = this.capabilityService.getCapability(pluginId);
    const config = {
      ...capability,
      formValue: {
        ...(capability?.formValue ?? {}),
        fields,
      },
    };
    return this.capabilityService.loadWithConfig(config);
  }

  private async getFeishuFieldList(
    domain: string,
  ): Promise<
    Array<{ id: string; name: string; type: number; bizType: string; readable: boolean; writeable: boolean }>
  > {
    const cached = await this.cache.get<
      Map<string, { bizType: string; readable: boolean; writeable: boolean }>
    >(`feishu-bitable:fieldmeta:${domain}`);
    if (cached && cached.size > 0) {
      return Array.from(cached.entries()).map(([name, meta], idx) => ({
        id: `fld_${idx}`,
        name,
        type: 1,
        bizType: meta.bizType,
        readable: meta.readable,
        writeable: meta.writeable,
      }));
    }

    const meta = await this.fetchFieldMeta(domain);
    await this.cache.set(
      `feishu-bitable:fieldmeta:${domain}`,
      meta,
      3600000,
    );
    this.logger.log(
      `[bitable] 加载 ${domain} 字段元数据成功，共 ${meta.size} 个字段`,
    );

    return Array.from(meta.entries()).map(([name, m], idx) => ({
      id: `fld_${idx}`,
      name,
      type: 1,
      bizType: m.bizType,
      readable: m.readable,
      writeable: m.writeable,
    }));
  }

  private async fetchFieldMeta(
    domain: string,
  ): Promise<Map<string, { bizType: string; readable: boolean; writeable: boolean }>> {
    const pluginId = BITABLE_PLUGIN_MAP[domain];
    const capability = this.capabilityService.getCapability(pluginId);
    const plugin = this.capabilityService.load(capability.id);

    try {
      const result = (await plugin.call('aggregateQuery', {
        baseToken: BITABLE_BASE_TOKEN,
        tableId: this.getDomainConfig(domain).tableId,
        dimensions: [this.getDomainConfig(domain).fields[0]?.feishuField || '支出日期'],
        measures: [],
        pageSize: 1,
      })) as AggregateQueryResponse;

      const map = new Map<
        string,
        { bizType: string; readable: boolean; writeable: boolean }
      >();

      if (result.fieldList && Array.isArray(result.fieldList)) {
        for (const field of result.fieldList) {
          map.set(field.fieldName, {
            bizType: field.bizType,
            readable: true,
            writeable: this.isFieldWritable(field.bizType),
          });
        }
      }

      if (map.size === 0) {
        throw new Error('aggregateQuery 返回字段列表为空');
      }

      return map;
    } catch (err) {
      this.logger.warn(
        `[bitable] aggregateQuery 获取字段列表失败，使用常量定义作为兜底: ${(err as Error).message}`,
      );
      const domainConfig = this.getDomainConfig(domain);
      const fallback = new Map<
        string,
        { bizType: string; readable: boolean; writeable: boolean }
      >();
      for (const fieldDef of domainConfig.fields) {
        fallback.set(fieldDef.feishuField, {
          bizType: fieldDef.bizType,
          readable: fieldDef.readable,
          writeable: fieldDef.writeable,
        });
      }
      return fallback;
    }
  }

  private isFieldWritable(bizType: string): boolean {
    const readonlyTypes = [
      'Formula',
      'Lookup',
      'CreatedTime',
      'ModifiedTime',
      'CreatedUser',
      'ModifiedUser',
      'AutoNumber',
      'Button',
    ];
    return !readonlyTypes.includes(bizType);
  }

  private feishuRecordToLocal(
    feishuRecord: Record<string, unknown>,
    recordId: string,
    domain: string,
  ): Record<string, unknown> {
    const result: Record<string, unknown> = { id: recordId, recordId };
    const domainConfig = this.getDomainConfig(domain);

    for (const fieldDef of domainConfig.fields) {
      if (!fieldDef.readable) continue;
      const rawValue = feishuRecord[fieldDef.feishuField];
      if (rawValue === undefined) continue;

      const converted = this.convertReadValue(rawValue, fieldDef.bizType);

      if (fieldDef.cascade && (!converted || converted === '')) {
        if (fieldDef.fallbackTextFeishuField) {
          const fallbackRaw = feishuRecord[fieldDef.fallbackTextFeishuField];
          const fallbackVal = this.convertReadValue(fallbackRaw, 'Text');
          if (fallbackVal && fallbackVal !== '') {
            result[fieldDef.localField] = fallbackVal;
            continue;
          }
        }
      }

      if (fieldDef.bizType === 'User' && converted !== undefined) {
        result[fieldDef.localField] = converted;
        if (Array.isArray(converted) && converted.length > 0) {
          const first = converted[0] as { id: number; name: string };
          result[`${fieldDef.localField}_id`] = String(first.id);
          result[`${fieldDef.localField}_name`] = first.name;
        } else {
          result[`${fieldDef.localField}_id`] = '';
          result[`${fieldDef.localField}_name`] = '';
        }
      } else {
        result[fieldDef.localField] = converted;
      }
    }

    return result;
  }

  private convertReadValue(raw: unknown, bizType: string): unknown {
    if (raw === undefined || raw === null) return undefined;

    switch (bizType) {
      case 'Text':
      case 'Email':
      case 'Barcode':
      case 'Phone':
      case 'AutoNumber':
        if (raw && typeof raw === 'object' && 'text' in raw) {
          return (raw as { text: string }).text;
        }
        return String(raw);

      case 'Url':
        if (raw && typeof raw === 'object' && 'link' in raw) {
          return (raw as { link: string }).link;
        }
        return String(raw);

      case 'Number':
      case 'Progress':
      case 'Currency':
      case 'Rating':
        if (typeof raw === 'number') return raw;
        if (raw && typeof raw === 'object' && 'amount' in raw) {
          const amt = (raw as { amount: number | string }).amount;
          return typeof amt === 'number' ? amt : Number(amt);
        }
        if (raw && typeof raw === 'object' && 'value' in raw) {
          const val = (raw as { value: number | string }).value;
          return typeof val === 'number' ? val : Number(val);
        }
        return Number(raw);

      case 'SingleSelect':
        if (typeof raw === 'string') return raw;
        if (Array.isArray(raw) && raw.length > 0) {
          if (typeof raw[0] === 'string') return raw[0];
          if (raw[0] && typeof raw[0] === 'object' && 'text' in raw[0]) {
            return (raw[0] as { text: string }).text;
          }
        }
        return String(raw);

      case 'MultiSelect':
        if (Array.isArray(raw)) {
          return raw.map((item: unknown) => {
            if (typeof item === 'string') return item;
            if (item && typeof item === 'object' && 'text' in item) {
              return (item as { text: string }).text;
            }
            return String(item);
          });
        }
        return [];

      case 'DateTime':
      case 'CreatedTime':
      case 'ModifiedTime': {
        let timestamp: number | undefined;
        if (typeof raw === 'number') {
          timestamp = raw;
        } else if (raw && typeof raw === 'object' && 'value' in raw) {
          const v = (raw as { value: number | string }).value;
          timestamp = typeof v === 'number' ? v : Number(v);
        }
        if (!timestamp) return undefined;
        const date = new Date(timestamp);
        if (isNaN(date.getTime())) return undefined;
        return date.toISOString().split('T')[0];
      }

      case 'Checkbox':
        if (typeof raw === 'boolean') return raw;
        return Boolean(raw);

      case 'User':
      case 'CreatedUser':
      case 'ModifiedUser':
        if (Array.isArray(raw) && raw.length > 0) {
          return String(raw[0]);
        }
        return '';

      case 'Attachment': {
        if (Array.isArray(raw) && raw.length > 0) {
          const first = raw[0];
          if (first && typeof first === 'object') {
            const obj = first as Record<string, unknown>;
            if (typeof obj.tmpUrl === 'string') return obj.tmpUrl;
            if (typeof obj.url === 'string') return obj.url;
            if (typeof obj.file_token === 'string') return obj.file_token;
          }
          if (typeof first === 'string') return first;
        }
        return '';
      }

      case 'Formula':
      case 'Lookup':
        if (raw && typeof raw === 'object' && 'value' in raw && 'bizType' in raw) {
          const inner = raw as { value: unknown; bizType: string };
          return this.convertReadValue(inner.value, inner.bizType);
        }
        if (Array.isArray(raw) && raw.length > 0) {
          return raw[0];
        }
        return raw;

      default:
        return raw;
    }
  }

  private localRecordToFeishu(
    localFields: Record<string, unknown>,
    domain: string,
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    const domainConfig = this.getDomainConfig(domain);

    for (const fieldDef of domainConfig.fields) {
      if (!fieldDef.writeable) continue;

      const localValue = localFields[fieldDef.localField];
      if (localValue === undefined) continue;

      const converted = this.convertWriteValue(localValue, fieldDef.bizType);
      if (converted !== undefined) {
        result[fieldDef.feishuField] = converted;
      }
    }

    return result;
  }

  private buildWritePayload(
    localFields: Record<string, unknown>,
    domain: string,
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    const domainConfig = this.getDomainConfig(domain);

    for (const fieldDef of domainConfig.fields) {
      if (!fieldDef.writeable) continue;

      const localValue = localFields[fieldDef.localField];
      if (localValue === undefined) continue;

      const converted = this.convertWriteValue(localValue, fieldDef.bizType);
      if (converted !== undefined) {
        result[fieldDef.feishuField] = converted;
        if (fieldDef.cascade && fieldDef.fallbackTextFeishuField) {
          result[fieldDef.fallbackTextFeishuField] = String(localValue);
        }
      }
    }

    return result;
  }

  private convertWriteValue(value: unknown, bizType: string): unknown {
    if (value === undefined || value === null || value === '') return undefined;

    switch (bizType) {
      case 'Text':
      case 'Email':
      case 'Barcode':
      case 'Phone':
        return String(value);

      case 'Number':
      case 'Progress':
      case 'Currency':
      case 'Rating':
        return Number(value);

      case 'SingleSelect':
        return String(value);

      case 'MultiSelect':
        if (Array.isArray(value)) return value.map(String);
        return [String(value)];

      case 'DateTime': {
        if (typeof value === 'string') {
          const date = new Date(value);
          if (!isNaN(date.getTime())) return date.getTime();
        }
        if (typeof value === 'number') return value;
        return undefined;
      }

      case 'Checkbox':
        return Boolean(value);

      case 'User':
        if (Array.isArray(value)) {
          return value.map((id: unknown) => Number(id));
        }
        return [Number(value)];

      case 'Url':
        if (typeof value === 'string') {
          return { link: value, text: value };
        }
        return undefined;

      case 'Attachment': {
        if (typeof value === 'string') {
          return [value];
        }
        if (Array.isArray(value)) {
          return value.map(String);
        }
        return undefined;
      }

      case 'Formula':
      case 'Lookup':
      case 'CreatedTime':
      case 'ModifiedTime':
      case 'CreatedUser':
      case 'ModifiedUser':
      case 'AutoNumber':
      case 'Button':
        return undefined;

      default:
        return value;
    }
  }

  async listRecords<T = Record<string, unknown>>(
    params: BitableListParams,
  ): Promise<BitableListResult<T>> {
    const { domain, page = 1, pageSize = 20, filter, sort } = params;
    const plugin = await this.getPlugin(domain);

    const targetStart = Math.max(0, (page - 1) * pageSize);
    const targetEnd = page * pageSize;

    const collectedRecords: FeishuPluginRecord[] = [];
    let pageToken: string | undefined;
    let total = 0;

    do {
      const response = (await plugin.call('searchRecords', {
        baseToken: BITABLE_BASE_TOKEN,
        tableId: this.getDomainConfig(domain).tableId,
        pageSize: PULL_PAGE_SIZE,
        pageToken,
        filter: filter || undefined,
        sort: sort || undefined,
      })) as SearchRecordsResponse;

      collectedRecords.push(...response.records);
      total = response.total ?? collectedRecords.length;
      pageToken = response.hasMore ? response.pageToken : undefined;

      // Stop pulling once we have enough records for the requested page
      if (collectedRecords.length >= targetEnd) break;
    } while (pageToken);

    const pageRecords = collectedRecords.slice(
      targetStart,
      targetStart + pageSize,
    );

    const items: T[] = pageRecords.map((rec) => {
      const local = this.feishuRecordToLocal(rec.record, rec.id, domain);
      return local as T;
    });

    return {
      items,
      total,
      hasMore: targetStart + pageSize < total,
    };
  }

  async getAllRecords<T = Record<string, unknown>>(
    domain: string,
    filter?: BitableFilter,
    sort?: BitableSortItem[],
  ): Promise<T[]> {
    const plugin = await this.getPlugin(domain);

    const allRecords: FeishuPluginRecord[] = [];
    let pageToken: string | undefined;

    do {
      const response = (await plugin.call('searchRecords', {
        baseToken: BITABLE_BASE_TOKEN,
        tableId: this.getDomainConfig(domain).tableId,
        pageSize: PULL_PAGE_SIZE,
        pageToken,
        filter: filter || undefined,
        sort: sort || undefined,
      })) as SearchRecordsResponse;

      allRecords.push(...response.records);
      pageToken = response.hasMore ? response.pageToken : undefined;
    } while (pageToken);

    const items: T[] = allRecords.map((rec) => {
      const local = this.feishuRecordToLocal(rec.record, rec.id, domain);
      return local as T;
    });

    return items;
  }

  async getRecord<T = Record<string, unknown>>(
    domain: string,
    recordId: string,
  ): Promise<T | null> {
    const plugin = await this.getPlugin(domain);

    try {
      const response = (await plugin.call('getRecord', {
        baseToken: BITABLE_BASE_TOKEN,
        tableId: this.getDomainConfig(domain).tableId,
        recordId,
      })) as { record: FeishuPluginRecord };

      if (!response.record) return null;
      const local = this.feishuRecordToLocal(
        response.record.record,
        response.record.id,
        domain,
      );
      return local as T;
    } catch (err) {
      this.logger.warn(
        `[bitable] getRecord 失败，回退到全量查找: ${(err as Error).message}`,
      );
      const all = await this.getAllRecords<T>(domain);
      const found = all.find((item: T) => {
        const rec = item as Record<string, unknown>;
        return rec.id === recordId || rec.recordId === recordId;
      });
      return found ?? null;
    }
  }

  async createRecord(
    domain: string,
    fields: Record<string, unknown>,
  ): Promise<{ id: string }> {
    const plugin = await this.getPlugin(domain);
    const feishuFields = this.buildWritePayload(fields, domain);
    const domainConfig = this.getDomainConfig(domain);

    try {
      const response = (await plugin.call('batchAddRecords', {
        baseToken: BITABLE_BASE_TOKEN,
        tableId: domainConfig.tableId,
        records: [{ record: feishuFields }],
      })) as { records: Array<{ id: string }> };

      if (!response.records || response.records.length === 0) {
        throw new BadRequestException('创建记录失败');
      }

      return { id: response.records[0].id };
    } catch (err) {
      const errMsg = (err as Error).message || '';
      if (errMsg.includes('cascade') || errMsg.includes('级联')) {
        this.logger.warn(
          `[bitable] 级联单选字段不支持API写入，仅写入文本落字段`,
        );
        const cascadeFeishuFields = domainConfig.fields
          .filter((f) => f.cascade)
          .map((f) => f.feishuField);
        const fallbackFields: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(feishuFields)) {
          if (!cascadeFeishuFields.includes(key)) {
            fallbackFields[key] = value;
          }
        }
        const response = (await plugin.call('batchAddRecords', {
          baseToken: BITABLE_BASE_TOKEN,
          tableId: domainConfig.tableId,
          records: [{ record: fallbackFields }],
        })) as { records: Array<{ id: string }> };
        if (!response.records || response.records.length === 0) {
          throw new BadRequestException('创建记录失败');
        }
        return { id: response.records[0].id };
      }
      if (errMsg.includes('field_name not found')) {
        this.logger.warn(
          `[bitable] 部分字段在飞书表中不存在，尝试剔除未知字段后重试: ${domain}`,
        );
        const coreFields = new Set([
          '资产名称', '资产类型', '采购日期', '采购金额', '采购申请部门',
          '付费主体', '使用楼层', '经办人', '资产类目', '支出说明',
          '支出日期', '支出金额', '支出部门', '支出类目', '支出类型',
          '一级类目', '二级类目', '盘点单号', '盘点年度', '盘点月份',
          '盘点日期', '盘点人', '账面数量', '实盘数量', '差异说明',
          '盘点状态', '数据键', '数据值',
        ]);
        const fallbackFields: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(feishuFields)) {
          if (coreFields.has(key)) {
            fallbackFields[key] = value;
          }
        }
        const missing = Object.keys(feishuFields)
          .filter((k) => !coreFields.has(k));
        this.logger.warn(`[bitable] 可能缺失的字段: ${missing.join(', ')}`);
        if (Object.keys(fallbackFields).length === 0) {
          throw err;
        }
        const response = (await plugin.call('batchAddRecords', {
          baseToken: BITABLE_BASE_TOKEN,
          tableId: domainConfig.tableId,
          records: [{ record: fallbackFields }],
        })) as { records: Array<{ id: string }> };
        if (!response.records || response.records.length === 0) {
          throw new BadRequestException('创建记录失败');
        }
        return { id: response.records[0].id };
      }
      throw err;
    }
  }

  async updateRecord(
    domain: string,
    recordId: string,
    fields: Record<string, unknown>,
  ): Promise<{ success: boolean }> {
    const plugin = await this.getPlugin(domain);
    const feishuFields = this.buildWritePayload(fields, domain);
    const domainConfig = this.getDomainConfig(domain);

    try {
      await plugin.call('batchUpdateRecords', {
        baseToken: BITABLE_BASE_TOKEN,
        tableId: domainConfig.tableId,
        records: [{ id: recordId, record: feishuFields }],
      });
      return { success: true };
    } catch (err) {
      const errMsg = (err as Error).message || '';
      if (errMsg.includes('cascade') || errMsg.includes('级联')) {
        this.logger.warn(
          `[bitable] 级联单选字段不支持API更新，仅更新文本落字段`,
        );
        const cascadeFeishuFields = domainConfig.fields
          .filter((f) => f.cascade)
          .map((f) => f.feishuField);
        const fallbackFields: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(feishuFields)) {
          if (!cascadeFeishuFields.includes(key)) {
            fallbackFields[key] = value;
          }
        }
        if (Object.keys(fallbackFields).length === 0) return { success: true };
        await plugin.call('batchUpdateRecords', {
          baseToken: BITABLE_BASE_TOKEN,
          tableId: domainConfig.tableId,
          records: [{ id: recordId, record: fallbackFields }],
        });
        return { success: true };
      }
      if (errMsg.includes('field_name not found')) {
        this.logger.warn(
          `[bitable] 部分字段在飞书表中不存在，尝试剔除未知字段后重试(update): ${domain}`,
        );
        const coreFields = new Set([
          '资产名称', '资产类型', '采购日期', '采购金额', '采购申请部门',
          '付费主体', '使用楼层', '经办人', '资产类目', '支出说明',
          '支出日期', '支出金额', '支出部门', '支出类目', '支出类型',
          '一级类目', '二级类目', '盘点单号', '盘点年度', '盘点月份',
          '盘点日期', '盘点人', '账面数量', '实盘数量', '差异说明',
          '盘点状态', '数据键', '数据值',
        ]);
        const fallbackFields: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(feishuFields)) {
          if (coreFields.has(key)) {
            fallbackFields[key] = value;
          }
        }
        if (Object.keys(fallbackFields).length === 0) return { success: true };
        await plugin.call('batchUpdateRecords', {
          baseToken: BITABLE_BASE_TOKEN,
          tableId: domainConfig.tableId,
          records: [{ id: recordId, record: fallbackFields }],
        });
        return { success: true };
      }
      throw err;
    }
  }

  async deleteRecord(
    domain: string,
    recordId: string,
  ): Promise<{ success: boolean }> {
    const plugin = await this.getPlugin(domain);

    const response = (await plugin.call('deleteRecords', {
      baseToken: BITABLE_BASE_TOKEN,
      tableId: this.getDomainConfig(domain).tableId,
      recordIDs: [recordId],
    })) as { success: boolean };

    return { success: response.success };
  }

  async batchCreateRecords(
    domain: string,
    records: Array<Record<string, unknown>>,
  ): Promise<string[]> {
    const plugin = await this.getPlugin(domain);
    const domainConfig = this.getDomainConfig(domain);
    const cascadeFeishuFields = domainConfig.fields
      .filter((f) => f.cascade)
      .map((f) => f.feishuField);
    const allIds: string[] = [];

    for (let i = 0; i < records.length; i += BATCH_WRITE_LIMIT) {
      const batch = records.slice(i, i + BATCH_WRITE_LIMIT);
      const feishuRecords = batch.map((r) => ({
        record: this.buildWritePayload(r, domain),
      }));
      try {
        const response = (await plugin.call('batchAddRecords', {
          baseToken: BITABLE_BASE_TOKEN,
          tableId: domainConfig.tableId,
          records: feishuRecords,
        })) as { records: Array<{ id: string }> };
        allIds.push(...response.records.map((r) => r.id));
      } catch (err) {
        const errMsg = (err as Error).message || '';
        if (errMsg.includes('cascade') || errMsg.includes('级联')) {
          this.logger.warn(
            `[bitable] 批量创建级联单选字段写入失败，降级仅写文本落字段`,
          );
          const fallbackRecords = feishuRecords.map((r) => {
            const fallback: Record<string, unknown> = {};
            for (const [key, value] of Object.entries(r.record)) {
              if (!cascadeFeishuFields.includes(key)) {
                fallback[key] = value;
              }
            }
            return { record: fallback };
          });
          const response = (await plugin.call('batchAddRecords', {
            baseToken: BITABLE_BASE_TOKEN,
            tableId: domainConfig.tableId,
            records: fallbackRecords,
          })) as { records: Array<{ id: string }> };
          allIds.push(...response.records.map((r) => r.id));
        } else {
          throw err;
        }
      }
    }

    return allIds;
  }

  async batchUpdateRecords(
    domain: string,
    records: Array<{ id: string; record: Record<string, unknown> }>,
  ): Promise<{ success: boolean }> {
    const plugin = await this.getPlugin(domain);
    const domainConfig = this.getDomainConfig(domain);
    const cascadeFeishuFields = domainConfig.fields
      .filter((f) => f.cascade)
      .map((f) => f.feishuField);

    for (let i = 0; i < records.length; i += BATCH_WRITE_LIMIT) {
      const batch = records.slice(i, i + BATCH_WRITE_LIMIT);
      const feishuRecords = batch.map((r) => ({
        id: r.id,
        record: this.buildWritePayload(r.record, domain),
      }));
      try {
        await plugin.call('batchUpdateRecords', {
          baseToken: BITABLE_BASE_TOKEN,
          tableId: domainConfig.tableId,
          records: feishuRecords,
        });
      } catch (err) {
        const errMsg = (err as Error).message || '';
        if (errMsg.includes('cascade') || errMsg.includes('级联')) {
          this.logger.warn(
            `[bitable] 批量更新级联单选字段写入失败，降级仅更新文本落字段`,
          );
          const fallbackRecords = feishuRecords
            .map((r) => {
              const fallback: Record<string, unknown> = {};
              for (const [key, value] of Object.entries(r.record)) {
                if (!cascadeFeishuFields.includes(key)) {
                  fallback[key] = value;
                }
              }
              return { id: r.id, record: fallback };
            })
            .filter((r) => Object.keys(r.record).length > 0);
          if (fallbackRecords.length > 0) {
            await plugin.call('batchUpdateRecords', {
              baseToken: BITABLE_BASE_TOKEN,
              tableId: domainConfig.tableId,
              records: fallbackRecords,
            });
          }
        } else {
          throw err;
        }
      }
    }

    return { success: true };
  }

  async batchDeleteRecords(
    domain: string,
    recordIds: string[],
  ): Promise<{ success: boolean }> {
    const plugin = await this.getPlugin(domain);

    let success = true;
    for (let i = 0; i < recordIds.length; i += BATCH_WRITE_LIMIT) {
      const batch = recordIds.slice(i, i + BATCH_WRITE_LIMIT);
      const response = (await plugin.call('deleteRecords', {
        baseToken: BITABLE_BASE_TOKEN,
        tableId: this.getDomainConfig(domain).tableId,
        recordIDs: batch,
      })) as { success: boolean };
      success = success && response.success;
    }

    return { success };
  }

  async aggregateQuery(
    domain: string,
    params: {
      dimensions?: Array<{ fieldName: string }>;
      measures?: Array<{ fieldName: string; aggregation: string; alias?: string }>;
      filter?: BitableFilter;
      sort?: BitableSortItem[];
      pageSize?: number;
    },
  ): Promise<{
    result: Array<Record<string, unknown>>;
    hasMore: boolean;
    pageToken?: string;
    fieldList?: Array<{ fieldName: string; bizType: string }>;
  }> {
    const plugin = await this.getPlugin(domain);

    const result = (await plugin.call('aggregateQuery', {
      baseToken: BITABLE_BASE_TOKEN,
      tableId: this.getDomainConfig(domain).tableId,
      ...params,
    })) as AggregateQueryResponse;

    return result;
  }

  async getFieldMeta(
    domain: string,
  ): Promise<Array<{ fieldName: string; bizType: string; readable: boolean; writeable: boolean }>> {
    const meta = await this.getFeishuFieldList(domain);
    return meta.map((m) => ({
      fieldName: m.name,
      bizType: m.bizType,
      readable: m.readable,
      writeable: m.writeable,
    }));
  }

  async invalidateFieldCache(domain?: string): Promise<void> {
    if (domain) {
      await this.cache.del(
        `feishu-bitable:fieldmeta:${domain}`,
      );
    } else {
      await this.cache.deleteByPrefix('feishu-bitable:fieldmeta:');
    }
  }
}
