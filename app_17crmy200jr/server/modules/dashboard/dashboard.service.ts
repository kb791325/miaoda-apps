import { Inject, Injectable } from "@nestjs/common";
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from "@lark-apaas/fullstack-nestjs-core";
import { eq } from "drizzle-orm";
import { FeishuBitableService } from "../feishu-bitable/feishu-bitable.service";
import { budgets } from "@server/database/schema";
import { CacheService } from "@server/common/cache/cache.service";
import type {
  DashboardAssetOverview,
  DashboardCategoryItem,
  DashboardDepartmentItem,
  DashboardEntityItem,
  DashboardExpenseOverview,
  DashboardFloorItem,
  DashboardTrendItem,
} from "@shared/api.interface";

const CACHE_TTL_MS = 60_000;

interface DashboardRawData {
  expenseRecords: Array<Record<string, unknown>>;
  assetRecords: Array<Record<string, unknown>>;
}

@Injectable()
export class DashboardService {
  private readonly expensesDomain = "expenses";
  private readonly assetsDomain = "fixed_assets";

  // Raw bitable data cache (single source of truth) + single-flight guard
  private _rawCache: { data: DashboardRawData; expireAt: number } | null = null;
  private _rawFetchPromise: Promise<DashboardRawData> | null = null;

  constructor(
    private readonly bitable: FeishuBitableService,
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    private readonly cache: CacheService,
  ) {}

  private cacheKey(method: string, params: unknown = {}): string {
    return `dash:${method}:${JSON.stringify(params)}`;
  }

  /**
   * One-stop shop for all dashboard bitable data.
   * 60s TTL in-memory cache + single-flight to avoid duplicate fetches
   * when multiple dashboard requests arrive concurrently.
   */
  private async _getAllDashboardData(): Promise<DashboardRawData> {
    const now = Date.now();

    // Cache hit
    if (this._rawCache && now < this._rawCache.expireAt) {
      return this._rawCache.data;
    }

    // Single-flight: another request is already fetching, piggyback on it
    if (this._rawFetchPromise) {
      return this._rawFetchPromise;
    }

    this._rawFetchPromise = this._fetchAllRawData().finally(() => {
      this._rawFetchPromise = null;
    });

    return this._rawFetchPromise;
  }

  private async _fetchAllRawData(): Promise<DashboardRawData> {
    const [expenseRecords, assetRecords] = await Promise.all([
      this.bitable.getAllRecords(this.expensesDomain),
      this.bitable.getAllRecords(this.assetsDomain),
    ]);

    const data: DashboardRawData = { expenseRecords, assetRecords };
    this._rawCache = { data, expireAt: Date.now() + CACHE_TTL_MS };
    return data;
  }

  // ---------- Expense Overview ----------

  async getExpenseOverview(): Promise<DashboardExpenseOverview> {
    const key = this.cacheKey("expenseOverview");
    const cached = await this.cache.get<DashboardExpenseOverview>(key);
    if (cached) return cached;

    const { expenseRecords } = await this._getAllDashboardData();
    const result = this.computeExpenseOverview(expenseRecords);
    await this.cache.set(key, result, CACHE_TTL_MS);
    return result;
  }

