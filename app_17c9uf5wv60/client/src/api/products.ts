import axiosForBackend from './apiClient';
import type {
  ProductListParams,
  ProductListResponse,
  Product,
  ProductWithInventory,
  CreateProductRequest,
  UpdateProductRequest,
  ArchivedProduct,
  ArchivedProductDetail,
  ArchivedProductListParams,
  ArchivedProductListResponse,
  BatchImportItem,
  BatchImportResult,
  BulkOperationResponse,
} from '@shared/api.interface';

export async function getProducts(
  params: ProductListParams,
): Promise<ProductListResponse> {
  const res = await axiosForBackend.get('/api/products', {
    params: {
      ...params,
      maxStock: params.maxStock,
      sortBy: params.sortBy,
    },
  });
  return res.data;
}

export async function getAllProducts(): Promise<ProductWithInventory[]> {
  const res = await axiosForBackend.get('/api/products/all');
  return res.data;
}

export async function createProduct(
  data: CreateProductRequest,
): Promise<Product> {
  const res = await axiosForBackend.post('/api/products', data);
  return res.data;
}

export async function getExportData(
  params: ProductListParams,
): Promise<ProductWithInventory[]> {
  const res = await axiosForBackend.get('/api/products/export', {
    params: {
      ...params,
      maxStock: params.maxStock,
      sortBy: params.sortBy,
    },
  });
  return res.data;
}

export async function getProduct(
  id: string,
): Promise<ProductWithInventory> {
  const res = await axiosForBackend.get(`/api/products/${id}`);
  return res.data;
}

export async function updateProduct(
  id: string,
  data: UpdateProductRequest,
): Promise<Product> {
  const res = await axiosForBackend.patch(`/api/products/${id}`, data);
  return res.data;
}

export async function deleteProduct(
  id: string,
): Promise<{ success: boolean }> {
  const res = await axiosForBackend.delete(`/api/products/${id}`);
  return res.data;
}

export async function getArchivedProducts(
  params?: ArchivedProductListParams,
): Promise<ArchivedProductListResponse> {
  const res = await axiosForBackend.get<ArchivedProductListResponse>(
    '/api/products/archived/list',
    { params },
  );
  return res.data;
}

export async function getArchivedProduct(
  id: string,
): Promise<ArchivedProductDetail> {
  const res = await axiosForBackend.get<ArchivedProductDetail>(
    `/api/products/archived/${id}`,
  );
  return res.data;
}

export async function restoreArchivedProduct(
  id: string,
): Promise<{ success: boolean }> {
  const res = await axiosForBackend.post(`/api/products/archived/${id}/restore`);
  return res.data;
}

export async function purgeArchivedProduct(
  id: string,
): Promise<{ success: boolean }> {
  const res = await axiosForBackend.delete(`/api/products/archived/${id}`);
  return res.data;
}

export async function batchImportProducts(
  items: BatchImportItem[],
): Promise<BatchImportResult> {
  const res = await axiosForBackend.post('/api/products/batch-import', { items });
  return res.data;
}

export async function bulkDeleteProducts(
  ids: string[],
): Promise<BulkOperationResponse> {
  const res = await axiosForBackend.post('/api/products/bulk-delete', { ids });
  return res.data;
}

export async function bulkUpdateCategory(
  ids: string[],
  category: string,
): Promise<BulkOperationResponse> {
  const res = await axiosForBackend.post('/api/products/bulk-category', {
    ids,
    category,
  });
  return res.data;
}

export async function bulkShelfProducts(
  ids: string[],
  onShelf: boolean,
): Promise<BulkOperationResponse> {
  const res = await axiosForBackend.post('/api/products/bulk-shelf', {
    ids,
    onShelf,
  });
  return res.data;
}
