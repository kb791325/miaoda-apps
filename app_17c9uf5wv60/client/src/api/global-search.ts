import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type { GlobalSearchResponse } from '@shared/api.interface';

export async function searchAll(keyword: string): Promise<GlobalSearchResponse> {
  const res = await axiosForBackend.get<GlobalSearchResponse>('/api/global-search', { params: { keyword } });
  return res.data;
}
