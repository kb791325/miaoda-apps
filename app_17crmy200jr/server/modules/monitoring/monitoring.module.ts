import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { MonitoringStore } from './monitoring.store';
import { PerformanceMonitorService } from './performance-monitor.service';
import { PerformanceMonitorController } from './performance-monitor.controller';
import { ErrorTrackerService } from './error-tracker.service';
import { ErrorTrackerController } from './error-tracker.controller';
import { ErrorCaptureInterceptor } from './error-capture.interceptor';
import { BusinessMetricsService } from './business-metrics.service';
import { BusinessMetricsController } from './business-metrics.controller';
import { AlertService } from './alert.service';
import { AlertController } from './alert.controller';
import { HealthService } from './health.service';
import { MonitoringHealthController } from './health.controller';
import { StructuredLoggerService } from './structured-logger.service';
import { LogQueryController } from './log-query.controller';
import { CacheModule } from '../../common/cache/cache.module';

@Module({
  imports: [CacheModule],
  controllers: [
    PerformanceMonitorController,
    ErrorTrackerController,
    BusinessMetricsController,
    AlertController,
    MonitoringHealthController,
    LogQueryController,
  ],
  providers: [
    MonitoringStore,
    PerformanceMonitorService,
    ErrorTrackerService,
    BusinessMetricsService,
    AlertService,
    HealthService,
    StructuredLoggerService,
    {
      provide: APP_INTERCEPTOR,
      useClass: ErrorCaptureInterceptor,
    },
  ],
  exports: [
    MonitoringStore,
    StructuredLoggerService,
    AlertService,
  ],
})
export class MonitoringModule implements OnModuleInit {
  private readonly logger = new Logger(MonitoringModule.name);
  private alertInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly alertService: AlertService,
    private readonly perfMonitorService: PerformanceMonitorService,
    private readonly errorTrackerService: ErrorTrackerService,
    private readonly businessMetricsService: BusinessMetricsService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.logger.log('监控模块初始化完成');

    // 启动告警定时检查（每 5 分钟）
    this.alertInterval = setInterval(() => {
      this.runAlertCheck().catch((err: Error) => {
        this.logger.error(`告警检查失败: ${err.message}`);
      });
    }, 5 * 60 * 1000);

    // 首次延迟 30 秒执行
    setTimeout(() => {
      this.runAlertCheck().catch((err: Error) => {
        this.logger.error(`首次告警检查失败: ${err.message}`);
      });
    }, 30_000);
  }

  private async runAlertCheck(): Promise<void> {
    try {
      const performance = this.perfMonitorService.getOverview();
      const errors = this.errorTrackerService.getErrorStats();
      const business = await this.businessMetricsService.getOverview();

      this.alertService.updateContext(performance, errors, business);
      const triggered = this.alertService.checkAllRules();

      if (triggered.length > 0) {
        this.logger.log(
          `告警检查完成: 触发 ${triggered.length} 条新告警`,
        );
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`告警检查异常: ${message}`);
    }
  }
}