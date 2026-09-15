import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { QueryNotificationDto } from './dto/query-notification.dto';
import type {
  Notification,
  NotificationListResponse,
  NotificationType,
  UnreadCountResponse,
} from '@shared/api.interface';

@ApiTags('通知')
@Controller('api/notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @NeedLogin()
  @ApiOperation({ summary: '获取通知列表（分页、筛选）' })
  @ApiResponse({ status: 200, description: '成功' })
  async findAll(
    @Req() req: Request,
    @Query() query: QueryNotificationDto,
  ): Promise<NotificationListResponse> {
    const { userId } = (req as unknown as { userContext: { userId: string } })
      .userContext;
    return this.notificationsService.findAll(userId, {
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
      type: query.type as NotificationType | undefined,
      isRead: query.isRead,
    });
  }

  @Get('unread-count')
  @NeedLogin()
  @ApiOperation({ summary: '获取未读通知数量' })
  @ApiResponse({ status: 200, description: '成功' })
  async getUnreadCount(@Req() req: Request): Promise<UnreadCountResponse> {
    const { userId } = (req as unknown as { userContext: { userId: string } })
      .userContext;
    return this.notificationsService.getUnreadCount(userId);
  }

  @Get(':id')
  @NeedLogin()
  @ApiOperation({ summary: '获取通知详情' })
  @ApiParam({ name: 'id', description: '通知ID' })
  @ApiResponse({ status: 200, description: '成功' })
  async findOne(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<Notification> {
    const { userId } = (req as unknown as { userContext: { userId: string } })
      .userContext;
    return this.notificationsService.findOne(userId, id);
  }

  @Post(':id/read')
  @NeedLogin()
  @ApiOperation({ summary: '标记通知为已读' })
  @ApiParam({ name: 'id', description: '通知ID' })
  @ApiResponse({ status: 200, description: '成功' })
  async markAsRead(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<Notification> {
    const { userId } = (req as unknown as { userContext: { userId: string } })
      .userContext;
    return this.notificationsService.markAsRead(userId, id);
  }

  @Post('read-all')
  @NeedLogin()
  @ApiOperation({ summary: '全部标记为已读' })
  @ApiResponse({ status: 200, description: '成功' })
  async markAllAsRead(
    @Req() req: Request,
  ): Promise<{ updatedCount: number }> {
    const { userId } = (req as unknown as { userContext: { userId: string } })
      .userContext;
    return this.notificationsService.markAllAsRead(userId);
  }

  @Post()
  @NeedLogin()
  @ApiOperation({ summary: '创建通知' })
  @ApiResponse({ status: 200, description: '成功' })
  async create(
    @Req() req: Request,
    @Body() body: CreateNotificationDto,
  ): Promise<{ id: string }> {
    const { userId } = (req as unknown as { userContext: { userId: string } })
      .userContext;
    if (body.userId !== userId) {
      throw new ForbiddenException('无权为其他用户创建通知');
    }
    return this.notificationsService.create({
      ...body,
      type: body.type as NotificationType,
    });
  }

  @Delete(':id')
  @NeedLogin()
  @ApiOperation({ summary: '删除通知' })
  @ApiParam({ name: 'id', description: '通知ID' })
  @ApiResponse({ status: 200, description: '成功' })
  async remove(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<void> {
    const { userId } = (req as unknown as { userContext: { userId: string } })
      .userContext;
    return this.notificationsService.remove(userId, id);
  }
}
