/** 费用类型（应用数据库 fee_type 表） */
export interface FeeType {
  id: string;
  name: string;
  isDefault: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface FeeTypeListResponse {
  items: FeeType[];
}

export interface CreateFeeTypeRequest {
  name: string;
}

export interface FeeTypeMutationResponse {
  success: boolean;
}

/** 订单费用明细（应用数据库 order_fee 表） */
export interface OrderFee {
  id: string;
  orderId: string;
  feeTypeId: string;
  feeTypeName: string;
  amount: number;
  isChargeCustomer: boolean;
  remark: string;
  createdAt: string;
}

export interface OrderFeeListResponse {
  items: OrderFee[];
}

export interface CreateOrderFeeRequest {
  feeTypeId: string;
  amount: number;
  /** 是否向客户收取，默认 true */
  isChargeCustomer?: boolean;
  remark?: string;
}

export interface UpdateOrderFeeRequest {
  amount?: number;
  isChargeCustomer?: boolean;
  remark?: string;
}

export interface OrderFeeMutationResponse {
  success: boolean;
}
