import { APP_FILTER } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { PlatformModule } from '@lark-apaas/fullstack-nestjs-core';

import { GlobalExceptionFilter } from './common/filters/exception.filter';
import { ViewModule } from './modules/view/view.module';
import { OrderModule } from './modules/order/order.module';
import { ProductModule } from './modules/product/product.module';
import { CustomerModule } from './modules/customer/customer.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { BitableModule } from './modules/bitable/bitable.module';
import { CrmModule } from './modules/crm/crm.module';
import { FollowUpModule } from './modules/follow-up/follow-up.module';
import { ShipmentModule } from './modules/shipment/shipment.module';
import { FeeModule } from './modules/fee/fee.module';
import { FinanceModule } from './modules/finance/finance.module';
import { BitableSyncModule } from './modules/bitable-sync/bitable-sync.module';
import { AuthModule } from './modules/auth/auth.module';
import { HomeModule } from './modules/home/home.module';
import { OpLogModule } from './modules/op-log/op-log.module';
import { ReminderModule } from './modules/reminder/reminder.module';

@Module({
  imports: [
    // 平台 Module，提供平台能力
    PlatformModule.forRoot(),
    // ====== @route-section: business-modules START ======
    // Place all business modules here.Do NOT add fallback modules here.
    AuthModule,
    OpLogModule,
    OrderModule,
    ProductModule,
    CustomerModule,
    DashboardModule,
    BitableModule,
    CrmModule,
    FollowUpModule,
    ShipmentModule,
    FeeModule,
    FinanceModule,
    BitableSyncModule,
    HomeModule,
    ReminderModule,
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
export class AppModule {}
