import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

function MockFeishuBitableService() {}
function MockCacheService() {}
function MockRolesService() {}

jest.mock('../../../server/modules/feishu-bitable/feishu-bitable.service', () => ({
  FeishuBitableService: MockFeishuBitableService,
}));
jest.mock('../../../server/modules/roles/roles.service', () => ({
  RolesService: MockRolesService,
}));
jest.mock('@server/common/services/cache.service', () => ({
  CacheService: MockCacheService,
}), { virtual: true });

import { InventoryTasksService } from '../../../server/modules/inventory/inventory-tasks.service';

const mockBitable = {
  listRecords: jest.fn(),
  getAllRecords: jest.fn(),
  getRecord: jest.fn(),
  createRecord: jest.fn(),
  updateRecord: jest.fn(),
  deleteRecord: jest.fn(),
  batchCreateRecords: jest.fn(),
  batchUpdateRecords: jest.fn(),
  batchDeleteRecords: jest.fn(),
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

function makeTask(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    recordId: 'task-1',
    id: 'task-1',
    check_no: 'CK-01-0001',
    check_year: 2026,
    check_month: '01',
    checker: 'user-001',
    scope_type: 'all',
    floor: '3F',
    department: '行政部',
    status: 'in_progress',
    remark: '[TASK]|2026Q1|all||tc:100|cc:45|ac:3|pg:45',
    ...overrides,
  };
}

function makeCheck(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    recordId: 'check-1',
    check_no: 'CK-01-0001',
    asset_id: 'asset-1',
    asset_name: '电脑',
    asset_type: '电子设备',
    book_quantity: 10,
    actual_quantity: 8,
    status: 'checked',
    remark: '',
    ...overrides,
  };
}

