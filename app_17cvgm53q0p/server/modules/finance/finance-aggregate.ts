import { BadRequestException } from '@nestjs/common';
import type {
  CustomerProfitRow,
  FinanceExportType,
  FinanceGroupBy,
  FinanceSummary,
  FinanceTrendPoint,
  ProductProfitRow,
} from '@shared/finance';

const DAY_MS = 86400000;

/** 金额保留两位小数 */
export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function pad2(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

/** 单笔订单的财务口径中间结果 */
export interface OrderFinance {
  id: string;
  orderTs: number;
  productId: string;
  productName: string;
  customerId: string;
  /** 订单购买数量（商品维度销量累加用） */
  quantity: number;
  revenue: number;
  goodsCost: number;
  feeCost: number;
  profit: number;
}

/** 维度聚合累加器 */
interface DimensionAgg {
  name: string;
  orderCount: number;
  quantity: number;
  revenue: number;
  cost: number;
  profit: number;
}

/** 趋势聚合累加器 */
interface TrendAgg {
  revenue: number;
  goodsCost: number;
  feeCost: number;
  orderCount: number;
}

/** groupBy 参数校验与缺省（缺省 day） */
export function normalizeGroupBy(groupBy?: string): FinanceGroupBy {
  if (groupBy === undefined || groupBy === '') return 'day';
  if (groupBy !== 'day' && groupBy !== 'week' && groupBy !== 'month') {
    throw new BadRequestException('groupBy 仅支持 day/week/month');
  }
  return groupBy;
}

/** export type 参数校验 */
export function normalizeExportType(type?: string): FinanceExportType {
  if (type !== 'timeline' && type !== 'product' && type !== 'customer') {
    throw new BadRequestException('type 仅支持 timeline/product/customer');
  }
  return type;
}

/** 财务汇总 */
export function buildSummary(orders: OrderFinance[]): FinanceSummary {
  let totalRevenue = 0;
  let totalGoodsCost = 0;
  let totalFeeCost = 0;
  let totalProfit = 0;
  for (const order of orders) {
    totalRevenue += order.revenue;
    totalGoodsCost += order.goodsCost;
    totalFeeCost += order.feeCost;
    totalProfit += order.profit;
  }
  const orderCount: number = orders.length;
  const avgProfitRate: number =
    totalRevenue > 0 ? round2((totalProfit / totalRevenue) * 100) : 0;
  const avgOrderValue: number =
    orderCount > 0 ? round2(totalRevenue / orderCount) : 0;
  return {
    totalRevenue: round2(totalRevenue),
    totalGoodsCost: round2(totalGoodsCost),
    totalFeeCost: round2(totalFeeCost),
    totalProfit: round2(totalProfit),
    avgProfitRate,
    orderCount,
    avgOrderValue,
  };
}

/** 趋势分组（period 按 Asia/Shanghai 日期），期间升序 */
export function buildTrend(
  orders: OrderFinance[],
  groupBy: FinanceGroupBy,
): FinanceTrendPoint[] {
  const byPeriod = new Map<string, TrendAgg>();
  for (const order of orders) {
    const period: string = periodKey(order.orderTs, groupBy);
    const agg: TrendAgg =
      byPeriod.get(period) ??
      { revenue: 0, goodsCost: 0, feeCost: 0, orderCount: 0 };
    agg.revenue += order.revenue;
    agg.goodsCost += order.goodsCost;
    agg.feeCost += order.feeCost;
    agg.orderCount += 1;
    byPeriod.set(period, agg);
  }
  const periods: string[] = Array.from(byPeriod.keys()).sort();
  return periods.map((period: string) => {
    const agg: TrendAgg = byPeriod.get(period) as TrendAgg;
    const profit: number = round2(agg.revenue - agg.goodsCost - agg.feeCost);
    const profitRate: number =
      agg.revenue > 0 ? round2((profit / agg.revenue) * 100) : 0;
    return {
      period,
      revenue: round2(agg.revenue),
      goodsCost: round2(agg.goodsCost),
      feeCost: round2(agg.feeCost),
      profit,
      profitRate,
      orderCount: agg.orderCount,
    };
  });
}

/** 毫秒时间戳 → 分组键（Asia/Shanghai） */
export function periodKey(ts: number, groupBy: FinanceGroupBy): string {
  const local: Date = new Date(ts + 8 * 3600 * 1000);
  const year: number = local.getUTCFullYear();
  const month: number = local.getUTCMonth() + 1;
  const day: number = local.getUTCDate();
  if (groupBy === 'month') {
    return `${year}-${pad2(month)}`;
  }
  if (groupBy === 'week') {
    const dow: number = local.getUTCDay();
    const diffDays: number = (dow + 6) % 7;
    const monday: Date = new Date(
      Date.UTC(year, month - 1, day) - diffDays * DAY_MS,
    );
    return `${monday.getUTCFullYear()}-${pad2(monday.getUTCMonth() + 1)}-${pad2(monday.getUTCDate())}`;
  }
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

/** 商品维度聚合（利润降序）；费用全额计入该商品订单成本 */
export function buildProductRows(orders: OrderFinance[]): ProductProfitRow[] {
  const byProduct = new Map<string, DimensionAgg>();
  for (const order of orders) {
    const agg: DimensionAgg =
      byProduct.get(order.productId) ??
      { name: '', orderCount: 0, quantity: 0, revenue: 0, cost: 0, profit: 0 };
    if (!agg.name && order.productName) agg.name = order.productName;
    agg.orderCount += 1;
    agg.quantity += order.quantity;
    agg.revenue += order.revenue;
    agg.cost += order.goodsCost + order.feeCost;
    agg.profit += order.profit;
    byProduct.set(order.productId, agg);
  }
  return Array.from(byProduct.entries())
    .map(([productId, agg]: [string, DimensionAgg]) => {
      const revenue: number = round2(agg.revenue);
      const cost: number = round2(agg.cost);
      const profit: number = round2(agg.profit);
      return {
        productId,
        productName: agg.name,
        quantity: agg.quantity,
        revenue,
        cost,
        profit,
        profitRate: revenue > 0 ? round2((profit / revenue) * 100) : 0,
      };
    })
    .sort((a: ProductProfitRow, b: ProductProfitRow) => b.profit - a.profit);
}

/** 客户维度聚合（利润降序），客户名从 nameMap 回填 */
export function buildCustomerRows(
  orders: OrderFinance[],
  nameMap: Map<string, string>,
): CustomerProfitRow[] {
  const byCustomer = new Map<string, DimensionAgg>();
  for (const order of orders) {
    const agg: DimensionAgg =
      byCustomer.get(order.customerId) ??
      { name: '', orderCount: 0, quantity: 0, revenue: 0, cost: 0, profit: 0 };
    agg.orderCount += 1;
    agg.revenue += order.revenue;
    agg.cost += order.goodsCost + order.feeCost;
    agg.profit += order.profit;
    byCustomer.set(order.customerId, agg);
  }
  return Array.from(byCustomer.entries())
    .map(([customerId, agg]: [string, DimensionAgg]) => {
      const revenue: number = round2(agg.revenue);
      const cost: number = round2(agg.cost);
      const profit: number = round2(agg.profit);
      return {
        customerId,
        customerName: nameMap.get(customerId) ?? '',
        orderCount: agg.orderCount,
        revenue,
        cost,
        profit,
        profitRate: revenue > 0 ? round2((profit / revenue) * 100) : 0,
      };
    })
    .sort((a: CustomerProfitRow, b: CustomerProfitRow) => b.profit - a.profit);
}

/** 导出文件名中的日期（Asia/Shanghai，YYYYMMDD） */
export function formatFileDate(): string {
  const now: Date = new Date(Date.now() + 8 * 3600 * 1000);
  return `${now.getUTCFullYear()}${pad2(now.getUTCMonth() + 1)}${pad2(now.getUTCDate())}`;
}
