import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  CapabilityService,
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from '@lark-apaas/fullstack-nestjs-core';
import { eq, lt, and, desc, isNull, count, inArray } from 'drizzle-orm';
import { warehouseInventory, products, notifications, notificationSettings, roles, userRoles } from '@server/database/schema';
import { NotificationsService } from '../notifications/notifications.service';

const ALERT_PUSH_INSTANCE_ID = 'feishu_inventory_alert_push_1';

interface LowStockItem {
  productId: string;
  productName: string;
  productCode: string;
  warehouse: string;
  currentStock: number;
  safetyStock: number;
  gap: number;
}

@Injectable()
export class InventoryAlertService {
  private readonly logger = new Logger(InventoryAlertService.name);
  private readonly ALERT_COOLDOWN_HOURS = 24;

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    private readonly notificationsService: NotificationsService,
    @Inject() private readonly capabilityService: CapabilityService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR, {
    name: 'low_stock_check',
  })
  async handleLowStockCheck(): Promise<void> {
    try {
      this.logger.log('开始低库存告警检测');
      const result = await this.runCheck();
      this.logger.log(
        `低库存告警检测完成：发现 ${result.lowStockCount} 个低库存项，发送 ${result.notificationCount} 条通知`,
      );
    } catch (err) {
      this.logger.error(`低库存告警检测失败: ${String(err)}`);
    }
  }

  async runCheck(): Promise<{ lowStockCount: number; notificationCount: number }> {
    const lowStockItems = await this.getLowStockItems();
    if (lowStockItems.length === 0) {
      return { lowStockCount: 0, notificationCount: 0 };
    }

    const eligibleItems: LowStockItem[] = [];
    for (const item of lowStockItems) {
      const lastAlert = await this.getLastAlertTime(item.productId, item.warehouse);
      const cooldownMs = this.ALERT_COOLDOWN_HOURS * 60 * 60 * 1000;
      if (!lastAlert || Date.now() - lastAlert.getTime() > cooldownMs) {
        eligibleItems.push(item);
      }
    }

    if (eligibleItems.length === 0) {
      return { lowStockCount: lowStockItems.length, notificationCount: 0 };
    }

    const alertRoles = ['boss', 'supervisor', 'warehouse_admin'];
    const recipientIds = await this.getUsersByRoles(alertRoles);

    let notificationCount = 0;
    for (const item of eligibleItems) {
      const title = `【低库存预警】${item.productName}`;
      const content = `商品 ${item.productName}（SKU: ${item.productCode}）在 ${item.warehouse} 库存为 ${item.currentStock}，低于安全库存 ${item.safetyStock}，请及时补货。`;

      for (const recipientId of recipientIds) {
        const settings = await this.notificationsService.getSettings(recipientId);
        if (!settings.lowStockEnabled) continue;
        await this.notificationsService.createNotification({
          type: 'low_stock',
          title,
          content,
          relatedType: 'product',
          relatedId: item.productId,
          recipientUserId: recipientId,
        });
        notificationCount += 1;
      }

      for (const recipientId of recipientIds) {
        await this.recordAlert(item.productId, item.warehouse, recipientId);
      }
    }

    await this.pushFeishuAlert(eligibleItems, recipientIds);

    if (eligibleItems.length > 5) {
      const summaryTitle = '【低库存汇总】';
      const summaryContent = `当前共有 ${eligibleItems.length} 个商品库存低于安全库存，请查看补货建议。`;
      for (const recipientId of recipientIds) {
        const settings = await this.notificationsService.getSettings(recipientId);
        if (!settings.lowStockEnabled) continue;
        await this.notificationsService.createNotification({
          type: 'low_stock',
          title: summaryTitle,
          content: summaryContent,
          relatedType: 'ai_replenishment',
          recipientUserId: recipientId,
        });
        notificationCount += 1;
      }
    }

    return { lowStockCount: lowStockItems.length, notificationCount };
  }

  private async getLowStockItems(): Promise<LowStockItem[]> {
    const rows = await this.db
      .select({
        productId: products.id,
        productName: products.name,
        productCode: products.code,
        warehouse: warehouseInventory.warehouse,
        currentStock: warehouseInventory.quantity,
        safetyStock: products.safetyStock,
      })
      .from(warehouseInventory)
      .innerJoin(products, eq(warehouseInventory.productId, products.id))
      .where(
        and(
          eq(products.status, 'active'),
          isNull(products.deletedAt),
          lt(warehouseInventory.quantity, products.safetyStock),
        ),
      )
      .orderBy(warehouseInventory.warehouse);

    return rows.map((row) => ({
      productId: row.productId,
      productName: row.productName,
      productCode: row.productCode,
      warehouse: row.warehouse,
      currentStock: row.currentStock,
      safetyStock: row.safetyStock,
      gap: row.safetyStock - row.currentStock,
    }));
  }

  private async getLastAlertTime(productId: string, warehouse: string): Promise<Date | null> {
    const rows = await this.db
      .select({ createdAt: notifications.createdAt })
      .from(notifications)
      .where(
        and(
          eq(notifications.type, 'low_stock'),
          eq(notifications.relatedType, 'product'),
          eq(notifications.relatedId, productId),
        ),
      )
      .orderBy(desc(notifications.createdAt))
      .limit(1);

    if (rows.length === 0) return null;
    return rows[0].createdAt;
  }

  private async getUsersByRoles(roleCodes: string[]): Promise<string[]> {
    const roleRows: { id: string }[] = await this.db
      .select({ id: roles.id })
      .from(roles)
      .where(inArray(roles.roleCode, roleCodes));
    if (roleRows.length === 0) return [];
    const roleIds: string[] = roleRows.map((row) => row.id);
    const memberRows: { userId: string }[] = await this.db
      .select({ userId: userRoles.userId })
      .from(userRoles)
      .where(inArray(userRoles.roleId, roleIds));
    const userIds: string[] = Array.from(new Set(memberRows.map((row) => row.userId)));
    if (userIds.length === 0) {
      this.logger.warn(`角色 ${roleCodes.join(',')} 下暂无成员，跳过预警推送`);
    }
    return userIds;
  }

  private async pushFeishuAlert(items: LowStockItem[], recipientIds: string[]): Promise<void> {
    if (items.length === 0 || recipientIds.length === 0) return;
    const detailLines: string[] = items.slice(0, 10).map((item) => {
      const shortageMark: string = item.currentStock === 0 ? '（**已缺货**）' : '';
      return `- ${item.productName}（${item.productCode}）｜${item.warehouse}｜当前库存 ${item.currentStock} / 安全库存 ${item.safetyStock}${shortageMark}`;
    });
    const contentParts: string[] = [
      `检测到 ${items.length} 项低库存/缺货预警，请及时处理：`,
      ...detailLines,
    ];
    if (items.length > 10) {
      contentParts.push(`…等共 ${items.length} 项`);
    }
    contentParts.push('请前往库存看板查看补货建议。');
    const content: string = contentParts.join('\n');
    try {
      await this.capabilityService
        .load(ALERT_PUSH_INSTANCE_ID)
        .call('send_feishu_message', { receiverIds: recipientIds, content });
      this.logger.log(`飞书预警推送成功：${recipientIds.length} 人，${items.length} 项`);
    } catch (err) {
      this.logger.error(`飞书预警推送失败: ${String(err)}`);
    }
  }

  private async recordAlert(
    productId: string,
    warehouse: string,
    recipientId: string,
  ): Promise<void> {
    this.logger.log(
      `低库存告警已发送: product=${productId} warehouse=${warehouse} recipient=${recipientId}`,
    );
  }

  async getAlertHistory(params: {
    page?: number;
    pageSize?: number;
  }): Promise<{ items: { id: string; title: string; content: string | null; createdAt: string; relatedType: string | null; relatedId: string | null }[]; total: number; page: number; pageSize: number }> {
    const page = params.page ?? 1;
    const pageSize = Math.min(params.pageSize ?? 20, 100);

    const [totalRow] = await this.db
      .select({ value: count() })
      .from(notifications)
      .where(eq(notifications.type, 'low_stock'));

    const rows = await this.db
      .select()
      .from(notifications)
      .where(eq(notifications.type, 'low_stock'))
      .orderBy(desc(notifications.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return {
      items: rows.map((row) => ({
        id: row.id,
        title: row.title,
        content: row.content,
        createdAt: row.createdAt.toISOString(),
        relatedType: row.relatedType,
        relatedId: row.relatedId,
      })),
      total: Number(totalRow.value),
      page,
      pageSize,
    };
  }

  async manuallyTriggerCheck(): Promise<{ lowStockCount: number; notificationCount: number }> {
    return this.runCheck();
  }
}
