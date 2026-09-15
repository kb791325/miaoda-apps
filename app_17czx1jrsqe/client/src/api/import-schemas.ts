import * as XLSX from 'xlsx';
import { customersApi, publicLeadsApi, leadsApi, accountApplicationsApi, industryRoisApi } from './entities';

export type ImportFieldKind =
  | 'text'
  | 'required'
  | 'enum'
  | 'number'
  | 'phone'
  | 'email'
  | 'date';

export interface ImportFieldDef {
  key: string;
  label: string;
  kind: ImportFieldKind;
  options?: string[];
  example?: string;
}

export interface ImportSchema {
  type: string;
  tableKey: string;
  dedupKey: string;
  fields: ImportFieldDef[];
}

export interface ImportEntityApi {
  rawList: (params: Record<string, unknown>) => Promise<{
    code: number;
    message?: string;
    data?: { list?: Record<string, unknown>[]; has_more?: boolean; next_page_token?: string };
  }>;
  batchCreate: (rows: Record<string, unknown>[]) => Promise<{
    code: number;
    message?: string;
    data?: Array<{ success: boolean; error?: string }>;
  }>;
}

export const IMPORT_ENTITY_APIS: Record<string, ImportEntityApi> = {
  customer: customersApi,
  publicLeads: publicLeadsApi,
  leads: leadsApi,
  accountApplications: accountApplicationsApi,
  industryRois: industryRoisApi,
};

export interface ImportSchemaEntry {
  key: string;
  schema: ImportSchema;
}

export async function parseImportFile(file: File): Promise<Record<string, unknown>[]> {
  const buf = new Uint8Array(await file.arrayBuffer());
  const wb = XLSX.read(buf, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) return [];
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });
  return raw.map((row) => {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(row)) {
      out[key.replace(/\*+$/, '').trim()] = row[key];
    }
    return out;
  });
}

function normalizeName(value: unknown): string {
  return String(value).trim().toLowerCase();
}

export async function fetchExistingNameSet(schemaKey: string): Promise<Set<string>> {
  const entry = IMPORT_SCHEMA_ENTRIES.find((e) => e.key === schemaKey);
  const api = entry ? IMPORT_ENTITY_APIS[schemaKey] : undefined;
  if (!entry || !api) return new Set<string>();
  const dedupField = entry.schema.fields.find((f) => f.key === entry.schema.dedupKey);
  if (!dedupField) return new Set<string>();
  const out = new Set<string>();
  let pageToken: string | undefined;
  let hasMore = true;
  while (hasMore) {
    const res = await api.rawList({ pageSize: 200, ...(pageToken ? { pageToken } : {}) });
    if (res.code !== 0 || !res.data) throw new Error(res.message || '拉取现有数据失败，无法进行重复校验');
    for (const rec of res.data.list || []) {
      const v = rec[dedupField.label];
      if (v !== undefined && v !== null && String(v).trim() !== '') out.add(normalizeName(v));
    }
    hasMore = !!res.data.has_more && !!res.data.next_page_token;
    pageToken = res.data.next_page_token;
  }
  return out;
}

export interface ImportRowError {
  row: number;
  reason: string;
}

const REQUIRED_KINDS: ImportFieldKind[] = ['required'];

function validateCell(
  field: ImportFieldDef,
  raw: unknown,
): string | null {
  const value = typeof raw === 'string' ? raw.trim() : raw;
  const isEmpty = value === undefined || value === null || value === '';
  if (isEmpty) {
    if (REQUIRED_KINDS.includes(field.kind)) {
      return `${field.label} 为必填项`;
    }
    return null;
  }
  if (field.kind === 'enum' && field.options && !field.options.includes(String(value))) {
    return `${field.label} 只允许：${field.options.join('/')}`;
  }
  if (field.kind === 'phone') {
    const s = String(value);
    if (!/^1\d{10}$/.test(s)) {
      return `${field.label} 需为 11 位手机号`;
    }
  }
  if (field.kind === 'email') {
    const s = String(value);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) {
      return `${field.label} 邮箱格式不正确`;
    }
  }
  if (field.kind === 'number') {
    if (Number.isNaN(Number(value))) {
      return `${field.label} 需为数字`;
    }
  }
  return null;
}

export function validateImportRows(
  schema: ImportSchema,
  rows: Record<string, unknown>[],
): ImportRowError[] {
  const errors: ImportRowError[] = [];
  rows.forEach((row, idx) => {
    for (const field of schema.fields) {
      const raw = row[field.label];
      const reason = validateCell(field, raw);
      if (reason) {
        errors.push({ row: idx + 1, reason });
      }
    }
  });
  return errors;
}

