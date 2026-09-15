import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from '@lark-apaas/fullstack-nestjs-core';
import { and, desc, eq, inArray } from 'drizzle-orm';
import {
  appUser,
  customerCrm,
  followUpReminder,
  reminderSetting,
} from '@server/database/schema';
import {
  DEFAULT_REMINDER_TEMPLATE,
  type LatestReminderItem,
  type LatestRemindersResponse,
  type ReminderBlockCode,
  type ReminderDraftResponse,
  type ReminderSettingResponse,
  type SendReminderRequest,
  type SendReminderResponse,
} from '@shared/reminder';
import { FeishuNotifier } from './feishu-notifier';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

interface OwnerResolution {
  ownerId: string;
  ownerName: string;
  feishuUserId: string;
  blockReason: string;
  blockCode?: ReminderBlockCode;
  nextFollowDate: string;
  salesStage: string;
}

@Injectable()
export class ReminderService {
  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    private readonly feishuNotifier: FeishuNotifier,
  ) {}

  async getSetting(): Promise<ReminderSettingResponse> {
    const rows: Array<{ template: string }> = await this.db
      .select({ template: reminderSetting.template })
      .from(reminderSetting)
      .limit(1);
    return { template: rows[0]?.template ?? DEFAULT_REMINDER_TEMPLATE };
  }

  async saveSetting(template: string): Promise<ReminderSettingResponse> {
    const trimmed: string = (template ?? '').trim();
    if (!trimmed) {
      throw new BadRequestException('提醒模板不能为空');
    }
    if (trimmed.length > 2000) {
      throw new BadRequestException('提醒模板过长（最多 2000 字）');
    }
    const rows: Array<{ id: string }> = await this.db
      .select({ id: reminderSetting.id })
      .from(reminderSetting)
      .limit(1);
    if (rows.length > 0) {
      await this.db
        .update(reminderSetting)
        .set({ template: trimmed })
        .where(eq(reminderSetting.id, rows[0].id));
    } else {
      await this.db.insert(reminderSetting).values({ template: trimmed });
    }
    return { template: trimmed };
  }

  private async resolveOwner(customerId: string): Promise<OwnerResolution> {
    const rows: Array<{
      ownerId: string | null;
      nextFollowUpAt: Date | null;
      salesStage: string;
    }> = await this.db
      .select({
        ownerId: customerCrm.owner,
        nextFollowUpAt: customerCrm.nextFollowUpAt,
        salesStage: customerCrm.salesStage,
      })
      .from(customerCrm)
      .where(eq(customerCrm.customerId, customerId))
      .limit(1);
    if (rows.length === 0) {
      throw new NotFoundException('客户不存在或无 CRM 信息');
    }
    const row: {
      ownerId: string | null;
      nextFollowUpAt: Date | null;
      salesStage: string;
    } = rows[0];
    const result: OwnerResolution = {
      ownerId: row.ownerId ?? '',
      ownerName: '',
      feishuUserId: '',
      blockReason: '',
      nextFollowDate: row.nextFollowUpAt
        ? row.nextFollowUpAt.toISOString()
        : '',
      salesStage: row.salesStage,
    };
    if (!result.ownerId) {
      result.blockReason = '该客户暂无负责销售，无法发送提醒，请先为客户指定负责销售';
      result.blockCode = 'owner_missing';
      return result;
    }
    if (!UUID_PATTERN.test(result.ownerId)) {
      result.blockReason = '该客户负责销售信息异常，无法发送提醒，请重新指定负责销售';
      result.blockCode = 'owner_invalid';
      return result;
    }
    const users: Array<{ name: string; feishuUserId: string | null }> =
      await this.db
        .select({ name: appUser.name, feishuUserId: appUser.feishuUserId })
        .from(appUser)
        .where(eq(appUser.id, result.ownerId))
        .limit(1);
    if (users.length === 0) {
      result.blockReason = '负责销售账号不存在，无法发送提醒';
      result.blockCode = 'owner_not_found';
      return result;
    }
    result.ownerName = users[0].name;
    if (!users[0].feishuUserId) {
      result.blockReason = '负责销售未关联飞书账号，无法发送提醒';
      result.blockCode = 'owner_no_feishu';
      return result;
    }
    result.feishuUserId = users[0].feishuUserId;
    return result;
  }

  async getDraft(customerId: string): Promise<ReminderDraftResponse> {
    const resolved: OwnerResolution = await this.resolveOwner(customerId);
    return {
      ownerId: resolved.ownerId,
      ownerName: resolved.ownerName,
      nextFollowDate: resolved.nextFollowDate,
      salesStage: resolved.salesStage,
      blockReason: resolved.blockReason,
      blockCode: resolved.blockCode,
    };
  }

  async send(dto: SendReminderRequest): Promise<SendReminderResponse> {
    const customerName: string = (dto.customerName ?? '').trim() || '客户';
    const message: string = (dto.message ?? '').trim();
    if (!message) {
      throw new BadRequestException('提醒内容不能为空');
    }
    const resolved: OwnerResolution = await this.resolveOwner(dto.customerId);
    if (resolved.blockReason) {
      throw new BadRequestException(resolved.blockReason);
    }

    const title: string = `客户跟进提醒：${customerName}`.slice(0, 50);
    try {
      await this.feishuNotifier.sendFollowUpReminder({
        receiverIds: [resolved.feishuUserId],
        title,
        content: message,
      });
    } catch (error: unknown) {
      const errorMessage: string =
        error instanceof Error ? error.message : String(error);
      await this.db.insert(followUpReminder).values({
        customerId: dto.customerId,
        customerName,
        ownerId: resolved.ownerId || null,
        ownerName: resolved.ownerName,
        receiverId: resolved.feishuUserId || null,
        message,
        status: 'failed',
        errorMessage,
      });
      throw error;
    }

    const inserted: Array<{ id: string; createdAt: Date }> = await this.db
      .insert(followUpReminder)
      .values({
        customerId: dto.customerId,
        customerName,
        ownerId: resolved.ownerId,
        ownerName: resolved.ownerName,
        receiverId: resolved.feishuUserId,
        message,
        status: 'sent',
      })
      .returning({
        id: followUpReminder.id,
        createdAt: followUpReminder.createdAt,
      });
    return {
      id: inserted[0].id,
      sentAt: inserted[0].createdAt.toISOString(),
      receiverName: resolved.ownerName,
    };
  }

  async latest(customerIds: string[]): Promise<LatestRemindersResponse> {
    if (customerIds.length === 0) {
      return { items: [] };
    }
    const rows: Array<{
      customerId: string;
      sentAt: Date;
      ownerName: string;
    }> = await this.db
      .select({
        customerId: followUpReminder.customerId,
        sentAt: followUpReminder.createdAt,
        ownerName: followUpReminder.ownerName,
      })
      .from(followUpReminder)
      .where(
        and(
          eq(followUpReminder.status, 'sent'),
          inArray(followUpReminder.customerId, customerIds),
        ),
      )
      .orderBy(desc(followUpReminder.createdAt));
    const byCustomer = new Map<string, LatestReminderItem>();
    for (const row of rows) {
      if (!byCustomer.has(row.customerId)) {
        byCustomer.set(row.customerId, {
          customerId: row.customerId,
          sentAt: row.sentAt.toISOString(),
          ownerName: row.ownerName,
        });
      }
    }
    return { items: [...byCustomer.values()] };
  }
}
