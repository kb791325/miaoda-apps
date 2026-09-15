import type {
  ProductWithInventory,
  HealthScore,
  StockTransaction,
  CategoryTurnover,
} from '@shared/api.interface';

interface CategoryStats {
  avgValue: number;
  avgStock: number;
  turnoverDays: number;
  productCount: number;
}

function buildCategoryStats(
  prods: ProductWithInventory[],
  categoryTurnover: CategoryTurnover[],
): Map<string, CategoryStats> {
  const groups = new Map<string, ProductWithInventory[]>();
  for (const p of prods) {
    const list = groups.get(p.category) ?? [];
    list.push(p);
    groups.set(p.category, list);
  }

  const turnoverMap = new Map<string, number>();
  for (const ct of categoryTurnover) {
    turnoverMap.set(ct.category, ct.turnoverDays);
  }

  const stats = new Map<string, CategoryStats>();
  for (const [cat, items] of groups) {
    const values = items.map((p: ProductWithInventory) => p.totalValue).filter((v: number) => v > 0);
    const stocks = items.map((p: ProductWithInventory) => p.totalQuantity);
    stats.set(cat, {
      avgValue: values.length > 0
        ? values.reduce((a: number, b: number) => a + b, 0) / values.length
        : 1,
      avgStock: stocks.length > 0
        ? stocks.reduce((a: number, b: number) => a + b, 0) / stocks.length
        : 1,
      turnoverDays: turnoverMap.get(cat) ?? 60,
      productCount: items.length,
    });
  }
  return stats;
}

const COVERAGE_DAYS = 7;
const MIN_AUTO_SAFETY = 10;

function buildDailySalesMap(
  transactions: StockTransaction[],
): Map<string, number> {
  const outboundByProduct = new Map<string, number>();
  let minDate = Infinity;
  let maxDate = 0;

  for (const tx of transactions) {
    if (tx.type !== 'outbound') continue;
    const ts = new Date(tx.transactionDate).getTime();
    if (ts < minDate) minDate = ts;
    if (ts > maxDate) maxDate = ts;
    const prev = outboundByProduct.get(tx.productId) ?? 0;
    outboundByProduct.set(tx.productId, prev + tx.quantity);
  }

  const daySpan = Math.max(1, Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24)));
  const dailyAvg = new Map<string, number>();
  for (const [pid, total] of outboundByProduct) {
    dailyAvg.set(pid, total / daySpan);
  }
  return dailyAvg;
}

function computeAutoSafetyStock(
  productId: string,
  dailySalesMap: Map<string, number>,
  dbSafetyStock: number,
): { value: number; isAuto: boolean; dailySales: number } {
  const dailySales = dailySalesMap.get(productId) ?? 0;
  if (dailySales > 0) {
    return { value: Math.max(MIN_AUTO_SAFETY, Math.ceil(dailySales * COVERAGE_DAYS)), isAuto: true, dailySales };
  }
  if (dbSafetyStock > 0) {
    return { value: dbSafetyStock, isAuto: false, dailySales: 0 };
  }
  return { value: MIN_AUTO_SAFETY, isAuto: true, dailySales: 0 };
}

function calcOverstockDeduction(
  totalQty: number,
  safetyStock: number,
): { deduction: number; issues: string[] } {
  const issues: string[] = [];
  const ratio = totalQty / safetyStock;
  const excess = totalQty - Math.round(safetyStock * 1.5);

  if (ratio <= 1.5) return { deduction: 0, issues };

  if (ratio <= 3) {
    issues.push(`[积压] 库存 ${totalQty} 为安全线 ${safetyStock} 的 ${ratio.toFixed(1)} 倍，冗余 ${excess}`);
    return { deduction: 10, issues };
  }
  if (ratio <= 5) {
    issues.push(`[积压] 库存 ${totalQty} 为安全线 ${safetyStock} 的 ${ratio.toFixed(1)} 倍，冗余 ${excess}，建议减少采购`);
    return { deduction: 20, issues };
  }
  if (ratio <= 8) {
    issues.push(`[积压] 库存 ${totalQty} 为安全线 ${safetyStock} 的 ${ratio.toFixed(1)} 倍，冗余 ${excess}，建议促销消化`);
    return { deduction: 30, issues };
  }
  if (ratio <= 12) {
    issues.push(`[积压] 库存 ${totalQty} 为安全线 ${safetyStock} 的 ${ratio.toFixed(1)} 倍，冗余 ${excess}，严重积压`);
    return { deduction: 40, issues };
  }
  if (ratio <= 18) {
    issues.push(`[积压] 库存 ${totalQty} 为安全线 ${safetyStock} 的 ${ratio.toFixed(1)} 倍，冗余 ${excess}，建议停止采购并清仓`);
    return { deduction: 50, issues };
  }
  issues.push(`[积压] 库存 ${totalQty} 为安全线 ${safetyStock} 的 ${ratio.toFixed(1)} 倍，冗余 ${excess}，极度积压，需立即处理`);
  return { deduction: 60, issues };
}

function calcShortageDeduction(
  totalQty: number,
  safetyStock: number,
): { deduction: number; issues: string[] } {
  const issues: string[] = [];
  if (safetyStock <= 0) return { deduction: 0, issues };

  const coverage = totalQty / safetyStock;
  if (coverage >= 1) return { deduction: 0, issues };

  const shortage = safetyStock - totalQty;
  const pct = (coverage * 100).toFixed(0);

  if (coverage >= 0.7) {
    issues.push(`[低库存] 库存 ${totalQty} 仅达安全线 ${safetyStock} 的 ${pct}%，缺口 ${shortage}`);
    return { deduction: 30, issues };
  }
  if (coverage >= 0.4) {
    issues.push(`[低库存] 库存 ${totalQty} 仅达安全线 ${safetyStock} 的 ${pct}%，缺口 ${shortage}，建议补货`);
    return { deduction: 50, issues };
  }
  if (coverage >= 0.1) {
    issues.push(`[缺货] 库存 ${totalQty} 仅达安全线 ${safetyStock} 的 ${pct}%，缺口 ${shortage}，即将断货`);
    return { deduction: 80, issues };
  }
  issues.push(`[缺货] 库存 ${totalQty} 仅达安全线 ${safetyStock} 的 ${pct}%，缺口 ${shortage}，立即补货`);
  return { deduction: 100, issues };
}

