import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { reconcileBitable } from '@client/src/api/bitable-retry';
import type {
  ApproveLeaveRequest,
  ApproveLeaveResponse,
  CreateLeaveRequest,
  CreateLeaveResponse,
  LeaveListQuery,
  LeaveListResponse,
} from '@shared/leave';

export const fetchLeaveList = async (
  params: LeaveListQuery,
): Promise<LeaveListResponse> => {
  try {
    await reconcileBitable(['leave']);
    const response = await axiosForBackend.get<LeaveListResponse>(
      '/api/leave',
      { params },
    );
    return response.data;
  } catch (error) {
    logger.error('获取请假列表失败', error);
    throw error;
  }
};

export const submitLeave = async (
  payload: CreateLeaveRequest,
): Promise<CreateLeaveResponse> => {
  try {
    const response = await axiosForBackend.post<CreateLeaveResponse>(
      '/api/leave',
      payload,
    );
    return response.data;
  } catch (error) {
    logger.error('提交请假申请失败', error);
    throw error;
  }
};

export const approveLeave = async (
  id: string,
  payload: ApproveLeaveRequest,
): Promise<ApproveLeaveResponse> => {
  try {
    const response = await axiosForBackend.patch<ApproveLeaveResponse>(
      `/api/leave/${id}/approve`,
      payload,
    );
    return response.data;
  } catch (error) {
    logger.error('审批请假失败', error);
    throw error;
  }
};
