import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type { DashboardResponse } from '@shared/api.interface';

export async function getDashboardData(): Promise<DashboardResponse> {
  const res = await axiosForBackend.get<DashboardResponse>('/api/dashboard');
  return res.data;
}