  private computeExpenseOverview(
    allRecords: Array<Record<string, unknown>>,
  ): DashboardExpenseOverview {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    const inMonth = allRecords.filter((rec) => {
      const date = (rec.expense_date as string) ?? "";
      if (!date) return false;
      const d = new Date(date);
      return (
        d.getFullYear() === currentYear &&
        d.getMonth() + 1 === currentMonth
      );
    });

    const inYear = allRecords.filter((rec) => {
      const date = (rec.expense_date as string) ?? "";
      if (!date) return false;
      return new Date(date).getFullYear() === currentYear;
    });

    const lastYearMonth = allRecords.filter((rec) => {
      const date = (rec.expense_date as string) ?? "";
      if (!date) return false;
      const d = new Date(date);
      return (
        d.getFullYear() === currentYear - 1 &&
        d.getMonth() + 1 === currentMonth
      );
    });

    const lastMonth = allRecords.filter((rec) => {
      const date = (rec.expense_date as string) ?? "";
      if (!date) return false;
      const d = new Date(date);
      const lastMonthDate = new Date(currentYear, currentMonth - 2, 1);
      return (
        d.getFullYear() === lastMonthDate.getFullYear() &&
        d.getMonth() + 1 === lastMonthDate.getMonth() + 1
      );
    });

    const sumAmount = (records: Array<Record<string, unknown>>): number => {
      let total = 0;
      for (const r of records) {
        total += Number(r.amount ?? 0);
      }
      return total;
    };

    const monthTotal = sumAmount(inMonth);
    const yearTotal = sumAmount(inYear);
    const lastYearMonthTotal = sumAmount(lastYearMonth);
    const lastMonthTotal = sumAmount(lastMonth);
    const yearOnYearGrowth =
      lastYearMonthTotal > 0
        ? Math.round(((monthTotal - lastYearMonthTotal) / lastYearMonthTotal) * 1000) / 10
        : 0;
    const monthOnMonthGrowth =
      lastMonthTotal > 0
        ? Math.round(((monthTotal - lastMonthTotal) / lastMonthTotal) * 1000) / 10
        : 0;

    return {
      monthlyTotal: monthTotal,
      yearlyTotal: yearTotal,
      monthlyCount: inMonth.length,
      yearOnYearGrowth,
      monthOnMonthGrowth,
    };
  }

  // ---------- Expense Trend ----------

  async getExpenseTrend(
    months: number,
  ): Promise<{ items: DashboardTrendItem[] }> {
    const key = this.cacheKey("expenseTrend", { months });
    const cached = await this.cache.get<{ items: DashboardTrendItem[] }>(key);
    if (cached) return cached;

    const { expenseRecords } = await this._getAllDashboardData();
    const result = this.computeExpenseTrend(months, expenseRecords);
    await this.cache.set(key, result, CACHE_TTL_MS);
    return result;
  }

  private computeExpenseTrend(
    months: number,
    allRecords: Array<Record<string, unknown>>,
  ): { items: DashboardTrendItem[] } {
    const now = new Date();
    const result: DashboardTrendItem[] = [];

    for (let i = months - 1; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;

      const monthRecords = allRecords.filter((rec) => {
        const date = (rec.expense_date as string) ?? "";
        if (!date) return false;
        const rd = new Date(date);
        return rd.getFullYear() === year && rd.getMonth() + 1 === month;
      });

      const total = monthRecords.reduce(
        (sum: number, r: Record<string, unknown>) =>
          sum + Number(r.amount ?? 0),
        0,
      );

      result.push({
        month: `${year}-${String(month).padStart(2, "0")}`,
        amount: Math.round(total * 100) / 100,
        count: monthRecords.length,
      });
    }

    return { items: result };
  }

  // ---------- Expense by Category ----------

  async getExpenseByCategory(): Promise<{ items: DashboardCategoryItem[] }> {
    const key = this.cacheKey("expenseCategoryBreakdown");
    const cached = await this.cache.get<{ items: DashboardCategoryItem[] }>(key);
    if (cached) return cached;

    const { expenseRecords } = await this._getAllDashboardData();
    const result = this.computeExpenseByCategory(expenseRecords);
    await this.cache.set(key, result, CACHE_TTL_MS);
    return result;
  }

  private computeExpenseByCategory(
    allRecords: Array<Record<string, unknown>>,
  ): { items: DashboardCategoryItem[] } {
    const map = new Map<string, number>();

    for (const rec of allRecords) {
      const cat = (rec.category_l1 as string) ?? "其他";
      const amount = Number(rec.amount ?? 0);
      map.set(cat, (map.get(cat) ?? 0) + amount);
    }

    const totalAll = Array.from(map.values()).reduce((s, v) => s + v, 0);
    const items: DashboardCategoryItem[] = Array.from(map.entries()).map(
      ([cat, amount]) => ({
        category: cat,
        amount: Math.round(amount * 100) / 100,
        percentage: totalAll > 0 ? Math.round((amount / totalAll) * 1000) / 10 : 0,
      }),
    );
    items.sort((a: DashboardCategoryItem, b: DashboardCategoryItem) => b.amount - a.amount);

    return { items };
  }

