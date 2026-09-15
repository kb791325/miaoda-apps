import axiosForBackend from './apiClient';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type {
  SalesOrder,
  SalesOrderListParams,
  SalesOrderListResponse,
  CreateSalesOrderRequest,
  UpdateSalesOrderRequest,
} from '@shared/api.interface';

const API_BASE = '/api/sales-orders';

export async function getOrders(
  params: SalesOrderListParams,
): Promise<SalesOrderListResponse> {
  const res = await axiosForBackend.get<SalesOrderListResponse>(API_BASE, {
    params,
  });
  return res.data;
}

export async function getOrder(id: string): Promise<SalesOrder> {
  const res = await axiosForBackend.get<SalesOrder>(`${API_BASE}/${id}`);
  return res.data;
}

export async function createOrder(
  data: CreateSalesOrderRequest,
): Promise<SalesOrder> {
  logger.info('创建销售订单:', data.customerName);
  const res = await axiosForBackend.post<SalesOrder>(API_BASE, data);
  return res.data;
}

export async function updateOrder(
  id: string,
  data: UpdateSalesOrderRequest,
): Promise<SalesOrder> {
  logger.info('更新销售订单:', id);
  const res = await axiosForBackend.patch<SalesOrder>(`${API_BASE}/${id}`, data);
  return res.data;
}

export async function confirmOrder(id: string): Promise<SalesOrder> {
  logger.info('确认销售订单:', id);
  const res = await axiosForBackend.post<SalesOrder>(
    `${API_BASE}/${id}/confirm`,
  );
  return res.data;
}

export async function cancelOrder(id: string): Promise<SalesOrder> {
  logger.info('取消销售订单:', id);
  const res = await axiosForBackend.post<SalesOrder>(
    `${API_BASE}/${id}/cancel`,
  );
  return res.data;
}

export async function startPicking(id: string): Promise<SalesOrder> {
  logger.info('开始备货:', id);
  const res = await axiosForBackend.post<SalesOrder>(
    `${API_BASE}/${id}/start-picking`,
  );
  return res.data;
}

export async function shipOrder(
  id: string,
): Promise<{ success: boolean; orderId: string; transactionId: string }> {
  logger.info('销售订单出库:', id);
  const res = await axiosForBackend.post<{
    success: boolean;
    orderId: string;
    transactionId: string;
  }>(`${API_BASE}/${id}/ship`);
  return res.data;
}

export async function completeOrder(id: string): Promise<SalesOrder> {
  logger.info('完成销售订单:', id);
  const res = await axiosForBackend.post<SalesOrder>(
    `${API_BASE}/${id}/complete`,
  );
  return res.data;
}

export async function exportOrders(
  params: Omit<SalesOrderListParams, 'page' | 'pageSize'>,
): Promise<SalesOrder[]> {
  const res = await axiosForBackend.get<SalesOrder[]>(`${API_BASE}/export`, {
    params,
  });
  return res.data;
}
