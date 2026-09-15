/** 财务统计汇总（区间内已完成订单） */
export interface FinanceSummary {
  /** 订单总收入 = Σ(订单金额 + 向客户收取的费用) */
  totalRevenue: number;
  /** 商品总成本 = Σ(数量 × 下单时成本价) */
  totalGoodsCost: number;
  /** 费用总成本 = Σ(全部订单费用，含不向客户收取的) */
  totalFeeCost: number;
  /** 总利润 = 总收入 - 商品成本 - 费用成本 */
  totalProfit: number;
  /** 平均利润率（%，总利润 / 总收入） */
  avgProfitRate: number;
  /** 订单数量 */
  orderCount: number;
  /** 客单价 = 总收入 / 订单数 */
  avgOrderValue: number;
}

/** 收入/成本/利润趋势点 */
export interface FinanceTrendPoint {
  /** 分组键：day=YYYY-MM-DD；week=周一日期；month=YYYY-MM */
  period: string;
  revenue: number;
  goodsCost: number;
  feeCost: number;
  profit: number;
  /** 当期利润率（%） */
  profitRate: number;
  orderCount: number;
}

/** 商品利润行（仪表盘排行 / 商品报表共用） */
export interface ProductProfitRow {
  productId: string;
  productName: string;
  /** 销量（订单数量合计） */
  quantity: number;
  revenue: number;
  cost: number;
  profit: number;
  profitRate: number;
}

/** 客户利润行（仪表盘排行 / 客户报表共用） */
export interface CustomerProfitRow {
  customerId: string;
  customerName: string;
  orderCount: number;
  revenue: number;
  cost: number;
  profit: number;
  profitRate: number;
}

export interface FinanceDashboardResponse {
  summary: FinanceSummary;
  /** 收入/成本/利润趋势（按日/月） */
  trend: FinanceTrendPoint[];
  /** 商品利润排行 Top10 */
  productRank: ProductProfitRow[];
  /** 客户利润排行 Top10 */
  customerRank: CustomerProfitRow[];
}

/** 利润报表分组维度 */
export type FinanceGroupBy = 'day' | 'week' | 'month';

export interface FinanceReportTimelineResponse {
  summary: FinanceSummary;
  rows: FinanceTrendPoint[];
}

export interface FinanceReportProductResponse {
  summary: FinanceSummary;
  rows: ProductProfitRow[];
}

export interface FinanceReportCustomerResponse {
  summary: FinanceSummary;
  rows: CustomerProfitRow[];
}

/** Excel 导出维度 */
export type FinanceExportType = 'timeline' | 'product' | 'customer';
