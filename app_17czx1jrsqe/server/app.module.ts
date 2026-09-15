import { APP_FILTER } from '@nestjs/core';
import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { PlatformModule } from '@lark-apaas/fullstack-nestjs-core';

import { GlobalExceptionFilter } from './common/filters/exception.filter';
import { CsrfDownloadMiddleware } from './common/middleware/csrf-download.middleware';
import { SecurityHeadersMiddleware } from './common/middleware/security-headers.middleware';
import { ViewModule } from './modules/view/view.module';
import { BitableModule } from './modules/bitable/bitable.module';
import { AuthModule } from './modules/auth/auth.module';
import { ApprovalModule } from './modules/approval/approval.module';
import { AuditModule } from './modules/audit/audit.module';

@Module({
  imports: [
    // 平台 Module，提供平台能力
    PlatformModule.forRoot(),
    // ====== @route-section: business-modules START ======
    // Place all business modules here.Do NOT add fallback modules here.
    AuthModule,
    BitableModule,
    ApprovalModule,
    AuditModule,
    // ====== @route-section: business-modules END ======

    // ⚠️ @route-order: last
    // ViewModule is the fallback route module, must be registered last.
    ViewModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CsrfDownloadMiddleware, SecurityHeadersMiddleware).forRoutes('*');
  }
}