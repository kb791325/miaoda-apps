import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from '@lark-apaas/fullstack-nestjs-core';
import { and, count, desc, eq } from 'drizzle-orm';
import { notifications } from '@server/database/schema';
import type {
  Notification,
  NotificationListResponse,
  NotificationPriority,
  NotificationType,
  UnreadCountResponse,
} from '@shared/api.interface';

interface ListQueryParams {
  page: number;
  pageSize: number;
  type?: NotificationType;
  isRead?: boolean;
}

interface CreateNotificationDto {
  userId: string;
  type: NotificationType;
  title: string;
  content?: string;
  relatedType?: string;
  relatedId?: string;
  priority: NotificationPriority;
}

@Injectable()
export class NotificationsService {
  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  async findAll(
    userId: string,
    params: ListQueryParams,
  ): Promise<NotificationListResponse> {
    const { page, pageSize, type, isRead } = params;

    const conditions = [eq(notifications.userId, userId)];
    if (type) conditions.push(eq(notifications.notificationType, type));
    if (isRead !== undefined) conditions.push(eq(notifications.isRead, isRead));

    const where = and(...conditions);

    const [totalResult, itemsResult, unreadResult] = await Promise.all([
      this.db.select({ count: count() }).from(notifications).where(where),
      this.db
        .select({
          id: notifications.id,
          userId: notifications.userId,
          notificationType: notifications.notificationType,
          title: notifications.title,
          content: notifications.content,
          relatedType: notifications.relatedType,
          relatedId: notifications.relatedId,
          isRead: notifications.isRead,
          priority: notifications.priority,
          createdAt: notifications.createdAt,
        })
        .from(notifications)
        .where(where)
        .orderBy(desc(notifications.createdAt))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      this.db
        .select({ count: count() })
        .from(notifications)
        .where(
          and(eq(notifications.userId, userId), eq(notifications.isRead, false)),
        ),
    ]);

    const total = Number(totalResult[0]?.count ?? 0);
    const unreadCount = Number(unreadResult[0]?.count ?? 0);

    const items: Notification[] = itemsResult.map((row) => ({
      id: row.id,
      userId: row.userId,
      notificationType: row.notificationType as NotificationType,
      title: row.title,
      content: row.content ?? undefined,
      relatedType: row.relatedType ?? undefined,
      relatedId: row.relatedId ?? undefined,
      isRead: row.isRead ?? false,
      priority: (row.priority as NotificationPriority) ?? 'normal',
      createdAt: row.createdAt.toISOString(),
    }));

    return {
      items,
      total,
      page,
      pageSize,
      unreadCount,
    };
  }

  async getUnreadCount(userId: string): Promise<UnreadCountResponse> {
    const result = await this.db
      .select({ count: count() })
      .from(notifications)
      .where(
        and(eq(notifications.userId, userId), eq(notifications.isRead, false)),
      );
    return { count: Number(result[0]?.count ?? 0) };
  }

  async findOne(userId: string, id: string): Promise<Notification> {
    const rows = await this.db
      .select({
        id: notifications.id,
        userId: notifications.userId,
        notificationType: notifications.notificationType,
        title: notifications.title,
        content: notifications.content,
        relatedType: notifications.relatedType,
        relatedId: notifications.relatedId,
        isRead: notifications.isRead,
        priority: notifications.priority,
        createdAt: notifications.createdAt,
      })
      .from(notifications)
      .where(eq(notifications.id, id))
      .limit(1);

    if (rows.length === 0) {
      throw new NotFoundException('通知不存在');
    }

    const row = rows[0];
    if (row.userId !== userId) {
      throw new ForbiddenException('无权访问该通知');
    }

    return {
      id: row.id,
      userId: row.userId,
      notificationType: row.notificationType as NotificationType,
      title: row.title,
      content: row.content ?? undefined,
      relatedType: row.relatedType ?? undefined,
      relatedId: row.relatedId ?? undefined,
      isRead: row.isRead ?? false,
      priority: (row.priority as NotificationPriority) ?? 'normal',
      createdAt: row.createdAt.toISOString(),
    };
  }

  async markAsRead(userId: string, id: string): Promise<Notification> {
    const existing = await this.db
      .select({
        id: notifications.id,
        userId: notifications.userId,
      })
      .from(notifications)
      .where(eq(notifications.id, id))
      .limit(1);

    if (existing.length === 0) {
      throw new NotFoundException('通知不存在');
    }
    if (existing[0].userId !== userId) {
      throw new ForbiddenException('无权操作该通知');
    }

    const updated = await this.db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id))
      .returning();

    const row = updated[0];
    return {
      id: row.id,
      userId: row.userId,
      notificationType: row.notificationType as NotificationType,
      title: row.title,
      content: row.content ?? undefined,
      relatedType: row.relatedType ?? undefined,
      relatedId: row.relatedId ?? undefined,
      isRead: row.isRead ?? false,
      priority: (row.priority as NotificationPriority) ?? 'normal',
      createdAt: row.createdAt.toISOString(),
    };
  }

  async markAllAsRead(userId: string): Promise<{ updatedCount: number }> {
    const updated = await this.db
      .update(notifications)
      .set({ isRead: true })
      .where(
        and(eq(notifications.userId, userId), eq(notifications.isRead, false)),
      )
      .returning({ id: notifications.id });
    return { updatedCount: updated.length };
  }

  async create(dto: CreateNotificationDto): Promise<{ id: string }> {
    if (!dto.userId) {
      throw new BadRequestException('userId 不能为空');
    }
    if (!dto.title) {
      throw new BadRequestException('title 不能为空');
    }
    if (!dto.type) {
      throw new BadRequestException('type 不能为空');
    }

    const inserted = await this.db
      .insert(notifications)
      .values({
        userId: dto.userId,
        notificationType: dto.type,
        title: dto.title,
        content: dto.content,
        relatedType: dto.relatedType,
        relatedId: dto.relatedId,
        priority: dto.priority ?? 'normal',
        isRead: false,
      })
      .returning({ id: notifications.id });

    return { id: inserted[0].id };
  }

  async remove(userId: string, id: string): Promise<void> {
    const existing = await this.db
      .select({
        id: notifications.id,
        userId: notifications.userId,
      })
      .from(notifications)
      .where(eq(notifications.id, id))
      .limit(1);

    if (existing.length === 0) {
      throw new NotFoundException('通知不存在');
    }
    if (existing[0].userId !== userId) {
      throw new ForbiddenException('无权删除该通知');
    }

    await this.db.delete(notifications).where(eq(notifications.id, id));
  }
}
