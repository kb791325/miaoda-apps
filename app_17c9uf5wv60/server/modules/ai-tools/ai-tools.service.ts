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
  gte,
  lt,
  inArray,
  desc,
  sql,
  sum,
  count,
} from 'drizzle-orm';
import {
  products,
  warehouseInventory,
  stockTransactions,
  inventoryChecks,
  inventoryCheckItems,
} from '@server/database/schema';
import type {
  AnomalyDetectionResponse,
  AnomalyDetectionItem,
  HealthScoreResponse,
  HealthScoreDimension,
  ReplenishmentResponse,
  ReplenishmentItem,
  SalesPredictionItem,
  TransferSuggestionResponse,
  TransferSuggestionItem,
  NaturalLanguageQueryResponse,
} from '@shared/api.interface';

@Injectable()
export class AiToolsService {
  private readonly logger = new Logger(AiToolsService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  // ============ 1. 异常检测 ============
  async getAnomalyDetection(params: {
    type?: string;
    warehouse?: string;
  }): Promise<AnomalyDetectionResponse> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);

    // Build where conditions
    const conditions = [
      eq(stockTransactions.type, 'outbound'),
      gte(stockTransactions.transactionDate, thirtyDaysAgo),
    ];
    if (params.warehouse) {
      conditions.push(eq(stockTransactions.warehouse, params.warehouse));
    }

    // Query daily outbound per product + warehouse
    const dailyRows = await this.db
      .select({
        productId: stockTransactions.productId,
        warehouse: stockTransactions.warehouse,
        day: sql<string>`DATE(${stockTransactions.transactionDate})`,
        totalQty: sum(stockTransactions.quantity).as('total_qty'),
      })
      .from(stockTransactions)
      .where(and(...conditions))
      .groupBy(
        stockTransactions.productId,
        stockTransactions.warehouse,
        sql`DATE(${stockTransactions.transactionDate})`,
      );

    // Get product info for all products in result
    const productIds = Array.from(new Set(dailyRows.map((r: { productId: string }) => r.productId)));

    // Also include products with zero outbound (for stagnation detection)
    // We need all active products
    const allProducts = await this.db
      .select({
        id: products.id,
        name: products.name,
        code: products.code,
        safetyStock: products.safetyStock,
        unitPrice: products.unitPrice,
      })
      .from(products)
      .where(eq(products.status, 'active'));

    const productMap = new Map<string, { name: string; code: string }>();
    for (const p of allProducts) {
      productMap.set(p.id, { name: p.name, code: p.code });
    }

    // Aggregate by product, compute per-warehouse and per-day
    // Structure: Map<productId, Map<warehouse, Map<dayStr, qty>>>
    const productWarehouseDaily = new Map<
      string,
      Map<string, Map<string, number>>
    >();

    for (const row of dailyRows as { productId: string; warehouse: string; day: string; totalQty: string | number }[]) {
      const qty = Number(row.totalQty);
      if (!productWarehouseDaily.has(row.productId)) {
        productWarehouseDaily.set(row.productId, new Map());
      }
      const whMap = productWarehouseDaily.get(row.productId)!;
      if (!whMap.has(row.warehouse)) {
        whMap.set(row.warehouse, new Map());
      }
      const dayMap = whMap.get(row.warehouse)!;
      dayMap.set(row.day, qty);
    }

