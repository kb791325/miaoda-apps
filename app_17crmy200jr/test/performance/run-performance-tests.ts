/**
 * 运行所有性能测试的主脚本
 *
 * 功能：
 * 1. 使用 child_process.execSync 运行 Jest 性能测试
 * 2. 收集测试结果
 * 3. 与历史基准对比，检测性能退化
 * 4. 生成 Markdown 格式的性能报告
 * 5. 性能退化超阈值时返回非零退出码
 *
 * 用法：npx tsx test/performance/run-performance-tests.ts
 */

import { execSync } from 'child_process';
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
const DEGRADATION_WARNING: number = 0.1; // 10%
const DEGRADATION_FAILURE: number = 0.2; // 20%

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

interface DegradationResult {
  testName: string;
  module: string;
  metric: string;
  previous: number;
  current: number;
  changePercent: number;
  severity: 'warning' | 'failure';
}

// ── 主流程 ──────────────────────────────────────────────────────────────────────

function main(): void {
  console.log('🚀 开始运行性能测试...\n');

  // 确保报告目录存在
  fs.mkdirSync(REPORT_DIR, { recursive: true });

  // Step 1: 运行 Jest 性能测试
  console.log('📊 Step 1: 运行 Jest 性能测试套件...');
  runJestPerfTests();

  // Step 2: 读取当前基准文件
  console.log('\n📖 Step 2: 读取基准数据...');
  const currentBenchmark: BenchmarkFile = readBenchmarkFile();

  // Step 3: 读取历史基准（如果存在）
  console.log('\n📋 Step 3: 对比历史基准...');
  const previousBenchmark: BenchmarkFile | null =
    readPreviousBenchmark();

  // Step 4: 检测性能退化
  let degradations: DegradationResult[] = [];
  if (previousBenchmark) {
    degradations = detectDegradation(previousBenchmark, currentBenchmark);
  } else {
    console.log('  ⚠️  未找到历史基准文件，跳过对比');
  }

  // Step 5: 生成报告
  console.log('\n📝 Step 5: 生成性能报告...');
  generateReport(currentBenchmark, degradations);

  // Step 6: 输出结果
  console.log('\n═══════════════════════════════════════');
  if (degradations.length === 0) {
    console.log('✅ 性能测试通过，未检测到性能退化');
    console.log('═══════════════════════════════════════\n');
    process.exit(0);
  }

  const failures: DegradationResult[] = degradations.filter(
    (d: DegradationResult) => d.severity === 'failure',
  );
  const warnings: DegradationResult[] = degradations.filter(
    (d: DegradationResult) => d.severity === 'warning',
  );

  if (failures.length > 0) {
    console.log(
      `❌ 检测到 ${failures.length} 项严重性能退化 (超过 ${DEGRADATION_FAILURE * 100}%):`,
    );
    for (const d of failures) {
      console.log(
        `  - [${d.module}] ${d.testName}: ${d.metric} ${d.previous.toFixed(2)} → ${d.current.toFixed(2)} (${(d.changePercent * 100).toFixed(1)}%)`,
      );
    }
  }

  if (warnings.length > 0) {
    console.log(
      `⚠️  检测到 ${warnings.length} 项性能警告 (超过 ${DEGRADATION_WARNING * 100}%):`,
    );
    for (const d of warnings) {
      console.log(
        `  - [${d.module}] ${d.testName}: ${d.metric} ${d.previous.toFixed(2)} → ${d.current.toFixed(2)} (${(d.changePercent * 100).toFixed(1)}%)`,
      );
    }
  }

  console.log('═══════════════════════════════════════\n');
  console.log(
    `📄 详细报告: ${path.join(REPORT_DIR, 'performance-report.md')}`,
  );

  process.exit(failures.length > 0 ? 1 : 0);
}

// ── 辅助函数 ────────────────────────────────────────────────────────────────────

