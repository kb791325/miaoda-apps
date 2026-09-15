/**
 * 性能报告生成器
 *
 * 功能：
 * 1. 读取 performance-benchmark.json
 * 2. 分析各项指标，识别性能瓶颈
 * 3. 按优先级排序生成优化建议
 * 4. 输出 Markdown 格式报告
 *
 * 用法：npx tsx test/performance/generate-performance-report.ts
 */

import * as fs from 'fs';
import * as path from 'path';

// ── 配置 ────────────────────────────────────────────────────────────────────────

const PROJECT_ROOT: string = path.resolve(__dirname, '..', '..');
const BENCHMARK_FILE: string = path.join(
  PROJECT_ROOT,
  'test/performance/benchmarks/performance-benchmark.json',
);
const REPORT_DIR: string = path.join(
  PROJECT_ROOT,
  'test/performance/reports',
);

// 瓶颈阈值
const THRESHOLDS = {
  /** P95 超过此值视为慢响应 (ms) */
  P95_SLOW: 1000,
  /** 成功率低于此值视为不稳定 */
  SUCCESS_RATE_LOW: 0.95,
  /** 吞吐量低于此值视为低吞吐 (ops/s) */
  THROUGHPUT_LOW: 10,
  /** P99 超过此值视为严重延迟 (ms) */
  P99_CRITICAL: 3000,
  /** 平均响应超过此值视为慢 (ms) */
  AVG_SLOW: 500,
} as const;

// ── 类型定义 ────────────────────────────────────────────────────────────────────

interface BenchmarkEntry {
  avg: number;
  p50: number;
  p95: number;
  p99: number;
  min: number;
  max: number;
  throughput: number;
  successRate: number;
  samples: number[];
}

interface ModuleBenchmarks {
  [testName: string]: BenchmarkEntry;
}

interface BenchmarkFile {
  version: string;
  environment: string;
  createdAt: string;
  api: ModuleBenchmarks;
  database: ModuleBenchmarks;
  frontend: ModuleBenchmarks;
  load: ModuleBenchmarks;
}

interface Bottleneck {
  module: string;
  testName: string;
  issue: string;
  currentValue: number;
  threshold: number;
  unit: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  suggestion: string;
}

type ModuleKey = keyof Pick<
  BenchmarkFile,
  'api' | 'database' | 'frontend' | 'load'
>;

// ── 主流程 ──────────────────────────────────────────────────────────────────────

function main(): void {
  console.log('📊 开始生成性能分析报告...\n');

  // 确保报告目录存在
  fs.mkdirSync(REPORT_DIR, { recursive: true });

  // 读取基准文件
  if (!fs.existsSync(BENCHMARK_FILE)) {
    console.error(`❌ 基准文件不存在: ${BENCHMARK_FILE}`);
    console.error(
      '   请先运行性能测试: npx tsx test/performance/run-performance-tests.ts',
    );
    process.exit(1);
  }

  const raw: string = fs.readFileSync(BENCHMARK_FILE, 'utf-8');
  const benchmark: BenchmarkFile = JSON.parse(raw) as BenchmarkFile;

  // 分析瓶颈
  console.log('🔍 分析性能指标...');
  const bottlenecks: Bottleneck[] = analyzeBottlenecks(benchmark);

  // 排序：按优先级
  const priorityOrder: Record<string, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };
  bottlenecks.sort(
    (a: Bottleneck, b: Bottleneck) =>
      priorityOrder[a.priority] - priorityOrder[b.priority],
  );

  // 生成报告
  console.log('📝 生成 Markdown 报告...');
  const report: string = buildReport(benchmark, bottlenecks);

  const reportPath: string = path.join(
    REPORT_DIR,
    'performance-analysis-report.md',
  );
  fs.writeFileSync(reportPath, report, 'utf-8');

  // 输出摘要
  console.log('\n═══════════════════════════════════════');
  console.log('✅ 报告生成完成');
  console.log(`📄 报告路径: ${reportPath}`);
  console.log(`🔍 发现 ${bottlenecks.length} 个性能瓶颈`);

  if (bottlenecks.length > 0) {
    const criticalCount: number = bottlenecks.filter(
      (b: Bottleneck) => b.priority === 'critical',
    ).length;
    const highCount: number = bottlenecks.filter(
      (b: Bottleneck) => b.priority === 'high',
    ).length;
    console.log(`   - Critical: ${criticalCount}`);
    console.log(`   - High: ${highCount}`);
    console.log(
      `   - Medium: ${bottlenecks.length - criticalCount - highCount}`,
    );
  }
  console.log('═══════════════════════════════════════\n');
}

// ── 瓶颈分析 ────────────────────────────────────────────────────────────────────

