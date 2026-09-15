import { customersApi, publicLeadsApi, invalidLeadsApi, leadsApi, accountApplicationsApi, transactionsApi, industryRoisApi } from '@/api';
import * as XLSX from 'xlsx';

export interface ExportColumn {
  key: string;
  label: string;
}

export interface ExportSchema {
  type: string;
  available: boolean;
  reason?: string;
  columns: ExportColumn[];
  fetchAll?: () => Promise<Record<string, unknown>[]>;
}

type EntityApiLike = {
  rawList?: (params: Record<string, unknown>) => Promise<{ code: number; message?: string; data?: { list?: Record<string, unknown>[]; has_more?: boolean; next_page_token?: string } }>;
};

async function fetchAllPages(api: EntityApiLike): Promise<Record<string, unknown>[]> {
  if (!api.rawList) return [];
  const out: Record<string, unknown>[] = [];
  let pageToken: string | undefined;
  let hasMore = true;
  while (hasMore) {
    const res = await api.rawList({ pageSize: 200, ...(pageToken ? { pageToken } : {}) });
    if (res.code !== 0 || !res.data) throw new Error(res.message || '拉取导出数据失败');
    out.push(...(res.data.list || []));
    hasMore = !!res.data.has_more && !!res.data.next_page_token;
    pageToken = res.data.next_page_token;
  }
  return out;
}

export const EXPORT_SCHEMAS: Record<string, ExportSchema> = {
  customer: {
    type: '客户导出',
    available: true,
    columns: [
      { key: 'customer_no', label: '客户编号' },
      { key: 'customer_name', label: '客户名称' },
      { key: 'group_name', label: '集团名称' },
      { key: 'primary_industry', label: '一级行业' },
      { key: 'secondary_industry', label: '二级行业' },
      { key: 'level', label: '客户等级' },
      { key: 'status', label: '客户状态' },
      { key: 'owner_name', label: '负责商务' },
      { key: 'department', label: '所属部门' },
      { key: 'contact_name', label: '联系人' },
      { key: 'contact_phone', label: '联系电话' },
      { key: 'email', label: '邮箱' },
      { key: 'address', label: '地址' },
      { key: 'total_recharge', label: '累计充值' },
      { key: 'total_consume', label: '累计消耗' },
      { key: 'remark', label: '备注' },
    ],
    fetchAll: () => fetchAllPages(customersApi),
  },
  publicLeads: {
    type: '公海客资导出',
    available: true,
    columns: [
      { key: 'lead_no', label: '客资编号' },
      { key: 'entity_name', label: '主体名称' },
      { key: 'lead_level', label: '客资分层' },
      { key: 'primary_industry', label: '一级行业' },
      { key: 'secondary_industry', label: '二级行业' },
      { key: 'assign_status', label: '分配状态' },
      { key: 'owner_name', label: '负责人' },
      { key: 'source', label: '客资来源' },
      { key: 'pool_time', label: '调入公海时间' },
      { key: 'creator_name', label: '创建人' },
      { key: 'remark', label: '备注' },
    ],
    fetchAll: () => fetchAllPages(publicLeadsApi),
  },
  invalidLeads: {
    type: '无效客资导出',
    available: true,
    columns: [
      { key: 'lead_no', label: '客资编号' },
      { key: 'entity_name', label: '主体名称' },
      { key: 'lead_level', label: '客资分层' },
      { key: 'primary_industry', label: '一级行业' },
      { key: 'secondary_industry', label: '二级行业' },
      { key: 'assign_status', label: '分配状态' },
      { key: 'owner_name', label: '负责人' },
      { key: 'source', label: '客资来源' },
      { key: 'invalid_at', label: '标记无效时间' },
      { key: 'invalid_reason', label: '无效原因' },
      { key: 'creator_name', label: '创建人' },
      { key: 'remark', label: '备注' },
    ],
    fetchAll: () => fetchAllPages(invalidLeadsApi),
  },
  leads: {
    type: '线索导出',
    available: true,
    columns: [
      { key: 'lead_no', label: '线索编号' },
      { key: 'lead_name', label: '线索名称' },
      { key: 'company_name', label: '公司名称' },
      { key: 'contact_name', label: '联系人' },
      { key: 'phone', label: '联系电话' },
      { key: 'source', label: '线索来源' },
      { key: 'status', label: '跟进状态' },
      { key: 'owner_name', label: '负责人' },
      { key: 'last_follow_at', label: '最近跟进时间' },
      { key: 'requirement', label: '需求描述' },
    ],
    fetchAll: () => fetchAllPages(leadsApi),
  },
  accountApplications: {
    type: '开户申请导出',
    available: true,
    columns: [
      { key: 'apply_no', label: '申请编号' },
      { key: 'group_name', label: '集团名称' },
      { key: 'entity_name', label: '主体名称' },
      { key: 'port', label: '端口' },
      { key: 'industry', label: '行业' },
      { key: 'apply_amount', label: '申请金额' },
      { key: 'status', label: '状态' },
      { key: 'applicant', label: '申请人' },
      { key: 'apply_dept', label: '申请部门' },
      { key: 'current_approver', label: '当前审批人' },
      { key: 'remark', label: '备注' },
    ],
    fetchAll: () => fetchAllPages(accountApplicationsApi),
  },
  financeTransactions: {
    type: '财务明细导出',
    available: true,
    columns: [
      { key: 'serial_no', label: '流水编号' },
      { key: 'customer_name', label: '客户名称' },
      { key: 'entity_name', label: '主体名称' },
      { key: 'tx_type', label: '交易类型' },
      { key: 'income_amount', label: '收入金额' },
      { key: 'expense_amount', label: '支出金额' },
      { key: 'balance', label: '账户余额' },
      { key: 'remark', label: '备注' },
      { key: 'created_at', label: '交易时间' },
    ],
    fetchAll: () => fetchAllPages(transactionsApi),
  },
  industryRois: {
    type: '行业ROI导出',
    available: true,
    columns: [
      { key: 'industry_name', label: '行业名称' },
      { key: 'platform', label: '平台' },
      { key: 'roi_base', label: 'ROI基准' },
      { key: 'avg_cpc', label: '平均CPC' },
      { key: 'avg_cvr', label: '平均CVR' },
      { key: 'remark', label: '备注' },
    ],
    fetchAll: () => fetchAllPages(industryRoisApi),
  },
  employees: {
    type: '员工导出',
    available: false,
    reason: '模块未开放',
    columns: [],
  },
  attendance: {
    type: '考勤导出',
    available: false,
    reason: '模块未开放',
    columns: [],
  },
  contracts: {
    type: '合同导出',
    available: false,
    reason: '模块未开放',
    columns: [],
  },
};

