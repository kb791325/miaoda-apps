import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';

import type {
  CreateOrderRequest,
  CreateOrderResponse,
  OrderBatchRequest,
  OrderBatchResponse,
  OrderDetail,
  OrderListParams,
  OrderListResponse,
  OrderMutationResponse,
} from '@shared/order';

/** 订单列表查询（关键词/状态/客户/日期筛选 + 偏移分页） */
export async function fetchOrders(
  params: OrderListParams = {},
): Promise<OrderListResponse> {
  const res = await axiosForBackend.get<OrderListResponse>('/api/orders', {
    params,
  });
  return res.data;
}

/** 订单详情（含库存变动流水） */
export async function fetchOrderDetail(id: string): Promise<OrderDetail> {
  const res = await axiosForBackend.get<OrderDetail>(
    `/api/orders/${id}/detail`,
  );
  return res.data;
}

/** 更新订单支付状态（财务/管理员） */
export async function updateOrderPayStatus(
  id: string,
  payStatus: string,
): Promise<void> {
  await axiosForBackend.patch(`/api/orders/${id}/pay-status`, { payStatus });
}

/** 创建订单（自动生成待出库配送安装单，库存确认出库时扣减） */
export async function createOrder(
  body: CreateOrderRequest,
): Promise<CreateOrderResponse> {
  const res = await axiosForBackend.post<CreateOrderResponse>(
    '/api/orders',
    body,
  );
  return res.data;
}

/** 更新订单（待出库订单同步更新配送安装单） */
export async function updateOrder(
  id: string,
  body: CreateOrderRequest,
): Promise<OrderMutationResponse> {
  const res = await axiosForBackend.put<OrderMutationResponse>(
    `/api/orders/${id}`,
    body,
  );
  return res.data;
}

/** 取消订单（未完成订单可取消，原因必填；已出库自动回补库存） */
export async function cancelOrder(
  id: string,
  cancelReason: string,
): Promise<OrderMutationResponse> {
  const res = await axiosForBackend.post<OrderMutationResponse>(
    `/api/orders/${id}/cancel`,
    { cancelReason },
  );
  return res.data;
}

/** 删除订单（进行中配送单的订单禁止删除） */
export async function deleteOrder(id: string): Promise<OrderMutationResponse> {
  const res = await axiosForBackend.delete<OrderMutationResponse>(
    `/api/orders/${id}`,
  );
  return res.data;
}

/** 批量删除（进行中配送单的订单跳过） */
export async function batchDeleteOrders(
  body: OrderBatchRequest,
): Promise<OrderBatchResponse> {
  const res = await axiosForBackend.post<OrderBatchResponse>(
    '/api/orders/batch-delete',
    body,
  );
  return res.data;
}
