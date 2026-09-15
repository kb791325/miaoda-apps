import axiosForBackend from './apiClient';
import type {
  PurchaseOrder,
  PurchaseOrderListParams,
  PurchaseOrderListResponse,
  CreatePurchaseOrderRequest,
} from '@shared/api.interface';

const API_BASE = '/api/purchase-orders';

export async function getOrders(
  params: PurchaseOrderListParams,
): Promise<PurchaseOrderListResponse> {
  const res = await axiosForBackend.get<PurchaseOrderListResponse>(API_BASE, {
    params,
  });
  return res.data;
}

export async function getOrder(id: string): Promise<PurchaseOrder> {
  const res = await axiosForBackend.get<PurchaseOrder>(`${API_BASE}/${id}`);
  return res.data;
}

export async function createOrder(
  data: CreatePurchaseOrderRequest,
): Promise<PurchaseOrder> {
  const res = await axiosForBackend.post<PurchaseOrder>(API_BASE, data);
  return res.data;
}

export async function approveOrder(id: string): Promise<PurchaseOrder> {
  const res = await axiosForBackend.post<PurchaseOrder>(
    `${API_BASE}/${id}/approve`,
  );
  return res.data;
}

export async function receiveOrder(id: string): Promise<PurchaseOrder> {
  const res = await axiosForBackend.post<PurchaseOrder>(
    `${API_BASE}/${id}/receive`,
  );
  return res.data;
}

export async function cancelOrder(id: string): Promise<PurchaseOrder> {
  const res = await axiosForBackend.post<PurchaseOrder>(
    `${API_BASE}/${id}/cancel`,
  );
  return res.data;
}


