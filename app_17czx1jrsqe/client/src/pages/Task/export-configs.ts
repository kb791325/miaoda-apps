/**
 * 批量导出真实化配置与执行逻辑（T-04）
 * 表头与字段顺序 = server/modules/data/entity-tables.ts 各表 fields 顺序（中文列名）。
 * 数据来源：GET /api/entity/<tableKey>（page/pageSize 翻页取全量，字段键为中文列名）。
 */
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import { extractErrorMessage } from '@/lib/error-utils';

export interface ExportTypeInfo {
  key: string;
  label: string;
  tableKey: string;
  columns: string[];
}

export interface UnavailableExportType {
  key: string;
  label: string;
  available: false;
}

const PUBLIC_LEADS_COLUMNS = [
  '客资编号', '主体名称', '客资分层', '一级行业', '二级行业', '分配状态',
  '创建人', '客资来源', '调入公海时间', '负责人', '备注', '创建时间',
];

const INVALID_LEADS_COLUMNS = [
  '客资编号', '主体名称', '客资分层', '一级行业', '二级行业', '分配状态',
  '创建人', '客资来源', '调入公海时间', '负责人', '备注', '创建时间', '无效原因', '标记无效时间',
];

const LEADS_COLUMNS = [
  '线索编号', '线索名称', '公司名称', '线索来源', '跟进状态', '负责人',
  '联系电话', '邮箱', '备注', '最近跟进时间', '联系人', '需求描述', '创建人', '创建时间',
];

const ACCOUNT_APPLICATION_COLUMNS = [
  '申请编号', '集团名称', '主体名称', '端口', '行业', '申请金额', '状态',
  '申请人', '申请部门', '当前审批人', '备注', '创建时间', '更新时间',
];

const CUSTOMER_TRANSACTION_COLUMNS = [
  '流水编号', '客户名称', '主体名称', '交易类型', '收入金额', '支出金额',
  '账户余额', '备注', '交易时间',
];

const CUSTOMER_COLUMNS = [
  '客户编号', '客户名称', '集团名称', '一级行业', '二级行业', '客户等级', '客户状态',
  '负责商务', '所属部门', '联系人', '联系电话', '邮箱', '地址', '累计充值', '累计消耗',
  '备注', '创建时间', '更新时间',
];

const INDUSTRY_ROI_COLUMNS = [
  '行业名称', '平台', 'ROI基准', '平均CPC', '平均CVR', '备注', '创建时间', '更新时间',
];

export const AVAILABLE_EXPORT_TYPES: ExportTypeInfo[] = [
  { key: 'publicLeads', label: '公海客资', tableKey: '客户-公海客资', columns: PUBLIC_LEADS_COLUMNS },
  { key: 'invalidLeads', label: '无效客资', tableKey: '客户-无效客资', columns: INVALID_LEADS_COLUMNS },
  { key: 'leads', label: '线索', tableKey: '客户-线索', columns: LEADS_COLUMNS },
  { key: 'accountApplications', label: '开户申请', tableKey: '广告-开户申请', columns: ACCOUNT_APPLICATION_COLUMNS },
  { key: 'financeTransactions', label: '财务明细', tableKey: '财务-客户流水', columns: CUSTOMER_TRANSACTION_COLUMNS },
  { key: 'customers', label: '客户管理', tableKey: '客户管理', columns: CUSTOMER_COLUMNS },
  { key: 'industryRois', label: '行业ROI', tableKey: '业务-行业ROI', columns: INDUSTRY_ROI_COLUMNS },
];

export const UNAVAILABLE_EXPORT_TYPES: UnavailableExportType[] = [
  { key: 'employees', label: '员工', available: false },
  { key: 'attendance', label: '考勤', available: false },
  { key: 'contracts', label: '合同', available: false },
];

const PAGE_SIZE = 200;
const MAX_PAGES = 200;

interface EntityListEnvelope {
  code?: number;
  message?: string;
  data?: {
    list?: Record<string, unknown>[];
    total?: number;
    has_more?: boolean;
    next_page_token?: string;
  } | null;
}

