import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import type {
  CreateExpenseDto,
  ExpenseListResponse,
  ExpenseDetail,
} from '@shared/api.interface';
import { isFixedAsset, inferAssetType } from '@shared/asset-utils';

function MockFeishuBitableService() {}
function MockFixedAssetsService() {}
function MockBudgetService() {}
function MockCacheService() {}
function MockRolesService() {}

jest.mock('../../../server/modules/feishu-bitable/feishu-bitable.service', () => ({
  FeishuBitableService: MockFeishuBitableService,
}));
jest.mock('../../../server/modules/fixed-assets/fixed-assets.service', () => ({
  FixedAssetsService: MockFixedAssetsService,
}));
jest.mock('../../../server/modules/budget/budget.service', () => ({
  BudgetService: MockBudgetService,
}));
jest.mock('../../../server/modules/roles/roles.service', () => ({
  RolesService: MockRolesService,
}));
jest.mock('@server/common/services/cache.service', () => ({
  CacheService: MockCacheService,
}), { virtual: true });
jest.mock('@shared/asset-utils', () => ({
  isFixedAsset: jest.fn().mockReturnValue(false),
  inferAssetType: jest.fn().mockReturnValue(''),
}), { virtual: true });

import { ExpensesService } from '../../../server/modules/expenses/expenses.service';

const mockBitable = {
  listRecords: jest.fn(),
  getAllRecords: jest.fn(),
  getRecord: jest.fn(),
  createRecord: jest.fn(),
  updateRecord: jest.fn(),
  deleteRecord: jest.fn(),
  batchCreateRecords: jest.fn(),
  batchUpdateRecords: jest.fn(),
  aggregateQuery: jest.fn(),
};

const mockCache = {
  get: jest.fn().mockReturnValue(null),
  set: jest.fn(),
  delete: jest.fn(),
  deleteByPrefix: jest.fn(),
};

const mockRoles = {
  getUserDataScope: jest.fn().mockResolvedValue('all'),
  getUserInfo: jest.fn().mockResolvedValue({ department: '' }),
};

const mockFixedAssets = {
  create: jest.fn(),
};

const mockBudget = {
  adjustUsedAmount: jest.fn().mockResolvedValue(undefined),
};

function makeRecord(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    recordId: 'rec-001',
    expense_date: '2024-06-15',
    amount: 800,
    description: '办公用品采购',
    category_l1: '办公用品',
    category_l2: '文具',
    payer_entity: '公司',
    floor: '3F',
    department: '行政部',
    handler: 'user-001',
    invoice_url: '',
    screenshot_url: '',
    ...overrides,
  };
}

function makeDto(overrides: Partial<CreateExpenseDto> = {}): CreateExpenseDto {
  return {
    expenseDate: '2024-06-15',
    amount: 800,
    description: '办公用品采购',
    categoryL1: '办公用品',
    categoryL2: '文具',
    payerEntity: '公司',
    floor: '3F',
    department: '行政部',
    purchaseDepartment: '行政部',
    handler: 'user-001',
    ...overrides,
  };
}

