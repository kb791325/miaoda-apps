import { Inject, Injectable } from '@nestjs/common';
import { inArray, sql } from 'drizzle-orm';
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from '@lark-apaas/fullstack-nestjs-core';
import { customerCrm } from '@server/database/schema';
import { SyncPushService } from '@server/modules/bitable-sync/sync-push.service';

export type CustomerCrmRow = typeof customerCrm.$inferSelect;
type CrmInsert = typeof customerCrm.$inferInsert;

export interface CrmPatch {
  grade?: string;
  source?: string;
  salesStage?: string;
  ownerId?: string | null;
  firstContactAt?: Date | null;
  expectedDealAt?: Date | null;
  nextFollowUpAt?: Date | null;
  lastFollowUpAt?: Date | null;
  creditLimit?: string;
  creditWarningRatio?: number;
}

const PATCH_TO_COLUMN: Array<[keyof CrmPatch, string]> = [
  ['grade', 'grade'],
  ['source', 'source'],
  ['salesStage', 'salesStage'],
  ['ownerId', 'owner'],
  ['firstContactAt', 'firstContactAt'],
  ['expectedDealAt', 'expectedDealAt'],
  ['nextFollowUpAt', 'nextFollowUpAt'],
  ['lastFollowUpAt', 'lastFollowUpAt'],
  ['creditLimit', 'creditLimit'],
  ['creditWarningRatio', 'creditWarningRatio'],
];

@Injectable()
export class CrmService {
  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    private readonly syncPush: SyncPushService,
  ) {}

  async getMapByCustomerIds(
    customerIds: string[],
  ): Promise<Map<string, CustomerCrmRow>> {
    const map = new Map<string, CustomerCrmRow>();
    const ids = [...new Set(customerIds.filter((id: string): boolean => Boolean(id)))];
    if (ids.length === 0) return map;
    const rows: CustomerCrmRow[] = await this.db
      .select()
      .from(customerCrm)
      .where(inArray(customerCrm.customerId, ids));
    for (const row of rows) {
      map.set(row.customerId, row);
    }
    return map;
  }

  async upsert(
    customerId: string,
    patch: CrmPatch,
    operatorId?: string,
  ): Promise<void> {
    const values: Record<string, unknown> = {
      customerId,
      grade: '',
      source: '',
      salesStage: '线索',
      owner: null,
      firstContactAt: null,
      expectedDealAt: null,
      nextFollowUpAt: null,
      lastFollowUpAt: null,
      createdBy: operatorId ?? null,
    };
    const set: Record<string, unknown> = {
      updatedAt: new Date(),
      updatedBy: operatorId ?? null,
    };
    for (const [patchKey, colKey] of PATCH_TO_COLUMN) {
      const value = patch[patchKey];
      if (value !== undefined) {
        values[colKey] = value;
        set[colKey] = value;
      }
    }
    await this.db
      .insert(customerCrm)
      .values(values as CrmInsert)
      .onConflictDoUpdate({
        target: customerCrm.customerId,
        set: set as Partial<CrmInsert>,
      });
    await this.syncPush.pushCustomerCrm(customerId);
  }

  async updateStage(
    customerId: string,
    stage: string,
    operatorId?: string,
  ): Promise<void> {
    await this.upsert(customerId, { salesStage: stage }, operatorId);
  }

  async applyFollowUp(
    customerId: string,
    opts: {
      followUpAt: Date;
      nextFollowUpAt?: Date | null;
      stageChange?: string;
    },
    operatorId?: string,
  ): Promise<void> {
    const followUpIso: string = opts.followUpAt.toISOString();
    const values: Record<string, unknown> = {
      customerId,
      grade: '',
      source: '',
      salesStage: opts.stageChange || '线索',
      owner: null,
      firstContactAt: null,
      expectedDealAt: null,
      nextFollowUpAt: opts.nextFollowUpAt ?? null,
      lastFollowUpAt: opts.followUpAt,
      createdBy: operatorId ?? null,
    };
    const set: Record<string, unknown> = {
      lastFollowUpAt: sql`greatest(coalesce(${customerCrm.lastFollowUpAt}, ${followUpIso}), ${followUpIso})`,
      updatedAt: new Date(),
      updatedBy: operatorId ?? null,
    };
    if (opts.nextFollowUpAt !== undefined) {
      set.nextFollowUpAt = opts.nextFollowUpAt;
    }
    if (opts.stageChange) {
      set.salesStage = opts.stageChange;
    }
    await this.db
      .insert(customerCrm)
      .values(values as CrmInsert)
      .onConflictDoUpdate({
        target: customerCrm.customerId,
        set: set as Partial<CrmInsert>,
      });
    await this.syncPush.pushCustomerCrm(customerId);
  }
}