export interface ExportConditions {
  tableKey: string;
  keyword: string;
}

export function encodeExportConditions(conditions: ExportConditions): string {
  return JSON.stringify({ tableKey: conditions.tableKey, keyword: conditions.keyword });
}

export function describeExportConditions(raw: unknown): string {
  if (typeof raw !== 'string' || !raw.trim()) return '全部数据';
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && 'tableKey' in parsed) {
      const c = parsed as { keyword?: unknown };
      return typeof c.keyword === 'string' && c.keyword.trim() ? `关键字：${c.keyword}` : '全部数据';
    }
  } catch {
    return raw;
  }
  return raw;
}

export function resolveRedownloadTarget(
  rawConditions: unknown,
  taskType: unknown,
): ExportConditions | null {
  if (typeof rawConditions === 'string' && rawConditions.trim().startsWith('{')) {
    try {
      const parsed: unknown = JSON.parse(rawConditions);
      if (parsed && typeof parsed === 'object' && 'tableKey' in parsed) {
        const c = parsed as { tableKey?: unknown; keyword?: unknown };
        if (typeof c.tableKey === 'string' && c.tableKey) {
          return {
            tableKey: c.tableKey,
            keyword: typeof c.keyword === 'string' ? c.keyword : '',
          };
        }
      }
    } catch {
      // 继续按旧格式解析
    }
  }
  const label = typeof taskType === 'string' ? taskType : '';
  const matched = AVAILABLE_EXPORT_TYPES.find((t) => t.label === label);
  if (!matched) return null;
  let keyword = '';
  if (typeof rawConditions === 'string' && rawConditions.startsWith('关键字：')) {
    keyword = rawConditions.slice('关键字：'.length);
  }
  return { tableKey: matched.tableKey, keyword };
}

export async function fetchAllEntityRows(
  tableKey: string,
  keyword: string,
): Promise<Record<string, unknown>[]> {
  const out: Record<string, unknown>[] = [];
  let page = 1;
  let total: number | null = null;
  while (page <= MAX_PAGES) {
    let res;
    try {
      res = await axiosForBackend.get(`/api/entity/${encodeURIComponent(tableKey)}`, {
        params: { page, pageSize: PAGE_SIZE, ...(keyword ? { keyword } : {}) },
      });
    } catch (e) {
      throw new Error(extractErrorMessage(e));
    }
    const body = (res.data ?? {}) as EntityListEnvelope;
    if (body.code !== 0 || !body.data) {
      throw new Error(body.message || `拉取 ${tableKey} 数据失败`);
    }
    const items = body.data.list || [];
    out.push(...items);
    total = typeof body.data.total === 'number' ? body.data.total : null;
    if (total !== null && out.length >= total) break;
    if (items.length === 0) break;
    page += 1;
  }
  return out;
}

function normalizeCell(value: unknown): string {
  if (value === undefined || value === null) return '';
  if (Array.isArray(value)) {
    return value.map((v) => normalizeCell(v)).filter((s) => s !== '').join(', ');
  }
  if (typeof value === 'object') {
    const o = value as { name?: unknown; text?: unknown };
    return normalizeCell(o.name !== undefined ? o.name : o.text);
  }
  return String(value);
}

function csvEscape(text: string): string {
  return `"${text.replace(/"/g, '""')}"`;
}

export function buildCsv(typeLabel: string, columns: string[], rows: Record<string, unknown>[]): string {
  const lines = [columns.map(csvEscape).join(',')];
  for (const row of rows) {
    lines.push(columns.map((c) => csvEscape(normalizeCell(row[c]))).join(','));
  }
  return lines.join('\r\n');
}

export function downloadCsv(typeLabel: string, columns: string[], rows: Record<string, unknown>[]): string {
  const csv = buildCsv(typeLabel, columns, rows);
  const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const date = new Date().toISOString().slice(0, 10);
  const fileName = `${typeLabel}导出_${date}.csv`;
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
  return fileName;
}
