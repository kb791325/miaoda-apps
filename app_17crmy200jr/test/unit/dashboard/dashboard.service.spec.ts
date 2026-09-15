function MockFeishuBitableService() {}
function MockCacheService() {}

jest.mock(
  '../../../server/modules/feishu-bitable/feishu-bitable.service',
  () => ({
    FeishuBitableService: MockFeishuBitableService,
  }),
);
jest.mock(
  '@server/common/services/cache.service',
  () => ({
    CacheService: MockCacheService,
  }),
  { virtual: true },
);
jest.mock('@lark-apaas/fullstack-nestjs-core', () => {
  const actual = jest.requireActual('@lark-apaas/fullstack-nestjs-core');
  return {
    ...actual,
    DRIZZLE_DATABASE: 'DRIZZLE_DATABASE',
  };
});

// Mock @server/database/schema
jest.mock('@server/database/schema', () => {
  const makeCols = (names: string[]) =>
    Object.fromEntries(names.map((n) => [n, n]));
  return {
    budgets: makeCols(['id', 'budgetYear', 'budgetMonth', 'department', 'budgetAmount', 'usedAmount', 'isOverridden', 'remark', 'createdAt', 'updatedAt']),
  };
}, { virtual: true });

import { DashboardService } from '../../../server/modules/dashboard/dashboard.service';

const mockBitable = {
  getAllRecords: jest.fn(),
  listRecords: jest.fn(),
  getRecord: jest.fn(),
};

const mockDb = {
  select: jest.fn().mockReturnThis(),
  from: jest.fn().mockReturnThis(),
  where: jest.fn(),
};

const mockCache = {
  get: jest.fn().mockReturnValue(null),
  set: jest.fn(),
  delete: jest.fn(),
  deleteByPrefix: jest.fn(),
};

function makeExpenseRecord(overrides: Record<string, unknown> = {}) {
  return {
    recordId: 'exp-1',
    expense_date: '2026-08-15',
    amount: 5000,
    category_l1: '办公用品',
    category_l2: '文具',
    department: '行政部',
    payer_entity: '公司',
    floor: '3F',
    handler: 'user-1',
    ...overrides,
  };
}

function makeAssetRecord(overrides: Record<string, unknown> = {}) {
  return {
    recordId: 'asset-1',
    asset_name: '电脑',
    asset_type: '电子设备',
    asset_category: '固定资产',
    purchase_date: '2026-01-01',
    purchase_amount: 5000,
    asset_status: '在库',
    owner: '',
    floor: '3F',
    current_stock: 5,
    ...overrides,
  };
}

function setupBitableRecords(
  expenses: Array<Record<string, unknown>>,
  assets: Array<Record<string, unknown>> = [],
) {
  mockBitable.getAllRecords.mockImplementation((domain: string) => {
    if (domain === 'expenses') return Promise.resolve(expenses);
    if (domain === 'fixed_assets') return Promise.resolve(assets);
    return Promise.resolve([]);
  });
}

