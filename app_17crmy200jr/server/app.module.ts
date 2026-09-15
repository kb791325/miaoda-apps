import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { Global, Module, ValidationPipe, type MiddlewareConsumer, type NestModule } from '@nestjs/common';
import { PlatformModule } from '@lark-apaas/fullstack-nestjs-core';
import { PerformanceMiddleware } from './common/middleware/performance.middleware';
import { PerformanceMetricsModule } from './common/middleware/performance-metrics.module';
import { RateLimitMiddleware } from './common/middleware/rate-limit.middleware';
import { SecurityHeadersMiddleware } from './common/middleware/security-headers.middleware';
import { SuspiciousRequestMiddleware } from './common/middleware/suspicious-request.middleware';
import { SuspiciousRequestModule } from './common/middleware/suspicious-request.module';
import { AuditMiddleware } from './common/middleware/audit.middleware';

import { AppAuthGuard } from './common/guards/app-auth.guard';

import { GlobalExceptionFilter } from './common/filters/exception.filter';
import { CacheModule } from './common/cache/cache.module';
import { HealthModule } from './common/health/health.module';
import { SwaggerConfigModule } from './common/swagger/swagger-config.module';
import { ViewModule } from './modules/view/view.module';
import { ExpensesModule } from './modules/expenses/expenses.module';
import { FixedAssetsModule } from './modules/fixed-assets/fixed-assets.module';
import { AssetReservationsModule } from './modules/asset-reservations/asset-reservations.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ReportsModule } from './modules/reports/reports.module';
import { FeishuSyncModule } from './modules/feishu-sync/feishu-sync.module';
import { FeishuBitableModule } from './modules/feishu-bitable/feishu-bitable.module';
import { OperationLogModule } from './modules/operation-log/operation-log.module';
import { AuditLogModule } from './modules/audit-log/audit-log.module';
import { AttachmentsModule } from './modules/attachments/attachments.module';
import { InventoryDashboardModule } from './modules/inventory-dashboard/inventory-dashboard.module';
import { BudgetModule } from './modules/budget/budget.module';
import { RolesModule } from './modules/roles/roles.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { UsersModule } from './modules/users/users.module';
import { PerformanceModule } from './modules/performance/performance.module';
import { SecurityModule } from './modules/security/security.module';
import { MonitoringModule } from './modules/monitoring/monitoring.module';
import { SupplierModule } from './modules/supplier/supplier.module';
import { WorkOrderModule } from './modules/work-order/work-order.module';
import { LicenseModule } from './modules/license/license.module';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PlatformModule.forRoot(),
    CacheModule,
    PerformanceMetricsModule,
    SuspiciousRequestModule,
    HealthModule,
    SwaggerConfigModule,
    // ====== @route-section: business-modules START ======
    ExpensesModule,
    FixedAssetsModule,
    AssetReservationsModule,
    InventoryModule,
    CategoriesModule,
    DashboardModule,
    ReportsModule,
    FeishuSyncModule,
    FeishuBitableModule,
    OperationLogModule,
    AuditLogModule,
    AttachmentsModule,
    InventoryDashboardModule,
    BudgetModule,
    RolesModule,
    NotificationsModule,
    UsersModule,
    PerformanceModule,
    SecurityModule,
    MonitoringModule,
    SupplierModule,
    WorkOrderModule,
    LicenseModule,
    // ====== @route-section: business-modules END ======

    // ⚠️ @route-order: last
    ViewModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    {
      provide: APP_GUARD,
      useClass: AppAuthGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
    {
      provide: APP_PIPE,
      useFactory: () =>
        new ValidationPipe({
          whitelist: true,
          forbidUnknownValues: true,
          transform: true,
          transformOptions: { enableImplicitConversion: true },
        }),
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(SecurityHeadersMiddleware)
      .forRoutes('*');
    consumer
      .apply(RateLimitMiddleware)
      .forRoutes('*');
    consumer
      .apply(SuspiciousRequestMiddleware)
      .forRoutes('*');
    consumer
      .apply(PerformanceMiddleware)
      .forRoutes('*');
    consumer
      .apply(AuditMiddleware)
      .forRoutes('*');
  }
}
