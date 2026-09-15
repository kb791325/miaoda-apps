// EXPORTS: ApprovalStatus, ApprovalType, IApprovalNode, IApprovalRecord, initApproval, approveNode, rejectNode, getApprovalTimeline, fetchApprovalsByTarget, fetchPendingApprovals
// 统一审批流引擎：开户/合同/采购/退款等审批的发起与节点状态流转
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit';
import { isModuleBitableReady, fetchRecordsFromBitable, saveRecordToBitable, updateRecordInBitable, deleteRecordsFromBitable } from '@/lib/mt-client';
import type { ModuleKey } from '@/data/mt-records';

/** 审批状态 */
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

/** 审批类型 */
export type ApprovalType = 'account_open' | 'contract' | 'purchase' | 'refund' | 'transfer' | 'commission' | 'other';

/** 审批节点 */
export interface IApprovalNode {
  /** 节点序号 */
  step: number;
  /** 节点名称 */
  name: string;
  /** 审批人 */
  approver: string;
  /** 状态 */
  status: ApprovalStatus;
  /** 审批意见 */
  comment?: string;
  /** 审批时间 */
  timestamp?: string;
}

/** 审批记录 */
export interface IApprovalRecord {
  recordId: string;
  /** 审批类型 */
  approvalType: ApprovalType;
  /** 审批标题 */
  title: string;
  /** 关联业务记录 ID */
  targetId: string;
  /** 关联模块 */
  targetModule: ModuleKey;
  /** 发起人 */
  submitter: string;
  /** 当前节点序号 */
  currentNode: number;
  /** 审批节点列表 */
  nodes: IApprovalNode[];
  /** 整体状态 */
  status: ApprovalStatus;
  /** 创建时间 */
  createdAt: string;
}

/** 审批类型对应的默认审批节点 */
const DEFAULT_NODES: Record<ApprovalType, string[]> = {
  account_open: ['商务经理', '运营主管', '财务审核'],
  contract: ['商务经理', '法务审核', '财务审批', '总经理'],
  purchase: ['部门主管', '财务审批', '总经理'],
  refund: ['财务审核', '运营主管', '总经理'],
  transfer: ['商务经理', '运营主管'],
  commission: ['商务经理', '财务审核'],
  other: ['直属上级'],
};

/** 审批实例绑定表: system 模块的 'approval' 子表 */
const APPROVAL_MODULE: ModuleKey = 'system';
const APPROVAL_TABLE = 'approval';

/** 内存缓存 */
let approvalCache: IApprovalRecord[] = [];

/** 初始化一条审批记录 */
export function initApproval(
  approvalType: ApprovalType,
  title: string,
  targetId: string,
  targetModule: ModuleKey,
  submitter: string = '当前用户',
): IApprovalRecord {
  const approverNames = DEFAULT_NODES[approvalType] ?? ['直属上级'];
  const nodes: IApprovalNode[] = approverNames.map((name, i) => ({
    step: i + 1,
    name,
    approver: name,
    status: (i === 0 ? 'pending' : 'pending') as ApprovalStatus,
  }));
  // 只有第一个节点标记为 pending，后面的标记为空（等待前置节点完成）
  nodes.forEach((n, i) => {
    if (i > 0) n.status = 'pending';
  });

  const record: IApprovalRecord = {
    recordId: `approval-${Date.now()}`,
    approvalType,
    title,
    targetId,
    targetModule,
    submitter,
    currentNode: 1,
    nodes,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  approvalCache.unshift(record);
  return record;
}

/** 审批通过当前节点 */
export async function approveNode(
  approvalId: string,
  comment: string = '',
  approver: string = '审批人',
): Promise<IApprovalRecord | null> {
  const record = approvalCache.find((r) => r.recordId === approvalId);
  if (!record) {
    toast.error('审批记录不存在');
    return null;
  }
  if (record.status !== 'pending') {
    toast.error('该审批已结束，无法操作');
    return null;
  }

  const node = record.nodes.find((n) => n.step === record.currentNode);
  if (!node) return null;

  node.status = 'approved';
  node.comment = comment;
  node.timestamp = new Date().toISOString();

  // 判断是否还有下一个节点
  const nextNode = record.nodes.find((n) => n.step === record.currentNode + 1);
  if (nextNode) {
    record.currentNode = nextNode.step;
    nextNode.status = 'pending';
  } else {
    record.status = 'approved';
  }

  // 尝试持久化到多维表格
  await persistApproval(record);
  toast.success(`${node.name} 审批通过${nextNode ? '，流转至 ' + nextNode.name : '，审批完成'}`);
  return record;
}

/** 驳回审批 */
export async function rejectNode(
  approvalId: string,
  comment: string = '',
  approver: string = '审批人',
): Promise<IApprovalRecord | null> {
  const record = approvalCache.find((r) => r.recordId === approvalId);
  if (!record) {
    toast.error('审批记录不存在');
    return null;
  }
  if (record.status !== 'pending') {
    toast.error('该审批已结束，无法操作');
    return null;
  }

  const node = record.nodes.find((n) => n.step === record.currentNode);
  if (!node) return null;

  node.status = 'rejected';
  node.comment = comment;
  node.timestamp = new Date().toISOString();
  record.status = 'rejected';

  await persistApproval(record);
  toast.error(`审批被 ${node.name} 驳回`);
  return record;
}

/** 获取审批时间线（按节点排序） */
export function getApprovalTimeline(record: IApprovalRecord): IApprovalNode[] {
  return [...record.nodes].sort((a, b) => a.step - b.step);
}

/** 根据关联业务 ID 查询审批记录 */
export function fetchApprovalsByTarget(targetId: string): IApprovalRecord[] {
  return approvalCache.filter((r) => r.targetId === targetId);
}

/** 获取待审批列表 */
export function fetchPendingApprovals(): IApprovalRecord[] {
  return approvalCache.filter((r) => r.status === 'pending');
}

/** 持久化审批记录到多维表格（best-effort） */
async function persistApproval(record: IApprovalRecord): Promise<void> {
  try {
    if (!isModuleBitableReady(APPROVAL_MODULE)) return;
    const values: Record<string, string | number> = {
      title: record.title,
      approvalType: record.approvalType,
      targetId: record.targetId,
      status: record.status,
      currentNode: record.currentNode,
      nodes: JSON.stringify(record.nodes),
      submitter: record.submitter,
    };
    // 尝试更新，已存在则更新，不存在则新建
    const existing = approvalCache.find((r) => r.recordId === record.recordId);
    if (existing && existing.recordId && !existing.recordId.startsWith('approval-')) {
      await updateRecordInBitable(APPROVAL_MODULE, record.recordId, values);
    }
  } catch (e) {
    logger.warn('审批记录持久化失败（内存缓存仍有效）', String(e));
  }
}