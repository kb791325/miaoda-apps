/**
 * Database Performance Benchmarks
 *
 * Measures raw database operation latency using Drizzle ORM.
 * Uses a dedicated PostgreSQL connection for benchmark isolation.
 *
 * Each test:
 * - Creates test data with UUID-based identifiers to avoid collisions
 * - Runs 10 measurement iterations after warmup
 * - Cleans up all test data in afterAll
 *
 * Prerequisites:
 * - DATABASE_URL environment variable must be set
 * - pg package must be available (transitive dependency of drizzle-orm)
 */

import { Pool, type PoolClient } from 'pg';
import { benchmark, type BenchmarkResult } from './helpers/performance-helper';

// ------------------------------------------------------------------
// Database connection
// ------------------------------------------------------------------
const DATABASE_URL: string =
  process.env.DATABASE_URL || 'postgresql://localhost:5432/postgres';

let pool: Pool;
let client: PoolClient;

// ------------------------------------------------------------------
// Test data tracking (for cleanup)
// ------------------------------------------------------------------
const testIds: string[] = [];
const TEST_PREFIX: string = 'perf-test-';

function testId(label: string): string {
  const id: string = `${TEST_PREFIX}${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  testIds.push(id);
  return id;
}

// ------------------------------------------------------------------
// beforeAll / afterAll
// ------------------------------------------------------------------
beforeAll(async () => {
  pool = new Pool({
    connectionString: DATABASE_URL,
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
  client = await pool.connect();
  console.log('[DB Perf] Database connection established');
}, 30000);

afterAll(async () => {
  // Clean up test data
  if (client) {
    try {
      for (const id of testIds) {
        await client.query(
          `DELETE FROM expenses WHERE description LIKE $1`,
          [`%${id}%`],
        ).catch(() => { /* best-effort */ });
      }
      console.log(`[DB Perf] Cleaned up ${testIds.length} test records`);
    } catch {
      // Best-effort cleanup
    }
    client.release();
  }
  if (pool) {
    await pool.end();
  }
  console.log('[DB Perf] Database connection closed');
}, 30000);

// ==================================================================
// Database Performance Tests
// ==================================================================
describe('Database Performance Benchmarks', () => {
  // ----------------------------------------------------------------
  // 1. Single INSERT
  // ----------------------------------------------------------------
  describe('Single INSERT', () => {
    const runId: string = testId('single-insert');

    it('INSERT one expense record', async () => {
      let idx: number = 0;
      const result: BenchmarkResult = await benchmark(async () => {
        idx += 1;
        await client.query(
          `INSERT INTO expenses (description, amount, category_l1, category_l2, department, expense_date, approval_status)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            `${runId}-${idx}`,
            '100.00',
            '办公用品',
            '文具',
            '行政部',
            '2026-09-01',
            'draft',
          ],
        );
      }, 10, 3);

      expect(result.successRate).toBeGreaterThanOrEqual(0.95);
      expect(result.avg).toBeLessThan(200);
      expect(result.p95).toBeLessThan(500);
    });
  });

  // ----------------------------------------------------------------
  // 2. Batch INSERT (100 rows in transaction)
  // ----------------------------------------------------------------
  describe('Batch INSERT', () => {
    const batchId: string = testId('batch-insert');

    it('INSERT 100 rows in a transaction', async () => {
      const result: BenchmarkResult = await benchmark(async () => {
        const subId: string = testId('batch');
        await client.query('BEGIN');
        try {
          for (let i = 0; i < 100; i += 1) {
            await client.query(
              `INSERT INTO expenses (description, amount, category_l1, category_l2, department, expense_date, approval_status)
               VALUES ($1, $2, $3, $4, $5, $6, $7)`,
              [
                `${subId}-${i}`,
                `${(i + 1) * 10}.00`,
                '办公用品',
                '文具',
                '行政部',
                '2026-09-01',
                'draft',
              ],
            );
          }
          await client.query('COMMIT');
        } catch (err: unknown) {
          await client.query('ROLLBACK');
          throw err;
        }
      }, 5, 2);

      expect(result.successRate).toBeGreaterThanOrEqual(0.95);
      // Batch insert of 100 rows should complete within reasonable time
      expect(result.avg).toBeLessThan(3000);
    });
  });

  // ----------------------------------------------------------------
  // 3. SELECT by ID (single row)
  // ----------------------------------------------------------------
  describe('SELECT by ID', () => {
    let existingId: string;

    beforeAll(async () => {
      // Insert a record to query
      const res = await client.query(
        `INSERT INTO expenses (description, amount, category_l1, category_l2, department, expense_date, approval_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [
          `${testId('select-by-id')}`,
          '500.00',
          '办公用品',
          '文具',
          '行政部',
          '2026-09-01',
          'draft',
        ],
      );
      existingId = res.rows[0].id;
    });

    it('SELECT expense by primary key', async () => {
      const result: BenchmarkResult = await benchmark(async () => {
        await client.query(`SELECT * FROM expenses WHERE id = $1`, [
          existingId,
        ]);
      }, 20, 5);

      expect(result.successRate).toBeGreaterThanOrEqual(0.95);
      expect(result.avg).toBeLessThan(50);
      expect(result.p95).toBeLessThan(100);
    });
  });

  // ----------------------------------------------------------------
  // 4. SELECT with LIMIT
  // ----------------------------------------------------------------
  describe('SELECT with LIMIT', () => {
    it('SELECT with LIMIT 10', async () => {
      const result: BenchmarkResult = await benchmark(async () => {
        await client.query(
          `SELECT * FROM expenses ORDER BY created_at DESC LIMIT 10`,
        );
      }, 20, 5);

      expect(result.successRate).toBeGreaterThanOrEqual(0.95);
      expect(result.avg).toBeLessThan(100);
      expect(result.p95).toBeLessThan(200);
    });

    it('SELECT with LIMIT 100', async () => {
      const result: BenchmarkResult = await benchmark(async () => {
        await client.query(
          `SELECT * FROM expenses ORDER BY created_at DESC LIMIT 100`,
        );
      }, 20, 5);

      expect(result.successRate).toBeGreaterThanOrEqual(0.95);
      expect(result.avg).toBeLessThan(200);
      expect(result.p95).toBeLessThan(500);
    });

    it('SELECT with LIMIT 1000', async () => {
      const result: BenchmarkResult = await benchmark(async () => {
        await client.query(
          `SELECT * FROM expenses ORDER BY created_at DESC LIMIT 1000`,
        );
      }, 10, 3);

      expect(result.successRate).toBeGreaterThanOrEqual(0.95);
      expect(result.avg).toBeLessThan(1000);
      expect(result.p95).toBeLessThan(2000);
    });
  });

  // ----------------------------------------------------------------
  // 5. SELECT with WHERE (conditional query)
  // ----------------------------------------------------------------
  describe('SELECT with WHERE (conditional)', () => {
    it('SELECT by category', async () => {
      const result: BenchmarkResult = await benchmark(async () => {
        await client.query(
          `SELECT * FROM expenses WHERE category_l1 = $1 LIMIT 50`,
          ['办公用品'],
        );
      }, 20, 5);

      expect(result.successRate).toBeGreaterThanOrEqual(0.95);
      expect(result.avg).toBeLessThan(100);
      expect(result.p95).toBeLessThan(200);
    });

    it('SELECT by department', async () => {
      const result: BenchmarkResult = await benchmark(async () => {
        await client.query(
          `SELECT * FROM expenses WHERE department = $1 LIMIT 50`,
          ['行政部'],
        );
      }, 20, 5);

      expect(result.successRate).toBeGreaterThanOrEqual(0.95);
      expect(result.avg).toBeLessThan(100);
      expect(result.p95).toBeLessThan(200);
    });

    it('SELECT by date range', async () => {
      const result: BenchmarkResult = await benchmark(async () => {
        await client.query(
          `SELECT * FROM expenses
           WHERE expense_date >= $1 AND expense_date < $2
           LIMIT 50`,
          ['2026-01-01', '2026-12-31'],
        );
      }, 20, 5);

      expect(result.successRate).toBeGreaterThanOrEqual(0.95);
      expect(result.avg).toBeLessThan(200);
      expect(result.p95).toBeLessThan(500);
    });
  });

  // ----------------------------------------------------------------
  // 6. Aggregation queries (COUNT, SUM, GROUP BY)
  // ----------------------------------------------------------------
  describe('Aggregation queries', () => {
    it('SELECT COUNT(*)', async () => {
      const result: BenchmarkResult = await benchmark(async () => {
        await client.query(`SELECT COUNT(*) as cnt FROM expenses`);
      }, 20, 5);

      expect(result.successRate).toBeGreaterThanOrEqual(0.95);
      expect(result.avg).toBeLessThan(100);
      expect(result.p95).toBeLessThan(200);
    });

    it('SELECT SUM(amount) GROUP BY category', async () => {
      const result: BenchmarkResult = await benchmark(async () => {
        await client.query(
          `SELECT category_l1, SUM(amount::numeric) as total
           FROM expenses
           GROUP BY category_l1
           ORDER BY total DESC`,
        );
      }, 20, 5);

      expect(result.successRate).toBeGreaterThanOrEqual(0.95);
      expect(result.avg).toBeLessThan(500);
      expect(result.p95).toBeLessThan(1000);
    });

    it('SELECT COUNT, SUM with WHERE', async () => {
      const result: BenchmarkResult = await benchmark(async () => {
        await client.query(
          `SELECT
             COUNT(*) as cnt,
             COALESCE(SUM(amount::numeric), 0) as total
           FROM expenses
           WHERE expense_date >= $1 AND expense_date < $2`,
          ['2026-01-01', '2026-12-31'],
        );
      }, 20, 5);

      expect(result.successRate).toBeGreaterThanOrEqual(0.95);
      expect(result.avg).toBeLessThan(200);
      expect(result.p95).toBeLessThan(500);
    });
  });

  // ----------------------------------------------------------------
  // 7. UPDATE single record
  // ----------------------------------------------------------------
  describe('UPDATE single record', () => {
    let updateTargetId: string;

    beforeAll(async () => {
      const res = await client.query(
        `INSERT INTO expenses (description, amount, category_l1, category_l2, department, expense_date, approval_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [
          `${testId('update-target')}`,
          '200.00',
          '办公用品',
          '文具',
          '行政部',
          '2026-09-01',
          'draft',
        ],
      );
      updateTargetId = res.rows[0].id;
    });

    it('UPDATE amount on single record', async () => {
      let counter: number = 0;
      const result: BenchmarkResult = await benchmark(async () => {
        counter += 1;
        await client.query(
          `UPDATE expenses SET amount = $1 WHERE id = $2`,
          [`${200 + counter}.00`, updateTargetId],
        );
      }, 20, 5);

      expect(result.successRate).toBeGreaterThanOrEqual(0.95);
      expect(result.avg).toBeLessThan(100);
      expect(result.p95).toBeLessThan(200);
    });
  });

  // ----------------------------------------------------------------
  // 8. Transaction with multiple operations
  // ----------------------------------------------------------------
  describe('Transaction with multiple operations', () => {
    it('INSERT + UPDATE + SELECT in transaction', async () => {
      const result: BenchmarkResult = await benchmark(async () => {
        const txId: string = testId('tx');
        await client.query('BEGIN');
        try {
          // Insert
          const insertRes = await client.query(
            `INSERT INTO expenses (description, amount, category_l1, category_l2, department, expense_date, approval_status)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING id`,
            [txId, '300.00', '办公用品', '耗材', '行政部', '2026-09-01', 'draft'],
          );
          const newId: string = insertRes.rows[0].id;

          // Update
          await client.query(
            `UPDATE expenses SET amount = $1 WHERE id = $2`,
            ['350.00', newId],
          );

          // Select to verify
          await client.query(
            `SELECT * FROM expenses WHERE id = $1`,
            [newId],
          );

          await client.query('COMMIT');
        } catch (err: unknown) {
          await client.query('ROLLBACK');
          throw err;
        }
      }, 10, 3);

      expect(result.successRate).toBeGreaterThanOrEqual(0.95);
      expect(result.avg).toBeLessThan(500);
      expect(result.p95).toBeLessThan(1000);
    });
  });
});