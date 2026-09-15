import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { desc, eq, inArray } from 'drizzle-orm';
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from '@lark-apaas/fullstack-nestjs-core';
import { appUser, followUp } from '@server/database/schema';
import {
  BitableClient,
  readTextField,
} from '@server/common/utils/bitable-client';
import { generateFollowNo } from '@server/common/utils/business-no';
import { CAPABILITY_INSTANCE_IDS } from '@server/common/constants/capability-instance-ids';
import { CrmService } from '@server/modules/crm/crm.service';
import { SyncPushService } from '@server/modules/bitable-sync/sync-push.service';
import type { OperatorContext } from '@server/modules/auth/auth.types';
import { SALES_STAGES, type SalesStage } from '@shared/customer';
import {
  FOLLOW_UP_INTENTS,
  FOLLOW_UP_METHODS,
  type CreateFollowUpRequest,
  type CreateFollowUpResponse,
  type FollowUpIntent,
  type FollowUpListResponse,
  type FollowUpMethod,
  type FollowUpRecord,
} from '@shared/follow-up';

type FollowUpRow = typeof followUp.$inferSelect;

@Injectable()
export class FollowUpService {
  private readonly logger = new Logger(FollowUpService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    private readonly crmService: CrmService,
    private readonly bitableClient: BitableClient,
    private readonly syncPush: SyncPushService,
  ) {}

  async list(
    customerId?: string,
    operator?: OperatorContext,
  ): Promise<FollowUpListResponse> {
    let rows: FollowUpRow[] = customerId
      ? await this.db
          .select()
          .from(followUp)
          .where(eq(followUp.customerId, customerId))
          .orderBy(desc(followUp.followUpAt))
      : await this.db
          .select()
          .from(followUp)
          .orderBy(desc(followUp.followUpAt))
          .limit(200);

    if (operator?.roleCode === 'sales') {
      rows = rows.filter(
        (row: FollowUpRow): boolean =>
          (row.follower ?? '') === operator.userId ||
          (row.createdBy ?? '') === operator.userId,
      );
    }

    const nameMap = await this.getCustomerNameMap();
    const followerNameMap = await this.getFollowerNameMap(rows);
    return {
      items: rows.map(
        (row: FollowUpRow): FollowUpRecord =>
          this.toRecord(row, nameMap, followerNameMap),
      ),
      total: rows.length,
    };
  }

  async listByCustomer(customerId: string): Promise<FollowUpRecord[]> {
    const result = await this.list(customerId);
    return result.items;
  }

  async create(
    dto: CreateFollowUpRequest,
    currentUserId: string,
  ): Promise<CreateFollowUpResponse> {
    if (!dto.customerId?.trim()) {
      throw new BadRequestException('请选择关联客户');
    }
    if (!dto.content?.trim()) {
      throw new BadRequestException('跟进内容不能为空');
    }
    if (!FOLLOW_UP_METHODS.includes(dto.method as FollowUpMethod)) {
      throw new BadRequestException('无效的跟进方式');
    }
    if (dto.intent && !FOLLOW_UP_INTENTS.includes(dto.intent as FollowUpIntent)) {
      throw new BadRequestException('无效的客户意向度');
    }
    if (dto.stageChange && !SALES_STAGES.includes(dto.stageChange as SalesStage)) {
      throw new BadRequestException('无效的销售阶段');
    }

    const followUpAt = this.parseDate(dto.followUpAt) ?? new Date();
    const nextFollowUpAt = this.parseDate(dto.nextFollowUpAt);
    const budget = dto.budget === undefined ? null : Number(dto.budget);
    if (budget !== null && !Number.isFinite(budget)) {
      throw new BadRequestException('预计预算格式无效');
    }

    await this.ensureCustomerExists(dto.customerId);
    const followerId = dto.followerId?.trim()
      ? dto.followerId.trim()
      : currentUserId;

    let inserted: FollowUpRow[] = [];
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const followNo = await generateFollowNo(this.db);
      try {
        inserted = await this.db
          .insert(followUp)
          .values({
            followNo,
            customerId: dto.customerId,
            follower: followerId,
            followUpAt,
            method: dto.method,
            content: dto.content.trim(),
            intent: dto.intent ?? '',
            demandProduct: dto.demandProduct ?? '',
            budget: budget === null ? null : String(budget),
            nextFollowUpAt,
            stageChange: dto.stageChange ?? '',
          })
          .returning();
        break;
      } catch (error) {
        if (extractPostgresErrorCode(error) === '23505' && attempt < 2) {
          continue;
        }
        throw error;
      }
    }

