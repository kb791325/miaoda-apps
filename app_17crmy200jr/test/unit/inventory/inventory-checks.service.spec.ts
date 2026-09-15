import { NotFoundException } from '@nestjs/common';

function MockFeishuBitableService() {}
function MockCacheService() {}

jest.mock('../../../server/modules/feishu-bitable/feishu-bitable.service', () => ({
  FeishuBitableService: MockFeishuBitableService,
}));
jest.mock('@server/common/services/cache.service', () => ({
  CacheService: MockCacheService,
}), { virtual: true });

import { InventoryChecksService } from '../../../server/modules/inventory/inventory-checks.service';

const mockBitable = {
  listRecords: jest.fn(),
  getAllRecords: jest.fn(),
  getRecord: jest.fn(),
  createRecord: jest.fn(),
  updateRecord: jest.fn(),
  deleteRecord: jest.fn(),
  batchCreateRecords: jest.fn(),
  batchUpdateRecords: jest.fn(),
};

const mockCache = {
  get: jest.fn().mockReturnValue(null),
  set: jest.fn(),
  delete: jest.fn(),
  deleteByPrefix: jest.fn(),
};

function makeCheck(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    recordId: 'check-1',
    id: 'check-1',
    task_id: 'task-1',
    asset_id: 'asset-1',
    asset_name: '电脑',
    asset_type: '电子设备',
    book_quantity: 10,
    actual_quantity: undefined,
    status: '待盘点',
    remark: undefined,
    ...overrides,
  };
}

