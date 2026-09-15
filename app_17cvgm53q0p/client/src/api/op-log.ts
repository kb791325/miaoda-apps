import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';

import type { OpLogListResponse } from '@shared/op-log';

/** 按实体查询操作日志（分页） */
export async function fetchOpLogs(
  entityType: string,
  entityId: string,
  page: number = 1,
  pageSize: number = 20,
): Promise<OpLogListResponse> {
  const res = await axiosForBackend.get<OpLogListResponse>('/api/op-logs', {
    params: { entityType, entityId, page, pageSize },
  });
  return res.data;
}
