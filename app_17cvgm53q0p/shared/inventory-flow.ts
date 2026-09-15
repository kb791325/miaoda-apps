/** 库存流水业务类型（流水台账枚举，含历史兼容值） */
export const INVENTORY_FLOW_BUSINESS_TYPES = [
  '采购入库',
  '退货入库',
  '销售出库',
  '发货出库',
  '发货退回',
  '其他出库',
  '订单恢复',
] as const;

export type InventoryFlowBusinessType =
  (typeof INVENTORY_FLOW_BUSINESS_TYPES)[number];

export interface InventoryFlow {
  id: string;
  flowNo: string;
  productId: string;
  productName: string;
  /** in=入库 out=出库 */
  changeDirection: 'in' | 'out';
  businessType: string;
  quantity: number;
  stockBefore: number;
  stockAfter: number;
  /** 关联订单号（无则空串） */
  orderNo: string;
  /** 关联发货单号（无则空串） */
  shipmentNo: string;
  operatorId: string;
  operatorName: string;
  operatedAt: string;
  remark: string;
}

export interface InventoryFlowListParams {
  productId?: string;
  businessType?: string;
  /** YYYY-MM-DD，含当天 */
  startTime?: string;
  /** YYYY-MM-DD，含当天 */
  endTime?: string;
  page?: number;
  pageSize?: number;
}

export interface InventoryFlowListResponse {
  items: InventoryFlow[];
  total: number;
  page: number;
  pageSize: number;
}

export interface UpdateProductProfileRequest {
  /** 成本价，>=0 */
  costPrice: number;
}
