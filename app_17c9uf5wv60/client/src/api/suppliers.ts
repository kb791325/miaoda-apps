import axiosForBackend from './apiClient';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type {
  Supplier,
  SupplierListParams,
  SupplierListResponse,
  CreateSupplierRequest,
  UpdateSupplierRequest,
  SupplierDetail,
} from '@shared/api.interface';

export async function getSuppliers(
  params: SupplierListParams,
): Promise<SupplierListResponse> {
  logger.debug('getSuppliers', params);
  const response = await axiosForBackend.get<SupplierListResponse>(
    '/api/suppliers',
    { params },
  );
  return response.data;
}

export async function getAllSuppliers(): Promise<Supplier[]> {
  logger.debug('getAllSuppliers');
  const response = await axiosForBackend.get<Supplier[]>(
    '/api/suppliers/all',
  );
  return response.data;
}

export async function getSupplier(id: string): Promise<SupplierDetail> {
  logger.debug('getSupplier', id);
  const response = await axiosForBackend.get<SupplierDetail>(
    `/api/suppliers/${id}`,
  );
  return response.data;
}

export async function createSupplier(
  data: CreateSupplierRequest,
): Promise<Supplier> {
  logger.debug('createSupplier', data);
  const response = await axiosForBackend.post<Supplier>(
    '/api/suppliers',
    data,
  );
  return response.data;
}

export async function updateSupplier(
  id: string,
  data: UpdateSupplierRequest,
): Promise<Supplier> {
  logger.debug('updateSupplier', id, data);
  const response = await axiosForBackend.patch<Supplier>(
    `/api/suppliers/${id}`,
    data,
  );
  return response.data;
}

export async function deleteSupplier(id: string): Promise<{ success: boolean }> {
  logger.debug('deleteSupplier', id);
  const response = await axiosForBackend.delete<{ success: boolean }>(
    `/api/suppliers/${id}`,
  );
  return response.data;
}

const EXPORT_PAGE_SIZE: number = 100; // 服务端列表 pageSize 上限为 100
const EXPORT_MAX_PAGES: number = 50;

// 后端暂无 /api/suppliers/export 路由，复用列表接口按当前筛选全量拉取供前端生成 CSV
export async function exportSuppliers(
  params: Omit<SupplierListParams, 'page' | 'pageSize'>,
): Promise<Supplier[]> {
  logger.debug('exportSuppliers', params);
  const all: Supplier[] = [];
  let page: number = 1;
  let total: number = Number.POSITIVE_INFINITY;
  while (all.length < total && page <= EXPORT_MAX_PAGES) {
    const response = await axiosForBackend.get<SupplierListResponse>(
      '/api/suppliers',
      { params: { ...params, page, pageSize: EXPORT_PAGE_SIZE } },
    );
    all.push(...response.data.items);
    total = response.data.total;
    page += 1;
  }
  return all;
}
