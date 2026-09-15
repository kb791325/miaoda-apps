/* 前后端共享的类型写在这里 */

/** 审批业务类型（采购申请 / 采购订单） */
export type ApprovalBizType = '采购申请' | '采购订单';

export interface IApprovalSubmitRequest {
  recordId: string;
  businessType: ApprovalBizType;
  title?: string;
  applicant?: string;
  department?: string;
}

export interface IApprovalStepView {
  id: string;
  step_no: string;
  step_order: number;
  step_name: string;
  approver: string;
  approver_role: string;
  status: string;
  comment: string;
  approve_time: string;
}

export interface IApprovalSubmitResponse {
  instance_id: string;
  instance_no: string;
  steps: IApprovalStepView[];
}

export interface IApprovalAdvanceRequest {
  instanceId: string;
  action: 'approve' | 'reject';
  comment?: string;
  operatorName?: string;
  operatorRole?: string;
}

export interface IApprovalAdvanceResponse {
  instance_status: string;
  current_node: string;
  finished: boolean;
}

export interface IApprovalInstanceView {
  id: string;
  instance_no: string;
  business_type: string;
  business_no: string;
  title: string;
  applicant: string;
  status: string;
  current_node: string;
  steps: IApprovalStepView[];
}

export interface IApprovalListResponse {
  instance: IApprovalInstanceView | null;
}
