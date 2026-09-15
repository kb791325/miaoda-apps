import { capabilityClient } from '@lark-apaas/client-toolkit';
import { MODULES, type IModuleConfig } from '@/config/modules';

export interface ApprovalTableMapping {
  moduleKey: string;
  typeLabel: string;
  statusField: string;
  titleField: string;
  submitterField: string;
  approverField: string;
  approvedValue: string;
  rejectedValue: string;
  timeField: string;
  noun: string;
  route: string;
  /** 纳入审批聚合的状态值列表（不同表的状态字段名不同、阈值不同） */
  includeStatuses: string[];
  /** 多维表格中状态列的真实列名（用于写回时绕过模块字段映射） */
  bitableStatusField: string;
}

export interface ApprovalItem {
  recordId: string;
  title: string;
  typeLabel: string;
  submitter: string;
  submitterId: string;
  approver: string;
  approverId: string;
  status: string;
  time: string;
  config: ApprovalTableMapping;
}

export interface ApprovalFetchResult {
  items: ApprovalItem[];
  failedTables: string[];
}

/** 18 张来源表审批配置 —— 逐表精确定义状态字段名、纳入阈值、通过/驳回写入值 */
const APPROVAL_TABLES: ApprovalTableMapping[] = [
  {
    moduleKey: 'adOpen', typeLabel: '开户申请',
    statusField: 'status', bitableStatusField: '申请状态',
    titleField: 'f4', submitterField: 'applicant', approverField: 'approver',
    approvedValue: '已通过', rejectedValue: '已驳回',
    timeField: 'f20', noun: '开户申请', route: '/sub/adOpen',
    includeStatuses: ['待审批', '审批中'],
  },
  {
    moduleKey: 'adTransfer', typeLabel: '转户申请',
    statusField: 'status', bitableStatusField: '转户状态',
    titleField: 'f1', submitterField: 'applicant', approverField: 'approver',
    approvedValue: '已通过', rejectedValue: '已驳回',
    timeField: 'f18', noun: '转户申请', route: '/sub/adTransfer',
    includeStatuses: ['待审批', '审批中'],
  },
  {
    moduleKey: 'adCommission', typeLabel: '广告提成',
    statusField: 'status', bitableStatusField: '提成状态',
    titleField: 'f0', submitterField: 'applicant', approverField: 'approver',
    approvedValue: '已通过', rejectedValue: '已驳回',
    timeField: 'f9', noun: '广告提成', route: '/sub/adCommission',
    includeStatuses: ['待审批', '审批中'],
  },
  {
    moduleKey: 'videoCommission', typeLabel: '视频提成',
    statusField: 'status', bitableStatusField: '提成状态',
    titleField: 'f11', submitterField: 'applicant', approverField: 'approver',
    approvedValue: '已通过', rejectedValue: '已驳回',
    timeField: 'f13', noun: '视频提成', route: '/sub/videoCommission',
    includeStatuses: ['待审批', '审批中'],
  },
  {
    moduleKey: 'contract', typeLabel: '合同',
    statusField: 'status', bitableStatusField: '合同状态',
    titleField: 'name', submitterField: 'f8', approverField: 'approver',
    approvedValue: '待盖章', rejectedValue: '已驳回',
    timeField: 'f0', noun: '合同', route: '/contracts',
    includeStatuses: ['待审批', '审批中'],
  },
  {
    moduleKey: 'refund', typeLabel: '退款',
    statusField: 'status', bitableStatusField: '退款状态',
    titleField: 'f1', submitterField: 'applicant', approverField: 'approver',
    approvedValue: '待退款', rejectedValue: '已驳回',
    timeField: 'f12', noun: '退款', route: '/sub/refund',
    includeStatuses: ['待审批', '审批中'],
  },
  {
    moduleKey: 'invoice', typeLabel: '发票',
    statusField: 'f9', bitableStatusField: '发票状态',
    titleField: 'f18', submitterField: 'creator', approverField: 'approver',
    approvedValue: '待开票', rejectedValue: '已驳回',
    timeField: 'applyDate', noun: '发票', route: '/sub/invoice',
    includeStatuses: ['待审批', '审批中'],
  },
  {
    moduleKey: 'coinReturn', typeLabel: '退币',
    statusField: 'f3', bitableStatusField: '退币状态',
    titleField: 'f4', submitterField: 'applicant', approverField: 'creator',
    approvedValue: '已通过', rejectedValue: '已驳回',
    timeField: 'f1', noun: '退币', route: '/sub/coinReturn',
    includeStatuses: ['待审批', '审批中'],
  },
  {
    moduleKey: 'deduct', typeLabel: '扣减',
    statusField: 'status', bitableStatusField: '审批状态',
    titleField: 'f0', submitterField: 'creator', approverField: 'operator',
    approvedValue: '已通过', rejectedValue: '已驳回',
    timeField: 'f10', noun: '扣减', route: '/sub/deduct',
    includeStatuses: ['待审批', '审批中'],
  },
  {
    moduleKey: 'advance', typeLabel: '垫款',
    statusField: 'status', bitableStatusField: '申请状态',
    titleField: 'f13', submitterField: 'applicant', approverField: 'approver',
    approvedValue: '已通过', rejectedValue: '已驳回',
    timeField: 'f6', noun: '垫款', route: '/sub/advance',
    includeStatuses: ['待审批', '审批中'],
  },
  {
    moduleKey: 'incentive', typeLabel: '激励',
    statusField: 'status', bitableStatusField: '审批状态',
    titleField: 'f10', submitterField: 'applicant', approverField: 'approver',
    approvedValue: '已通过', rejectedValue: '已驳回',
    timeField: 'f9', noun: '激励', route: '/sub/incentive',
    includeStatuses: ['待审批', '审批中'],
  },
  {
    moduleKey: 'expense', typeLabel: '支出',
    statusField: 'status', bitableStatusField: '审批状态',
    titleField: 'f11', submitterField: 'applicant', approverField: 'approver',
    approvedValue: '已通过', rejectedValue: '已驳回',
    timeField: 'f5', noun: '支出', route: '/sub/expense',
    includeStatuses: ['待审批', '审批中'],
  },
  {
    moduleKey: 'reimburse', typeLabel: '费用报销',
    statusField: 'status', bitableStatusField: '审批状态',
    titleField: 'f3', submitterField: 'f19', approverField: 'f10',
    approvedValue: '已通过', rejectedValue: '已驳回',
    timeField: 'f12', noun: '费用报销', route: '/sub/reimburse',
    includeStatuses: ['待审批', '审批中'],
  },
  {
    moduleKey: 'deposit', typeLabel: '保证金押金',
    statusField: 'f10', bitableStatusField: '退还状态',
    titleField: 'f1', submitterField: 'creator', approverField: 'owner',
    approvedValue: '可退还', rejectedValue: '已扣除',
    timeField: 'f6', noun: '保证金押金', route: '/sub/deposit',
    includeStatuses: ['已申请', '审批中'],
  },
  {
    moduleKey: 'attendance', typeLabel: '考勤',
    statusField: 'status', bitableStatusField: '审批状态',
    titleField: 'f3', submitterField: 'employee', approverField: 'approver',
    approvedValue: '已通过', rejectedValue: '已驳回',
    timeField: 'f19', noun: '考勤', route: '/sub/attendance',
    includeStatuses: ['待审批'],
  },
  {
    moduleKey: 'performance', typeLabel: '绩效',
    statusField: 'status', bitableStatusField: '审批状态',
    titleField: 'f5', submitterField: 'employee', approverField: 'approver',
    approvedValue: '已通过', rejectedValue: '已驳回',
    timeField: 'f8', noun: '绩效', route: '/sub/performance',
    includeStatuses: ['待审批'],
  },
  {
    moduleKey: 'purchaseOrder', typeLabel: '采购申请',
    statusField: '申请状态', bitableStatusField: '申请状态',
    titleField: 'code', submitterField: 'applicant', approverField: 'approver',
    approvedValue: '已通过', rejectedValue: '已驳回',
    timeField: 'f0', noun: '采购申请', route: '/sub/purchaseOrder',
    includeStatuses: ['待审批', '审批中'],
  },
  {
    moduleKey: 'stockUse', typeLabel: '领用',
    statusField: 'status', bitableStatusField: '审批状态',
    titleField: 'f2', submitterField: 'f1', approverField: 'approver',
    approvedValue: '已通过', rejectedValue: '已驳回',
    timeField: 'f12', noun: '领用', route: '/sub/stockUse',
    includeStatuses: ['待审批'],
  },
];

