/**
 * Bitable 实体 API 工厂
 *
 * 前端字段（snake_case） ↔ 飞书多维表格中文字段名 双向映射。
 * 所有第一批切真实接口的模块，统一通过 createEntityApi(tableKey, fieldMap) 创建，
 * 页面层保持 snake_case 字段名不变，实现零侵入切换。
 *
 * 安全：浏览器只调 /api/entity/<逻辑表名>，App Secret 只存服务端。
 */

import { apiGet, apiPost, apiPut, apiDelete } from './request';
import type { ApiResponse, PageResult, ListParams } from './types';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { ENTITY_REAL_COLUMNS } from './entity-real-columns';

/** 字段映射配置：前端字段名 → Bitable 中文字段名 */
export interface FieldMap {
  /** 主键字段：前端 id → Bitable record_id */
  idField?: string;
  /** 普通字段映射：{ 前端字段: Bitable中文字段 } */
  fields: Record<string, string>;
  /** 创建/更新时忽略的字段（纯计算/只读） */
  readonly?: string[];
  /** 状态枚举映射：{ 前端值: Bitable值 } */
  statusMap?: Record<string, string>;
  /** 状态字段名（前端名），用于双向转译 */
  statusField?: string;
  /** 多枚举字段映射：{ 前端字段: { 前端code: Bitable中文值 } }，支持一个实体多个 code 字段 */
  enumMaps?: Record<string, Record<string, string>>;
  /** 编号生成配置：{ 字段名: 前缀 }，如 { recharge_no: 'CZ' } */
  noGenerators?: Record<string, string>;
}
/** 汇总单状态映射与多枚举映射为 { 前端字段: {code:中文} } */
function collectEnumMaps(fm: FieldMap): Record<string, Record<string, string>> {
  const merged: Record<string, Record<string, string>> = { ...(fm.enumMaps || {}) };
  if (fm.statusField && fm.statusMap) merged[fm.statusField] = fm.statusMap;
  return merged;
}

/** 把 Bitable 记录（中文字段）转为前端对象（snake_case） */
function mapFromBitable<T = any>(bitable: Record<string, any>, fm: FieldMap, idAsNumber = false): T {
  const out: Record<string, any> = {};
  // id 字段
  if (fm.idField) {
    const rawId = bitable[fm.idField] || bitable['record_id'] || bitable['_id'] || '';
    // 当 idAsNumber=true 时，把 record_id 字符串转成数字哈希，兼容前端 Number(id) 的页面
    out['id'] = idAsNumber ? hashStringToNumber(String(rawId)) : rawId;
  }
  // 普通字段（含多枚举：中文 → 前端 code）
  const enumMapsFrom = collectEnumMaps(fm);
  for (const [feKey, cnKey] of Object.entries(fm.fields)) {
    let val = bitable[cnKey];
    const em = enumMapsFrom[feKey];
    if (em && typeof val === 'string') {
      const found = Object.entries(em).find(([, cn]) => cn === val);
      if (found) val = found[0];
    }
    out[feKey] = val;
  }
  return out as T;
}

/** 把前端对象转为 Bitable 写入体（只传可写字段） */
function mapToBitable(frontend: Record<string, any>, fm: FieldMap): Record<string, any> {
  const out: Record<string, any> = {};
  const readonlySet = new Set(fm.readonly || []);
  const knownKeys = new Set(Object.keys(fm.fields));
  for (const key of Object.keys(frontend)) {
    if (!knownKeys.has(key) && !readonlySet.has(key)) {
      logger.warn('[mapToBitable] unknown field dropped', String({ key, value: frontend[key] }));
    }
  }
  const enumMapsTo = collectEnumMaps(fm);
  for (const [feKey, cnKey] of Object.entries(fm.fields)) {
    if (readonlySet.has(feKey)) continue;
    if (!(feKey in frontend)) continue;
    let val = frontend[feKey];
    const em = enumMapsTo[feKey];
    if (em && val != null && em[val]) val = em[val];
    out[cnKey] = val;
  }
  return out;
}

