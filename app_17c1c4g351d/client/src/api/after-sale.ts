import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  AfterSaleResponse,
  AfterSaleCreateRequest,
  AfterSaleUpdateStatusRequest,
  AfterSaleOrder,
} from '@shared/api.interface';

export async function getAfterSaleData(): Promise<AfterSaleResponse> {
  const res = await axiosForBackend.get<AfterSaleResponse>('/api/after-sale');
  return res.data;
}

export async function createAfterSaleOrder(
  req: AfterSaleCreateRequest,
): Promise<AfterSaleOrder> {
  const res = await axiosForBackend.post<AfterSaleOrder>(
    '/api/after-sale',
    req,
  );
  return res.data;
}

export async function updateAfterSaleStatus(
  id: string,
  status: AfterSaleUpdateStatusRequest['status'],
): Promise<AfterSaleOrder> {
  const res = await axiosForBackend.patch<AfterSaleOrder>(
    `/api/after-sale/${id}/status`,
    { status },
  );
  return res.data;
}
