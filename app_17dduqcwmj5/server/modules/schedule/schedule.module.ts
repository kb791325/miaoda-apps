import { Module } from '@nestjs/common';
import { AttendanceController } from './attendance.controller';
import { ScheduleReminderAutomation } from './schedule-reminder.automation';
import { ScheduleController } from './schedule.controller';
import { ScheduleDetailController } from './schedule-detail.controller';
import { ScheduleService } from './schedule.service';

@Module({
  controllers: [
    ScheduleController,
    ScheduleDetailController,
    AttendanceController,
  ],
  providers: [ScheduleService, ScheduleReminderAutomation],
})
export class ScheduleModule {}
