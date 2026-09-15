// EXPORTS: STATUS_OPTS, STATUS_MAP, STATUS_VARIANT, PORT_OPTS, INDUSTRY_OPTS, genApprovalSteps
import type { AccountApplication } from '@/api/types';
import type { ApprovalStep } from '@/components/ApprovalTimeline';

export const STATUS_OPTS = [
  { label: '待审批', value: 'pending_approval' },
  { label: '审批中（经理）', value: 'approving' },
  { label: '审批中（财务）', value: 'approving2' },
  { label: '已通过', value: 'approved' },
  { label: '已驳回', value: 'rejected' },
  { label: '已开户', value: 'opened' },
];

export const PORT_OPTS = [
  { label: '巨量千川', value: '巨量千川' },
  { label: '腾讯广告', value: '腾讯广告' },
  { label: '磁力引擎', value: '磁力引擎' },
  { label: '百度营销', value: '百度营销' },
  { label: '其他', value: '其他' },
];

export const INDUSTRY_OPTS = ['电商', '教育', '游戏', '金融', '本地生活', '家居', '美妆'].map((v) => ({
  label: v,
  value: v,
}));

export const STATUS_MAP: Record<string, string> = {
  pending_approval: '待审批',
  approving: '审批中（经理通过）',
  approving2: '审批中（财务通过）',
  approved: '已通过',
  rejected: '已驳回',
  opened: '已开户',
};

export const STATUS_VARIANT: Record<string, 'default' | 'info' | 'success' | 'warning' | 'danger'> = {
  pending_approval: 'warning',
  approving: 'info',
  approving2: 'info',
  approved: 'success',
  rejected: 'danger',
  opened: 'success',
};

// 根据状态和金额生成审批步骤
export function genApprovalSteps(record: AccountApplication): ApprovalStep[] {
  const amount = record.apply_amount || 0;
  const needFinance = amount >= 100000;
  const needGM = amount >= 500000;
  const applicant = (record as any).applicant_name || '申请人';
  const steps: ApprovalStep[] = [
    {
      id: 0,
      step_name: '提交申请',
      approver_name: applicant,
      status: 'approved',
      comment: '提交开户申请',
      approved_at: record.created_at,
      is_submit: true,
    },
    {
      id: 1,
      step_name: '部门经理审批',
      approver_name: '李娜（商务经理）',
      status: 'pending',
    },
  ];
  if (needFinance) {
    steps.push({
      id: 2,
      step_name: '财务审批',
      approver_name: '赵敏（财务主管）',
      status: 'pending',
      condition_text: amount >= 500000 ? `金额 ¥${(amount / 10000).toFixed(0)}万 ≥ 50万，触发三级审批` : `金额 ¥${(amount / 10000).toFixed(0)}万 ≥ 10万，触发二级审批`,
    });
  }
  if (needGM) {
    steps.push({
      id: 3,
      step_name: '总经理审批',
      approver_name: '系统管理员（总经理）',
      status: 'pending',
    });
  }
  // 根据真实状态流转
  if (record.status === 'pending_approval') {
    steps[1].status = 'current';
  } else if (record.status === 'approving') {
    steps[1].status = 'approved';
    steps[1].approved_at = record.updated_at;
    if (steps[2]) steps[2].status = 'current';
  } else if (record.status === 'approving2') {
    steps[1].status = 'approved';
    steps[1].approved_at = record.updated_at;
    if (steps[2]) {
      steps[2].status = 'approved';
      steps[2].approved_at = record.updated_at;
    }
    if (steps[3]) steps[3].status = 'current';
  } else if (record.status === 'approved' || record.status === 'opened') {
    steps[1].status = 'approved';
    steps[1].approved_at = record.updated_at;
    if (steps[2]) {
      steps[2].status = 'approved';
      steps[2].approved_at = record.approved_at;
    }
    if (steps[3]) {
      steps[3].status = 'approved';
      steps[3].approved_at = record.approved_at;
    }
  } else if (record.status === 'rejected') {
    if (record.reject_step === 'gm' && steps[3]) {
      steps[1].status = 'approved';
      steps[2].status = 'approved';
      steps[3].status = 'rejected';
      steps[3].approved_at = record.updated_at;
      steps[3].comment = record.reject_reason || '审批驳回';
    } else if (record.reject_step === 'finance' && steps[2]) {
      steps[1].status = 'approved';
      steps[2].status = 'rejected';
      steps[2].approved_at = record.updated_at;
      steps[2].comment = record.reject_reason || '审批驳回';
    } else {
      steps[1].status = 'rejected';
      steps[1].approved_at = record.updated_at;
      steps[1].comment = record.reject_reason || '审批驳回';
    }
  }
  return steps;
}
