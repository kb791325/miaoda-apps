import axiosForBackend from './apiClient';
import type {
  Category,
  CategoryListResponse,
  CreateCategoryRequest,
  UpdateCategoryRequest,
} from '@shared/api.interface';

export async function getCategories(
  keyword?: string,
): Promise<CategoryListResponse> {
  const res = await axiosForBackend.get('/api/categories', {
    params: keyword ? { keyword } : undefined,
  });
  return res.data;
}

export async function createCategory(
  data: CreateCategoryRequest,
): Promise<Category> {
  const res = await axiosForBackend.post('/api/categories', data);
  return res.data;
}

export async function updateCategory(
  id: string,
  data: UpdateCategoryRequest,
): Promise<Category> {
  const res = await axiosForBackend.patch(`/api/categories/${id}`, data);
  return res.data;
}

export async function deleteCategory(id: string): Promise<void> {
  await axiosForBackend.delete(`/api/categories/${id}`);
}
