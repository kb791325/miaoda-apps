import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import { getWithRetry } from './finance';
import type {
  CreateFundFlowRequest,
  FundFlowItem,
  FundFlowListParams,
  FundFlowListResponse,
} from '@shared/finance-contract';

/** 资金流水列表（含筛选范围内的期初/收入/支出/期末汇总） */
export async function listFundFlows(
  params: FundFlowListParams,
): Promise<FundFlowListResponse> {
  const res = await getWithRetry<FundFlowListResponse>('/api/fund-flows', {
    params,
  });
  return res.data;
}

/** 资金流水详情 */
export async function getFundFlowDetail(id: string): Promise<FundFlowItem> {
  const res = await getWithRetry<FundFlowItem>(`/api/fund-flows/${id}`);
  return res.data;
}

/** 手工录入资金流水（类型由分类自动推断） */
export async function createFundFlow(
  body: CreateFundFlowRequest,
): Promise<FundFlowItem> {
  const res = await axiosForBackend.post<FundFlowItem>(
    '/api/fund-flows',
    body,
  );
  return res.data;
}
