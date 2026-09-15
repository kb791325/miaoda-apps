import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { BitableService } from '../../common/feishu/bitable.service';
import {
  getTableId,
  getKeywordFields,
  getKeywordNumericFields,
} from '../../config/feishu.config';
import {
  normalizeRecord,
  toBitableValue,
  buildKeywordFilter,
  combineFilters,
  ATTACHMENT_FIELDS,
} from '../../common/feishu/field-normalizer';
import {
  getEntityFieldNames,
  getEntityTableDef,
  getFuzzyFilterFields,
} from '../data/entity-tables';

interface ListResult {
  items: any[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  nextPageToken: string | undefined;
}

/** Bitable 常见错误码 → 中文描述 */
const BITABLE_CODE_MESSAGES: Record<string, string> = {
  '1254061': '字段类型不匹配，请检查填写内容格式',
  '1254069': '附件格式错误，请重新上传文件',
  '1254040': '字段不存在，请联系管理员检查表配置',
};

function toFriendlyBitableError(e: unknown, action: string, tableKey: string): BadRequestException {
  const msg = e instanceof Error ? e.message : String(e);
  const codeMatch = msg.match(/code=(\d+)/);
  const code = codeMatch?.[1] ?? '';
  const friendly = BITABLE_CODE_MESSAGES[code] ?? msg;
  return new BadRequestException(`${action}失败（${tableKey}）：${friendly}`);
}

/** 页码参数兑底：parseInt 整数化，非法或小于 1 时回退默认值 */
function toPositiveInt(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 1) return value;
  const n = parseInt(String(value ?? ''), 10);
  return Number.isFinite(n) && n >= 1 ? n : fallback;
}

@Injectable()
export class BitableEntityService {
  private readonly logger = new Logger(BitableEntityService.name);

  constructor(private readonly bitable: BitableService) {}

  /** 将附件字段的 tmp_url 替换为真实的临时下载链接（鉴权后可直接访问） */
  private async enrichAttachmentUrls(items: any[]): Promise<void> {
    const attachmentFields = [...ATTACHMENT_FIELDS];
    const allTokens: string[] = [];
    let attachExtra: string | undefined;

    for (const item of items) {
      for (const field of attachmentFields) {
        const val = item[field];
        if (Array.isArray(val)) {
          for (const att of val) {
            if (att?.file_token) {
              allTokens.push(att.file_token);
              if (!attachExtra && att.tmp_url) {
                try {
                  const u = new URL(att.tmp_url);
                  const raw = u.search.match(/[?&]extra=([^&]*)/);
                  if (raw) attachExtra = raw[1];
                } catch { /* ignore */ }
              }
            }
          }
        }
      }
    }

    if (allTokens.length === 0) return;

    const urlMap = await this.bitable.getMediaTmpUrls(allTokens, attachExtra);

    for (const item of items) {
      for (const field of attachmentFields) {
        const val = item[field];
        if (Array.isArray(val)) {
          for (const att of val) {
            if (att?.file_token && urlMap[att.file_token]) {
              att.tmp_url = urlMap[att.file_token];
            }
          }
        }
      }
    }
  }

