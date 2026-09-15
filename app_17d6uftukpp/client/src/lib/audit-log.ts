// EXPORTS: IAuditLog, AuditAction, recordAuditLog, fetchAuditLogs, AUDIT_ACTION_LABELS, MODULE_LABELS, moduleLabel
// 使用操作日志表专用插件实例 (需在插件面板同步字段后提交)
import { logger, capabilityClient } from '@lark-apaas/client-toolkit';

/** 操作类型 */
export type AuditAction =
  | '新增' | '修改' | '删除' | '审批' | '导出'
  | '导入' | '登录' | '权限变更' | '状态变更';

/** 审计日志条目 */
export interface IAuditLog {
  id: string;
  operator: string;
  action: string;
  module: string;
  description: string;
  targetId?: string;
  detail?: string;
  result: '成功' | '失败';
  errorMessage?: string;
  timestamp: number;
  clientInfo?: string;
}

/** 操作类型中文映射 */
export const AUDIT_ACTION_LABELS: Record<string, string> = {
  '新增': '新增',
  '修改': '修改',
  '删除': '删除',
  '审批': '审批',
  '导出': '导出',
  '导入': '导入',
  '登录': '登录',
  '权限变更': '权限变更',
  '状态变更': '状态变更',
};

/** 模块label映射（含英文表名→中文名） */
export const MODULE_LABELS: Record<string, string> = {
  customer: '客户管理',
  ad: '广告业务',
  video: '视频业务',
  contract: '合同业务',
  finance: '财务管理',
  hr: '人资管理',
  admin: '行政管理',
  task: '任务中心',
  system: '系统管理',
  support: '业务支持',
  approval: '审批流',
  report: '报表中心',
  role: '角色权限',
  settings: '系统设置',
  pool: '公海客资',
  clue: '线索',
  contact: '联系人',
  follow: '跟进记录',
  adOpen: '开户申请',
  adAccount: '广告账户',
  adConsume: '消耗管理',
  adReport: '报备管理',
  adTransfer: '转户管理',
  adCommission: '广告提成',
  videoOrder: '视频订单',
  videoProject: '视频项目',
  actor: '演员管理',
  outsource: '外包管理',
  shootCost: '拍摄费用',
  siteCost: '场地费用',
  collect: '收款',
  recharge: '充值',
  refund: '退款',
  invoice: '发票',
  purchaseOrder: '采购订单',
  purchaseItem: '采购项',
  asset: '资产',
  stock: '库存',
  attendance: '考勤记录',
  signIn: '签到记录',
  bankAccount: '银行账户',
  contractTpl: '合同模版',
  material: '素材库',
  sample: '样品',
  industryRoi: '行业ROI',
  competitor: '竞品监控',
  interview: '面试邀约',
  performance: '绩效考核',
  loginLog: '登录日志',
  card: '卡片墙',
  conversation: '转化分析',
  workbench: '工作台',
  user: '用户管理',
  depart: '部门管理',
  notice: '通知公告',
  fileDrive: '文件云盘',
  approvalCenter: '审批中心',
  auditLog: '操作日志',
  todo: '我的待办',
  org: '组织架构',
};

/** 模块key/英文标识→中文label */
export function moduleLabel(key: string): string {
  return MODULE_LABELS[key] ?? key;
}

// 操作日志表健康实例 (已在面板同步字段+提交，tableID: tbljF0XqkOYbdKOn)
const WORKING_INSTANCE = 'feishu_bitable_role_permission_1';

/** 记录一条审计日志 → 实时写入多维表格操作日志表 */
export async function recordAuditLog(params: {
  operator?: string;
  action: string;
  module: string;
  description: string;
  targetId?: string;
  detail?: string;
  result?: '成功' | '失败';
  errorMessage?: string;
}): Promise<void> {
  const now = Date.now();

  const record: Record<string, unknown> = {
    '操作时间': now,
    '操作人': [0],
    '操作类型': params.action,
    '操作模块': moduleLabel(params.module),
    '操作对象': params.description,
    '操作结果': params.result ?? '成功',
    '对象ID': params.targetId ?? '',
    '备注': params.detail ?? '',
    '变更字段': '',
    '变更前内容': '',
    '变更后内容': '',
    '操作人部门': '',
    '失败原因': params.errorMessage ?? '',
    '操作设备': typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 80) : '',
    '操作IP': '',
  };

  try {
    await capabilityClient.load(WORKING_INSTANCE).call('batchAddRecords', {
      records: [{ record }],
    });
    logger.info('审计日志已写入多维表格', params.description);
  } catch (e) {
    logger.error('审计日志写入失败', String(e));
  }
}

/** 辅助函数：从文本字段读取值 */
function textVal(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'object' && v !== null && 'text' in (v as Record<string, unknown>)) {
    return String((v as Record<string, unknown>).text ?? '');
  }
  return String(v);
}

/** 从多维表格读取审计日志 */
export async function fetchAuditLogs(filters?: {
  module?: string;
  action?: string;
  result?: '成功' | '失败';
  search?: string;
}): Promise<IAuditLog[]> {
  try {
    const pageSize = 200;
    const allRecords: Array<{ id: string; record: Record<string, unknown> }> = [];
    let pageToken: string | undefined;

    // 构建 filter
    let filter: Record<string, unknown> | undefined;
    if (filters?.module || filters?.action || filters?.result) {
      const conditions: Array<Record<string, unknown>> = [];
      if (filters.module) {
        conditions.push({ fieldName: '操作模块', operator: 'is', value: [filters.module] });
      }
      if (filters.action) {
        conditions.push({ fieldName: '操作类型', operator: 'is', value: [filters.action] });
      }
      if (filters.result) {
        conditions.push({ fieldName: '操作结果', operator: 'is', value: [filters.result] });
      }
      filter = { conjunction: 'and', conditions };
    }

    do {
      const resp = (await capabilityClient.load(WORKING_INSTANCE).call('searchRecords', {
        filter,
        sort: [{ fieldName: '操作时间', desc: true }],
        pageSize,
        pageToken,
      })) as {
        records: Array<{ id: string; record: Record<string, unknown> }>;
        hasMore: boolean;
        pageToken?: string;
        total: number;
      };

      allRecords.push(...resp.records);
      pageToken = resp.hasMore ? resp.pageToken : undefined;
    } while (pageToken);

    const logs: IAuditLog[] = allRecords.map((r) => ({
      id: r.id,
      operator: textVal(r.record['操作人']),
      action: String(r.record['操作类型'] ?? ''),
      module: String(r.record['操作模块'] ?? ''),
      description: textVal(r.record['操作对象']),
      targetId: textVal(r.record['对象ID']),
      detail: textVal(r.record['备注']),
      result: (String(r.record['操作结果'] ?? '成功') === '成功' ? '成功' : '失败') as '成功' | '失败',
      errorMessage: textVal(r.record['失败原因']),
      timestamp: Number(r.record['操作时间'] ?? 0),
      clientInfo: textVal(r.record['操作设备']),
    }));

    // 前端关键词搜索
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      return logs.filter(
        (l) =>
          l.description.toLowerCase().includes(q) ||
          l.operator.toLowerCase().includes(q) ||
          (l.targetId && l.targetId.toLowerCase().includes(q)),
      );
    }

    return logs;
  } catch (e) {
    logger.error('读取审计日志失败', String(e));
    return [];
  }
}