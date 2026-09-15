import type { BitableSyncStatus } from './bitable-sync';

/** 请假类型 */
export const LEAVE_TYPES: string[] = ['事假', '病假', '其他'];

/** 请假审批状态 */
export const LEAVE_APPROVAL_STATUSES: string[] = ['待审批', '通过', '不通过'];

/** POST /api/leave 请求体 */
export interface CreateLeaveRequest {
  studentId: string;
  scheduleId: string;
  leaveType: string;
  applyTime?: string;
  leaveReason: string;
}

export interface CreateLeaveResponse {
  id: string;
  syncStatus?: BitableSyncStatus;
}

/** GET /api/leave 查询参数（服务端归一化后的形态） */
export interface LeaveListQuery {
  page: number;
  pageSize: number;
  approvalStatus?: string;
  scheduleId?: string;
}

export interface LeaveListItem {
  id: string;
  leaveType: string | null;
  leaveReason: string | null;
  applyTime: string | null;
  approvalStatus: string | null;
  approvalRemark: string | null;
  studentName: string;
  scheduleName: string;
  syncStatus: BitableSyncStatus;
}

export interface LeaveListResponse {
  items: LeaveListItem[];
  total: number;
}

/** PATCH /api/leave/:id/approve 请求体 */
export interface ApproveLeaveRequest {
  approvalStatus: string;
  approvalRemark?: string;
}

export interface ApproveLeaveResponse {
  id: string;
  approvalStatus: string;
  syncStatus?: BitableSyncStatus;
}