  async list(
    tableKey: string,
    options: {
      page?: number;
      pageSize?: number;
      pageToken?: string;
      keyword?: string;
      sortBy?: string;
      sortOrder?: string;
      filters?: Record<string, string | string[]>;
      extraFilter?: any;
    },
  ): Promise<ListResult> {
    const tableId = getTableId(tableKey);
    const page = toPositiveInt(options.page, 1);
    const pageSize = Math.min(Math.max(toPositiveInt(options.pageSize, 20), 1), 200);

    const filterParts: any[] = [];

    if (options.keyword) {
      const kf = buildKeywordFilter(options.keyword, getKeywordFields(tableKey), getKeywordNumericFields(tableKey));
      if (kf) filterParts.push(kf);
    }

    filterParts.push(...this.buildExactFilterParts(tableKey, options.filters));

    if (options.extraFilter) {
      filterParts.push(options.extraFilter);
    }

    const filter = combineFilters(filterParts);

    const sortField = options.sortBy
      ? getEntityTableDef(tableKey)?.fields[options.sortBy] || options.sortBy
      : undefined;
    const sort = sortField
      ? [
          {
            field_name: sortField,
            desc: (options.sortOrder || 'desc') === 'desc',
          },
        ]
      : undefined;

    try {
      const paged = await this.fetchPageRecords(
        tableId,
        {
          pageSize,
          pageToken: options.pageToken || undefined,
          filter: filter || undefined,
          sort,
        },
        page,
      );

      const items = paged.items.map((r: any) => normalizeRecord(r, tableKey));
      await this.enrichAttachmentUrls(items);

      return {
        items,
        total: paged.total,
        page,
        pageSize,
        hasMore: paged.hasMore,
        nextPageToken: paged.nextPageToken,
      };
    } catch (e: any) {
      const apiCode = e?.response?.data?.code;
      if (sort && (apiCode === 503402 || apiCode === 1254016)) {
        this.logger.warn(`排序字段不存在，降级为无排序: ${options.sortBy}`);
        return this.list(tableKey, { ...options, sortBy: undefined, sortOrder: undefined });
      }
      if (filter && (apiCode === 503401 || apiCode === 1254018)) {
        // 过滤条件无效（通常是单选/枚举字段不支持 contains），二分法跳过导致失败的字段重试，而不是直接丢弃全部 keyword
        this.logger.warn(`过滤条件无效(code=${apiCode})，尝试跳过失效字段后重试`);
        const fallback = await this.tryKeywordFilterFallback(tableId, tableKey, options);
        if (fallback) return fallback;
        if (options.keyword) {
          return this.list(tableKey, { ...options, keyword: undefined });
        }
        if (options.filters && Object.keys(options.filters).length > 0) {
          this.logger.warn(`筛选项过滤无效，降级为无筛选项查询: ${tableKey}`);
          return this.list(tableKey, { ...options, filters: undefined });
        }
      }
      throw e;
    }
  }

  /**
   * Bitable records/search 只支持 page_token 翻页、不支持 offset。
   * 显式传 pageToken 时直接按 token 取一页（token 模式，向后兼容）；
   * 页码模式下按同一筛选+排序顺序用 page_token 拉取前缀，再切片出目标页。
   * total 取 Bitable 返回的筛选后全量总数，不受分页影响。
   */
  private async fetchPageRecords(
    tableId: string,
    base: { pageSize: number; pageToken?: string; filter?: any; sort?: any },
    page: number,
  ): Promise<{ items: any[]; total: number; hasMore: boolean; nextPageToken: string | undefined }> {
    if (base.pageToken) {
      const result = await this.bitable.listRecords(tableId, {
        pageSize: base.pageSize,
        pageToken: base.pageToken,
        filter: base.filter,
        sort: base.sort,
      });
      const items = result?.data?.items || [];
      return {
        items,
        total: result?.data?.total ?? items.length,
        hasMore: result?.data?.has_more ?? false,
        nextPageToken: result?.data?.page_token || undefined,
      };
    }

    const need = (page - 1) * base.pageSize + base.pageSize;
    const items: any[] = [];
    let total = 0;
    let pageToken: string | undefined;
    let hasMore = false;
    while (items.length < need) {
      const result = await this.bitable.listRecords(tableId, {
        pageSize: Math.min(500, need - items.length),
        pageToken,
        filter: base.filter,
        sort: base.sort,
      });
      const batch = result?.data?.items || [];
      items.push(...batch);
      total = result?.data?.total ?? (total || batch.length);
      pageToken = result?.data?.page_token || undefined;
      hasMore = result?.data?.has_more ?? false;
      if (batch.length === 0 || !hasMore || !pageToken) break;
    }
    const start = (page - 1) * base.pageSize;
    return {
      items: items.slice(start, start + base.pageSize),
      total,
      hasMore: hasMore && items.length >= need,
      nextPageToken: items.length >= need ? pageToken : undefined,
    };
  }

