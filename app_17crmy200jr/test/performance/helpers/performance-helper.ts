// 性能测量辅助函数
// 提供响应时间测量、基准测试、统计计算和内存使用监控

// ── 类型定义 ────────────────────────────────────────────────────────────────────

export interface MeasurementResult {
  /** 执行耗时 (ms) */
  duration: number;
  /** 是否执行成功 */
  success: boolean;
  /** 错误信息（失败时） */
  error?: string;
}

export interface BenchmarkResult {
  /** 平均耗时 (ms) */
  avg: number;
  /** P50 (ms) */
  p50: number;
  /** P95 (ms) */
  p95: number;
  /** P99 (ms) */
  p99: number;
  /** 最小耗时 (ms) */
  min: number;
  /** 最大耗时 (ms) */
  max: number;
  /** 吞吐量 (ops/s) */
  throughput: number;
  /** 成功率 (0-1) */
  successRate: number;
  /** 所有样本耗时 (ms) */
  samples: number[];
  /** 总迭代次数 */
  totalIterations: number;
  /** 成功迭代次数 */
  successfulIterations: number;
  /** 失败迭代次数 */
  failedIterations: number;
}

export interface StatsResult {
  /** 平均耗时 (ms) */
  avg: number;
  /** P50 (ms) */
  p50: number;
  /** P95 (ms) */
  p95: number;
  /** P99 (ms) */
  p99: number;
  /** 最小耗时 (ms) */
  min: number;
  /** 最大耗时 (ms) */
  max: number;
  /** 标准差 (ms) */
  stddev: number;
}

export interface MemoryUsage {
  /** 堆已使用 (bytes) */
  heapUsed: number;
  /** 堆总大小 (bytes) */
  heapTotal: number;
  /** 外部内存 (bytes) */
  external: number;
  /** RSS (bytes) */
  rss: number;
}

// ── 导出函数 ────────────────────────────────────────────────────────────────────

/**
 * 测量单个异步函数的响应时间
 * @param fn 待测量的异步函数
 * @returns 测量结果，包含耗时和是否成功
 */
export async function measureResponseTime(
  fn: () => Promise<unknown>,
): Promise<MeasurementResult> {
  const start: number = performance.now();
  try {
    await fn();
    const duration: number = performance.now() - start;
    return { duration, success: true };
  } catch (err: unknown) {
    const duration: number = performance.now() - start;
    const error: string =
      err instanceof Error ? err.message : String(err);
    return { duration, success: false, error };
  }
}

/**
 * 多次执行异步函数并统计性能指标
 * @param fn 待基准测试的异步函数
 * @param iterations 正式测试迭代次数
 * @param warmup 预热迭代次数（默认 3，不计入统计）
 * @returns 基准测试结果
 */
export async function benchmark(
  fn: () => Promise<unknown>,
  iterations: number,
  warmup: number = 3,
): Promise<BenchmarkResult> {
  // 预热：执行但不计入统计
  for (let i: number = 0; i < warmup; i++) {
    try {
      await fn();
    } catch {
      // 预热阶段忽略错误
    }
  }

  // 正式测试
  const samples: number[] = [];
  let successCount: number = 0;
  const totalStart: number = performance.now();

  for (let i: number = 0; i < iterations; i++) {
    const result: MeasurementResult = await measureResponseTime(fn);
    samples.push(result.duration);
    if (result.success) {
      successCount++;
    }
  }

  const totalDuration: number = performance.now() - totalStart;
  const stats: StatsResult = calculateStats(samples);

  return {
    avg: stats.avg,
    p50: stats.p50,
    p95: stats.p95,
    p99: stats.p99,
    min: stats.min,
    max: stats.max,
    throughput: (successCount / totalDuration) * 1000,
    successRate: successCount / iterations,
    samples,
    totalIterations: iterations,
    successfulIterations: successCount,
    failedIterations: iterations - successCount,
  };
}

/**
 * 计算样本统计指标
 * @param samples 耗时样本数组 (ms)
 * @returns 统计结果，包含百分位数、均值、标准差
 */
export function calculateStats(samples: number[]): StatsResult {
  if (samples.length === 0) {
    return { avg: 0, p50: 0, p95: 0, p99: 0, min: 0, max: 0, stddev: 0 };
  }

  const sorted: number[] = [...samples].sort((a: number, b: number) => a - b);
  const n: number = sorted.length;

  const avg: number = sorted.reduce((a: number, b: number) => a + b, 0) / n;
  const min: number = sorted[0];
  const max: number = sorted[n - 1];

  // 标准差
  const variance: number =
    sorted.reduce(
      (sum: number, val: number) => sum + (val - avg) ** 2,
      0,
    ) / n;
  const stddev: number = Math.sqrt(variance);

  // 百分位数
  const p50: number = percentile(sorted, 50);
  const p95: number = percentile(sorted, 95);
  const p99: number = percentile(sorted, 99);

  return { avg, p50, p95, p99, min, max, stddev };
}

/**
 * 获取当前进程内存使用情况
 * @returns 内存使用指标
 */
export function getMemoryUsage(): MemoryUsage {
  const mem: NodeJS.MemoryUsage = process.memoryUsage();
  return {
    heapUsed: mem.heapUsed,
    heapTotal: mem.heapTotal,
    external: mem.external,
    rss: mem.rss,
  };
}

// ── 内部辅助 ────────────────────────────────────────────────────────────────────

/**
 * 计算数组的百分位数（线性插值）
 */
function percentile(sorted: number[], p: number): number {
  const n: number = sorted.length;
  if (n === 0) return 0;
  if (n === 1) return sorted[0];

  const index: number = (p / 100) * (n - 1);
  const lower: number = Math.floor(index);
  const upper: number = Math.ceil(index);

  if (lower === upper) return sorted[lower];

  const fraction: number = index - lower;
  return sorted[lower] + fraction * (sorted[upper] - sorted[lower]);
}