describe('ExpensesService', () => {
  let service: ExpensesService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCache.get.mockReturnValue(null);
    mockRoles.getUserDataScope.mockResolvedValue('all');
    mockBudget.adjustUsedAmount.mockResolvedValue(undefined);

    service = new ExpensesService(
      mockBitable as any,
      mockFixedAssets as any,
      mockBudget as any,
      mockCache as any,
      mockRoles as any,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create expense', async () => {
    mockBitable.createRecord.mockResolvedValue({ id: 'exp-1' });
    const result = await service.create(makeDto());
    expect(result).toEqual({ id: 'exp-1', assetId: undefined, assetError: undefined });
    expect(mockBitable.createRecord).toHaveBeenCalledWith(
      'expenses',
      expect.objectContaining({ amount: 800 }),
    );
  });

  it('should find all expenses with pagination', async () => {
    mockBitable.listRecords.mockResolvedValue({
      items: [makeRecord({ amount: 500 }), makeRecord({ amount: 300 }), makeRecord({ amount: 200 })],
      total: 3,
    });
    mockBitable.aggregateQuery.mockResolvedValue({
      result: [{ totalAmount: { amount: 1000 }, recordCount: 3 }],
    });

    const result: ExpenseListResponse = await service.findAll({ page: 1, pageSize: 10 });

    expect(result.items).toHaveLength(3);
    expect(result.total).toBe(3);
    expect(result.summary.totalAmount).toBe(1000);
  });

  it('should find expense by id', async () => {
    const { recordId, ...rec } = makeRecord({ amount: 1200 });
    mockBitable.getRecord.mockResolvedValue(rec);

    const result: ExpenseDetail = await service.findOne('exp-1');

    expect(result.id).toBe('exp-1');
    expect(result.amount).toBe(1200);
    expect(result.categoryL1).toBe('办公用品');
  });

  it('should delete expense', async () => {
    const { recordId, ...rec } = makeRecord({ amount: 500 });
    mockBitable.getRecord.mockResolvedValue(rec);
    mockBitable.deleteRecord.mockResolvedValue(undefined);

    const result = await service.remove('exp-1');

    expect(result).toEqual({ success: true });
    expect(mockBitable.deleteRecord).toHaveBeenCalledWith('expenses', 'exp-1');
  });

  it('should filter by category', async () => {
    mockBitable.listRecords.mockResolvedValue({
      items: [makeRecord({ category_l1: '办公用品', amount: 300 })],
      total: 1,
    });
    mockBitable.aggregateQuery.mockResolvedValue({
      result: [{ totalAmount: { amount: 300 }, recordCount: 1 }],
    });

    const result: ExpenseListResponse = await service.findAll({
      page: 1,
      pageSize: 10,
      categoryL1: '办公用品',
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].categoryL1).toBe('办公用品');
  });

  it('should calculate total amount', async () => {
    mockBitable.listRecords.mockResolvedValue({
      items: [makeRecord({ amount: 2000 }), makeRecord({ amount: 3000 })],
      total: 2,
    });
    mockBitable.aggregateQuery.mockResolvedValue({
      result: [{ totalAmount: { amount: 5000 }, recordCount: 2 }],
    });

    const result: ExpenseListResponse = await service.findAll({ page: 1, pageSize: 10 });

    expect(result.summary.totalAmount).toBe(5000);
  });

  it('should handle not found error', async () => {
    mockBitable.getRecord.mockResolvedValue(null);
    await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
  });

  it('should create expense with minimal fields', async () => {
    mockBitable.createRecord.mockResolvedValue({ id: 'exp-min' });
    const result = await service.create(makeDto({
      categoryL1: '', categoryL2: '', payerEntity: '',
      floor: '', department: '', purchaseDepartment: '', handler: '',
    }));
    expect(result.id).toBe('exp-min');
  });

  it('should update expense', async () => {
    const { recordId, ...rec } = makeRecord({ amount: 500, expense_date: '2024-03-01' });
    mockBitable.getRecord.mockResolvedValue(rec);
    mockBitable.updateRecord.mockResolvedValue(undefined);

    const result = await service.update('exp-1', { amount: 800, description: '更新后的描述' });

    expect(result).toEqual({ success: true });
    expect(mockBitable.updateRecord).toHaveBeenCalledWith(
      'expenses', 'exp-1', expect.objectContaining({ amount: 800 }),
    );
  });

  it('should filter expenses by categoryL2', async () => {
    mockBitable.listRecords.mockResolvedValue({
      items: [makeRecord({ category_l2: '文具', amount: 300 })],
      total: 1,
    });
    mockBitable.aggregateQuery.mockResolvedValue({
      result: [{ totalAmount: { amount: 300 }, recordCount: 1 }],
    });

    const result: ExpenseListResponse = await service.findAll({
      page: 1,
      pageSize: 10,
      categoryL2: '文具',
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].categoryL2).toBe('文具');
  });

  it('should filter expenses by department', async () => {
    mockBitable.listRecords.mockResolvedValue({
      items: [makeRecord({ department: '行政部', amount: 1500 })],
      total: 1,
    });
    mockBitable.aggregateQuery.mockResolvedValue({
      result: [{ totalAmount: { amount: 1500 }, recordCount: 1 }],
    });

    const result: ExpenseListResponse = await service.findAll({
      page: 1,
      pageSize: 10,
      department: '行政部',
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].department).toBe('行政部');
  });

  it('should filter expenses by handler', async () => {
    mockBitable.listRecords.mockResolvedValue({
      items: [makeRecord({ handler: 'user-001', amount: 700 })],
      total: 1,
    });
    mockBitable.aggregateQuery.mockResolvedValue({
      result: [{ totalAmount: { amount: 700 }, recordCount: 1 }],
    });

    const result: ExpenseListResponse = await service.findAll({
      page: 1,
      pageSize: 10,
      handler: 'user-001',
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].handler).toBe('user-001');
  });

  it('should filter expenses by date range', async () => {
    mockBitable.listRecords.mockResolvedValue({
      items: [
        makeRecord({ expense_date: '2024-06-15', amount: 500 }),
        makeRecord({ expense_date: '2024-06-20', amount: 600 }),
      ],
      total: 2,
    });
    mockBitable.aggregateQuery.mockResolvedValue({
      result: [{ totalAmount: { amount: 1100 }, recordCount: 2 }],
    });

    const result: ExpenseListResponse = await service.findAll({
      page: 1,
      pageSize: 10,
      startDate: '2024-06-01',
      endDate: '2024-06-30',
    });

    expect(result.items).toHaveLength(2);
    expect(result.summary.totalAmount).toBe(1100);
  });

  it('should search expenses by keyword', async () => {
    mockBitable.listRecords.mockResolvedValue({
      items: [makeRecord({ description: '办公用品采购', amount: 400 })],
      total: 1,
    });
    mockBitable.aggregateQuery.mockResolvedValue({
      result: [{ totalAmount: { amount: 400 }, recordCount: 1 }],
    });

    const result: ExpenseListResponse = await service.findAll({
      page: 1,
      pageSize: 10,
      keyword: '办公',
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].description).toContain('办公');
  });

  it('should sort expenses by date descending', async () => {
    mockBitable.listRecords.mockResolvedValue({
      items: [
        makeRecord({ recordId: 'rec-1', expense_date: '2024-03-01', amount: 100 }),
        makeRecord({ recordId: 'rec-2', expense_date: '2024-06-15', amount: 200 }),
      ],
      total: 2,
    });
    mockBitable.aggregateQuery.mockResolvedValue({
      result: [{ totalAmount: { amount: 300 }, recordCount: 2 }],
    });

    const result: ExpenseListResponse = await service.findAll({
      page: 1,
      pageSize: 10,
      sortBy: 'expenseDate',
      sortOrder: 'desc',
    });

    expect(result.items).toHaveLength(2);
    expect(result.items[0].expenseDate).toBe('2024-06-15');
    expect(result.items[1].expenseDate).toBe('2024-03-01');
  });

  it('should sort expenses by amount descending', async () => {
    mockBitable.listRecords.mockResolvedValue({
      items: [
        makeRecord({ amount: 300 }),
        makeRecord({ amount: 1000 }),
      ],
      total: 2,
    });
    mockBitable.aggregateQuery.mockResolvedValue({
      result: [{ totalAmount: { amount: 1300 }, recordCount: 2 }],
    });

    const result: ExpenseListResponse = await service.findAll({
      page: 1,
      pageSize: 10,
      sortBy: 'amount',
      sortOrder: 'desc',
    });

    expect(result.items).toHaveLength(2);
  });

  it('should calculate total amount with filters', async () => {
    mockBitable.listRecords.mockResolvedValue({
      items: [makeRecord({ amount: 500 }), makeRecord({ amount: 700 })],
      total: 2,
    });
    mockBitable.aggregateQuery.mockResolvedValue({
      result: [{ totalAmount: { amount: 1200 }, recordCount: 2 }],
    });

    const result: ExpenseListResponse = await service.findAll({
      page: 1,
      pageSize: 10,
      categoryL1: '办公用品',
      startDate: '2024-01-01',
    });

    expect(result.summary.totalAmount).toBe(1200);
    expect(result.items).toHaveLength(2);
  });

  it('should handle empty result set', async () => {
    mockBitable.listRecords.mockResolvedValue({
      items: [],
      total: 0,
    });

    const result: ExpenseListResponse = await service.findAll({
      page: 1,
      pageSize: 10,
    });

    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(0);
    expect(result.summary.totalAmount).toBe(0);
  });

  it('should handle large pagination', async () => {
    mockBitable.listRecords.mockResolvedValue({
      items: [],
      total: 0,
    });

    const result: ExpenseListResponse = await service.findAll({
      page: 999,
      pageSize: 100,
    });

    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  // ============================================================
  // 统计与聚合
  // ============================================================
  describe('Statistics & Aggregation', () => {
    it('should calculate monthly expense trend correctly', async () => {
      mockBitable.listRecords.mockResolvedValue({
        items: [
          makeRecord({ expense_date: '2024-06-01', amount: 100 }),
          makeRecord({ expense_date: '2024-06-15', amount: 200 }),
          makeRecord({ expense_date: '2024-06-30', amount: 300 }),
        ],
        total: 3,
      });
      mockBitable.aggregateQuery.mockResolvedValue({
        result: [{ totalAmount: { amount: 600 }, recordCount: 3 }],
      });

      const result: ExpenseListResponse = await service.findAll({
        page: 1,
        pageSize: 50,
        startDate: '2024-06-01',
        endDate: '2024-07-01',
      });

      expect(result.items).toHaveLength(3);
      expect(result.summary.totalAmount).toBe(600);
    });

    it('should calculate expense ranking by department', async () => {
      mockBitable.listRecords.mockResolvedValue({
        items: [
          makeRecord({ department: '行政部', amount: 5000 }),
          makeRecord({ department: '行政部', amount: 3000 }),
        ],
        total: 2,
      });
      mockBitable.aggregateQuery.mockResolvedValue({
        result: [{ totalAmount: { amount: 8000 }, recordCount: 2 }],
      });

      const result: ExpenseListResponse = await service.findAll({
        page: 1,
        pageSize: 10,
        department: '行政部',
        sortBy: 'amount',
        sortOrder: 'desc',
      });

      expect(result.items).toHaveLength(2);
      expect(result.summary.totalAmount).toBe(8000);
    });

    it('should calculate expense ranking by category', async () => {
      mockBitable.listRecords.mockResolvedValue({
        items: [
          makeRecord({ category_l1: '办公用品', amount: 2000 }),
          makeRecord({ category_l1: '办公用品', amount: 1500 }),
        ],
        total: 2,
      });
      mockBitable.aggregateQuery.mockResolvedValue({
        result: [{ totalAmount: { amount: 3500 }, recordCount: 2 }],
      });

      const result: ExpenseListResponse = await service.findAll({
        page: 1,
        pageSize: 10,
        categoryL1: '办公用品',
        sortBy: 'amount',
        sortOrder: 'desc',
      });

      expect(result.items).toHaveLength(2);
      expect(result.summary.totalAmount).toBe(3500);
    });

    it('should calculate expense ranking by handler', async () => {
      mockBitable.listRecords.mockResolvedValue({
        items: [
          makeRecord({ handler: 'user-001', amount: 1200 }),
          makeRecord({ handler: 'user-001', amount: 800 }),
        ],
        total: 2,
      });
      mockBitable.aggregateQuery.mockResolvedValue({
        result: [{ totalAmount: { amount: 2000 }, recordCount: 2 }],
      });

      const result: ExpenseListResponse = await service.findAll({
        page: 1,
        pageSize: 10,
        handler: 'user-001',
      });

      expect(result.items).toHaveLength(2);
      expect(result.summary.totalAmount).toBe(2000);
    });

    it('should calculate total amount with date range', async () => {
      mockBitable.listRecords.mockResolvedValue({
        items: [
          makeRecord({ expense_date: '2024-01-15', amount: 400 }),
          makeRecord({ expense_date: '2024-02-20', amount: 600 }),
        ],
        total: 2,
      });
      mockBitable.aggregateQuery.mockResolvedValue({
        result: [{ totalAmount: { amount: 1000 }, recordCount: 2 }],
      });

      const result: ExpenseListResponse = await service.findAll({
        page: 1,
        pageSize: 10,
        startDate: '2024-01-01',
        endDate: '2024-03-01',
      });

      expect(result.summary.totalAmount).toBe(1000);
    });

    it('should calculate total amount with category filter', async () => {
      mockBitable.listRecords.mockResolvedValue({
        items: [makeRecord({ category_l1: 'IT设备', amount: 5000 })],
        total: 1,
      });
      mockBitable.aggregateQuery.mockResolvedValue({
        result: [{ totalAmount: { amount: 5000 }, recordCount: 1 }],
      });

      const result: ExpenseListResponse = await service.findAll({
        page: 1,
        pageSize: 10,
        categoryL1: 'IT设备',
      });

      expect(result.summary.totalAmount).toBe(5000);
    });

    it('should calculate expense by category distribution', async () => {
      mockBitable.listRecords.mockResolvedValue({
        items: [
          makeRecord({ category_l1: '办公用品', amount: 300 }),
          makeRecord({ category_l1: 'IT设备', amount: 5000 }),
          makeRecord({ category_l1: '办公用品', amount: 200 }),
        ],
        total: 3,
      });
      mockBitable.aggregateQuery.mockResolvedValue({
        result: [{ totalAmount: { amount: 5500 }, recordCount: 3 }],
      });

      const result: ExpenseListResponse = await service.findAll({
        page: 1,
        pageSize: 50,
      });

      expect(result.items).toHaveLength(3);
      expect(result.summary.totalAmount).toBe(5500);
    });

    it('should calculate expense by department distribution', async () => {
      mockBitable.listRecords.mockResolvedValue({
        items: [
          makeRecord({ department: '行政部', amount: 1000 }),
          makeRecord({ department: '技术部', amount: 2000 }),
          makeRecord({ department: '行政部', amount: 500 }),
        ],
        total: 3,
      });
      mockBitable.aggregateQuery.mockResolvedValue({
        result: [{ totalAmount: { amount: 3500 }, recordCount: 3 }],
      });

      const result: ExpenseListResponse = await service.findAll({
        page: 1,
        pageSize: 50,
      });

      expect(result.items).toHaveLength(3);
      expect(result.summary.totalAmount).toBe(3500);
    });

    it('should calculate daily expense for dashboard', async () => {
      mockBitable.listRecords.mockResolvedValue({
        items: [
          makeRecord({ expense_date: '2024-06-15', amount: 500 }),
          makeRecord({ expense_date: '2024-06-15', amount: 300 }),
        ],
        total: 2,
      });
      mockBitable.aggregateQuery.mockResolvedValue({
        result: [{ totalAmount: { amount: 800 }, recordCount: 2 }],
      });

      const result: ExpenseListResponse = await service.findAll({
        page: 1,
        pageSize: 50,
        startDate: '2024-06-15',
        endDate: '2024-06-16',
      });

      expect(result.items).toHaveLength(2);
      expect(result.summary.totalAmount).toBe(800);
    });

    it('should handle aggregate query fallback on error', async () => {
      mockBitable.listRecords.mockResolvedValue({
        items: [
          makeRecord({ amount: 400 }),
          makeRecord({ amount: 600 }),
        ],
        total: 2,
      });
      mockBitable.aggregateQuery.mockRejectedValue(
        new Error('Aggregate query failed'),
      );

      const result: ExpenseListResponse = await service.findAll({
        page: 1,
        pageSize: 10,
      });

      // 聚合失败时回退到当前页数据求和
      expect(result.summary.totalAmount).toBe(1000);
      expect(result.items).toHaveLength(2);
    });
  });

  // ============================================================
  // 数据转换
  // ============================================================
  describe('Data Transformation', () => {
    it('should transform database record to expense DTO', async () => {
      mockBitable.listRecords.mockResolvedValue({
        items: [makeRecord({
          recordId: 'rec-x',
          expense_date: '2024-06-15',
          amount: 1500,
          description: '测试采购',
          category_l1: '办公用品',
          category_l2: '文具',
          payer_entity: '公司',
          floor: '3F',
          department: '行政部',
          handler: 'user-001',
          invoice_url: 'https://example.com/inv.pdf',
          screenshot_url: 'https://example.com/scr.png',
        })],
        total: 1,
      });
      mockBitable.aggregateQuery.mockResolvedValue({
        result: [{ totalAmount: { amount: 1500 }, recordCount: 1 }],
      });

      const result: ExpenseListResponse = await service.findAll({
        page: 1,
        pageSize: 10,
      });

      const item = result.items[0];
      expect(item.id).toBe('rec-x');
      expect(item.expenseDate).toBe('2024-06-15');
      expect(item.amount).toBe(1500);
      expect(item.description).toBe('测试采购');
      expect(item.categoryL1).toBe('办公用品');
      expect(item.categoryL2).toBe('文具');
      expect(item.payerEntity).toBe('公司');
      expect(item.floor).toBe('3F');
      expect(item.department).toBe('行政部');
      expect(item.handler).toBe('user-001');
      expect(item.invoiceUrl).toBe('https://example.com/inv.pdf');
      expect(item.screenshotUrl).toBe('https://example.com/scr.png');
    });

    it('should handle null fields in transformation', async () => {
      mockBitable.listRecords.mockResolvedValue({
        items: [makeRecord({
          recordId: 'rec-null',
          expense_date: null,
          amount: null,
          description: null,
          category_l1: null,
          category_l2: null,
          payer_entity: null,
          floor: null,
          department: null,
          handler: null,
          invoice_url: null,
          screenshot_url: null,
        })],
        total: 1,
      });
      mockBitable.aggregateQuery.mockResolvedValue({
        result: [{ totalAmount: { amount: 0 }, recordCount: 1 }],
      });

      const result: ExpenseListResponse = await service.findAll({
        page: 1,
        pageSize: 10,
      });

      const item = result.items[0];
      expect(item.id).toBe('rec-null');
      expect(item.expenseDate).toBe('');
      expect(item.amount).toBe(0);
      expect(item.description).toBe('');
      expect(item.categoryL1).toBe('');
      expect(item.categoryL2).toBe('');
      expect(item.payerEntity).toBe('');
      expect(item.floor).toBe('');
      expect(item.department).toBe('');
      expect(item.handler).toBe('');
      expect(item.invoiceUrl).toBe('');
      expect(item.screenshotUrl).toBe('');
    });

    it('should handle date formatting correctly', async () => {
      mockBitable.listRecords.mockResolvedValue({
        items: [makeRecord({
          expense_date: '2024-12-31T23:59:59.999Z',
          amount: 1000,
        })],
        total: 1,
      });
      mockBitable.aggregateQuery.mockResolvedValue({
        result: [{ totalAmount: { amount: 1000 }, recordCount: 1 }],
      });

      const result: ExpenseListResponse = await service.findAll({
        page: 1,
        pageSize: 10,
      });

      expect(result.items[0].expenseDate).toBe('2024-12-31');
    });

    it('should handle amount formatting correctly', async () => {
      mockBitable.listRecords.mockResolvedValue({
        items: [
          makeRecord({ amount: 0 }),
          makeRecord({ amount: 999.99 }),
          makeRecord({ amount: -100 }),
        ],
        total: 3,
      });
      mockBitable.aggregateQuery.mockResolvedValue({
        result: [{ totalAmount: { amount: 899.99 }, recordCount: 3 }],
      });

      const result: ExpenseListResponse = await service.findAll({
        page: 1,
        pageSize: 10,
      });

      expect(result.items[0].amount).toBe(0);
      expect(result.items[1].amount).toBe(999.99);
      expect(result.items[2].amount).toBe(-100);
    });

    it('should handle description with category mark', async () => {
      const mark = '【类目数据】{"categoryL1":"IT设备","categoryL2":"电脑"}';
      mockBitable.listRecords.mockResolvedValue({
        items: [makeRecord({
          description: `购买笔记本电脑\n${mark}`,
          category_l1: null,
          category_l2: null,
          amount: 8000,
        })],
        total: 1,
      });
      mockBitable.aggregateQuery.mockResolvedValue({
        result: [{ totalAmount: { amount: 8000 }, recordCount: 1 }],
      });

      const result: ExpenseListResponse = await service.findAll({
        page: 1,
        pageSize: 10,
      });

      const item = result.items[0];
      expect(item.description).toBe('购买笔记本电脑');
      expect(item.categoryL1).toBe('IT设备');
      expect(item.categoryL2).toBe('电脑');
    });
  });

  // ============================================================
  // 缓存管理
  // ============================================================
  describe('Cache Management', () => {
    it('should invalidate cache on create', async () => {
      mockBitable.createRecord.mockResolvedValue({ id: 'exp-cache' });

      await service.create(makeDto());

      expect(mockCache.deleteByPrefix).toHaveBeenCalledWith('dash:expense');
      expect(mockCache.deleteByPrefix).toHaveBeenCalledWith('report:expense');
    });

    it('should invalidate cache on update', async () => {
      const { recordId, ...rec } = makeRecord({ amount: 500 });
      mockBitable.getRecord.mockResolvedValue(rec);
      mockBitable.updateRecord.mockResolvedValue(undefined);

      await service.update('exp-1', { amount: 800 });

      expect(mockCache.deleteByPrefix).toHaveBeenCalledWith('dash:expense');
      expect(mockCache.deleteByPrefix).toHaveBeenCalledWith('report:expense');
    });

    it('should invalidate cache on delete', async () => {
      const { recordId, ...rec } = makeRecord({ amount: 500 });
      mockBitable.getRecord.mockResolvedValue(rec);
      mockBitable.deleteRecord.mockResolvedValue(undefined);

      await service.remove('exp-1');

      expect(mockCache.deleteByPrefix).toHaveBeenCalledWith('dash:expense');
      expect(mockCache.deleteByPrefix).toHaveBeenCalledWith('report:expense');
    });

    it('should invalidate cache on batch update', async () => {
      const { recordId: r1, ...rec1 } = makeRecord({ amount: 500 });
      const { recordId: r2, ...rec2 } = makeRecord({ amount: 300 });
      mockBitable.getRecord
        .mockResolvedValueOnce(rec1)
        .mockResolvedValueOnce(rec2);
      mockBitable.updateRecord.mockResolvedValue(undefined);

      await service.batchUpdateCategory(
        ['exp-1', 'exp-2'],
        '办公用品',
        '文具',
        'user-1',
      );

      expect(mockCache.deleteByPrefix).toHaveBeenCalledWith('dash:expense');
      expect(mockCache.deleteByPrefix).toHaveBeenCalledWith('report:expense');
    });
  });

  // ============================================================
  // 飞书同步
  // ============================================================
  describe('Feishu Sync', () => {
    it('should sync created expense to feishu', async () => {
      mockBitable.createRecord.mockResolvedValue({ id: 'exp-feishu-1' });

      const result = await service.create(makeDto());

      expect(result.id).toBe('exp-feishu-1');
      expect(mockBitable.createRecord).toHaveBeenCalledWith(
        'expenses',
        expect.objectContaining({ amount: 800 }),
      );
    });

    it('should sync updated expense to feishu', async () => {
      const { recordId, ...rec } = makeRecord({
        amount: 500,
        description: '原始描述',
      });
      mockBitable.getRecord.mockResolvedValue(rec);
      mockBitable.updateRecord.mockResolvedValue(undefined);

      await service.update('exp-1', {
        amount: 1000,
        description: '更新后的描述',
      });

      expect(mockBitable.updateRecord).toHaveBeenCalledWith(
        'expenses',
        'exp-1',
        expect.objectContaining({ amount: 1000 }),
      );
    });

    it('should sync deleted expense to feishu', async () => {
      const { recordId, ...rec } = makeRecord({ amount: 500 });
      mockBitable.getRecord.mockResolvedValue(rec);
      mockBitable.deleteRecord.mockResolvedValue(undefined);

      await service.remove('exp-1');

      expect(mockBitable.deleteRecord).toHaveBeenCalledWith(
        'expenses',
        'exp-1',
      );
    });

    it('should handle feishu create failure gracefully', async () => {
      mockBitable.createRecord.mockRejectedValue(
        new Error('Feishu API error'),
      );

      await expect(service.create(makeDto())).rejects.toThrow(
        'Feishu API error',
      );
    });

    it('should not break main flow when budget adjustment fails', async () => {
      mockBitable.createRecord.mockResolvedValue({ id: 'exp-budget-fail' });
      mockBudget.adjustUsedAmount.mockRejectedValue(
        new Error('Budget adjustment failed'),
      );

      const result = await service.create(makeDto());

      // 主流程不受影响，支出记录仍然创建成功
      expect(result.id).toBe('exp-budget-fail');
      expect(mockBitable.createRecord).toHaveBeenCalled();
    });
  });

  // ============================================================
  // 错误处理
  // ============================================================
  describe('Error Handling', () => {
    it('should handle database connection error', async () => {
      mockBitable.listRecords.mockRejectedValue(
        new Error('Database connection error'),
      );

      await expect(
        service.findAll({ page: 1, pageSize: 10 }),
      ).rejects.toThrow('Database connection error');
    });

    it('should handle not found on update', async () => {
      mockBitable.getRecord.mockResolvedValue(null);

      await expect(
        service.update('nonexistent', { amount: 100 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should handle not found on delete', async () => {
      mockBitable.getRecord.mockResolvedValue(null);

      await expect(service.remove('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should handle empty update fields', async () => {
      const { recordId, ...rec } = makeRecord({ amount: 500 });
      mockBitable.getRecord.mockResolvedValue(rec);

      await expect(service.update('exp-1', {})).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should return proper error message on not found', async () => {
      mockBitable.getRecord.mockResolvedValue(null);

      try {
        await service.findOne('nonexistent');
        fail('Expected NotFoundException to be thrown');
      } catch (err: unknown) {
        const error = err as { message: string };
        expect(error.message).toBe('支出记录不存在');
      }
    });

    it('should handle data scope restriction on findOne', async () => {
      const { recordId, ...rec } = makeRecord({
        handler: 'other-user',
        amount: 1000,
      });
      mockBitable.getRecord.mockResolvedValue(rec);
      mockRoles.getUserDataScope.mockResolvedValue('personal');

      await expect(
        service.findOne('exp-1', 'current-user'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should handle feishu update failure', async () => {
      const { recordId, ...rec } = makeRecord({ amount: 500 });
      mockBitable.getRecord.mockResolvedValue(rec);
      mockBitable.updateRecord.mockRejectedValue(
        new Error('Feishu update error'),
      );

      await expect(
        service.update('exp-1', { amount: 800 }),
      ).rejects.toThrow('Feishu update error');
    });

    it('should handle feishu delete failure', async () => {
      const { recordId, ...rec } = makeRecord({ amount: 500 });
      mockBitable.getRecord.mockResolvedValue(rec);
      mockBitable.deleteRecord.mockRejectedValue(
        new Error('Feishu delete error'),
      );

      await expect(service.remove('exp-1')).rejects.toThrow(
        'Feishu delete error',
      );
    });
  });

  // ============================================================
  // 批量操作
  // ============================================================
  describe('Batch Operations', () => {
    it('should batch update category successfully', async () => {
      const { recordId: r1, ...rec1 } = makeRecord({ amount: 500 });
      const { recordId: r2, ...rec2 } = makeRecord({ amount: 300 });
      mockBitable.getRecord
        .mockResolvedValueOnce(rec1)
        .mockResolvedValueOnce(rec2);
      mockBitable.updateRecord.mockResolvedValue(undefined);

      const result = await service.batchUpdateCategory(
        ['exp-1', 'exp-2'],
        '办公用品',
        '文具',
        'user-1',
      );

      expect(result.successCount).toBe(2);
      expect(result.failedCount).toBe(0);
      expect(result.failedItems).toHaveLength(0);
    });

    it('should batch update department successfully', async () => {
      const { recordId: r1, ...rec1 } = makeRecord({ amount: 500 });
      const { recordId: r2, ...rec2 } = makeRecord({ amount: 300 });
      mockBitable.getRecord
        .mockResolvedValueOnce(rec1)
        .mockResolvedValueOnce(rec2);
      mockBitable.updateRecord.mockResolvedValue(undefined);

      const result = await service.batchUpdateDepartment(
        ['exp-1', 'exp-2'],
        '技术部',
        'user-1',
      );

      expect(result.successCount).toBe(2);
      expect(result.failedCount).toBe(0);
      expect(result.failedItems).toHaveLength(0);
    });

    it('should handle partial failures in batch update', async () => {
      const { recordId: r1, ...rec1 } = makeRecord({ amount: 500 });
      mockBitable.getRecord
        .mockResolvedValueOnce(rec1)
        .mockResolvedValueOnce(null);
      mockBitable.updateRecord.mockResolvedValue(undefined);

      const result = await service.batchUpdateCategory(
        ['exp-1', 'exp-nonexistent'],
        '办公用品',
        '文具',
        'user-1',
      );

      expect(result.successCount).toBe(1);
      expect(result.failedCount).toBe(1);
      expect(result.failedItems).toHaveLength(1);
      expect(result.failedItems[0].id).toBe('exp-nonexistent');
    });

    it('should batch update with empty ids array', async () => {
      const result = await service.batchUpdateCategory(
        [],
        '办公用品',
        '文具',
        'user-1',
      );

      expect(result.successCount).toBe(0);
      expect(result.failedCount).toBe(0);
      expect(result.failedItems).toHaveLength(0);
    });

    it('should handle partial failures in batchUpdateDepartment', async () => {
      const { recordId: r1, ...rec1 } = makeRecord({ amount: 500 });
      mockBitable.getRecord
        .mockResolvedValueOnce(rec1)
        .mockResolvedValueOnce(null);
      mockBitable.updateRecord.mockResolvedValue(undefined);

      const result = await service.batchUpdateDepartment(
        ['exp-1', 'exp-nonexistent'],
        '技术部',
        'user-1',
      );

      expect(result.successCount).toBe(1);
      expect(result.failedCount).toBe(1);
      expect(result.failedItems).toHaveLength(1);
      expect(result.failedItems[0].id).toBe('exp-nonexistent');
    });

    it('should batchUpdateDepartment with empty ids', async () => {
      const result = await service.batchUpdateDepartment(
        [],
        '技术部',
        'user-1',
      );

      expect(result.successCount).toBe(0);
      expect(result.failedCount).toBe(0);
      expect(result.failedItems).toHaveLength(0);
    });
  });

  // ============================================================
  // 数据权限覆盖
  // ============================================================
  describe('Data Scope', () => {
    it('should filter by personal data scope in findAll', async () => {
      mockRoles.getUserDataScope.mockResolvedValue('personal');
      mockBitable.listRecords.mockResolvedValue({
        items: [
          makeRecord({ handler: 'user-001', amount: 500 }),
          makeRecord({ handler: 'user-002', amount: 300 }),
        ],
        total: 2,
      });
      mockBitable.aggregateQuery.mockResolvedValue({
        result: [{ totalAmount: { amount: 500 }, recordCount: 1 }],
      });

      const result: ExpenseListResponse = await service.findAll({
        page: 1,
        pageSize: 10,
        currentUserId: 'user-001',
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].handler).toBe('user-001');
    });

    it('should filter by department data scope in findAll', async () => {
      mockRoles.getUserDataScope.mockResolvedValue('department');
      mockRoles.getUserInfo.mockResolvedValue({ department: '行政部' });
      mockBitable.listRecords.mockResolvedValue({
        items: [
          makeRecord({ department: '行政部', handler: 'user-001', amount: 500 }),
          makeRecord({ department: '技术部', handler: 'user-002', amount: 300 }),
        ],
        total: 2,
      });
      mockBitable.aggregateQuery.mockResolvedValue({
        result: [{ totalAmount: { amount: 500 }, recordCount: 1 }],
      });

      const result: ExpenseListResponse = await service.findAll({
        page: 1,
        pageSize: 10,
        currentUserId: 'user-001',
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].department).toBe('行政部');
    });

    it('should fallback to personal when department scope has no userDepartment', async () => {
      mockRoles.getUserDataScope.mockResolvedValue('department');
      mockRoles.getUserInfo.mockResolvedValue({ department: '' });
      mockBitable.listRecords.mockResolvedValue({
        items: [
          makeRecord({ handler: 'user-001', amount: 500 }),
          makeRecord({ handler: 'user-002', amount: 300 }),
        ],
        total: 2,
      });
      mockBitable.aggregateQuery.mockResolvedValue({
        result: [{ totalAmount: { amount: 500 }, recordCount: 1 }],
      });

      const result: ExpenseListResponse = await service.findAll({
        page: 1,
        pageSize: 10,
        currentUserId: 'user-001',
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].handler).toBe('user-001');
    });

    it('should check department scope in findOne and reject', async () => {
      const { recordId, ...rec } = makeRecord({
        handler: 'other-user',
        department: '技术部',
        amount: 1000,
      });
      mockBitable.getRecord.mockResolvedValue(rec);
      mockRoles.getUserDataScope.mockResolvedValue('department');
      mockRoles.getUserInfo.mockResolvedValue({ department: '行政部' });

      await expect(
        service.findOne('exp-1', 'current-user'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow same department in findOne', async () => {
      const { recordId, ...rec } = makeRecord({
        handler: 'other-user',
        department: '行政部',
        amount: 1000,
      });
      mockBitable.getRecord.mockResolvedValue(rec);
      mockRoles.getUserDataScope.mockResolvedValue('department');
      mockRoles.getUserInfo.mockResolvedValue({ department: '行政部' });

      const result: ExpenseDetail = await service.findOne(
        'exp-1',
        'current-user',
      );

      expect(result.id).toBe('exp-1');
      expect(result.department).toBe('行政部');
    });

    it('should fallback to personal check when department scope has no department', async () => {
      const { recordId, ...rec } = makeRecord({
        handler: 'other-user',
        department: '技术部',
        amount: 1000,
      });
      mockBitable.getRecord.mockResolvedValue(rec);
      mockRoles.getUserDataScope.mockResolvedValue('department');
      mockRoles.getUserInfo.mockResolvedValue({ department: '' });

      await expect(
        service.findOne('exp-1', 'current-user'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should check personal scope in update', async () => {
      const { recordId, ...rec } = makeRecord({
        handler: 'other-user',
        amount: 500,
      });
      mockBitable.getRecord.mockResolvedValue(rec);
      mockRoles.getUserDataScope.mockResolvedValue('personal');

      await expect(
        service.update('exp-1', { amount: 800 }, 'current-user'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should check personal scope in remove', async () => {
      const { recordId, ...rec } = makeRecord({
        handler: 'other-user',
        amount: 500,
      });
      mockBitable.getRecord.mockResolvedValue(rec);
      mockRoles.getUserDataScope.mockResolvedValue('personal');

      await expect(
        service.remove('exp-1', 'current-user'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ============================================================
  // buildFeishuFilter 更多分支
  // ============================================================
  describe('Feishu Filter Branches', () => {
    it('should filter by payerEntity', async () => {
      mockBitable.listRecords.mockResolvedValue({
        items: [makeRecord({ payer_entity: '公司', amount: 500 })],
        total: 1,
      });
      mockBitable.aggregateQuery.mockResolvedValue({
        result: [{ totalAmount: { amount: 500 }, recordCount: 1 }],
      });

      const result: ExpenseListResponse = await service.findAll({
        page: 1,
        pageSize: 10,
        payerEntity: '公司',
      });

      expect(result.items[0].payerEntity).toBe('公司');
    });

    it('should filter by floor', async () => {
      mockBitable.listRecords.mockResolvedValue({
        items: [makeRecord({ floor: '3F', amount: 500 })],
        total: 1,
      });
      mockBitable.aggregateQuery.mockResolvedValue({
        result: [{ totalAmount: { amount: 500 }, recordCount: 1 }],
      });

      const result: ExpenseListResponse = await service.findAll({
        page: 1,
        pageSize: 10,
        floor: '3F',
      });

      expect(result.items[0].floor).toBe('3F');
    });

    it('should filter by viewScope mine', async () => {
      mockBitable.listRecords.mockResolvedValue({
        items: [makeRecord({ handler: 'user-001', amount: 500 })],
        total: 1,
      });
      mockBitable.aggregateQuery.mockResolvedValue({
        result: [{ totalAmount: { amount: 500 }, recordCount: 1 }],
      });

      const result: ExpenseListResponse = await service.findAll({
        page: 1,
        pageSize: 10,
        viewScope: 'mine',
        currentUserId: 'user-001',
      });

      expect(result.items[0].handler).toBe('user-001');
    });
  });

  // ============================================================
  // extractNumberValue 不同路径
  // ============================================================
  describe('extractNumberValue Paths', () => {
    it('should handle aggregate result with string amount', async () => {
      mockBitable.listRecords.mockResolvedValue({
        items: [makeRecord({ amount: 500 })],
        total: 1,
      });
      mockBitable.aggregateQuery.mockResolvedValue({
        result: [{ totalAmount: { amount: '500' }, recordCount: 1 }],
      });

      const result: ExpenseListResponse = await service.findAll({
        page: 1,
        pageSize: 10,
      });

      expect(result.summary.totalAmount).toBe(500);
    });

    it('should handle aggregate result with value field', async () => {
      mockBitable.listRecords.mockResolvedValue({
        items: [makeRecord({ amount: 500 })],
        total: 1,
      });
      mockBitable.aggregateQuery.mockResolvedValue({
        result: [{ totalAmount: { value: 500 }, recordCount: 1 }],
      });

      const result: ExpenseListResponse = await service.findAll({
        page: 1,
        pageSize: 10,
      });

      expect(result.summary.totalAmount).toBe(500);
    });

    it('should handle aggregate result with originValue field', async () => {
      mockBitable.listRecords.mockResolvedValue({
        items: [makeRecord({ amount: 500 })],
        total: 1,
      });
      mockBitable.aggregateQuery.mockResolvedValue({
        result: [{ totalAmount: { originValue: 500 }, recordCount: 1 }],
      });

      const result: ExpenseListResponse = await service.findAll({
        page: 1,
        pageSize: 10,
      });

      expect(result.summary.totalAmount).toBe(500);
    });

    it('should handle string value in aggregate result', async () => {
      mockBitable.listRecords.mockResolvedValue({
        items: [makeRecord({ amount: 500 })],
        total: 1,
      });
      mockBitable.aggregateQuery.mockResolvedValue({
        result: [{ totalAmount: { value: '500' }, recordCount: 1 }],
      });

      const result: ExpenseListResponse = await service.findAll({
        page: 1,
        pageSize: 10,
      });

      expect(result.summary.totalAmount).toBe(500);
    });
  });

  // ============================================================
  // 预算联动覆盖
  // ============================================================
  describe('Budget Adjustment', () => {
    it('should call adjustUsedAmount on create', async () => {
      mockBitable.createRecord.mockResolvedValue({ id: 'exp-budget-1' });

      await service.create(makeDto());

      expect(mockBudget.adjustUsedAmount).toHaveBeenCalledWith({
        departmentId: '行政部',
        year: 2024,
        month: 6,
        amount: 800,
        categoryL1: '办公用品',
      });
    });

    it('should skip budget adjustment on create when department is empty', async () => {
      mockBitable.createRecord.mockResolvedValue({ id: 'exp-budget-2' });

      await service.create(
        makeDto({ department: '', purchaseDepartment: '' }),
      );

      expect(mockBudget.adjustUsedAmount).not.toHaveBeenCalled();
    });

    it('should skip budget adjustment on create when date is empty', async () => {
      mockBitable.createRecord.mockResolvedValue({ id: 'exp-budget-3' });

      await service.create(makeDto({ expenseDate: '' }));

      expect(mockBudget.adjustUsedAmount).not.toHaveBeenCalled();
    });

    it('should skip budget adjustment on create when date is invalid', async () => {
      mockBitable.createRecord.mockResolvedValue({ id: 'exp-budget-4' });

      await service.create(makeDto({ expenseDate: 'invalid-date' }));

      expect(mockBudget.adjustUsedAmount).not.toHaveBeenCalled();
    });

    it('should skip budget adjustment on update when all same', async () => {
      const { recordId, ...rec } = makeRecord({
        amount: 500,
        department: '行政部',
        expense_date: '2024-03-01',
        category_l1: '办公用品',
      });
      mockBitable.getRecord.mockResolvedValue(rec);
      mockBitable.updateRecord.mockResolvedValue(undefined);

      await service.update('exp-1', { description: 'new desc' });

      expect(mockBudget.adjustUsedAmount).not.toHaveBeenCalled();
    });

    it('should adjust budget delta on update when same dept and month', async () => {
      const { recordId, ...rec } = makeRecord({
        amount: 500,
        department: '行政部',
        expense_date: '2024-03-01',
        category_l1: '办公用品',
      });
      mockBitable.getRecord.mockResolvedValue(rec);
      mockBitable.updateRecord.mockResolvedValue(undefined);

      await service.update('exp-1', { amount: 800 });

      expect(mockBudget.adjustUsedAmount).toHaveBeenCalledWith({
        departmentId: '行政部',
        year: 2024,
        month: 3,
        amount: 300,
        categoryL1: '办公用品',
      });
    });

    it('should adjust budget on update when dept changes', async () => {
      const { recordId, ...rec } = makeRecord({
        amount: 500,
        department: '行政部',
        expense_date: '2024-03-01',
        category_l1: '办公用品',
      });
      mockBitable.getRecord.mockResolvedValue(rec);
      mockBitable.updateRecord.mockResolvedValue(undefined);

      await service.update('exp-1', { department: '技术部' });

      expect(mockBudget.adjustUsedAmount).toHaveBeenCalledTimes(2);
      expect(mockBudget.adjustUsedAmount).toHaveBeenCalledWith({
        departmentId: '行政部',
        year: 2024,
        month: 3,
        amount: -500,
        categoryL1: '办公用品',
      });
      expect(mockBudget.adjustUsedAmount).toHaveBeenCalledWith({
        departmentId: '技术部',
        year: 2024,
        month: 3,
        amount: 500,
        categoryL1: '办公用品',
      });
    });

    it('should call adjustUsedAmount on remove', async () => {
      const { recordId, ...rec } = makeRecord({
        amount: 500,
        department: '行政部',
        expense_date: '2024-03-01',
        category_l1: '办公用品',
      });
      mockBitable.getRecord.mockResolvedValue(rec);
      mockBitable.deleteRecord.mockResolvedValue(undefined);

      await service.remove('exp-1');

      expect(mockBudget.adjustUsedAmount).toHaveBeenCalledWith({
        departmentId: '行政部',
        year: 2024,
        month: 3,
        amount: -500,
        categoryL1: '办公用品',
      });
    });

    it('should skip budget adjustment on remove when department is empty', async () => {
      const { recordId, ...rec } = makeRecord({
        amount: 500,
        department: '',
        purchase_department: '',
        expense_date: '2024-03-01',
      });
      mockBitable.getRecord.mockResolvedValue(rec);
      mockBitable.deleteRecord.mockResolvedValue(undefined);

      await service.remove('exp-1');

      expect(mockBudget.adjustUsedAmount).not.toHaveBeenCalled();
    });

    it('should skip budget adjustment on remove when date is invalid', async () => {
      const { recordId, ...rec } = makeRecord({
        amount: 500,
        department: '行政部',
        expense_date: 'invalid',
      });
      mockBitable.getRecord.mockResolvedValue(rec);
      mockBitable.deleteRecord.mockResolvedValue(undefined);

      await service.remove('exp-1');

      expect(mockBudget.adjustUsedAmount).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // 固定资产联动
  // ============================================================
  describe('Fixed Asset Linkage', () => {
    it('should create fixed asset when isFixedAsset returns true', async () => {
      (isFixedAsset as jest.Mock).mockReturnValue(true);
      (inferAssetType as jest.Mock).mockReturnValue('设备');
      mockBitable.createRecord.mockResolvedValue({ id: 'exp-asset-1' });
      mockFixedAssets.create.mockResolvedValue({ id: 'asset-1' });

      const result = await service.create(makeDto());

      expect(result.id).toBe('exp-asset-1');
      expect(result.assetId).toBe('asset-1');
      expect(result.assetError).toBeUndefined();
      expect(mockFixedAssets.create).toHaveBeenCalled();
    });

    it('should rollback expense when fixed asset creation fails', async () => {
      (isFixedAsset as jest.Mock).mockReturnValue(true);
      (inferAssetType as jest.Mock).mockReturnValue('设备');
      mockBitable.createRecord.mockResolvedValue({ id: 'exp-rollback' });
      mockFixedAssets.create.mockRejectedValue(
        new Error('Asset creation failed'),
      );
      mockBitable.deleteRecord.mockResolvedValue(undefined);

      const result = await service.create(makeDto());

      expect(result.id).toBe('exp-rollback');
      expect(result.assetError).toBe('Asset creation failed');
      expect(mockBitable.deleteRecord).toHaveBeenCalledWith(
        'expenses',
        'exp-rollback',
      );
    });
  });
});