  /** 把筛选项转成 Bitable 精确/模糊过滤条件组（忽略未知字段与 all 占位值） */
  private buildExactFilterParts(
    tableKey: string,
    filters?: Record<string, string | string[]>,
  ): any[] {
    if (!filters) return [];
    const fieldNames = getEntityFieldNames(tableKey);
    if (fieldNames.size === 0) return [];
    const fuzzyFields = getFuzzyFilterFields(tableKey);
    const parts: any[] = [];
    for (const [rawKey, raw] of Object.entries(filters)) {
      let key = rawKey;
      let rangeOperator: 'isGreater' | 'isLess' | null = null;
      if (rawKey.endsWith('__gte')) {
        key = rawKey.slice(0, -5);
        rangeOperator = 'isGreater';
      } else if (rawKey.endsWith('__lte')) {
        key = rawKey.slice(0, -5);
        rangeOperator = 'isLess';
      }
      if (!fieldNames.has(key)) continue;
      const values = (Array.isArray(raw) ? raw : [raw]).filter(
        (v) => v !== '' && v != null && v !== 'all',
      );
      if (values.length === 0) continue;
      if (rangeOperator) {
        parts.push({
          conjunction: 'and',
          conditions: [{ field_name: key, operator: rangeOperator, value: [values[0]] }],
        });
        continue;
      }
      parts.push({
        conjunction: 'or',
        conditions: values.map((v) => ({
          field_name: key,
          operator: fuzzyFields.includes(key) ? 'contains' : 'is',
          value: [v],
        })),
      });
    }
    return parts;
  }

  private async tryKeywordFilterFallback(
    tableId: string,
    tableKey: string,
    options: { page?: number; keyword?: string; pageSize?: number; pageToken?: string; sortBy?: string; sortOrder?: string; filters?: Record<string, string | string[]>; extraFilter?: any },
  ): Promise<ListResult | null> {
    if (!options.keyword) return null;
    const page = toPositiveInt(options.page, 1);
    const pageSize = Math.min(Math.max(toPositiveInt(options.pageSize, 20), 1), 200);
    const textFields = getKeywordFields(tableKey);
    const numericFields = getKeywordNumericFields(tableKey);
    if (textFields.length === 0 && numericFields.length === 0) return null;

    const exactParts = this.buildExactFilterParts(tableKey, options.filters);

    const sort = options.sortBy
      ? [{ field_name: options.sortBy, desc: (options.sortOrder || 'desc') === 'desc' }]
      : undefined;

    // 逐个移除字段，找到能成功执行的最大字段集合
    const allFields = [...textFields];
    for (let i = allFields.length - 1; i >= 0; i -= 1) {
      const remaining = allFields.slice(0, i);
      if (remaining.length === 0) break;
      const kf = buildKeywordFilter(options.keyword, remaining, numericFields);
      const filterParts: any[] = [];
      if (kf) filterParts.push(kf);
      filterParts.push(...exactParts);
      if (options.extraFilter) filterParts.push(options.extraFilter);
      const filter = combineFilters(filterParts);
      try {
        const paged = await this.fetchPageRecords(tableId, {
          pageSize,
          pageToken: options.pageToken || undefined,
          filter,
          sort,
        }, page);
        const items = paged.items.map((r: any) => normalizeRecord(r, tableKey));
        this.logger.warn(`keyword 过滤回退成功，移除字段: ${allFields[i]}`);
        return {
          items,
          total: paged.total,
          page,
          pageSize,
          hasMore: paged.hasMore,
          nextPageToken: paged.nextPageToken,
        };
      } catch {
        // 继续尝试更少字段
      }
    }
    return null;
  }

  async get(tableKey: string, recordId: string) {
    const tableId = getTableId(tableKey);
    const result = await this.bitable.getRecord(tableId, recordId);
    const record = result?.data?.record;
    if (!record) {
      const msg = result?.msg || result?.error?.msg || '记录不存在';
      const code = result?.code;
      this.logger.error(`Bitable 查询失败 [${tableKey}] code=${code} msg=${msg}`);
      throw new NotFoundException(msg);
    }
    const normalized = normalizeRecord(record, tableKey);
    await this.enrichAttachmentUrls([normalized]);
    return normalized;
  }

  async create(tableKey: string, fields: Record<string, any>) {
    const tableId = getTableId(tableKey);
    const bitableFields: Record<string, any> = {};

    for (const [key, value] of Object.entries(fields)) {
      if (value === undefined || value === null) continue;
      if (key === 'id' || key === '_id') continue;
      bitableFields[key] = toBitableValue(key, value, tableKey);
    }

    if (Object.keys(bitableFields).length === 0) {
      throw new BadRequestException('未提供可创建的字段');
    }

    let result: any;
    try {
      result = await this.bitable.createRecord(tableId, bitableFields);
    } catch (e) {
      this.logger.error(`Bitable 创建异常 [${tableKey}]: ${e instanceof Error ? e.message : String(e)}`);
      throw toFriendlyBitableError(e, '创建', tableKey);
    }
    const record = result?.data?.record;
    if (!record) {
      const msg = result?.msg || result?.error?.msg || '创建记录失败';
      const code = result?.code;
      this.logger.error(`Bitable 创建失败 [${tableKey}] code=${code} msg=${msg}`);
      throw new BadRequestException(msg);
    }
    return normalizeRecord(record, tableKey);
  }

