export interface FinanceReportSummary {
  totalRevenue: number;
  totalCost: number;
  totalFee: number;
  totalProfit: number;
  orderCount: number;
}

export interface FinanceReportRow {
  orderId: string;
  orderNo: string;
  orderTime: string;
  customerName: string;
  productName: string;
  quantity: number;
  revenue: number;
  cost: number;
  fee: number;
  profit: number;
  payStatus: string;
}

export interface FinanceReportResponse {
  summary: FinanceReportSummary;
  items: FinanceReportRow[];
}