    await this.crmService.applyFollowUp(
      dto.customerId,
      { followUpAt, nextFollowUpAt, stageChange: dto.stageChange },
      currentUserId,
    );

    const newId = inserted[0]?.id ?? '';
    if (!newId) {
      throw new ConflictException('跟进编号生成失败，请重试');
    }
    await this.syncPush.pushFollowUp(newId);

    return { id: newId };
  }

  private toRecord(
    row: FollowUpRow,
    nameMap: Map<string, string>,
    followerNameMap: Map<string, string>,
  ): FollowUpRecord {
    return {
      id: row.id,
      followNo: row.followNo ?? '',
      customerId: row.customerId,
      customerName: nameMap.get(row.customerId) ?? '',
      followerId: row.follower ?? '',
      followerName: followerNameMap.get(row.follower ?? '') ?? '',
      followUpAt: row.followUpAt.toISOString(),
      method: row.method,
      content: row.content,
      intent: row.intent,
      demandProduct: row.demandProduct,
      budget: row.budget === null ? null : Number(row.budget),
      nextFollowUpAt: row.nextFollowUpAt ? row.nextFollowUpAt.toISOString() : '',
      stageChange: row.stageChange,
    };
  }

  private async getCustomerNameMap(): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    try {
      const output = await this.bitableClient.searchRecords(
        CAPABILITY_INSTANCE_IDS.customer,
        { pageSize: 500, fieldNames: ['客户姓名'] },
      );
      for (const item of output.records) {
        map.set(item.id, readTextField(item.record['客户姓名']));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `getCustomerNameMap failed, fallback to empty map: ${message}`,
      );
    }
    return map;
  }

  /** 批量解析跟进人姓名（自建账号 UUID → app_user.name），避免 N+1 */
  private async getFollowerNameMap(
    rows: FollowUpRow[],
  ): Promise<Map<string, string>> {
    const ids: string[] = Array.from(
      new Set(
        rows
          .map((row: FollowUpRow): string => row.follower ?? '')
          .filter((id: string): boolean => id !== ''),
      ),
    );
    const map = new Map<string, string>();
    if (ids.length === 0) return map;
    const users: Array<{ id: string; name: string }> = await this.db
      .select({ id: appUser.id, name: appUser.name })
      .from(appUser)
      .where(inArray(appUser.id, ids));
    for (const user of users) {
      map.set(user.id, user.name);
    }
    return map;
  }

  private async ensureCustomerExists(customerId: string): Promise<void> {
    const detail = await this.bitableClient.getRecord(
      CAPABILITY_INSTANCE_IDS.customer,
      customerId,
    );
    if (!detail.record || Object.keys(detail.record).length === 0) {
      throw new NotFoundException('客户不存在');
    }
  }

  private parseDate(value?: string): Date | null {
    if (value === undefined || value === '') return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('日期格式无效');
    }
    return date;
  }
}

function extractPostgresErrorCode(error: unknown): string | undefined {
  let current: unknown = error;
  for (let depth = 0; depth < 4 && current && typeof current === 'object'; depth += 1) {
    const { code, cause } = current as { code?: unknown; cause?: unknown };
    if (typeof code === 'string') return code;
    current = cause;
  }
  return undefined;
}
