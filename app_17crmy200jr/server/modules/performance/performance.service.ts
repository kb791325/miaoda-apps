import { Injectable, Logger } from '@nestjs/common';
import { PerformanceMetricsStore } from '../../common/middleware/performance-metrics.store';
import type { FrontendMetricReport } from '@shared/api.interface';

@Injectable()
export class PerformanceService {
  private readonly logger = new Logger(PerformanceService.name);

  constructor(private readonly store: PerformanceMetricsStore) {}

  getSlowRequests(limit: number) {
    return {
      items: this.store.getSlowRequests(limit),
      total: this.store.getStats().slowRequestCount,
    };
  }

  getStats() {
    return this.store.getStats();
  }

  recordFrontendMetric(report: FrontendMetricReport): void {
    this.store.recordFrontendMetric({
      page: report.page,
      fcp: report.metrics.fcp,
      lcp: report.metrics.lcp,
      cls: report.metrics.cls,
      inp: report.metrics.inp,
      ttfb: report.metrics.ttfb,
      timestamp: report.timestamp,
    });
    this.logger.log(
      `前端性能 ${report.page}: FCP=${report.metrics.fcp}ms LCP=${report.metrics.lcp}ms CLS=${report.metrics.cls} TTFB=${report.metrics.ttfb}ms`,
    );
  }

  getFrontendMetrics(page?: string) {
    return this.store.getFrontendMetrics(page);
  }
}