describe('InventoryTasksService', () => {
  let service: InventoryTasksService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCache.get.mockReturnValue(null);
    mockRoles.getUserDataScope.mockResolvedValue('all');

    service = new InventoryTasksService(
      mockBitable as any,
      mockCache as any,
      mockRoles as any,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create inventory task', async () => {
    mockBitable.getAllRecords.mockResolvedValue([]);
    mockBitable.createRecord.mockResolvedValue({ id: 'task-1' });

    const result = await service.create({
      taskName: '2026Q1盘点',
      checkYear: 2026,
      checkMonth: '01',
      scopeType: 'all',
      floor: '3F',
    });

    expect(result).toBeDefined();
    expect(result.id).toBe('task-1');
    expect(result.taskNo).toMatch(/^CK-01-/);
    expect(mockBitable.createRecord).toHaveBeenCalledWith(
      'inventory_tasks',
      expect.objectContaining({
        check_year: 2026,
        check_month: '01',
        status: 'in_progress',
      }),
    );
  });

  it('should generate next task no', async () => {
    mockBitable.getAllRecords.mockResolvedValueOnce([
      { check_no: 'CK-01-0042', check_month: '01', remark: '[TASK]|test|all' },
    ]);
    mockBitable.getAllRecords.mockResolvedValue([]);
    mockBitable.createRecord.mockResolvedValue({ id: 'task-2' });

    await service.create({
      taskName: '新盘点',
      checkYear: 2026,
      checkMonth: '01',
      scopeType: 'all',
    });

    const call = mockBitable.createRecord.mock.calls[0];
    expect(call[1].check_no).toBe('CK-01-0002');
  });

  it('should find all tasks', async () => {
    mockBitable.getAllRecords.mockResolvedValue([
      makeTask(),
      makeTask({ recordId: 'task-2', check_no: 'CK-01-0002' }),
    ]);

    const result = await service.list({ page: 1, pageSize: 10 });

    expect(result.items).toHaveLength(2);
    expect(result.total).toBe(2);
  });

  it('should find task by id', async () => {
    mockBitable.getRecord.mockResolvedValue(makeTask());
    mockBitable.getAllRecords.mockResolvedValue([]);

    const detail = await service.getDetail('task-1');

    expect(detail.id).toBe('task-1');
    expect(detail.taskNo).toBe('CK-01-0001');
    expect(detail.status).toBe('in_progress');
  });

  it('should complete task', async () => {
    mockBitable.getRecord.mockResolvedValue(makeTask({ status: 'in_progress' }));
    mockBitable.getAllRecords.mockResolvedValue([
      makeCheck({ book_quantity: 10, actual_quantity: 8 }),
      makeCheck({ recordId: 'check-2', book_quantity: 5, actual_quantity: 5 }),
    ]);
    mockBitable.updateRecord.mockResolvedValue(undefined);

    const result = await service.completeTask('task-1');

    expect(result.success).toBe(true);
    expect(result.checkedCount).toBeDefined();
    expect(result.totalCount).toBeDefined();
    expect(result.abnormalCount).toBeDefined();
  });

  it('should reset checks', async () => {
    mockBitable.getRecord.mockResolvedValue(makeTask());
    mockBitable.getAllRecords.mockResolvedValue([
      makeCheck({ status: 'checked' }),
    ]);
    mockBitable.updateRecord.mockResolvedValue(undefined);

    const result = await service.resetChecks('task-1');

    expect(result.success).toBe(true);
    expect(result.resetCount).toBe(1);
  });

  it('should delete task', async () => {
    mockBitable.getRecord.mockResolvedValue(makeTask());
    mockBitable.deleteRecord.mockResolvedValue(undefined);

    const result = await service.remove('task-1');

    expect(result).toEqual({ success: true });
    expect(mockBitable.deleteRecord).toHaveBeenCalledWith('inventory_tasks', 'task-1');
  });

  it('should calculate progress', async () => {
    mockBitable.getRecord.mockResolvedValue(
      makeTask({
        remark: '[TASK]|2026Q1|all||tc:100|cc:45|ac:3|pg:45',
      }),
    );
    mockBitable.getAllRecords.mockResolvedValue([]);

    const detail = await service.getDetail('task-1');

    expect(detail.progress).toBe(45);
    expect(detail.totalCount).toBe(100);
    expect(detail.checkedCount).toBe(45);
  });

  it('should handle task not found', async () => {
    mockBitable.getRecord.mockResolvedValue(null);

    await expect(service.getDetail('nonexistent')).rejects.toThrow(NotFoundException);
  });

  // --- 任务创建：scope 类型 ---

  it('should create task with scope type department', async () => {
    mockBitable.getAllRecords.mockResolvedValue([]);
    mockBitable.createRecord.mockResolvedValue({ id: 'task-dept' });
    mockBitable.batchCreateRecords.mockResolvedValue([]);
    mockBitable.batchUpdateRecords.mockResolvedValue(undefined);
    mockBitable.updateRecord.mockResolvedValue(undefined);

    const result = await service.create({
      taskName: '部门盘点',
      checkYear: 2026,
      checkMonth: '01',
      scopeType: 'department',
      scopeValue: ['行政部'],
    });

    expect(result).toBeDefined();
    expect(result.id).toBe('task-dept');
    expect(result.taskNo).toMatch(/^CK-01-/);
  });

  it('should create task with scope type floor', async () => {
    mockBitable.getAllRecords.mockResolvedValue([]);
    mockBitable.createRecord.mockResolvedValue({ id: 'task-floor' });
    mockBitable.batchCreateRecords.mockResolvedValue([]);
    mockBitable.batchUpdateRecords.mockResolvedValue(undefined);
    mockBitable.updateRecord.mockResolvedValue(undefined);

    const result = await service.create({
      taskName: '楼层盘点',
      checkYear: 2026,
      checkMonth: '02',
      scopeType: 'floor',
      scopeValue: ['3F'],
    });

    expect(result).toBeDefined();
    expect(result.id).toBe('task-floor');
    expect(result.taskNo).toMatch(/^CK-02-/);
  });

  it('should create task with scope type owner', async () => {
    mockBitable.getAllRecords.mockResolvedValue([]);
    mockBitable.createRecord.mockResolvedValue({ id: 'task-owner' });
    mockBitable.batchCreateRecords.mockResolvedValue([]);
    mockBitable.batchUpdateRecords.mockResolvedValue(undefined);
    mockBitable.updateRecord.mockResolvedValue(undefined);

    const result = await service.create({
      taskName: '归属人盘点',
      checkYear: 2026,
      checkMonth: '03',
      scopeType: 'owner',
      scopeValue: ['user-001'],
    });

    expect(result).toBeDefined();
    expect(result.id).toBe('task-owner');
    expect(result.taskNo).toMatch(/^CK-03-/);
  });

  it('should create task with scope type assetType', async () => {
    mockBitable.getAllRecords.mockResolvedValue([]);
    mockBitable.createRecord.mockResolvedValue({ id: 'task-type' });
    mockBitable.batchCreateRecords.mockResolvedValue([]);
    mockBitable.batchUpdateRecords.mockResolvedValue(undefined);
    mockBitable.updateRecord.mockResolvedValue(undefined);

    const result = await service.create({
      taskName: '资产类型盘点',
      checkYear: 2026,
      checkMonth: '04',
      scopeType: 'assetType',
      scopeValue: ['电子设备'],
    });

    expect(result).toBeDefined();
    expect(result.id).toBe('task-type');
    expect(result.taskNo).toMatch(/^CK-04-/);
  });

  // --- 任务创建：唯一编号 ---

  it('should generate unique task numbers', async () => {
    mockBitable.getAllRecords.mockResolvedValue([]);
    mockBitable.createRecord.mockResolvedValue({ id: 'task-a' });
    mockBitable.batchCreateRecords.mockResolvedValue([]);
    mockBitable.batchUpdateRecords.mockResolvedValue(undefined);
    mockBitable.updateRecord.mockResolvedValue(undefined);

    const result1 = await service.create({
      taskName: '任务A',
      checkYear: 2026,
      checkMonth: '05',
      scopeType: 'all',
    });

    mockBitable.getAllRecords.mockResolvedValue([
      {
        check_no: result1.taskNo,
        check_month: '05',
        remark: '[TASK]|任务A|all',
      },
    ]);
    mockBitable.createRecord.mockResolvedValue({ id: 'task-b' });

    const result2 = await service.create({
      taskName: '任务B',
      checkYear: 2026,
      checkMonth: '05',
      scopeType: 'all',
    });

    expect(result1.taskNo).not.toBe(result2.taskNo);
    expect(result1.taskNo).toMatch(/^CK-05-/);
    expect(result2.taskNo).toMatch(/^CK-05-/);
  });

  // --- 任务创建：无效输入 ---

  it('should handle invalid month (0 or 13)', async () => {
    mockBitable.getAllRecords.mockResolvedValue([]);
    mockBitable.createRecord.mockResolvedValue({ id: 'task-m0' });
    mockBitable.batchCreateRecords.mockResolvedValue([]);
    mockBitable.batchUpdateRecords.mockResolvedValue(undefined);
    mockBitable.updateRecord.mockResolvedValue(undefined);

    const result = await service.create({
      taskName: '无效月份',
      checkYear: 2026,
      checkMonth: '0',
      scopeType: 'all',
    });

    expect(result).toBeDefined();
    expect(result.id).toBe('task-m0');
  });

  it('should handle invalid year', async () => {
    mockBitable.getAllRecords.mockResolvedValue([]);
    mockBitable.createRecord.mockResolvedValue({ id: 'task-y0' });
    mockBitable.batchCreateRecords.mockResolvedValue([]);
    mockBitable.batchUpdateRecords.mockResolvedValue(undefined);
    mockBitable.updateRecord.mockResolvedValue(undefined);

    const result = await service.create({
      taskName: '无效年份',
      checkYear: 0,
      checkMonth: '01',
      scopeType: 'all',
    });

    expect(result).toBeDefined();
    expect(result.id).toBe('task-y0');
  });

  // --- 任务进度 ---

  it('should calculate progress with all checked', async () => {
    mockBitable.getRecord.mockResolvedValue(
      makeTask({
        remark: '[TASK]|2026Q1|all||tc:50|cc:50|ac:0|pg:100',
      }),
    );
    mockBitable.getAllRecords.mockResolvedValue([]);

    const detail = await service.getDetail('task-1');

    expect(detail.progress).toBe(100);
    expect(detail.totalCount).toBe(50);
    expect(detail.checkedCount).toBe(50);
  });

  it('should calculate progress with none checked', async () => {
    mockBitable.getRecord.mockResolvedValue(
      makeTask({
        remark: '[TASK]|2026Q1|all||tc:30|cc:0|ac:0|pg:0',
      }),
    );
    mockBitable.getAllRecords.mockResolvedValue([]);

    const detail = await service.getDetail('task-1');

    expect(detail.progress).toBe(0);
    expect(detail.totalCount).toBe(30);
    expect(detail.checkedCount).toBe(0);
  });

  it('should calculate progress with partial checked', async () => {
    mockBitable.getRecord.mockResolvedValue(
      makeTask({
        remark: '[TASK]|2026Q1|all||tc:80|cc:20|ac:5|pg:25',
      }),
    );
    mockBitable.getAllRecords.mockResolvedValue([]);

    const detail = await service.getDetail('task-1');

    expect(detail.progress).toBe(25);
    expect(detail.totalCount).toBe(80);
    expect(detail.checkedCount).toBe(20);
  });

  it('should update progress when check item status changes', async () => {
    mockBitable.getRecord.mockResolvedValue(
      makeTask({
        remark: '[TASK]|2026Q1|all||tc:5|cc:2|ac:1|pg:40',
      }),
    );
    mockBitable.getAllRecords.mockResolvedValue([
      makeCheck({ status: 'checked', actual_quantity: 10 }),
      makeCheck({ recordId: 'check-2', status: 'checked', actual_quantity: 8 }),
      makeCheck({ recordId: 'check-3', status: 'pending' }),
      makeCheck({ recordId: 'check-4', status: 'pending' }),
      makeCheck({ recordId: 'check-5', status: 'pending' }),
    ]);

    const detail = await service.getDetail('task-1');

    expect(detail.checks).toHaveLength(5);
    const checkedItems = detail.checks.filter(
      (c: Record<string, unknown>) => c.status === 'checked',
    );
    expect(checkedItems.length).toBe(2);
  });

  // --- 任务完成 ---

  it('should complete task with no differences', async () => {
    mockBitable.getRecord.mockResolvedValue(
      makeTask({ status: 'in_progress' }),
    );
    mockBitable.getAllRecords.mockResolvedValue([
      makeCheck({ book_quantity: 10, actual_quantity: 10 }),
      makeCheck({ recordId: 'check-2', book_quantity: 5, actual_quantity: 5 }),
    ]);
    mockBitable.updateRecord.mockResolvedValue(undefined);
    mockBitable.batchUpdateRecords.mockResolvedValue(undefined);

    const result = await service.completeTask('task-1');

    expect(result.success).toBe(true);
    expect(result.abnormalCount).toBe(0);
    expect(result.surplusTotal).toBe(0);
    expect(result.lossTotal).toBe(0);
  });

  it('should complete task with surplus (盘盈)', async () => {
    mockBitable.getRecord.mockResolvedValue(
      makeTask({ status: 'in_progress' }),
    );
    mockBitable.getAllRecords.mockResolvedValue([
      makeCheck({ book_quantity: 10, actual_quantity: 15 }),
      makeCheck({ recordId: 'check-2', book_quantity: 5, actual_quantity: 8 }),
    ]);
    mockBitable.updateRecord.mockResolvedValue(undefined);
    mockBitable.batchUpdateRecords.mockResolvedValue(undefined);

    const result = await service.completeTask('task-1');

    expect(result.success).toBe(true);
    expect(result.abnormalCount).toBe(2);
    expect(result.surplusTotal).toBe(8);
    expect(result.lossTotal).toBe(0);
  });

  it('should complete task with loss (盘亏)', async () => {
    mockBitable.getRecord.mockResolvedValue(
      makeTask({ status: 'in_progress' }),
    );
    mockBitable.getAllRecords.mockResolvedValue([
      makeCheck({ book_quantity: 10, actual_quantity: 6 }),
      makeCheck({ recordId: 'check-2', book_quantity: 5, actual_quantity: 2 }),
    ]);
    mockBitable.updateRecord.mockResolvedValue(undefined);
    mockBitable.batchUpdateRecords.mockResolvedValue(undefined);

    const result = await service.completeTask('task-1');

    expect(result.success).toBe(true);
    expect(result.abnormalCount).toBe(2);
    expect(result.surplusTotal).toBe(0);
    expect(result.lossTotal).toBe(7);
  });

  it('should complete task with mixed differences', async () => {
    mockBitable.getRecord.mockResolvedValue(
      makeTask({ status: 'in_progress' }),
    );
    mockBitable.getAllRecords.mockResolvedValue([
      makeCheck({ book_quantity: 10, actual_quantity: 15 }),
      makeCheck({ recordId: 'check-2', book_quantity: 5, actual_quantity: 2 }),
      makeCheck({ recordId: 'check-3', book_quantity: 8, actual_quantity: 8 }),
    ]);
    mockBitable.updateRecord.mockResolvedValue(undefined);
    mockBitable.batchUpdateRecords.mockResolvedValue(undefined);

    const result = await service.completeTask('task-1');

    expect(result.success).toBe(true);
    expect(result.abnormalCount).toBe(2);
    expect(result.surplusTotal).toBe(5);
    expect(result.lossTotal).toBe(3);
    expect(result.totalCount).toBe(3);
    expect(result.checkedCount).toBe(3);
  });

  it('should handle completing already completed task', async () => {
    mockBitable.getRecord.mockResolvedValue(
      makeTask({ status: 'completed' }),
    );
    mockBitable.getAllRecords.mockResolvedValue([
      makeCheck({ book_quantity: 10, actual_quantity: 10 }),
    ]);
    mockBitable.updateRecord.mockResolvedValue(undefined);
    mockBitable.batchUpdateRecords.mockResolvedValue(undefined);

    const result = await service.completeTask('task-1');

    expect(result.success).toBe(true);
  });

  // --- 任务重置 ---

  it('should reset task to pending status', async () => {
    mockBitable.getRecord.mockResolvedValue(
      makeTask({ status: 'completed' }),
    );
    mockBitable.getAllRecords.mockResolvedValue([
      makeCheck({ status: 'checked', actual_quantity: 10 }),
    ]);
    mockBitable.batchUpdateRecords.mockResolvedValue(undefined);
    mockBitable.updateRecord.mockResolvedValue(undefined);

    const result = await service.resetChecks('task-1');

    expect(result.success).toBe(true);
    expect(result.resetCount).toBe(1);
    expect(mockBitable.updateRecord).toHaveBeenCalledWith(
      'inventory_tasks',
      'task-1',
      expect.objectContaining({ status: 'in_progress' }),
    );
  });

  it('should clear all check item results on reset', async () => {
    mockBitable.getRecord.mockResolvedValue(makeTask());
    mockBitable.getAllRecords.mockResolvedValue([
      makeCheck({ status: 'checked', actual_quantity: 10 }),
      makeCheck({ recordId: 'check-2', status: 'checked', actual_quantity: 5 }),
    ]);
    mockBitable.batchUpdateRecords.mockResolvedValue(undefined);
    mockBitable.updateRecord.mockResolvedValue(undefined);

    const result = await service.resetChecks('task-1');

    expect(result.success).toBe(true);
    expect(result.resetCount).toBe(2);
  });

  it('should handle resetting already reset task', async () => {
    mockBitable.getRecord.mockResolvedValue(
      makeTask({ status: 'in_progress' }),
    );
    mockBitable.getAllRecords.mockResolvedValue([
      makeCheck({ status: 'pending' }),
    ]);
    mockBitable.batchUpdateRecords.mockResolvedValue(undefined);
    mockBitable.updateRecord.mockResolvedValue(undefined);

    const result = await service.resetChecks('task-1');

    expect(result.success).toBe(true);
    expect(result.resetCount).toBe(1);
  });

  // --- 任务删除 ---

  it('should delete task and associated checks', async () => {
    mockBitable.getRecord.mockResolvedValue(makeTask());
    mockBitable.deleteRecord.mockResolvedValue(undefined);

    const result = await service.remove('task-1');

    expect(result).toEqual({ success: true });
    expect(mockBitable.deleteRecord).toHaveBeenCalledWith(
      'inventory_tasks',
      'task-1',
    );
  });

  it('should handle deleting non-existent task', async () => {
    mockBitable.getRecord.mockResolvedValue(null);

    await expect(service.remove('nonexistent')).rejects.toThrow(
      NotFoundException,
    );
  });

  // ============================================================
  // 任务编号生成（补充）
  // ============================================================

  describe('任务编号生成（补充）', () => {
    it('should generate task number with correct format CK-YYYYMM-XXXX', async () => {
      mockBitable.getAllRecords.mockResolvedValue([]);
      mockBitable.createRecord.mockResolvedValue({ id: 'task-fmt' });
      mockBitable.updateRecord.mockResolvedValue(undefined);

      const result = await service.create({
        taskName: '格式测试',
        checkYear: 2026,
        checkMonth: '06',
        scopeType: 'all',
      });

      expect(result.taskNo).toMatch(/^CK-06-\d{4}$/);
      const seq = parseInt(result.taskNo.split('-')[2], 10);
      expect(seq).toBeGreaterThanOrEqual(1);
      expect(seq).toBeLessThanOrEqual(9999);
    });

    it('should pad sequence number to 4 digits', async () => {
      mockBitable.getAllRecords.mockResolvedValueOnce([
        { check_no: 'CK-07-0008', check_month: '07', remark: '[TASK]|t|all' },
        { check_no: 'CK-07-0003', check_month: '07', remark: '[TASK]|t|all' },
      ]);
      mockBitable.getAllRecords.mockResolvedValue([]);
      mockBitable.createRecord.mockResolvedValue({ id: 'task-pad' });
      mockBitable.updateRecord.mockResolvedValue(undefined);

      const result = await service.create({
        taskName: '补零测试',
        checkYear: 2026,
        checkMonth: '07',
        scopeType: 'all',
      });

      expect(result.taskNo).toBe('CK-07-0004');
    });

    it('should reset sequence on new month', async () => {
      mockBitable.getAllRecords.mockResolvedValueOnce([
        { check_no: 'CK-01-0099', check_month: '01', remark: '[TASK]|old|all' },
      ]);
      mockBitable.getAllRecords.mockResolvedValue([]);
      mockBitable.createRecord.mockResolvedValue({ id: 'task-newmonth' });
      mockBitable.updateRecord.mockResolvedValue(undefined);

      const result = await service.create({
        taskName: '新月盘点',
        checkYear: 2026,
        checkMonth: '02',
        scopeType: 'all',
      });

      expect(result.taskNo).toBe('CK-02-0001');
    });

    it('should handle first task of month (sequence 1)', async () => {
      mockBitable.getAllRecords.mockResolvedValue([]);
      mockBitable.createRecord.mockResolvedValue({ id: 'task-first' });
      mockBitable.updateRecord.mockResolvedValue(undefined);

      const result = await service.create({
        taskName: '首月任务',
        checkYear: 2026,
        checkMonth: '08',
        scopeType: 'all',
      });

      expect(result.taskNo).toBe('CK-08-0001');
    });
  });

  // ============================================================
  // 检查项生成
  // ============================================================

  describe('检查项生成', () => {
    function makeAsset(overrides: Record<string, unknown> = {}): Record<string, unknown> {
      return {
        recordId: 'asset-1',
        asset_name: '笔记本电脑',
        asset_type: '电子设备',
        current_stock: 10,
        floor: '3F',
        purchase_department: '行政部',
        owner: [{ id: 'user-001' }],
        ...overrides,
      };
    }

    it('should generate check items from all assets', async () => {
      mockBitable.getAllRecords.mockResolvedValueOnce([]);
      mockBitable.getAllRecords.mockResolvedValueOnce([
        makeAsset({ recordId: 'a1' }),
        makeAsset({ recordId: 'a2', asset_name: '打印机' }),
        makeAsset({ recordId: 'a3', asset_name: '投影仪' }),
      ]);
      mockBitable.createRecord.mockResolvedValue({ id: 'task-all' });
      mockBitable.batchCreateRecords.mockResolvedValue(['c1', 'c2', 'c3']);
      mockBitable.batchUpdateRecords.mockResolvedValue(undefined);
      mockBitable.updateRecord.mockResolvedValue(undefined);

      const result = await service.create({
        taskName: '全部资产盘点',
        checkYear: 2026,
        checkMonth: '01',
        scopeType: 'all',
      });

      expect(result.totalCount).toBe(3);
      expect(mockBitable.batchCreateRecords).toHaveBeenCalledWith(
        'inventory_checks',
        expect.any(Array),
      );
      const createdRecords = mockBitable.batchCreateRecords.mock.calls[0][1];
      expect(createdRecords).toHaveLength(3);
    });

    it('should generate check items filtered by department', async () => {
      mockBitable.getAllRecords.mockResolvedValueOnce([]);
      mockBitable.getAllRecords.mockResolvedValueOnce([
        makeAsset({ recordId: 'a1', purchase_department: '行政部' }),
        makeAsset({ recordId: 'a2', purchase_department: '研发部', asset_name: '服务器' }),
      ]);
      mockBitable.createRecord.mockResolvedValue({ id: 'task-dept' });
      mockBitable.batchCreateRecords.mockResolvedValue(['c1']);
      mockBitable.batchUpdateRecords.mockResolvedValue(undefined);
      mockBitable.updateRecord.mockResolvedValue(undefined);

      const result = await service.create({
        taskName: '部门盘点',
        checkYear: 2026,
        checkMonth: '01',
        scopeType: 'department',
        scopeValue: ['行政部'],
      });

      expect(result.totalCount).toBe(1);
      expect(mockBitable.batchCreateRecords.mock.calls[0][1]).toHaveLength(1);
    });

    it('should generate check items filtered by floor', async () => {
      mockBitable.getAllRecords.mockResolvedValueOnce([]);
      mockBitable.getAllRecords.mockResolvedValueOnce([
        makeAsset({ recordId: 'a1', floor: '3F' }),
        makeAsset({ recordId: 'a2', floor: '5F', asset_name: '咖啡机' }),
      ]);
      mockBitable.createRecord.mockResolvedValue({ id: 'task-floor' });
      mockBitable.batchCreateRecords.mockResolvedValue(['c1']);
      mockBitable.batchUpdateRecords.mockResolvedValue(undefined);
      mockBitable.updateRecord.mockResolvedValue(undefined);

      const result = await service.create({
        taskName: '楼层盘点',
        checkYear: 2026,
        checkMonth: '02',
        scopeType: 'floor',
        scopeValue: ['3F'],
      });

      expect(result.totalCount).toBe(1);
      expect(mockBitable.batchCreateRecords.mock.calls[0][1]).toHaveLength(1);
    });

    it('should generate check items filtered by owner', async () => {
      mockBitable.getAllRecords.mockResolvedValueOnce([]);
      mockBitable.getAllRecords.mockResolvedValueOnce([
        makeAsset({ recordId: 'a1', owner: [{ id: 'user-001' }] }),
        makeAsset({ recordId: 'a2', owner: [{ id: 'user-002' }], asset_name: '平板' }),
      ]);
      mockBitable.createRecord.mockResolvedValue({ id: 'task-owner' });
      mockBitable.batchCreateRecords.mockResolvedValue(['c1']);
      mockBitable.batchUpdateRecords.mockResolvedValue(undefined);
      mockBitable.updateRecord.mockResolvedValue(undefined);

      const result = await service.create({
        taskName: '归属人盘点',
        checkYear: 2026,
        checkMonth: '03',
        scopeType: 'owner',
        scopeValue: ['user-001'],
      });

      expect(result.totalCount).toBe(1);
      expect(mockBitable.batchCreateRecords.mock.calls[0][1]).toHaveLength(1);
    });

    it('should generate check items filtered by asset type', async () => {
      mockBitable.getAllRecords.mockResolvedValueOnce([]);
      mockBitable.getAllRecords.mockResolvedValueOnce([
        makeAsset({ recordId: 'a1', asset_type: '电子设备' }),
        makeAsset({ recordId: 'a2', asset_type: '家具', asset_name: '办公桌' }),
      ]);
      mockBitable.createRecord.mockResolvedValue({ id: 'task-type' });
      mockBitable.batchCreateRecords.mockResolvedValue(['c1']);
      mockBitable.batchUpdateRecords.mockResolvedValue(undefined);
      mockBitable.updateRecord.mockResolvedValue(undefined);

      const result = await service.create({
        taskName: '资产类型盘点',
        checkYear: 2026,
        checkMonth: '04',
        scopeType: 'asset_type',
        scopeValue: ['电子设备'],
      });

      expect(result.totalCount).toBe(1);
      expect(mockBitable.batchCreateRecords.mock.calls[0][1]).toHaveLength(1);
    });

    it('should include correct book quantity in check items', async () => {
      mockBitable.getAllRecords.mockResolvedValueOnce([]);
      mockBitable.getAllRecords.mockResolvedValueOnce([
        makeAsset({ recordId: 'a1', current_stock: 25 }),
      ]);
      mockBitable.createRecord.mockResolvedValue({ id: 'task-qty' });
      mockBitable.batchCreateRecords.mockResolvedValue(['c1']);
      mockBitable.batchUpdateRecords.mockResolvedValue(undefined);
      mockBitable.updateRecord.mockResolvedValue(undefined);

      await service.create({
        taskName: '库存数量测试',
        checkYear: 2026,
        checkMonth: '05',
        scopeType: 'all',
      });

      const createdRecords = mockBitable.batchCreateRecords.mock.calls[0][1];
      expect(createdRecords[0].book_quantity).toBe(25);
    });

    it('should set initial check item status to pending', async () => {
      mockBitable.getAllRecords.mockResolvedValueOnce([]);
      mockBitable.getAllRecords.mockResolvedValueOnce([
        makeAsset({ recordId: 'a1' }),
      ]);
      mockBitable.createRecord.mockResolvedValue({ id: 'task-status' });
      mockBitable.batchCreateRecords.mockResolvedValue(['c1']);
      mockBitable.batchUpdateRecords.mockResolvedValue(undefined);
      mockBitable.updateRecord.mockResolvedValue(undefined);

      await service.create({
        taskName: '初始状态测试',
        checkYear: 2026,
        checkMonth: '06',
        scopeType: 'all',
      });

      const createdRecords = mockBitable.batchCreateRecords.mock.calls[0][1];
      expect(createdRecords[0].status).toBe('pending');
    });

    it('should handle empty asset list gracefully', async () => {
      mockBitable.getAllRecords.mockResolvedValue([]);
      mockBitable.createRecord.mockResolvedValue({ id: 'task-empty' });
      mockBitable.updateRecord.mockResolvedValue(undefined);

      const result = await service.create({
        taskName: '空资产盘点',
        checkYear: 2026,
        checkMonth: '07',
        scopeType: 'all',
      });

      expect(result.totalCount).toBe(0);
      expect(mockBitable.batchCreateRecords).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // 进度计算（补充）
  // ============================================================

  describe('进度计算（补充）', () => {
    it('should handle items with abnormal status in progress', async () => {
      mockBitable.getRecord.mockResolvedValue(
        makeTask({
          remark: '[TASK]|2026Q1|all||tc:10|cc:5|ac:2|pg:50',
        }),
      );
      mockBitable.getAllRecords.mockResolvedValue([]);

      const detail = await service.getDetail('task-1');

      expect(detail.abnormalCount).toBe(2);
      expect(detail.progress).toBe(50);
      expect(detail.totalCount).toBe(10);
      expect(detail.checkedCount).toBe(5);
    });

    it('should calculate progress as 0 when totalCount is 0', async () => {
      mockBitable.getRecord.mockResolvedValue(
        makeTask({
          remark: '[TASK]|empty|all||tc:0|cc:0|ac:0|pg:0',
        }),
      );
      mockBitable.getAllRecords.mockResolvedValue([]);

      const detail = await service.getDetail('task-1');

      expect(detail.progress).toBe(0);
      expect(detail.totalCount).toBe(0);
    });

    it('should compute progress dynamically from checks when remark lacks counts', async () => {
      mockBitable.getRecord.mockResolvedValue(
        makeTask({
          remark: '[TASK]|dynamic|all||tc:0|cc:0|ac:0|pg:0',
        }),
      );
      mockBitable.getAllRecords.mockResolvedValue([
        makeCheck({ status: 'checked', actual_quantity: 10, book_quantity: 10 }),
        makeCheck({ recordId: 'check-2', status: 'checked', actual_quantity: 8, book_quantity: 10 }),
        makeCheck({ recordId: 'check-3', status: 'pending' }),
      ]);

      const detail = await service.getDetail('task-1');

      expect(detail.checks).toHaveLength(3);
      expect(detail.progress).toBeGreaterThanOrEqual(0);
    });
  });

  // ============================================================
  // 任务完成（补充）
  // ============================================================

  describe('任务完成（补充）', () => {
    it('should calculate total surplus quantity correctly', async () => {
      mockBitable.getRecord.mockResolvedValue(
        makeTask({ status: 'in_progress' }),
      );
      mockBitable.getAllRecords.mockResolvedValueOnce([
        makeCheck({ book_quantity: 10, actual_quantity: 15 }),
        makeCheck({ recordId: 'check-2', book_quantity: 20, actual_quantity: 25 }),
      ]);
      mockBitable.getAllRecords.mockResolvedValue([]);
      mockBitable.updateRecord.mockResolvedValue(undefined);
      mockBitable.batchUpdateRecords.mockResolvedValue(undefined);

      const result = await service.completeTask('task-1');

      expect(result.surplusTotal).toBe(10);
      expect(result.lossTotal).toBe(0);
    });

    it('should calculate total loss quantity correctly', async () => {
      mockBitable.getRecord.mockResolvedValue(
        makeTask({ status: 'in_progress' }),
      );
      mockBitable.getAllRecords.mockResolvedValueOnce([
        makeCheck({ book_quantity: 10, actual_quantity: 3 }),
        makeCheck({ recordId: 'check-2', book_quantity: 20, actual_quantity: 15 }),
      ]);
      mockBitable.getAllRecords.mockResolvedValue([]);
      mockBitable.updateRecord.mockResolvedValue(undefined);
      mockBitable.batchUpdateRecords.mockResolvedValue(undefined);

      const result = await service.completeTask('task-1');

      expect(result.lossTotal).toBe(12);
      expect(result.surplusTotal).toBe(0);
    });

    it('should set updatedAssetCount and unmatchedAssetCount on completion', async () => {
      mockBitable.getRecord.mockResolvedValue(
        makeTask({ status: 'in_progress' }),
      );
      mockBitable.getAllRecords.mockResolvedValueOnce([
        makeCheck({ book_quantity: 10, actual_quantity: 12, asset_name: '电脑' }),
      ]);
      mockBitable.getAllRecords.mockResolvedValueOnce([
        { recordId: 'asset-match', asset_name: '电脑', current_stock: 10 },
      ]);
      mockBitable.updateRecord.mockResolvedValue(undefined);
      mockBitable.batchUpdateRecords.mockResolvedValue(undefined);

      const result = await service.completeTask('task-1');

      expect(result.updatedAssetCount).toBe(1);
      expect(result.unmatchedAssetCount).toBe(0);
    });

    it('should set unmatchedAssetCount when asset not found', async () => {
      mockBitable.getRecord.mockResolvedValue(
        makeTask({ status: 'in_progress' }),
      );
      mockBitable.getAllRecords.mockResolvedValueOnce([
        makeCheck({ book_quantity: 10, actual_quantity: 15, asset_name: '未知设备' }),
      ]);
      mockBitable.getAllRecords.mockResolvedValueOnce([
        { recordId: 'other', asset_name: '打印机', current_stock: 5 },
      ]);
      mockBitable.updateRecord.mockResolvedValue(undefined);
      mockBitable.batchUpdateRecords.mockResolvedValue(undefined);

      const result = await service.completeTask('task-1');

      expect(result.unmatchedAssetCount).toBe(1);
      expect(result.updatedAssetCount).toBe(0);
    });

    it('should handle completing task with pending items', async () => {
      mockBitable.getRecord.mockResolvedValue(
        makeTask({ status: 'in_progress' }),
      );
      mockBitable.getAllRecords.mockResolvedValueOnce([
        makeCheck({ status: 'checked', book_quantity: 10, actual_quantity: 10 }),
        makeCheck({ recordId: 'check-2', status: 'pending' }),
        makeCheck({ recordId: 'check-3', status: 'pending' }),
      ]);
      mockBitable.getAllRecords.mockResolvedValue([]);
      mockBitable.updateRecord.mockResolvedValue(undefined);
      mockBitable.batchUpdateRecords.mockResolvedValue(undefined);

      const result = await service.completeTask('task-1');

      expect(result.success).toBe(true);
      expect(result.totalCount).toBe(3);
      expect(result.checkedCount).toBe(1);
      expect(result.abnormalCount).toBe(0);
    });

    it('should update task status to completed', async () => {
      mockBitable.getRecord.mockResolvedValue(
        makeTask({ status: 'in_progress' }),
      );
      mockBitable.getAllRecords.mockResolvedValueOnce([
        makeCheck({ book_quantity: 10, actual_quantity: 10 }),
      ]);
      mockBitable.getAllRecords.mockResolvedValue([]);
      mockBitable.updateRecord.mockResolvedValue(undefined);
      mockBitable.batchUpdateRecords.mockResolvedValue(undefined);

      await service.completeTask('task-1');

      expect(mockBitable.updateRecord).toHaveBeenCalledWith(
        'inventory_tasks',
        'task-1',
        expect.objectContaining({ status: 'completed' }),
      );
    });

    it('should update remark with progress on completion', async () => {
      mockBitable.getRecord.mockResolvedValue(
        makeTask({ status: 'in_progress' }),
      );
      mockBitable.getAllRecords.mockResolvedValueOnce([
        makeCheck({ book_quantity: 10, actual_quantity: 10 }),
      ]);
      mockBitable.getAllRecords.mockResolvedValue([]);
      mockBitable.updateRecord.mockResolvedValue(undefined);
      mockBitable.batchUpdateRecords.mockResolvedValue(undefined);

      await service.completeTask('task-1');

      expect(mockBitable.updateRecord).toHaveBeenCalledWith(
        'inventory_tasks',
        'task-1',
        expect.objectContaining({
          remark: expect.stringContaining('tc:'),
        }),
      );
    });
  });

  // ============================================================
  // 差异处理
  // ============================================================

  describe('差异处理', () => {
    it('should update asset stock on completion for surplus', async () => {
      mockBitable.getRecord.mockResolvedValue(
        makeTask({ status: 'in_progress' }),
      );
      mockBitable.getAllRecords.mockResolvedValueOnce([
        makeCheck({ book_quantity: 10, actual_quantity: 15, asset_name: '电脑' }),
      ]);
      mockBitable.getAllRecords.mockResolvedValueOnce([
        { recordId: 'asset-match', asset_name: '电脑', current_stock: 10 },
      ]);
      mockBitable.updateRecord.mockResolvedValue(undefined);
      mockBitable.batchUpdateRecords.mockResolvedValue(undefined);

      const result = await service.completeTask('task-1');

      expect(result.updatedAssetCount).toBe(1);
      expect(mockBitable.batchUpdateRecords).toHaveBeenCalledWith(
        'fixed_assets',
        expect.arrayContaining([
          expect.objectContaining({
            id: 'asset-match',
            record: expect.objectContaining({ current_stock: 15 }),
          }),
        ]),
      );
    });

    it('should update asset stock on completion for loss', async () => {
      mockBitable.getRecord.mockResolvedValue(
        makeTask({ status: 'in_progress' }),
      );
      mockBitable.getAllRecords.mockResolvedValueOnce([
        makeCheck({ book_quantity: 10, actual_quantity: 5, asset_name: '打印机' }),
      ]);
      mockBitable.getAllRecords.mockResolvedValueOnce([
        { recordId: 'asset-loss', asset_name: '打印机', current_stock: 10 },
      ]);
      mockBitable.updateRecord.mockResolvedValue(undefined);
      mockBitable.batchUpdateRecords.mockResolvedValue(undefined);

      const result = await service.completeTask('task-1');

      expect(result.updatedAssetCount).toBe(1);
      expect(mockBitable.batchUpdateRecords).toHaveBeenCalledWith(
        'fixed_assets',
        expect.arrayContaining([
          expect.objectContaining({
            record: expect.objectContaining({ current_stock: 5 }),
          }),
        ]),
      );
    });

    it('should not update asset stock when no difference', async () => {
      mockBitable.getRecord.mockResolvedValue(
        makeTask({ status: 'in_progress' }),
      );
      mockBitable.getAllRecords.mockResolvedValueOnce([
        makeCheck({ book_quantity: 10, actual_quantity: 10, asset_name: '电脑' }),
      ]);
      mockBitable.getAllRecords.mockResolvedValueOnce([
        { recordId: 'asset-eq', asset_name: '电脑', current_stock: 10 },
      ]);
      mockBitable.updateRecord.mockResolvedValue(undefined);
      mockBitable.batchUpdateRecords.mockResolvedValue(undefined);

      const result = await service.completeTask('task-1');

      expect(result.updatedAssetCount).toBe(0);
    });

    it('should match asset by name when assetId is not available', async () => {
      mockBitable.getRecord.mockResolvedValue(
        makeTask({ status: 'in_progress' }),
      );
      mockBitable.getAllRecords.mockResolvedValueOnce([
        makeCheck({
          book_quantity: 10,
          actual_quantity: 12,
          asset_name: '投影仪',
          remark: '',
        }),
      ]);
      mockBitable.getAllRecords.mockResolvedValueOnce([
        { recordId: 'asset-name', asset_name: '投影仪', current_stock: 10 },
      ]);
      mockBitable.updateRecord.mockResolvedValue(undefined);
      mockBitable.batchUpdateRecords.mockResolvedValue(undefined);

      const result = await service.completeTask('task-1');

      expect(result.updatedAssetCount).toBe(1);
    });

    it('should handle asset update failure gracefully', async () => {
      mockBitable.getRecord.mockResolvedValue(
        makeTask({ status: 'in_progress' }),
      );
      mockBitable.getAllRecords.mockResolvedValueOnce([
        makeCheck({ book_quantity: 10, actual_quantity: 15, asset_name: '电脑' }),
      ]);
      mockBitable.getAllRecords.mockResolvedValueOnce([
        { recordId: 'asset-bad', asset_name: '电脑', current_stock: 10 },
      ]);
      mockBitable.updateRecord.mockResolvedValue(undefined);
      mockBitable.batchUpdateRecords.mockRejectedValue(
        new Error('更新失败'),
      );

      const result = await service.completeTask('task-1');

      expect(result.success).toBe(true);
      expect(result.abnormalCount).toBe(1);
    });

    it('should handle completing already completed task with differences', async () => {
      mockBitable.getRecord.mockResolvedValue(
        makeTask({ status: 'completed', remark: '[TASK]|test|all||tc:2|cc:2|ac:1|pg:100' }),
      );
      mockBitable.getAllRecords.mockResolvedValueOnce([
        makeCheck({ book_quantity: 10, actual_quantity: 12 }),
        makeCheck({ recordId: 'check-2', book_quantity: 5, actual_quantity: 5 }),
      ]);
      mockBitable.getAllRecords.mockResolvedValue([]);
      mockBitable.updateRecord.mockResolvedValue(undefined);
      mockBitable.batchUpdateRecords.mockResolvedValue(undefined);

      const result = await service.completeTask('task-1');

      expect(result.success).toBe(true);
      expect(result.totalCount).toBe(2);
    });
  });

  // ============================================================
  // 数据转换
  // ============================================================

  describe('数据转换', () => {
    it('should transform task record to DTO via list', async () => {
      mockBitable.getAllRecords.mockResolvedValue([
        makeTask({
          check_date: '2026-01-15',
          remark: '[TASK]|2026Q1|all||tc:50|cc:45|ac:3|pg:90',
        }),
      ]);

      const result = await service.list({ page: 1, pageSize: 10 });

      expect(result.items).toHaveLength(1);
      const item = result.items[0];
      expect(item.id).toBe('task-1');
      expect(item.taskNo).toBe('CK-01-0001');
      expect(item.status).toBe('in_progress');
      expect(item.progress).toBe(90);
      expect(item.totalCount).toBe(50);
      expect(item.checkedCount).toBe(45);
    });

    it('should include progress in DTO', async () => {
      mockBitable.getAllRecords.mockResolvedValue([
        makeTask({
          remark: '[TASK]|test|all||tc:100|cc:75|ac:5|pg:75',
        }),
      ]);

      const result = await service.list({ page: 1, pageSize: 10 });

      expect(result.items[0].progress).toBe(75);
    });

    it('should include statistics in DTO', async () => {
      mockBitable.getAllRecords.mockResolvedValue([
        makeTask({
          remark: '[TASK]|test|all||tc:200|cc:150|ac:10|pg:75',
        }),
      ]);

      const result = await service.list({ page: 1, pageSize: 10 });

      const item = result.items[0];
      expect(item.totalCount).toBe(200);
      expect(item.checkedCount).toBe(150);
      expect(item.progress).toBe(75);
    });

    it('should handle null/undefined fields gracefully', async () => {
      mockBitable.getAllRecords.mockResolvedValue([
        {
          recordId: 'task-null',
          check_no: null,
          check_year: null,
          check_month: null,
          checker: null,
          status: null,
          remark: '[TASK]|test|all',
          check_date: null,
        },
      ]);

      const result = await service.list({ page: 1, pageSize: 10 });

      expect(result.items).toHaveLength(1);
      const item = result.items[0];
      expect(item.taskNo).toBe('');
      expect(item.checkYear).toBe(0);
      expect(item.checkMonth).toBe('');
      expect(item.status).toBe('pending');
      expect(item.progress).toBe(0);
    });

    it('should format dates correctly in DTO', async () => {
      mockBitable.getAllRecords.mockResolvedValue([
        makeTask({
          check_date: '2026-03-15',
          remark: '[TASK]|test|all||tc:10|cc:5|ac:0|pg:50',
        }),
      ]);

      const result = await service.list({ page: 1, pageSize: 10 });

      expect(result.items[0].createdAt).toBe('2026-03-15');
    });

    it('should transform check item record correctly', async () => {
      mockBitable.getRecord.mockResolvedValue(makeTask());
      mockBitable.getAllRecords.mockResolvedValue([
        {
          recordId: 'check-detail',
          check_no: 'CK-01-0001',
          asset_name: '打印机',
          asset_type: '办公设备',
          owner: 'user-002',
          book_quantity: 5,
          actual_quantity: 4,
          status: 'checked',
          remark: '[ASSET_META]|打印机|办公设备|asset-printer|user-002',
        },
      ]);

      const detail = await service.getDetail('task-1');

      expect(detail.checks).toHaveLength(1);
      const check = detail.checks![0];
      expect(check.assetName).toBe('打印机');
      expect(check.assetType).toBe('办公设备');
      expect(check.bookQuantity).toBe(5);
      expect(check.actualQuantity).toBe(4);
      expect(check.difference).toBe(-1);
      expect(check.isAbnormal).toBe(true);
    });
  });

  // ============================================================
  // 错误处理
  // ============================================================

  describe('错误处理', () => {
    it('should handle database error on list', async () => {
      mockBitable.getAllRecords.mockRejectedValue(
        new Error('数据库连接失败'),
      );

      await expect(service.list({ page: 1, pageSize: 10 })).rejects.toThrow(
        '数据库连接失败',
      );
    });

    it('should handle getRecord error on getDetail', async () => {
      mockBitable.getRecord.mockRejectedValue(
        new Error('记录查询失败'),
      );

      await expect(service.getDetail('task-1')).rejects.toThrow(
        '记录查询失败',
      );
    });

    it('should return proper NotFoundException for missing task', async () => {
      mockBitable.getRecord.mockResolvedValue(null);

      await expect(service.getDetail('missing')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getDetail('missing')).rejects.toThrow(
        '盘点任务不存在',
      );
    });

    it('should throw NotFoundException for missing task on complete', async () => {
      mockBitable.getRecord.mockResolvedValue(null);

      await expect(service.completeTask('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ============================================================
  // 缓存
  // ============================================================

  describe('缓存', () => {
    it('should invalidate cache on create', async () => {
      mockBitable.getAllRecords.mockResolvedValue([]);
      mockBitable.createRecord.mockResolvedValue({ id: 'task-cache' });
      mockBitable.updateRecord.mockResolvedValue(undefined);

      await service.create({
        taskName: '缓存测试',
        checkYear: 2026,
        checkMonth: '01',
        scopeType: 'all',
      });

      expect(mockCache.deleteByPrefix).toHaveBeenCalledWith(
        'report:inventory',
      );
      expect(mockCache.deleteByPrefix).toHaveBeenCalledWith(
        'dash:inventory:',
      );
    });

    it('should invalidate cache on delete', async () => {
      mockBitable.getRecord.mockResolvedValue(makeTask());
      mockBitable.deleteRecord.mockResolvedValue(undefined);

      await service.remove('task-1');

      expect(mockCache.deleteByPrefix).toHaveBeenCalledWith(
        'report:inventory',
      );
    });

    it('should invalidate cache on update status', async () => {
      mockBitable.getRecord.mockResolvedValue(makeTask());
      mockBitable.updateRecord.mockResolvedValue(undefined);

      await service.updateStatus('task-1', 'completed');

      expect(mockBitable.updateRecord).toHaveBeenCalledWith(
        'inventory_tasks',
        'task-1',
        { status: 'completed' },
      );
    });

    it('should invalidate cache on reset checks', async () => {
      mockBitable.getRecord.mockResolvedValue(makeTask());
      mockBitable.getAllRecords.mockResolvedValue([
        makeCheck({ status: 'checked', actual_quantity: 10 }),
      ]);
      mockBitable.batchUpdateRecords.mockResolvedValue(undefined);
      mockBitable.updateRecord.mockResolvedValue(undefined);

      await service.resetChecks('task-1');

      expect(mockCache.deleteByPrefix).toHaveBeenCalledWith(
        'report:inventory',
      );
    });

    it('should invalidate asset cache on completion with stock changes', async () => {
      mockBitable.getRecord.mockResolvedValue(
        makeTask({ status: 'in_progress' }),
      );
      mockBitable.getAllRecords.mockResolvedValueOnce([
        makeCheck({ book_quantity: 10, actual_quantity: 12, asset_name: '电脑' }),
      ]);
      mockBitable.getAllRecords.mockResolvedValueOnce([
        { recordId: 'asset-match', asset_name: '电脑', current_stock: 10 },
      ]);
      mockBitable.updateRecord.mockResolvedValue(undefined);
      mockBitable.batchUpdateRecords.mockResolvedValue(undefined);

      await service.completeTask('task-1');

      expect(mockCache.deleteByPrefix).toHaveBeenCalledWith('dash:asset');
      expect(mockCache.deleteByPrefix).toHaveBeenCalledWith('report:asset');
    });
  });

  // ============================================================
  // 补充测试：列表过滤
  // ============================================================

  describe('列表过滤', () => {
    it('should filter by status', async () => {
      mockBitable.getAllRecords.mockResolvedValue([
        makeTask({ status: 'in_progress' }),
        makeTask({ recordId: 'task-2', check_no: 'CK-01-0002', status: 'completed' }),
      ]);

      const result = await service.list({ page: 1, pageSize: 10, status: 'completed' });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].status).toBe('completed');
    });

    it('should filter by checkMonth', async () => {
      mockBitable.getAllRecords.mockResolvedValue([
        makeTask({ check_month: '01' }),
        makeTask({ recordId: 'task-2', check_no: 'CK-02-0001', check_month: '02' }),
      ]);

      const result = await service.list({ page: 1, pageSize: 10, checkMonth: '02' });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].checkMonth).toBe('02');
    });

    it('should filter by keyword (check_no)', async () => {
      mockBitable.getAllRecords.mockResolvedValue([
        makeTask({ check_no: 'CK-01-0001' }),
        makeTask({ recordId: 'task-2', check_no: 'CK-02-0001' }),
      ]);

      const result = await service.list({ page: 1, pageSize: 10, keyword: 'CK-02' });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].taskNo).toBe('CK-02-0001');
    });

    it('should filter by personal data scope', async () => {
      mockRoles.getUserDataScope.mockResolvedValue('personal');
      mockBitable.getAllRecords.mockResolvedValue([
        makeTask({ checker: 'user-001' }),
        makeTask({ recordId: 'task-2', check_no: 'CK-01-0002', checker: 'user-002' }),
      ]);

      const result = await service.list({ page: 1, pageSize: 10, userId: 'user-001' });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe('task-1');
    });

    it('should filter by department data scope (with department)', async () => {
      mockRoles.getUserDataScope.mockResolvedValue('department');
      mockRoles.getUserInfo.mockResolvedValue({ department: '行政部' });
      mockBitable.getAllRecords.mockResolvedValue([
        makeTask({ checker: 'user-001' }),
        makeTask({ recordId: 'task-2', check_no: 'CK-01-0002', checker: 'user-003' }),
      ]);

      const result = await service.list({ page: 1, pageSize: 10, userId: 'user-001' });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe('task-1');
    });

    it('should filter by department data scope (no department, fallback to personal)', async () => {
      mockRoles.getUserDataScope.mockResolvedValue('department');
      mockRoles.getUserInfo.mockResolvedValue({ department: '' });
      mockBitable.getAllRecords.mockResolvedValue([
        makeTask({ checker: 'user-001' }),
        makeTask({ recordId: 'task-2', check_no: 'CK-01-0002', checker: 'user-002' }),
      ]);

      const result = await service.list({ page: 1, pageSize: 10, userId: 'user-001' });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe('task-1');
    });

    it('should compute check counts dynamically when remark lacks counts', async () => {
      mockBitable.getAllRecords.mockResolvedValueOnce([
        makeTask({ remark: '[TASK]|test|all' }),
      ]);
      mockBitable.getAllRecords.mockResolvedValueOnce([
        makeCheck({ status: 'checked', actual_quantity: 10, book_quantity: 10 }),
        makeCheck({ recordId: 'check-2', status: 'checked', actual_quantity: 8, book_quantity: 10 }),
        makeCheck({ recordId: 'check-3', status: 'pending' }),
      ]);

      const result = await service.list({ page: 1, pageSize: 10 });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].totalCount).toBe(3);
      expect(result.items[0].checkedCount).toBe(2);
    });
  });

  // ============================================================
  // 补充测试：updateStatus 边界
  // ============================================================

  describe('updateStatus 边界', () => {
    it('should throw NotFoundException when task not found', async () => {
      mockBitable.getRecord.mockResolvedValue(null);

      await expect(
        service.updateStatus('nonexistent', 'completed'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================================
  // 补充测试：resetChecks 边界
  // ============================================================

  describe('resetChecks 边界', () => {
    it('should throw NotFoundException when task not found', async () => {
      mockBitable.getRecord.mockResolvedValue(null);

      await expect(service.resetChecks('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return resetCount 0 when no matching checks', async () => {
      mockBitable.getRecord.mockResolvedValue(
        makeTask({ check_no: 'CK-99-0001' }),
      );
      mockBitable.getAllRecords.mockResolvedValue([
        makeCheck({ check_no: 'CK-01-0001', status: 'checked' }),
      ]);

      const result = await service.resetChecks('task-1');

      expect(result.success).toBe(true);
      expect(result.resetCount).toBe(0);
    });

    it('should throw BadRequestException when batch update fails', async () => {
      mockBitable.getRecord.mockResolvedValue(makeTask());
      mockBitable.getAllRecords.mockResolvedValue([
        makeCheck({ status: 'checked', actual_quantity: 10 }),
      ]);
      mockBitable.batchUpdateRecords.mockRejectedValue(
        new Error('批量更新失败'),
      );

      await expect(service.resetChecks('task-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ============================================================
  // 补充测试：regenerateChecks
  // ============================================================

  describe('regenerateChecks', () => {
    it('should throw NotFoundException when task not found', async () => {
      mockBitable.getRecord.mockResolvedValue(null);

      await expect(
        service.regenerateChecks('nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should regenerate check items for task (scope all)', async () => {
      mockBitable.getRecord.mockResolvedValue(
        makeTask({
          remark: '[TASK]|2026Q1|all||tc:5|cc:3|ac:1|pg:60',
        }),
      );
      mockBitable.getAllRecords.mockResolvedValueOnce([]);
      mockBitable.getAllRecords.mockResolvedValueOnce([
        {
          recordId: 'a1',
          asset_name: '笔记本电脑',
          asset_type: '电子设备',
          current_stock: 10,
        },
        {
          recordId: 'a2',
          asset_name: '打印机',
          asset_type: '办公设备',
          current_stock: 5,
        },
      ]);
      mockBitable.batchCreateRecords.mockResolvedValue(['c1', 'c2']);
      mockBitable.batchUpdateRecords.mockResolvedValue(undefined);
      mockBitable.updateRecord.mockResolvedValue(undefined);

      const result = await service.regenerateChecks('task-1');

      expect(result.totalCount).toBe(2);
      expect(mockBitable.batchCreateRecords).toHaveBeenCalled();
      expect(mockBitable.updateRecord).toHaveBeenCalledWith(
        'inventory_tasks',
        'task-1',
        expect.objectContaining({
          status: 'in_progress',
          book_quantity: 2,
        }),
      );
    });

    it('should delete old check items before regenerating', async () => {
      mockBitable.getRecord.mockResolvedValue(
        makeTask({
          remark: '[TASK]|2026Q1|all||tc:5|cc:3|ac:1|pg:60',
        }),
      );
      mockBitable.getAllRecords.mockResolvedValueOnce([
        makeCheck({ recordId: 'old-1' }),
        makeCheck({ recordId: 'old-2' }),
      ]);
      mockBitable.getAllRecords.mockResolvedValueOnce([
        { recordId: 'a1', asset_name: '电脑', asset_type: '电子设备', current_stock: 10 },
      ]);
      mockBitable.batchDeleteRecords.mockResolvedValue(undefined);
      mockBitable.batchCreateRecords.mockResolvedValue(['c1']);
      mockBitable.batchUpdateRecords.mockResolvedValue(undefined);
      mockBitable.updateRecord.mockResolvedValue(undefined);

      const result = await service.regenerateChecks('task-1');

      expect(result.totalCount).toBe(1);
      expect(mockBitable.batchDeleteRecords).toHaveBeenCalledWith(
        'inventory_checks',
        ['old-1', 'old-2'],
      );
    });

    it('should throw BadRequestException when delete old checks fails', async () => {
      mockBitable.getRecord.mockResolvedValue(
        makeTask({
          remark: '[TASK]|2026Q1|all||tc:5|cc:3|ac:1|pg:60',
        }),
      );
      mockBitable.getAllRecords.mockResolvedValueOnce([
        makeCheck({ recordId: 'old-1' }),
      ]);
      mockBitable.batchDeleteRecords.mockRejectedValue(
        new Error('删除失败'),
      );

      await expect(service.regenerateChecks('task-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when create new checks fails', async () => {
      mockBitable.getRecord.mockResolvedValue(
        makeTask({
          remark: '[TASK]|2026Q1|all||tc:5|cc:3|ac:1|pg:60',
        }),
      );
      mockBitable.getAllRecords.mockResolvedValueOnce([]);
      mockBitable.getAllRecords.mockResolvedValueOnce([
        { recordId: 'a1', asset_name: '电脑', asset_type: '电子设备', current_stock: 10 },
      ]);
      mockBitable.batchCreateRecords.mockRejectedValue(
        new Error('创建失败'),
      );

      await expect(service.regenerateChecks('task-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should handle no assets matching scope', async () => {
      mockBitable.getRecord.mockResolvedValue(
        makeTask({
          remark: '[TASK]|2026Q1|department|nonexistent|tc:5|cc:3|ac:1|pg:60',
        }),
      );
      mockBitable.getAllRecords.mockResolvedValueOnce([]);
      mockBitable.getAllRecords.mockResolvedValueOnce([
        {
          recordId: 'a1',
          asset_name: '电脑',
          asset_type: '电子设备',
          current_stock: 10,
          purchase_department: '行政部',
        },
      ]);
      mockBitable.updateRecord.mockResolvedValue(undefined);

      const result = await service.regenerateChecks('task-1');

      expect(result.totalCount).toBe(0);
      expect(mockBitable.batchCreateRecords).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // 补充测试：remove 权限
  // ============================================================

  describe('remove 权限', () => {
    it('should throw ForbiddenException when personal scope and checker mismatch', async () => {
      mockBitable.getRecord.mockResolvedValue(
        makeTask({ checker: 'user-001' }),
      );
      mockRoles.getUserDataScope.mockResolvedValue('personal');

      await expect(service.remove('task-1', 'user-002')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should allow delete when personal scope and checker match', async () => {
      mockBitable.getRecord.mockResolvedValue(
        makeTask({ checker: 'user-001' }),
      );
      mockRoles.getUserDataScope.mockResolvedValue('personal');
      mockBitable.deleteRecord.mockResolvedValue(undefined);

      const result = await service.remove('task-1', 'user-001');

      expect(result).toEqual({ success: true });
    });
  });

  // ============================================================
  // 补充测试：getDetail 权限
  // ============================================================

  describe('getDetail 权限', () => {
    it('should throw ForbiddenException when personal scope and checker mismatch', async () => {
      mockBitable.getRecord.mockResolvedValue(
        makeTask({ checker: 'user-001' }),
      );
      mockRoles.getUserDataScope.mockResolvedValue('personal');

      await expect(
        service.getDetail('task-1', 'user-002'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ============================================================
  // 补充测试：clearAll
  // ============================================================

  describe('clearAll', () => {
    it('should clear all tasks', async () => {
      mockBitable.getAllRecords.mockResolvedValue([
        makeTask({ recordId: 't1' }),
        makeTask({ recordId: 't2', check_no: 'CK-01-0002' }),
      ]);
      mockBitable.batchDeleteRecords.mockResolvedValue(undefined);

      const result = await service.clearAll();

      expect(result.deletedCount).toBe(2);
      expect(mockBitable.batchDeleteRecords).toHaveBeenCalledWith(
        'inventory_tasks',
        ['t1', 't2'],
      );
    });

    it('should return deletedCount 0 when no tasks', async () => {
      mockBitable.getAllRecords.mockResolvedValue([]);

      const result = await service.clearAll();

      expect(result.deletedCount).toBe(0);
      expect(mockBitable.batchDeleteRecords).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // 补充测试：getChecks
  // ============================================================

  describe('getChecks', () => {
    it('should return check items for a task', async () => {
      mockBitable.getRecord.mockResolvedValue(makeTask());
      mockBitable.getAllRecords.mockResolvedValue([
        makeCheck({
          status: 'checked',
          actual_quantity: 10,
          book_quantity: 10,
        }),
        makeCheck({ recordId: 'check-2', status: 'pending' }),
      ]);

      const result = await service.getChecks('task-1');

      expect(result).toHaveLength(2);
      expect(result[0].status).toBe('checked');
      expect(result[1].status).toBe('pending');
    });

    it('should throw NotFoundException when task not found', async () => {
      mockBitable.getRecord.mockResolvedValue(null);

      await expect(service.getChecks('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when personal scope and checker mismatch', async () => {
      mockBitable.getRecord.mockResolvedValue(
        makeTask({ checker: 'user-001' }),
      );
      mockRoles.getUserDataScope.mockResolvedValue('personal');

      await expect(
        service.getChecks('task-1', 'user-002'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ============================================================
  // 补充测试：filterAssetsByScope 边界
  // ============================================================

  describe('filterAssetsByScope 边界', () => {
    it('should filter by owner when owner is a string', async () => {
      mockBitable.getAllRecords.mockResolvedValueOnce([]);
      mockBitable.getAllRecords.mockResolvedValueOnce([
        {
          recordId: 'a1',
          asset_name: '电脑',
          asset_type: '电子设备',
          current_stock: 10,
          owner: 'user-001',
        },
        {
          recordId: 'a2',
          asset_name: '打印机',
          asset_type: '办公设备',
          current_stock: 5,
          owner: 'user-002',
        },
      ]);
      mockBitable.createRecord.mockResolvedValue({ id: 'task-owner-str' });
      mockBitable.batchCreateRecords.mockResolvedValue(['c1']);
      mockBitable.batchUpdateRecords.mockResolvedValue(undefined);
      mockBitable.updateRecord.mockResolvedValue(undefined);

      const result = await service.create({
        taskName: '字符串owner测试',
        checkYear: 2026,
        checkMonth: '01',
        scopeType: 'owner',
        scopeValue: ['user-001'],
      });

      expect(result.totalCount).toBe(1);
    });

    it('should include all assets for unknown scope type (default)', async () => {
      mockBitable.getAllRecords.mockResolvedValueOnce([]);
      mockBitable.getAllRecords.mockResolvedValueOnce([
        {
          recordId: 'a1',
          asset_name: '电脑',
          asset_type: '电子设备',
          current_stock: 10,
        },
        {
          recordId: 'a2',
          asset_name: '打印机',
          asset_type: '办公设备',
          current_stock: 5,
        },
      ]);
      mockBitable.createRecord.mockResolvedValue({ id: 'task-default' });
      mockBitable.batchCreateRecords.mockResolvedValue(['c1', 'c2']);
      mockBitable.batchUpdateRecords.mockResolvedValue(undefined);
      mockBitable.updateRecord.mockResolvedValue(undefined);

      const result = await service.create({
        taskName: '默认scope测试',
        checkYear: 2026,
        checkMonth: '01',
        scopeType: 'unknown_scope' as any,
        scopeValue: ['anything'],
      });

      expect(result.totalCount).toBe(2);
    });
  });

  // ============================================================
  // 补充测试：completeTask 匹配资产
  // ============================================================

  describe('completeTask 匹配资产', () => {
    it('should match asset by assetId from ASSET_META remark', async () => {
      mockBitable.getRecord.mockResolvedValue(
        makeTask({ status: 'in_progress' }),
      );
      mockBitable.getAllRecords.mockResolvedValueOnce([
        makeCheck({
          book_quantity: 10,
          actual_quantity: 12,
          asset_name: '电脑',
          remark:
            '[ASSET_META]|电脑|电子设备|asset-match-001|user-001',
        }),
      ]);
      mockBitable.getAllRecords.mockResolvedValueOnce([
        {
          recordId: 'asset-match-001',
          asset_name: '电脑',
          current_stock: 10,
        },
      ]);
      mockBitable.updateRecord.mockResolvedValue(undefined);
      mockBitable.batchUpdateRecords.mockResolvedValue(undefined);

      const result = await service.completeTask('task-1');

      expect(result.updatedAssetCount).toBe(1);
      expect(mockBitable.batchUpdateRecords).toHaveBeenCalledWith(
        'fixed_assets',
        expect.arrayContaining([
          expect.objectContaining({ id: 'asset-match-001' }),
        ]),
      );
    });
  });
});