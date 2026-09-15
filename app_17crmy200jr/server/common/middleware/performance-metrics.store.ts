import { Injectable, Logger } from '@nestjs/common';

export interface SlowRequestEntry {
  method: string;
  url: string;
  durationMs: number;
  timestamp: string;
  requestSize: number;
  responseSize: number;
}

export interface FrontendMetricsEntry {
  page: string;
  fcp: number | null;
  lcp: number | null;
  cls: number | null;
  inp: number | null;
  ttfb: number | null;
  timestamp: string;
}

@Injectable()
export class PerformanceMetricsStore {
  private readonly logger = new Logger(PerformanceMetricsStore.name);
  private slowRequests: SlowRequestEntry[] = [];
  private readonly maxSlowRequests = 200;
  private requestCount = 0;
  private totalDuration = 0;
  private startTime = Date.now();
  private frontendMetrics: FrontendMetricsEntry[] = [];
  private readonly maxFrontendEntries = 500;

  recordSlowRequest(entry: SlowRequestEntry): void {
    this.slowRequests.unshift(entry);
    if (this.slowRequests.length > this.maxSlowRequests) {
      this.slowRequests = this.slowRequests.slice(0, this.maxSlowRequests);
    }
  }

  recordRequest(durationMs: number): void {
    this.requestCount += 1;
    this.totalDuration += durationMs;
  }

  recordFrontendMetric(entry: FrontendMetricsEntry): void {
    this.frontendMetrics.unshift(entry);
    if (this.frontendMetrics.length > this.maxFrontendEntries) {
      this.frontendMetrics = this.frontendMetrics.slice(0, this.maxFrontendEntries);
    }
  }

  getSlowRequests(limit = 50): SlowRequestEntry[] {
    return this.slowRequests.slice(0, limit);
  }

  getStats(): {
    totalRequests: number;
    avgDurationMs: number;
    uptimeSeconds: number;
    slowRequestCount: number;
  } {
    const avg = this.requestCount > 0
      ? Math.round(this.totalDuration / this.requestCount)
      : 0;
    return {
      totalRequests: this.requestCount,
      avgDurationMs: avg,
      uptimeSeconds: Math.round((Date.now() - this.startTime) / 1000),
      slowRequestCount: this.slowRequests.length,
    };
  }

  getFrontendMetrics(page?: string, limit = 100): { items: FrontendMetricsEntry[]; total: number } {
    let filtered = this.frontendMetrics;
    if (page) {
      filtered = filtered.filter((m) => m.page === page);
    }
    return {
      items: filtered.slice(0, limit),
      total: filtered.length,
    };
  }
}