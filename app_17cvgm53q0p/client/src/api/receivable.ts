import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import { getWithRetry } from './finance';
import type {
  ArListParams,
  ArListResponse,
  ArDetail,
  LedgerSummary,
  OverdueSummary,
} from '@shared/finance-contract';

export type {
  ArListParams,
  ArListResponse,
  ArDetail,
  LedgerSummary,
  OverdueSummary,
} from '@shared/finance-contract';

/** 应收账款列表 */
export async function listReceivables(
  params: ArListParams,
): Promise<ArListResponse> {
  const res = await getWithRetry<ArListResponse>('/api/receivables', {
    params,
  });
  return res.data;
}

/** 应收账款详情 */
export async function getReceivableDetail(id: string): Promise<ArDetail> {
  const res = await getWithRetry<ArDetail>(`/api/receivables/${id}`);
  return res.data;
}

/** 客户应收欠款汇总 */
export async function getCustomerReceivableSummary(
  customerId: string,
): Promise<LedgerSummary> {
  const res = await getWithRetry<LedgerSummary>(
    `/api/receivables/customer-summary/${customerId}`,
  );
  return res.data;
}

/** 逾期应收汇总（按账龄分段） */
export async function getOverdueSummary(): Promise<OverdueSummary> {
  const res = await getWithRetry<OverdueSummary>(
    '/api/receivables/overdue-summary',
  );
  return res.data;
}

/** 更新应收账款（到期日/备注） */
export async function updateReceivable(
  id: string,
  data: { dueDate?: string; remark?: string },
): Promise<ArDetail> {
  const res = await axiosForBackend.patch<ArDetail>(
    `/api/receivables/${id}`,
    data,
  );
  return res.data;
}
