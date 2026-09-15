import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import { getWithRetry } from './finance';
import type {
  ReceiptDetail,
  ReceiptListParams,
  ReceiptListResponse,
  CreateReceiptRequest,
  CreateReceiptResponse,
} from '@shared/finance-contract';

export type {
  ReceiptListParams,
  ReceiptListResponse,
  ReceiptDetail,
  CreateReceiptRequest,
  CreateReceiptResponse,
} from '@shared/finance-contract';

/** 收付款记录列表 */
export async function listReceiptPayments(
  params: ReceiptListParams,
): Promise<ReceiptListResponse> {
  const res = await getWithRetry<ReceiptListResponse>('/api/receipt-payments', {
    params,
  });
  return res.data;
}

/** 登记收款/付款（支持一笔关联多条往来账的批量收付） */
export async function createReceiptPayment(
  data: CreateReceiptRequest,
): Promise<CreateReceiptResponse> {
  const res = await axiosForBackend.post<CreateReceiptResponse>(
    '/api/receipt-payments',
    data,
  );
  return res.data;
}

/** 收付款记录详情 */
export async function getReceiptPaymentDetail(
  id: string,
): Promise<ReceiptDetail> {
  const res = await getWithRetry<ReceiptDetail>(
    `/api/receipt-payments/${id}`,
  );
  return res.data;
}
