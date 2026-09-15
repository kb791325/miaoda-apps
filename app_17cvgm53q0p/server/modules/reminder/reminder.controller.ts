import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AppAuthGuard } from '@server/modules/auth/app-auth.guard';
import { RequirePermissions } from '@server/modules/auth/auth.decorator';
import type {
  LatestRemindersResponse,
  ReminderDraftResponse,
  ReminderSettingResponse,
  SaveReminderSettingRequest,
  SendReminderRequest,
  SendReminderResponse,
} from '@shared/reminder';
import { ReminderService } from './reminder.service';

@Controller('api')
export class ReminderController {
  constructor(private readonly reminderService: ReminderService) {}

  @UseGuards(AppAuthGuard)
  @RequirePermissions('customer:view')
  @Get('reminder-settings')
  getSetting(): Promise<ReminderSettingResponse> {
    return this.reminderService.getSetting();
  }

  @UseGuards(AppAuthGuard)
  @RequirePermissions('customer:manage')
  @Put('reminder-settings')
  saveSetting(
    @Body() body: SaveReminderSettingRequest,
  ): Promise<ReminderSettingResponse> {
    return this.reminderService.saveSetting(body.template);
  }

  @UseGuards(AppAuthGuard)
  @RequirePermissions('customer:view')
  @Get('reminders/latest')
  latest(
    @Query('customerIds') customerIds?: string,
  ): Promise<LatestRemindersResponse> {
    const ids: string[] = (customerIds ?? '')
      .split(',')
      .map((id: string) => id.trim())
      .filter((id: string) => id.length > 0);
    return this.reminderService.latest(ids);
  }

  @UseGuards(AppAuthGuard)
  @RequirePermissions('customer:view')
  @Get('reminders/draft')
  draft(
    @Query('customerId') customerId: string,
  ): Promise<ReminderDraftResponse> {
    return this.reminderService.getDraft(customerId);
  }

  @UseGuards(AppAuthGuard)
  @RequirePermissions('customer:manage')
  @Post('reminders')
  send(@Body() dto: SendReminderRequest): Promise<SendReminderResponse> {
    return this.reminderService.send(dto);
  }
}
