import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  Budget,
  BudgetListResponse,
  BudgetAdjustment,
  BudgetExecutionResponse,
  OverrunCheckResponse,
  BudgetBatchCreateRequest,
} from '@shared/api.interface';

export const getBudgetList = async (params: {
  year: number;
  month?: string;
  department?: string;
  page?: number;
  pageSize?: number;
}) => {
  const res = await axiosForBackend.get<BudgetListResponse>('/api/budget', {
    params,
  });
  return res.data;
};

export const getBudgetDetail = async (id: string) => {
  const res = await axiosForBackend.get<Budget>(`/api/budget/${id}`);
  return res.data;
};

export const createBudget = async (data: {
  year: number;
  month: string;
  department: string;
  budgetAmount: number;
  remark?: string;
}) => {
  const res = await axiosForBackend.post<{ id: string }>('/api/budget', data);
  return res.data;
};

export const updateBudget = async (
  id: string,
  data: { budgetAmount?: number; remark?: string; adjustReason?: string },
) => {
  const res = await axiosForBackend.put<Budget>(`/api/budget/${id}`, data);
  return res.data;
};

export const deleteBudget = async (id: string) => {
  const res = await axiosForBackend.delete(`/api/budget/${id}`);
  return res.data;
};

export const batchCreateBudget = async (data: BudgetBatchCreateRequest) => {
  const res = await axiosForBackend.post<{ successCount: number }>(
    '/api/budget/batch',
    data,
  );
  return res.data;
};

export const getBudgetAdjustments = async (budgetId: string) => {
  const res = await axiosForBackend.get<BudgetAdjustment[]>(
    `/api/budget/${budgetId}/adjustments`,
  );
  return res.data;
};

export const getBudgetExecution = async (params: {
  year: number;
  month: string;
}) => {
  const res = await axiosForBackend.get<BudgetExecutionResponse>(
    '/api/budget/execution/summary',
    { params },
  );
  return res.data;
};

export const checkOverrun = async (params: {
  department: string;
  month: string;
  year: number;
  amount: number;
}) => {
  const res = await axiosForBackend.get<OverrunCheckResponse>(
    '/api/budget/check-overrun',
    { params },
  );
  return res.data;
};