function exportFileName(type: string, ext: 'xlsx' | 'csv'): string {
  return `${type}_${new Date().toISOString().slice(0, 10)}.${ext}`;
}

export async function fetchAllRows(schema: ExportSchema): Promise<Record<string, unknown>[]> {
  if (!schema.available || !schema.fetchAll) {
    throw new Error('该导出类型暂未开放');
  }
  return schema.fetchAll();
}

export function downloadExportFile(
  schema: ExportSchema,
  rows: Record<string, unknown>[],
  ext: 'xlsx' | 'csv' = 'xlsx',
): string {
  const header = schema.columns.map((c) => c.label);
  const matrix: (string | number)[][] = rows.map((row) =>
    schema.columns.map((c) => {
      const v = row[c.label] ?? row[c.key];
      if (v === undefined || v === null) return '';
      if (Array.isArray(v)) return v.map((x) => (typeof x === 'object' ? (x as { name?: string }).name ?? '' : String(x))).join(', ');
      return v as string | number;
    }),
  );
  if (ext === 'csv') {
    const csv = [header, ...matrix]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = exportFileName(schema.type, 'csv');
    a.click();
    URL.revokeObjectURL(url);
  } else {
    const ws = XLSX.utils.aoa_to_sheet([header, ...matrix]);
    ws['!cols'] = schema.columns.map(() => ({ wch: 16 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, schema.type.slice(0, 28));
    const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([out as ArrayBuffer], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = exportFileName(schema.type, 'xlsx');
    a.click();
    URL.revokeObjectURL(url);
  }
  return exportFileName(schema.type, ext);
}

export async function runExport(
  schema: ExportSchema,
  ext: 'xlsx' | 'csv' = 'xlsx',
): Promise<number> {
  const rows = await fetchAllRows(schema);
  downloadExportFile(schema, rows, ext);
  return rows.length;
}
