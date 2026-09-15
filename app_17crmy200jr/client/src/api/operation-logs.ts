import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  OperationLogListResponse,
  OperationLogDetail,
  OperationLogStatItem,
} from '@shared/api.interface';

interface GetListParams {
  page?: number;
  pageSize?: number;
  operatorId?: string;
  operationType?: string;
  targetType?: string;
  startDate?: string;
  endDate?: string;
}

export async function getList(
  params: GetListParams,
): Promise<OperationLogListResponse> {
  const res = await axiosForBackend({
    url: '/api/operation-logs',
    method: 'GET',
    params,
  });
  return res.data;
}

export async function getDetail(id: string): Promise<OperationLogDetail> {
  const res = await axiosForBackend({
    url: `/api/operation-logs/${id}`,
    method: 'GET',
  });
  return res.data;
}

export async function getStats(): Promise<OperationLogStatItem[]> {
  const res = await axiosForBackend({
    url: '/api/operation-logs/stats',
    method: 'GET',
  });
  return res.data;
}
