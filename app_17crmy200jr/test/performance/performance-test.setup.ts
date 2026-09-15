// 性能测试全局配置
// - 设置测试超时时间（性能测试需要更长时间）
// - 存储基准数据的路径配置
// - 测试数据工厂函数

import { randomUUID } from 'crypto';

// ── 配置常量 ────────────────────────────────────────────────────────────────────

export const PERFORMANCE_CONFIG = {
  /** 单个测试用例超时时间 (ms) */
  TIMEOUT_MS: 30000,
  /** 预热迭代次数（不计入统计） */
  WARMUP_ITERATIONS: 3,
  /** 基准测试迭代次数 */
  BENCHMARK_ITERATIONS: 10,
  /** 基准数据存储目录 */
  BENCHMARK_DIR: 'test/performance/benchmarks',
  /** 性能退化警告阈值 (10%) */
  DEGRADATION_WARNING_THRESHOLD: 0.1,
  /** 性能退化失败阈值 (20%) */
  DEGRADATION_FAILURE_THRESHOLD: 0.2,
} as const;

// ── 类型定义 ────────────────────────────────────────────────────────────────────

interface TestExpense {
  id: string;
  amount: number;
  category: string;
  description: string;
  status: string;
  submittedBy: string;
  submittedAt: string;
  approvedBy: string | null;
  approvedAt: string | null;
  tags: string[];
  attachments: string[];
}

interface TestAsset {
  id: string;
  name: string;
  category: string;
  serialNumber: string;
  status: string;
  assignedTo: string | null;
  location: string;
  purchaseDate: string;
  purchasePrice: number;
  depreciationRate: number;
  lastInventoryDate: string | null;
  notes: string;
}

// ── 默认测试数据 ────────────────────────────────────────────────────────────────

const DEFAULT_EXPENSE: TestExpense = {
  id: '',
  amount: 1500.0,
  category: '办公用品',
  description: '季度办公耗材采购',
  status: 'pending',
  submittedBy: 'user_test_001',
  submittedAt: new Date().toISOString(),
  approvedBy: null,
  approvedAt: null,
  tags: ['办公', '耗材'],
  attachments: [],
};

const DEFAULT_ASSET: TestAsset = {
  id: '',
  name: 'ThinkPad X1 Carbon',
  category: '电子设备',
  serialNumber: 'SN-2024-001',
  status: 'in_use',
  assignedTo: 'user_test_001',
  location: 'A栋-3F-301',
  purchaseDate: '2024-01-15',
  purchasePrice: 12000.0,
  depreciationRate: 0.2,
  lastInventoryDate: '2025-12-01',
  notes: '管理层配发设备',
};

// ── 导出函数 ────────────────────────────────────────────────────────────────────

/**
 * 生成测试用支出数据
 * @param overrides 需要覆盖的字段
 * @returns 完整的测试支出对象
 */
export function generateTestExpense(
  overrides?: Record<string, unknown>,
): Record<string, unknown> {
  const expense: Record<string, unknown> = {
    ...DEFAULT_EXPENSE,
    id: `exp_${randomUUID()}`,
    submittedAt: new Date().toISOString(),
  };
  if (overrides) {
    for (const [key, value] of Object.entries(overrides)) {
      expense[key] = value;
    }
  }
  return expense;
}

/**
 * 生成测试用资产数据
 * @param overrides 需要覆盖的字段
 * @returns 完整的测试资产对象
 */
export function generateTestAsset(
  overrides?: Record<string, unknown>,
): Record<string, unknown> {
  const asset: Record<string, unknown> = {
    ...DEFAULT_ASSET,
    id: `ast_${randomUUID()}`,
  };
  if (overrides) {
    for (const [key, value] of Object.entries(overrides)) {
      asset[key] = value;
    }
  }
  return asset;
}

/**
 * 批量生成测试数据
 * @param count 生成数量
 * @param generator 生成器函数
 * @returns 测试数据数组
 */
export function generateBatch<T>(
  count: number,
  generator: (index: number) => T,
): T[] {
  return Array.from({ length: count }, (_: unknown, i: number) => generator(i));
}

// ── Jest 全局设置 ───────────────────────────────────────────────────────────────

beforeAll(() => {
  // 性能测试需要更长的超时时间
  jest.setTimeout(PERFORMANCE_CONFIG.TIMEOUT_MS);
});

afterAll(() => {
  // 清理：恢复默认超时
  jest.setTimeout(5000);
});