function runJestPerfTests(): void {
  try {
    const result: string = execSync(
      'npx jest --config jest.perf.config.js --json --verbose 2>&1 || true',
      {
        cwd: PROJECT_ROOT,
        encoding: 'utf-8',
        timeout: 300_000,
        maxBuffer: 50 * 1024 * 1024,
      },
    );
    // 尝试解析 JSON 结果
    try {
      const parsed: unknown = JSON.parse(result);
      const testResult = parsed as {
        numTotalTests?: number;
        numPassedTests?: number;
        numFailedTests?: number;
      };
      console.log(
        `  测试总数: ${testResult.numTotalTests ?? '?'}, 通过: ${testResult.numPassedTests ?? '?'}, 失败: ${testResult.numFailedTests ?? '?'}`,
      );
    } catch {
      // 非 JSON 输出，直接打印摘要
      const lines: string[] = result.split('\n').filter(Boolean);
      const lastLines: string[] = lines.slice(-5);
      for (const line of lastLines) {
        console.log(`  ${line}`);
      }
    }
  } catch (err: unknown) {
    const message: string =
      err instanceof Error ? err.message : String(err);
    console.error(`  ⚠️  Jest 执行异常: ${message}`);
  }
}

function readBenchmarkFile(): BenchmarkFile {
  if (!fs.existsSync(BENCHMARK_FILE)) {
    console.error(`  ❌ 基准文件不存在: ${BENCHMARK_FILE}`);
    process.exit(1);
  }
  const raw: string = fs.readFileSync(BENCHMARK_FILE, 'utf-8');
  return JSON.parse(raw) as BenchmarkFile;
}

function readPreviousBenchmark(): BenchmarkFile | null {
  const historyFile: string = path.join(
    path.dirname(BENCHMARK_FILE),
    'performance-benchmark.previous.json',
  );
  if (!fs.existsSync(historyFile)) {
    return null;
  }
  const raw: string = fs.readFileSync(historyFile, 'utf-8');
  return JSON.parse(raw) as BenchmarkFile;
}

function detectDegradation(
  previous: BenchmarkFile,
  current: BenchmarkFile,
): DegradationResult[] {
  const results: DegradationResult[] = [];
  const modules: (keyof Pick<
    BenchmarkFile,
    'api' | 'database' | 'frontend' | 'load'
  >)[] = ['api', 'database', 'frontend', 'load'];

  for (const mod of modules) {
    const prevMod: ModuleBenchmarks = previous[mod] || {};
    const currMod: ModuleBenchmarks = current[mod] || {};

    for (const testName of Object.keys(currMod)) {
      const currEntry: BenchmarkEntry | undefined = currMod[testName];
      const prevEntry: BenchmarkEntry | undefined = prevMod[testName];

      if (!currEntry || !prevEntry) continue;

      // 对比 avg 耗时
      const avgChange: number =
        (currEntry.avg - prevEntry.avg) / prevEntry.avg;
      if (avgChange > DEGRADATION_WARNING) {
        results.push({
          testName,
          module: mod,
          metric: 'avg',
          previous: prevEntry.avg,
          current: currEntry.avg,
          changePercent: avgChange,
          severity:
            avgChange > DEGRADATION_FAILURE ? 'failure' : 'warning',
        });
      }

      // 对比 throughput
      if (prevEntry.throughput > 0) {
        const tpChange: number =
          (prevEntry.throughput - currEntry.throughput) /
          prevEntry.throughput;
        if (tpChange > DEGRADATION_WARNING) {
          results.push({
            testName,
            module: mod,
            metric: 'throughput',
            previous: prevEntry.throughput,
            current: currEntry.throughput,
            changePercent: tpChange,
            severity:
              tpChange > DEGRADATION_FAILURE ? 'failure' : 'warning',
          });
        }
      }
    }
  }

  return results;
}

