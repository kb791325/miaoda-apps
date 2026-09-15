import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  ProductListResponse,
  CreateProductRequest,
  CreateProductResponse,
} from '@shared/api.interface';

export async function getProductList(): Promise<ProductListResponse> {
  const res = await axiosForBackend.get<ProductListResponse>('/api/products');
  return res.data;
}

export async function createProduct(
  data: CreateProductRequest,
): Promise<CreateProductResponse> {
  const res = await axiosForBackend.post<CreateProductResponse>('/api/products', data);
  return res.data;
}

export async function deleteProduct(id: string): Promise<void> {
  await axiosForBackend.delete(`/api/products/${id}`);
}
