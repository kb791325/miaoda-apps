import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from '@lark-apaas/fullstack-nestjs-core';
import {
  eq,
  and,
  or,
  ilike,
  count,
  sum,
  inArray,
  desc,
  gte,
  sql,
} from 'drizzle-orm';
import {
  products,
  warehouseInventory,
  stockTransactions,
} from '@server/database/schema';
import type {
  DashboardStats,
  WarehouseInventoryItem,
  KpiStats,
  WarehouseDistribution,
  CategoryTurnover,
  WarningItem,
  DailyTrend,
  CategoryValue,
  TopValueItem,
} from '@shared/api.interface';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  async getDashboardStats(params?: {
    category?: string;
    status?: string;
    keyword?: string;
  }): Promise<DashboardStats> {
    const conditions = [];
    if (params?.category) {
      conditions.push(eq(products.category, params.category));
    }
    if (params?.status) {
      conditions.push(eq(products.status, params.status));
    }
    if (params?.keyword) {
      conditions.push(
        or(
          ilike(products.name, `%${params.keyword}%`),
          ilike(products.code, `%${params.keyword}%`),
        ),
      );
    }
    const productWhere =
      conditions.length > 0 ? and(...conditions) : undefined;

    const [
      totalSkuResult,
      stockAgg,
      categoryStats,
       outboundData,
       categoryStockRaw,
       categoryOutboundRaw,
       dailyTrendRaw,
      categoryValueRaw,
      topValueRaw,
    ] = await Promise.all([
      // 1. Total SKU count
      this.db
        .select({ count: count() })
        .from(products)
        .where(productWhere),

      // 2. Total stock & value
      this.db
        .select({
          totalStock: sum(warehouseInventory.quantity),
          totalValue: sum(warehouseInventory.stockValue),
        })
        .from(warehouseInventory),

      // 3. Per-category: safety stock sum & product count
      this.db
        .select({
          category: products.category,
          avgSafetyStock: sql<string>`COALESCE(AVG(${products.safetyStock}), 0)`,
          productCount: count(),
        })
        .from(products)
        .where(productWhere)
        .groupBy(products.category),

       // 4. Per-product outbound last 30 days
       this.db
         .select({
           productId: stockTransactions.productId,
           totalOut: sql<string>`COALESCE(SUM(${stockTransactions.quantity}), 0)`,
         })
         .from(stockTransactions)
         .where(
           and(
             eq(stockTransactions.type, 'outbound'),
             gte(
               stockTransactions.transactionDate,
               sql`NOW() - INTERVAL '30 days'`,
             ),
           ),
         )
         .groupBy(stockTransactions.productId),

       // 4b. Per-category stock quantity
       this.db
         .select({
           category: products.category,
           totalStock: sql<string>`COALESCE(SUM(${warehouseInventory.quantity}), 0)`,
         })
         .from(warehouseInventory)
         .innerJoin(
           products,
           eq(warehouseInventory.productId, products.id),
         )
         .groupBy(products.category),

       // 4c. Per-category outbound last 30 days
       this.db
         .select({
           category: products.category,
           totalOut: sql<string>`COALESCE(SUM(${stockTransactions.quantity}), 0)`,
         })
         .from(stockTransactions)
         .innerJoin(
           products,
           eq(stockTransactions.productId, products.id),
         )
         .where(
           and(
             eq(stockTransactions.type, 'outbound'),
             gte(
               stockTransactions.transactionDate,
               sql`NOW() - INTERVAL '30 days'`,
             ),
           ),
         )
         .groupBy(products.category),

       // 5. Daily trend last 7 days (generate_series 补全无数据日期，保证 7 天连续)
      this.db.execute<{ date: string; inbound: number; outbound: number }>(sql`
        SELECT to_char(d.day, 'YYYY-MM-DD') AS date,
               COALESCE(SUM(CASE WHEN t.type = 'inbound' THEN t.quantity ELSE 0 END), 0)::int AS inbound,
               COALESCE(SUM(CASE WHEN t.type = 'outbound' THEN t.quantity ELSE 0 END), 0)::int AS outbound
        FROM generate_series(CURRENT_DATE - 6, CURRENT_DATE, '1 day'::interval) AS d(day)
        LEFT JOIN ${stockTransactions} t ON t.transaction_date::date = d.day::date
        GROUP BY d.day
        ORDER BY d.day
      `),

      // 6. Category value
      this.db
        .select({
          category: products.category,
          value: sum(warehouseInventory.stockValue),
        })
        .from(warehouseInventory)
        .innerJoin(
          products,
          eq(warehouseInventory.productId, products.id),
        )
        .groupBy(products.category),

      // 7. Top 10 by value
      this.db
        .select({
          id: products.id,
          name: products.name,
          code: products.code,
          category: products.category,
          totalValue: sql<string>`COALESCE(SUM(${warehouseInventory.stockValue}), 0)`,
          totalQuantity: sql<string>`COALESCE(SUM(${warehouseInventory.quantity}), 0)`,
        })
        .from(products)
        .leftJoin(
          warehouseInventory,
          eq(products.id, warehouseInventory.productId),
        )
        .groupBy(
          products.id,
          products.name,
          products.code,
          products.category,
        )
        .orderBy(
          desc(sql`COALESCE(SUM(${warehouseInventory.stockValue}), 0)`),
        )
        .limit(10),
    ]);

    // KPI
    const kpi: KpiStats = {
      totalSku: Number(totalSkuResult[0]?.count ?? 0),
      totalStock: Number(stockAgg[0]?.totalStock ?? 0),
      totalValue: Number(stockAgg[0]?.totalValue ?? 0),
      warningCount: 0,
    };

    // Warehouse distribution
    const warehouseDistRaw = await this.db
      .select({
        warehouse: warehouseInventory.warehouse,
        quantity: sum(warehouseInventory.quantity),
      })
      .from(warehouseInventory)
      .groupBy(warehouseInventory.warehouse);

    const warehouseDistribution: WarehouseDistribution[] =
      warehouseDistRaw.map((w) => ({
        warehouse: w.warehouse,
        quantity: Number(w.quantity ?? 0),
      }));

    // Category turnover (总库存 / 日均出库 = 周转天数)
    const outboundByProduct = new Map<string, number>();
    for (const row of outboundData) {
      outboundByProduct.set(
        row.productId,
        Number(row.totalOut),
      );
    }

    const catStockMap = new Map<string, number>();
    for (const row of categoryStockRaw) {
      catStockMap.set(row.category, Number(row.totalStock ?? 0));
    }
    const catOutMap = new Map<string, number>();
    for (const row of categoryOutboundRaw) {
      catOutMap.set(row.category, Number(row.totalOut ?? 0));
    }

    const categoryTurnover: CategoryTurnover[] = categoryStats.map(
      (cs) => {
        const stock = catStockMap.get(cs.category) ?? 0;
        const outbound = catOutMap.get(cs.category) ?? 0;
        const dailyOut = outbound / 30;
        if (dailyOut <= 0 || stock <= 0) {
          return { category: cs.category, turnoverDays: 0 };
        }
        return {
          category: cs.category,
          turnoverDays: Math.round(stock / dailyOut),
        };
      },
    );

    // Warning list with health scores
    const allProductStock = await this.db
      .select({
        productId: warehouseInventory.productId,
        totalQuantity: sum(warehouseInventory.quantity),
        totalValue: sum(warehouseInventory.stockValue),
      })
      .from(warehouseInventory)
      .groupBy(warehouseInventory.productId);

    const stockByProduct = new Map<string, number>();
    const valueByProduct = new Map<string, number>();
    for (const row of allProductStock) {
      stockByProduct.set(row.productId, Number(row.totalQuantity ?? 0));
      valueByProduct.set(row.productId, Number(row.totalValue ?? 0));
    }

    const allProductsData = await this.db
      .select({
        id: products.id,
        name: products.name,
        code: products.code,
        category: products.category,
        unit: products.unit,
        safetyStock: products.safetyStock,
        unitPrice: products.unitPrice,
      })
      .from(products)
      .where(productWhere);

    const COVERAGE_DAYS = 7;
    const MIN_AUTO_SAFETY = 10;

    const catAvgValue = new Map<string, { total: number; count: number }>();
    for (const p of allProductsData) {
      const val = valueByProduct.get(p.id) ?? 0;
      const entry = catAvgValue.get(p.category) ?? { total: 0, count: 0 };
      entry.total += val;
      entry.count += 1;
      catAvgValue.set(p.category, entry);
    }

    const catTurnoverMap = new Map<string, number>();
    for (const ct of categoryTurnover) {
      catTurnoverMap.set(ct.category, ct.turnoverDays);
    }

    const warningList: WarningItem[] = allProductsData
      .map((p) => {
        const currentStock = stockByProduct.get(p.id) ?? 0;
        const totalValue = valueByProduct.get(p.id) ?? 0;
        const dailySales = (outboundByProduct.get(p.id) ?? 0) / 30;

        let safetyStock: number;
        if (dailySales > 0) {
          safetyStock = Math.max(MIN_AUTO_SAFETY, Math.ceil(dailySales * COVERAGE_DAYS));
        } else if (p.safetyStock > 0) {
          safetyStock = p.safetyStock;
        } else {
          safetyStock = MIN_AUTO_SAFETY;
        }

        const issues: string[] = [];

        if (currentStock === 0) {
          return {
            id: p.id,
            name: p.name,
            code: p.code,
            category: p.category,
            unit: p.unit,
            currentStock,
            safetyStock: p.safetyStock,
            gap: safetyStock,
            unitPrice: Number(p.unitPrice ?? 0),
            score: 0,
            level: '不健康',
            issues: '[缺货] 库存为零，已经断货，需立即补货',
          };
        }

        let deduction = 0;

        if (safetyStock > 0) {
          const ratio = currentStock / safetyStock;
          const excess = currentStock - Math.round(safetyStock * 1.5);
          if (ratio > 18) {
            issues.push(`[积压] 库存 ${currentStock} 为安全线 ${safetyStock} 的 ${ratio.toFixed(1)} 倍，冗余 ${excess}，极度积压，需立即处理`);
            deduction += 60;
          } else if (ratio > 12) {
            issues.push(`[积压] 库存 ${currentStock} 为安全线 ${safetyStock} 的 ${ratio.toFixed(1)} 倍，冗余 ${excess}，建议停止采购并清仓`);
            deduction += 50;
          } else if (ratio > 8) {
            issues.push(`[积压] 库存 ${currentStock} 为安全线 ${safetyStock} 的 ${ratio.toFixed(1)} 倍，冗余 ${excess}，严重积压`);
            deduction += 40;
          } else if (ratio > 5) {
            issues.push(`[积压] 库存 ${currentStock} 为安全线 ${safetyStock} 的 ${ratio.toFixed(1)} 倍，冗余 ${excess}，建议促销消化`);
            deduction += 30;
          } else if (ratio > 3) {
            issues.push(`[积压] 库存 ${currentStock} 为安全线 ${safetyStock} 的 ${ratio.toFixed(1)} 倍，冗余 ${excess}，建议减少采购`);
            deduction += 20;
          } else if (ratio > 1.5) {
            issues.push(`[积压] 库存 ${currentStock} 为安全线 ${safetyStock} 的 ${ratio.toFixed(1)} 倍，冗余 ${excess}`);
            deduction += 10;
          }
        }

        if (dailySales > 0 && currentStock > 0) {
          const days = Math.ceil(currentStock / dailySales);
          if (days > 365) {
            issues.push(`[滞销] 可售 ${days} 天（日均出库 ${dailySales.toFixed(1)}），严重滞销`);
            deduction += 10;
          } else if (days > 180) {
            issues.push(`[滞销] 可售 ${days} 天（日均出库 ${dailySales.toFixed(1)}），明显滞销`);
            deduction += 8;
          } else if (days > 90) {
            issues.push(`[滞销] 可售 ${days} 天（日均出库 ${dailySales.toFixed(1)}），轻度滞销`);
            deduction += 5;
          }
        } else {
          const catTurnover = catTurnoverMap.get(p.category) ?? 0;
          const catEntryAvg = catAvgValue.get(p.category);
          if (catTurnover > 0 && catEntryAvg && catEntryAvg.count > 0) {
            const avgStock = catEntryAvg.total > 0 ? catEntryAvg.total / catEntryAvg.count : 1;
            const stockRatio = avgStock > 0 ? currentStock / avgStock : 1;
            const estimatedDays = Math.round(catTurnover * stockRatio);
            if (estimatedDays > 365) {
              issues.push(`[滞销] 预估可售 ${estimatedDays} 天，严重滞销`);
              deduction += 10;
            } else if (estimatedDays > 180) {
              issues.push(`[滞销] 预估可售 ${estimatedDays} 天（品类均值 ${catTurnover} 天），明显滞销`);
              deduction += 8;
            } else if (estimatedDays > 90) {
              issues.push(`[滞销] 预估可售 ${estimatedDays} 天，轻度滞销`);
              deduction += 5;
            }
          }
        }

        if (currentStock < safetyStock) {
          const stockRatio = safetyStock > 0 ? currentStock / safetyStock : 0;
          if (currentStock === 0) {
            issues.unshift('[缺货] 库存为零，已经断货，需立即补货');
          } else if (stockRatio < 0.3) {
            issues.unshift(`[缺货] 当前库存 ${currentStock} 仅为安全线 ${safetyStock} 的 ${(stockRatio * 100).toFixed(0)}%，紧急补货`);
          } else if (stockRatio < 0.6) {
            issues.unshift(`[缺货] 当前库存 ${currentStock} 低于安全线 ${safetyStock}，建议补货`);
          } else {
            issues.unshift(`[关注] 当前库存 ${currentStock} 接近安全线 ${safetyStock}`);
          }
        }

        const score = Math.max(0, Math.round((100 - deduction) * 100) / 100);
        let level: string;
        if (score === 0) level = '不健康';
        else if (score <= 39) level = '预警';
        else if (score <= 69) level = '需关注';
        else if (score <= 89) level = '基本健康';
        else level = '健康';

        const issueText = issues.length > 0
          ? issues.join('；')
          : `库存 ${currentStock}，安全线 ${safetyStock}，运转良好`;

        return {
          id: p.id,
          name: p.name,
          code: p.code,
          category: p.category,
          unit: p.unit,
          currentStock,
          safetyStock: p.safetyStock,
          gap: Math.max(0, safetyStock - currentStock),
          unitPrice: Number(p.unitPrice ?? 0),
          score,
          level,
          issues: issueText,
        };
      })
      .sort((a, b) => a.score - b.score);

    kpi.warningCount = warningList.filter(
      (w) => w.level !== '健康' && w.level !== '基本健康',
    ).length;

    // Daily trend
    const dailyTrend: DailyTrend[] = dailyTrendRaw.map((d) => ({
      date: String(d.date),
      inbound: Number(d.inbound),
      outbound: Number(d.outbound),
    }));

    // Category value
    const categoryValue: CategoryValue[] = categoryValueRaw.map(
      (c) => ({
        category: c.category,
        value: Number(c.value ?? 0),
      }),
    );

    // Top value
    const topValue: TopValueItem[] = topValueRaw.map((t) => ({
      id: t.id,
      name: t.name,
      code: t.code,
      category: t.category,
      totalValue: Number(t.totalValue),
      totalQuantity: Number(t.totalQuantity),
    }));

    return {
      kpi,
      warehouseDistribution,
      categoryTurnover,
      warningList,
      dailyTrend,
      categoryValue,
      topValue,
    };
  }

  async getWarehouseStock(
    productId: string,
  ): Promise<WarehouseInventoryItem[]> {
    const inventory = await this.db
      .select()
      .from(warehouseInventory)
      .where(eq(warehouseInventory.productId, productId));

    return inventory.map((inv) => ({
      warehouse: inv.warehouse,
      quantity: inv.quantity,
      stockValue: Number(inv.stockValue),
    }));
  }
}
