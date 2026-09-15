import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type { TrafficResponse } from '@shared/api.interface';

export async function getTrafficData(): Promise<TrafficResponse> {
  const res = await axiosForBackend.get<TrafficResponse>('/api/traffic');
  return res.data;
}
