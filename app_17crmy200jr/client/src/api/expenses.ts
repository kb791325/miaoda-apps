import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  ExpenseListResponse,
  ExpenseDetail,
  CreateExpenseDto,
  BatchOperationResult,
} from '@shared/api.interface';

export interface GetExpensesParams {
  keyword?: string;
  categoryL1?: string;
  categoryL2?: string;
  viewScope?: string;
  page?: number;
  pageSize?: number;
}

export async function getExpenses(
  params: GetExpensesParams,
): Promise<ExpenseListResponse> {
  const response = await axiosForBackend({
    url: '/api/expenses',
    method: 'GET',
    params,
  });
  return response.data;
}

export async function getExpense(id: string): Promise<ExpenseDetail> {
  const response = await axiosForBackend({
    url: `/api/expenses/${id}`,
    method: 'GET',
  });
  return response.data;
}

export async function createExpense(
  data: CreateExpenseDto,
): Promise<{ id: string; assetId?: string; assetError?: string }> {
  const response = await axiosForBackend({
    url: '/api/expenses',
    method: 'POST',
    data,
  });
  return response.data;
}

export async function updateExpense(
  id: string,
  data: Partial<CreateExpenseDto>,
): Promise<ExpenseDetail> {
  const response = await axiosForBackend({
    url: `/api/expenses/${id}`,
    method: 'PUT',
    data,
  });
  return response.data;
}

export async function deleteExpense(id: string): Promise<void> {
  await axiosForBackend({
    url: `/api/expenses/${id}`,
    method: 'DELETE',
  });
}

export async function batchUpdateExpenseCategory(
  ids: string[],
  categoryL1: string,
  categoryL2: string,
): Promise<BatchOperationResult> {
  const response = await axiosForBackend({
    url: '/api/expenses/batch-update-category',
    method: 'POST',
    data: { ids, categoryL1, categoryL2 },
  });
  return response.data;
}

export async function batchUpdateExpenseDepartment(
  ids: string[],
  department: string,
): Promise<BatchOperationResult> {
  const response = await axiosForBackend({
    url: '/api/expenses/batch-update-department',
    method: 'POST',
    data: { ids, department },
  });
  return response.data;
}
