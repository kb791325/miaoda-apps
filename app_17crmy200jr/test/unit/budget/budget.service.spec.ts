import { ConflictException, NotFoundException } from '@nestjs/common';

// Mock FeishuBitableService
function MockFeishuBitableService() {}
jest.mock(
  '../../../server/modules/feishu-bitable/feishu-bitable.service',
  () => ({
    FeishuBitableService: MockFeishuBitableService,
  }),
);

// Mock @server/database/schema
const col = (name: string) => Symbol(name);
jest.mock('@server/database/schema', () => {
  const makeCols = (names: string[]) =>
    Object.fromEntries(names.map((n) => [n, n]));
  return {
    budgets: makeCols(['id', 'budgetYear', 'budgetMonth', 'department', 'budgetAmount', 'usedAmount', 'isOverridden', 'remark', 'createdAt', 'updatedAt']),
    budgetAdjustments: makeCols(['id', 'budgetId', 'adjustmentType', 'adjustmentAmount', 'reason', 'createdAt', 'createdBy']),
  };
}, { virtual: true });

import { BudgetService } from '../../../server/modules/budget/budget.service';

// ---------------------------------------------------------------------------
// Chainable Drizzle mock factory
// ---------------------------------------------------------------------------
const CHAINABLE = [
  'select',
  'from',
  'where',
  'orderBy',
  'limit',
  'offset',
  'insert',
  'values',
  'onConflictDoUpdate',
  'update',
  'set',
  'delete',
  'returning',
];

function makeChainableMock(): any {
  const m: any = {};
  for (const name of CHAINABLE) {
    m[name] = jest.fn();
  }
  m.$count = jest.fn();
  m.transaction = jest.fn();
  return m;
}

function resetChainable(m: any): void {
  for (const name of CHAINABLE) {
    m[name].mockReturnValue(m);
  }
  m.$count.mockReset();
  m.transaction.mockReset();
}

const mockDb = makeChainableMock();
const mockTx = makeChainableMock();

const mockBitable = {
  getAllRecords: jest.fn(),
  listRecords: jest.fn(),
  getRecord: jest.fn(),
  createRecord: jest.fn(),
  updateRecord: jest.fn(),
  deleteRecord: jest.fn(),
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeBudgetRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'budget-1',
    budgetYear: 2026,
    budgetMonth: '01',
    department: '行政部',
    budgetAmount: '100000',
    usedAmount: '50000',
    isOverridden: false,
    remark: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('BudgetService', () => {
  let service: BudgetService;

  beforeEach(() => {
    jest.clearAllMocks();
    resetChainable(mockDb);
    resetChainable(mockTx);
    mockDb.transaction.mockImplementation(
      async (fn: (...args: any[]) => any) => fn(mockTx),
    );
    service = new BudgetService(mockDb as any, mockBitable as any);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // 1. create
  it('should create budget', async () => {
    mockDb.limit.mockResolvedValueOnce([]); // no existing
    mockDb.returning.mockResolvedValueOnce([{ id: 'b1' }]);

    const result = await service.create({
      year: 2026,
      month: '03',
      department: '财务部',
      budgetAmount: 50000,
    });

    expect(result).toEqual({ id: 'b1' });
    expect(mockDb.insert).toHaveBeenCalled();
  });

  // 2. update
  it('should update budget', async () => {
    const oldRow = makeBudgetRow({ budgetAmount: '100000' });
    const updatedRow = makeBudgetRow({ budgetAmount: '120000' });

    mockTx.limit.mockResolvedValueOnce([oldRow]); // select old
    mockTx.returning.mockResolvedValueOnce([updatedRow]); // update returning
    mockTx.values.mockResolvedValueOnce(undefined); // insert adjustment (no returning)

    // findOne called after transaction
    mockDb.limit.mockResolvedValueOnce([makeBudgetRow({ budgetAmount: '120000' })]);
    mockBitable.getAllRecords.mockResolvedValue([]);

    const result = await service.update('budget-1', {
      budgetAmount: 120000,
      adjustReason: '季度调整',
    });

    expect(result.budgetAmount).toBe(120000);
    expect(mockDb.transaction).toHaveBeenCalled();
  });

  // 3. adjustUsedAmount
  it('should adjust budget used amount', async () => {
    const existing = makeBudgetRow({
      budgetAmount: '0',
      usedAmount: '3000',
    });

    mockTx.limit.mockResolvedValueOnce([existing]); // select existing
    mockTx.where
      .mockReturnValueOnce(mockTx) // select chain: chainable
      .mockResolvedValueOnce(undefined); // update set where: terminal

    await service.adjustUsedAmount({
      departmentId: '行政部',
      year: 2026,
      month: 1,
      amount: 500,
    });

    expect(mockDb.transaction).toHaveBeenCalled();
    expect(mockTx.update).toHaveBeenCalled();
  });

  // 4. getExecutionSummary
  it('should calculate execution rate', async () => {
    mockBitable.getAllRecords.mockResolvedValue([]);
    mockDb.orderBy.mockResolvedValueOnce([makeBudgetRow()]);

    const result = await service.getExecutionSummary(2026, '01');

    expect(result).toHaveProperty('items');
    expect(result).toHaveProperty('totalBudget');
    expect(result).toHaveProperty('totalUsed');
    expect(result).toHaveProperty('overallExecutionRate');
    expect(result.totalBudget).toBe(100000);
  });

  // 5. checkOverrun
  it('should check overrun status', async () => {
    mockDb.limit.mockResolvedValueOnce([makeBudgetRow()]);
    // bitable returns expenses that push usedAmount above budget
    mockBitable.getAllRecords.mockResolvedValue([
      {
        year: 2026,
        month: '01',
        department: '行政部',
        amount: 60000,
      },
    ]);

    const result = await service.checkOverrun({
      department: '行政部',
      month: '01',
      year: 2026,
      amount: 50000,
    });

    expect(result.isOverrun).toBe(true);
    expect(result.executionRate).toBe(60);
  });

  // 6. batchCreate
  it('should batch create budgets', async () => {
    mockDb.returning.mockResolvedValueOnce([
      { id: 'b1' },
      { id: 'b2' },
      { id: 'b3' },
    ]);

    const result = await service.batchCreate({
      year: 2026,
      month: '04',
      items: [
        { department: '行政部', budgetAmount: 50000 },
        { department: '财务部', budgetAmount: 80000 },
        { department: '技术部', budgetAmount: 120000 },
      ],
    });

    expect(result).toEqual({ successCount: 3 });
    expect(mockDb.insert).toHaveBeenCalled();
  });

  // 7. findAll with department filter
  it('should get budget by department and month', async () => {
    mockDb.offset.mockResolvedValueOnce([makeBudgetRow()]);
    mockDb.where
      .mockReturnValueOnce(mockDb) // main query chain: chainable
      .mockResolvedValueOnce([{ total: '1' }]); // count query: terminal
    mockBitable.getAllRecords.mockResolvedValue([]);

    const result = await service.findAll({
      year: 2026,
      month: '01',
      department: '行政部',
      page: 1,
      pageSize: 10,
    });

    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  // 8. findOne — not found
  it('should handle budget not found', async () => {
    mockDb.limit.mockResolvedValueOnce([]);

    await expect(service.findOne('nonexistent')).rejects.toThrow(
      NotFoundException,
    );
  });

  // 9. create — duplicate
  it('should handle duplicate budget creation', async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: 'existing' }]);

    await expect(
      service.create({
        year: 2026,
        month: '01',
        department: '行政部',
        budgetAmount: 100000,
      }),
    ).rejects.toThrow(ConflictException);
  });
});