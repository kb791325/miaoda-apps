import { APP_FILTER } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { PlatformModule } from '@lark-apaas/fullstack-nestjs-core';

import { GlobalExceptionFilter } from './common/filters/exception.filter';
import { ProductsModule } from './modules/products/products.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { StockOperationsModule } from './modules/stock-operations/stock-operations.module';
import { RecordsModule } from './modules/records/records.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { SyncModule } from './modules/sync/sync.module';
import { AiToolsModule } from './modules/ai-tools/ai-tools.module';
import { SuppliersModule } from './modules/suppliers/suppliers.module';
import { SalesOrdersModule } from './modules/sales-orders/sales-orders.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { UserManagementModule } from './modules/user-management/user-management.module';
import { InventoryAlertModule } from './modules/inventory-alert/inventory-alert.module';
import { PurchaseOrdersModule } from './modules/purchase-orders/purchase-orders.module';
import { GlobalSearchModule } from './modules/global-search/global-search.module';
import { UndoModule } from './modules/undo/undo.module';
import { BackupModule } from './modules/backup/backup.module';
import { ViewModule } from './modules/view/view.module';

@Module({
  imports: [
    // 平台 Module，提供平台能力
    PlatformModule.forRoot(),
    // ====== @route-section: business-modules START ======
    ProductsModule,
    InventoryModule,
    StockOperationsModule,
    RecordsModule,
    CategoriesModule,
    SyncModule,
    AiToolsModule,
    SuppliersModule,
    SalesOrdersModule,
    NotificationsModule,
    AuditLogsModule,
    PermissionsModule,
    UserManagementModule,
    InventoryAlertModule,
    PurchaseOrdersModule,
    GlobalSearchModule,
    UndoModule,
    BackupModule,
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
