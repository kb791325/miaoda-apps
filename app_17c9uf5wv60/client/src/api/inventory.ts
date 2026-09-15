import axiosForBackend from './apiClient';
import type {
  DashboardStats,
  WarehouseInventoryItem,
} from '@shared/api.interface';

export async function getDashboardStats(params?: {
  category?: string;
  status?: string;
  keyword?: string;
}): Promise<DashboardStats> {
  const res = await axiosForBackend.get('/api/inventory/dashboard', {
    params,
  });
  return res.data;
}

export async function getWarehouseStock(
  productId: string,
): Promise<WarehouseInventoryItem[]> {
  const res = await axiosForBackend.get(
    `/api/inventory/warehouse-stock/${productId}`,
  );
  return res.data;
}