  // ---------- Expense by Entity ----------

  async getExpenseByEntity(): Promise<{ items: DashboardEntityItem[] }> {
    const key = this.cacheKey("expenseEntityBreakdown");
    const cached = await this.cache.get<{ items: DashboardEntityItem[] }>(key);
    if (cached) return cached;

    const { expenseRecords } = await this._getAllDashboardData();
    const result = this.computeExpenseByEntity(expenseRecords);
    await this.cache.set(key, result, CACHE_TTL_MS);
    return result;
  }

  private computeExpenseByEntity(
    allRecords: Array<Record<string, unknown>>,
  ): { items: DashboardEntityItem[] } {
    const map = new Map<string, number>();

    for (const rec of allRecords) {
      const entity = (rec.payer_entity as string) ?? "未指定";
      const amount = Number(rec.amount ?? 0);
      map.set(entity, (map.get(entity) ?? 0) + amount);
    }

    const items: DashboardEntityItem[] = Array.from(map.entries()).map(
      ([entity, amount]) => ({ entity, amount: Math.round(amount * 100) / 100 }),
    );
    items.sort((a: DashboardEntityItem, b: DashboardEntityItem) => b.amount - a.amount);

    return { items };
  }

  // ---------- Expense by Floor ----------

  async getExpenseByFloor(): Promise<{ items: DashboardFloorItem[] }> {
    const key = this.cacheKey("expenseFloorBreakdown");
    const cached = await this.cache.get<{ items: DashboardFloorItem[] }>(key);
    if (cached) return cached;

    const { expenseRecords } = await this._getAllDashboardData();
    const result = this.computeExpenseByFloor(expenseRecords);
    await this.cache.set(key, result, CACHE_TTL_MS);
    return result;
  }

  private computeExpenseByFloor(
    allRecords: Array<Record<string, unknown>>,
  ): { items: DashboardFloorItem[] } {
    const map = new Map<string, number>();

    for (const rec of allRecords) {
      const floor = (rec.floor as string) ?? "未指定";
      const amount = Number(rec.amount ?? 0);
      map.set(floor, (map.get(floor) ?? 0) + amount);
    }

    const items: DashboardFloorItem[] = Array.from(map.entries()).map(
      ([floor, amount]) => ({ floor, amount: Math.round(amount * 100) / 100 }),
    );
    items.sort((a: DashboardFloorItem, b: DashboardFloorItem) => b.amount - a.amount);

    return { items };
  }

  // ---------- Expense by Department ----------

  async getExpenseByDepartment(
    limit: number,
  ): Promise<{ items: DashboardDepartmentItem[] }> {
    const key = this.cacheKey("expenseDepartmentRanking", { limit });
    const cached = await this.cache.get<{ items: DashboardDepartmentItem[] }>(key);
    if (cached) return cached;

    const { expenseRecords } = await this._getAllDashboardData();
    const result = this.computeExpenseByDepartment(limit, expenseRecords);
    await this.cache.set(key, result, CACHE_TTL_MS);
    return result;
  }

  private computeExpenseByDepartment(
    limit: number,
    allRecords: Array<Record<string, unknown>>,
  ): { items: DashboardDepartmentItem[] } {
    const map = new Map<string, number>();

    for (const rec of allRecords) {
      const dept = (rec.department as string) ?? "未指定";
      const amount = Number(rec.amount ?? 0);
      map.set(dept, (map.get(dept) ?? 0) + amount);
    }

    const items: DashboardDepartmentItem[] = Array.from(map.entries()).map(
      ([dept, amount]) => ({ department: dept, amount: Math.round(amount * 100) / 100 }),
    );
    items.sort(
      (a: DashboardDepartmentItem, b: DashboardDepartmentItem) => b.amount - a.amount,
    );

    return { items: items.slice(0, limit) };
  }

