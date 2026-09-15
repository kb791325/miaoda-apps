/**
 * 负载测试 — 使用 Node.js 内置 http 模块
 *
 * 测试场景：
 * 1. 纯读取 — GET /api/expenses（低压力基线）
 * 2. 读写混合 — 70% GET + 30% POST（模拟真实流量）
 * 3. 持续负载 — 60 秒稳定吞吐
 * 4. 峰值负载 — 100 并发突刺
 *
 * 注意：仅做轻量级测试，避免对开发环境造成过大压力。
 */

import http from 'http';
import { URL } from 'url';

// ============================================================
// 配置
// ============================================================

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';
const API_PREFIX = '/api';

/** 负载测试配置 */
interface LoadTestConfig {
  url: string;
  method: string;
  concurrency: number;
  duration: number;
  body?: string;
  headers?: Record<string, string>;
}

/** 单次请求结果 */
interface RequestResult {
  statusCode: number;
  duration: number; // ms
  error?: string;
}

/** 测试汇总 */
interface LoadTestSummary {
  config: LoadTestConfig;
  totalRequests: number;
  successCount: number;
  errorCount: number;
  errorRate: number;
  avgResponseTime: number;
  p50ResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  rps: number;
  totalDuration: number;
}

// ============================================================
// 辅助函数
// ============================================================

/** 发起单次 HTTP 请求 */
function sendRequest(options: {
  url: string;
  method: string;
  body?: string;
  headers?: Record<string, string>;
  timeout?: number;
}): Promise<RequestResult> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const parsedUrl = new URL(options.url);
    const timeout = options.timeout ?? 10000;

    const req = http.request(
      {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port,
        path: parsedUrl.pathname + parsedUrl.search,
        method: options.method,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        timeout,
      },
      (res: http.IncomingMessage) => {
        // 消费响应体
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode ?? 0,
            duration: Date.now() - startTime,
          });
        });
      },
    );

    req.on('error', (err: Error) => {
      resolve({
        statusCode: 0,
        duration: Date.now() - startTime,
        error: err.message,
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        statusCode: 0,
        duration: Date.now() - startTime,
        error: 'ETIMEDOUT',
      });
    });

    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

/** 等待指定毫秒 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** 计算百分位 */
function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

/** 计算汇总统计 */
function summarize(
  config: LoadTestConfig,
  results: RequestResult[],
  totalDuration: number,
): LoadTestSummary {
  const durations: number[] = results
    .filter((r: RequestResult) => !r.error)
    .map((r: RequestResult) => r.duration)
    .sort((a: number, b: number) => a - b);

  const errorCount: number = results.filter(
    (r: RequestResult) => r.error || r.statusCode >= 500,
  ).length;
  const successCount: number = results.length - errorCount;

  return {
    config,
    totalRequests: results.length,
    successCount,
    errorCount,
    errorRate: results.length > 0 ? errorCount / results.length : 0,
    avgResponseTime:
      durations.length > 0
        ? durations.reduce((a: number, b: number) => a + b, 0) /
          durations.length
        : 0,
    p50ResponseTime: percentile(durations, 50),
    p95ResponseTime: percentile(durations, 95),
    p99ResponseTime: percentile(durations, 99),
    minResponseTime: durations.length > 0 ? durations[0] : 0,
    maxResponseTime:
      durations.length > 0 ? durations[durations.length - 1] : 0,
    rps: totalDuration > 0 ? (results.length / totalDuration) * 1000 : 0,
    totalDuration,
  };
}

