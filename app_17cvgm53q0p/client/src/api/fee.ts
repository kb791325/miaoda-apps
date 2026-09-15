import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';

import type {
  CreateFeeTypeRequest,
  CreateOrderFeeRequest,
  FeeType,
  FeeTypeListResponse,
  FeeTypeMutationResponse,
  OrderFee,
  OrderFeeListResponse,
  OrderFeeMutationResponse,
  UpdateOrderFeeRequest,
} from '@shared/fee';

/** 费用类型列表 */
export async function fetchFeeTypes(): Promise<FeeTypeListResponse> {
  const res = await axiosForBackend.get<FeeTypeListResponse>('/api/fee-types');
  return res.data;
}

/** 新增费用类型（同名返回 409） */
export async function createFeeType(
  body: CreateFeeTypeRequest,
): Promise<FeeType> {
  const res = await axiosForBackend.post<FeeType>('/api/fee-types', body);
  return res.data;
}

/** 删除费用类型（已被订单费用使用时返回 409） */
export async function deleteFeeType(
  id: string,
): Promise<FeeTypeMutationResponse> {
  const res = await axiosForBackend.delete<FeeTypeMutationResponse>(
    `/api/fee-types/${id}`,
  );
  return res.data;
}

/** 订单费用明细列表 */
export async function fetchOrderFees(
  orderId: string,
): Promise<OrderFeeListResponse> {
  const res = await axiosForBackend.get<OrderFeeListResponse>(
    `/api/orders/${orderId}/fees`,
  );
  return res.data;
}

/** 添加订单费用明细 */
export async function addOrderFee(
  orderId: string,
  body: CreateOrderFeeRequest,
): Promise<OrderFee> {
  const res = await axiosForBackend.post<OrderFee>(
    `/api/orders/${orderId}/fees`,
    body,
  );
  return res.data;
}

/** 更新订单费用明细 */
export async function updateOrderFee(
  orderId: string,
  feeId: string,
  body: UpdateOrderFeeRequest,
): Promise<OrderFee> {
  const res = await axiosForBackend.put<OrderFee>(
    `/api/orders/${orderId}/fees/${feeId}`,
    body,
  );
  return res.data;
}

/** 删除订单费用明细 */
export async function deleteOrderFee(
  orderId: string,
  feeId: string,
): Promise<OrderFeeMutationResponse> {
  const res = await axiosForBackend.delete<OrderFeeMutationResponse>(
    `/api/orders/${orderId}/fees/${feeId}`,
  );
  return res.data;
}