function calcTurnoverDeduction(
  productId: string,
  totalQty: number,
  catStats: CategoryStats | undefined,
  dailySalesMap: Map<string, number>,
): { deduction: number; issues: string[] } {
  const issues: string[] = [];

  const dailySales = dailySalesMap.get(productId);
  if (dailySales && dailySales > 0 && totalQty > 0) {
    const days = Math.ceil(totalQty / dailySales);
    if (days <= 90) return { deduction: 0, issues };
    if (days <= 180) {
      issues.push(`[滞销] 可售 ${days} 天（日均出库 ${dailySales.toFixed(1)}），轻度滞销`);
      return { deduction: 5, issues };
    }
    if (days <= 365) {
      issues.push(`[滞销] 可售 ${days} 天（日均出库 ${dailySales.toFixed(1)}），明显滞销`);
      return { deduction: 8, issues };
    }
    issues.push(`[滞销] 可售 ${days} 天（日均出库 ${dailySales.toFixed(1)}），严重滞销`);
    return { deduction: 10, issues };
  }

  if (catStats && catStats.turnoverDays > 0 && totalQty > 0) {
    const stockRatio = totalQty / catStats.avgStock;
    const estimatedDays = Math.round(catStats.turnoverDays * stockRatio);
    if (estimatedDays <= 90) return { deduction: 0, issues };
    if (estimatedDays <= 180) {
      issues.push(`[滞销] 预估可售 ${estimatedDays} 天，轻度滞销`);
      return { deduction: 5, issues };
    }
    if (estimatedDays <= 365) {
      issues.push(`[滞销] 预估可售 ${estimatedDays} 天（品类均值 ${catStats.turnoverDays} 天），明显滞销`);
      return { deduction: 8, issues };
    }
    issues.push(`[滞销] 预估可售 ${estimatedDays} 天，严重滞销`);
    return { deduction: 10, issues };
  }

  return { deduction: 0, issues };
}

function scoreToLevel(score: number): string {
  if (score === 0) return '不健康';
  if (score <= 39) return '预警';
  if (score <= 69) return '需关注';
  if (score <= 89) return '基本健康';
  return '健康';
}

export interface EngineInput {
  products: ProductWithInventory[];
  transactions: StockTransaction[];
  categoryTurnover: CategoryTurnover[];
}

export function calculateHealthScores(input: EngineInput): HealthScore[] {
  const { products: prods, transactions, categoryTurnover } = input;
  const catStatsMap = buildCategoryStats(prods, categoryTurnover);
  const dailySalesMap = buildDailySalesMap(transactions);

  return prods.map((p: ProductWithInventory) => {
    const catStats = catStatsMap.get(p.category);

    if (p.totalQuantity === 0) {
      return {
        productId: p.id,
        productName: p.name,
        score: 0,
        level: '不健康',
        issues: '[缺货] 库存为零，已经断货，需立即补货',
      };
    }

    if (p.inventory.length === 0) {
      return {
        productId: p.id,
        productName: p.name,
        score: 0,
        level: '不健康',
        issues: '[缺货] 无任何仓库记录，库存数据缺失',
      };
    }

    const autoSafety = computeAutoSafetyStock(p.id, dailySalesMap, p.safetyStock);
    const safetyStock = autoSafety.value;
    const allIssues: string[] = [];

    if (autoSafety.isAuto && autoSafety.dailySales > 0) {
      allIssues.push(`[参考] 安全线由日均出库 ${autoSafety.dailySales.toFixed(1)} × ${COVERAGE_DAYS} 天自动推算为 ${safetyStock}`);
    } else if (!p.safetyStock || p.safetyStock <= 0) {
      allIssues.push(`[关注] 无出库记录且安全库存未配置，使用默认安全线 ${safetyStock}`);
    }

    const overstock = calcOverstockDeduction(p.totalQuantity, safetyStock);
    const shortage = overstock.deduction === 0
      ? calcShortageDeduction(p.totalQuantity, safetyStock)
      : { deduction: 0, issues: [] as string[] };
    const turnover = calcTurnoverDeduction(p.id, p.totalQuantity, catStats, dailySalesMap);

    allIssues.push(...shortage.issues, ...overstock.issues, ...turnover.issues);

    let score = Math.max(0, 100 - overstock.deduction - shortage.deduction - turnover.deduction);
    score = Math.round(score * 100) / 100;

    let level = scoreToLevel(score);

    const belowSafety = safetyStock > 0 && p.totalQuantity < safetyStock;
    if (belowSafety && (level === '健康' || level === '基本健康' || level === '需关注')) {
      level = '预警';
      allIssues.unshift(
        `[预警] 库存 ${p.totalQuantity} 低于安全线 ${safetyStock}，直接升级为预警状态`,
      );
    }

    const warehouseCount = p.inventory.filter((inv) => inv.quantity > 0).length;
    const issueText = allIssues.length > 0
      ? allIssues.join('；')
      : `库存 ${p.totalQuantity}，安全线 ${safetyStock}，分布 ${warehouseCount} 个仓库，运转良好`;

    return {
      productId: p.id,
      productName: p.name,
      score,
      level,
      issues: issueText,
    };
  });
}
