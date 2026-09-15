import { Injectable } from '@nestjs/common';
import { FeishuBitableService } from '../feishu-bitable/feishu-bitable.service';
import { CacheService } from '@server/common/cache/cache.service';
import type {
  AssetAnalysisResponse,
  ExpenseAnalysisResponse,
  InventoryAnalysisResponse,
} from '@shared/api.interface';

type TimeDimension = 'month' | 'quarter';
type ExpenseDimension = 'category' | 'entity' | 'floor' | 'department';

const CACHE_TTL_MS = 60_000;

@Injectable()
export class ReportsService {
  private readonly expensesDomain = 'expenses';
  private readonly assetsDomain = 'fixed_assets';
  private readonly checksDomain = 'inventory_checks';

  constructor(
    private readonly bitable: FeishuBitableService,
    private readonly cache: CacheService,
  ) {}

  private cacheKey(method: string, params: unknown = {}): string {
    return `report:${method}:${JSON.stringify(params)}`;
  }

  private filterByDate(
    records: Array<Record<string, unknown>>,
    dateField: string,
    startDate?: string,
    endDate?: string,
  ): Array<Record<string, unknown>> {
    return records.filter((rec) => {
      const date = (rec[dateField] as string) ?? '';
      if (!date) return false;
      if (startDate && date < startDate) return false;
      if (endDate && date >= endDate) return false;
      return true;
    });
  }

  async getExpenseAnalysis(params: {
    timeDimension: TimeDimension;
    dimension: ExpenseDimension;
    startDate?: string;
    endDate?: string;
  }): Promise<ExpenseAnalysisResponse> {
    const key = this.cacheKey('expenseAnalysis', params);
    const cached = await this.cache.get<ExpenseAnalysisResponse>(key);
    if (cached) return cached;

    const result = await this.computeExpenseAnalysis(params);
    await this.cache.set(key, result, CACHE_TTL_MS);
    return result;
  }