function extractText(val: unknown): string {
  if (val == null) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'number') return String(val);
  if (Array.isArray(val)) return val.map((v: unknown) => extractText(v)).join(', ');
  if (typeof val === 'object') {
    const obj = val as Record<string, unknown>;
    if (obj.text) return String(obj.text);
    if (obj.name) return String(obj.name);
    return JSON.stringify(val);
  }
  return String(val);
}

/**
 * 归一化多维表格单选/多选字段值，兼容：
 * ① 裸字符串 "待审批"
 * ② 数组 ["待审批"]（取第一个非空）
 * ③ 对象 {text:"待审批"} / {name:"待审批"}
 * ④ 以上混合数组 [{text:"待审批"}]
 * 统一返回纯文本；空值返回空字符串
 */
function normalizeSelect(val: unknown): string {
  if (val == null) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'number') return String(val);
  if (typeof val === 'boolean') return val ? '是' : '否';
  if (Array.isArray(val)) {
    for (const item of val as unknown[]) {
      const v = normalizeSelect(item);
      if (v) return v;
    }
    return '';
  }
  if (typeof val === 'object') {
    const obj = val as Record<string, unknown>;
    if (obj.text) return String(obj.text);
    if (obj.name) return String(obj.name);
    return '';
  }
  return String(val);
}

