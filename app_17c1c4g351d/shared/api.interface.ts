/* 前后端共享的类型写在这里 */

// ===== Inventory =====
export interface InventoryItem {
  id: string;
  productId: string;
  productName: string;
  category: string;
  currentStock: number;
  safetyStock: number;
  avgDailySales7d: number;
  avgDailySales30d: number;
  daysAvailable: number;
  suggestedRestock: number;
  isSlowMoving: boolean;
  stockValue: number;
}

export interface InventoryListResponse {
  items: InventoryItem[];
}

export interface InventoryChangeRequest {
  productName: string;
  category: string;
  quantity: number;
  direction: 'in' | 'out';
}

export interface InventoryChangeResponse {
  item: InventoryItem;
  message: string;
}

export interface InventoryBatchChangeItem {
  productId: string;
  quantity: number;
  direction: 'in' | 'out';
}

export interface InventoryBatchChangeRequest {
  items: InventoryBatchChangeItem[];
}

export interface InventoryBatchChangeResult {
  productId: string;
  productName: string;
  success: boolean;
  message: string;
  newStock?: number;
}

export interface InventoryBatchChangeResponse {
  results: InventoryBatchChangeResult[];
  successCount: number;
  failedCount: number;
}

// ===== Dashboard =====
export interface DashboardSummary {
  id: string;
  gmv: number;
  gmvChange: number;
  orders: number;
  ordersChange: number;
  avgOrderValue: number;
  avgOrderValueChange: number;
  conversionRate: number;
  conversionRateChange: number;
  refundRate: number;
  refundRateChange: number;
  grossMargin: number;
  grossMarginChange: number;
}

export interface DailyStat {
  id: string;
  statDate: string;
  gmv: number;
  orders: number;
  avgOrderValue: number;
  conversionRate: number;
  refundRate: number;
  grossMargin: number;
}

export interface ChannelGmv {
  id: string;
  name: string;
  value: number;
  percentage: number;
}

export interface Alert {
  id: string;
  title: string;
  description: string;
  level: string;
  category: string;
}

export interface DashboardResponse {
  summary: DashboardSummary;
  dailyStats: DailyStat[];
  channelGmv: ChannelGmv[];
  alerts: Alert[];
}

// ===== Product =====
export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  cost: number;
  shippingCost: number;
  refundLossRate: number;
  salesVolume: number;
  salesAmount: number;
  profit: number;
  profitMargin: number;
  conversionRate: number;
  status: string;
  daysZeroSales: number;
}

export interface ProductListResponse {
  items: Product[];
}

export interface CreateProductRequest {
  name: string;
  category: string;
  price: number;
  cost: number;
  shippingCost: number;
  status: string;
}

export interface CreateProductResponse {
  item: Product;
}

// ===== Traffic =====
export interface TrafficChannel {
  id: string;
  name: string;
  cost: number;
  clicks: number;
  ctr: number;
  conversionRate: number;
  gmv: number;
  roi: number;
}

export interface TrafficKeyword {
  id: string;
  content: string;
  type: string;
  clicks: number;
  conversionRate: number;
  gmv: number;
  roi: number;
}

export interface TrafficResponse {
  channels: TrafficChannel[];
  keywords: TrafficKeyword[];
}

// ===== Customer =====
export interface Customer {
  id: string;
  customerCode: string;
  firstPurchaseDate: string;
  totalSpent: number;
  purchaseCount: number;
  lastPurchaseDate: string;
  rfmScore: number;
  tag: string;
}

export interface RfmDistribution {
  tag: string;
  count: number;
}

export interface RepurchaseTrend {
  id: string;
  month: string;
  rate: number;
}

export interface CustomerResponse {
  customers: Customer[];
  rfmDistribution: RfmDistribution[];
  repurchaseTrend: RepurchaseTrend[];
}

// ===== AfterSale =====
export interface AfterSaleOrder {
  id: string;
  orderNo: string;
  productId: string;
  productName: string;
  reason: string;
  handleType: 'refund' | 'compensation';
  refundAmount: number;
  compensationAmount: number;
  status: string;
  processDuration: number;
  isOverdue: boolean;
}

export interface AfterSaleCreateRequest {
  productId: string;
  productName: string;
  reason: string;
  handleType: 'refund' | 'compensation';
  refundAmount: number;
  compensationAmount: number;
}

export interface AfterSaleUpdateStatusRequest {
  status: '处理中' | '已完成' | '已拒绝';
  note?: string;
}

export interface ReasonCategory {
  reason: string;
  count: number;
}

export interface RefundRateTrend {
  date: string;
  rate: number;
}

export interface AfterSaleResponse {
  orders: AfterSaleOrder[];
  reasonCategories: ReasonCategory[];
  refundRateTrend: RefundRateTrend[];
}

// ===== Bitable Push =====

export type PushEntity = 'after-sale' | 'inventory' | 'review';

export interface PushBitableRequest {
  entity: PushEntity;
}

export interface PushBitableResult {
  pushed: number;
  updated: number;
  skipped: number;
  errors: string[];
}

// ===== Role Manager =====

export type { ForceRoleDTO, RoleMemberDTO, MemberMutationData } from '@lark-apaas/fullstack-nestjs-core';

export interface CreateRoleRequest {
  role: { name: string; description?: string; bizID: string };
}

export interface UpdateRoleRequest {
  role: { name?: string; description?: string };
}

export interface AddMembersRequest {
  members: import('@lark-apaas/fullstack-nestjs-core').MemberMutationData;
}

export interface RemoveMembersRequest {
  members: import('@lark-apaas/fullstack-nestjs-core').MemberMutationData;
}

export interface SearchMembersRequest {
  query: string;
  pageSize?: number;
  page?: number;
}
