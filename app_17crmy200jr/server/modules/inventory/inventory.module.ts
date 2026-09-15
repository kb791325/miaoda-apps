import { Module } from '@nestjs/common';
import { InventoryController, InventoryChecksController } from './inventory.controller';
import { InventoryTasksService } from './inventory-tasks.service';
import { InventoryChecksService } from './inventory-checks.service';
import { FeishuBitableModule } from '../feishu-bitable/feishu-bitable.module';
import { RolesModule } from '../roles/roles.module';

@Module({
  imports: [FeishuBitableModule, RolesModule],
  controllers: [InventoryController, InventoryChecksController],
  providers: [InventoryTasksService, InventoryChecksService],
  exports: [InventoryTasksService, InventoryChecksService],
})
export class InventoryModule {}
