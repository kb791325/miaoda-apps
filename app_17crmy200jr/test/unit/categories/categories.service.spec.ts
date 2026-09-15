import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';

function MockFeishuBitableService() {}
jest.mock(
  '../../../server/modules/feishu-bitable/feishu-bitable.service',
  () => ({
    FeishuBitableService: MockFeishuBitableService,
  }),
);

import { CategoriesService } from '../../../server/modules/categories/categories.service';

const mockBitable = {
  listRecords: jest.fn(),
  getAllRecords: jest.fn(),
  getRecord: jest.fn(),
  createRecord: jest.fn(),
  updateRecord: jest.fn(),
  deleteRecord: jest.fn(),
};

function makeCategoryRecord(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    recordId: 'cat-1',
    category_l1: '办公用品',
    category_l2: '文具',
    sort_order: 1,
    ...overrides,
  };
}

describe('CategoriesService', () => {
  let service: CategoriesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CategoriesService(mockBitable as any);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ========== createL1 ==========

  it('should create L1 category', async () => {
    mockBitable.getAllRecords.mockResolvedValue([]);
    mockBitable.createRecord.mockResolvedValue({ id: 'new-cat' });

    const result = await service.createL1('办公用品');

    expect(result).toEqual({ id: 'new-cat' });
    expect(mockBitable.getAllRecords).toHaveBeenCalledWith('categories', {
      conjunction: 'and',
      conditions: [
        {
          fieldName: 'category_l1',
          operator: 'is',
          value: ['办公用品'],
        },
      ],
    });
    expect(mockBitable.createRecord).toHaveBeenCalledWith('categories', {
      category_l1: '办公用品',
      category_l2: '',
    });
  });

  // ========== createL2 ==========

  it('should create L2 category', async () => {
    mockBitable.getAllRecords
      .mockResolvedValueOnce([makeCategoryRecord({ category_l2: '文具' })])
      .mockResolvedValueOnce([]);
    mockBitable.createRecord.mockResolvedValue({ id: 'new-l2' });

    const result = await service.createL2({
      categoryL1: '办公用品',
      categoryL2: '笔记本',
      sortOrder: 2,
    });

    expect(result).toEqual({ id: 'new-l2' });
    expect(mockBitable.createRecord).toHaveBeenCalledWith('categories', {
      category_l1: '办公用品',
      category_l2: '笔记本',
      sort_order: 2,
    });
  });

  // ========== update ==========

  it('should update category', async () => {
    mockBitable.getRecord.mockResolvedValue(
      makeCategoryRecord({ recordId: 'cat-1' }),
    );
    mockBitable.getAllRecords.mockResolvedValue([]);
    mockBitable.updateRecord.mockResolvedValue(undefined);

    const result = await service.update('cat-1', {
      categoryL2: '新文具',
      sortOrder: 5,
    });

    expect(result).toEqual({ success: true });
    expect(mockBitable.updateRecord).toHaveBeenCalledWith(
      'categories',
      'cat-1',
      expect.objectContaining({
        category_l2: '新文具',
        sort_order: 5,
      }),
    );
  });

  // ========== remove ==========

  it('should delete category L2', async () => {
    mockBitable.getRecord.mockResolvedValue(
      makeCategoryRecord({
        recordId: 'cat-2',
        category_l1: '办公用品',
        category_l2: '文具',
      }),
    );
    mockBitable.deleteRecord.mockResolvedValue(undefined);

    const result = await service.remove('cat-2');

    expect(result).toEqual({ success: true });
    expect(mockBitable.deleteRecord).toHaveBeenCalledWith(
      'categories',
      'cat-2',
    );
  });

  // ========== getL1List ==========

  it('should get L1 list', async () => {
    mockBitable.getAllRecords.mockResolvedValue([
      makeCategoryRecord({
        recordId: 'cat-1',
        category_l1: '办公用品',
        category_l2: '文具',
      }),
      makeCategoryRecord({
        recordId: 'cat-2',
        category_l1: '办公用品',
        category_l2: '耗材',
      }),
      makeCategoryRecord({
        recordId: 'cat-3',
        category_l1: '电子设备',
        category_l2: '电脑',
      }),
    ]);

    const result = await service.getL1List();

    expect(result).toHaveLength(2);
    expect(result[0].categoryL1).toBe('办公用品');
    expect(result[0].childCount).toBe(2);
    expect(result[1].categoryL1).toBe('电子设备');
    expect(result[1].childCount).toBe(1);
  });

  // ========== getL2List ==========

  it('should get L2 list with pagination', async () => {
    const records: Record<string, unknown>[] = [];
    for (let i = 0; i < 5; i += 1) {
      records.push(
        makeCategoryRecord({
          recordId: `cat-${i}`,
          category_l1: '办公用品',
          category_l2: `文具${i}`,
          sort_order: i,
        }),
      );
    }
    mockBitable.getAllRecords.mockResolvedValue(records);

    const result = await service.getL2List({
      categoryL1: '办公用品',
      page: 1,
      pageSize: 3,
    });

    expect(result.items).toHaveLength(3);
    expect(result.total).toBe(5);
    expect(result.items[0].categoryL1).toBe('办公用品');
  });

  // ========== getOptions ==========

  it('should get options', async () => {
    mockBitable.getAllRecords.mockResolvedValue([
      makeCategoryRecord({
        recordId: 'cat-1',
        category_l1: '办公用品',
        category_l2: '文具',
      }),
      makeCategoryRecord({
        recordId: 'cat-2',
        category_l1: '办公用品',
        category_l2: '耗材',
      }),
      makeCategoryRecord({
        recordId: 'cat-3',
        category_l1: '电子设备',
        category_l2: '电脑',
      }),
    ]);

    const result = await service.getOptions();

    expect(result.items).toHaveLength(2);
    const office = result.items.find(
      (it) => it.categoryL1 === '办公用品',
    );
    expect(office).toBeDefined();
    expect(office!.children).toHaveLength(2);
    const electronics = result.items.find(
      (it) => it.categoryL1 === '电子设备',
    );
    expect(electronics).toBeDefined();
    expect(electronics!.children).toHaveLength(1);
  });

  // ========== sort by sortOrder ==========

  it('should sort categories by sortOrder', async () => {
    mockBitable.getAllRecords.mockResolvedValue([
      makeCategoryRecord({
        recordId: 'cat-3',
        category_l1: '办公用品',
        category_l2: '耗材',
        sort_order: 3,
      }),
      makeCategoryRecord({
        recordId: 'cat-1',
        category_l1: '办公用品',
        category_l2: '文具',
        sort_order: 1,
      }),
      makeCategoryRecord({
        recordId: 'cat-2',
        category_l1: '办公用品',
        category_l2: '笔记本',
        sort_order: 2,
      }),
    ]);

    const result = await service.getL2List({
      categoryL1: '办公用品',
      page: 1,
      pageSize: 10,
    });

    expect(result.items).toHaveLength(3);
    expect(result.items[0].categoryL2).toBe('文具');
    expect(result.items[1].categoryL2).toBe('笔记本');
    expect(result.items[2].categoryL2).toBe('耗材');
  });

  // ========== duplicate L1 ==========

  it('should throw ConflictException when creating duplicate L1', async () => {
    mockBitable.getAllRecords.mockResolvedValue([
      makeCategoryRecord({ category_l1: '办公用品', category_l2: '文具' }),
    ]);

    await expect(service.createL1('办公用品')).rejects.toThrow(
      ConflictException,
    );
  });

  // ========== category not found ==========

  it('should throw NotFoundException when category not found', async () => {
    mockBitable.getRecord.mockResolvedValue(null);

    await expect(service.update('nonexistent', { categoryL2: 'x' })).rejects.toThrow(
      NotFoundException,
    );
  });
});