export function rowsToEntityPayloads(
  schema: ImportSchema,
  rows: Record<string, unknown>[],
): Record<string, unknown>[] {
  return rows.map((row) => {
    const payload: Record<string, unknown> = {};
    for (const field of schema.fields) {
      const raw = row[field.label];
      if (raw === undefined || raw === null || raw === '') continue;
      if (field.kind === 'number') {
        const num = Number(raw);
        payload[field.key] = Number.isNaN(num) ? raw : num;
      } else {
        payload[field.key] = typeof raw === 'string' ? raw.trim() : raw;
      }
    }
    return payload;
  });
}

function templateFileName(type: string, ext: 'xlsx' | 'csv'): string {
  return `导入模板_${type}_${new Date().toISOString().slice(0, 10)}.${ext}`;
}

function triggerDownload(content: ArrayBuffer, fileName: string) {
  const blob = new Blob([content], {
    type: 'application/octet-stream',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadImportTemplate(schema: ImportSchema, ext: 'xlsx' | 'csv' = 'xlsx') {
  const header = schema.fields.map((f) => (REQUIRED_KINDS.includes(f.kind) ? `${f.label}*` : f.label));
  const hintRow = schema.fields.map((f) => {
    if (f.kind === 'enum' && f.options) return f.options.join('/');
    if (f.kind === 'number') return f.example || '数字';
    if (f.kind === 'phone') return '11位手机号';
    if (f.kind === 'email') return 'name@example.com';
    if (f.kind === 'date') return 'YYYY-MM-DD';
    return f.example || '';
  });
  if (ext === 'csv') {
    const csv = [header, hintRow]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = templateFileName(schema.type, 'csv');
    a.click();
    URL.revokeObjectURL(url);
    return;
  }
  const ws = XLSX.utils.aoa_to_sheet([header, hintRow]);
  ws['!cols'] = schema.fields.map(() => ({ wch: 18 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '导入模板');
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  triggerDownload(out as ArrayBuffer, templateFileName(schema.type, 'xlsx'));
}

export const CUSTOMER_IMPORT_SCHEMA: ImportSchema = {
  type: '客户导入',
  tableKey: '客户管理',
  dedupKey: 'customer_name',
  fields: [
    { key: 'customer_name', label: '客户名称', kind: 'required' },
    { key: 'customer_no', label: '客户编号', kind: 'text' },
    { key: 'group_name', label: '集团名称', kind: 'text' },
    {
      key: 'primary_industry',
      label: '一级行业',
      kind: 'enum',
      options: ['电商', '教育', '游戏', '金融', '本地生活', '家居', '美妆', '其他'],
    },
    { key: 'secondary_industry', label: '二级行业', kind: 'text' },
    {
      key: 'level',
      label: '客户等级',
      kind: 'enum',
      options: ['A', 'B', 'C', 'D'],
    },
    {
      key: 'status',
      label: '客户状态',
      kind: 'enum',
      options: ['合作中', '待激活', '已冻结', '已流失'],
    },
    { key: 'owner_name', label: '负责商务', kind: 'text' },
    {
      key: 'department',
      label: '所属部门',
      kind: 'enum',
      options: ['商务一部', '商务二部', '商务三部', '渠道部'],
    },
    { key: 'contact_name', label: '联系人', kind: 'text' },
    { key: 'contact_phone', label: '联系电话', kind: 'phone' },
    { key: 'email', label: '邮箱', kind: 'email' },
    { key: 'address', label: '地址', kind: 'text' },
    { key: 'total_recharge', label: '累计充值', kind: 'number' },
    { key: 'total_consume', label: '累计消耗', kind: 'number' },
    { key: 'remark', label: '备注', kind: 'text' },
  ],
};

export const PUBLIC_LEAD_IMPORT_SCHEMA: ImportSchema = {
  type: '公海客资导入',
  tableKey: '客户-公海客资',
  dedupKey: 'entity_name',
  fields: [
    { key: 'entity_name', label: '主体名称', kind: 'required' },
    { key: 'lead_no', label: '客资编号', kind: 'text' },
    { key: 'lead_level', label: '客资分层', kind: 'text' },
    { key: 'primary_industry', label: '一级行业', kind: 'text' },
    { key: 'secondary_industry', label: '二级行业', kind: 'text' },
    { key: 'assign_status', label: '分配状态', kind: 'text' },
    { key: 'owner_name', label: '负责人', kind: 'text' },
    { key: 'source', label: '客资来源', kind: 'text' },
    { key: 'pool_time', label: '调入公海时间', kind: 'date', example: '2026-08-01' },
    { key: 'creator_name', label: '创建人', kind: 'text' },
    { key: 'remark', label: '备注', kind: 'text' },
  ],
};

export const LEAD_IMPORT_SCHEMA: ImportSchema = {
  type: '线索导入',
  tableKey: '客户-线索',
  dedupKey: 'lead_name',
  fields: [
    { key: 'lead_name', label: '线索名称', kind: 'required' },
    { key: 'lead_no', label: '线索编号', kind: 'text' },
    { key: 'company_name', label: '公司名称', kind: 'text' },
    { key: 'contact_name', label: '联系人', kind: 'text' },
    { key: 'phone', label: '联系电话', kind: 'phone' },
    { key: 'source', label: '线索来源', kind: 'text' },
    { key: 'status', label: '跟进状态', kind: 'text' },
    { key: 'owner_name', label: '负责人', kind: 'text' },
    { key: 'last_follow_at', label: '最近跟进时间', kind: 'date', example: '2026-08-01' },
    { key: 'requirement', label: '需求描述', kind: 'text' },
  ],
};

export const ACCOUNT_OPEN_IMPORT_SCHEMA: ImportSchema = {
  type: '开户申请导入',
  tableKey: '广告-开户申请',
  dedupKey: 'apply_no',
  fields: [
    { key: 'apply_no', label: '申请编号', kind: 'text' },
    { key: 'group_name', label: '集团名称', kind: 'text' },
    { key: 'entity_name', label: '主体名称', kind: 'required' },
    {
      key: 'port',
      label: '端口',
      kind: 'enum',
      options: ['巨量千川', '腾讯广告', '磁力引擎', '百度营销', '小红书', '其他'],
    },
    {
      key: 'industry',
      label: '行业',
      kind: 'enum',
      options: ['电商', '教育', '游戏', '金融', '本地生活', '家居', '美妆', '医疗', '其他'],
    },
    { key: 'apply_amount', label: '申请金额', kind: 'number' },
    {
      key: 'status',
      label: '状态',
      kind: 'enum',
      options: ['待审批', '审批中', '已通过', '已驳回', '已开户'],
    },
    { key: 'applicant', label: '申请人', kind: 'text' },
    { key: 'apply_dept', label: '申请部门', kind: 'text' },
    { key: 'current_approver', label: '当前审批人', kind: 'text' },
    { key: 'remark', label: '备注', kind: 'text' },
  ],
};

export const INDUSTRY_ROI_IMPORT_SCHEMA: ImportSchema = {
  type: '行业ROI导入',
  tableKey: '业务-行业ROI',
  dedupKey: 'industry_name',
  fields: [
    { key: 'industry_name', label: '行业名称', kind: 'required', example: '美妆个护' },
    { key: 'platform', label: '平台', kind: 'enum', options: ['巨量千川', '腾讯广告', '磁力引擎', '小红书'] },
    { key: 'roi_base', label: 'ROI基准', kind: 'number', example: '1.85' },
    { key: 'avg_cpc', label: '平均CPC', kind: 'number', example: '0.85' },
    { key: 'avg_cvr', label: '平均CVR', kind: 'number', example: '3.2' },
    { key: 'remark', label: '备注', kind: 'text' },
  ],
};

export const IMPORT_SCHEMAS: Record<string, ImportSchema> = {
  customer: CUSTOMER_IMPORT_SCHEMA,
  publicLeads: PUBLIC_LEAD_IMPORT_SCHEMA,
  leads: LEAD_IMPORT_SCHEMA,
  accountApplications: ACCOUNT_OPEN_IMPORT_SCHEMA,
  industryRois: INDUSTRY_ROI_IMPORT_SCHEMA,
};

export const IMPORT_SCHEMA_ENTRIES: ImportSchemaEntry[] = [
  { key: 'customer', schema: CUSTOMER_IMPORT_SCHEMA },
  { key: 'publicLeads', schema: PUBLIC_LEAD_IMPORT_SCHEMA },
  { key: 'leads', schema: LEAD_IMPORT_SCHEMA },
  { key: 'accountApplications', schema: ACCOUNT_OPEN_IMPORT_SCHEMA },
  { key: 'industryRois', schema: INDUSTRY_ROI_IMPORT_SCHEMA },
];
