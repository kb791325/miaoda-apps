import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import { getWithRetry } from './finance';
import type {
  ApproveExpenseRequest,
  CreateExpenseRequest,
  ExpenseItem,
  ExpenseListParams,
  ExpenseListResponse,
  UpdateExpenseRequest,
} from '@shared/finance-contract';

/** 费用列表（含汇总：总额/已审批金额/待审批笔数） */
export async function listExpenses(
  params: ExpenseListParams,
): Promise<ExpenseListResponse> {
  const res = await getWithRetry<ExpenseListResponse>('/api/expenses', {
    params,
  });
  return res.data;
}

/** 费用详情 */
export async function getExpenseDetail(id: string): Promise<ExpenseItem> {
  const res = await getWithRetry<ExpenseItem>(`/api/expenses/${id}`);
  return res.data;
}

/** 新增费用 */
export async function createExpense(
  body: CreateExpenseRequest,
): Promise<ExpenseItem> {
  const res = await axiosForBackend.post<ExpenseItem>('/api/expenses', body);
  return res.data;
}

/** 编辑费用（仅待审批状态可编辑） */
export async function updateExpense(
  id: string,
  body: UpdateExpenseRequest,
): Promise<ExpenseItem> {
  const res = await axiosForBackend.put<ExpenseItem>(
    `/api/expenses/${id}`,
    body,
  );
  return res.data;
}

/** 审批费用（通过后自动生成资金流水；重复审批返回 400） */
export async function approveExpense(
  id: string,
  body: ApproveExpenseRequest,
): Promise<ExpenseItem> {
  const res = await axiosForBackend.post<ExpenseItem>(
    `/api/expenses/${id}/approve`,
    body,
  );
  return res.data;
}

/** 删除费用（仅待审批状态可删除） */
export async function deleteExpense(id: string): Promise<void> {
  await axiosForBackend.delete(`/api/expenses/${id}`);
}
