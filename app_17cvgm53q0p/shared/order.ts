import type { CreateOrderFeeRequest, OrderFee } from './fee';
import type { StockChangeRecord } from './product';

export type { StockChangeRecord };
export type { CreateOrderFeeRequest, OrderFee };

export type OrderStatus =
  | '待出库'
  | '运输中'
  | '在安装'
  | '已完成'
  | '已取消';

export const ORDER_STATUS_OPTIONS: OrderStatus[] = [
  '待出库',
  '运输中',
  '在安装',
  '已完成',
  '已取消',
];

/**
 * 订单（对应飞书多维表格「订单表」）。
 * 金额/单价/商品名称由多维表格公式自动计算；客户与商品为关联字段。
 */
export interface Order {
  id: string;
  orderNo: string;
  customerId: string;
  customerName: string;
  productId: string;
  productName: string;
  quantity: number;
  amount: number;
  unitPrice: number;
  orderTime: string;
  status: OrderStatus;
  shipTime?: string;
  payStatus: string;
  expressNo: string;
  remark: string;
  /** 向客户收取的费用合计（服务端按费用明细聚合） */
  totalFee?: number;
}

export interface OrderListParams {
  /** 关键词：模糊匹配订单号/客户名/商品名 */
  keyword?: string;
  status?: OrderStatus;
  customerId?: string;
  dateStart?: string;
  dateEnd?: string;
  /** 1 起始页码 */
  page?: number;
  pageSize?: number;
}

export interface OrderListResponse {
  items: Order[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateOrderRequest {
  customerId: string;
  productId: string;
  quantity: number;
  address?: string;
  remark?: string;
  /** 费用明细（随订单一并创建，计入订单总金额） */
  fees?: CreateOrderFeeRequest[];
}

export type UpdateOrderRequest = CreateOrderRequest;

export interface CreateOrderResponse {
  id: string;
}

export interface OrderMutationResponse {
  success: boolean;
}

/** 订单详情：订单完整信息 + 费用明细 + 关联库存变动流水 */
export interface OrderDetail {
  order: Order;
  fees: OrderFee[];
  stockChanges: StockChangeRecord[];
}

export interface OrderBatchRequest {
  ids: string[];
}

/** 取消订单请求：取消原因必填 */
export interface CancelOrderRequest {
  cancelReason: string;
}

export interface OrderBatchResponse {
  successCount: number;
  failedIds: string[];
}
