import { Injectable, Logger } from '@nestjs/common';
import type {
  ErrorEntry,
  ErrorStatus,
  AlertEvent,
  LogEntry,
} from '@shared/api.interface';

export interface HistogramBucket {
  rangeStart: number;
  rangeEnd: number;
  count: number;
}

export interface ThroughputBucket {
  timestamp: number;
  count: number;
}

export interface BusinessMetricsCache {
  value: unknown;
  timestamp: string;
}

@Injectable()
export class MonitoringStore {
  private readonly logger = new Logger(MonitoringStore.name);

  // 响应时间直方图
  private histogramBuckets: HistogramBucket[] = [
    { rangeStart: 0, rangeEnd: 100, count: 0 },
    { rangeStart: 100, rangeEnd: 200, count: 0 },
    { rangeStart: 200, rangeEnd: 300, count: 0 },
    { rangeStart: 300, rangeEnd: 500, count: 0 },
    { rangeStart: 500, rangeEnd: 1000, count: 0 },
    { rangeStart: 1000, rangeEnd: 2000, count: 0 },
    { rangeStart: 2000, rangeEnd: 5000, count: 0 },
    { rangeStart: 5000, rangeEnd: 10000, count: 0 },
    { rangeStart: 10000, rangeEnd: Infinity, count: 0 },
  ];
  private totalResponseCount = 0;
  private totalResponseDuration = 0;
  private maxResponseDuration = 0;
  private minResponseDuration = Infinity;

  // 错误追踪存储
  private errors: ErrorEntry[] = [];
  private readonly maxErrors = 500;

  // 告警事件存储
  private alerts: AlertEvent[] = [];
  private readonly maxAlerts = 1000;

  // 结构化日志存储
  private logs: LogEntry[] = [];
  private readonly maxLogs = 500;

  // 请求吞吐量追踪
  private throughputBuckets: ThroughputBucket[] = [];
  private readonly maxThroughputBuckets = 3600; // 1hr of seconds

  // 业务指标缓存
  private businessMetricsCache: Map<string, BusinessMetricsCache> = new Map();

  // ========== 响应时间直方图 ==========

  recordResponseTime(durationMs: number): void {
    this.totalResponseCount += 1;
    this.totalResponseDuration += durationMs;
    if (durationMs > this.maxResponseDuration) {
      this.maxResponseDuration = durationMs;
    }
    if (durationMs < this.minResponseDuration) {
      this.minResponseDuration = durationMs;
    }

    for (const bucket of this.histogramBuckets) {
      if (durationMs >= bucket.rangeStart && durationMs < bucket.rangeEnd) {
        bucket.count += 1;
        break;
      }
    }
  }

  getHistogram(): HistogramBucket[] {
    return this.histogramBuckets.map((b: HistogramBucket) => ({ ...b }));
  }

  getResponseStats(): {
    totalCount: number;
    totalDuration: number;
    maxDuration: number;
    minDuration: number;
  } {
    return {
      totalCount: this.totalResponseCount,
      totalDuration: this.totalResponseDuration,
      maxDuration: this.maxResponseDuration,
      minDuration:
        this.minResponseDuration === Infinity ? 0 : this.minResponseDuration,
    };
  }

  // ========== 错误追踪 ==========

