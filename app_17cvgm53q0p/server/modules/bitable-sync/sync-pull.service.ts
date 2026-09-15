import { Inject, Injectable, Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from '@lark-apaas/fullstack-nestjs-core';
import { customerCrm } from '@server/database/schema';
import { BitableClient, readDateField } from '@server/common/utils/bitable-client';
import { CAPABILITY_INSTANCE_IDS } from '@server/common/constants/capability-instance-ids';
import { CUSTOMER_SOURCES, SALES_STAGES } from '@shared/customer';
import { SyncMappingService } from './sync-mapping.service';
import {
  gradeToLocal,
  inEnum,
  readSelectField,
  readUserFieldFirst,
} from './sync-constants';
import { searchAllRecords, type PullSummary } from './sync-pull-helpers';
import { pullFollowUps } from './pull-follow-up';
import { pullShipmentItems, pullShipments } from './pull-shipment';
import { repairBusinessNos, type RepairResult } from './repair-numbers';

export interface SyncPullResult {
  followUps: PullSummary;
  shipments: PullSummary;
  shipmentItems: PullSummary;
  customerCrm: PullSummary;
}

/** 多维表格 → 应用数据库拉取（自动化任务与手动触发共用） */
@Injectable()
export class SyncPullService {
  private readonly logger = new Logger(SyncPullService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    private readonly bitableClient: BitableClient,
    private readonly mappingService: SyncMappingService,
  ) {}

  async pullAll(): Promise<SyncPullResult> {
    const followUps = await pullFollowUps(
      this.db,
      this.bitableClient,
      this.mappingService,
    );
    const shipments = await pullShipments(
      this.db,
      this.bitableClient,
      this.mappingService,
    );
    const shipmentItems = await pullShipmentItems(
      this.db,
      this.bitableClient,
      this.mappingService,
    );
    const crm = await this.pullCustomerCrm();
    const result: SyncPullResult = {
      followUps,
      shipments,
      shipmentItems,
      customerCrm: crm,
    };
    this.logger.log(`pull all: ${JSON.stringify(result)}`);
    return result;
  }

  /** 修复跟进编号/明细编号：UUID 乱码统一替换为业务编号并回写 Base */
  async repairNumbers(): Promise<RepairResult> {
    return repairBusinessNos(
      this.db,
      this.bitableClient,
      this.mappingService,
    );
  }

  /** Base 客户表 CRM 扩展字段 → 应用库 customer_crm（记录 id 即客户 id） */
  private async pullCustomerCrm(): Promise<PullSummary> {
    const summary: PullSummary = { added: 0, updated: 0, deleted: 0, skipped: 0 };
    const baseRecords = await searchAllRecords(
      this.bitableClient,
      CAPABILITY_INSTANCE_IDS.syncCustomer,
    );
    for (const item of baseRecords) {
      const rec = item.record;
      const customerId = item.id;
      const patch: Partial<typeof customerCrm.$inferInsert> = {};
      const stage = readSelectField(rec['销售阶段']);
      if (inEnum(stage, SALES_STAGES)) patch.salesStage = stage;
      const ownerId = readUserFieldFirst(rec['负责销售']);
      if (ownerId) patch.owner = ownerId;
      const firstIso = readDateField(rec['首次接触时间']);
      if (firstIso) patch.firstContactAt = new Date(firstIso);
      const dealIso = readDateField(rec['预计成交时间']);
      if (dealIso) patch.expectedDealAt = new Date(dealIso);
      const nextIso = readDateField(rec['下次跟进时间']);
      if (nextIso) patch.nextFollowUpAt = new Date(nextIso);
      const grade = readSelectField(rec['客户等级']);
      const localGrade = grade ? gradeToLocal(grade) : undefined;
      if (localGrade) patch.grade = localGrade;
      const source = readSelectField(rec['客户来源']);
      if (inEnum(source, CUSTOMER_SOURCES)) patch.source = source;
      if (Object.keys(patch).length === 0) {
        summary.skipped += 1;
        continue;
      }

      const rows = await this.db
        .select()
        .from(customerCrm)
        .where(eq(customerCrm.customerId, customerId));
      const local = rows[0];
      if (local && !hasCrmDiff(local, patch)) {
        summary.skipped += 1;
        continue;
      }
      await this.db
        .insert(customerCrm)
        .values({
          customerId,
          grade: '',
          source: '',
          salesStage: '线索',
          ...patch,
        })
        .onConflictDoUpdate({
          target: [customerCrm.customerId],
          set: { ...patch, updatedAt: new Date() },
        });
      await this.mappingService.upsert(
        'customer_crm',
        customerId,
        'tbl9qtdri9POmNkz',
        customerId,
      );
      if (local) summary.updated += 1;
      else summary.added += 1;
    }
    return summary;
  }
}

function hasCrmDiff(
  local: typeof customerCrm.$inferSelect,
  patch: Partial<typeof customerCrm.$inferInsert>,
): boolean {
  if (patch.salesStage !== undefined && patch.salesStage !== local.salesStage) {
    return true;
  }
  if (patch.owner !== undefined && patch.owner !== local.owner) return true;
  if (
    patch.firstContactAt !== undefined &&
    String(patch.firstContactAt.getTime()) !== String(local.firstContactAt?.getTime())
  ) {
    return true;
  }
  if (
    patch.expectedDealAt !== undefined &&
    String(patch.expectedDealAt.getTime()) !== String(local.expectedDealAt?.getTime())
  ) {
    return true;
  }
  if (
    patch.nextFollowUpAt !== undefined &&
    String(patch.nextFollowUpAt.getTime()) !== String(local.nextFollowUpAt?.getTime())
  ) {
    return true;
  }
  if (patch.grade !== undefined && patch.grade !== local.grade) return true;
  if (patch.source !== undefined && patch.source !== local.source) return true;
  return false;
}
