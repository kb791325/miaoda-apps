import { Module } from '@nestjs/common';
import { AuthModule } from '@server/modules/auth/auth.module';
import { FeishuNotifier } from './feishu-notifier';
import { ReminderController } from './reminder.controller';
import { ReminderService } from './reminder.service';

@Module({
  imports: [AuthModule],
  controllers: [ReminderController],
  providers: [FeishuNotifier, ReminderService],
  exports: [FeishuNotifier],
})
export class ReminderModule {}