function analyzeBottlenecks(benchmark: BenchmarkFile): Bottleneck[] {
  const results: Bottleneck[] = [];
  const modules: ModuleKey[] = ['api', 'database', 'frontend', 'load'];

  for (const mod of modules) {
    const modBench: ModuleBenchmarks = benchmark[mod] || {};

    for (const [testName, entry] of Object.entries(modBench)) {
      // P95 慢响应检测
      if (entry.p95 > THRESHOLDS.P95_SLOW) {
        const severity: string =
          entry.p95 > THRESHOLDS.P99_CRITICAL ? 'high' : 'medium';
        results.push({
          module: mod,
          testName,
          issue: 'P95 响应时间过长',
          currentValue: entry.p95,
          threshold: THRESHOLDS.P95_SLOW,
          unit: 'ms',
          priority: severity as 'high' | 'medium',
          suggestion:
            '建议排查慢查询、添加缓存层、优化数据库索引或考虑异步处理',
        });
      }

      // P99 严重延迟检测
      if (entry.p99 > THRESHOLDS.P99_CRITICAL) {
        results.push({
          module: mod,
          testName,
          issue: 'P99 严重延迟',
          currentValue: entry.p99,
          threshold: THRESHOLDS.P99_CRITICAL,
          unit: 'ms',
          priority: 'critical',
          suggestion:
            'P99 延迟严重超标，建议立即排查：1) 检查是否有长尾请求 2) 审查数据库连接池配置 3) 检查外部依赖超时设置',
        });
      }

      // 平均响应慢检测
      if (entry.avg > THRESHOLDS.AVG_SLOW) {
        results.push({
          module: mod,
          testName,
          issue: '平均响应时间过高',
          currentValue: entry.avg,
          threshold: THRESHOLDS.AVG_SLOW,
          unit: 'ms',
          priority: 'high',
          suggestion:
            '平均响应超标，建议：1) 审查 N+1 查询 2) 添加数据预加载/缓存 3) 考虑分页优化',
        });
      }

      // 成功率低检测
      if (entry.successRate < THRESHOLDS.SUCCESS_RATE_LOW) {
        const severity: string =
          entry.successRate < 0.8 ? 'critical' : 'high';
        results.push({
          module: mod,
          testName,
          issue: '成功率低于阈值',
          currentValue: entry.successRate * 100,
          threshold: THRESHOLDS.SUCCESS_RATE_LOW * 100,
          unit: '%',
          priority: severity as 'critical' | 'high',
          suggestion:
            '成功率不达标，建议：1) 检查错误日志定位失败原因 2) 审查超时配置 3) 添加重试机制和熔断器',
        });
      }

      // 吞吐量低检测
      if (
        entry.throughput > 0 &&
        entry.throughput < THRESHOLDS.THROUGHPUT_LOW
      ) {
        results.push({
          module: mod,
          testName,
          issue: '吞吐量过低',
          currentValue: entry.throughput,
          threshold: THRESHOLDS.THROUGHPUT_LOW,
          unit: 'ops/s',
          priority: 'medium',
          suggestion:
            '吞吐量偏低，建议：1) 检查是否有同步阻塞操作 2) 考虑批量处理 3) 优化数据库查询',
        });
      }
    }
  }

  return results;
}

// ── 报告生成 ────────────────────────────────────────────────────────────────────

