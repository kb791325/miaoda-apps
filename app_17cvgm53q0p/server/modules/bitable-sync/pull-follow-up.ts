import { eq } from 'drizzle-orm';
import { Logger } from '@nestjs/common';
import type { PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { followUp } from '@server/database/schema';
import { CAPABILITY_INSTANCE_IDS, SYNC_BASE_TABLE_IDS } from '@server/common/constants/capability-instance-ids';
import {
  BitableClient,
  readDateField,
  readLinkIds,
  readNumberField,
  readTextField,
} from '@server/common/utils/bitable-client';
import { FOLLOW_UP_INTENTS, FOLLOW_UP_METHODS } from '@shared/follow-up';
import { SALES_STAGES } from '@shared/customer';
import {
  generateFollowNo,
  isUuidLike,
} from '@server/common/utils/business-no';
import { SyncMappingService } from './sync-mapping.service';
import { inEnum, readSelectField, readUserFieldFirst } from './sync-constants';
import {
  emptySummary,
  loadProductNameMap,
  searchAllRecords,
  type PullSummary,
} from './sync-pull-helpers';
import {
  addLinkChange,
  applyFollowUpCustomerLinks,
  emptyLinkChanges,
} from './follow-up-customer-link';

const logger = new Logger('BitableSyncPull');

/** Base 跟进记录表 → 应用库 follow_up（新增/更新/删除同步） */
export async function pullFollowUps(
  db: PostgresJsDatabase,
  bitable: BitableClient,
  mappingService: SyncMappingService,
): Promise<PullSummary> {
  const summary = emptySummary();
  const baseRecords = await searchAllRecords(
    bitable,
    CAPABILITY_INSTANCE_IDS.syncFollowUp,
  );
  const baseIds = new Set(baseRecords.map((r) => r.id));
  const mappings = await mappingService.listByEntity('follow_up');
  const byBase = new Map(mappings.map((m) => [m.baseRecordId, m]));
  const productNameById = await loadProductNameMap(bitable);
  const linkChanges = emptyLinkChanges();

  for (const item of baseRecords) {
    const rec = item.record;
    const customerId = readLinkIds(rec['关联客户'])[0];
    const content = readTextField(rec['跟进内容']);
    if (!customerId || !content) {
      summary.skipped += 1;
      logger.warn(
        `follow_up skipped: ${item.id} missing 关联客户 or 跟进内容`,
      );
      continue;
    }
    addLinkChange(linkChanges.additions, customerId, item.id);
    const followUpAtIso = readDateField(rec['跟进时间']);
    const nextIso = readDateField(rec['下次跟进时间']);
    const method = readSelectField(rec['跟进方式']);
    const intent = readSelectField(rec['客户意向度']);
    const stage = readSelectField(rec['阶段变化']);
    const budgetNum = readNumberField(rec['预计预算']);
    const demandProductId = readLinkIds(rec['需求产品'])[0];
    const patch = {
      customerId,
      content,
      follower: readUserFieldFirst(rec['跟进人']) || null,
      followUpAt: followUpAtIso ? new Date(followUpAtIso) : new Date(),
      method: inEnum(method, FOLLOW_UP_METHODS) ? method : '电话',
      intent: inEnum(intent, FOLLOW_UP_INTENTS) ? intent : '中',
      demandProduct: demandProductId
        ? (productNameById.get(demandProductId) ?? '')
        : '',
      budget: budgetNum > 0 ? String(budgetNum) : null,
      nextFollowUpAt: nextIso ? new Date(nextIso) : null,
      stageChange: inEnum(stage, SALES_STAGES) ? stage : '',
    };

    const followNo = readTextField(rec['跟进编号']);
    const mapping = byBase.get(item.id);
    if (mapping) {
      const updated = await db
        .update(followUp)
        .set({ ...patch, updatedAt: new Date() })
        .where(eq(followUp.id, mapping.localId))
        .returning({ id: followUp.id });
      if (updated.length === 0) {
        await insertLocalFollowUp(db, bitable, mappingService, item.id, patch, followNo);
        summary.added += 1;
      } else {
        await mappingService.touch('follow_up', mapping.localId);
        summary.updated += 1;
      }
      continue;
    }
    const matchedId = await findLocalFollowUpId(db, followNo);
    if (matchedId) {
      await mappingService.upsert(
        'follow_up',
        matchedId,
        SYNC_BASE_TABLE_IDS.followUp,
        item.id,
      );
      summary.updated += 1;
      continue;
    }
    await insertLocalFollowUp(db, bitable, mappingService, item.id, patch, followNo);
    summary.added += 1;
  }

  for (const m of mappings) {
    if (baseIds.has(m.baseRecordId)) continue;
    const localRows = await db
      .select({ customerId: followUp.customerId })
      .from(followUp)
      .where(eq(followUp.id, m.localId));
    const localCustomerId = localRows[0]?.customerId;
    if (localCustomerId) {
      addLinkChange(linkChanges.removals, localCustomerId, m.baseRecordId);
    }
    await db.delete(followUp).where(eq(followUp.id, m.localId));
    await mappingService.remove('follow_up', m.localId);
    summary.deleted += 1;
  }
  await applyFollowUpCustomerLinks(bitable, linkChanges);
  logger.log(`follow_up pull: ${JSON.stringify(summary)}`);
  return summary;
}

/** 映射丢失重建：优先按业务编号匹配，兼容历史遗留的 UUID 编号 */
async function findLocalFollowUpId(
  db: PostgresJsDatabase,
  followNo: string,
): Promise<string | undefined> {
  if (!followNo) return undefined;
  const byNo = await db
    .select({ id: followUp.id })
    .from(followUp)
    .where(eq(followUp.followNo, followNo));
  const matched = byNo[0];
  if (matched) return matched.id;
  if (isUuidLike(followNo)) {
    const byId = await db
      .select({ id: followUp.id })
      .from(followUp)
      .where(eq(followUp.id, followNo));
    return byId[0]?.id;
  }
  return undefined;
}

async function insertLocalFollowUp(
  db: PostgresJsDatabase,
  bitable: BitableClient,
  mappingService: SyncMappingService,
  baseRecordId: string,
  patch: Record<string, unknown>,
  baseFollowNo: string,
): Promise<void> {
  let followNo: string;
  let writeBack = true;
  if (baseFollowNo && !isUuidLike(baseFollowNo)) {
    const dup = await db
      .select({ id: followUp.id })
      .from(followUp)
      .where(eq(followUp.followNo, baseFollowNo));
    if (dup.length === 0) {
      followNo = baseFollowNo;
      writeBack = false;
    } else {
      followNo = await generateFollowNo(db);
    }
  } else {
    followNo = await generateFollowNo(db);
  }
  const inserted = await db
    .insert(followUp)
    .values({ ...patch, followNo } as typeof followUp.$inferInsert)
    .returning({ id: followUp.id });
  const newId = inserted[0]?.id;
  if (!newId) return;
  if (writeBack) {
    await bitable
      .batchUpdateRecords(CAPABILITY_INSTANCE_IDS.syncFollowUp, [
        { id: baseRecordId, record: { 跟进编号: followNo } },
      ])
      .catch((error: Error) => {
        logger.warn(`write back 跟进编号 failed: ${error.message}`);
      });
  }
  await mappingService.upsert(
    'follow_up',
    newId,
    SYNC_BASE_TABLE_IDS.followUp,
    baseRecordId,
  );
}