    // Generate all 30 dates
    const dateLabels30: string[] = [];
    for (let i = 29; i >= 0; i -= 1) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      dateLabels30.push(d.toISOString().slice(0, 10));
    }

    const items: AnomalyDetectionItem[] = [];

    // For anomaly detection, we aggregate across warehouses per product
    // but identify the warehouse with most outbound
    const productsToCheck = params.type === 'stagnation'
      ? allProducts.map((p) => p.id)
      : Array.from(new Set([...productIds, ...allProducts.map((p) => p.id)]));

    for (const productId of productsToCheck) {
      const prodInfo = productMap.get(productId);
      if (!prodInfo) continue;

      const whMap = productWarehouseDaily.get(productId);
      // Aggregate all warehouses for daily totals
      const dailyTotals = new Map<string, number>();
      let topWarehouse = '';
      let topWhTotal = 0;

      if (whMap) {
        for (const [wh, dayMap] of whMap.entries()) {
          let whTotal = 0;
          for (const [day, qty] of dayMap.entries()) {
            whTotal += qty;
            dailyTotals.set(day, (dailyTotals.get(day) ?? 0) + qty);
          }
          if (whTotal > topWhTotal) {
            topWhTotal = whTotal;
            topWarehouse = wh;
          }
        }
      }

      // Build last30Days array
      const last30Days: { date: string; quantity: number }[] = dateLabels30.map(
        (date: string) => ({
          date,
          quantity: dailyTotals.get(date) ?? 0,
        }),
      );

      // Calculate 30-day stats
      const quantities30 = last30Days.map((d) => d.quantity);
      const total30 = quantities30.reduce((a, b) => a + b, 0);
      const avgDaily = total30 / 30;

      // Calculate 7-day stats (last 7 elements in last30Days)
      const last7Days = last30Days.slice(-7);
      const total7 = last7Days.reduce((a, b) => a + b.quantity, 0);
      const recentDaily = total7 / 7;

      // Standard deviation (30 days)
      const variance = quantities30.reduce(
        (acc: number, q: number) => acc + Math.pow(q - avgDaily, 2),
        0,
      ) / 30;
      const stdDev = Math.sqrt(variance);

      const zScore = Math.abs(recentDaily - avgDaily) / (stdDev + 0.0001);

      // Determine anomaly type
      let anomalyType: 'spike' | 'drop' | 'stagnation' | null = null;
      let suggestedAction = '';
      let anomalyMagnitude = 0;

      if (total30 < 1) {
        anomalyType = 'stagnation';
        suggestedAction = '建议调拨或清理库存';
        anomalyMagnitude = 0;
      } else if (recentDaily > avgDaily * 1.5 && zScore > 2.5) {
        anomalyType = 'spike';
        suggestedAction = '建议及时补货';
        anomalyMagnitude = avgDaily > 0 ? recentDaily / avgDaily : 999;
      } else if (recentDaily < avgDaily * 0.5 && zScore > 2.5) {
        anomalyType = 'drop';
        suggestedAction = '建议促销清理';
        anomalyMagnitude = recentDaily > 0 ? avgDaily / recentDaily : 999;
      }

      if (anomalyType && (!params.type || params.type === anomalyType)) {
        items.push({
          productId,
          productName: prodInfo.name,
          productCode: prodInfo.code,
          anomalyType,
          anomalyMagnitude: Math.round(anomalyMagnitude * 100) / 100,
          zScore: Math.round(zScore * 100) / 100,
          avgDaily: Math.round(avgDaily * 100) / 100,
          recentDaily: Math.round(recentDaily * 100) / 100,
          warehouse: topWarehouse,
          suggestedAction,
          last30Days,
        });
      }
    }

    // Sort by z-score descending
    items.sort((a, b) => b.zScore - a.zScore);

    const spikeCount = items.filter((i) => i.anomalyType === 'spike').length;
    const dropCount = items.filter((i) => i.anomalyType === 'drop').length;
    const stagnationCount = items.filter(
      (i) => i.anomalyType === 'stagnation',
    ).length;

    return {
      items,
      totalAnomalies: items.length,
      spikeCount,
      dropCount,
      stagnationCount,
      analyzedAt: now.toISOString(),
    };
  }

  // ============ 2. 健康评分 ============
  async getHealthScore(): Promise<HealthScoreResponse> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);
    // Get all active products
    const allProducts = await this.db
      .select({ id: products.id, safetyStock: products.safetyStock })
      .from(products)
      .where(eq(products.status, 'active'));
    const totalSku = allProducts.length;

    // ---- 维度1: 周转率 (30%) ----
    // 总出库量 / 平均库存量 (近似用当前库存)
    const totalOutboundResult = await this.db
      .select({ total: sum(stockTransactions.quantity) })
      .from(stockTransactions)
      .where(
        and(
          eq(stockTransactions.type, 'outbound'),
          gte(stockTransactions.transactionDate, thirtyDaysAgo),
        ),
      );
    const totalOutbound30 = Number(totalOutboundResult[0]?.total ?? 0);

    const totalStockResult = await this.db
      .select({ total: sum(warehouseInventory.quantity) })
      .from(warehouseInventory);
    const totalStock = Number(totalStockResult[0]?.total ?? 0);

    // 周转天数 = 平均库存 / (总出库 / 30)
    let turnoverDays = 999;
    if (totalOutbound30 > 0 && totalStock > 0) {
      const avgDailyOut = totalOutbound30 / 30;
      turnoverDays = totalStock / avgDailyOut;
    }

    let turnoverScore = 0;
    if (turnoverDays <= 15) {
      turnoverScore = 100;
    } else if (turnoverDays <= 30) {
      turnoverScore = 60 + (1 - (turnoverDays - 15) / 15) * 40;
    } else if (turnoverDays <= 60) {
      turnoverScore = 30 + (1 - (turnoverDays - 30) / 30) * 30;
    } else if (turnoverDays <= 90) {
      turnoverScore = (1 - (turnoverDays - 60) / 30) * 30;
    } else {
      turnoverScore = 0;
    }

    // ---- 维度2: 库存准确率 (20%) ----
    // 最近一次盘点的差异率
    const latestCheck = await this.db
      .select({
        id: inventoryChecks.id,
        checkDate: inventoryChecks.checkDate,
      })
      .from(inventoryChecks)
      .where(eq(inventoryChecks.status, 'completed'))
      .orderBy(desc(inventoryChecks.checkDate))
      .limit(1);

    let accuracyScore = 90;
    if (latestCheck.length > 0) {
      const checkItems = await this.db
        .select({
          systemQty: inventoryCheckItems.systemQuantity,
          difference: inventoryCheckItems.difference,
        })
        .from(inventoryCheckItems)
        .where(eq(inventoryCheckItems.checkId, latestCheck[0].id));

      const totalSystemQty = checkItems.reduce(
        (acc: number, item: { systemQty: number; difference: number }) =>
          acc + item.systemQty,
        0,
      );
      const totalDiff = checkItems.reduce(
        (acc: number, item: { systemQty: number; difference: number }) =>
          acc + Math.abs(item.difference),
        0,
      );

      if (totalSystemQty > 0) {
        accuracyScore = (1 - totalDiff / totalSystemQty) * 100;
        accuracyScore = Math.max(0, Math.min(100, accuracyScore));
      }
    }

    // ---- 维度3: 滞销占比 (20%) ----
    // 近 30 天无出库的 SKU 数 / 总 SKU 数
    const productsWithOutbound = await this.db
      .selectDistinct({ productId: stockTransactions.productId })
      .from(stockTransactions)
      .where(
        and(
          eq(stockTransactions.type, 'outbound'),
          gte(stockTransactions.transactionDate, thirtyDaysAgo),
        ),
      );
    const activeSkuIds = new Set(
      productsWithOutbound.map((row: { productId: string }) => row.productId),
    );
    const deadSkuCount = totalSku - activeSkuIds.size;
    const deadRatio = totalSku > 0 ? deadSkuCount / totalSku : 0;
    const stagnantScore = (1 - deadRatio) * 100;

    // ---- 维度4: 缺货率 (15%) ----
    // 库存 < 安全库存的 SKU 数 / 总 SKU 数
    const lowStockRows = await this.db
      .selectDistinct({ productId: warehouseInventory.productId })
      .from(warehouseInventory)
      .innerJoin(products, eq(warehouseInventory.productId, products.id))
      .where(
        and(
          eq(products.status, 'active'),
          sql`${warehouseInventory.quantity} < ${products.safetyStock}`,
        ),
      );
    const lowStockCount = lowStockRows.length;
    const stockoutRate = totalSku > 0 ? lowStockCount / totalSku : 0;
    const stockoutScore = (1 - stockoutRate) * 100;

    // ---- 维度5: 库龄健康度 (15%) ----
    // 近 30 天入库量 / 总库存 * 100, 上限 100
    const totalInboundResult = await this.db
      .select({ total: sum(stockTransactions.quantity) })
      .from(stockTransactions)
      .where(
        and(
          eq(stockTransactions.type, 'inbound'),
          gte(stockTransactions.transactionDate, thirtyDaysAgo),
        ),
      );
    const totalInbound30 = Number(totalInboundResult[0]?.total ?? 0);
    const ageHealthScore = Math.min(100, totalStock > 0 ? (totalInbound30 / totalStock) * 100 : 0);

    // ---- 综合评分 ----
    const dimensions: HealthScoreDimension[] = [
      {
        name: '周转率',
        score: Math.round(turnoverScore * 10) / 10,
        weight: 0.3,
        description: `库存周转天数约 ${turnoverDays > 999 ? '>90' : Math.round(turnoverDays)} 天`,
      },
      {
        name: '库存准确率',
        score: Math.round(accuracyScore * 10) / 10,
        weight: 0.2,
        description: latestCheck.length > 0
          ? '基于最近一次盘点结果计算'
          : '暂无盘点记录，默认 90 分',
      },
      {
        name: '滞销占比',
        score: Math.round(stagnantScore * 10) / 10,
        weight: 0.2,
        description: `近 30 天无出库 SKU ${deadSkuCount} 个，占比 ${(deadRatio * 100).toFixed(1)}%`,
      },
      {
        name: '缺货率',
        score: Math.round(stockoutScore * 10) / 10,
        weight: 0.15,
        description: `低于安全库存 SKU ${lowStockCount} 个，占比 ${(stockoutRate * 100).toFixed(1)}%`,
      },
      {
        name: '库龄健康度',
        score: Math.round(ageHealthScore * 10) / 10,
        weight: 0.15,
        description: `近 30 天入库量占总库存 ${totalStock > 0 ? ((totalInbound30 / totalStock) * 100).toFixed(1) : 0}%`,
      },
    ];

    const overallScore = Math.round(
      dimensions.reduce((acc: number, d: HealthScoreDimension) => acc + d.score * d.weight, 0),
    );

    let rating: HealthScoreResponse['rating'];
    if (overallScore >= 90) {
      rating = 'excellent';
    } else if (overallScore >= 75) {
      rating = 'good';
    } else if (overallScore >= 60) {
      rating = 'fair';
    } else if (overallScore >= 40) {
      rating = 'needs_improvement';
    } else {
      rating = 'danger';
    }

    const suggestions: string[] = [];
    if (turnoverScore < 60) {
      suggestions.push('库存周转偏慢，建议优化采购计划，减少不必要的库存积压');
    }
    if (accuracyScore < 60) {
      suggestions.push('库存准确率偏低，建议增加盘点频率，排查差异原因');
    }
    if (stagnantScore < 60) {
      suggestions.push('滞销品占比较高，建议开展促销活动或调拨至需求仓库');
    }
    if (stockoutScore < 60) {
      suggestions.push('缺货率较高，建议检查安全库存设置并及时补货');
    }
    if (ageHealthScore < 60) {
      suggestions.push('库龄结构偏老化，建议增加新品入库，加快老品周转');
    }

    return {
      overallScore,
      rating,
      dimensions,
      suggestions,
      calculatedAt: now.toISOString(),
    };
  }

  // ============ 3. 补货建议 ============
  async getReplenishment(params: {
    warehouse?: string;
    priority?: string;
    keyword?: string;
  }): Promise<ReplenishmentResponse> {
    const now = new Date();
    const ninetyDaysAgo = new Date(now);
    ninetyDaysAgo.setDate(now.getDate() - 90);
    const purchaseCycleDays = 7;

    // Get outbound per product per warehouse for 90 days
    const conditions = [
      eq(stockTransactions.type, 'outbound'),
      gte(stockTransactions.transactionDate, ninetyDaysAgo),
    ];
    if (params.warehouse) {
      conditions.push(eq(stockTransactions.warehouse, params.warehouse));
    }

    const outboundRows = await this.db
      .select({
        productId: stockTransactions.productId,
        warehouse: stockTransactions.warehouse,
        totalQty: sum(stockTransactions.quantity).as('total_qty'),
      })
      .from(stockTransactions)
      .where(and(...conditions))
      .groupBy(stockTransactions.productId, stockTransactions.warehouse);

    // Get current inventory per product per warehouse
    const invConditions: unknown[] = [];
    if (params.warehouse) {
      invConditions.push(eq(warehouseInventory.warehouse, params.warehouse));
    }

    const invRows = invConditions.length > 0
      ? await this.db
          .select()
          .from(warehouseInventory)
          .where(and(...(invConditions as Parameters<typeof and>)))
      : await this.db.select().from(warehouseInventory);

    // Get product info
    const productIdsFromInv = new Set(invRows.map((r) => r.productId));
    const productRows = await this.db
      .select({
        id: products.id,
        name: products.name,
        code: products.code,
        unit: products.unit,
        safetyStock: products.safetyStock,
        unitPrice: products.unitPrice,
        status: products.status,
      })
      .from(products);

    const productMap = new Map<string, {
      name: string;
      code: string;
      unit: string;
      safetyStock: number;
      unitPrice: string;
      status: string;
    }>();
    for (const p of productRows) {
      productMap.set(p.id, {
        name: p.name,
        code: p.code,
        unit: p.unit,
        safetyStock: p.safetyStock,
        unitPrice: String(p.unitPrice),
        status: p.status,
      });
    }

    // Build outbound map: productId -> warehouse -> totalQty
    const outboundMap = new Map<string, Map<string, number>>();
    for (const row of outboundRows as { productId: string; warehouse: string; totalQty: string | number }[]) {
      if (!outboundMap.has(row.productId)) {
        outboundMap.set(row.productId, new Map());
      }
      outboundMap.get(row.productId)!.set(row.warehouse, Number(row.totalQty));
    }

    const items: ReplenishmentItem[] = [];
    const arrivalDate = new Date(now);
    arrivalDate.setDate(now.getDate() + purchaseCycleDays);
    const expectedArrivalDate = arrivalDate.toISOString().slice(0, 10);

    for (const inv of invRows) {
      const product = productMap.get(inv.productId);
      if (!product || product.status !== 'active') continue;

      // keyword filter
      if (params.keyword) {
        const kw = params.keyword.toLowerCase();
        if (
          !product.name.toLowerCase().includes(kw) &&
          !product.code.toLowerCase().includes(kw)
        ) {
          continue;
        }
      }

      const whOutbound = outboundMap.get(inv.productId)?.get(inv.warehouse) ?? 0;
      const avgDailySales = whOutbound / 90;

      const suggestedQty = Math.ceil(
        avgDailySales * purchaseCycleDays + product.safetyStock - inv.quantity,
      );

      if (suggestedQty <= 0) continue;

      let priority: 'high' | 'medium' | 'low';
      if (inv.quantity < product.safetyStock * 0.5) {
        priority = 'high';
      } else if (inv.quantity < product.safetyStock) {
        priority = 'medium';
      } else {
        priority = 'low';
      }

      // priority filter
      if (params.priority && params.priority !== priority) continue;

      const unitPriceNum = Number(product.unitPrice);
      const suggestedAmount = suggestedQty * unitPriceNum;

      items.push({
        productId: inv.productId,
        productName: product.name,
        productCode: product.code,
        unit: product.unit,
        warehouse: inv.warehouse,
        currentStock: inv.quantity,
        safetyStock: product.safetyStock,
        avgDailySales: Math.round(avgDailySales * 100) / 100,
        purchaseCycleDays,
        suggestedQuantity: suggestedQty,
        expectedArrivalDate,
        priority,
        unitPrice: unitPriceNum,
        suggestedAmount: Math.round(suggestedAmount * 100) / 100,
      });
    }

    // Sort: high > medium > low, then by suggestedQty desc
    const priorityOrder = { high: 0, medium: 1, low: 2 } as const;
    items.sort((a, b) => {
      const pa = priorityOrder[a.priority];
      const pb = priorityOrder[b.priority];
      if (pa !== pb) return pa - pb;
      return b.suggestedQuantity - a.suggestedQuantity;
    });

    const totalValue = items.reduce(
      (acc: number, item: ReplenishmentItem) => acc + item.suggestedAmount,
      0,
    );

    return {
      items,
      totalValue: Math.round(totalValue * 100) / 100,
      totalItems: items.length,
      calculatedAt: now.toISOString(),
    };
  }

  // ============ 4. 销量预测 ============
  async getSalesPrediction(params: {
    productId: string;
    warehouse?: string;
    period: 7 | 14 | 30;
  }): Promise<SalesPredictionItem> {
    const now = new Date();
    const ninetyDaysAgo = new Date(now);
    ninetyDaysAgo.setDate(now.getDate() - 90);
    const periodDays = params.period;

    // Get product info
    const productRows = await this.db
      .select({
        id: products.id,
        name: products.name,
        code: products.code,
        unit: products.unit,
      })
      .from(products)
      .where(eq(products.id, params.productId));

    if (productRows.length === 0) {
      return {
        productId: params.productId,
        productName: '未知商品',
        productCode: '',
        unit: '',
        historicalData: [],
        predictedData: [],
        trend: 'stable',
        confidence: 0,
      };
    }

    const product = productRows[0];

    // Get daily outbound for 90 days
    const conditions = [
      eq(stockTransactions.type, 'outbound'),
      eq(stockTransactions.productId, params.productId),
      gte(stockTransactions.transactionDate, ninetyDaysAgo),
    ];
    if (params.warehouse) {
      conditions.push(eq(stockTransactions.warehouse, params.warehouse));
    }

    const dailyRows = await this.db
      .select({
        day: sql<string>`DATE(${stockTransactions.transactionDate})`,
        totalQty: sum(stockTransactions.quantity).as('total_qty'),
      })
      .from(stockTransactions)
      .where(and(...conditions))
      .groupBy(sql`DATE(${stockTransactions.transactionDate})`);

    // Build daily map
    const dailyMap = new Map<string, number>();
    for (const row of dailyRows as { day: string; totalQty: string | number }[]) {
      dailyMap.set(row.day, Number(row.totalQty));
    }

    // Generate last 30 dates for historicalData
    const historicalData: { date: string; quantity: number }[] = [];
    for (let i = 29; i >= 0; i -= 1) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      historicalData.push({
        date: dateStr,
        quantity: dailyMap.get(dateStr) ?? 0,
      });
    }

    // Calculate weighted moving average
    // Periods: last 7 days, days 8-14, days 15-30
    function getDaysArray(daysBack: number, count: number): number[] {
      const qtys: number[] = [];
      for (let i = daysBack; i < daysBack + count; i += 1) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        const dateStr = d.toISOString().slice(0, 10);
        qtys.push(dailyMap.get(dateStr) ?? 0);
      }
      return qtys;
    }

    // Last 7 days (days 1-7 back)
    const last7 = getDaysArray(1, 7);
    const avg7 = last7.reduce((a, b) => a + b, 0) / 7;

    // Days 8-14 (7-14 day window excluding last 7)
    const days8_14 = getDaysArray(8, 7);
    const avg8_14 = days8_14.reduce((a, b) => a + b, 0) / 7;

    // Days 15-30 (14-30 day window excluding last 14)
    const days15_30 = getDaysArray(15, 16);
    const avg15_30 = days15_30.reduce((a, b) => a + b, 0) / 16;

    // Weighted prediction
    const predictedDaily = avg7 * 0.5 + avg8_14 * 0.3 + avg15_30 * 0.2;

    // Standard deviation for confidence interval (use all 90 days with data, but use last 30 for more relevance)
    const last30Quantities = historicalData.map((d) => d.quantity);
    const mean30 = last30Quantities.reduce((a, b) => a + b, 0) / 30;
    const variance30 = last30Quantities.reduce(
      (acc: number, q: number) => acc + Math.pow(q - mean30, 2),
      0,
    ) / 30;
    const stdDev30 = Math.sqrt(variance30);
    const marginOfError = stdDev30 * 1.96;

    // Generate predicted data
    const predictedData: {
      date: string;
      quantity: number;
      lowerBound: number;
      upperBound: number;
    }[] = [];
    for (let i = 1; i <= periodDays; i += 1) {
      const d = new Date(now);
      d.setDate(now.getDate() + i);
      const dateStr = d.toISOString().slice(0, 10);
      const qty = Math.round(predictedDaily * 100) / 100;
      predictedData.push({
        date: dateStr,
        quantity: qty,
        lowerBound: Math.max(0, Math.round((predictedDaily - marginOfError) * 100) / 100),
        upperBound: Math.round((predictedDaily + marginOfError) * 100) / 100,
      });
    }

    // Trend: compare last 7 days avg vs previous 7 days (days 8-14)
    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (avg8_14 > 0) {
      const changeRatio = (avg7 - avg8_14) / avg8_14;
      if (changeRatio > 0.1) {
        trend = 'up';
      } else if (changeRatio < -0.1) {
        trend = 'down';
      }
    } else if (avg7 > 0) {
      trend = 'up';
    }

    // Confidence
    // Count days with data in last 90 days
    const daysWithData = dailyMap.size;
    let confidence = 0.3;
    if (daysWithData > 30) {
      confidence = 0.85;
    } else if (daysWithData > 14) {
      confidence = 0.7;
    } else if (daysWithData > 7) {
      confidence = 0.5;
    }

    return {
      productId: product.id,
      productName: product.name,
      productCode: product.code,
      unit: product.unit,
      historicalData,
      predictedData,
      trend,
      confidence,
    };
  }

  // ============ 5. 调拨建议 ============
  async getTransferSuggestions(): Promise<TransferSuggestionResponse> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);
    // Get 30-day outbound per product per warehouse
    const outboundRows = await this.db
      .select({
        productId: stockTransactions.productId,
        warehouse: stockTransactions.warehouse,
        totalQty: sum(stockTransactions.quantity).as('total_qty'),
      })
      .from(stockTransactions)
      .where(
        and(
          eq(stockTransactions.type, 'outbound'),
          gte(stockTransactions.transactionDate, thirtyDaysAgo),
        ),
      )
      .groupBy(stockTransactions.productId, stockTransactions.warehouse);

    // Get current inventory per product per warehouse
    const invRows = await this.db.select().from(warehouseInventory);

    // Get product info
    const productRows = await this.db
      .select({
        id: products.id,
        name: products.name,
        code: products.code,
        unit: products.unit,
        safetyStock: products.safetyStock,
        unitPrice: products.unitPrice,
        status: products.status,
      })
      .from(products)
      .where(eq(products.status, 'active'));

    const productMap = new Map<string, {
      name: string;
      code: string;
      unit: string;
      safetyStock: number;
      unitPrice: string;
    }>();
    for (const p of productRows) {
      productMap.set(p.id, {
        name: p.name,
        code: p.code,
        unit: p.unit,
        safetyStock: p.safetyStock,
        unitPrice: String(p.unitPrice),
      });
    }

    // Build outbound map
    const outboundMap = new Map<string, Map<string, number>>();
    for (const row of outboundRows as { productId: string; warehouse: string; totalQty: string | number }[]) {
      if (!outboundMap.has(row.productId)) {
        outboundMap.set(row.productId, new Map());
      }
      outboundMap.get(row.productId)!.set(row.warehouse, Number(row.totalQty));
    }

    // Build inventory map
    const invMap = new Map<string, Map<string, number>>();
    for (const inv of invRows) {
      if (!invMap.has(inv.productId)) {
        invMap.set(inv.productId, new Map());
      }
      invMap.get(inv.productId)!.set(inv.warehouse, inv.quantity);
    }

    const items: TransferSuggestionItem[] = [];

    for (const [productId, product] of productMap.entries()) {
      const whInvMap = invMap.get(productId);
      if (!whInvMap) continue;

      const whOutMap = outboundMap.get(productId) ?? new Map<string, number>();
      const warehouses = Array.from(whInvMap.keys());

      // Calculate metrics for each warehouse
      const whMetrics: {
        warehouse: string;
        stock: number;
        turnover30: number;
        turnoverDays: number;
        stockoutRisk: number;
      }[] = [];

      for (const wh of warehouses) {
        const stock = whInvMap.get(wh) ?? 0;
        const out30 = whOutMap.get(wh) ?? 0;
        const turnover = out30 / (stock + 0.0001);
        const avgDaily = out30 / 30;
        const turnoverDays = avgDaily > 0 ? stock / avgDaily : 999;
        const stockoutRisk = stock < product.safetyStock ? 1 : 0;
        whMetrics.push({
          warehouse: wh,
          stock,
          turnover30: turnover,
          turnoverDays,
          stockoutRisk,
        });
      }

      // Find source warehouses: turnover < 0.5 AND stock > safetyStock * 1.5
      const sources = whMetrics.filter(
        (m) => m.turnover30 < 0.5 && m.stock > product.safetyStock * 1.5,
      );
      // Find target warehouses: stockoutRisk = 1 OR turnover > 2
      const targets = whMetrics.filter(
        (m) => m.stockoutRisk === 1 || m.turnover30 > 2,
      );

      for (const source of sources) {
        for (const target of targets) {
          if (source.warehouse === target.warehouse) continue;

          const adjustable = source.stock - product.safetyStock * 1.5;
          const gap = product.safetyStock * 2 - target.stock;
          if (adjustable <= 0 || gap <= 0) continue;

          const suggestedQty = Math.min(Math.floor(adjustable), Math.ceil(gap));
          if (suggestedQty <= 0) continue;

          let urgency: 'high' | 'medium' | 'low';
          if (target.stockoutRisk === 1) {
            urgency = 'high';
          } else if (target.turnover30 > 3) {
            urgency = 'medium';
          } else {
            urgency = 'low';
          }

          // Expected balance effect
          const newSourceStock = source.stock - suggestedQty;
          const newTargetStock = target.stock + suggestedQty;
          const sourceOut = whOutMap.get(source.warehouse) ?? 0;
          const targetOut = whOutMap.get(target.warehouse) ?? 0;
          const sourceAvgDaily = sourceOut / 30;
          const targetAvgDaily = targetOut / 30;
          const newSourceTurnoverDays = sourceAvgDaily > 0
            ? newSourceStock / sourceAvgDaily
            : 999;
          const newTargetTurnoverDays = targetAvgDaily > 0
            ? newTargetStock / targetAvgDaily
            : 999;

          const sourceDaysStr = source.turnoverDays > 999
            ? '>90'
            : Math.round(source.turnoverDays).toString();
          const newSourceDaysStr = newSourceTurnoverDays > 999
            ? '>90'
            : Math.round(newSourceTurnoverDays).toString();
          const targetDaysStr = target.turnoverDays > 999
            ? '>90'
            : Math.round(target.turnoverDays).toString();
          const newTargetDaysStr = newTargetTurnoverDays > 999
            ? '>90'
            : Math.round(newTargetTurnoverDays).toString();

          const expectedBalanceEffect =
            `调拨后${source.warehouse}周转天数从${sourceDaysStr}天变为${newSourceDaysStr}天，` +
            `${target.warehouse}周转天数从${targetDaysStr}天变为${newTargetDaysStr}天`;

          items.push({
            productId,
            productName: product.name,
            productCode: product.code,
            unit: product.unit,
            sourceWarehouse: source.warehouse,
            sourceStock: source.stock,
            sourceTurnoverDays: Math.round(source.turnoverDays * 10) / 10,
            targetWarehouse: target.warehouse,
            targetStock: target.stock,
            targetTurnoverDays: Math.round(target.turnoverDays * 10) / 10,
            suggestedQuantity: suggestedQty,
            expectedBalanceEffect,
            urgency,
          });
        }
      }
    }

    // Sort by urgency
    const urgencyOrder = { high: 0, medium: 1, low: 2 } as const;
    items.sort((a, b) => {
      const ua = urgencyOrder[a.urgency];
      const ub = urgencyOrder[b.urgency];
      if (ua !== ub) return ua - ub;
      return b.suggestedQuantity - a.suggestedQuantity;
    });

    const totalTransferValue = items.reduce((acc: number, item: TransferSuggestionItem) => {
      const product = productMap.get(item.productId);
      const price = product ? Number(product.unitPrice) : 0;
      return acc + item.suggestedQuantity * price;
    }, 0);

    return {
      items,
      totalTransferValue: Math.round(totalTransferValue * 100) / 100,
      calculatedAt: now.toISOString(),
    };
  }

  // ============ 6. 自然语言查询 ============
  async naturalLanguageQuery(query: string): Promise<NaturalLanguageQueryResponse> {
    const q = query.trim();

    // Match query types in order of specificity (most specific first)
    const matchers = [
      () => this.tryLowStock(q),
      () => this.tryWarningReplenishment(q),
      () => this.tryWarehouseDistribution(q),
      () => this.tryTopValue(q),
      () => this.tryCategoryStock(q),
      () => this.tryDailyInOut(q),
      () => this.tryTrend(q),
      () => this.tryTotalValue(q),
      () => this.tryTotalSku(q),
      () => this.tryTurnover(q),
      () => this.tryWarehouseSku(q),
      () => this.tryMonthlyOutbound(q),
      () => this.tryProductStock(q),
    ];

    for (const matcher of matchers) {
      const result = await matcher();
      if (result) return result;
    }

    const suggestions = [
      '库存低于10的商品',
      '各仓库库存分布',
      '库存金额最高的商品',
      '电子产品库存情况',
      '今日入库了多少',
      '需要补货的商品',
      '总库存金额',
      '近7天出入库趋势',
    ];

    return {
      queryType: 'unknown',
      parsedIntent: query,
      resultType: 'text',
      title: '查询未识别',
      summary:
        `未能理解您的查询，请尝试更明确的表述。\n` +
        `您可以尝试以下示例：\n` +
        suggestions.map((s: string) => `• ${s}`).join('\n'),
    };
  }

  // --- 单商品库存查询 ---
  private async tryProductStock(
    query: string,
  ): Promise<NaturalLanguageQueryResponse | null> {
    if (!/库存/.test(query)) return null;

    // Extract potential product name/code
    // Remove common words and keep what might be a product name
    const cleaned = query
      .replace(/[有是多少查询查一下看看呢吗？?。.]/g, '')
      .replace(/库存/g, ' ')
      .trim();

    if (!cleaned || cleaned.length < 1) return null;

    // Search products by name or code
    const matchedProducts = await this.db
      .select({
        id: products.id,
        name: products.name,
        code: products.code,
        unit: products.unit,
      })
      .from(products)
      .where(
        and(
          eq(products.status, 'active'),
          or(
            ilike(products.name, `%${cleaned}%`),
            ilike(products.code, `%${cleaned}%`),
          ),
        ),
      )
      .limit(5);

    if (matchedProducts.length === 0) return null;

    const product = matchedProducts[0];
    const invRows = await this.db
      .select({
        warehouse: warehouseInventory.warehouse,
        quantity: warehouseInventory.quantity,
      })
      .from(warehouseInventory)
      .where(eq(warehouseInventory.productId, product.id));

    const tableData: Record<string, unknown>[] = invRows.map((inv) => ({
      仓库: inv.warehouse,
      库存数量: inv.quantity,
      单位: product.unit,
    }));

    const totalQty = invRows.reduce(
      (acc: number, inv: { quantity: number }) => acc + inv.quantity,
      0,
    );

    return {
      queryType: 'product_stock',
      parsedIntent: `查询 ${product.name} 的库存`,
      resultType: 'table',
      title: `${product.name} 库存情况`,
      summary: `商品 ${product.name}（${product.code}）当前总库存 ${totalQty} ${product.unit}，分布在 ${invRows.length} 个仓库`,
      tableData,
      columns: [
        { key: '仓库', label: '仓库' },
        { key: '库存数量', label: '库存数量' },
        { key: '单位', label: '单位' },
      ],
    };
  }

  // --- 低库存/缺货商品列表 ---
  private async tryLowStock(
    query: string,
  ): Promise<NaturalLanguageQueryResponse | null> {
    if (!/(低库存|缺货|库存不足|库存不够|库存低于|哪些.*库存.*少|库存最少)/.test(query)) return null;

    const numMatch = query.match(/(?:低于|少于|小于|不足|低于|\()\s*(\d+)/);
    const threshold = numMatch ? Number(numMatch[1]) : null;
    const warehouse = this.extractWarehouse(query);

    if (warehouse) {
      const lowStockRows = await this.db
        .select({
          productId: warehouseInventory.productId,
          productName: products.name,
          productCode: products.code,
          warehouse: warehouseInventory.warehouse,
          quantity: warehouseInventory.quantity,
          safetyStock: products.safetyStock,
        })
        .from(warehouseInventory)
        .innerJoin(products, eq(warehouseInventory.productId, products.id))
        .where(
          and(
            eq(products.status, 'active'),
            eq(warehouseInventory.warehouse, warehouse),
            threshold !== null
              ? lt(warehouseInventory.quantity, threshold)
              : sql`${warehouseInventory.quantity} < ${products.safetyStock}`,
          ),
        )
        .orderBy(desc(sql`${products.safetyStock} - ${warehouseInventory.quantity}`))
        .limit(20);

      const tableData: Record<string, unknown>[] = lowStockRows.map((row) => ({
        商品名称: row.productName,
        商品编码: row.productCode,
        仓库: row.warehouse,
        当前库存: row.quantity,
        安全库存: row.safetyStock,
        缺口: Math.max(0, Number(row.safetyStock) - row.quantity),
      }));

      const summaryText = threshold !== null
        ? `${warehouse} 共有 ${lowStockRows.length} 条库存记录低于 ${threshold} 件`
        : `${warehouse} 共有 ${lowStockRows.length} 个商品低于安全库存`;

      return {
        queryType: 'low_stock',
        parsedIntent: threshold !== null
          ? `查询 ${warehouse} 库存低于 ${threshold} 的商品`
          : `查询 ${warehouse} 低于安全库存的商品`,
        resultType: 'table',
        title: threshold !== null
          ? `${warehouse} 库存低于 ${threshold} 的商品`
          : `${warehouse} 低库存商品列表`,
        summary: summaryText,
        tableData,
        columns: [
          { key: '商品名称', label: '商品名称' },
          { key: '商品编码', label: '商品编码' },
          { key: '仓库', label: '仓库' },
          { key: '当前库存', label: '当前库存' },
          { key: '安全库存', label: '安全库存' },
          { key: '缺口', label: '缺口' },
        ],
      };
    }

    const aggregatedRows = await this.db
      .select({
        productId: warehouseInventory.productId,
        productName: products.name,
        productCode: products.code,
        totalQuantity: sum(warehouseInventory.quantity).as('total_quantity'),
        safetyStock: products.safetyStock,
      })
      .from(warehouseInventory)
      .innerJoin(products, eq(warehouseInventory.productId, products.id))
      .where(eq(products.status, 'active'))
      .groupBy(
        warehouseInventory.productId,
        products.id,
        products.name,
        products.code,
        products.safetyStock,
      )
      .having(
        threshold !== null
          ? sql`SUM(${warehouseInventory.quantity}) < ${threshold}`
          : sql`SUM(${warehouseInventory.quantity}) < ${products.safetyStock}`,
      )
      .orderBy(desc(threshold !== null
        ? sql`${threshold} - SUM(${warehouseInventory.quantity})`
        : sql`${products.safetyStock} - SUM(${warehouseInventory.quantity})`))
      .limit(20);

    const tableData: Record<string, unknown>[] = aggregatedRows.map((row) => {
      const totalQty = Number(row.totalQuantity);
      return {
        商品名称: row.productName,
        商品编码: row.productCode,
        总库存: totalQty,
        安全库存: row.safetyStock,
        缺口: Math.max(0, Number(row.safetyStock) - totalQty),
      };
    });

    const summaryText = threshold !== null
      ? `共有 ${aggregatedRows.length} 个商品总库存低于 ${threshold} 件`
      : `共有 ${aggregatedRows.length} 个商品总库存低于安全库存`;

    return {
      queryType: 'low_stock',
      parsedIntent: threshold !== null
        ? `查询总库存低于 ${threshold} 的商品`
        : '查询总库存低于安全库存的商品',
      resultType: 'table',
      title: threshold !== null
        ? `总库存低于 ${threshold} 的商品`
        : '低库存商品汇总',
      summary: summaryText,
      tableData,
      columns: [
        { key: '商品名称', label: '商品名称' },
        { key: '商品编码', label: '商品编码' },
        { key: '总库存', label: '总库存' },
        { key: '安全库存', label: '安全库存' },
        { key: '缺口', label: '缺口' },
      ],
    };
  }

  private extractWarehouse(query: string): string | null {
    const warehouseNames = ['北京仓', '上海仓', '广州仓', '成都仓'];
    for (const wh of warehouseNames) {
      if (query.includes(wh)) return wh;
    }
    return null;
  }

  // --- 补货预警 ---
  private async tryWarningReplenishment(
    query: string,
  ): Promise<NaturalLanguageQueryResponse | null> {
    if (!/(库存预警|预警|补货|需要补|待补|警报)/.test(query)) return null;

    const warehouse = this.extractWarehouse(query);

    if (warehouse) {
      const warningRows = await this.db
        .select({
          productId: warehouseInventory.productId,
          productName: products.name,
          productCode: products.code,
          warehouse: warehouseInventory.warehouse,
          quantity: warehouseInventory.quantity,
          safetyStock: products.safetyStock,
          unitPrice: products.unitPrice,
        })
        .from(warehouseInventory)
        .innerJoin(products, eq(warehouseInventory.productId, products.id))
        .where(
          and(
            eq(products.status, 'active'),
            eq(warehouseInventory.warehouse, warehouse),
            sql`${warehouseInventory.quantity} < ${products.safetyStock}`,
          ),
        )
        .orderBy(desc(sql`${products.safetyStock} - ${warehouseInventory.quantity}`))
        .limit(20);

      const totalGap = warningRows.reduce(
        (acc: number, row) => acc + Math.max(0, Number(row.safetyStock) - row.quantity),
        0,
      );

      const tableData: Record<string, unknown>[] = warningRows.map((row) => ({
        商品名称: row.productName,
        商品编码: row.productCode,
        仓库: row.warehouse,
        当前库存: row.quantity,
        安全库存: row.safetyStock,
        建议补货: Math.max(0, Number(row.safetyStock) - row.quantity),
      }));

      return {
        queryType: 'replenishment_warning',
        parsedIntent: `查询 ${warehouse} 需要补货的预警商品`,
        resultType: 'table',
        title: `${warehouse} 库存预警 / 补货清单`,
        summary: `${warehouse} 共 ${warningRows.length} 个商品需要补货，累计缺口 ${totalGap} 件`,
        tableData,
        columns: [
          { key: '商品名称', label: '商品名称' },
          { key: '商品编码', label: '商品编码' },
          { key: '仓库', label: '仓库' },
          { key: '当前库存', label: '当前库存' },
          { key: '安全库存', label: '安全库存' },
          { key: '建议补货', label: '建议补货' },
        ],
      };
    }

    const aggregatedRows = await this.db
      .select({
        productId: warehouseInventory.productId,
        productName: products.name,
        productCode: products.code,
        totalQuantity: sum(warehouseInventory.quantity).as('total_quantity'),
        safetyStock: products.safetyStock,
        unitPrice: products.unitPrice,
      })
      .from(warehouseInventory)
      .innerJoin(products, eq(warehouseInventory.productId, products.id))
      .where(eq(products.status, 'active'))
      .groupBy(
        warehouseInventory.productId,
        products.id,
        products.name,
        products.code,
        products.safetyStock,
        products.unitPrice,
      )
      .having(sql`SUM(${warehouseInventory.quantity}) < ${products.safetyStock}`)
      .orderBy(desc(sql`${products.safetyStock} - SUM(${warehouseInventory.quantity})`))
      .limit(20);

    const totalGap = aggregatedRows.reduce(
      (acc: number, row) => acc + Math.max(0, Number(row.safetyStock) - Number(row.totalQuantity)),
      0,
    );

    const tableData: Record<string, unknown>[] = aggregatedRows.map((row) => {
      const totalQty = Number(row.totalQuantity);
      return {
        商品名称: row.productName,
        商品编码: row.productCode,
        总库存: totalQty,
        安全库存: row.safetyStock,
        建议补货: Math.max(0, Number(row.safetyStock) - totalQty),
      };
    });

    return {
      queryType: 'replenishment_warning',
      parsedIntent: '查询需要补货的预警商品（按商品汇总）',
      resultType: 'table',
      title: '库存预警 / 补货清单',
      summary: `共 ${aggregatedRows.length} 个商品总库存低于安全库存，累计缺口 ${totalGap} 件`,
      tableData,
      columns: [
        { key: '商品名称', label: '商品名称' },
        { key: '商品编码', label: '商品编码' },
        { key: '总库存', label: '总库存' },
        { key: '安全库存', label: '安全库存' },
        { key: '建议补货', label: '建议补货' },
      ],
    };
  }

  // --- 各仓库库存分布 ---
  private async tryWarehouseDistribution(
    query: string,
  ): Promise<NaturalLanguageQueryResponse | null> {
    if (!/(仓库.*库存|库存.*仓库|仓库分布|每个仓库|各仓|分仓|仓.*有多少).*库存/.test(query)
      && !/各仓库.*(多少|分布|情况)/.test(query)
      && !/仓库有多少/.test(query)) return null;

    const whRows = await this.db
      .select({
        warehouse: warehouseInventory.warehouse,
        totalQty: sum(warehouseInventory.quantity),
        totalValue: sum(warehouseInventory.stockValue),
        skuCount: count(warehouseInventory.productId),
      })
      .from(warehouseInventory)
      .groupBy(warehouseInventory.warehouse)
      .orderBy(desc(sum(warehouseInventory.quantity)));

    const tableData: Record<string, unknown>[] = whRows.map((row) => ({
      仓库: row.warehouse,
      库存总量: Number(row.totalQty),
      库存金额: Number(row.totalValue).toLocaleString('zh-CN', { maximumFractionDigits: 0 }),
      SKU数: Number(row.skuCount),
    }));

    const chartData = {
      categories: whRows.map((row) => row.warehouse),
      series: [
        { name: '库存量', data: whRows.map((row) => Number(row.totalQty)) },
      ],
    };

    const totalQty = whRows.reduce(
      (acc: number, row) => acc + Number(row.totalQty),
      0,
    );

    return {
      queryType: 'warehouse_distribution',
      parsedIntent: '查询各仓库库存分布',
      resultType: 'chart',
      title: '各仓库库存分布',
      summary: `共 ${whRows.length} 个仓库，总库存 ${totalQty.toLocaleString()} 件`,
      chartData,
      tableData,
      columns: [
        { key: '仓库', label: '仓库' },
        { key: '库存总量', label: '库存总量' },
        { key: '库存金额', label: '库存金额(元)' },
        { key: 'SKU数', label: 'SKU数' },
      ],
    };
  }

  // --- 某品类库存 ---
  private async tryCategoryStock(
    query: string,
  ): Promise<NaturalLanguageQueryResponse | null> {
    // 模式1: "XX类/品类/分类库存" 或 "XX库存" (已知品类时优先匹配品类)
    const catMatch = query.match(/([\u4e00-\u9fa5A-Za-z0-9]{2,10})(?:类|品类|分类)?库存/);
    if (!catMatch && !/品类库存|分类库存|各品类.*库存|按品类.*库存|各分类.*库存/.test(query)) return null;

    let targetCategory = catMatch ? catMatch[1] : null;

    const catRows = await this.db
      .select({
        category: products.category,
        totalQty: sum(warehouseInventory.quantity),
        totalValue: sum(warehouseInventory.stockValue),
        skuCount: count(warehouseInventory.productId),
      })
      .from(warehouseInventory)
      .innerJoin(products, eq(warehouseInventory.productId, products.id))
      .where(eq(products.status, 'active'))
      .groupBy(products.category)
      .orderBy(desc(sum(warehouseInventory.stockValue)));

    if (targetCategory) {
      const matched = catRows.find((row) => row.category.includes(targetCategory as string));
      if (!matched) {
        const allCats = catRows.map((row) => row.category).join('、');
        return {
          queryType: 'category_stock',
          parsedIntent: `查询「${targetCategory}」品类库存`,
          resultType: 'text',
          title: '品类库存查询',
          summary: `未找到「${targetCategory}」品类，系统中现有的品类有：${allCats}`,
        };
      }
      targetCategory = matched.category;

      const productRows = await this.db
        .select({
          productName: products.name,
          productCode: products.code,
          totalQty: sum(warehouseInventory.quantity),
          totalValue: sum(warehouseInventory.stockValue),
        })
        .from(warehouseInventory)
        .innerJoin(products, eq(warehouseInventory.productId, products.id))
        .where(
          and(
            eq(products.status, 'active'),
            eq(products.category, matched.category),
          ),
        )
        .groupBy(products.name, products.code)
        .orderBy(desc(sum(warehouseInventory.stockValue)))
        .limit(15);

      const tableData: Record<string, unknown>[] = productRows.map((row, idx: number) => ({
        排名: idx + 1,
        商品名称: row.productName,
        商品编码: row.productCode,
        库存数量: Number(row.totalQty),
        库存金额: Number(row.totalValue).toLocaleString('zh-CN', { maximumFractionDigits: 0 }),
      }));

      return {
        queryType: 'category_stock',
        parsedIntent: `查询${matched.category}品类库存`,
        resultType: 'table',
        title: `${matched.category}品类库存明细`,
        summary: `${matched.category}品类共 ${productRows.length} 个 SKU，` +
          `总库存 ${Number(matched.totalQty).toLocaleString()} 件，` +
          `总金额 ¥${Number(matched.totalValue).toLocaleString('zh-CN', { maximumFractionDigits: 0 })}`,
        tableData,
        columns: [
          { key: '排名', label: '排名' },
          { key: '商品名称', label: '商品名称' },
          { key: '商品编码', label: '商品编码' },
          { key: '库存数量', label: '库存数量' },
          { key: '库存金额', label: '库存金额(元)' },
        ],
      };
    }

    // 无特定品类 → 返回各品类汇总
    const tableData: Record<string, unknown>[] = catRows.map((row, idx: number) => ({
      排名: idx + 1,
      品类: row.category,
      SKU数: Number(row.skuCount),
      库存数量: Number(row.totalQty),
      库存金额: Number(row.totalValue).toLocaleString('zh-CN', { maximumFractionDigits: 0 }),
    }));

    const chartData = {
      categories: catRows.map((row) => row.category),
      series: [
        { name: '库存金额', data: catRows.map((row) => Number(row.totalValue)) },
      ],
    };

    return {
      queryType: 'category_stock',
      parsedIntent: '查询各品类库存分布',
      resultType: 'chart',
      title: '各品类库存金额分布',
      summary: `共 ${catRows.length} 个品类`,
      chartData,
      tableData,
      columns: [
        { key: '排名', label: '排名' },
        { key: '品类', label: '品类' },
        { key: 'SKU数', label: 'SKU数' },
        { key: '库存数量', label: '库存数量' },
        { key: '库存金额', label: '库存金额(元)' },
      ],
    };
  }

  // --- 今日/昨日出入库统计 ---
  private async tryDailyInOut(
    query: string,
  ): Promise<NaturalLanguageQueryResponse | null> {
    if (!/(今天|今日|昨天|昨日|当天).*(入库|出库|进出|出入)|(入库|出库).*(今天|今日|昨天|昨日)/.test(query)) return null;

    const isYesterday = /昨天|昨日/.test(query);
    const now = new Date();
    const targetDate = new Date(now);
    if (isYesterday) targetDate.setDate(now.getDate() - 1);
    targetDate.setHours(0, 0, 0, 0);
    const nextDate = new Date(targetDate);
    nextDate.setDate(targetDate.getDate() + 1);

    const rows = await this.db
      .select({
        type: stockTransactions.type,
        totalQty: sum(stockTransactions.quantity),
        totalAmount: sum(stockTransactions.totalAmount),
        orderCount: count(stockTransactions.id),
      })
      .from(stockTransactions)
      .where(
        and(
          gte(stockTransactions.transactionDate, targetDate),
          lt(stockTransactions.transactionDate, nextDate),
        ),
      )
      .groupBy(stockTransactions.type);

    const inbound = rows.find((r) => r.type === 'inbound');
    const outbound = rows.find((r) => r.type === 'outbound');

    const inQty = inbound ? Number(inbound.totalQty) : 0;
    const outQty = outbound ? Number(outbound.totalQty) : 0;
    const inAmt = inbound ? Number(inbound.totalAmount) : 0;
    const outAmt = outbound ? Number(outbound.totalAmount) : 0;
    const inOrders = inbound ? Number(inbound.orderCount) : 0;
    const outOrders = outbound ? Number(outbound.orderCount) : 0;

    const dayLabel = isYesterday ? '昨日' : '今日';

    return {
      queryType: 'daily_in_out',
      parsedIntent: `查询${dayLabel}出入库统计`,
      resultType: 'kpi',
      title: `${dayLabel}出入库统计`,
      summary: `${dayLabel}入库 ${inQty} 件，出库 ${outQty} 件`,
      kpiData: [
        { label: `${dayLabel}入库量`, value: inQty.toLocaleString(), unit: '件' },
        { label: `${dayLabel}出库量`, value: outQty.toLocaleString(), unit: '件' },
        { label: `${dayLabel}入库单`, value: inOrders, unit: '单' },
        { label: `${dayLabel}出库单`, value: outOrders, unit: '单' },
        { label: `${dayLabel}入库金额`, value: inAmt.toLocaleString('zh-CN', { maximumFractionDigits: 0 }), unit: '元' },
        { label: `${dayLabel}出库金额`, value: outAmt.toLocaleString('zh-CN', { maximumFractionDigits: 0 }), unit: '元' },
      ],
    };
  }

  // --- 近N天出入库趋势 ---
  private async tryTrend(
    query: string,
  ): Promise<NaturalLanguageQueryResponse | null> {
    if (!/(趋势|走势|变化|最近.*天.*出入|近.*天.*出入|出入库.*趋势)/.test(query)) return null;

    // 提取天数，默认7天
    const daysMatch = query.match(/(?:最近|近|过去|过去)?(\d+)\s*天/);
    const days = daysMatch ? Number(daysMatch[1]) : 7;
    const safeDays = Math.min(Math.max(days, 3), 30);

    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(now.getDate() - safeDays + 1);
    startDate.setHours(0, 0, 0, 0);

    const dailyRows = await this.db
      .select({
        date: sql<string>`DATE(${stockTransactions.transactionDate})`,
        inbound: sql<string>`COALESCE(SUM(CASE WHEN ${stockTransactions.type} = 'inbound' THEN ${stockTransactions.quantity} ELSE 0 END), 0)`,
        outbound: sql<string>`COALESCE(SUM(CASE WHEN ${stockTransactions.type} = 'outbound' THEN ${stockTransactions.quantity} ELSE 0 END), 0)`,
      })
      .from(stockTransactions)
      .where(gte(stockTransactions.transactionDate, startDate))
      .groupBy(sql`DATE(${stockTransactions.transactionDate})`)
      .orderBy(sql`DATE(${stockTransactions.transactionDate})`);

    const dailyMap = new Map<string, { in: number; out: number }>();
    for (const row of dailyRows as { date: string; inbound: string | number; outbound: string | number }[]) {
      dailyMap.set(row.date, {
        in: Number(row.inbound),
        out: Number(row.outbound),
      });
    }

    const categories: string[] = [];
    const inboundData: number[] = [];
    const outboundData: number[] = [];

    for (let i = 0; i < safeDays; i += 1) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      const dateStr = d.toISOString().slice(0, 10);
      categories.push(`${d.getMonth() + 1}/${d.getDate()}`);
      const entry = dailyMap.get(dateStr) ?? { in: 0, out: 0 };
      inboundData.push(entry.in);
      outboundData.push(entry.out);
    }

    const totalIn = inboundData.reduce((a: number, b: number) => a + b, 0);
    const totalOut = outboundData.reduce((a: number, b: number) => a + b, 0);

    return {
      queryType: 'trend',
      parsedIntent: `查询近${safeDays}天出入库趋势`,
      resultType: 'chart',
      title: `近${safeDays}天出入库趋势`,
      summary: `近${safeDays}天共入库 ${totalIn.toLocaleString()} 件，出库 ${totalOut.toLocaleString()} 件`,
      chartData: {
        categories,
        series: [
          { name: '入库', data: inboundData },
          { name: '出库', data: outboundData },
        ],
      },
    };
  }

  // --- 本月出库量 ---
  private async tryMonthlyOutbound(
    query: string,
  ): Promise<NaturalLanguageQueryResponse | null> {
    if (!/本月出库|月出库量/.test(query)) return null;

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const daysInMonth = today.getDate();

    const totalResult = await this.db
      .select({ total: sum(stockTransactions.quantity) })
      .from(stockTransactions)
      .where(
        and(
          eq(stockTransactions.type, 'outbound'),
          gte(stockTransactions.transactionDate, monthStart),
        ),
      );
    const totalOut = Number(totalResult[0]?.total ?? 0);

    // Daily trend
    const dailyRows = await this.db
      .select({
        day: sql<string>`DATE(${stockTransactions.transactionDate})`,
        qty: sum(stockTransactions.quantity).as('qty'),
      })
      .from(stockTransactions)
      .where(
        and(
          eq(stockTransactions.type, 'outbound'),
          gte(stockTransactions.transactionDate, monthStart),
        ),
      )
      .groupBy(sql`DATE(${stockTransactions.transactionDate})`)
      .orderBy(sql`DATE(${stockTransactions.transactionDate})`);

    const dailyMap = new Map<string, number>();
    for (const row of dailyRows as { day: string; qty: string | number }[]) {
      dailyMap.set(row.day, Number(row.qty));
    }

    const categories: string[] = [];
    const seriesData: number[] = [];
    for (let i = 1; i <= daysInMonth; i += 1) {
      const d = new Date(now.getFullYear(), now.getMonth(), i);
      const dateStr = d.toISOString().slice(0, 10);
      categories.push(`${now.getMonth() + 1}/${i}`);
      seriesData.push(dailyMap.get(dateStr) ?? 0);
    }

    const avgDaily = daysInMonth > 0 ? totalOut / daysInMonth : 0;

    return {
      queryType: 'monthly_outbound',
      parsedIntent: '查询本月出库量及趋势',
      resultType: 'chart',
      title: '本月出库量统计',
      summary: `本月共出库 ${totalOut.toLocaleString()} 件，日均 ${avgDaily.toFixed(1)} 件`,
      chartData: {
        categories,
        series: [{ name: '出库量', data: seriesData }],
      },
      kpiData: [
        { label: '本月出库总量', value: totalOut.toLocaleString(), unit: '件' },
        { label: '日均出库量', value: avgDaily.toFixed(1), unit: '件/天' },
        { label: '已过天数', value: daysInMonth, unit: '天' },
      ],
    };
  }

  // --- 库存价值最高 TOP ---
  private async tryTopValue(
    query: string,
  ): Promise<NaturalLanguageQueryResponse | null> {
    if (!/(价值最高|最值钱|TOP.*商品|商品.*TOP|金额.*高|库存金额.*排|排名|最贵|价值排名|金额排名|库存价值前|库存金额前)/.test(query)) return null;

    const topRows = await this.db
      .select({
        productId: warehouseInventory.productId,
        productName: products.name,
        productCode: products.code,
        category: products.category,
        totalValue: sql<number>`SUM(${warehouseInventory.stockValue})`,
        totalQty: sum(warehouseInventory.quantity),
      })
      .from(warehouseInventory)
      .innerJoin(products, eq(warehouseInventory.productId, products.id))
      .where(eq(products.status, 'active'))
      .groupBy(warehouseInventory.productId, products.name, products.code, products.category)
      .orderBy(desc(sql`SUM(${warehouseInventory.stockValue})`))
      .limit(10);

    const tableData: Record<string, unknown>[] = topRows.map((row, idx: number) => ({
      排名: idx + 1,
      商品名称: row.productName,
      商品编码: row.productCode,
      分类: row.category,
      库存数量: Number(row.totalQty),
      库存价值: Number(row.totalValue).toFixed(2),
    }));

    return {
      queryType: 'top_value',
      parsedIntent: '查询库存价值最高的商品',
      resultType: 'table',
      title: '库存价值 TOP 10 商品',
      summary: `按库存价值从高到低排序，共展示 ${topRows.length} 个商品`,
      tableData,
      columns: [
        { key: '排名', label: '排名' },
        { key: '商品名称', label: '商品名称' },
        { key: '商品编码', label: '商品编码' },
        { key: '分类', label: '分类' },
        { key: '库存数量', label: '库存数量' },
        { key: '库存价值', label: '库存价值(元)' },
      ],
    };
  }

  // --- 仓库 SKU 数 ---
  private async tryWarehouseSku(
    query: string,
  ): Promise<NaturalLanguageQueryResponse | null> {
    if (!/(仓库.*SKU|SKU.*仓库|仓库商品数|商品数.*仓库|各仓SKU|每个仓SKU)/.test(query)) return null;

    const whRows = await this.db
      .select({
        warehouse: warehouseInventory.warehouse,
        skuCount: count(warehouseInventory.productId),
        totalQty: sum(warehouseInventory.quantity),
        totalValue: sum(warehouseInventory.stockValue),
      })
      .from(warehouseInventory)
      .groupBy(warehouseInventory.warehouse);

    const kpiData: { label: string; value: number | string; unit?: string }[] = [];
    for (const row of whRows) {
      kpiData.push({
        label: `${row.warehouse} SKU数`,
        value: Number(row.skuCount),
        unit: '个',
      });
    }

    const totalSku = whRows.reduce(
      (acc: number, row: { skuCount: string | number }) => acc + Number(row.skuCount),
      0,
    );

    return {
      queryType: 'warehouse_sku',
      parsedIntent: '查询各仓库 SKU 数量',
      resultType: 'kpi',
      title: '各仓库 SKU 数量',
      summary: `全仓合计 ${whRows.length} 个仓库，SKU 记录总数 ${totalSku} 条`,
      kpiData,
    };
  }

  // --- 周转率 ---
  private async tryTurnover(
    query: string,
  ): Promise<NaturalLanguageQueryResponse | null> {
    if (!/周转/.test(query)) return null;

    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);
    // Outbound by category
    const outByCat = await this.db
      .select({
        category: products.category,
        totalOut: sum(stockTransactions.quantity),
      })
      .from(stockTransactions)
      .innerJoin(products, eq(stockTransactions.productId, products.id))
      .where(
        and(
          eq(stockTransactions.type, 'outbound'),
          gte(stockTransactions.transactionDate, thirtyDaysAgo),
        ),
      )
      .groupBy(products.category);

    // Stock by category
    const stockByCat = await this.db
      .select({
        category: products.category,
        totalStock: sum(warehouseInventory.quantity),
      })
      .from(warehouseInventory)
      .innerJoin(products, eq(warehouseInventory.productId, products.id))
      .groupBy(products.category);

    const outMap = new Map<string, number>();
    for (const row of outByCat as { category: string; totalOut: string | number }[]) {
      outMap.set(row.category, Number(row.totalOut));
    }

    const categories: string[] = [];
    const turnoverDaysData: number[] = [];

    for (const row of stockByCat as { category: string; totalStock: string | number }[]) {
      const stock = Number(row.totalStock);
      const out = outMap.get(row.category) ?? 0;
      const avgDaily = out / 30;
      const days = avgDaily > 0 ? stock / avgDaily : 999;
      categories.push(row.category);
      turnoverDaysData.push(Math.round(Math.min(days, 999) * 10) / 10);
    }

    return {
      queryType: 'turnover',
      parsedIntent: '查询各分类库存周转率',
      resultType: 'chart',
      title: '各分类库存周转天数',
      summary: `基于近 30 天出库数据，共 ${categories.length} 个分类`,
      chartData: {
        categories,
        series: [{ name: '周转天数', data: turnoverDaysData }],
      },
    };
  }

  // --- 库存总价值 ---
  private async tryTotalValue(
    query: string,
  ): Promise<NaturalLanguageQueryResponse | null> {
    if (!/(总价值|库存总值|库存总价值|库存总金额|总库存金额|总库存价值|库存值多少钱|库存值多少)/.test(query)) return null;

    const totalResult = await this.db
      .select({ total: sum(warehouseInventory.stockValue) })
      .from(warehouseInventory);
    const totalValue = Number(totalResult[0]?.total ?? 0);

    return {
      queryType: 'total_value',
      parsedIntent: '查询库存总价值',
      resultType: 'kpi',
      title: '库存总价值',
      summary: `当前库存总价值为 ${totalValue.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} 元`,
      kpiData: [
        { label: '库存总价值', value: totalValue.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), unit: '元' },
      ],
    };
  }

  // --- SKU 总数 ---
  private async tryTotalSku(
    query: string,
  ): Promise<NaturalLanguageQueryResponse | null> {
    if (!/(SKU总数|商品总数|总SKU|多少种商品|有多少商品|SKU数量|商品数量)/.test(query)) return null;

    const totalResult = await this.db
      .select({ count: count() })
      .from(products)
      .where(eq(products.status, 'active'));
    const totalSku = Number(totalResult[0]?.count ?? 0);

    return {
      queryType: 'total_sku',
      parsedIntent: '查询商品 SKU 总数',
      resultType: 'kpi',
      title: '商品 SKU 总数',
      summary: `当前系统中共有 ${totalSku} 个在售商品 SKU`,
      kpiData: [
        { label: 'SKU 总数', value: totalSku, unit: '个' },
      ],
    };
  }
}