  async update(tableKey: string, recordId: string, fields: Record<string, any>) {
    const tableId = getTableId(tableKey);
    const bitableFields: Record<string, any> = {};

    for (const [key, value] of Object.entries(fields)) {
      if (key === 'id' || key === '_id') continue;
      bitableFields[key] = toBitableValue(key, value, tableKey);
    }

    if (Object.keys(bitableFields).length === 0) {
      throw new BadRequestException('未提供可更新字段');
    }

    let result: any;
    try {
      result = await this.bitable.updateRecord(tableId, recordId, bitableFields);
    } catch (e) {
      this.logger.error(`Bitable 更新异常 [${tableKey}/${recordId}]: ${e instanceof Error ? e.message : String(e)}`);
      throw toFriendlyBitableError(e, '更新', tableKey);
    }
    const record = result?.data?.record;
    if (!record) {
      const msg = result?.msg || result?.error?.msg || '更新记录失败';
      const code = result?.code;
      this.logger.error(`Bitable 更新失败 [${tableKey}] code=${code} msg=${msg}`);
      throw new BadRequestException(msg);
    }
    return normalizeRecord(record, tableKey);
  }

  async delete(tableKey: string, recordId: string) {
    const tableId = getTableId(tableKey);
    const result = await this.bitable.deleteRecord(tableId, recordId);
    if (result?.code && result.code !== 0) {
      const msg = result.msg || result.error?.msg || '删除失败';
      this.logger.error(`Bitable 删除失败 [${tableKey}] code=${result.code} msg=${msg}`);
      throw new BadRequestException(msg);
    }
    return result?.data || true;
  }

  async batchCreate(
    tableKey: string,
    rows: Array<Record<string, unknown>>,
  ): Promise<Array<{ success: boolean; record_id?: string; error?: string }>> {
    const tableId = getTableId(tableKey);
    const toFields = (fields: Record<string, unknown>): Record<string, unknown> => {
      const bitableFields: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(fields)) {
        if (value === undefined || value === null) continue;
        if (key === 'id' || key === '_id') continue;
        bitableFields[key] = toBitableValue(key, value, tableKey);
      }
      return bitableFields;
    };

    const results: Array<{ success: boolean; record_id?: string; error?: string }> = [];
    const CHUNK = 100;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const chunk = rows
        .slice(i, i + CHUNK)
        .map((r) => ({ fields: toFields(r) }));
      try {
        const res = await this.bitable.batchCreateRecords(tableId, chunk);
        const records: Array<{ record_id?: string }> = res?.data?.records || [];
        for (const rec of records) {
          results.push({ success: true, record_id: rec?.record_id });
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        this.logger.warn(`批量创建整批失败，降级逐条创建 [${tableKey}]: ${msg}`);
        for (const { fields } of chunk) {
          try {
            const res = await this.bitable.createRecord(tableId, fields);
            results.push({
              success: true,
              record_id: res?.data?.record?.record_id,
            });
          } catch (e2) {
            results.push({
              success: false,
              error: e2 instanceof Error ? e2.message : String(e2),
            });
          }
        }
      }
    }
    return results;
  }

  async batchDelete(tableKey: string, recordIds: string[]) {
    const tableId = getTableId(tableKey);
    const result = await this.bitable.batchDeleteRecords(tableId, recordIds);
    if (result?.code && result.code !== 0) {
      const msg = result.msg || result.error?.msg || '批量删除失败';
      this.logger.error(`Bitable 批量删除失败 [${tableKey}] code=${result.code} msg=${msg}`);
      throw new BadRequestException(msg);
    }
    return result?.data || true;
  }

  async count(tableKey: string, filter?: any): Promise<number> {
    const tableId = getTableId(tableKey);
    try {
      const result = await this.bitable.listRecords(tableId, {
        pageSize: 1,
        filter: filter || undefined,
      });
      return Number(result?.data?.total) || 0;
    } catch {
      return 0;
    }
  }
}
