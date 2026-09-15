import axiosForBackend from './apiClient';
import type {
  TransactionListParams,
  TransactionListResponse,
  StockTransaction,
  InventoryCheck,
  InventoryCheckItem,
  InventoryCheckListParams,
  InventoryCheckListResponse,
  Transfer,
  CreateInventoryCheckRequest,
  SubmitInventoryCheckRequest,
} from '@shared/api.interface';

export async function getTransactions(
  params: TransactionListParams,
): Promise<TransactionListResponse> {
  const response = await axiosForBackend.get<TransactionListResponse>(
    '/api/records/transactions',
    { params },
  );
  return response.data;
}

export async function exportTransactions(params?: {
  type?: string;
}): Promise<StockTransaction[]> {
  const response = await axiosForBackend.get<StockTransaction[]>(
    '/api/records/transactions/export',
    { params },
  );
  return response.data;
}

export async function createInventoryCheck(
  data: CreateInventoryCheckRequest,
): Promise<{ check: InventoryCheck; items: InventoryCheckItem[] }> {
  const response = await axiosForBackend.post<{
    check: InventoryCheck;
    items: InventoryCheckItem[];
  }>('/api/records/inventory-check', data);
  return response.data;
}

export async function getInventoryChecks(
  params?: InventoryCheckListParams,
): Promise<InventoryCheckListResponse> {
  const response = await axiosForBackend.get<InventoryCheckListResponse>(
    '/api/records/inventory-checks',
    { params },
  );
  return response.data;
}

export async function getInventoryCheck(
  checkId: string,
): Promise<{ check: InventoryCheck; items: InventoryCheckItem[] }> {
  const response = await axiosForBackend.get<{
    check: InventoryCheck;
    items: InventoryCheckItem[];
  }>(`/api/records/inventory-check/${checkId}`);
  return response.data;
}

export async function submitInventoryCheck(
  checkId: string,
  data: SubmitInventoryCheckRequest,
): Promise<{ success: boolean }> {
  const response = await axiosForBackend.patch<{ success: boolean }>(
    `/api/records/inventory-check/${checkId}`,
    data,
  );
  return response.data;
}

export async function getTransfers(params?: {
  page?: number;
  pageSize?: number;
}): Promise<{ items: Transfer[]; total: number }> {
  const response = await axiosForBackend.get<{
    items: Transfer[];
    total: number;
  }>('/api/records/transfers', { params });
  return response.data;
}
