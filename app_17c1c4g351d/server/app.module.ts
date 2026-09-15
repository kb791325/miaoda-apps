import { APP_FILTER } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { PlatformModule } from '@lark-apaas/fullstack-nestjs-core';

import { GlobalExceptionFilter } from './common/filters/exception.filter';
import { ViewModule } from './modules/view/view.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ProductModule } from './modules/product/product.module';
import { TrafficModule } from './modules/traffic/traffic.module';
import { CustomerModule } from './modules/customer/customer.module';
import { AfterSaleModule } from './modules/after-sale/after-sale.module';
import { DataImportModule } from './modules/data-import/data-import.module';
import { RoleManagerModule } from './modules/role-manager/role-manager.module';

@Module({
  imports: [
    // 平台 Module，提供平台能力
    PlatformModule.forRoot(),
    // ====== @route-section: business-modules START ======
    // Place all business modules here.Do NOT add fallback modules here.
    InventoryModule,
    DashboardModule,
    ProductModule,
    TrafficModule,
    CustomerModule,
    AfterSaleModule,
    DataImportModule,
    RoleManagerModule,
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
