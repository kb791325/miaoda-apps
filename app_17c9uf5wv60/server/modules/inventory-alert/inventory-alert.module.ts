import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { InventoryAlertService } from './inventory-alert.service';
import { InventoryAlertController } from './inventory-alert.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [ScheduleModule.forRoot(), NotificationsModule],
  controllers: [InventoryAlertController],
  providers: [InventoryAlertService],
})
export class InventoryAlertModule {}