function generateReport(
  benchmark: BenchmarkFile,
  degradations: DegradationResult[],
): void {
  const lines: string[] = [];
  const now: string = new Date().toISOString();

  lines.push('# 性能测试报告');
  lines.push('');
  lines.push(`> 生成时间: ${now}`);
  lines.push(`> 环境: ${benchmark.environment}`);
  lines.push(`> 基准版本: ${benchmark.version}`);
  lines.push('');

  // 概要
  lines.push('## 📊 概要');
  lines.push('');
  const allEntries: {
    name: string;
    module: string;
    entry: BenchmarkEntry;
  }[] = [];
  const modules: (keyof Pick<
    BenchmarkFile,
    'api' | 'database' | 'frontend' | 'load'
  >)[] = ['api', 'database', 'frontend', 'load'];

  for (const mod of modules) {
    const modBench: ModuleBenchmarks = benchmark[mod] || {};
    for (const [name, entry] of Object.entries(modBench)) {
      allEntries.push({ name, module: mod, entry });
    }
  }

  if (allEntries.length === 0) {
    lines.push('暂无性能测试数据。');
    lines.push('');
  } else {
    lines.push(
      '| 模块 | 测试项 | 平均 (ms) | P95 (ms) | 吞吐量 (ops/s) | 成功率 |',
    );
    lines.push(
      '|------|--------|-----------|----------|----------------|--------|',
    );

    for (const item of allEntries) {
      lines.push(
        `| ${item.module} | ${item.name} | ${item.entry.avg.toFixed(2)} | ${item.entry.p95.toFixed(2)} | ${item.entry.throughput.toFixed(2)} | ${(item.entry.successRate * 100).toFixed(1)}% |`,
      );
    }
    lines.push('');
  }

  // 退化检测
  if (degradations.length > 0) {
    lines.push('## ⚠️ 性能退化检测');
    lines.push('');
    lines.push(
      '| 模块 | 测试项 | 指标 | 之前 | 当前 | 变化 | 严重程度 |',
    );
    lines.push(
      '|------|--------|------|------|------|------|----------|',
    );

    for (const d of degradations) {
      const emoji: string = d.severity === 'failure' ? '🔴' : '🟡';
      lines.push(
        `| ${d.module} | ${d.testName} | ${d.metric} | ${d.previous.toFixed(2)} | ${d.current.toFixed(2)} | ${(d.changePercent * 100).toFixed(1)}% | ${emoji} ${d.severity} |`,
      );
    }
    lines.push('');
  }

  // 模块详情
  lines.push('## 📋 模块详情');
  lines.push('');

  for (const mod of modules) {
    const modBench: ModuleBenchmarks = benchmark[mod] || {};
    const names: string[] = Object.keys(modBench);
    if (names.length === 0) continue;

    lines.push(`### ${capitalize(mod)}`);
    lines.push('');
    lines.push(
      '| 测试项 | Avg | P50 | P95 | P99 | Min | Max | 吞吐量 | 成功率 |',
    );
    lines.push(
      '|--------|-----|-----|-----|-----|-----|-----|--------|--------|',
    );

    for (const [name, entry] of Object.entries(modBench)) {
      lines.push(
        `| ${name} | ${entry.avg.toFixed(2)} | ${entry.p50.toFixed(2)} | ${entry.p95.toFixed(2)} | ${entry.p99.toFixed(2)} | ${entry.min.toFixed(2)} | ${entry.max.toFixed(2)} | ${entry.throughput.toFixed(2)} | ${(entry.successRate * 100).toFixed(1)}% |`,
      );
    }
    lines.push('');
  }

  // 保存报告
  const reportPath: string = path.join(
    REPORT_DIR,
    'performance-report.md',
  );
  fs.writeFileSync(reportPath, lines.join('\n'), 'utf-8');

  // 保存本次基准为历史基准（供下次对比）
  const historyPath: string = path.join(
    path.dirname(BENCHMARK_FILE),
    'performance-benchmark.previous.json',
  );
  fs.writeFileSync(
    historyPath,
    JSON.stringify(benchmark, null, 2),
    'utf-8',
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ── 入口 ────────────────────────────────────────────────────────────────────────

main();