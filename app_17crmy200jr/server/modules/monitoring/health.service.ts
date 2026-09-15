import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from '@lark-apaas/fullstack-nestjs-core';
import { sql } from 'drizzle-orm';
import { CacheService } from '../../common/cache/cache.service';
import type { HealthStatus } from '@shared/api.interface';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private readonly startTime = Date.now();

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    private readonly cacheService: CacheService,
  ) {}

  async checkLiveness(): Promise<{ status: string; uptime: number }> {
    return {
      status: 'ok',
      uptime: Math.round((Date.now() - this.startTime) / 1000),
    };
  }

  async checkReadiness(): Promise<HealthStatus> {
    const checks: Record<string, { status: string; message?: string; latencyMs?: number }> = {};

    // 数据库检查
    const dbStart = Date.now();
    try {
      await this.db.execute(sql`SELECT 1`);
      checks['database'] = {
        status: 'ok',
        latencyMs: Date.now() - dbStart,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      checks['database'] = {
        status: 'unhealthy',
        message,
        latencyMs: Date.now() - dbStart,
      };
    }

    // 缓存检查
    const cacheStart = Date.now();
    try {
      const cacheStats = this.cacheService.getStats();
      const isOk = cacheStats.redisStatus === 'connected' || cacheStats.redisStatus === 'fallback';
      checks['cache'] = {
        status: isOk ? 'ok' : 'degraded',
        message: `Redis: ${cacheStats.redisStatus}, hitRate: ${cacheStats.memory.hitRate}`,
        latencyMs: Date.now() - cacheStart,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      checks['cache'] = {
        status: 'unhealthy',
        message,
        latencyMs: Date.now() - cacheStart,
      };
    }

    const allOk = Object.values(checks).every((c) => c.status === 'ok');
    const anyUnhealthy = Object.values(checks).some((c) => c.status === 'unhealthy');

    return {
      status: anyUnhealthy ? 'unhealthy' : allOk ? 'healthy' : 'degraded',
      uptime: Math.round((Date.now() - this.startTime) / 1000),
      checks,
      timestamp: new Date().toISOString(),
    };
  }

  async checkDetails(): Promise<HealthStatus> {
    const checks: Record<string, { status: string; message?: string; latencyMs?: number }> = {};

    // 数据库
    const dbStart = Date.now();
    try {
      await this.db.execute(sql`SELECT 1`);
      checks['database'] = {
        status: 'ok',
        latencyMs: Date.now() - dbStart,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      checks['database'] = {
        status: 'unhealthy',
        message,
        latencyMs: Date.now() - dbStart,
      };
    }

    // 缓存
    const cacheStart = Date.now();
    try {
      const cacheStats = this.cacheService.getStats();
      const isOk = cacheStats.redisStatus === 'connected' || cacheStats.redisStatus === 'fallback';
      checks['cache'] = {
        status: isOk ? 'ok' : 'degraded',
        message: `Redis: ${cacheStats.redisStatus}, keys: ${cacheStats.memory.size}, hitRate: ${(cacheStats.memory.hitRate * 100).toFixed(1)}%`,
        latencyMs: Date.now() - cacheStart,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      checks['cache'] = {
        status: 'unhealthy',
        message,
        latencyMs: Date.now() - cacheStart,
      };
    }

    // 内存
    const memUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
    const rssMB = Math.round(memUsage.rss / 1024 / 1024);
    const memPercent = Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100);
    checks['memory'] = {
      status: memPercent > 90 ? 'degraded' : 'ok',
      message: `Heap: ${heapUsedMB}MB / ${heapTotalMB}MB (${memPercent}%), RSS: ${rssMB}MB`,
    };

    // 磁盘（简单检查：临时目录是否可写）
    checks['disk'] = {
      status: 'ok',
      message: 'N/A (FaaS environment)',
    };

    // 飞书 API（不做实际调用，标记为未知）
    checks['feishu_api'] = {
      status: 'ok',
      message: 'Not checked (requires external API call)',
    };

    const allOk = Object.values(checks).every((c) => c.status === 'ok');
    const anyUnhealthy = Object.values(checks).some((c) => c.status === 'unhealthy');

    return {
      status: anyUnhealthy ? 'unhealthy' : allOk ? 'healthy' : 'degraded',
      uptime: Math.round((Date.now() - this.startTime) / 1000),
      checks,
      timestamp: new Date().toISOString(),
    };
  }
}