import { Module } from '@nestjs/common';
import {
  InventoryDashboardController,
  InventoryChecksResolveController,
} from './inventory-dashboard.controller';
import { InventoryDashboardService } from './inventory-dashboard.service';
import { FeishuBitableModule } from '../feishu-bitable/feishu-bitable.module';

@Module({
  imports: [FeishuBitableModule],
  controllers: [InventoryDashboardController, InventoryChecksResolveController],
  providers: [InventoryDashboardService],
})
export class InventoryDashboardModule {}
