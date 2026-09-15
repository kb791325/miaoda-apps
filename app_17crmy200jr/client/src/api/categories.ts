import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  CategoryL1Item,
  CategoryItem,
  CategoryOption,
} from '@shared/api.interface';

export async function getCategoriesL1(): Promise<CategoryL1Item[]> {
  const response = await axiosForBackend({
    url: '/api/categories/l1',
    method: 'GET',
  });
  return response.data;
}

export async function getCategoriesL2(params: {
  categoryL1?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ items: CategoryItem[]; total: number }> {
  const response = await axiosForBackend({
    url: '/api/categories/l2',
    method: 'GET',
    params: { ...params, pageSize: params.pageSize ?? 200 },
  });
  return response.data;
}

export async function getCategoryOptions(): Promise<CategoryOption[]> {
  const response = await axiosForBackend({
    url: '/api/categories/options',
    method: 'GET',
  });
  return response.data;
}

export async function createCategoryL1(data: {
  categoryL1: string;
}): Promise<CategoryL1Item> {
  const response = await axiosForBackend({
    url: '/api/categories/l1',
    method: 'POST',
    data,
  });
  return response.data;
}

export async function createCategoryL2(data: {
  categoryL1: string;
  categoryL2: string;
  sortOrder: number;
}): Promise<CategoryItem> {
  const response = await axiosForBackend({
    url: '/api/categories/l2',
    method: 'POST',
    data,
  });
  return response.data;
}

export async function updateCategory(
  id: string,
  data: {
    categoryL1?: string;
    categoryL2?: string;
    sortOrder?: number;
  },
): Promise<CategoryItem> {
  const response = await axiosForBackend({
    url: `/api/categories/${id}`,
    method: 'PUT',
    data,
  });
  return response.data;
}

export async function deleteCategory(id: string): Promise<void> {
  await axiosForBackend({
    url: `/api/categories/${id}`,
    method: 'DELETE',
  });
}
