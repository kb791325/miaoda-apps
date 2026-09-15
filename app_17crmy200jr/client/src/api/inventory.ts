import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  InventoryTaskItem,
  InventoryCheckItem,
  CreateInventoryTaskDto,
  CreateInventoryTaskResponse,
  UpdateInventoryCheckDto,
  CompleteTaskResponse,
  BatchResetChecksResponse,
} from '@shared/api.interface';

interface GetTasksParams {
  status?: string;
  checkMonth?: string;
  keyword?: string;
}

interface TaskListResponse {
  items: InventoryTaskItem[];
  total: number;
}

interface CheckListResponse {
  items: InventoryCheckItem[];
  total: number;
}

interface GetChecksParams {
  status?: string;
}

export async function getInventoryTasks(
  params: GetTasksParams = {}
): Promise<TaskListResponse> {
  const response = await axiosForBackend({
    url: '/api/inventory-tasks',
    method: 'GET',
    params,
  });
  return response.data;
}

export async function generateTaskNo(): Promise<{ taskNo: string }> {
  const response = await axiosForBackend({
    url: '/api/inventory-tasks/generate-no',
    method: 'GET',
  });
  return response.data;
}

export async function createInventoryTask(
  data: CreateInventoryTaskDto
): Promise<CreateInventoryTaskResponse> {
  const response = await axiosForBackend({
    url: '/api/inventory-tasks',
    method: 'POST',
    data,
  });
  return response.data;
}

export async function getInventoryTask(
  id: string
): Promise<InventoryTaskItem> {
  const response = await axiosForBackend({
    url: `/api/inventory-tasks/${id}`,
    method: 'GET',
  });
  return response.data;
}

export async function getInventoryChecks(
  taskId: string,
  params: GetChecksParams = {}
): Promise<CheckListResponse> {
  const response = await axiosForBackend({
    url: `/api/inventory-tasks/${taskId}/checks`,
    method: 'GET',
    params,
  });
  return response.data;
}

export async function updateInventoryCheck(
  checkId: string,
  data: UpdateInventoryCheckDto
): Promise<InventoryCheckItem> {
  const response = await axiosForBackend({
    url: `/api/inventory-checks/${checkId}`,
    method: 'PATCH',
    data,
  });
  return response.data;
}

export async function completeInventoryTask(
  taskId: string
): Promise<CompleteTaskResponse> {
  const response = await axiosForBackend({
    url: `/api/inventory-tasks/${taskId}/complete`,
    method: 'POST',
  });
  return response.data;
}

export async function resetInventoryChecks(
  taskId: string
): Promise<BatchResetChecksResponse> {
  const response = await axiosForBackend({
    url: `/api/inventory-tasks/${taskId}/reset-checks`,
    method: 'POST',
  });
  return response.data;
}

export async function confirmDiff(
  checkId: string,
  adjustStock: number,
  confirmType: 'profit' | 'loss' | 'adjust' = 'adjust',
): Promise<InventoryCheckItem> {
  const response = await axiosForBackend({
    url: `/api/inventory-checks/${checkId}/confirm-diff`,
    method: 'POST',
    data: { adjustStock, confirmType },
  });
  return response.data;
}

export async function regenerateInventoryChecks(
  taskId: string
): Promise<{ totalCount: number }> {
  const response = await axiosForBackend({
    url: `/api/inventory-tasks/${taskId}/regenerate-checks`,
    method: 'POST',
  });
  return response.data;
}

export async function clearAllInventoryTasks(): Promise<{ deletedCount: number }> {
  const response = await axiosForBackend({
    url: '/api/inventory-tasks/clear-all',
    method: 'DELETE',
  });
  return response.data;
}
