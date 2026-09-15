import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { reconcileBitable } from '@client/src/api/bitable-retry';
import {
  LEAD_CLUE_STATUSES,
  LEAD_FOLLOW_UP_METHODS,
  LEAD_INTENTION_DEGREES,
  LEAD_SOURCE_CHANNELS,
} from '@shared/lead';
import type {
  ConvertLeadResponse,
  CreateFollowUpRequest,
  CreateFollowUpResponse,
  CreateLeadRequest,
  CreateLeadResponse,
  DeleteLeadResponse,
  LeadDetailResponse,
  LeadListResponse,
  LeadStatsResponse,
  LeadTodoResponse,
  UpdateLeadRequest,
  UpdateLeadResponse,
} from '@shared/lead';

export {
  ALL_VALUE,
  getSyncStatusBadgeClass,
  SYNC_STATUS_LABEL,
} from '@client/src/utils/badge';

export const SOURCE_CHANNEL_OPTIONS: string[] = LEAD_SOURCE_CHANNELS;
export const INTENTION_DEGREE_OPTIONS: string[] = LEAD_INTENTION_DEGREES;
export const CLUE_STATUS_OPTIONS: string[] = LEAD_CLUE_STATUSES;
export const FOLLOW_UP_METHOD_OPTIONS: string[] = LEAD_FOLLOW_UP_METHODS;

export interface LeadListParams {
  clueStatus?: string;
  intentionDegree?: string;
  sourceChannel?: string;
  personInCharge?: string;
  keyword?: string;
  page?: number;
  pageSize?: number;
}

export const isForbiddenError = (error: unknown): boolean => {
  if (typeof error !== 'object' || error === null) {
    return false;
  }
  const candidate: { response?: { status?: number } } = error as {
    response?: { status?: number };
  };
  return candidate.response?.status === 403;
};

export const getApiErrorMessage = (
  error: unknown,
  fallback: string,
): string => {
  if (typeof error !== 'object' || error === null) {
    return fallback;
  }
  const candidate: { response?: { data?: { message?: string } } } =
    error as { response?: { data?: { message?: string } } };
  return candidate.response?.data?.message ?? fallback;
};

export const fetchLeadList = async (
  params: LeadListParams,
): Promise<LeadListResponse> => {
  try {
    await reconcileBitable(['lead', 'followUp']);
    const response = await axiosForBackend.get<LeadListResponse>(
      '/api/lead',
      { params },
    );
    return response.data;
  } catch (error) {
    logger.error('获取线索列表失败', error);
    throw error;
  }
};

export const fetchLeadStats = async (): Promise<LeadStatsResponse> => {
  try {
    const response =
      await axiosForBackend.get<LeadStatsResponse>('/api/lead/stats');
    return response.data;
  } catch (error) {
    logger.error('获取线索统计失败', error);
    throw error;
  }
};

export const fetchLeadTodos = async (): Promise<LeadTodoResponse> => {
  try {
    const response =
      await axiosForBackend.get<LeadTodoResponse>('/api/lead/todos');
    return response.data;
  } catch (error) {
    logger.error('获取待跟进线索失败', error);
    throw error;
  }
};

export const fetchLeadDetail = async (
  leadId: string,
): Promise<LeadDetailResponse> => {
  try {
    const response = await axiosForBackend.get<LeadDetailResponse>(
      `/api/lead/${leadId}`,
    );
    return response.data;
  } catch (error) {
    logger.error('获取线索详情失败', error);
    throw error;
  }
};

export const createLead = async (
  payload: CreateLeadRequest,
): Promise<CreateLeadResponse> => {
  try {
    const response = await axiosForBackend.post<CreateLeadResponse>(
      '/api/lead',
      payload,
    );
    return response.data;
  } catch (error) {
    logger.error('创建线索失败', error);
    throw error;
  }
};

export const updateLead = async (
  leadId: string,
  payload: UpdateLeadRequest,
): Promise<UpdateLeadResponse> => {
  try {
    const response = await axiosForBackend.patch<UpdateLeadResponse>(
      `/api/lead/${leadId}`,
      payload,
    );
    return response.data;
  } catch (error) {
    logger.error('更新线索失败', error);
    throw error;
  }
};

export const deleteLead = async (
  leadId: string,
): Promise<DeleteLeadResponse> => {
  try {
    const response = await axiosForBackend.delete<DeleteLeadResponse>(
      `/api/lead/${leadId}`,
    );
    return response.data;
  } catch (error) {
    logger.error('删除线索失败', error);
    throw error;
  }
};

export const createFollowUp = async (
  leadId: string,
  payload: CreateFollowUpRequest,
): Promise<CreateFollowUpResponse> => {
  try {
    const response = await axiosForBackend.post<CreateFollowUpResponse>(
      `/api/lead/${leadId}/follow-ups`,
      payload,
    );
    return response.data;
  } catch (error) {
    logger.error('新增跟进记录失败', error);
    throw error;
  }
};

export const convertLead = async (
  leadId: string,
): Promise<ConvertLeadResponse> => {
  try {
    const response = await axiosForBackend.post<ConvertLeadResponse>(
      `/api/lead/${leadId}/convert`,
    );
    return response.data;
  } catch (error) {
    logger.error('线索转学员失败', error);
    throw error;
  }
};

export const getClueStatusBadgeClass = (status: string | null): string => {
  if (status === '新线索') {
    return 'bg-[hsl(220_70%_58%/0.12)] text-[hsl(220_70%_45%)]';
  }
  if (status === '跟进中') {
    return 'bg-[hsl(38_85%_55%/0.15)] text-[hsl(38_85%_30%)]';
  }
  if (status === '已报名') {
    return 'bg-[hsl(140_60%_45%/0.12)] text-[hsl(140_60%_28%)]';
  }
  if (status === '已流失') {
    return 'bg-muted text-muted-foreground';
  }
  return 'bg-accent text-accent-foreground';
};

export const getIntentionBadgeClass = (degree: string | null): string => {
  if (degree === '高') {
    return 'bg-primary/10 text-primary';
  }
  if (degree === '中') {
    return 'bg-[hsl(38_85%_55%/0.15)] text-[hsl(38_85%_30%)]';
  }
  if (degree === '低') {
    return 'bg-muted text-muted-foreground';
  }
  return 'bg-accent text-accent-foreground';
};

