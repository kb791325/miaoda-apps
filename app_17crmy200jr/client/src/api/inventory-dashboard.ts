import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  InventoryOverview,
  OwnerMatrixRow,
  TimelineOwner,
  StockOverview,
  StockTrendItem,
  AbnormalCheckItem,
  PagedResponse,
  InventoryCompletionRateTrendItem,
  InventoryDeptCompletionItem,
} from '@shared/api.interface';

export async function getOverview(): Promise<InventoryOverview> {
  const response = await axiosForBackend({
    url: '/api/inventory-dashboard/overview',
    method: 'GET',
  });
  return response.data;
}

export async function getOwnerMatrix(params: {
  department?: string;
  search?: string;
}): Promise<OwnerMatrixRow[]> {
  const response = await axiosForBackend({
    url: '/api/inventory-dashboard/owner-matrix',
    method: 'GET',
    params,
  });
  return response.data.items;
}

export async function getTimeline(
  sort: string = 'days_desc'
): Promise<TimelineOwner[]> {
  const response = await axiosForBackend({
    url: '/api/inventory-dashboard/timeline',
    method: 'GET',
    params: { sort },
  });
  return response.data.items;
}

export async function getStock(): Promise<StockOverview> {
  const response = await axiosForBackend({
    url: '/api/inventory-dashboard/stock',
    method: 'GET',
  });
  return response.data;
}

export async function getStockTrend(
  months: number = 6
): Promise<StockTrendItem[]> {
  const response = await axiosForBackend({
    url: '/api/inventory-dashboard/stock-trend',
    method: 'GET',
    params: { months },
  });
  return response.data.items;
}

export async function getAbnormalList(params: {
  page?: number;
  pageSize?: number;
}): Promise<PagedResponse<AbnormalCheckItem>> {
  const response = await axiosForBackend({
    url: '/api/inventory-dashboard/abnormal-list',
    method: 'GET',
    params,
  });
  return response.data;
}

export async function resolveAbnormal(
  id: string,
  remark?: string
): Promise<{ success: boolean }> {
  const response = await axiosForBackend({
    url: `/api/inventory-dashboard/checks/${id}/resolve`,
    method: 'PATCH',
    data: { remark },
  });
  return response.data;
}

export async function getCompletionRateTrend(
  months: number = 6
): Promise<InventoryCompletionRateTrendItem[]> {
  const response = await axiosForBackend({
    url: '/api/inventory-dashboard/completion-rate-trend',
    method: 'GET',
    params: { months },
  });
  return response.data.items;
}

export async function getDepartmentCompletionRanking(): Promise<InventoryDeptCompletionItem[]> {
  const response = await axiosForBackend({
    url: '/api/inventory-dashboard/department-completion-ranking',
    method: 'GET',
  });
  return response.data.items;
}

export async function batchCleanAbnormal(): Promise<{ deletedCount: number }> {
  const response = await axiosForBackend({
    url: '/api/inventory-dashboard/batch-clean-abnormal',
    method: 'POST',
  });
  return response.data;
}
