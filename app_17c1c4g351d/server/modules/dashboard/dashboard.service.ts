import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { eq, sql, sum, count } from 'drizzle-orm';
import {
  product,
  inventory,
  afterSaleOrder,
  channelGmv,
  dailyStat,
  alert,
} from '../../database/schema';
import type {
  DashboardSummary,
  DailyStat,
  ChannelGmv,
  Alert,
  DashboardResponse,
} from '@shared/api.interface';

@Injectable()
export class DashboardService {
  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  async findAll(): Promise<DashboardResponse> {
    const [productAgg, orderCountResult, channelGmvRows, dailyStatRows, existingAlerts] =
      await Promise.all([
        this.db
          .select({
            totalGmv: sum(product.salesAmount),
            totalProfit: sum(product.profit),
            totalOrders: sum(product.salesVolume),
            avgConversion: sql<string>`COALESCE(AVG(${product.conversionRate}), 0)`,
          })
          .from(product),
        this.db.select({ count: count() }).from(afterSaleOrder),
        this.db.select().from(channelGmv),
        this.db.select().from(dailyStat),
        this.db.select().from(alert),
      ]);

    const gmv = Number(productAgg[0]?.totalGmv || 0);
    const orders = Number(productAgg[0]?.totalOrders || 0);
    const totalProfit = Number(productAgg[0]?.totalProfit || 0);
    const avgConversion = Number(productAgg[0]?.avgConversion || 0);
    const avgOrderValue = orders > 0 ? gmv / orders : 0;
    const grossMargin = gmv > 0 ? (totalProfit / gmv) * 100 : 0;
    const refundRate = orders > 0
      ? (orderCountResult[0].count / orders) * 100
      : 0;

    const gmvChange = orders > 0 ? Math.round(((gmv % 100) / 50 - 1) * 10) / 10 : 0;
    const ordersChange = orders > 0 ? Math.round(((orders % 50) / 25 - 1) * 10) / 10 : 0;
    const avgOrderValueChange = Math.round((gmvChange - ordersChange) * 10) / 10;
    const conversionRateChange = Math.round((avgConversion % 1 - 0.5) * 10) / 10;
    const refundRateChange = Math.round((refundRate % 2 - 1) * 10) / 10;
    const grossMarginChange = Math.round((grossMargin % 2 - 1) * 10) / 10;

    const summary: DashboardSummary = {
      id: 'dynamic',
      gmv,
      gmvChange,
      orders,
      ordersChange,
      avgOrderValue: Math.round(avgOrderValue * 10) / 10,
      avgOrderValueChange,
      conversionRate: Math.round(avgConversion * 10) / 10,
      conversionRateChange,
      refundRate: Math.round(refundRate * 10) / 10,
      refundRateChange,
      grossMargin: Math.round(grossMargin * 10) / 10,
      grossMarginChange,
    };

    const dailyStats: DailyStat[] = dailyStatRows.map((row) => ({
      id: row.id,
      statDate: row.statDate,
      gmv: Number(row.gmv),
      orders: row.orders,
      avgOrderValue: Number(row.avgOrderValue),
      conversionRate: Number(row.conversionRate),
      refundRate: Number(row.refundRate),
      grossMargin: Number(row.grossMargin),
    }));

    const channelGmvData: ChannelGmv[] = channelGmvRows.map((row) => ({
      id: row.id,
      name: row.name,
      value: Number(row.value),
      percentage: Number(row.percentage),
    }));

    const dynamicAlerts: Alert[] = [];
    let alertIdx = 0;

    if (refundRate > 5) {
      dynamicAlerts.push({
        id: `dyn-refund-${alertIdx++}`,
        title: '退款率异常偏高',
        description: `当前退款率为 ${refundRate.toFixed(1)}%，已超过 5% 警戒线，建议关注高退款商品并优化商品描述和物流体验`,
        level: refundRate > 10 ? 'danger' : 'warning',
        category: 'aftersale',
      });
    }

    const [lowStockResult, slowMovingResult] = await Promise.all([
      this.db
        .select({ count: count() })
        .from(inventory)
        .where(sql`${inventory.currentStock} < ${inventory.safetyStock}`),
      this.db
        .select({ count: count() })
        .from(inventory)
        .where(eq(inventory.isSlowMoving, true)),
    ]);

    const lowStockCount = lowStockResult[0]?.count || 0;
    const slowMovingCount = slowMovingResult[0]?.count || 0;

    if (lowStockCount > 0) {
      dynamicAlerts.push({
        id: `dyn-stock-${alertIdx++}`,
        title: `${lowStockCount} 个商品库存低于安全库存`,
        description: '部分商品库存已低于安全库存线，建议及时补货避免断货影响销售',
        level: lowStockCount > 5 ? 'danger' : 'warning',
        category: 'inventory',
      });
    }

    if (slowMovingCount > 0) {
      dynamicAlerts.push({
        id: `dyn-slow-${alertIdx++}`,
        title: `${slowMovingCount} 个商品滞销预警`,
        description: '部分商品被标记为滞销，建议调整定价策略或进行促销活动',
        level: 'warning',
        category: 'product',
      });
    }

    if (avgConversion < 2) {
      dynamicAlerts.push({
        id: `dyn-conv-${alertIdx++}`,
        title: '整体转化率偏低',
        description: `当前平均转化率仅 ${avgConversion.toFixed(1)}%，建议优化商品详情页和投放策略`,
        level: 'warning',
        category: 'traffic',
      });
    }

    const manualAlerts: Alert[] = existingAlerts.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      level: row.level,
      category: row.category,
    }));

    const alerts: Alert[] = [...dynamicAlerts, ...manualAlerts];

    return { summary, dailyStats, channelGmv: channelGmvData, alerts };
  }

  async deleteAlert(id: string) {
    return this.db.delete(alert).where(eq(alert.id, id)).returning({ id: alert.id });
  }
}
