import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  InventoryListResponse,
  InventoryChangeRequest,
  InventoryChangeResponse,
  InventoryBatchChangeRequest,
  InventoryBatchChangeResponse,
} from '@shared/api.interface';

export async function getInventoryList(): Promise<InventoryListResponse> {
  const res = await axiosForBackend.get<InventoryListResponse>('/api/inventory');
  return res.data;
}

export async function changeInventory(
  req: InventoryChangeRequest,
): Promise<InventoryChangeResponse> {
  const res = await axiosForBackend.post<InventoryChangeResponse>(
    '/api/inventory/change',
    req,
  );
  return res.data;
}

export async function batchChangeInventory(
  req: InventoryBatchChangeRequest,
): Promise<InventoryBatchChangeResponse> {
  const res = await axiosForBackend.post<InventoryBatchChangeResponse>(
    '/api/inventory/batch-change',
    req,
  );
  return res.data;
}
