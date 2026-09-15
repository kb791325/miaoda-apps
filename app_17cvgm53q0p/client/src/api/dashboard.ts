import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  DashboardSummary,
  SalesRankResponse,
  StatusDistributionResponse,
  TrendResponse,
} from '@shared/dashboard';

/** 经营总览指标（本月订单数 / 待出库 / 本月销售额 / 库存预警） */
export async function fetchSummary(): Promise<DashboardSummary> {
  const res = await axiosForBackend.get<DashboardSummary>(
    '/api/dashboard/summary',
  );
  return res.data;
}

/** 近 N 天订单量与销售额趋势 */
export async function fetchTrend(days: number = 30): Promise<TrendResponse> {
  const res = await axiosForBackend.get<TrendResponse>('/api/dashboard/trend', {
    params: { days },
  });
  return res.data;
}

/** 订单状态分布 */
export async function fetchStatusDistribution(): Promise<StatusDistributionResponse> {
  const res = await axiosForBackend.get<StatusDistributionResponse>(
    '/api/dashboard/order-status-distribution',
  );
  return res.data;
}

/** 商品销量排行 TOP N */
export async function fetchSalesRank(
  limit: number = 10,
): Promise<SalesRankResponse> {
  const res = await axiosForBackend.get<SalesRankResponse>(
    '/api/dashboard/product-sales-rank',
    { params: { limit } },
  );
  return res.data;
}
