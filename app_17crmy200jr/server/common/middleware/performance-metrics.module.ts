import { Global, Module } from '@nestjs/common';
import { PerformanceMetricsStore } from './performance-metrics.store';
import { PerformanceMiddleware } from './performance.middleware';

@Global()
@Module({
  providers: [PerformanceMetricsStore, PerformanceMiddleware],
  exports: [PerformanceMetricsStore, PerformanceMiddleware],
})
export class PerformanceMetricsModule {}