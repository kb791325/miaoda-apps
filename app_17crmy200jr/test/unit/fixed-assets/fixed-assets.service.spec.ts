import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { AssetStatus } from '@shared/api.interface';

function MockFeishuBitableService() {}
function MockCacheService() {}
function MockAuthNPaasService() {}

jest.mock('../../../server/modules/feishu-bitable/feishu-bitable.service', () => ({
  FeishuBitableService: MockFeishuBitableService,
}));
jest.mock('@server/common/services/cache.service', () => ({
  CacheService: MockCacheService,
}), { virtual: true });
jest.mock('@server/common/constants/pagination', () => ({
  DEFAULT_PAGE_SIZE: 20,
}), { virtual: true });

import { FixedAssetsService } from '../../../server/modules/fixed-assets/fixed-assets.service';

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

const mockAuthn = {
  listUsersByIds: jest.fn().mockResolvedValue([]),
};

const mockCache = {
  get: jest.fn().mockReturnValue(null),
  set: jest.fn(),
  delete: jest.fn(),
  deleteByPrefix: jest.fn(),
};

function makeRecord(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    recordId: 'asset-1',
    id: 'asset-1',
    asset_name: '电脑',
    asset_type: '电子设备',
    asset_category: '',
    purchase_date: '2026-01-01',
    purchase_amount: 5000,
    purchase_department: '',
    payer_entity: '',
    floor: '3F',
    handler: '',
    owner: '',
    current_stock: 1,
    asset_status: '在库',
    config_depreciation: 36,
    ...overrides,
  };
}