function extractUserId(val: unknown): string {
  if (val == null) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'object') {
    const obj = val as Record<string, unknown>;
    if (obj.id) return String(obj.id);
    if (obj.user_id) return String(obj.user_id);
  }
  return '';
}

function getModuleInstance(moduleKey: string): string {
  const mainInstances: Record<string, string> = {
    customer: 'feishu_multitable_crud_analysis_1',
    ad: 'feishu_multitable_crud_analysis_2',
    video: 'feishu_multitable_crud_analysis_3',
    contract: 'feishu_multitable_crud_analysis_4',
    finance: 'feishu_multitable_crud_analysis_5',
    hr: 'feishu_multitable_crud_analysis_6',
    admin: 'feishu_multitable_crud_analysis_7',
    task: 'feishu_multitable_crud_analysis_8',
    system: 'feishu_multitable_crud_analysis_9',
    support: 'feishu_multitable_crud_analysis_10',
  };
  const subInstances: Record<string, string> = {
    adOpen: 'feishu_multitable_crud_analysis_15',
    adTransfer: 'feishu_multitable_crud_analysis_18',
    adCommission: 'feishu_multitable_crud_analysis_19',
    videoCommission: 'feishu_multitable_crud_analysis_24',
    refund: 'feishu_multitable_crud_analysis_31',
    coinReturn: 'feishu_multitable_crud_analysis_32',
    deduct: 'feishu_multitable_crud_analysis_34',
    advance: 'feishu_multitable_crud_analysis_35',
    incentive: 'feishu_multitable_crud_analysis_36',
    expense: 'feishu_multitable_crud_analysis_38',
    reimburse: 'feishu_multitable_crud_analysis_39',
    deposit: 'feishu_multitable_crud_analysis_40',
    invoice: 'feishu_multitable_crud_analysis_41',
    attendance: 'feishu_multitable_crud_analysis_45',
    performance: 'feishu_multitable_crud_analysis_51',
    purchaseOrder: 'feishu_multitable_crud_analysis_54',
    stockUse: 'feishu_multitable_crud_analysis_57',
  };
  return subInstances[moduleKey] ?? mainInstances[moduleKey] ?? '';
}

