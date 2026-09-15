// ============================================================
// E2E 测试数据集定义
// ============================================================

/** 测试用户 */
export const TEST_USERS = {
  admin: {
    userId: 'test-admin-001',
    userName: '测试管理员',
    department: '行政部',
  },
  user: {
    userId: 'test-user-001',
    userName: '测试用户',
    department: '财务部',
  },
  deptAdmin: {
    userId: 'test-dept-admin-001',
    userName: '部门管理员',
    department: '技术部',
  },
} as const;

/** 测试分类 */
export const TEST_CATEGORIES = {
  office: { name: '办公用品', parentId: null, sortOrder: 1 },
  travel: { name: '差旅费', parentId: null, sortOrder: 2 },
  officeSub: { name: '文具', parentId: 'cat-office', sortOrder: 1 },
} as const;

/** 测试资产 */
export const TEST_ASSETS = [
  {
    assetName: '测试笔记本电脑',
    assetType: '电子设备',
    purchaseAmount: 5000,
    purchaseDate: '2026-01-01',
    floor: '3F',
    currentStock: 10,
  },
  {
    assetName: '测试办公桌',
    assetType: '家具',
    purchaseAmount: 2000,
    purchaseDate: '2026-02-01',
    floor: '3F',
    currentStock: 5,
  },
  {
    assetName: '测试打印机',
    assetType: '电子设备',
    purchaseAmount: 3000,
    purchaseDate: '2026-03-01',
    floor: '2F',
    currentStock: 3,
  },
  {
    assetName: '测试投影仪',
    assetType: '电子设备',
    purchaseAmount: 8000,
    purchaseDate: '2025-06-01',
    floor: '1F',
    currentStock: 2,
  },
  {
    assetName: '测试空调',
    assetType: '电器',
    purchaseAmount: 6000,
    purchaseDate: '2025-01-01',
    floor: '1F',
    currentStock: 4,
  },
] as const;

/** 测试支出 */
export const TEST_EXPENSES = [
  {
    expenseDate: '2026-01-15',
    amount: 500,
    description: '测试文具采购',
    categoryL1: '办公用品',
    categoryL2: '文具',
    department: '行政部',
    handler: 'test-admin-001',
    floor: '3F',
    payerEntity: '公司',
  },
  {
    expenseDate: '2026-02-20',
    amount: 2000,
    description: '测试差旅报销',
    categoryL1: '差旅费',
    categoryL2: '',
    department: '技术部',
    handler: 'test-dept-admin-001',
    floor: '2F',
    payerEntity: '公司',
  },
  {
    expenseDate: '2026-03-10',
    amount: 800,
    description: '测试设备维修',
    categoryL1: '办公用品',
    categoryL2: '',
    department: '财务部',
    handler: 'test-user-001',
    floor: '1F',
    payerEntity: '公司',
  },
] as const;

/** 测试盘点任务 */
export const TEST_INVENTORY_TASKS = [
  {
    taskName: '2026Q1盘点',
    checkYear: 2026,
    checkMonth: '03',
    scopeType: 'all',
    checker: 'test-admin-001',
  },
] as const;