/** 打印汇总 */
function printSummary(label: string, summary: LoadTestSummary): void {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  ${label}`);
  console.log(`${'='.repeat(60)}`);
  console.log(`  URL:              ${summary.config.url}`);
  console.log(`  Method:           ${summary.config.method}`);
  console.log(`  Concurrency:      ${summary.config.concurrency}`);
  console.log(`  Duration:         ${summary.totalDuration.toFixed(0)}ms`);
  console.log(`${'-'.repeat(60)}`);
  console.log(`  Total Requests:   ${summary.totalRequests}`);
  console.log(`  Success:          ${summary.successCount}`);
  console.log(`  Errors:           ${summary.errorCount}`);
  console.log(
    `  Error Rate:       ${(summary.errorRate * 100).toFixed(2)}%`,
  );
  console.log(
    `  RPS:              ${summary.rps.toFixed(1)} req/s`,
  );
  console.log(`${'-'.repeat(60)}`);
  console.log(
    `  Avg Response:     ${summary.avgResponseTime.toFixed(1)}ms`,
  );
  console.log(
    `  P50 Response:     ${summary.p50ResponseTime.toFixed(1)}ms`,
  );
  console.log(
    `  P95 Response:     ${summary.p95ResponseTime.toFixed(1)}ms`,
  );
  console.log(
    `  P99 Response:     ${summary.p99ResponseTime.toFixed(1)}ms`,
  );
  console.log(
    `  Min Response:     ${summary.minResponseTime.toFixed(1)}ms`,
  );
  console.log(
    `  Max Response:     ${summary.maxResponseTime.toFixed(1)}ms`,
  );
  console.log(`${'='.repeat(60)}\n`);
}

/**
 * 运行并发负载测试
 * 在指定 duration 内以 concurrency 个并发持续发送请求
 */
async function runConcurrentLoad(
  config: LoadTestConfig,
): Promise<RequestResult[]> {
  const results: RequestResult[] = [];
  const endTime = Date.now() + config.duration * 1000;

  async function worker(): Promise<void> {
    while (Date.now() < endTime) {
      const result = await sendRequest({
        url: config.url,
        method: config.method,
        body: config.body,
        headers: config.headers,
      });
      results.push(result);
    }
  }

  // 启动 concurrency 个并发 worker
  const workers: Promise<void>[] = [];
  for (let i = 0; i < config.concurrency; i++) {
    workers.push(worker());
  }

  await Promise.all(workers);
  return results;
}

/**
 * 运行峰值负载测试
 * 一次性发送 concurrency 个并发请求，等待全部完成
 */
async function runBurstLoad(
  config: LoadTestConfig,
): Promise<RequestResult[]> {
  const promises: Promise<RequestResult>[] = [];
  for (let i = 0; i < config.concurrency; i++) {
    promises.push(
      sendRequest({
        url: config.url,
        method: config.method,
        body: config.body,
        headers: config.headers,
      }),
    );
  }
  return Promise.all(promises);
}

// ============================================================
// 测试用例
// ============================================================

describe('Load Test — API Performance', () => {
  // 延长超时以适应负载测试
  jest.setTimeout(120_000);

  test(
    'Scenario 1: Read-only (GET /api/expenses) — low concurrency baseline',
    async () => {
      const config: LoadTestConfig = {
        url: `${BASE_URL}${API_PREFIX}/expenses?page=1&pageSize=10`,
        method: 'GET',
        concurrency: 5,
        duration: 10,
      };

      const startTime = Date.now();
      const results = await runConcurrentLoad(config);
      const totalDuration = Date.now() - startTime;

      const summary = summarize(config, results, totalDuration);
      printSummary('Scenario 1: Read-only Baseline', summary);

      // 断言：错误率 < 5%
      expect(summary.errorRate).toBeLessThan(0.05);
      // 断言：平均响应时间 < 2s
      expect(summary.avgResponseTime).toBeLessThan(2000);
      // 断言：P95 < 3s
      expect(summary.p95ResponseTime).toBeLessThan(3000);
    },
  );

  test(
    'Scenario 2: Read-write mix (70% GET + 30% POST)',
    async () => {
      const results: RequestResult[] = [];
      const getUrl = `${BASE_URL}${API_PREFIX}/expenses?page=1&pageSize=10`;
      const postUrl = `${BASE_URL}${API_PREFIX}/expenses`;
      const postBody = JSON.stringify({
        title: `load-test-${Date.now()}`,
        amount: 100,
        category: '测试',
      });

      const config: LoadTestConfig = {
        url: getUrl,
        method: 'GET',
        concurrency: 10,
        duration: 15,
      };

      const endTime = Date.now() + config.duration * 1000;

      async function worker(): Promise<void> {
        while (Date.now() < endTime) {
          const isRead = Math.random() < 0.7;
          const result = await sendRequest({
            url: isRead ? getUrl : postUrl,
            method: isRead ? 'GET' : 'POST',
            body: isRead ? undefined : postBody,
          });
          results.push(result);
        }
      }

      const startTime = Date.now();
      const workers: Promise<void>[] = [];
      for (let i = 0; i < config.concurrency; i++) {
        workers.push(worker());
      }
      await Promise.all(workers);
      const totalDuration = Date.now() - startTime;

      const summary = summarize(config, results, totalDuration);
      printSummary('Scenario 2: Read-write Mix', summary);

      // 断言：错误率 < 10%（写入可能因数据校验失败）
      expect(summary.errorRate).toBeLessThan(0.10);
      // 断言：平均响应时间 < 3s
      expect(summary.avgResponseTime).toBeLessThan(3000);
    },
  );

  test(
    'Scenario 3: Sustained load (60s)',
    async () => {
      const config: LoadTestConfig = {
        url: `${BASE_URL}${API_PREFIX}/expenses?page=1&pageSize=10`,
        method: 'GET',
        concurrency: 8,
        duration: 60,
      };

      const startTime = Date.now();
      const results = await runConcurrentLoad(config);
      const totalDuration = Date.now() - startTime;

      const summary = summarize(config, results, totalDuration);
      printSummary('Scenario 3: Sustained Load (60s)', summary);

      // 断言：错误率 < 1%
      expect(summary.errorRate).toBeLessThan(0.01);
      // 断言：RPS > 10（持续负载最低吞吐要求）
      expect(summary.rps).toBeGreaterThan(10);
      // 断言：平均响应时间 < 2s
      expect(summary.avgResponseTime).toBeLessThan(2000);
    },
  );

  test(
    'Scenario 4: Burst load (100 concurrent)',
    async () => {
      const config: LoadTestConfig = {
        url: `${BASE_URL}${API_PREFIX}/expenses?page=1&pageSize=10`,
        method: 'GET',
        concurrency: 100,
        duration: 0, // 峰值测试不持续
      };

      const startTime = Date.now();
      const results = await runBurstLoad(config);
      const totalDuration = Date.now() - startTime;

      const summary = summarize(config, results, totalDuration);
      printSummary('Scenario 4: Burst Load (100 concurrent)', summary);

      // 断言：错误率 < 20%（峰值允许部分失败）
      expect(summary.errorRate).toBeLessThan(0.20);
      // 断言：P95 < 5s（峰值下仍可接受）
      expect(summary.p95ResponseTime).toBeLessThan(5000);
    },
  );

  test(
    'Scenario 5: Multiple endpoints health check under load',
    async () => {
      const endpoints = [
        `${BASE_URL}${API_PREFIX}/expenses?page=1&pageSize=5`,
        `${BASE_URL}${API_PREFIX}/fixed-assets?page=1&pageSize=5`,
        `${BASE_URL}${API_PREFIX}/inventory/dashboard`,
        `${BASE_URL}${API_PREFIX}/budget?page=1&pageSize=5`,
        `${BASE_URL}/api/health`,
      ];

      const results: RequestResult[] = [];
      const concurrency = 10;
      const endTime = Date.now() + 15_000;

      async function worker(): Promise<void> {
        while (Date.now() < endTime) {
          const url = endpoints[Math.floor(Math.random() * endpoints.length)];
          const result = await sendRequest({
            url,
            method: 'GET',
          });
          results.push(result);
        }
      }

      const startTime = Date.now();
      const workers: Promise<void>[] = [];
      for (let i = 0; i < concurrency; i++) {
        workers.push(worker());
      }
      await Promise.all(workers);
      const totalDuration = Date.now() - startTime;

      const config: LoadTestConfig = {
        url: 'multi-endpoint',
        method: 'GET',
        concurrency,
        duration: 15,
      };

      const summary = summarize(config, results, totalDuration);
      printSummary('Scenario 5: Multi-endpoint Health', summary);

      // 断言：错误率 < 5%
      expect(summary.errorRate).toBeLessThan(0.05);
      // 断言：平均响应时间 < 2s
      expect(summary.avgResponseTime).toBeLessThan(2000);
    },
  );
});