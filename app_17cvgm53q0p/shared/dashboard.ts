export interface DashboardSummary {
  monthOrderCount: number;
  pendingShipmentCount: number;
  monthSalesAmount: number;
  warningProductCount: number;
}

export interface TrendPoint {
  date: string;
  orderCount: number;
  salesAmount: number;
}

export interface TrendResponse {
  items: TrendPoint[];
}

export interface StatusDistributionItem {
  status: string;
  count: number;
}

export interface StatusDistributionResponse {
  items: StatusDistributionItem[];
}

export interface SalesRankItem {
  productName: string;
  salesCount: number;
}

export interface SalesRankResponse {
  items: SalesRankItem[];
}
