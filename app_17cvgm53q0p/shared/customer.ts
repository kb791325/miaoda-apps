import type { FollowUpRecord } from './follow-up';

export const CUSTOMER_GRADES = ['普通', '重要', 'VIP'] as const;
export type CustomerGrade = (typeof CUSTOMER_GRADES)[number];

export const CUSTOMER_SOURCES = [
  '门店自然客流',
  '老客推荐',
  '线上咨询',
  '电话营销',
  '其他',
] as const;
export type CustomerSource = (typeof CUSTOMER_SOURCES)[number];

export const SALES_STAGES = [
  '线索',
  '初步接触',
  '需求确认',
  '方案报价',
  '谈判中',
  '已成交',
  '已流失',
] as const;
export type SalesStage = (typeof SALES_STAGES)[number];

export interface CustomerCrmInfo {
  grade: string;
  source: string;
  salesStage: string;
  ownerId: string;
  ownerName: string;
  firstContactAt: string;
  expectedDealAt: string;
  nextFollowUpAt: string;
  lastFollowUpAt: string;
  createdAt: string;
}

export interface Customer {
  id: string;
  customerName: string;
  phone: string;
  address: string;
  totalAmount: number;
  orderCount: number;
  customerLevel: string;
  crm: CustomerCrmInfo;
}

export interface CustomerListParams {
  keyword?: string;
  grade?: string;
  ownerId?: string;
  createdFrom?: string;
  createdTo?: string;
}

export interface CustomerListResponse {
  items: Customer[];
  total: number;
}

export interface CustomerFormRequest {
  customerName: string;
  phone: string;
  address: string;
  grade?: string;
  source?: string;
  salesStage?: string;
  ownerId?: string | null;
  firstContactAt?: string;
  expectedDealAt?: string;
  nextFollowUpAt?: string;
}

export type CreateCustomerRequest = CustomerFormRequest;
export type UpdateCustomerRequest = CustomerFormRequest;

export interface CreateCustomerResponse {
  id: string;
}

export interface CustomerMutationResponse {
  success: boolean;
}

export interface UpdateCustomerStageRequest {
  stage: string;
}

export interface CustomerTopProduct {
  productName: string;
  quantity: number;
}

export interface CustomerRecentOrder {
  id: string;
  orderNo: string;
  productName: string;
  quantity: number;
  amount: number;
  orderTime: string;
  status: string;
}

export interface CustomerProfile {
  customerId: string;
  customerName: string;
  phone: string;
  address: string;
  totalAmount: number;
  orderCount: number;
  avgOrderAmount: number;
  lastOrderTime?: string;
  topProducts: CustomerTopProduct[];
  /** 全量历史订单（含已取消，按下单时间倒序） */
  orders: CustomerRecentOrder[];
  crm: CustomerCrmInfo;
  followUps: FollowUpRecord[];
}