describe('DashboardService', () => {
  let service: DashboardService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCache.get.mockReturnValue(null);
    mockDb.where.mockResolvedValue([]);
    service = new DashboardService(
      mockBitable as any,
      mockDb as any,
      mockCache as any,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ---------- 1. Expense Overview ----------

  it('should get expense overview', async () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const dateStr = `${year}-${String(month).padStart(2, '0')}-15`;
    setupBitableRecords([makeExpenseRecord({ expense_date: dateStr })]);

    const result = await service.getExpenseOverview();

    expect(result).toBeDefined();
    expect(result.monthlyTotal).toBe(5000);
    expect(result.monthlyCount).toBe(1);
    expect(typeof result.yearlyTotal).toBe('number');
    expect(typeof result.yearOnYearGrowth).toBe('number');
    expect(typeof result.monthOnMonthGrowth).toBe('number');
  });

  // ---------- 2. Expense Trend ----------

  it('should get expense trend with monthly items', async () => {
    const records: Array<Record<string, unknown>> = [];
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    // 3 months of data
    for (let i = 0; i < 3; i += 1) {
      const m = month - i;
      const adjMonth = m > 0 ? m : m + 12;
      const adjYear = m > 0 ? year : year - 1;
      const dateStr = `${adjYear}-${String(adjMonth).padStart(2, '0')}-15`;
      records.push(
        makeExpenseRecord({
          recordId: `exp-trend-${i}`,
          expense_date: dateStr,
          amount: 1000 * (i + 1),
        }),
      );
    }

    setupBitableRecords(records);

    const result = await service.getExpenseTrend(3);

    expect(result.items).toBeDefined();
    expect(result.items.length).toBe(3);
    expect(result.items[0]).toHaveProperty('month');
    expect(result.items[0]).toHaveProperty('amount');
    expect(result.items[0]).toHaveProperty('count');
  });

  // ---------- 3. Expense by Category ----------

  it('should get expense by category grouped by category_l1', async () => {
    setupBitableRecords([
      makeExpenseRecord({
        recordId: 'exp-cat-1',
        category_l1: '办公用品',
        amount: 3000,
      }),
      makeExpenseRecord({
        recordId: 'exp-cat-2',
        category_l1: '办公用品',
        amount: 2000,
      }),
      makeExpenseRecord({
        recordId: 'exp-cat-3',
        category_l1: '差旅费',
        amount: 5000,
      }),
    ]);

    const result = await service.getExpenseByCategory();

    expect(result.items).toBeDefined();
    expect(result.items.length).toBe(2);

    const officeItems = result.items.find(
      (i: { category: string }) => i.category === '办公用品',
    );
    expect(officeItems).toBeDefined();
    expect(officeItems!.amount).toBe(5000);
    expect(officeItems!.percentage).toBe(50);

    const travelItems = result.items.find(
      (i: { category: string }) => i.category === '差旅费',
    );
    expect(travelItems).toBeDefined();
    expect(travelItems!.amount).toBe(5000);
  });

  // ---------- 4. Expense by Department ----------

  it('should get expense by department with budget data', async () => {
    setupBitableRecords([
      makeExpenseRecord({
        recordId: 'exp-dept-1',
        department: '行政部',
        amount: 3000,
      }),
      makeExpenseRecord({
        recordId: 'exp-dept-2',
        department: '技术部',
        amount: 7000,
      }),
    ]);

    const result = await service.getExpenseByDepartment(10);

    expect(result.items).toBeDefined();
    expect(result.items.length).toBe(2);
    // Sorted by amount descending
    expect(result.items[0].department).toBe('技术部');
    expect(result.items[0].amount).toBe(7000);
    expect(result.items[1].department).toBe('行政部');
    expect(result.items[1].amount).toBe(3000);
  });

  // ---------- 5. Asset Overview ----------

  it('should get asset overview', async () => {
    setupBitableRecords(
      [],
      [
        makeAssetRecord({
          asset_status: '在库',
          purchase_amount: 5000,
        }),
        makeAssetRecord({
          recordId: 'asset-2',
          asset_status: '在用',
          purchase_amount: 3000,
        }),
      ],
    );

    const result = await service.getAssetOverview();

    expect(result).toBeDefined();
    expect(result.totalCount).toBe(2);
    expect(result.totalValue).toBe(8000);
    expect(result.inStockCount).toBe(1);
    expect(result.inUseCount).toBe(1);
  });

  // ---------- 6. Asset Status Distribution ----------

  it('should get asset status distribution', async () => {
    setupBitableRecords(
      [],
      [
        makeAssetRecord({
          asset_status: '在库',
          purchase_amount: 5000,
        }),
        makeAssetRecord({
          recordId: 'asset-2',
          asset_status: '在库',
          purchase_amount: 3000,
        }),
        makeAssetRecord({
          recordId: 'asset-3',
          asset_status: '在用',
          purchase_amount: 2000,
        }),
        makeAssetRecord({
          recordId: 'asset-4',
          asset_status: '维修',
          purchase_amount: 1000,
        }),
      ],
    );

    const result = await service.getAssetStatusDistribution();

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThanOrEqual(2);

    const inStockItem = result.find(
      (i: { status: string }) => i.status === 'in_stock',
    );
    expect(inStockItem).toBeDefined();
    expect(inStockItem!.count).toBe(2);
    expect(inStockItem!.value).toBe(8000);

    const inUseItem = result.find(
      (i: { status: string }) => i.status === 'in_use',
    );
    expect(inUseItem).toBeDefined();
    expect(inUseItem!.count).toBe(1);

    const repairItem = result.find(
      (i: { status: string }) => i.status === 'repairing',
    );
    expect(repairItem).toBeDefined();
    expect(repairItem!.count).toBe(1);
  });

  // ---------- 7. Budget Execution ----------

  it('should get expense budget execution with db budget rows', async () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const monthStr = `${year}-${String(month).padStart(2, '0')}`;

    setupBitableRecords([
      makeExpenseRecord({
        expense_date: `${monthStr}-15`,
        amount: 5000,
      }),
    ]);

    mockDb.where.mockResolvedValue([
      {
        budgetYear: year,
        budgetMonth: month,
        budgetAmount: 10000,
      },
    ]);

    const result = await service.getExpenseBudgetExecution();

    expect(result.items).toBeDefined();
    expect(result.items.length).toBeGreaterThan(0);

    const currentMonth = result.items.find(
      (i: { month: string }) => i.month === monthStr,
    );
    expect(currentMonth).toBeDefined();
    expect(currentMonth!.budget).toBe(10000);
    expect(currentMonth!.actual).toBe(5000);
    expect(currentMonth!.executionRate).toBe(50);
  });

  // ---------- 8. Empty data ----------

  it('should handle empty data gracefully', async () => {
    setupBitableRecords([], []);

    const overview = await service.getExpenseOverview();
    expect(overview.monthlyTotal).toBe(0);
    expect(overview.monthlyCount).toBe(0);

    const trend = await service.getExpenseTrend(3);
    expect(trend.items.length).toBe(3);
    for (const item of trend.items) {
      expect(item.amount).toBe(0);
      expect(item.count).toBe(0);
    }

    const categories = await service.getExpenseByCategory();
    expect(categories.items.length).toBe(0);

    const assetOverview = await service.getAssetOverview();
    expect(assetOverview.totalCount).toBe(0);
    expect(assetOverview.totalValue).toBe(0);
  });
});