import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { eq, and, desc, count, sql } from 'drizzle-orm';
import { notifications, notificationSettings } from '@server/database/schema';
import type {
  Notification,
  NotificationListResponse,
  NotificationSettings,
  UpdateNotificationSettingsRequest,
  NotificationType,
} from '@shared/api.interface';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  async getMyNotifications(
    userId: string,
    page: number = 1,
    pageSize: number = 20,
    onlyUnread = false,
  ): Promise<NotificationListResponse> {
    const conditions = [eq(notifications.recipient, userId)];
    if (onlyUnread) conditions.push(eq(notifications.isRead, false));

    const [totalRow] = await this.db
      .select({ value: count() })
      .from(notifications)
      .where(and(...conditions));

    const rows = await this.db
      .select({
        id: notifications.id,
        type: notifications.type,
        title: notifications.title,
        content: notifications.content,
        relatedType: notifications.relatedType,
        relatedId: notifications.relatedId,
        isRead: notifications.isRead,
        createdAt: notifications.createdAt,
      })
      .from(notifications)
      .where(and(...conditions))
      .orderBy(desc(notifications.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const items: Notification[] = rows.map((row) => ({
      id: row.id,
      type: row.type as NotificationType,
      title: row.title,
      content: row.content ?? undefined,
      relatedType: row.relatedType ?? undefined,
      relatedId: row.relatedId ?? undefined,
      isRead: row.isRead,
      createdAt: row.createdAt.toISOString(),
    }));

    const [unreadRow] = await this.db
      .select({ value: count() })
      .from(notifications)
      .where(
        and(
          eq(notifications.recipient, userId),
          eq(notifications.isRead, false),
        ),
      );

    return {
      items,
      total: Number(totalRow.value),
      unreadCount: Number(unreadRow.value),
    };
  }

  async markAsRead(userId: string, id: string): Promise<void> {
    const updated = await this.db
      .update(notifications)
      .set({ isRead: true })
      .where(
        and(
          eq(notifications.id, id),
          eq(notifications.recipient, userId),
        ),
      )
      .returning({ id: notifications.id });
    if (updated.length === 0) {
      throw new Error('通知不存在或无权限');
    }
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.recipient, userId));
  }

  async getUnreadCount(userId: string): Promise<{ unreadCount: number }> {
    const [row] = await this.db
      .select({ value: count() })
      .from(notifications)
      .where(
        and(
          eq(notifications.recipient, userId),
          eq(notifications.isRead, false),
        ),
      );
    return { unreadCount: Number(row.value) };
  }

  async getSettings(userId: string): Promise<NotificationSettings> {
    const rows = await this.db
      .select()
      .from(notificationSettings)
      .where(eq(notificationSettings.userId, userId))
      .limit(1);

    if (rows.length > 0) {
      const row = rows[0];
      return {
        id: row.id,
        lowStockEnabled: row.lowStockEnabled,
        anomalyEnabled: row.anomalyEnabled,
        operationEnabled: row.operationEnabled,
        systemEnabled: row.systemEnabled,
      };
    }

    const [created] = await this.db
      .insert(notificationSettings)
      .values({ userId })
      .returning();

    return {
      id: created.id,
      lowStockEnabled: created.lowStockEnabled,
      anomalyEnabled: created.anomalyEnabled,
      operationEnabled: created.operationEnabled,
      systemEnabled: created.systemEnabled,
    };
  }

  async updateSettings(
    userId: string,
    dto: UpdateNotificationSettingsRequest,
  ): Promise<NotificationSettings> {
    const settings = await this.getSettings(userId);
    const patch: Partial<typeof notificationSettings.$inferInsert> = {};
    if (dto.lowStockEnabled !== undefined) patch.lowStockEnabled = dto.lowStockEnabled;
    if (dto.anomalyEnabled !== undefined) patch.anomalyEnabled = dto.anomalyEnabled;
    if (dto.operationEnabled !== undefined) patch.operationEnabled = dto.operationEnabled;
    if (dto.systemEnabled !== undefined) patch.systemEnabled = dto.systemEnabled;
    if (Object.keys(patch).length === 0) return settings;

    const [updated] = await this.db
      .update(notificationSettings)
      .set(patch)
      .where(eq(notificationSettings.userId, userId))
      .returning();

    return {
      id: updated.id,
      lowStockEnabled: updated.lowStockEnabled,
      anomalyEnabled: updated.anomalyEnabled,
      operationEnabled: updated.operationEnabled,
      systemEnabled: updated.systemEnabled,
    };
  }

  async createNotification(params: {
    type: NotificationType;
    title: string;
    content?: string;
    relatedType?: string;
    relatedId?: string;
    recipientUserId: string;
  }): Promise<void> {
    try {
      await this.db.insert(notifications).values({
        type: params.type,
        title: params.title,
        content: params.content,
        relatedType: params.relatedType,
        relatedId: params.relatedId,
        recipient: params.recipientUserId,
      });
    } catch (err) {
      this.logger.error(`创建通知失败: ${JSON.stringify(params)} - ${String(err)}`);
    }
  }
}
