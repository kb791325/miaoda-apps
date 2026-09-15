// 统一审批引擎配置
// 支持四种审批方式：sequential(逐级) / countersign(会签) / or_sign(或签) / conditional(条件分支)

export type ApprovalMode = 'sequential' | 'countersign' | 'or_sign';

export interface ApprovalApprover {
  role: string;       // 审批人角色
  name?: string;      // 占位名称
}

export interface ApprovalNode {
  id: string;
  name: string;               // 节点名称：如"部门经理审批"
  mode: ApprovalMode;         // 审批方式
  approvers: ApprovalApprover[]; // 审批人列表
}

export interface ApprovalFlowConfig {
  business_type: string;
  nodes: ApprovalNode[];
  // 条件分支：按金额阈值选择不同节点链（简化实现：按金额阈值动态裁剪/扩展 nodes）
  amount_thresholds?: { amount: number; node_ids: string[] }[];
}

// 预置审批链配置
export const APPROVAL_FLOWS: Record<string, ApprovalFlowConfig> = {
  account_open: {
    business_type: 'account_open',
    nodes: [
      { id: 'manager', name: '部门经理审批', mode: 'sequential', approvers: [{ role: 'manager', name: '部门经理' }] },
      { id: 'finance', name: '财务审批', mode: 'sequential', approvers: [{ role: 'finance', name: '财务负责人' }] },
      { id: 'gm', name: '总经理审批', mode: 'sequential', approvers: [{ role: 'admin', name: '总经理' }] },
    ],
    // <10万: 经理单审；≥10万: 经理→财务；≥50万: 经理→财务→总经理
    amount_thresholds: [
      { amount: 100000, node_ids: ['manager'] },
      { amount: 500000, node_ids: ['manager', 'finance'] },
      { amount: Infinity, node_ids: ['manager', 'finance', 'gm'] },
    ],
  },
  purchase_requisition: {
    business_type: 'purchase_requisition',
    nodes: [
      { id: 'manager', name: '部门经理审批', mode: 'sequential', approvers: [{ role: 'manager', name: '部门经理' }] },
      { id: 'gm', name: '总经理审批', mode: 'sequential', approvers: [{ role: 'admin', name: '总经理' }] },
    ],
    // <5000: 经理单审；≥5000: 经理→总经理
    amount_thresholds: [
      { amount: 5000, node_ids: ['manager'] },
      { amount: Infinity, node_ids: ['manager', 'gm'] },
    ],
  },
  refund: {
    business_type: 'refund',
    nodes: [
      { id: 'finance', name: '财务审批', mode: 'sequential', approvers: [{ role: 'finance', name: '财务负责人' }] },
      { id: 'manager', name: '部门经理审批', mode: 'sequential', approvers: [{ role: 'manager', name: '部门经理' }] },
    ],
  },
  expense: {
    business_type: 'expense',
    nodes: [
      { id: 'manager', name: '部门经理审批', mode: 'sequential', approvers: [{ role: 'manager', name: '部门经理' }] },
      { id: 'finance', name: '财务审批', mode: 'sequential', approvers: [{ role: 'finance', name: '财务负责人' }] },
      { id: 'gm', name: '总经理审批', mode: 'sequential', approvers: [{ role: 'admin', name: '总经理' }] },
    ],
    amount_thresholds: [
      { amount: 2000, node_ids: ['manager'] },
      { amount: 10000, node_ids: ['manager', 'finance'] },
      { amount: Infinity, node_ids: ['manager', 'finance', 'gm'] },
    ],
  },
  contract: {
    business_type: 'contract',
    nodes: [
      { id: 'manager', name: '部门经理审批', mode: 'sequential', approvers: [{ role: 'manager', name: '部门经理' }] },
      // 会签节点：法务和财务并行
      {
        id: 'review',
        name: '法务 & 财务会签',
        mode: 'countersign',
        approvers: [
          { role: 'hr', name: '法务负责人' }, // 复用 hr 角色模拟法务
          { role: 'finance', name: '财务负责人' },
        ],
      },
      { id: 'gm', name: '总经理审批', mode: 'sequential', approvers: [{ role: 'admin', name: '总经理' }] },
    ],
  },
};

// 根据金额获取实际审批节点
export function getApprovalNodes(businessType: string, amount: number): ApprovalNode[] {
  const flow = APPROVAL_FLOWS[businessType];
  if (!flow) return [];
  if (!flow.amount_thresholds) return flow.nodes;
  const threshold = flow.amount_thresholds.find(t => amount < t.amount);
  if (!threshold) return flow.nodes;
  return flow.nodes.filter(n => threshold.node_ids.includes(n.id));
}

// 审批实例步骤状态
export type ApprovalStepStatus = 'pending' | 'approved' | 'rejected' | 'current';

export interface ApprovalInstanceStep {
  node_id: string;
  node_name: string;
  mode: ApprovalMode;
  approvers: Array<{
    role: string;
    name: string;
    status: ApprovalStepStatus;
    comment?: string;
    approved_at?: string;
  }>;
}

