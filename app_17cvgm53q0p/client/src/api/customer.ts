import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  Customer,
  CustomerListParams,
  CustomerListResponse,
  CustomerProfile,
  CreateCustomerResponse,
  CustomerMutationResponse,
  CustomerFormRequest,
} from '@shared/customer';
import type {
  CustomerCreditView,
  LedgerSummary,
  UpdateCustomerCreditRequest,
} from '@shared/finance-contract';
import { getWithRetry } from '@client/src/api/finance';

/** 客户列表查询（跨模块共享只读函数，订单表单/仪表盘等复用） */
export async function fetchCustomers(
  params: CustomerListParams = {},
): Promise<CustomerListResponse> {
  const res = await axiosForBackend.get<CustomerListResponse>(
    '/api/customers',
    { params },
  );
  return res.data;
}

export type { Customer };

/** 新建客户 */
export async function createCustomer(
  data: CustomerFormRequest,
): Promise<CreateCustomerResponse> {
  const res = await axiosForBackend.post<CreateCustomerResponse>(
    '/api/customers',
    data,
  );
  return res.data;
}

/** 更新客户档案 */
export async function updateCustomer(
  id: string,
  data: CustomerFormRequest,
): Promise<CustomerMutationResponse> {
  const res = await axiosForBackend.put<CustomerMutationResponse>(
    `/api/customers/${id}`,
    data,
  );
  return res.data;
}

/** 更新客户销售阶段（看板拖拽） */
export async function updateCustomerStage(
  id: string,
  stage: string,
): Promise<CustomerMutationResponse> {
  const res = await axiosForBackend.patch<CustomerMutationResponse>(
    `/api/customers/${id}/stage`,
    { stage },
  );
  return res.data;
}

/** 改派负责销售 */
export async function reassignCustomerOwner(
  id: string,
  ownerId: string,
): Promise<CustomerMutationResponse> {
  const res = await axiosForBackend.patch<CustomerMutationResponse>(
    `/api/customers/${id}/owner`,
    { ownerId },
  );
  return res.data;
}

/** 客户消费画像 */
export async function fetchCustomerProfile(
  id: string,
): Promise<CustomerProfile> {
  const res = await axiosForBackend.get<CustomerProfile>(
    `/api/customers/${id}/profile`,
  );
  return res.data;
}

/** 客户应收欠款汇总（销售/财务在客户档案可见） */
export async function fetchCustomerReceivableSummary(
  id: string,
): Promise<LedgerSummary> {
  const res = await axiosForBackend.get<LedgerSummary>(
    `/api/customers/${id}/receivable-summary`,
  );
  return res.data;
}

/** 客户信用额度视图（额度/已用/剩余/预警，失败由调用方降级） */
export async function fetchCustomerCredit(
  id: string,
): Promise<CustomerCreditView> {
  const res = await getWithRetry<CustomerCreditView>(
    `/api/customers/${id}/credit`,
  );
  return res.data;
}

/** 更新客户信用额度与预警比例（非法值服务端返回 400） */
export async function updateCustomerCredit(
  id: string,
  dto: UpdateCustomerCreditRequest,
): Promise<{ success: boolean }> {
  const res = await axiosForBackend.patch<{ success: boolean }>(
    `/api/customers/${id}/credit`,
    dto,
  );
  return res.data;
}

/** 删除客户（存在关联订单/跟进记录时服务端拒绝） */
export async function deleteCustomer(
  id: string,
): Promise<CustomerMutationResponse> {
  const res = await axiosForBackend.delete<CustomerMutationResponse>(
    `/api/customers/${id}`,
  );
  return res.data;
}