/** 按实体真实列白名单过滤写入 body，剔除多维表中不存在的列以避免 500 */
function filterBodyForEntity(
  entityName: string,
  body: Record<string, any>,
): Record<string, any> {
  const realCols = ENTITY_REAL_COLUMNS[entityName];
  if (!realCols) {
    logger.warn('[entity] no real columns whitelist for', { entityName: entityName, arg1: '- keeping all' });
    return body;
  }
  const allowed = new Set(realCols);
  allowed.add('_id');
  const filtered: Record<string, any> = {};
  for (const [key, val] of Object.entries(body)) {
    if (allowed.has(key)) {
      filtered[key] = val;
    } else {
      logger.warn('[entity] drop unknown column', { entityName: entityName, key: key });
    }
  }
  return filtered;
}

/** 把前端筛选参数（snake_case key）转成 Bitable 筛选参数（中文 key） */
function mapFilterParams(
  params: Record<string, any> | undefined | null,
  fm: FieldMap,
): Record<string, any> {
  if (!params) return {};
  const out: Record<string, any> = {};
  const enumMapsFilter = collectEnumMaps(fm);
  for (const [key, val] of Object.entries(params)) {
    if (val === undefined || val === null || val === '') continue;
    // keyword 走 keyword 参数
    if (key === 'keyword') {
      out.keyword = val;
      continue;
    }
    // 分页/排序 原样
    if (['page', 'pageSize', 'pageToken', 'sortBy', 'sortOrder'].includes(key)) {
      out[key] = val;
      continue;
    }
    // 日期范围（date_range: [start, end]）
    if (key === 'date_range' && Array.isArray(val)) {
      out.date_range = val;
      continue;
    }
    // 字段映射（枚举 code → 中文）
    const em = enumMapsFilter[key];
    const cnKey = fm.fields[key];
    if (cnKey) {
      out[cnKey] = em && val != null && em[val] ? em[val] : val;
    } else {
      // 没映射的保留（可能是服务端特殊参数）
      out[key] = val;
    }
  }
  // 排序字段也映射
  if (out.sortBy) {
    if (fm.fields[out.sortBy]) {
      out.sortBy = fm.fields[out.sortBy];
    } else if (out.sortBy === 'id' && fm.idField) {
      out.sortBy = fm.idField;
    }
  }
  return out;
}

export interface EntityApi<T = any> {
  list: (params: ListParams) => Promise<ApiResponse<PageResult<T>>>;
  get: (id: string | number) => Promise<ApiResponse<T>>;
  create: (data: Partial<T>) => Promise<ApiResponse<T>>;
  update: (id: string | number, data: Partial<T>) => Promise<ApiResponse<T>>;
  remove: (id: string | number) => Promise<ApiResponse<null>>;
  batchDelete: (ids: (string | number)[]) => Promise<ApiResponse<{ deleted: number }>>;
  batchCreate: (
    rows: Array<Partial<T>>,
  ) => Promise<ApiResponse<Array<{ success: boolean; record_id?: string; error?: string }>>>;
  /** 原始 list（返回 Bitable 原生字段，用于特殊场景） */
  rawList: (params: Record<string, any>) => Promise<ApiResponse<PageResult<Record<string, any>>>>;
}

/**
 * 创建实体 API 实例
 * @param tableKey 逻辑表名（中文，与服务端 config.tableMap 对应）
 * @param fieldMap 字段映射配置
 * @param options.idAsNumber 是否把 record_id 转成数字 id（兼容老页面 Number(id) 用法）
 * @param options.extraMethods 额外业务方法（如 claim/approve 等）
 */