// 生成初始审批实例
export function createApprovalInstance(businessType: string, amount: number): ApprovalInstanceStep[] {
  const nodes = getApprovalNodes(businessType, amount);
  if (nodes.length === 0) return [];
  return nodes.map((node, idx) => ({
    node_id: node.id,
    node_name: node.name,
    mode: node.mode,
    approvers: node.approvers.map(a => ({
      role: a.role,
      name: a.name || a.role,
      status: idx === 0 ? 'current' as const : 'pending' as const,
    })),
  }));
}

// 判断当前用户是否有权限审批当前节点
export function canApproveInstance(steps: ApprovalInstanceStep[], userRole: string): { nodeIndex: number; approverIndex: number } | null {
  for (let i = 0; i < steps.length; i++) {
    const node = steps[i];
    // 找到第一个非终态节点
    const nodeStatus = getNodeStatus(node);
    if (nodeStatus === 'approved') continue;
    if (nodeStatus === 'rejected') return null;

    // 当前节点中，找该用户角色的待审批人
    for (let j = 0; j < node.approvers.length; j++) {
      const a = node.approvers[j];
      if (a.role === userRole && a.status === 'current') {
        return { nodeIndex: i, approverIndex: j };
      }
    }
    // 如果节点状态是 current 但该用户角色不在审批人里 → 无权限
    return null;
  }
  return null;
}

// 计算节点状态
export function getNodeStatus(node: ApprovalInstanceStep): ApprovalStepStatus {
  const approvers = node.approvers;
  if (approvers.length === 0) return 'pending';
  const anyRejected = approvers.some(a => a.status === 'rejected');
  const allApproved = approvers.every(a => a.status === 'approved');
  const anyCurrent = approvers.some(a => a.status === 'current');

  if (node.mode === 'countersign') {
    // 会签：任一驳回即驳回，全部通过才通过
    if (anyRejected) return 'rejected';
    if (allApproved) return 'approved';
    return 'current';
  } else if (node.mode === 'or_sign') {
    // 或签：任一通过即通过，任一驳回即驳回
    if (anyRejected) return 'rejected';
    if (approvers.some(a => a.status === 'approved')) return 'approved';
    return 'current';
  }
  // sequential 逐级（单审批人）
  if (anyRejected) return 'rejected';
  if (allApproved) return 'approved';
  return anyCurrent ? 'current' : 'pending';
}

// 执行审批动作，返回新步骤数组 + 整体状态
export function executeApproval(
  steps: ApprovalInstanceStep[],
  nodeIndex: number,
  approverIndex: number,
  action: 'approve' | 'reject',
  comment?: string,
): { steps: ApprovalInstanceStep[]; finalStatus: 'approved' | 'rejected' | 'in_progress' } {
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const newSteps = steps.map(s => ({
    ...s,
    approvers: s.approvers.map(a => ({ ...a })),
  }));

  const node = newSteps[nodeIndex];
  if (!node) return { steps: newSteps, finalStatus: 'in_progress' };

  const approver = node.approvers[approverIndex];
  if (!approver) return { steps: newSteps, finalStatus: 'in_progress' };

  approver.status = action === 'approve' ? 'approved' : 'rejected';
  approver.comment = comment;
  approver.approved_at = now;

  // 计算节点状态
  const nodeStatus = getNodeStatus(node);

  if (nodeStatus === 'rejected') {
    // 驳回 → 流程终止
    // 后续节点保持 pending
    return { steps: newSteps, finalStatus: 'rejected' };
  }

  if (nodeStatus === 'approved') {
    // 当前节点通过 → 激活下一个节点
    if (nodeIndex + 1 < newSteps.length) {
      const nextNode = newSteps[nodeIndex + 1];
      nextNode.approvers.forEach(a => {
        if (a.status === 'pending') a.status = 'current';
      });
      return { steps: newSteps, finalStatus: 'in_progress' };
    } else {
      // 最后一个节点也通过了 → 整体通过
      return { steps: newSteps, finalStatus: 'approved' };
    }
  }

  // 节点仍在进行中（会签/或签还有人未处理）
  return { steps: newSteps, finalStatus: 'in_progress' };
}

// 将步骤转换为 ApprovalTimeline 组件需要的扁平格式
export function flattenApprovalSteps(steps: ApprovalInstanceStep[]): Array<{
  id: number;
  step_name: string;
  approver_name: string;
  status: ApprovalStepStatus;
  comment?: string;
  approved_at?: string;
  is_submit?: boolean;
}> {
  const result: Array<any> = [];
  let id = 1;
  steps.forEach(node => {
    if (node.mode === 'countersign' || node.mode === 'or_sign') {
      // 并行节点：作为一组展示，主节点一条 + 子项展开
      node.approvers.forEach(a => {
        result.push({
          id: id++,
          step_name: `${node.node_name} - ${a.name}`,
          approver_name: a.name,
          status: a.status,
          comment: a.comment,
          approved_at: a.approved_at,
        });
      });
    } else {
      // 单级节点
      const approver = node.approvers[0];
      result.push({
        id: id++,
        step_name: node.node_name,
        approver_name: approver?.name || '',
        status: approver?.status || 'pending',
        comment: approver?.comment,
        approved_at: approver?.approved_at,
      });
    }
  });
  return result;
}