  recordError(entry: ErrorEntry): void {
    this.errors.unshift(entry);
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(0, this.maxErrors);
    }
  }

  findErrorByTypeAndMessage(type: string, message: string): ErrorEntry | undefined {
    return this.errors.find(
      (e: ErrorEntry) => e.type === type && e.message === message,
    );
  }

  updateError(id: string, patch: Partial<ErrorEntry>): void {
    const idx = this.errors.findIndex((e: ErrorEntry) => e.id === id);
    if (idx !== -1) {
      this.errors[idx] = { ...this.errors[idx], ...patch };
    }
  }

  getErrors(
    page: number,
    pageSize: number,
    status?: ErrorStatus,
  ): { items: ErrorEntry[]; total: number } {
    let filtered = this.errors;
    if (status !== undefined) {
      filtered = filtered.filter((e: ErrorEntry) => e.status === status);
    }
    const total = filtered.length;
    const start = (page - 1) * pageSize;
    const items = filtered.slice(start, start + pageSize);
    return { items, total };
  }

  getErrorById(id: string): ErrorEntry | undefined {
    return this.errors.find((e: ErrorEntry) => e.id === id);
  }

  deleteError(id: string): void {
    this.errors = this.errors.filter((e: ErrorEntry) => e.id !== id);
  }

  getAllErrors(): ErrorEntry[] {
    return this.errors;
  }

  // ========== 告警事件 ==========

  recordAlert(alert: AlertEvent): void {
    this.alerts.unshift(alert);
    if (this.alerts.length > this.maxAlerts) {
      this.alerts = this.alerts.slice(0, this.maxAlerts);
    }
  }

  findActiveAlertByRuleId(ruleId: string): AlertEvent | undefined {
    return this.alerts.find(
      (a: AlertEvent) => a.ruleId === ruleId && a.status === 'active',
    );
  }

  getActiveAlerts(): AlertEvent[] {
    return this.alerts.filter((a: AlertEvent) => a.status === 'active');
  }

  getAlerts(
    page: number,
    pageSize: number,
    status?: string,
  ): { items: AlertEvent[]; total: number } {
    let filtered = this.alerts;
    if (status !== undefined) {
      filtered = filtered.filter((a: AlertEvent) => a.status === status);
    }
    const total = filtered.length;
    const start = (page - 1) * pageSize;
    const items = filtered.slice(start, start + pageSize);
    return { items, total };
  }

  updateAlert(id: string, patch: Partial<AlertEvent>): void {
    const idx = this.alerts.findIndex((a: AlertEvent) => a.id === id);
    if (idx !== -1) {
      this.alerts[idx] = { ...this.alerts[idx], ...patch };
    }
  }

  getAlertById(id: string): AlertEvent | undefined {
    return this.alerts.find((a: AlertEvent) => a.id === id);
  }

  getAllAlerts(): AlertEvent[] {
    return this.alerts;
  }

  // ========== 结构化日志 ==========

  appendLog(entry: LogEntry): void {
    this.logs.unshift(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }
  }

  queryLogs(params: {
    startTime?: string;
    endTime?: string;
    level?: string;
    category?: string;
    keyword?: string;
    page: number;
    pageSize: number;
  }): { items: LogEntry[]; total: number } {
    let filtered = this.logs;
    if (params.startTime) {
      filtered = filtered.filter(
        (l: LogEntry) => l.timestamp >= params.startTime!,
      );
    }
    if (params.endTime) {
      filtered = filtered.filter(
        (l: LogEntry) => l.timestamp <= params.endTime!,
      );
    }
    if (params.level) {
      filtered = filtered.filter((l: LogEntry) => l.level === params.level);
    }
    if (params.category) {
      filtered = filtered.filter(
        (l: LogEntry) => l.category === params.category,
      );
    }
    if (params.keyword) {
      const kw = params.keyword.toLowerCase();
      filtered = filtered.filter(
        (l: LogEntry) => l.message.toLowerCase().includes(kw),
      );
    }
    const total = filtered.length;
    const start = (params.page - 1) * params.pageSize;
    const items = filtered.slice(start, start + params.pageSize);
    return { items, total };
  }

  getLogStats(): {
    byLevel: Record<string, number>;
    byCategory: Record<string, number>;
    lastError: LogEntry | null;
  } {
    const byLevel: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    let lastError: LogEntry | null = null;
    for (const l of this.logs) {
      byLevel[l.level] = (byLevel[l.level] || 0) + 1;
      byCategory[l.category] = (byCategory[l.category] || 0) + 1;
      if (l.level === 'error' || l.level === 'fatal') {
        if (!lastError || l.timestamp > lastError.timestamp) {
          lastError = l;
        }
      }
    }
    return { byLevel, byCategory, lastError };
  }

  getLogCount(): number {
    return this.logs.length;
  }

  // ========== 吞吐量追踪 ==========

  recordThroughput(): void {
    const now = Math.floor(Date.now() / 1000);
    const lastBucket = this.throughputBuckets[this.throughputBuckets.length - 1];
    if (lastBucket && lastBucket.timestamp === now) {
      lastBucket.count += 1;
    } else {
      this.throughputBuckets.push({ timestamp: now, count: 1 });
      if (this.throughputBuckets.length > this.maxThroughputBuckets) {
        this.throughputBuckets = this.throughputBuckets.slice(
          -this.maxThroughputBuckets,
        );
      }
    }
  }

  getThroughputStats(): {
    currentQps: number;
    peakQps: number;
    requestsLastMinute: number;
    requestsLastHour: number;
    requestsLast24h: number;
  } {
    const now = Math.floor(Date.now() / 1000);
    const oneMinAgo = now - 60;
    const oneHourAgo = now - 3600;
    const oneDayAgo = now - 86400;

    let lastMinute = 0;
    let lastHour = 0;
    let last24h = 0;
    let peakQps = 0;

    for (const bucket of this.throughputBuckets) {
      if (bucket.timestamp >= oneDayAgo) {
        last24h += bucket.count;
      }
      if (bucket.timestamp >= oneHourAgo) {
        lastHour += bucket.count;
      }
      if (bucket.timestamp >= oneMinAgo) {
        lastMinute += bucket.count;
      }
      if (bucket.count > peakQps) {
        peakQps = bucket.count;
      }
    }

    const currentQps = lastMinute > 0
      ? Math.round(lastMinute / 60)
      : 0;

    return {
      currentQps,
      peakQps,
      requestsLastMinute: lastMinute,
      requestsLastHour: lastHour,
      requestsLast24h: last24h,
    };
  }

  // ========== 业务指标缓存 ==========

  setBusinessMetricsCache(key: string, value: unknown): void {
    this.businessMetricsCache.set(key, {
      value,
      timestamp: new Date().toISOString(),
    });
  }

  getBusinessMetricsCache(key: string): BusinessMetricsCache | undefined {
    return this.businessMetricsCache.get(key);
  }

  clearBusinessMetricsCache(): void {
    this.businessMetricsCache.clear();
  }
}