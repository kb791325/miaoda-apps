import { Controller, Get, Post, Patch, Param, Query, Body, Req } from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import { NotificationsService } from './notifications.service';
import type {
  NotificationListResponse,
  NotificationSettings,
  UpdateNotificationSettingsRequest,
} from '@shared/api.interface';

@Controller('api/notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @NeedLogin()
  async getMyNotifications(
    @Req() req: { userContext: { userId: string } },
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('onlyUnread') onlyUnread?: string,
  ): Promise<NotificationListResponse> {
    const { userId } = req.userContext;
    return this.notificationsService.getMyNotifications(
      userId,
      page ? parseInt(page, 10) : 1,
      pageSize ? Math.min(parseInt(pageSize, 10), 100) : 20,
      onlyUnread === 'true',
    );
  }

  @Get('unread-count')
  @NeedLogin()
  async getUnreadCount(
    @Req() req: { userContext: { userId: string } },
  ): Promise<{ unreadCount: number }> {
    return this.notificationsService.getUnreadCount(req.userContext.userId);
  }

  @Post(':id/read')
  @NeedLogin()
  async markAsRead(
    @Req() req: { userContext: { userId: string } },
    @Param('id') id: string,
  ): Promise<{ success: boolean }> {
    await this.notificationsService.markAsRead(req.userContext.userId, id);
    return { success: true };
  }

  @Post('read-all')
  @NeedLogin()
  async markAllAsRead(
    @Req() req: { userContext: { userId: string } },
  ): Promise<{ success: boolean }> {
    await this.notificationsService.markAllAsRead(req.userContext.userId);
    return { success: true };
  }

  @Get('settings')
  @NeedLogin()
  async getSettings(
    @Req() req: { userContext: { userId: string } },
  ): Promise<NotificationSettings> {
    return this.notificationsService.getSettings(req.userContext.userId);
  }

  @Patch('settings')
  @NeedLogin()
  async updateSettings(
    @Req() req: { userContext: { userId: string } },
    @Body() dto: UpdateNotificationSettingsRequest,
  ): Promise<NotificationSettings> {
    return this.notificationsService.updateSettings(req.userContext.userId, dto);
  }
}
