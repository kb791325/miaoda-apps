import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  WorkOrderItem,
  WorkOrderDetail,
  WorkOrderListResponse,
  CreateWorkOrderDto,
  UpdateWorkOrderDto,
  UpdateWorkOrderStatusDto,
} from '@shared/api.interface';

export interface WorkOrderListParams {
  status?: string;
  urgency?: string;
  problem_type?: string;
  keyword?: string;
  page?: number;
  pageSize?: number;
}

export async function list(
  params: WorkOrderListParams = {},
): Promise<WorkOrderListResponse> {
  const response = await axiosForBackend({
    url: '/api/work-orders',
    method: 'GET',
    params,
  });
  return response.data;
}

export async function create(
  data: CreateWorkOrderDto,
): Promise<WorkOrderItem> {
  const response = await axiosForBackend({
    url: '/api/work-orders',
    method: 'POST',
    data,
  });
  return response.data;
}

export async function getById(id: string): Promise<WorkOrderDetail> {
  const response = await axiosForBackend({
    url: `/api/work-orders/${id}`,
    method: 'GET',
  });
  return response.data;
}

export async function update(
  id: string,
  data: UpdateWorkOrderDto,
): Promise<WorkOrderItem> {
  const response = await axiosForBackend({
    url: `/api/work-orders/${id}`,
    method: 'PUT',
    data,
  });
  return response.data;
}

export async function updateStatus(
  id: string,
  data: UpdateWorkOrderStatusDto,
): Promise<WorkOrderItem> {
  const response = await axiosForBackend({
    url: `/api/work-orders/${id}/status`,
    method: 'PATCH',
    data,
  });
  return response.data;
}

export async function remove(id: string): Promise<void> {
  await axiosForBackend({
    url: `/api/work-orders/${id}`,
    method: 'DELETE',
  });
}