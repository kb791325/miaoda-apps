import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type { CustomerResponse } from '@shared/api.interface';

export async function getCustomerData(): Promise<CustomerResponse> {
  const res = await axiosForBackend.get<CustomerResponse>('/api/customers');
  return res.data;
}