function buildReport(
  benchmark: BenchmarkFile,
  bottlenecks: Bottleneck[],
): string {
  const lines: string[] = [];
  const now: string = new Date().toISOString();

  // 标题
  lines.push('# 性能分析报告');
  lines.push('');
  lines.push(`> 生成时间: ${now}`);
  lines.push(`> 环境: ${benchmark.environment}`);
  lines.push(`> 基准版本: ${benchmark.version}`);
  lines.push('');

  // 概要
  lines.push('## 📊 概要');
  lines.push('');
  const totalTests: number = countTests(benchmark);
  lines.push(`- **测试项总数**: ${totalTests}`);
  lines.push(`- **发现瓶颈**: ${bottlenecks.length} 项`);
  lines.push('');

  const criticalCount: number = bottlenecks.filter(
    (b: Bottleneck) => b.priority === 'critical',
  ).length;
  const highCount: number = bottlenecks.filter(
    (b: Bottleneck) => b.priority === 'high',
  ).length;
  const mediumCount: number = bottlenecks.filter(
    (b: Bottleneck) => b.priority === 'medium',
  ).length;
  const lowCount: number = bottlenecks.filter(
    (b: Bottleneck) => b.priority === 'low',
  ).length;

  if (bottlenecks.length > 0) {
    lines.push('### 瓶颈分布');
    lines.push('');
    lines.push('| 优先级 | 数量 |');
    lines.push('|--------|------|');
    if (criticalCount > 0)
      lines.push(`| 🔴 Critical | ${criticalCount} |`);
    if (highCount > 0) lines.push(`| 🟠 High | ${highCount} |`);
    if (mediumCount > 0) lines.push(`| 🟡 Medium | ${mediumCount} |`);
    if (lowCount > 0) lines.push(`| 🟢 Low | ${lowCount} |`);
    lines.push('');
  } else {
    lines.push('✅ 所有指标正常，未发现性能瓶颈。');
    lines.push('');
  }

  // 各模块性能详情
  lines.push('## 📋 各模块性能详情');
  lines.push('');

  const modules: ModuleKey[] = ['api', 'database', 'frontend', 'load'];

  for (const mod of modules) {
    const modBench: ModuleBenchmarks = benchmark[mod] || {};
    const names: string[] = Object.keys(modBench);
    if (names.length === 0) {
      lines.push(`### ${capitalize(mod)}`);
      lines.push('');
      lines.push('暂无测试数据。');
      lines.push('');
      continue;
    }

    lines.push(`### ${capitalize(mod)}`);
    lines.push('');
    lines.push(
      '| 测试项 | Avg | P50 | P95 | P99 | 吞吐量 | 成功率 | 状态 |',
    );
    lines.push(
      '|--------|-----|-----|-----|-----|--------|--------|------|',
    );

    for (const [name, entry] of Object.entries(modBench)) {
      const status: string = getStatusIcon(entry);
      lines.push(
        `| ${name} | ${entry.avg.toFixed(2)}ms | ${entry.p50.toFixed(2)}ms | ${entry.p95.toFixed(2)}ms | ${entry.p99.toFixed(2)}ms | ${entry.throughput.toFixed(2)}/s | ${(entry.successRate * 100).toFixed(1)}% | ${status} |`,
      );
    }
    lines.push('');
  }

  // 瓶颈分析与优化建议
  if (bottlenecks.length > 0) {
    lines.push('## 🔍 瓶颈分析与优化建议');
    lines.push('');

    let currentPriority: string = '';

    for (const b of bottlenecks) {
      if (b.priority !== currentPriority) {
        currentPriority = b.priority;
        const labels: Record<string, string> = {
          critical: '### 🔴 Critical - 立即处理',
          high: '### 🟠 High - 优先处理',
          medium: '### 🟡 Medium - 计划处理',
          low: '### 🟢 Low - 关注',
        };
        lines.push(labels[b.priority] || `### ${b.priority}`);
        lines.push('');
      }

      lines.push(`#### [${b.module}] ${b.testName}`);
      lines.push('');
      lines.push(`- **问题**: ${b.issue}`);
      lines.push(
        `- **当前值**: ${b.currentValue.toFixed(2)} ${b.unit}（阈值: ${b.threshold} ${b.unit}）`,
      );
      lines.push(`- **建议**: ${b.suggestion}`);
      lines.push('');
    }
  }

  // 阈值说明
  lines.push('## 📐 检测阈值说明');
  lines.push('');
  lines.push('| 指标 | 阈值 | 说明 |');
  lines.push('|------|------|------|');
  lines.push(
    `| P95 响应时间 | > ${THRESHOLDS.P95_SLOW}ms | 95% 的请求响应时间超过此值视为慢响应 |`,
  );
  lines.push(
    `| P99 响应时间 | > ${THRESHOLDS.P99_CRITICAL}ms | 99% 的请求响应时间超过此值视为严重延迟 |`,
  );
  lines.push(
    `| 平均响应时间 | > ${THRESHOLDS.AVG_SLOW}ms | 平均响应时间超过此值视为性能不足 |`,
  );
  lines.push(
    `| 成功率 | < ${THRESHOLDS.SUCCESS_RATE_LOW * 100}% | 请求成功率低于此值视为不稳定 |`,
  );
  lines.push(
    `| 吞吐量 | < ${THRESHOLDS.THROUGHPUT_LOW} ops/s | 每秒处理请求数低于此值视为低吞吐 |`,
  );
  lines.push('');

  return lines.join('\n');
}

// ── 辅助函数 ────────────────────────────────────────────────────────────────────

function countTests(benchmark: BenchmarkFile): number {
  const modules: ModuleKey[] = ['api', 'database', 'frontend', 'load'];
  let count: number = 0;
  for (const mod of modules) {
    count += Object.keys(benchmark[mod] || {}).length;
  }
  return count;
}

function getStatusIcon(entry: BenchmarkEntry): string {
  const issues: string[] = [];
  if (entry.p95 > THRESHOLDS.P95_SLOW) issues.push('慢');
  if (entry.p99 > THRESHOLDS.P99_CRITICAL) issues.push('严重延迟');
  if (entry.avg > THRESHOLDS.AVG_SLOW) issues.push('高延迟');
  if (entry.successRate < THRESHOLDS.SUCCESS_RATE_LOW)
    issues.push('不稳定');
  if (
    entry.throughput > 0 &&
    entry.throughput < THRESHOLDS.THROUGHPUT_LOW
  ) {
    issues.push('低吞吐');
  }

  if (issues.length === 0) return '✅ 正常';
  return `⚠️ ${issues.join(', ')}`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ── 入口 ────────────────────────────────────────────────────────────────────────

main();