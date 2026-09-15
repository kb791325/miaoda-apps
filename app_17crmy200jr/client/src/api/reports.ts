import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  ExpenseAnalysisResponse,
  AssetAnalysisResponse,
  InventoryAnalysisResponse,
} from '@shared/api.interface';

export interface ExpenseAnalysisParams {
  timeDimension?: 'month' | 'quarter';
  dimension?: 'category' | 'entity' | 'floor' | 'department';
  year?: string;
  department?: string;
}

export async function getExpenseAnalysis(
  params: ExpenseAnalysisParams,
): Promise<ExpenseAnalysisResponse> {
  const response = await axiosForBackend({
    url: '/api/reports/expense-analysis',
    method: 'GET',
    params,
  });
  return response.data;
}

export async function getAssetAnalysis(): Promise<AssetAnalysisResponse> {
  const response = await axiosForBackend({
    url: '/api/reports/asset-analysis',
    method: 'GET',
  });
  return response.data;
}

export async function getInventoryAnalysis(
  year: number,
): Promise<InventoryAnalysisResponse> {
  const response = await axiosForBackend({
    url: '/api/reports/inventory-analysis',
    method: 'GET',
    params: { year },
  });
  return response.data;
}