  // ---------- Asset Overview ----------

  private normalizeAssetStatus(raw: string): string {
    if (raw === "in_stock" || raw === "在库") return "in_stock";
    if (raw === "in_use" || raw === "在用") return "in_use";
    if (raw === "idle" || raw === "闲置") return "idle";
    if (raw === "repairing" || raw === "维修") return "repairing";
    if (raw === "transferring" || raw === "转移中") return "transferring";
    if (raw === "scrapped" || raw === "报废") return "scrapped";
    return raw || "in_stock";
  }

  async getAssetOverview(): Promise<DashboardAssetOverview> {
    const key = this.cacheKey("assetOverview");
    const cached = await this.cache.get<DashboardAssetOverview>(key);
    if (cached) return cached;

    const { assetRecords } = await this._getAllDashboardData();
    const result = this.computeAssetOverview(assetRecords);
    await this.cache.set(key, result, CACHE_TTL_MS);
    return result;
  }

  private computeAssetOverview(
    allRecords: Array<Record<string, unknown>>,
  ): DashboardAssetOverview {
    let totalValue = 0;
    let inUse = 0;
    let inStock = 0;

    const inStockStatuses = new Set(["in_stock", "idle"]);
    const inUseStatuses = new Set(["in_use", "repairing", "transferring"]);

    for (const rec of allRecords) {
      const amount = Number(rec.purchase_amount ?? 0);
      const rawStatus = (rec.asset_status as string) ?? "";
      const status = this.normalizeAssetStatus(rawStatus);

      totalValue += amount;
      if (inStockStatuses.has(status)) {
        inStock += 1;
      } else if (inUseStatuses.has(status)) {
        inUse += 1;
      }
    }

    return {
      totalCount: allRecords.length,
      totalValue: Math.round(totalValue * 100) / 100,
      inStockCount: inStock,
      inUseCount: inUse,
    };
  }

  // ---------- Expense Budget Execution ----------

  async getExpenseBudgetExecution(): Promise<{
    items: Array<{ month: string; budget: number; actual: number; executionRate: number }>;
  }> {
    const key = this.cacheKey("budgetExecution");
    const cached = await this.cache.get<{
      items: Array<{ month: string; budget: number; actual: number; executionRate: number }>;
    }>(key);
    if (cached) return cached;

    const { expenseRecords } = await this._getAllDashboardData();
    const result = await this.computeExpenseBudgetExecution(expenseRecords);
    await this.cache.set(key, result, CACHE_TTL_MS);
    return result;
  }

  private async computeExpenseBudgetExecution(
    allRecords: Array<Record<string, unknown>>,
  ): Promise<{
    items: Array<{ month: string; budget: number; actual: number; executionRate: number }>;
  }> {
    const now = new Date();
    const currentYear = now.getFullYear();

    const monthList: string[] = [];
    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date(currentYear, now.getMonth() - i, 1);
      monthList.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    }

    const budgetRows = await this.db
      .select({
        budgetYear: budgets.budgetYear,
        budgetMonth: budgets.budgetMonth,
        budgetAmount: budgets.budgetAmount,
      })
      .from(budgets)
      .where(eq(budgets.budgetYear, currentYear));

    const budgetByMonth = new Map<string, number>();
    for (const row of budgetRows) {
      const monthKey = `${row.budgetYear}-${String(row.budgetMonth).padStart(2, "0")}`;
      const amount = Number(row.budgetAmount ?? 0);
      budgetByMonth.set(monthKey, (budgetByMonth.get(monthKey) ?? 0) + amount);
    }

    const items: Array<{ month: string; budget: number; actual: number; executionRate: number }> = [];

