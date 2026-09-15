import { Injectable, Logger } from '@nestjs/common';
import { PerformanceMetricsStore } from '../../common/middleware/performance-metrics.store';
import { MonitoringStore } from './monitoring.store';
import { CacheService } from '../../common/cache/cache.service';
import type {
  PerformanceOverview,
  ResponseTimeStats,
  ThroughputStats,
  SlowRequestItem,
  CacheStats,
} from '@shared/api.interface';

@Injectable()
export class PerformanceMonitorService {
  private readonly logger = new Logger(PerformanceMonitorService.name);

  constructor(
    private readonly perfStore: PerformanceMetricsStore,
    private readonly monitorStore: MonitoringStore,
    private readonly cacheService: CacheService,
  ) {}

  getOverview(): PerformanceOverview {
    const stats = this.perfStore.getStats();
    const pValues = this.calcPercentiles();
    const throughput = this.monitorStore.getThroughputStats();
    const cacheStats = this.getCacheStats();

    return {
      totalRequests: stats.totalRequests,
      avgDurationMs: stats.avgDurationMs,
      p50Ms: pValues.p50,
      p95Ms: pValues.p95,
      p99Ms: pValues.p99,
      uptimeSeconds: stats.uptimeSeconds,
      slowRequestCount: stats.slowRequestCount,
      currentQps: throughput.currentQps,
      cacheHitRate: cacheStats.hitRate,
    };
  }

  getResponseTimeStats(): ResponseTimeStats {
    const histogram = this.monitorStore.getHistogram();
    const respStats = this.monitorStore.getResponseStats();
    const pValues = this.calcPercentiles();

    const bucketDistribution = histogram.map((b) => ({
      range:
        b.rangeEnd === Infinity
          ? `${b.rangeStart}+ms`
          : `${b.rangeStart}-${b.rangeEnd}ms`,
      count: b.count,
    }));

    return {
      avgDurationMs:
        respStats.totalCount > 0
          ? Math.round(respStats.totalDuration / respStats.totalCount)
          : 0,
      p50Ms: pValues.p50,
      p95Ms: pValues.p95,
      p99Ms: pValues.p99,
      maxDurationMs: respStats.maxDuration,
      minDurationMs: respStats.minDuration,
      totalRequests: respStats.totalCount,
      bucketDistribution,
    };
  }

  getThroughputStats(): ThroughputStats {
    return this.monitorStore.getThroughputStats();
  }

  getSlowRequests(limit: number = 50): SlowRequestItem[] {
    return this.perfStore.getSlowRequests(limit);
  }

  getCacheStats(): CacheStats {
    const raw = this.cacheService.getStats();
    return {
      hitRate: raw.memory.hitRate,
      hits: raw.memory.hits,
      misses: raw.memory.misses,
      totalKeys: raw.memory.size,
      memoryUsage: raw.memory.size,
    };
  }

  private calcPercentiles(): { p50: number; p95: number; p99: number } {
    const histogram = this.monitorStore.getHistogram();
    let totalCount = 0;
    for (const bucket of histogram) {
      totalCount += bucket.count;
    }

    if (totalCount === 0) {
      return { p50: 0, p95: 0, p99: 0 };
    }

    const p50Target = totalCount * 0.5;
    const p95Target = totalCount * 0.95;
    const p99Target = totalCount * 0.99;

    let cumCount = 0;
    let p50 = 0;
    let p95 = 0;
    let p99 = 0;
    let p50Found = false;
    let p95Found = false;
    let p99Found = false;

    for (const bucket of histogram) {
      cumCount += bucket.count;
      const bucketEnd =
        bucket.rangeEnd === Infinity ? bucket.rangeStart : bucket.rangeEnd;

      if (!p50Found && cumCount >= p50Target) {
        p50 = bucketEnd;
        p50Found = true;
      }
      if (!p95Found && cumCount >= p95Target) {
        p95 = bucketEnd;
        p95Found = true;
      }
      if (!p99Found && cumCount >= p99Target) {
        p99 = bucketEnd;
        p99Found = true;
      }
      if (p50Found && p95Found && p99Found) break;
    }

    return { p50, p95, p99 };
  }
}