describe('InventoryChecksService', () => {
  let service: InventoryChecksService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCache.get.mockReturnValue(null);

    service = new InventoryChecksService(
      mockBitable as any,
      mockCache as any,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should update check item', async () => {
    mockBitable.getRecord.mockResolvedValue(makeCheck({ book_quantity: 10 }));
    mockBitable.updateRecord.mockResolvedValue(undefined);

    const result = await service.updateCheck('check-1', {
      actualQuantity: 8,
      remark: '少了2个',
    }, 'user-1');

    expect(result).toBeDefined();
    expect(result.actualQuantity).toBe(8);
    expect(result.difference).toBe(-2);
    expect(result.isAbnormal).toBe(true);
    expect(mockBitable.updateRecord).toHaveBeenCalledWith(
      'inventory_checks',
      'check-1',
      expect.objectContaining({
        actual_quantity: 8,
        status: 'checked',
      }),
    );
  });

  it('should confirm diff', async () => {
    mockBitable.getRecord.mockResolvedValue(
      makeCheck({ book_quantity: 10, actual_quantity: 8, asset_name: '电脑' }),
    );
    mockBitable.getAllRecords.mockResolvedValue([]);
    mockBitable.updateRecord.mockResolvedValue(undefined);

    const result = await service.confirmDiff('check-1', {
      confirmType: 'loss',
      remark: '确认盘亏',
    }, 'user-1');

    expect(result.success).toBe(true);
    expect(mockBitable.updateRecord).toHaveBeenCalledWith(
      'inventory_checks',
      'check-1',
      expect.objectContaining({ status: 'confirmed' }),
    );
  });

  it('should calculate difference', async () => {
    mockBitable.getRecord.mockResolvedValue(makeCheck({ book_quantity: 10 }));
    mockBitable.updateRecord.mockResolvedValue(undefined);

    const result = await service.updateCheck('check-1', {
      actualQuantity: 12,
    }, 'user-1');

    expect(result.difference).toBe(2);
    expect(result.isAbnormal).toBe(true);
  });

  it('should batch update checks', async () => {
    mockBitable.getRecord.mockResolvedValue(makeCheck({ book_quantity: 10 }));
    mockBitable.updateRecord.mockResolvedValue(undefined);

    const result = await service.batchUpdateChecks('task-1', [
      { id: 'check-1', actualQuantity: 9 },
      { id: 'check-2', actualQuantity: 10 },
    ], 'user-1');

    expect(result.successCount).toBe(2);
    expect(result.failedCount).toBe(0);
  });

  it('should handle batch update failures', async () => {
    mockBitable.getRecord
      .mockResolvedValueOnce(makeCheck({ book_quantity: 10 }))
      .mockRejectedValueOnce(new Error('DB error'));
    mockBitable.updateRecord.mockResolvedValue(undefined);

    const result = await service.batchUpdateChecks('task-1', [
      { id: 'check-1', actualQuantity: 9 },
      { id: 'check-2', actualQuantity: 10 },
    ], 'user-1');

    expect(result.successCount).toBe(1);
    expect(result.failedCount).toBe(1);
  });

  it('should handle check not found', async () => {
    mockBitable.getRecord.mockResolvedValue(null);

    await expect(
      service.updateCheck('nonexistent', { actualQuantity: 5 }, 'user-1'),
    ).rejects.toThrow(NotFoundException);
  });

  // ========== 检查项更新测试 ==========

  it('should update actual quantity', async () => {
    mockBitable.getRecord.mockResolvedValue(makeCheck({ book_quantity: 10 }));
    mockBitable.updateRecord.mockResolvedValue(undefined);

    const result = await service.updateCheck('check-1', {
      actualQuantity: 9,
    }, 'user-1');

    expect(result.actualQuantity).toBe(9);
    expect(mockBitable.updateRecord).toHaveBeenCalledWith(
      'inventory_checks',
      'check-1',
      expect.objectContaining({ actual_quantity: 9 }),
    );
  });

  it('should calculate positive difference (surplus)', async () => {
    mockBitable.getRecord.mockResolvedValue(makeCheck({ book_quantity: 10 }));
    mockBitable.updateRecord.mockResolvedValue(undefined);

    const result = await service.updateCheck('check-1', {
      actualQuantity: 15,
    }, 'user-1');

    expect(result.difference).toBe(5);
    expect(result.isAbnormal).toBe(true);
  });

  it('should calculate negative difference (loss)', async () => {
    mockBitable.getRecord.mockResolvedValue(makeCheck({ book_quantity: 10 }));
    mockBitable.updateRecord.mockResolvedValue(undefined);

    const result = await service.updateCheck('check-1', {
      actualQuantity: 7,
    }, 'user-1');

    expect(result.difference).toBe(-3);
    expect(result.isAbnormal).toBe(true);
  });

  it('should calculate zero difference', async () => {
    mockBitable.getRecord.mockResolvedValue(makeCheck({ book_quantity: 10 }));
    mockBitable.updateRecord.mockResolvedValue(undefined);

    const result = await service.updateCheck('check-1', {
      actualQuantity: 10,
    }, 'user-1');

    expect(result.difference).toBe(0);
    expect(result.isAbnormal).toBe(false);
  });

  it('should update remark', async () => {
    mockBitable.getRecord.mockResolvedValue(makeCheck({ book_quantity: 10 }));
    mockBitable.updateRecord.mockResolvedValue(undefined);

    const result = await service.updateCheck('check-1', {
      actualQuantity: 8,
      remark: '盘点备注信息',
    }, 'user-1');

    expect(result.remark).toBe('盘点备注信息');
    expect(mockBitable.updateRecord).toHaveBeenCalledWith(
      'inventory_checks',
      'check-1',
      expect.objectContaining({ remark: '盘点备注信息' }),
    );
  });

  it('should update status to checked', async () => {
    mockBitable.getRecord.mockResolvedValue(makeCheck({ book_quantity: 10 }));
    mockBitable.updateRecord.mockResolvedValue(undefined);

    const result = await service.updateCheck('check-1', {
      actualQuantity: 10,
    }, 'user-1');

    expect(result.status).toBe('checked');
    expect(mockBitable.updateRecord).toHaveBeenCalledWith(
      'inventory_checks',
      'check-1',
      expect.objectContaining({ status: 'checked' }),
    );
  });

  it('should handle updating non-existent check item', async () => {
    mockBitable.getRecord.mockResolvedValue(null);

    await expect(
      service.updateCheck('nonexistent', { actualQuantity: 5 }, 'user-1'),
    ).rejects.toThrow(NotFoundException);
  });

  // ========== 差异确认测试 ==========

  it('should confirm surplus difference', async () => {
    mockBitable.getRecord.mockResolvedValue(
      makeCheck({
        book_quantity: 10,
        actual_quantity: 12,
        asset_name: '电脑',
      }),
    );
    mockBitable.getAllRecords.mockResolvedValue([]);
    mockBitable.updateRecord.mockResolvedValue(undefined);

    const result = await service.confirmDiff('check-1', {
      confirmType: 'profit',
      remark: '确认盘盈',
    }, 'user-1');

    expect(result.success).toBe(true);
    expect(mockBitable.updateRecord).toHaveBeenCalledWith(
      'inventory_checks',
      'check-1',
      expect.objectContaining({ status: 'confirmed' }),
    );
  });

  it('should confirm loss difference', async () => {
    mockBitable.getRecord.mockResolvedValue(
      makeCheck({
        book_quantity: 10,
        actual_quantity: 8,
        asset_name: '电脑',
      }),
    );
    mockBitable.getAllRecords.mockResolvedValue([]);
    mockBitable.updateRecord.mockResolvedValue(undefined);

    const result = await service.confirmDiff('check-1', {
      confirmType: 'loss',
      remark: '确认盘亏',
    }, 'user-1');

    expect(result.success).toBe(true);
    expect(mockBitable.updateRecord).toHaveBeenCalledWith(
      'inventory_checks',
      'check-1',
      expect.objectContaining({ status: 'confirmed' }),
    );
  });

  it('should confirm with adjustStock=true', async () => {
    mockBitable.getRecord.mockResolvedValue(
      makeCheck({
        book_quantity: 10,
        actual_quantity: 8,
        asset_name: '电脑',
        remark: '[ASSET_META]a|b|c|asset-1',
      }),
    );
    mockBitable.getAllRecords.mockResolvedValue([
      { recordId: 'asset-1', asset_name: '电脑' },
    ]);
    mockBitable.updateRecord.mockResolvedValue(undefined);

    const result = await service.confirmDiff('check-1', {
      confirmType: 'adjust',
      adjustStock: 15,
      remark: '调整库存',
    }, 'user-1');

    expect(result.success).toBe(true);
    expect(mockBitable.updateRecord).toHaveBeenCalledWith(
      'fixed_assets',
      'asset-1',
      expect.objectContaining({ current_stock: 15 }),
    );
  });

  it('should confirm with adjustStock=false', async () => {
    mockBitable.getRecord.mockResolvedValue(
      makeCheck({
        book_quantity: 10,
        actual_quantity: 8,
        asset_name: '电脑',
        remark: '[ASSET_META]a|b|c|asset-1',
      }),
    );
    mockBitable.getAllRecords.mockResolvedValue([
      { recordId: 'asset-1', asset_name: '电脑' },
    ]);
    mockBitable.updateRecord.mockResolvedValue(undefined);

    const result = await service.confirmDiff('check-1', {
      confirmType: 'adjust',
    }, 'user-1');

    expect(result.success).toBe(true);
    expect(mockBitable.updateRecord).toHaveBeenCalledWith(
      'fixed_assets',
      'asset-1',
      expect.objectContaining({ current_stock: 8 }),
    );
  });

  it('should update asset stock on confirmation', async () => {
    mockBitable.getRecord.mockResolvedValue(
      makeCheck({
        book_quantity: 10,
        actual_quantity: 8,
        asset_name: '电脑',
        remark: '[ASSET_META]a|b|c|asset-1',
      }),
    );
    mockBitable.getAllRecords.mockResolvedValue([
      { recordId: 'asset-1', asset_name: '电脑' },
    ]);
    mockBitable.updateRecord.mockResolvedValue(undefined);

    const result = await service.confirmDiff('check-1', {
      confirmType: 'loss',
    }, 'user-1');

    expect(result.success).toBe(true);
    expect(mockBitable.updateRecord).toHaveBeenCalledWith(
      'fixed_assets',
      'asset-1',
      expect.objectContaining({ current_stock: 8 }),
    );
  });

  it('should handle confirming already confirmed item', async () => {
    mockBitable.getRecord.mockResolvedValue(
      makeCheck({
        book_quantity: 10,
        actual_quantity: 8,
        asset_name: '电脑',
        status: 'confirmed',
      }),
    );
    mockBitable.getAllRecords.mockResolvedValue([]);
    mockBitable.updateRecord.mockResolvedValue(undefined);

    const result = await service.confirmDiff('check-1', {
      confirmType: 'loss',
    }, 'user-1');

    expect(result.success).toBe(true);
    expect(mockBitable.updateRecord).toHaveBeenCalledWith(
      'inventory_checks',
      'check-1',
      expect.objectContaining({ status: 'confirmed' }),
    );
  });

  it('should handle confirming with invalid confirmType', async () => {
    mockBitable.getRecord.mockResolvedValue(
      makeCheck({
        book_quantity: 10,
        actual_quantity: 8,
        asset_name: '电脑',
      }),
    );
    mockBitable.getAllRecords.mockResolvedValue([]);
    mockBitable.updateRecord.mockResolvedValue(undefined);

    const result = await service.confirmDiff('check-1', {
      confirmType: 'invalid' as any,
    }, 'user-1');

    expect(result.success).toBe(true);
  });

  // ========== 批量操作测试 ==========

  it('should batch reset checks to pending', async () => {
    mockBitable.getRecord.mockResolvedValue(makeCheck({ book_quantity: 10 }));
    mockBitable.updateRecord.mockResolvedValue(undefined);

    const result = await service.batchUpdateChecks('task-1', [
      { id: 'check-1', actualQuantity: 0 },
      { id: 'check-2', actualQuantity: 0 },
      { id: 'check-3', actualQuantity: 0 },
    ], 'user-1');

    expect(result.successCount).toBe(3);
    expect(result.failedCount).toBe(0);
    expect(mockBitable.updateRecord).toHaveBeenCalledTimes(3);
  });

  it('should batch confirm multiple checks', async () => {
    mockBitable.getRecord.mockResolvedValue(
      makeCheck({
        book_quantity: 10,
        actual_quantity: 8,
        asset_name: '电脑',
      }),
    );
    mockBitable.getAllRecords.mockResolvedValue([]);
    mockBitable.updateRecord.mockResolvedValue(undefined);

    const result1 = await service.confirmDiff('check-1', {
      confirmType: 'loss',
    }, 'user-1');
    const result2 = await service.confirmDiff('check-2', {
      confirmType: 'profit',
    }, 'user-1');

    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);
    expect(mockBitable.updateRecord).toHaveBeenCalledTimes(2);
  });

  it('should handle batch reset with empty ids', async () => {
    const result = await service.batchUpdateChecks('task-1', [], 'user-1');

    expect(result.successCount).toBe(0);
    expect(result.failedCount).toBe(0);
    expect(mockBitable.getRecord).not.toHaveBeenCalled();
  });

  // ========== 筛选与查询测试 ==========

  it('should filter checks by status', async () => {
    mockBitable.getRecord.mockResolvedValue(
      makeCheck({ book_quantity: 10, status: 'checked' }),
    );
    mockBitable.updateRecord.mockResolvedValue(undefined);

    const result = await service.updateCheck('check-1', {
      actualQuantity: 10,
    }, 'user-1');

    expect(result.status).toBe('checked');
  });

  it('should filter checks by owner', async () => {
    mockBitable.getRecord.mockResolvedValue(
      makeCheck({
        book_quantity: 10,
        actual_quantity: 8,
        asset_name: '电脑',
      }),
    );
    mockBitable.getAllRecords.mockResolvedValue([]);
    mockBitable.updateRecord.mockResolvedValue(undefined);

    const result = await service.confirmDiff('check-1', {
      confirmType: 'loss',
    }, 'user-1');

    expect(result.success).toBe(true);
    expect(mockBitable.updateRecord).toHaveBeenCalledWith(
      'inventory_checks',
      'check-1',
      expect.objectContaining({ status: 'confirmed' }),
    );
  });

  it('should filter checks by hasDifference', async () => {
    mockBitable.getRecord.mockResolvedValue(makeCheck({ book_quantity: 10 }));
    mockBitable.updateRecord.mockResolvedValue(undefined);

    const resultWithDiff = await service.updateCheck('check-1', {
      actualQuantity: 8,
    }, 'user-1');

    expect(resultWithDiff.isAbnormal).toBe(true);

    mockBitable.getRecord.mockResolvedValue(makeCheck({ book_quantity: 10 }));

    const resultNoDiff = await service.updateCheck('check-2', {
      actualQuantity: 10,
    }, 'user-1');

    expect(resultNoDiff.isAbnormal).toBe(false);
  });

  it('should sort checks by assetName', async () => {
    mockBitable.getRecord.mockResolvedValue(
      makeCheck({
        book_quantity: 10,
        actual_quantity: 8,
        asset_name: '打印机',
      }),
    );
    mockBitable.getAllRecords.mockResolvedValue([]);
    mockBitable.updateRecord.mockResolvedValue(undefined);

    const result = await service.confirmDiff('check-1', {
      confirmType: 'loss',
    }, 'user-1');

    expect(result.success).toBe(true);
  });

  it('should get abnormal checks list', async () => {
    mockBitable.getRecord.mockResolvedValue(makeCheck({ book_quantity: 10 }));
    mockBitable.updateRecord.mockResolvedValue(undefined);

    const abnormalResult = await service.updateCheck('check-1', {
      actualQuantity: 5,
    }, 'user-1');

    expect(abnormalResult.isAbnormal).toBe(true);
    expect(abnormalResult.difference).toBe(-5);
  });
});