import { axiosForBackend } from "@lark-apaas/client-toolkit/utils/getAxiosForBackend";
import type {
  SupplierItem,
  SupplierListResponse,
  CreateSupplierDto,
  UpdateSupplierDto,
} from "@shared/api.interface";

export interface GetSuppliersParams {
  keyword?: string;
  page?: number;
  pageSize?: number;
}

export async function list(
  params: GetSuppliersParams,
): Promise<SupplierListResponse> {
  const response = await axiosForBackend({
    url: "/api/suppliers",
    method: "GET",
    params,
  });
  return response.data;
}

export async function create(
  data: CreateSupplierDto,
): Promise<SupplierItem> {
  const response = await axiosForBackend({
    url: "/api/suppliers",
    method: "POST",
    data,
  });
  return response.data;
}

export async function update(
  id: string,
  data: UpdateSupplierDto,
): Promise<SupplierItem> {
  const response = await axiosForBackend({
    url: `/api/suppliers/${id}`,
    method: "PUT",
    data,
  });
  return response.data;
}

export async function remove(id: string): Promise<void> {
  await axiosForBackend({
    url: `/api/suppliers/${id}`,
    method: "DELETE",
  });
}