describe('FixedAssetsService', () => {
  let service: FixedAssetsService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCache.get.mockReturnValue(null);
    mockAuthn.listUsersByIds.mockResolvedValue([]);

    service = new FixedAssetsService(
      mockBitable as any,
      mockAuthn as any,
      mockCache as any,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create asset', async () => {
    mockBitable.createRecord.mockResolvedValue({ id: 'asset-1' });

    const result = await service.create({
      assetName: '电脑',
      assetType: '电子设备',
      assetCategory: '',
      purchaseDate: '2026-01-01',
      purchaseAmount: 5000,
    } as Parameters<FixedAssetsService['create']>[0]);

    expect(result).toEqual({ id: 'asset-1' });
    expect(mockBitable.createRecord).toHaveBeenCalledWith(
      'fixed_assets',
      expect.objectContaining({
        asset_name: '电脑',
        asset_type: '电子设备',
        purchase_date: '2026-01-01',
        purchase_amount: 5000,
      }),
    );
  });

  it('should find all assets', async () => {
    mockBitable.listRecords.mockResolvedValue({ items: [], total: 0 });

    const result = await service.getList({ page: 1, pageSize: 10 });

    expect(result).toEqual({ items: [], total: 0 });
    expect(mockBitable.listRecords).toHaveBeenCalledWith(
      expect.objectContaining({ domain: 'fixed_assets', page: 1, pageSize: 10 }),
    );
  });

  it('should find asset by id', async () => {
    mockBitable.getRecord.mockResolvedValue(
      makeRecord({ asset_name: '笔记本电脑', asset_type: '电子设备' }),
    );

    const detail = await service.getDetail('asset-1');

    expect(detail).toBeDefined();
    expect(detail.id).toBe('asset-1');
    expect(detail.assetName).toBe('笔记本电脑');
    expect(detail.assetType).toBe('电子设备');
    expect(detail.purchaseAmount).toBe(5000);
    expect(detail.assetStatus).toBe('in_stock');
  });

  it('should update asset', async () => {
    mockBitable.getRecord.mockResolvedValue(makeRecord());
    mockBitable.updateRecord.mockResolvedValue(undefined);

    const result = await service.update('asset-1', {
      assetName: '新电脑',
    } as Parameters<FixedAssetsService['update']>[1]);

    expect(result).toEqual({ success: true });
    expect(mockBitable.updateRecord).toHaveBeenCalledWith(
      'fixed_assets',
      'asset-1',
      expect.objectContaining({ asset_name: '新电脑' }),
    );
  });

  it('should delete asset', async () => {
    mockBitable.getRecord.mockResolvedValue(makeRecord());
    mockBitable.deleteRecord.mockResolvedValue(undefined);

    const result = await service.remove('asset-1');

    expect(result).toEqual({ success: true });
    expect(mockBitable.deleteRecord).toHaveBeenCalledWith('fixed_assets', 'asset-1');
  });

  it('should borrow asset', async () => {
    mockBitable.getRecord.mockResolvedValue(
      makeRecord({ asset_status: '在库', current_stock: 5, id: 'asset-1' }),
    );
    mockBitable.updateRecord.mockResolvedValue(undefined);

    const result = await service.borrowAsset('asset-1', {
      userId: 'u1',
      targetUserId: 'u2',
    });

    expect(result.success).toBe(true);
    expect(result.assetStatus).toBe('in_use');
    expect(mockBitable.updateRecord).toHaveBeenCalledWith(
      'fixed_assets',
      'asset-1',
      expect.objectContaining({
        asset_status: '在用',
        owner: 'u2',
        current_stock: 4,
      }),
    );
  });

  it('should return asset', async () => {
    mockBitable.getRecord.mockResolvedValue(
      makeRecord({ asset_status: '在用', current_stock: 3, id: 'asset-1', owner: 'u2' }),
    );
    mockBitable.updateRecord.mockResolvedValue(undefined);

    const result = await service.returnAsset('asset-1', {
      userId: 'u1',
    });

    expect(result.success).toBe(true);
    expect(result.assetStatus).toBe('in_stock');
    expect(mockBitable.updateRecord).toHaveBeenCalledWith(
      'fixed_assets',
      'asset-1',
      expect.objectContaining({
        asset_status: '在库',
        current_stock: 4,
      }),
    );
  });

  it('should scrap asset', async () => {
    mockBitable.getRecord.mockResolvedValue(
      makeRecord({ asset_status: '在库', id: 'asset-1' }),
    );
    mockBitable.updateRecord.mockResolvedValue(undefined);

    const result = await service.scrapAsset('asset-1', {
      userId: 'u1',
      reason: '损坏',
    });

    expect(result.success).toBe(true);
    expect(result.assetStatus).toBe('scrapped');
  });

  it('should calculate depreciation', async () => {
    mockBitable.getRecord.mockResolvedValue(
      makeRecord({
        id: 'asset-1',
        asset_name: '服务器',
        purchase_date: '2023-01-01',
        purchase_amount: 36000,
        config_depreciation: 36,
      }),
    );

    const detail = await service.getDetail('asset-1');

    expect(detail.depreciationMonths).toBe(36);
    expect(detail.monthlyDepreciation).toBe(1000);
    expect(detail.accumulatedDepreciation).toBeGreaterThan(0);
    expect(detail.netValue).toBeLessThan(36000);
  });

  it('should handle invalid status transition', async () => {
    mockBitable.getRecord.mockResolvedValue(
      makeRecord({ asset_status: '报废', id: 'asset-1' }),
    );

    await expect(
      service.borrowAsset('asset-1', {
        userId: 'u1',
        targetUserId: 'u2',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  // === 状态流转测试 ===

  it('should transfer asset to another user', async () => {
    mockBitable.getRecord.mockResolvedValue(
      makeRecord({ asset_status: '在库', id: 'asset-1' }),
    );
    mockBitable.updateRecord.mockResolvedValue(undefined);

    const result = await service.startTransfer('asset-1', {
      userId: 'u1',
      targetUserId: 'u2',
      reason: '人员调拨',
    });

    expect(result.success).toBe(true);
    expect(result.assetStatus).toBe('transferring');
    expect(mockBitable.updateRecord).toHaveBeenCalledWith(
      'fixed_assets',
      'asset-1',
      expect.objectContaining({
        asset_status: '转移中',
      }),
    );
  });

  it('should transfer asset to another department', async () => {
    mockBitable.getRecord.mockResolvedValue(
      makeRecord({ asset_status: '在库', id: 'asset-1' }),
    );
    mockBitable.updateRecord.mockResolvedValue(undefined);

    const result = await service.startTransfer('asset-1', {
      userId: 'u1',
      targetDepartment: '研发部',
      reason: '部门调拨',
    });

    expect(result.success).toBe(true);
    expect(result.assetStatus).toBe('transferring');
  });

  it('should transfer asset to another floor', async () => {
    mockBitable.getRecord.mockResolvedValue(
      makeRecord({ asset_status: '在库', id: 'asset-1' }),
    );
    mockBitable.updateRecord.mockResolvedValue(undefined);

    const result = await service.startTransfer('asset-1', {
      userId: 'u1',
      targetFloor: '5F',
      reason: '楼层调拨',
    });

    expect(result.success).toBe(true);
    expect(result.assetStatus).toBe('transferring');
    expect(mockBitable.updateRecord).toHaveBeenCalledWith(
      'fixed_assets',
      'asset-1',
      expect.objectContaining({
        asset_status: '转移中',
        floor: '5F',
      }),
    );
  });

  it('should send asset to repair', async () => {
    mockBitable.getRecord.mockResolvedValue(
      makeRecord({ asset_status: '在库', id: 'asset-1' }),
    );
    mockBitable.updateRecord.mockResolvedValue(undefined);

    const result = await service.startRepair('asset-1', {
      userId: 'u1',
      reason: '屏幕损坏',
    });

    expect(result.success).toBe(true);
    expect(result.assetStatus).toBe('repairing');
    expect(mockBitable.updateRecord).toHaveBeenCalledWith(
      'fixed_assets',
      'asset-1',
      expect.objectContaining({
        asset_status: '维修',
      }),
    );
  });

  it('should complete asset repair', async () => {
    mockBitable.getRecord.mockResolvedValue(
      makeRecord({ asset_status: '维修', id: 'asset-1' }),
    );
    mockBitable.updateRecord.mockResolvedValue(undefined);

    const result = await service.completeRepair('asset-1', {
      userId: 'u1',
      actualCost: 500,
    });

    expect(result.success).toBe(true);
    expect(result.assetStatus).toBe('in_stock');
    expect(mockBitable.updateRecord).toHaveBeenCalledWith(
      'fixed_assets',
      'asset-1',
      expect.objectContaining({
        asset_status: '在库',
      }),
    );
  });

  it('should handle borrow already scrapped asset', async () => {
    mockBitable.getRecord.mockResolvedValue(
      makeRecord({ asset_status: '报废', id: 'asset-1' }),
    );

    await expect(
      service.borrowAsset('asset-1', {
        userId: 'u1',
        targetUserId: 'u2',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should handle scrap already scrapped asset', async () => {
    mockBitable.getRecord.mockResolvedValue(
      makeRecord({ asset_status: '报废', id: 'asset-1' }),
    );

    await expect(
      service.scrapAsset('asset-1', {
        userId: 'u1',
        reason: '重复报废',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  // === 筛选与查询测试 ===

  it('should filter assets by assetType', async () => {
    mockBitable.listRecords.mockResolvedValue({ items: [], total: 0 });

    await service.getList({ page: 1, pageSize: 10, assetType: '电子设备' });

    expect(mockBitable.listRecords).toHaveBeenCalledWith(
      expect.objectContaining({
        domain: 'fixed_assets',
        filter: expect.objectContaining({
          conditions: expect.arrayContaining([
            expect.objectContaining({
              fieldName: '资产类型',
              value: ['电子设备'],
            }),
          ]),
        }),
      }),
    );
  });

  it('should filter assets by owner', async () => {
    mockBitable.listRecords.mockResolvedValue({ items: [], total: 0 });

    await service.getList({ page: 1, pageSize: 10, owner: 'u1' });

    expect(mockBitable.listRecords).toHaveBeenCalledWith(
      expect.objectContaining({
        domain: 'fixed_assets',
        page: 1,
        pageSize: 10,
      }),
    );
  });

  it('should filter assets by floor', async () => {
    mockBitable.listRecords.mockResolvedValue({ items: [], total: 0 });

    await service.getList({ page: 1, pageSize: 10, floor: '3F' });

    expect(mockBitable.listRecords).toHaveBeenCalledWith(
      expect.objectContaining({
        domain: 'fixed_assets',
        filter: expect.objectContaining({
          conditions: expect.arrayContaining([
            expect.objectContaining({
              fieldName: '使用楼层',
              value: ['3F'],
            }),
          ]),
        }),
      }),
    );
  });

  it('should search assets by name', async () => {
    mockBitable.listRecords.mockResolvedValue({ items: [], total: 0 });

    await service.getList({ page: 1, pageSize: 10, keyword: '电脑' });

    expect(mockBitable.listRecords).toHaveBeenCalledWith(
      expect.objectContaining({
        domain: 'fixed_assets',
        filter: expect.objectContaining({
          conditions: expect.arrayContaining([
            expect.objectContaining({
              fieldName: '资产名称',
              operator: 'contains',
              value: ['电脑'],
            }),
          ]),
        }),
      }),
    );
  });

  it('should sort assets by purchaseDate', async () => {
    mockBitable.listRecords.mockResolvedValue({ items: [], total: 0 });

    await service.getList({ page: 1, pageSize: 10, sortOrder: 'asc' });

    expect(mockBitable.listRecords).toHaveBeenCalledWith(
      expect.objectContaining({
        domain: 'fixed_assets',
        sort: expect.arrayContaining([
          expect.objectContaining({
            fieldName: '采购日期',
            desc: false,
          }),
        ]),
      }),
    );
  });

  it('should sort assets by purchaseAmount', async () => {
    mockBitable.listRecords.mockResolvedValue({ items: [], total: 0 });

    await service.getList({
      page: 1,
      pageSize: 10,
      sortBy: 'purchaseAmount',
      sortOrder: 'desc',
    });

    expect(mockBitable.listRecords).toHaveBeenCalledWith(
      expect.objectContaining({
        domain: 'fixed_assets',
        sort: expect.arrayContaining([
          expect.objectContaining({
            fieldName: '采购金额',
            desc: true,
          }),
        ]),
      }),
    );
  });

  // === 折旧计算测试 ===

  it('should calculate monthly depreciation correctly', async () => {
    mockBitable.getRecord.mockResolvedValue(
      makeRecord({
        id: 'asset-1',
        purchase_date: '2026-01-01',
        purchase_amount: 36000,
        config_depreciation: 36,
      }),
    );

    const detail = await service.getDetail('asset-1');

    expect(detail.monthlyDepreciation).toBe(1000);
    expect(detail.depreciationMonths).toBe(36);
  });

  it('should calculate accumulated depreciation', async () => {
    mockBitable.getRecord.mockResolvedValue(
      makeRecord({
        id: 'asset-1',
        purchase_date: '2024-09-01',
        purchase_amount: 36000,
        config_depreciation: 36,
      }),
    );

    const detail = await service.getDetail('asset-1');

    expect(detail.accumulatedDepreciation).toBeGreaterThan(0);
    expect(detail.originalValue).toBe(36000);
  });

  it('should calculate net value', async () => {
    mockBitable.getRecord.mockResolvedValue(
      makeRecord({
        id: 'asset-1',
        purchase_date: '2025-01-01',
        purchase_amount: 36000,
        config_depreciation: 36,
      }),
    );

    const detail = await service.getDetail('asset-1');

    expect(detail.netValue).toBeLessThan(36000);
    expect(detail.netValue).toBeGreaterThan(0);
    expect(detail.netValue).toBe(
      detail.originalValue - detail.accumulatedDepreciation,
    );
  });

  it('should handle asset with zero original value', async () => {
    mockBitable.getRecord.mockResolvedValue(
      makeRecord({
        id: 'asset-1',
        purchase_amount: 0,
        config_depreciation: 36,
      }),
    );

    const detail = await service.getDetail('asset-1');

    expect(detail.monthlyDepreciation).toBe(0);
    expect(detail.accumulatedDepreciation).toBe(0);
    expect(detail.netValue).toBe(0);
  });

  it('should handle fully depreciated asset', async () => {
    mockBitable.getRecord.mockResolvedValue(
      makeRecord({
        id: 'asset-1',
        purchase_date: '2020-01-01',
        purchase_amount: 36000,
        config_depreciation: 36,
      }),
    );

    const detail = await service.getDetail('asset-1');

    expect(detail.accumulatedDepreciation).toBe(36000);
    expect(detail.netValue).toBe(0);
  });

  // === 库存与预警测试 ===

  it('should handle stock update', async () => {
    mockBitable.getRecord.mockResolvedValue(
      makeRecord({ id: 'asset-1', current_stock: 5 }),
    );
    mockBitable.updateRecord.mockResolvedValue(undefined);

    const result = await service.update('asset-1', { currentStock: 10 });

    expect(result).toEqual({ success: true });
    expect(mockBitable.updateRecord).toHaveBeenCalledWith(
      'fixed_assets',
      'asset-1',
      expect.objectContaining({ current_stock: 10 }),
    );
  });

  // === 批量操作测试 ===

  it('should batch update asset status', async () => {
    mockBitable.getRecord.mockResolvedValue(
      makeRecord({ asset_status: '在库', id: 'asset-1' }),
    );
    mockBitable.updateRecord.mockResolvedValue(undefined);

    const result = await service.batchScrap(
      ['asset-1', 'asset-2'],
      'u1',
      '批量报废',
    );

    expect(result.successCount).toBe(2);
    expect(result.failedCount).toBe(0);
  });

  // === 汇总统计测试 ===

  it('should get asset summary', async () => {
    mockBitable.getAllRecords.mockResolvedValue([
      makeRecord({ asset_status: '在库', purchase_amount: 10000, purchase_date: '2026-01-01' }),
      makeRecord({ asset_status: '在用', purchase_amount: 20000, purchase_date: '2025-06-01' }),
    ]);

    const result = await service.getSummary({});

    expect(result.totalCount).toBe(2);
    expect(result.totalValue).toBe(30000);
    expect(result.inStockCount).toBe(1);
    expect(result.inUseCount).toBe(1);
  });

  it('should get filtered summary', async () => {
    mockBitable.getAllRecords.mockResolvedValue([
      makeRecord({ asset_type: '电子设备', asset_status: '在库', purchase_amount: 5000, purchase_date: '2026-01-01' }),
    ]);

    const result = await service.getSummary({ assetType: '电子设备' });

    expect(result.totalCount).toBe(1);
    expect(result.totalValue).toBe(5000);
    expect(mockBitable.getAllRecords).toHaveBeenCalledWith(
      'fixed_assets',
      expect.objectContaining({
        conditions: expect.arrayContaining([
          expect.objectContaining({ fieldName: '资产类型', value: ['电子设备'] }),
        ]),
      }),
    );
  });

  // === 状态流转补充测试 ===

  it('should complete transfer', async () => {
    mockBitable.getRecord.mockResolvedValue(
      makeRecord({ asset_status: '转移中', id: 'asset-1' }),
    );
    mockBitable.updateRecord.mockResolvedValue(undefined);

    const result = await service.completeTransfer('asset-1', {
      userId: 'u1',
      targetFloor: '5F',
    });

    expect(result.success).toBe(true);
    expect(result.assetStatus).toBe('in_stock');
    expect(mockBitable.updateRecord).toHaveBeenCalledWith(
      'fixed_assets',
      'asset-1',
      expect.objectContaining({
        asset_status: '在库',
        floor: '5F',
      }),
    );
  });

  it('should reject completeTransfer when not transferring', async () => {
    mockBitable.getRecord.mockResolvedValue(
      makeRecord({ asset_status: '在库', id: 'asset-1' }),
    );

    await expect(
      service.completeTransfer('asset-1', { userId: 'u1' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should update owner on borrow', async () => {
    mockBitable.getRecord.mockResolvedValue(
      makeRecord({ asset_status: '在库', current_stock: 5, id: 'asset-1' }),
    );
    mockBitable.updateRecord.mockResolvedValue(undefined);

    await service.borrowAsset('asset-1', {
      userId: 'u1',
      targetUserId: 'u2',
    });

    expect(mockBitable.updateRecord).toHaveBeenCalledWith(
      'fixed_assets',
      'asset-1',
      expect.objectContaining({ owner: 'u2' }),
    );
  });

  it('should clear owner on return', async () => {
    mockBitable.getRecord.mockResolvedValue(
      makeRecord({ asset_status: '在用', current_stock: 3, id: 'asset-1', owner: 'u2' }),
    );
    mockBitable.updateRecord.mockResolvedValue(undefined);

    await service.returnAsset('asset-1', { userId: 'u1' });

    expect(mockBitable.updateRecord).toHaveBeenCalledWith(
      'fixed_assets',
      'asset-1',
      expect.objectContaining({ owner: '' }),
    );
  });

  it('should start repair from in_use status', async () => {
    mockBitable.getRecord.mockResolvedValue(
      makeRecord({ asset_status: '在用', id: 'asset-1' }),
    );
    mockBitable.updateRecord.mockResolvedValue(undefined);

    const result = await service.startRepair('asset-1', {
      userId: 'u1',
      reason: '键盘故障',
    });

    expect(result.success).toBe(true);
    expect(result.assetStatus).toBe('repairing');
  });

  it('should reject startRepair from scrapped status', async () => {
    mockBitable.getRecord.mockResolvedValue(
      makeRecord({ asset_status: '报废', id: 'asset-1' }),
    );

    await expect(
      service.startRepair('asset-1', { userId: 'u1', reason: '测试' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should reject completeRepair when not repairing', async () => {
    mockBitable.getRecord.mockResolvedValue(
      makeRecord({ asset_status: '在库', id: 'asset-1' }),
    );

    await expect(
      service.completeRepair('asset-1', { userId: 'u1' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should reject startTransfer when scrapped', async () => {
    mockBitable.getRecord.mockResolvedValue(
      makeRecord({ asset_status: '报废', id: 'asset-1' }),
    );

    await expect(
      service.startTransfer('asset-1', {
        userId: 'u1',
        targetUserId: 'u2',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should reject return when not in_use', async () => {
    mockBitable.getRecord.mockResolvedValue(
      makeRecord({ asset_status: '在库', id: 'asset-1' }),
    );

    await expect(
      service.returnAsset('asset-1', { userId: 'u1' }),
    ).rejects.toThrow(BadRequestException);
  });

  // === 库存管理测试 ===

  it('should handle borrow when stock is zero', async () => {
    mockBitable.getRecord.mockResolvedValue(
      makeRecord({ asset_status: '在库', current_stock: 0, id: 'asset-1' }),
    );
    mockBitable.updateRecord.mockResolvedValue(undefined);

    const result = await service.borrowAsset('asset-1', {
      userId: 'u1',
      targetUserId: 'u2',
    });

    expect(result.success).toBe(true);
    expect(result.assetStatus).toBe('in_use');
    expect(mockBitable.updateRecord).toHaveBeenCalledWith(
      'fixed_assets',
      'asset-1',
      expect.objectContaining({ current_stock: 0 }),
    );
  });

  it('should calculate total stock value in summary', async () => {
    mockBitable.getAllRecords.mockResolvedValue([
      makeRecord({ asset_status: '在库', purchase_amount: 10000, purchase_date: '2026-01-01' }),
      makeRecord({ asset_status: '在库', purchase_amount: 5000, purchase_date: '2026-01-01' }),
    ]);

    const result = await service.getSummary({});

    expect(result.totalValue).toBe(15000);
  });

  // === 筛选与查询补充测试 ===

  it('should filter by multiple conditions', async () => {
    mockBitable.listRecords.mockResolvedValue({ items: [], total: 0 });

    await service.getList({
      page: 1,
      pageSize: 10,
      assetType: '电子设备',
      floor: '3F',
      keyword: '电脑',
    });

    expect(mockBitable.listRecords).toHaveBeenCalledWith(
      expect.objectContaining({
        filter: expect.objectContaining({
          conditions: expect.arrayContaining([
            expect.objectContaining({ fieldName: '资产类型', value: ['电子设备'] }),
            expect.objectContaining({ fieldName: '使用楼层', value: ['3F'] }),
            expect.objectContaining({ fieldName: '资产名称', operator: 'contains', value: ['电脑'] }),
          ]),
        }),
      }),
    );
  });

  it('should sort by asset name ascending', async () => {
    mockBitable.listRecords.mockResolvedValue({ items: [], total: 0 });

    await service.getList({
      page: 1,
      pageSize: 10,
      sortBy: 'assetName',
      sortOrder: 'asc',
    });

    expect(mockBitable.listRecords).toHaveBeenCalledWith(
      expect.objectContaining({
        sort: expect.arrayContaining([
          expect.objectContaining({
            fieldName: '资产名称',
            desc: false,
          }),
        ]),
      }),
    );
  });

  it('should handle empty filter result', async () => {
    mockBitable.listRecords.mockResolvedValue({ items: [], total: 0 });

    const result = await service.getList({ page: 1, pageSize: 10, floor: '99F' });

    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
  });

  it('should handle large pagination offset', async () => {
    mockBitable.listRecords.mockResolvedValue({ items: [], total: 100 });

    const result = await service.getList({ page: 100, pageSize: 10 });

    expect(result.items).toEqual([]);
    expect(result.total).toBe(100);
  });

  it('should search by partial name match', async () => {
    mockBitable.listRecords.mockResolvedValue({ items: [], total: 0 });

    await service.getList({ page: 1, pageSize: 10, keyword: '电' });

    expect(mockBitable.listRecords).toHaveBeenCalledWith(
      expect.objectContaining({
        filter: expect.objectContaining({
          conditions: expect.arrayContaining([
            expect.objectContaining({
              fieldName: '资产名称',
              operator: 'contains',
              value: ['电'],
            }),
          ]),
        }),
      }),
    );
  });

  // === 数据转换测试 ===

  it('should handle null fields in data transformation', async () => {
    mockBitable.getRecord.mockResolvedValue(
      makeRecord({
        id: 'asset-1',
        asset_name: null,
        purchase_date: null,
        purchase_amount: null,
        floor: null,
      }),
    );

    const detail = await service.getDetail('asset-1');

    expect(detail.assetName).toBe('');
    expect(detail.purchaseAmount).toBe(0);
    expect(detail.floor).toBe('');
    expect(detail.purchaseDate).toBe('');
  });

  it('should format dates to YYYY-MM-DD', async () => {
    mockBitable.getRecord.mockResolvedValue(
      makeRecord({
        id: 'asset-1',
        purchase_date: '2026-01-01T00:00:00.000Z',
      }),
    );

    const detail = await service.getDetail('asset-1');

    expect(detail.purchaseDate).toBe('2026-01-01');
  });

  it('should calculate depreciation in transformation', async () => {
    mockBitable.getRecord.mockResolvedValue(
      makeRecord({
        id: 'asset-1',
        purchase_date: '2025-01-01',
        purchase_amount: 36000,
      }),
    );

    const detail = await service.getDetail('asset-1');

    expect(detail.monthlyDepreciation).toBe(1000);
    expect(detail.accumulatedDepreciation).toBeGreaterThan(0);
    expect(detail.originalValue).toBe(36000);
  });

  // === 批量操作测试 ===

  it('should batch update category', async () => {
    mockBitable.getRecord.mockResolvedValue(makeRecord());
    mockBitable.updateRecord.mockResolvedValue(undefined);

    const result = await service.batchUpdateCategory(
      ['asset-1', 'asset-2'],
      '办公设备',
      'u1',
    );

    expect(result.successCount).toBe(2);
    expect(result.failedCount).toBe(0);
    expect(mockBitable.updateRecord).toHaveBeenCalledTimes(2);
  });

  it('should batch update floor', async () => {
    mockBitable.getRecord.mockResolvedValue(makeRecord());
    mockBitable.updateRecord.mockResolvedValue(undefined);

    const result = await service.batchUpdateFloor(
      ['asset-1', 'asset-2'],
      '5F',
      'u1',
    );

    expect(result.successCount).toBe(2);
    expect(result.failedCount).toBe(0);
  });

  it('should batch transfer', async () => {
    mockBitable.getRecord.mockResolvedValue(
      makeRecord({ asset_status: '转移中', id: 'asset-1' }),
    );
    mockBitable.updateRecord.mockResolvedValue(undefined);

    const result = await service.batchTransfer(
      ['asset-1', 'asset-2'],
      'u1',
      { targetFloor: '5F' },
    );

    expect(result.successCount).toBe(2);
    expect(result.failedCount).toBe(0);
  });

  it('should handle batch update category with empty array', async () => {
    const result = await service.batchUpdateCategory([], '办公设备', 'u1');

    expect(result.successCount).toBe(0);
    expect(result.failedCount).toBe(0);
  });

  it('should handle batch update category partial failure', async () => {
    mockBitable.getRecord
      .mockResolvedValueOnce(makeRecord())
      .mockResolvedValueOnce(null);
    mockBitable.updateRecord.mockResolvedValue(undefined);

    const result = await service.batchUpdateCategory(
      ['asset-1', 'asset-2'],
      '办公设备',
      'u1',
    );

    expect(result.successCount).toBe(1);
    expect(result.failedCount).toBe(1);
  });

  it('should get check history', async () => {
    mockBitable.getRecord.mockResolvedValue(makeRecord({ asset_name: '电脑' }));
    mockBitable.listRecords.mockResolvedValue({
      items: [
        {
          recordId: 'ch-1',
          check_date: '2026-06-01',
          checker: 'u1',
          actual_quantity: 5,
          difference: 0,
          check_status: 'checked',
          check_no: 'CK-001',
        },
      ],
      total: 1,
    });

    const result = await service.getCheckHistory('asset-1');

    expect(result.items).toHaveLength(1);
    expect(result.items[0].checkDate).toBe('2026-06-01');
    expect(result.items[0].checkNo).toBe('CK-001');
    expect(result.total).toBe(1);
  });

  it('should throw when getCheckHistory for non-existent asset', async () => {
    mockBitable.getRecord.mockResolvedValue(null);

    await expect(
      service.getCheckHistory('non-existent'),
    ).rejects.toThrow(NotFoundException);
  });

  it('should get operation history', async () => {
    mockBitable.getRecord.mockResolvedValue(makeRecord({ asset_name: '电脑' }));
    mockBitable.listRecords.mockResolvedValue({
      items: [
        {
          recordId: 'op-1',
          check_date: '2026-06-01',
          checker: 'u1',
          difference: -1,
          remark: '维修',
          check_status: 'checked',
          check_no: 'CK-001',
        },
      ],
      total: 1,
    });

    const result = await service.getOperationHistory('asset-1');

    expect(result.items).toHaveLength(1);
    expect(result.items[0].operationType).toBe('repair_start');
    expect(result.total).toBe(1);
  });

  it('should throw when getOperationHistory for non-existent asset', async () => {
    mockBitable.getRecord.mockResolvedValue(null);

    await expect(
      service.getOperationHistory('non-existent'),
    ).rejects.toThrow(NotFoundException);
  });

  // === 用户选项测试 ===

  it('should get user options from database when cache miss', async () => {
    mockCache.get.mockReturnValue(null);
    mockBitable.getAllRecords.mockResolvedValue([]);
    mockAuthn.listUsersByIds.mockResolvedValue([]);

    const result = await service.getUserOptions();

    expect(result).toEqual([]);
    expect(mockCache.set).toHaveBeenCalled();
  });

  it('should return cached user options', async () => {
    const cached = [{ id: 'u1', name: '张三' }];
    mockCache.get.mockReturnValue(cached);

    const result = await service.getUserOptions();

    expect(result).toEqual(cached);
    expect(mockBitable.getAllRecords).not.toHaveBeenCalled();
  });

  // === 错误处理测试 ===

  it('should throw NotFoundException when getDetail for non-existent id', async () => {
    mockBitable.getRecord.mockResolvedValue(null);

    await expect(
      service.getDetail('non-existent'),
    ).rejects.toThrow(NotFoundException);
  });

  it('should throw NotFoundException when update non-existent asset', async () => {
    mockBitable.getRecord.mockResolvedValue(null);

    await expect(
      service.update('non-existent', { assetName: 'test' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('should throw NotFoundException when delete non-existent asset', async () => {
    mockBitable.getRecord.mockResolvedValue(null);

    await expect(
      service.remove('non-existent'),
    ).rejects.toThrow(NotFoundException);
  });

  it('should throw NotFoundException when borrow non-existent asset', async () => {
    mockBitable.getRecord.mockResolvedValue(null);

    await expect(
      service.borrowAsset('non-existent', { userId: 'u1', targetUserId: 'u2' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('should throw NotFoundException when return non-existent asset', async () => {
    mockBitable.getRecord.mockResolvedValue(null);

    await expect(
      service.returnAsset('non-existent', { userId: 'u1' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('should throw proper error message on invalid status transition', async () => {
    mockBitable.getRecord.mockResolvedValue(
      makeRecord({ asset_status: '报废', id: 'asset-1' }),
    );

    await expect(
      service.borrowAsset('asset-1', {
        userId: 'u1',
        targetUserId: 'u2',
      }),
    ).rejects.toThrow('领用操作的前置状态必须是在库');
  });

  it('should throw proper error message on invalid return', async () => {
    mockBitable.getRecord.mockResolvedValue(
      makeRecord({ asset_status: '在库', id: 'asset-1' }),
    );

    await expect(
      service.returnAsset('asset-1', { userId: 'u1' }),
    ).rejects.toThrow('归还操作的前置状态必须是在用');
  });

  // === extractUserId / extractUserName array branches ===

  it('should extract userId and userName from array field', async () => {
    mockBitable.getRecord.mockResolvedValue(
      makeRecord({ owner: [{ id: 'u1', name: '张三' }], handler: [{ id: 'u2', name: '李四' }] }),
    );

    const detail = await service.getDetail('asset-1');

    expect(detail.owner.userId).toBe('u1');
    expect(detail.owner.name).toBe('张三');
    expect(detail.handler.userId).toBe('u2');
    expect(detail.handler.name).toBe('');
  });

  // === toFixedAssetItem status edge cases ===

  it('should map 闲置 status to idle', async () => {
    mockBitable.getRecord.mockResolvedValue(
      makeRecord({ asset_status: '闲置' }),
    );

    const detail = await service.getDetail('asset-1');

    expect(detail.assetStatus).toBe('idle');
  });

  it('should map 维修 status to repairing', async () => {
    mockBitable.getRecord.mockResolvedValue(
      makeRecord({ asset_status: '维修' }),
    );

    const detail = await service.getDetail('asset-1');

    expect(detail.assetStatus).toBe('repairing');
  });

  it('should map 转移中 status to transferring', async () => {
    mockBitable.getRecord.mockResolvedValue(
      makeRecord({ asset_status: '转移中' }),
    );

    const detail = await service.getDetail('asset-1');

    expect(detail.assetStatus).toBe('transferring');
  });

  it('should map 报废 status to scrapped', async () => {
    mockBitable.getRecord.mockResolvedValue(
      makeRecord({ asset_status: '报废' }),
    );

    const detail = await service.getDetail('asset-1');

    expect(detail.assetStatus).toBe('scrapped');
  });

  it('should fallback scrapped when stock is zero and status unknown', async () => {
    mockBitable.getRecord.mockResolvedValue(
      makeRecord({ asset_status: 'unknown_status', current_stock: 0, owner: '' }),
    );

    const detail = await service.getDetail('asset-1');

    expect(detail.assetStatus).toBe('scrapped');
  });

  it('should fallback in_use when owner present and status unknown', async () => {
    mockBitable.getRecord.mockResolvedValue(
      makeRecord({ asset_status: 'unknown_status', owner: 'u1', current_stock: 1 }),
    );

    const detail = await service.getDetail('asset-1');

    expect(detail.assetStatus).toBe('in_use');
  });

  // === buildFilter purchaseDepartment / payerEntity ===

  it('should filter by purchaseDepartment', async () => {
    mockBitable.listRecords.mockResolvedValue({ items: [], total: 0 });

    await service.getList({ page: 1, pageSize: 10, purchaseDepartment: '研发部' });

    expect(mockBitable.listRecords).toHaveBeenCalledWith(
      expect.objectContaining({
        filter: expect.objectContaining({
          conditions: expect.arrayContaining([
            expect.objectContaining({
              fieldName: '采购申请部门',
              value: ['研发部'],
            }),
          ]),
        }),
      }),
    );
  });

  it('should filter by payerEntity', async () => {
    mockBitable.listRecords.mockResolvedValue({ items: [], total: 0 });

    await service.getList({ page: 1, pageSize: 10, payerEntity: '总部' });

    expect(mockBitable.listRecords).toHaveBeenCalledWith(
      expect.objectContaining({
        filter: expect.objectContaining({
          conditions: expect.arrayContaining([
            expect.objectContaining({
              fieldName: '付费主体',
              value: ['总部'],
            }),
          ]),
        }),
      }),
    );
  });

  // === getSortConfig currentStock ===

  it('should sort by currentStock', async () => {
    mockBitable.listRecords.mockResolvedValue({ items: [], total: 0 });

    await service.getList({
      page: 1,
      pageSize: 10,
      sortBy: 'currentStock',
      sortOrder: 'asc',
    });

    expect(mockBitable.listRecords).toHaveBeenCalledWith(
      expect.objectContaining({
        sort: expect.arrayContaining([
          expect.objectContaining({
            fieldName: '当前库存',
            desc: false,
          }),
        ]),
      }),
    );
  });

  // === create with owner ===

  it('should create asset with owner', async () => {
    mockBitable.createRecord.mockResolvedValue({ id: 'asset-2' });

    const result = await service.create({
      assetName: '打印机',
      assetType: '办公设备',
      assetCategory: '',
      purchaseDate: '2026-01-01',
      purchaseAmount: 3000,
      owner: 'u1',
    } as Parameters<FixedAssetsService['create']>[0]);

    expect(result).toEqual({ id: 'asset-2' });
    expect(mockBitable.createRecord).toHaveBeenCalledWith(
      'fixed_assets',
      expect.objectContaining({ owner: 'u1' }),
    );
  });

  // === update extra fields ===

  it('should update purchaseAmount', async () => {
    mockBitable.getRecord.mockResolvedValue(makeRecord());
    mockBitable.updateRecord.mockResolvedValue(undefined);

    const result = await service.update('asset-1', {
      purchaseAmount: 8000,
    } as Parameters<FixedAssetsService['update']>[1]);

    expect(result).toEqual({ success: true });
    expect(mockBitable.updateRecord).toHaveBeenCalledWith(
      'fixed_assets',
      'asset-1',
      expect.objectContaining({ purchase_amount: 8000 }),
    );
  });

  it('should update purchaseDepartment', async () => {
    mockBitable.getRecord.mockResolvedValue(makeRecord());
    mockBitable.updateRecord.mockResolvedValue(undefined);

    const result = await service.update('asset-1', {
      purchaseDepartment: '市场部',
    } as Parameters<FixedAssetsService['update']>[1]);

    expect(result).toEqual({ success: true });
    expect(mockBitable.updateRecord).toHaveBeenCalledWith(
      'fixed_assets',
      'asset-1',
      expect.objectContaining({ purchase_department: '市场部' }),
    );
  });

  it('should throw BadRequestException when update has no fields', async () => {
    mockBitable.getRecord.mockResolvedValue(makeRecord());

    await expect(
      service.update('asset-1', {} as Parameters<FixedAssetsService['update']>[1]),
    ).rejects.toThrow(BadRequestException);
  });

  // === completeTransfer with targetDepartment ===

  it('should complete transfer with targetDepartment', async () => {
    mockBitable.getRecord.mockResolvedValue(
      makeRecord({ asset_status: '转移中', id: 'asset-1' }),
    );
    mockBitable.updateRecord.mockResolvedValue(undefined);

    const result = await service.completeTransfer('asset-1', {
      userId: 'u1',
      targetDepartment: '研发部',
    });

    expect(result.success).toBe(true);
    expect(mockBitable.updateRecord).toHaveBeenCalledWith(
      'fixed_assets',
      'asset-1',
      expect.objectContaining({
        asset_status: '在库',
        purchase_department: '研发部',
      }),
    );
  });

  // === batch operations partial failure ===

  it('should handle batchUpdateFloor partial failure', async () => {
    mockBitable.getRecord
      .mockResolvedValueOnce(makeRecord())
      .mockResolvedValueOnce(null);
    mockBitable.updateRecord.mockResolvedValue(undefined);

    const result = await service.batchUpdateFloor(
      ['asset-1', 'asset-2'],
      '5F',
      'u1',
    );

    expect(result.successCount).toBe(1);
    expect(result.failedCount).toBe(1);
  });

  it('should handle batchTransfer partial failure', async () => {
    mockBitable.getRecord
      .mockResolvedValueOnce(makeRecord({ asset_status: '转移中', id: 'asset-1' }))
      .mockResolvedValueOnce(null);
    mockBitable.updateRecord.mockResolvedValue(undefined);

    const result = await service.batchTransfer(
      ['asset-1', 'asset-2'],
      'u1',
      { targetFloor: '5F' },
    );

    expect(result.successCount).toBe(1);
    expect(result.failedCount).toBe(1);
  });

  it('should handle batchScrap partial failure', async () => {
    mockBitable.getRecord
      .mockResolvedValueOnce(makeRecord({ asset_status: '在库', id: 'asset-1' }))
      .mockResolvedValueOnce(null);
    mockBitable.updateRecord.mockResolvedValue(undefined);

    const result = await service.batchScrap(
      ['asset-1', 'asset-2'],
      'u1',
      '批量报废',
    );

    expect(result.successCount).toBe(1);
    expect(result.failedCount).toBe(1);
  });

  // === getCheckHistory empty assetName ===

  it('should return empty when asset has no name for getCheckHistory', async () => {
    mockBitable.getRecord.mockResolvedValue(
      makeRecord({ asset_name: '' }),
    );

    const result = await service.getCheckHistory('asset-1');

    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
  });

  // === getOperationHistory empty assetName ===

  it('should return empty when asset has no name for getOperationHistory', async () => {
    mockBitable.getRecord.mockResolvedValue(
      makeRecord({ asset_name: '' }),
    );

    const result = await service.getOperationHistory('asset-1');

    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
  });

  // === parseAssetStatus English fallback (line 478) ===

  it('should reject scrapAsset for idle English status', async () => {
    mockBitable.getRecord.mockResolvedValue(
      makeRecord({ asset_status: 'idle', id: 'asset-1' }),
    );

    await expect(
      service.scrapAsset('asset-1', {
        userId: 'u1',
        reason: '测试',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  // === getUserOptions advanced paths ===

  it('should extract user IDs from all domains and fallback name to id', async () => {
    mockCache.get.mockReturnValue(null);
    mockBitable.getAllRecords.mockResolvedValue([
      makeRecord({
        handler: [{ id: '123', name: '' }],
        owner: [{ id: '456', name: '' }],
      }),
    ]);
    mockAuthn.listUsersByIds.mockResolvedValue([]);

    const result = await service.getUserOptions();

    const ids = result.map((r: { id: string }) => r.id);
    expect(ids).toContain('123');
    expect(ids).toContain('456');
    // name falls back to id when authn returns no users
    const user123 = result.find((r: { id: string }) => r.id === '123');
    expect(user123!.name).toBe('123');
  });

  it('should enrich user names from authn service', async () => {
    mockCache.get.mockReturnValue(null);
    mockBitable.getAllRecords.mockResolvedValue([
      makeRecord({
        handler: [{ id: '123', name: '' }],
      }),
    ]);
    mockAuthn.listUsersByIds.mockResolvedValue([
      { id: '123', name: { zh_cn: '张三', en_us: 'Zhang San' } },
    ]);

    const result = await service.getUserOptions();

    const user = result.find((r: { id: string }) => r.id === '123');
    expect(user).toBeDefined();
    expect(user!.name).toBe('张三');
  });

  it('should handle getAllRecords error for one domain gracefully', async () => {
    mockCache.get.mockReturnValue(null);
    mockBitable.getAllRecords
      .mockResolvedValueOnce([])
      .mockRejectedValueOnce(new Error('expenses domain error'))
      .mockResolvedValueOnce([]);
    mockAuthn.listUsersByIds.mockResolvedValue([]);

    const result = await service.getUserOptions();

    expect(result).toEqual([]);
  });

  it('should sort user options by name with locale', async () => {
    mockCache.get.mockReturnValue(null);
    mockBitable.getAllRecords.mockResolvedValue([
      makeRecord({
        handler: [{ id: '123', name: '' }],
      }),
    ]);
    mockAuthn.listUsersByIds.mockResolvedValue([
      { id: '123', name: { zh_cn: '张三', en_us: 'Zhang San' } },
    ]);

    const result = await service.getUserOptions();

    expect(result[0].id).toBe('123');
    expect(result[0].name).toBe('张三');
  });
});