interface RawRecord {
  recordId: string;
  values: Record<string, string | number>;
}

async function fetchTableRecords(
  cfg: ApprovalTableMapping,
): Promise<RawRecord[]> {
  const instanceId = getModuleInstance(cfg.moduleKey);
  if (!instanceId) throw new Error(`缺少插件实例: ${cfg.moduleKey}`);

  const allRecords: RawRecord[] = [];
  let pageToken: string | undefined;
  let pageCount = 0;
  const maxPages = 50;

  do {
    pageCount++;
    const params: Record<string, unknown> = {};
    if (pageToken) params.pageToken = pageToken;
    const resp = (await capabilityClient.load(instanceId).call('searchRecords', params)) as {
      records?: Array<{ id?: string; record_id?: string; record?: Record<string, unknown>; fields?: Record<string, unknown> }>;
      hasMore?: boolean;
      pageToken?: string;
    };

    const records = resp?.records ?? [];
    for (let i = 0; i < records.length; i++) {
      const row = records[i] as unknown as Record<string, unknown>;
      let source: Record<string, unknown> = {};
      const rec = row.record;
      if (rec && typeof rec === 'object') {
        const recFields = (rec as Record<string, unknown>).fields;
        if (recFields && typeof recFields === 'object' && Object.keys(recFields as object).length > 0) {
          source = recFields as Record<string, unknown>;
        } else {
          source = rec as Record<string, unknown>;
        }
      }
      if (Object.keys(source).length === 0 && row.fields) {
        source = row.fields as Record<string, unknown>;
      }

      let recordId = '';
      const directCandidates = [row.id, row.record_id, (rec as Record<string, unknown> | null)?.id, (rec as Record<string, unknown> | null)?.record_id];
      for (const c of directCandidates) {
        if (typeof c === 'string' && c.trim()) { recordId = c; break; }
      }
      if (!recordId) {
        const idRe = /^rec[A-Za-z0-9]{5,}$/;
        for (const v of Object.values(source)) {
          if (typeof v === 'string' && idRe.test(v)) { recordId = v; break; }
        }
      }
      if (!recordId) recordId = `bt-${i}`;

      const values: Record<string, string | number> = {};
      for (const [key, val] of Object.entries(source)) {
        const normalized = normalizeValue(val);
        if (normalized !== undefined) values[key] = normalized;
      }

      allRecords.push({ recordId, values });
    }

    pageToken = resp?.hasMore ? resp.pageToken : undefined;
    if (pageCount > maxPages) break;
  } while (pageToken);

  return allRecords;
}

function normalizeValue(val: unknown): string | number | undefined {
  if (val === undefined || val === null) return undefined;
  if (typeof val === 'number') return val;
  if (typeof val === 'boolean') return val ? '是' : '否';
  if (typeof val === 'string') return val;
  if (Array.isArray(val)) {
    const joined = (val as unknown[]).map((v: unknown) => {
      if (typeof v === 'string') return v;
      if (typeof v === 'object' && v !== null) {
        const o = v as Record<string, unknown>;
        return String(o.text ?? o.name ?? '');
      }
      return String(v);
    }).filter(Boolean).join(', ');
    return joined || undefined;
  }
  if (typeof val === 'object') {
    const o = val as Record<string, unknown>;
    if (o.text) return String(o.text);
    if (o.name) return String(o.name);
    return undefined;
  }
  return undefined;
}