    for (const monthStr of monthList) {
      const budget = budgetByMonth.get(monthStr) ?? 0;
      let actual = 0;

      for (const rec of allRecords) {
        const date = (rec.expense_date as string) ?? "";
        if (!date || !date.startsWith(monthStr)) continue;
        actual += Number(rec.amount ?? 0);
      }

      items.push({
        month: monthStr,
        budget: Math.round(budget * 100) / 100,
        actual: Math.round(actual * 100) / 100,
        executionRate: budget > 0 ? Math.round((actual / budget) * 1000) / 10 : 0,
      });
    }

    return { items };
  }

  // ---------- Expense Ranking ----------

  async getExpenseRanking(): Promise<{
    byDepartment: Array<{ name: string; amount: number }>;
    byCategory: Array<{ name: string; amount: number }>;
    byHandler: Array<{ name: string; amount: number }>;
  }> {
    const key = this.cacheKey("expenseRanking");
    const cached = await this.cache.get<{
      byDepartment: Array<{ name: string; amount: number }>;
      byCategory: Array<{ name: string; amount: number }>;
      byHandler: Array<{ name: string; amount: number }>;
    }>(key);
    if (cached) return cached;

    const { expenseRecords } = await this._getAllDashboardData();
    const result = this.computeExpenseRanking(expenseRecords);
    await this.cache.set(key, result, CACHE_TTL_MS);
    return result;
  }

  private computeExpenseRanking(
    allRecords: Array<Record<string, unknown>>,
  ): {
    byDepartment: Array<{ name: string; amount: number }>;
    byCategory: Array<{ name: string; amount: number }>;
    byHandler: Array<{ name: string; amount: number }>;
  } {
    const deptMap = new Map<string, number>();
    const catMap = new Map<string, number>();
    const handlerMap = new Map<string, number>();

    for (const rec of allRecords) {
      const dept = (rec.department as string) ?? "未分配";
      const cat = (rec.category_l1 as string) ?? "其他";
      const handler = (rec.handler as string) ?? "未知";
      const amount = Number(rec.amount ?? 0);
      deptMap.set(dept, (deptMap.get(dept) ?? 0) + amount);
      catMap.set(cat, (catMap.get(cat) ?? 0) + amount);
      handlerMap.set(handler, (handlerMap.get(handler) ?? 0) + amount);
    }

    const byDepartment = Array.from(deptMap.entries())
      .map(([name, amount]) => ({ name, amount: Math.round(amount * 100) / 100 }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);

    const byCategory = Array.from(catMap.entries())
      .map(([name, amount]) => ({ name, amount: Math.round(amount * 100) / 100 }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);

    const byHandler = Array.from(handlerMap.entries())
      .map(([name, amount]) => ({ name, amount: Math.round(amount * 100) / 100 }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);

    return { byDepartment, byCategory, byHandler };
  }

  // ---------- Asset Status Distribution ----------

  async getAssetStatusDistribution(): Promise<
    Array<{ status: string; count: number; value: number }>
  > {
    const key = this.cacheKey("assetStatusDistribution");
    const cached = await this.cache.get<Array<{ status: string; count: number; value: number }>>(key);
    if (cached) return cached;

    const { assetRecords } = await this._getAllDashboardData();
    const result = this.computeAssetStatusDistribution(assetRecords);
    await this.cache.set(key, result, CACHE_TTL_MS);
    return result;
  }

  private computeAssetStatusDistribution(
    allRecords: Array<Record<string, unknown>>,
  ): Array<{ status: string; count: number; value: number }> {
    const map = new Map<string, { count: number; value: number }>();

    for (const rec of allRecords) {
      const rawStatus = (rec.asset_status as string) ?? "";
      const status = this.normalizeAssetStatus(rawStatus);
      const amount = Number(rec.purchase_amount ?? 0);
      const current = map.get(status) ?? { count: 0, value: 0 };
      map.set(status, {
        count: current.count + 1,
        value: current.value + amount,
      });
    }

    const items = Array.from(map.entries()).map(([status, data]) => ({
      status,
      count: data.count,
      value: Math.round(data.value * 100) / 100,
    }));

    return items;
  }

  // ---------- Asset Depreciation ----------

  async getAssetDepreciation(): Promise<{
    originalValue: number;
    accumulatedDepreciation: number;
    netValue: number;
    monthlyDepreciation: number;
  }> {
    const key = this.cacheKey("assetDepreciationOverview");
    const cached = await this.cache.get<{
      originalValue: number;
      accumulatedDepreciation: number;
      netValue: number;
      monthlyDepreciation: number;
    }>(key);
    if (cached) return cached;

    const { assetRecords } = await this._getAllDashboardData();
    const result = this.computeAssetDepreciation(assetRecords);
    await this.cache.set(key, result, CACHE_TTL_MS);
    return result;
  }

  private computeAssetDepreciation(
    allRecords: Array<Record<string, unknown>>,
  ): {
    originalValue: number;
    accumulatedDepreciation: number;
    netValue: number;
    monthlyDepreciation: number;
  } {
    const now = new Date();

    let originalValue = 0;
    let accumulatedDepreciation = 0;
    let netValue = 0;
    let monthlyDepreciation = 0;

    for (const rec of allRecords) {
      const amount = Number(rec.purchase_amount ?? 0);
      const purchaseDate = (rec.purchase_date as string) ?? "";
      if (!purchaseDate || amount <= 0) continue;

      const pd = new Date(purchaseDate);
      if (isNaN(pd.getTime())) continue;

      const monthsElapsed =
        (now.getFullYear() - pd.getFullYear()) * 12 +
        (now.getMonth() - pd.getMonth());

      if (monthsElapsed <= 0) {
        originalValue += amount;
        netValue += amount;
        monthlyDepreciation += amount / 36;
        continue;
      }

      const months = Math.min(monthsElapsed, 36);
      const monthlyDep = amount / 36;
      const dep = monthlyDep * months;
      const net = Math.max(0, amount - dep);

      originalValue += amount;
      accumulatedDepreciation += dep;
      netValue += net;
      monthlyDepreciation += monthlyDep;
    }

    return {
      originalValue: Math.round(originalValue * 100) / 100,
      accumulatedDepreciation: Math.round(accumulatedDepreciation * 100) / 100,
      netValue: Math.round(netValue * 100) / 100,
      monthlyDepreciation: Math.round(monthlyDepreciation * 100) / 100,
    };
  }

  // ---------- Asset Repair Pending ----------

  async getAssetRepairPending(): Promise<
    Array<{
      id: string;
      assetName: string;
      assetType: string;
      status: string;
      repairReason?: string;
      repairDate?: string;
    }>
  > {
    const key = this.cacheKey("assetRepairBacklog");
    const cached = await this.cache.get<
      Array<{
        id: string;
        assetName: string;
        assetType: string;
        status: string;
        repairReason?: string;
        repairDate?: string;
      }>
    >(key);
    if (cached) return cached;

    const { assetRecords } = await this._getAllDashboardData();
    const result = this.computeAssetRepairPending(assetRecords);
    await this.cache.set(key, result, CACHE_TTL_MS);
    return result;
  }

  private computeAssetRepairPending(
    allRecords: Array<Record<string, unknown>>,
  ): Array<{
    id: string;
    assetName: string;
    assetType: string;
    status: string;
    repairReason?: string;
    repairDate?: string;
  }> {
    const repairRecords = allRecords.filter(
      (r) => r.asset_status === "repairing",
    );

    const items = repairRecords.map((rec) => ({
      id: (rec.recordId as string) ?? (rec.id as string) ?? "",
      assetName: (rec.asset_name as string) ?? "",
      assetType: (rec.asset_type as string) ?? "",
      status: (rec.asset_status as string) || "in_stock",
    }));

    return items.slice(0, 10);
  }
}