export function createEntityApi<T = any>(
  tableKey: string,
  fieldMap: FieldMap,
  options: {
    idAsNumber?: boolean;
    extraMethods?: Record<string, (...args: any[]) => Promise<any>>;
  } = {},
): EntityApi<T> & Record<string, any> {
  const baseUrl = `/entity/${encodeURIComponent(tableKey)}`;
  const idAsNumber = !!options.idAsNumber;

  // 把前端传进来的数字 id 还原成 Bitable record_id 用的字符串
  const toRecordId = (id: string | number): string => String(id);

  const list: EntityApi<T>['list'] = async (params) => {
    const mapped = mapFilterParams(params, fieldMap);
    const res = await apiGet<PageResult<Record<string, any>>>(baseUrl, mapped);
    if (res.code !== 0 || !res.data) return res as any;
    const list = (res.data.list || []).map((r) => mapFromBitable<T>(r, fieldMap, idAsNumber));
    return {
      ...res,
      data: { ...res.data, list },
    } as any;
  };

  const get: EntityApi<T>['get'] = async (id) => {
    const res = await apiGet<Record<string, any>>(`${baseUrl}/${encodeURIComponent(toRecordId(id))}`);
    if (res.code !== 0 || !res.data) return res as any;
    return { ...res, data: mapFromBitable<T>(res.data, fieldMap, idAsNumber) } as any;
  };

  const generateNo = (prefix: string): string => {
    const now = new Date();
    const y = now.getFullYear();
    const mo = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const h = String(now.getHours()).padStart(2, '0');
    const mi = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    return `${prefix}${y}${mo}${d}${h}${mi}${s}`;
  };

  const create: EntityApi<T>['create'] = async (data) => {
    const enriched = { ...data as Record<string, any> };
    if (fieldMap.noGenerators) {
      for (const [field, prefix] of Object.entries(fieldMap.noGenerators)) {
        if (!enriched[field]) {
          enriched[field] = generateNo(prefix);
        }
      }
    }
    const body = filterBodyForEntity(
      tableKey,
      mapToBitable(enriched, fieldMap),
    );
    const res = await apiPost<Record<string, any>>(baseUrl, body);
    if (res.code !== 0 || !res.data) return res as any;
    return { ...res, data: mapFromBitable<T>(res.data, fieldMap) } as any;
  };

  const update: EntityApi<T>['update'] = async (id, data) => {
    const body = filterBodyForEntity(
      tableKey,
      mapToBitable(data as Record<string, any>, fieldMap),
    );
    const res = await apiPut<Record<string, any>>(`${baseUrl}/${encodeURIComponent(toRecordId(id))}`, body);
    if (res.code !== 0 || !res.data) return res as any;
    return { ...res, data: mapFromBitable<T>(res.data, fieldMap, idAsNumber) } as any;
  };

  const remove: EntityApi<T>['remove'] = async (id) => {
    return apiDelete<null>(`${baseUrl}/${encodeURIComponent(toRecordId(id))}`);
  };

  const batchDelete: EntityApi<T>['batchDelete'] = async (ids) => {
    return apiPost<{ deleted: number }>(`${baseUrl}/batch-delete`, { ids: ids.map(String) });
  };

  const batchCreate: EntityApi<T>['batchCreate'] = async (rows) => {
    const bodies = rows.map((row) =>
      filterBodyForEntity(
        tableKey,
        mapToBitable(row as Record<string, unknown>, fieldMap),
      ),
    );
    return apiPost<Array<{ success: boolean; record_id?: string; error?: string }>>(
      `${baseUrl}/batch-create`,
      { rows: bodies },
    );
  };

  const rawList: EntityApi<T>['rawList'] = async (params) => {
    return apiGet<PageResult<Record<string, any>>>(baseUrl, params);
  };

  return {
    list, get, create, update, remove, batchDelete, batchCreate, rawList,
    ...(options.extraMethods || {}),
  };
}

/** 字符串哈希成数字（用于把 record_id 字符串转成前端需要的数字 id） */
function hashStringToNumber(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) - hash) + s.charCodeAt(i);
    hash |= 0;
  }
  // 确保正数
  return Math.abs(hash);
}