export async function fetchAllApprovals(): Promise<ApprovalFetchResult> {
  const results: ApprovalItem[] = [];
  const failedTables: string[] = [];

  const queries = APPROVAL_TABLES.map(async (cfg) => {
    let retries = 0;
    const maxRetries = 2;
    while (retries <= maxRetries) {
      try {
        const records = await fetchTableRecords(cfg);
        const items: ApprovalItem[] = [];
        for (const rec of records) {
          const statusVal = rec.values[cfg.bitableStatusField];
          const status = normalizeSelect(statusVal);
          if (!cfg.includeStatuses.includes(status)) continue;

          const titleVal = rec.values[cfg.titleField];
          const submitterVal = rec.values[cfg.submitterField];
          const approverVal = rec.values[cfg.approverField];
          const timeVal = rec.values[cfg.timeField];

          items.push({
            recordId: rec.recordId,
            title: extractText(titleVal) || '—',
            typeLabel: cfg.typeLabel,
            submitter: extractText(submitterVal) || '—',
            submitterId: extractUserId(submitterVal),
            approver: extractText(approverVal) || '—',
            approverId: extractUserId(approverVal),
            status,
            time: extractText(timeVal) || '—',
            config: cfg,
          });
        }
        return items;
      } catch {
        retries++;
        if (retries > maxRetries) {
          failedTables.push(cfg.typeLabel);
          return [];
        }
        await new Promise((r) => setTimeout(r, 500 * retries));
      }
    }
    return [];
  });

  const allResults = await Promise.all(queries);
  for (const arr of allResults) {
    results.push(...arr);
  }

  return { items: results, failedTables };
}

export class ApprovalActionError extends Error {
  constructor(
    message: string,
    public readonly typeLabel: string,
    public readonly recordId: string,
    public readonly moduleKey: string,
  ) {
    super(message);
    this.name = 'ApprovalActionError';
  }
}

async function updateApprovalStatus(
  cfg: ApprovalTableMapping,
  recordId: string,
  newStatus: string,
): Promise<void> {
  const instanceId = getModuleInstance(cfg.moduleKey);
  if (!instanceId) {
    throw new Error(`缺少插件实例: ${cfg.moduleKey}`);
  }
  const input = {
    records: [{
      id: recordId,
      record: { [cfg.bitableStatusField]: newStatus },
    }],
  };
  const resp = await capabilityClient.load(instanceId).call('batchUpdateRecords', input);
  if (resp && typeof resp === 'object') {
    const r = resp as Record<string, unknown>;
    const code = r.code ?? r.Code ?? r.errCode;
    if (code !== undefined && code !== 0 && code !== '0' && code !== 200 && code !== '200') {
      throw new Error(`code=${String(code)} msg=${String(r.msg ?? r.message ?? '')}`);
    }
  }
}

export async function approveRecord(item: ApprovalItem): Promise<boolean> {
  const cfg = item.config;
  try {
    await updateApprovalStatus(cfg, item.recordId, cfg.approvedValue);
    return true;
  } catch (e) {
    throw new ApprovalActionError(
      `「${cfg.typeLabel}」${item.title} 通过失败：${e instanceof Error ? e.message : String(e)}`,
      cfg.typeLabel, item.recordId, cfg.moduleKey,
    );
  }
}

export async function rejectRecord(item: ApprovalItem): Promise<boolean> {
  const cfg = item.config;
  try {
    await updateApprovalStatus(cfg, item.recordId, cfg.rejectedValue);
    return true;
  } catch (e) {
    throw new ApprovalActionError(
      `「${cfg.typeLabel}」${item.title} 驳回失败：${e instanceof Error ? e.message : String(e)}`,
      cfg.typeLabel, item.recordId, cfg.moduleKey,
    );
  }
}

export function getApprovalDetailUrl(config: ApprovalTableMapping, recordId: string): string {
  return `${config.route}/${recordId}`;
}