  private async computeExpenseAnalysis(params: {
    timeDimension: TimeDimension;
    dimension: ExpenseDimension;
    startDate?: string;
    endDate?: string;
  }): Promise<ExpenseAnalysisResponse> {
    const { timeDimension, dimension, startDate, endDate } = params;

    const allRecords = await this.bitable.getAllRecords(this.expensesDomain);
    const filtered = this.filterByDate(
      allRecords,
      'expense_date',
      startDate,
      endDate,
    );

    const trendMap = new Map<string, number>();
    for (const rec of filtered) {
      const date = (rec.expense_date as string) ?? '';
      const amount = Number(rec.amount ?? 0);
      let period: string;
      if (timeDimension === 'month') {
        period = date.slice(0, 7);
      } else {
        const year = date.slice(0, 4);
        const month = parseInt(date.slice(5, 7), 10);
        const q = Math.floor((month - 1) / 3) + 1;
        period = `${year}-Q${q}`;
      }
      trendMap.set(period, (trendMap.get(period) ?? 0) + amount);
    }

    const trend = Array.from(trendMap.entries())
      .map(([period, amount]) => ({ period, amount: Math.round(amount * 100) / 100 }))
      .sort((a, b) => a.period.localeCompare(b.period));

    const fieldMap: Record<ExpenseDimension, string> = {
      category: 'category_l1',
      entity: 'payer_entity',
      floor: 'floor',
      department: 'department',
    };
    const field = fieldMap[dimension];

    const dimMap = new Map<string, number>();
    let totalAmount = 0;
    for (const rec of filtered) {
      const key = (rec[field] as string) ?? '未指定';
      const amount = Number(rec.amount ?? 0);
      dimMap.set(key, (dimMap.get(key) ?? 0) + amount);
      totalAmount += amount;
    }

    const breakdown = Array.from(dimMap.entries())
      .map(([name, amount]) => ({
        name,
        amount: Math.round(amount * 100) / 100,
        percentage: totalAmount > 0 ? Math.round((amount / totalAmount) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    return {
      trend,
      dimensionBreakdown: breakdown,
      topRanking: breakdown.slice(0, 10).map((item) => ({
        name: item.name,
        amount: item.amount,
      })),
    };
  }

  async getAssetAnalysis(): Promise<AssetAnalysisResponse> {
    const key = this.cacheKey('assetAnalysis');
    const cached = await this.cache.get<AssetAnalysisResponse>(key);
    if (cached) return cached;

    const result = await this.computeAssetAnalysis();
    await this.cache.set(key, result, CACHE_TTL_MS);
    return result;
  }

  private async computeAssetAnalysis(): Promise<AssetAnalysisResponse> {
    const allRecords = await this.bitable.getAllRecords(this.assetsDomain);

    const typeMap = new Map<string, { count: number; value: number }>();
    let totalValue = 0;
    let totalCount = 0;

    const valueBins = [
      { range: '0-1000', min: 0, max: 1000, count: 0, value: 0 },
      { range: '1000-5000', min: 1000, max: 5000, count: 0, value: 0 },
      { range: '5000-10000', min: 5000, max: 10000, count: 0, value: 0 },
      { range: '10000以上', min: 10000, max: Infinity, count: 0, value: 0 },
    ];

    const floorMap = new Map<string, { count: number; value: number }>();

    for (const rec of allRecords) {
      const type = (rec.asset_type as string) ?? 'other';
      const amount = Number(rec.purchase_amount ?? 0);
      const currentStock = Number(rec.current_stock ?? 1);
      const floor = (rec.floor as string) ?? '未指定';

      totalCount += currentStock;
      totalValue += amount * currentStock;

      const typeData = typeMap.get(type) ?? { count: 0, value: 0 };
      typeData.count += currentStock;
      typeData.value += amount * currentStock;
      typeMap.set(type, typeData);

      for (const bin of valueBins) {
        if (amount >= bin.min && amount < bin.max) {
          bin.count += currentStock;
          bin.value += amount * currentStock;
          break;
        }
      }

      const floorData = floorMap.get(floor) ?? { count: 0, value: 0 };
      floorData.count += currentStock;
      floorData.value += amount * currentStock;
      floorMap.set(floor, floorData);
    }

    const typeDistribution = Array.from(typeMap.entries()).map(([assetType, data]) => ({
      type: assetType,
      count: data.count,
      value: Math.round(data.value * 100) / 100,
    }));

    const valueDistribution = valueBins.map((bin) => ({
      range: bin.range,
      count: bin.count,
      value: Math.round(bin.value * 100) / 100,
    }));

    const floorDistribution = Array.from(floorMap.entries())
      .map(([floor, data]) => ({
        floor,
        count: data.count,
        value: Math.round(data.value * 100) / 100,
      }))
      .sort((a, b) => b.value - a.value);

    return {
      typeDistribution,
      valueDistribution,
      floorDistribution,
    };
  }

  async getInventoryAnalysis(year: number): Promise<InventoryAnalysisResponse> {
    const key = this.cacheKey('inventoryAnalysis', { year });
    const cached = await this.cache.get<InventoryAnalysisResponse>(key);
    if (cached) return cached;

    const result = await this.computeInventoryAnalysis(year);
    await this.cache.set(key, result, CACHE_TTL_MS);
    return result;
  }

  private async computeInventoryAnalysis(year: number): Promise<InventoryAnalysisResponse> {
    const [assets, checks] = await Promise.all([
      this.bitable.getAllRecords(this.assetsDomain),
      this.bitable.getAllRecords(this.checksDomain),
    ]);

    const months: string[] = [];
    for (let m = 1; m <= 12; m += 1) {
      months.push(`${year}-${String(m).padStart(2, '0')}`);
    }

    const yearChecks = checks.filter((rec) => {
      const y = Number(rec.check_year ?? 0);
      return y === year;
    });

    const completionRate = months.map((month) => {
      const monthChecks = yearChecks.filter((rec) => {
        const m = (rec.check_month as string) ?? '';
        return m === month;
      });

      const checkedSet = new Set<string>();
      for (const rec of monthChecks) {
        const st = (rec.status as string) ?? '';
        if (st === 'checked' || st === 'abnormal' || st === 'resolved') {
          checkedSet.add((rec.asset_id as string) ?? '');
        }
      }

      return {
        month,
        rate:
          assets.length === 0
            ? 0
            : Math.round((checkedSet.size / assets.length) * 10000) / 100,
      };
    });

    const abnormalRate = months.map((month) => {
      const monthChecks = yearChecks.filter((rec) => {
        const m = (rec.check_month as string) ?? '';
        return m === month;
      });

      const abnormal = monthChecks.filter(
        (rec) => (rec.status as string) === 'abnormal',
      ).length;

      return {
        month,
        rate:
          monthChecks.length === 0
            ? 0
            : Math.round((abnormal / monthChecks.length) * 1000) / 10,
        count: abnormal,
      };
    });

    const deptMap = new Map<string, { total: number; completed: number }>();
    for (const rec of assets) {
      const dept = (rec.department as string) ?? '未分配';
      const data = deptMap.get(dept) ?? { total: 0, completed: 0 };
      data.total += 1;
      deptMap.set(dept, data);
    }

    for (const rec of yearChecks) {
      const st = (rec.status as string) ?? '';
      if (st !== 'checked' && st !== 'abnormal' && st !== 'resolved') continue;
      const assetId = (rec.asset_id as string) ?? '';
      const assetRec = assets.find((a) => (a.record_id as string) === assetId || (a.id as string) === assetId || (a.asset_name as string) === (rec.asset_name as string));
      const dept = assetRec ? ((assetRec.department as string) ?? '未分配') : '未分配';
      const data = deptMap.get(dept);
      if (data && data.completed < data.total) {
        data.completed += 1;
      }
    }

    const departmentCompletion = Array.from(deptMap.entries())
      .map(([department, data]) => ({
        department,
        completionRate:
          data.total === 0
            ? 0
            : Math.round((Math.min(data.completed, data.total) / data.total) * 10000) / 100,
      }))
      .sort((a, b) => b.completionRate - a.completionRate);

    return {
      completionTrend: completionRate.map((c) => ({ month: c.month, rate: c.rate })),
      abnormalRate,
      departmentRanking: departmentCompletion,
    };
  }
}
