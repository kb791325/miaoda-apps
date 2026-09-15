import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  DashboardExpenseOverview,
  DashboardTrendItem,
  DashboardCategoryItem,
  DashboardAssetOverview,
  DashboardBudgetExecutionItem,
  DashboardExpenseRanking,
  DashboardAssetStatusItem,
  DashboardAssetDepreciation,
  DashboardRepairAssetItem,
} from '@shared/api.interface';

export async function getExpenseOverview(): Promise<DashboardExpenseOverview> {
  const response = await axiosForBackend({
    url: '/api/dashboard/expense-overview',
    method: 'GET',
  });
  return response.data;
}

export async function getExpenseTrend(months = 12): Promise<DashboardTrendItem[]> {
  const response = await axiosForBackend({
    url: '/api/dashboard/expense-trend',
    method: 'GET',
    params: { months },
  });
  return response.data.items;
}

export async function getExpenseByCategory(): Promise<DashboardCategoryItem[]> {
  const response = await axiosForBackend({
    url: '/api/dashboard/expense-by-category',
    method: 'GET',
  });
  return response.data.items;
}

export async function getAssetOverview(): Promise<DashboardAssetOverview> {
  const response = await axiosForBackend({
    url: '/api/dashboard/asset-overview',
    method: 'GET',
  });
  return response.data;
}

export async function getExpenseBudgetExecution(): Promise<DashboardBudgetExecutionItem[]> {
  const response = await axiosForBackend({
    url: '/api/dashboard/expense-budget-execution',
    method: 'GET',
  });
  return response.data.items;
}

export async function getExpenseRanking(): Promise<DashboardExpenseRanking> {
  const response = await axiosForBackend({
    url: '/api/dashboard/expense-ranking',
    method: 'GET',
  });
  return response.data;
}

export async function getAssetStatusDistribution(): Promise<DashboardAssetStatusItem[]> {
  const response = await axiosForBackend({
    url: '/api/dashboard/asset-status-distribution',
    method: 'GET',
  });
  return response.data;
}

export async function getAssetDepreciation(): Promise<DashboardAssetDepreciation> {
  const response = await axiosForBackend({
    url: '/api/dashboard/asset-depreciation',
    method: 'GET',
  });
  return response.data;
}

export async function getAssetRepairPending(): Promise<DashboardRepairAssetItem[]> {
  const response = await axiosForBackend({
    url: '/api/dashboard/asset-repair-pending',
    method: 'GET',
  });
  return response.data;
}
