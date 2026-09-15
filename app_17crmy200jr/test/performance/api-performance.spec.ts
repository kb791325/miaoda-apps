/**
 * API Performance Benchmarks
 *
 * Measures latency and throughput of key API endpoints using axios.
 * Each test runs with warmup rounds then records latency samples.
 *
 * Prerequisites:
 * - Dev server must be running on the configured BASE_URL
 * - Test data should exist in the database (seeded via e2e setup)
 */

import axios from 'axios';
import { benchmark, type BenchmarkResult } from './helpers/performance-helper';

const BASE_URL: string =
  process.env.API_BASE_URL || 'http://localhost:8001';
const API_PREFIX: string = '/app/app_17crmy200jr';

/** Shared assertion helper for benchmark results */
function assertPerformance(
  result: BenchmarkResult,
  maxAvg: number,
  maxP95: number,
  description: string,
): void {
  expect(result.successRate).toBeGreaterThanOrEqual(0.95);
  if (result.successfulIterations > 0) {
    expect(result.avg).toBeLessThan(maxAvg);
    expect(result.p95).toBeLessThan(maxP95);
  }
}

describe('API Performance Benchmarks', () => {
  // ------------------------------------------------------------------
  // Service health check
  // ------------------------------------------------------------------
  beforeAll(async () => {
    try {
      await axios.get(`${BASE_URL}${API_PREFIX}/api/dashboard/expense-overview`, {
        timeout: 10000,
      });
      console.log('[API Perf] Service is reachable');
    } catch (err: unknown) {
      const msg: string =
        err instanceof Error ? err.message : String(err);
      console.warn(
        `[API Perf] Service may not be reachable: ${msg}. Tests may fail.`,
      );
    }
  }, 30000);

  // ==================================================================
  // Expenses API
  // ==================================================================
  describe('Expenses API', () => {
    it('GET /api/expenses — list with pagination', async () => {
      const result: BenchmarkResult = await benchmark(
        () =>
          axios.get(
            `${BASE_URL}${API_PREFIX}/api/expenses?page=1&pageSize=20`,
            { timeout: 15000 },
          ),
        10,
        3,
      );
      assertPerformance(result, 1000, 2000, 'expenses list');
    });

    it('GET /api/expenses — list with filters', async () => {
      const result: BenchmarkResult = await benchmark(
        () =>
          axios.get(
            `${BASE_URL}${API_PREFIX}/api/expenses?page=1&pageSize=20&categoryL1=办公用品`,
            { timeout: 15000 },
          ),
        10,
        3,
      );
      assertPerformance(result, 1000, 2000, 'expenses filtered list');
    });
  });

  // ==================================================================
  // Fixed Assets API
  // ==================================================================
  describe('Fixed Assets API', () => {
    it('GET /api/fixed-assets — list with pagination', async () => {
      const result: BenchmarkResult = await benchmark(
        () =>
          axios.get(
            `${BASE_URL}${API_PREFIX}/api/fixed-assets?page=1&pageSize=20`,
            { timeout: 15000 },
          ),
        10,
        3,
      );
      assertPerformance(result, 1000, 2000, 'fixed-assets list');
    });

    it('GET /api/fixed-assets — list with filters', async () => {
      const result: BenchmarkResult = await benchmark(
        () =>
          axios.get(
            `${BASE_URL}${API_PREFIX}/api/fixed-assets?page=1&pageSize=20&assetType=电子设备`,
            { timeout: 15000 },
          ),
        10,
        3,
      );
      assertPerformance(result, 1000, 2000, 'fixed-assets filtered list');
    });
  });

  // ==================================================================
  // Inventory API
  // ==================================================================
  describe('Inventory API', () => {
    it('GET /api/inventory-tasks — list with pagination', async () => {
      const result: BenchmarkResult = await benchmark(
        () =>
          axios.get(
            `${BASE_URL}${API_PREFIX}/api/inventory-tasks?page=1&pageSize=20`,
            { timeout: 15000 },
          ),
        10,
        3,
      );
      assertPerformance(result, 1000, 2000, 'inventory-tasks list');
    });

    it('GET /api/inventory-tasks — list with status filter', async () => {
      const result: BenchmarkResult = await benchmark(
        () =>
          axios.get(
            `${BASE_URL}${API_PREFIX}/api/inventory-tasks?page=1&pageSize=20&status=completed`,
            { timeout: 15000 },
          ),
        10,
        3,
      );
      assertPerformance(result, 1000, 2000, 'inventory-tasks filtered list');
    });
  });

  // ==================================================================
  // Dashboard API
  // ==================================================================
  describe('Dashboard API', () => {
    it('GET /api/dashboard/expense-overview', async () => {
      const result: BenchmarkResult = await benchmark(
        () =>
          axios.get(
            `${BASE_URL}${API_PREFIX}/api/dashboard/expense-overview`,
            { timeout: 20000 },
          ),
        10,
        3,
      );
      assertPerformance(result, 2000, 4000, 'expense overview');
    });

    it('GET /api/dashboard/asset-overview', async () => {
      const result: BenchmarkResult = await benchmark(
        () =>
          axios.get(
            `${BASE_URL}${API_PREFIX}/api/dashboard/asset-overview`,
            { timeout: 20000 },
          ),
        10,
        3,
      );
      assertPerformance(result, 2000, 4000, 'asset overview');
    });

    it('GET /api/dashboard/expense-by-category', async () => {
      const result: BenchmarkResult = await benchmark(
        () =>
          axios.get(
            `${BASE_URL}${API_PREFIX}/api/dashboard/expense-by-category`,
            { timeout: 20000 },
          ),
        10,
        3,
      );
      assertPerformance(result, 2000, 4000, 'expense by category');
    });
  });

  // ==================================================================
  // Inventory Dashboard API
  // ==================================================================
  describe('Inventory Dashboard API', () => {
    it('GET /api/inventory-dashboard/owner-matrix', async () => {
      const result: BenchmarkResult = await benchmark(
        () =>
          axios.get(
            `${BASE_URL}${API_PREFIX}/api/inventory-dashboard/owner-matrix`,
            { timeout: 20000 },
          ),
        10,
        3,
      );
      assertPerformance(result, 2000, 5000, 'owner matrix');
    });

    it('GET /api/inventory-dashboard/stock-trend', async () => {
      const result: BenchmarkResult = await benchmark(
        () =>
          axios.get(
            `${BASE_URL}${API_PREFIX}/api/inventory-dashboard/stock-trend`,
            { timeout: 20000 },
          ),
        10,
        3,
      );
      assertPerformance(result, 2000, 5000, 'stock trend');
    });

    it('GET /api/inventory-dashboard/overview', async () => {
      const result: BenchmarkResult = await benchmark(
        () =>
          axios.get(
            `${BASE_URL}${API_PREFIX}/api/inventory-dashboard/overview`,
            { timeout: 20000 },
          ),
        10,
        3,
      );
      assertPerformance(result, 2000, 5000, 'inventory overview');
    });
  });

  // ==================================================================
  // Budget API
  // ==================================================================
  describe('Budget API', () => {
    it('GET /api/budget — list by year', async () => {
      const result: BenchmarkResult = await benchmark(
        () =>
          axios.get(
            `${BASE_URL}${API_PREFIX}/api/budget?year=2026&page=1&pageSize=20`,
            { timeout: 15000 },
          ),
        10,
        3,
      );
      assertPerformance(result, 1000, 2000, 'budget list');
    });

    it('GET /api/budget/execution/summary', async () => {
      const result: BenchmarkResult = await benchmark(
        () =>
          axios.get(
            `${BASE_URL}${API_PREFIX}/api/budget/execution/summary?year=2026&month=09`,
            { timeout: 15000 },
          ),
        10,
        3,
      );
      assertPerformance(result, 1000, 2000, 'budget execution summary');
    });
  });
});