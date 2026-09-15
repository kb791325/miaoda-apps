/**
 * 财务状态归一：后端标准枚举与历史中文值并存，展示/判定前统一归一。
 * 充值 arrived/failed/pending；扣减 已扣减/待处理；后返 已确认/待确认；
 * 退币 已退币/已驳回/待审批；退款 已退款/已驳回/待审批/审批中。
 */

type FinanceTableKey = 'recharge' | 'deduction' | 'rebate' | 'coin_refund' | 'refund';

const TABLE_ALIASES: Record<string, FinanceTableKey> = {
  recharge: 'recharge', '财务-充值': 'recharge',
  deduction: 'deduction', '财务-扣减': 'deduction',
  rebate: 'rebate', '财务-后返': 'rebate',
  coin_refund: 'coin_refund', coinrefund: 'coin_refund', '财务-退币': 'coin_refund',
  refund: 'refund', '财务-退款': 'refund',
};

const SYNONYMS: Record<FinanceTableKey, Record<string, string>> = {
  recharge: {
    arrived: 'arrived', success: 'arrived', 已充值: 'arrived', 已到账: 'arrived', 充值成功: 'arrived',
    failed: 'failed', 失败: 'failed', 充值失败: 'failed',
    pending: 'pending', 待充值: 'pending', 待处理: 'pending', 处理中: 'pending',
  },
  deduction: {
    已扣减: '已扣减', completed: '已扣减', done: '已扣减', 已完成: '已扣减', 已执行: '已扣减',
    待处理: '待处理', pending: '待处理', 待执行: '待处理', 待确认: '待处理',
  },
  rebate: {
    已确认: '已确认', confirmed: '已确认', success: '已确认',
    待确认: '待确认', pending: '待确认', 待结算: '待确认',
    已结算: '已结算', settled: '已结算',
  },
  coin_refund: {
    已退币: '已退币', refunded: '已退币', success: '已退币',
    已驳回: '已驳回', rejected: '已驳回', failed: '已驳回',
    待审批: '待审批', pending: '待审批', pending_approval: '待审批',
  },
  refund: {
    已退款: '已退款', refunded: '已退款', success: '已退款',
    已驳回: '已驳回', rejected: '已驳回', failed: '已驳回',
    待审批: '待审批', pending: '待审批', pending_approval: '待审批',
    审批中: '审批中', approving: '审批中',
  },
};

export function normalizeFinanceStatus(table: string, raw: unknown): string {
  let value = '';
  if (typeof raw === 'object' && raw !== null && 'name' in (raw as Record<string, unknown>)) {
    value = String((raw as { name?: unknown }).name ?? '');
  } else {
    value = String(raw ?? '');
  }
  const trimmed = value.trim();
  if (!trimmed) return '';
  const key = TABLE_ALIASES[table.trim().toLowerCase()];
  if (!key) return trimmed;
  return SYNONYMS[key][trimmed] ?? trimmed;
}
