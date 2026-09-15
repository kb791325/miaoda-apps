import { eq } from 'drizzle-orm';
import { Logger } from '@nestjs/common';
import type { PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { followUp, shipmentItem } from '@server/database/schema';
import { CAPABILITY_INSTANCE_IDS } from '@server/common/constants/capability-instance-ids';
import {
  BitableClient,
  readTextField,
} from '@server/common/utils/bitable-client';
import {
  generateDetailNos,
  generateFollowNo,
  isUuidLike,
} from '@server/common/utils/business-no';
import { SyncMappingService } from './sync-mapping.service';
import { searchAllRecords } from './sync-pull-helpers';

const logger = new Logger('BitableSyncRepair');

export interface RepairSummary {
  fixed: number;
  adopted: number;
  ok: number;
}

export interface RepairResult {
  followUps: RepairSummary;
  shipmentItems: RepairSummary;
}

/**
 * 修复业务编号：本地有编号则以本地为准回写 Base；本地无编号时，
 * Base 已有合法编号（非 UUID）则沿用，否则生成新编号并双写。
 */
export async function repairBusinessNos(
  db: PostgresJsDatabase,
  bitable: BitableClient,
  mappingService: SyncMappingService,
): Promise<RepairResult> {
  const followUps = await repairFollowUps(db, bitable, mappingService);
  const shipmentItems = await repairShipmentItems(db, bitable, mappingService);
  logger.log(
    `repair numbers: ${JSON.stringify({ followUps, shipmentItems })}`,
  );
  return { followUps, shipmentItems };
}

async function repairFollowUps(
  db: PostgresJsDatabase,
  bitable: BitableClient,
  mappingService: SyncMappingService,
): Promise<RepairSummary> {
  const summary: RepairSummary = { fixed: 0, adopted: 0, ok: 0 };
  const baseRecords = await searchAllRecords(
    bitable,
    CAPABILITY_INSTANCE_IDS.syncFollowUp,
  );
  const mappings = await mappingService.listByEntity('follow_up');
  const byBase = new Map(mappings.map((m) => [m.baseRecordId, m]));
  const localRows = await db
    .select({ id: followUp.id, followNo: followUp.followNo })
    .from(followUp);
  const usedNos = new Set(
    localRows
      .map((r) => r.followNo)
      .filter((v): v is string => Boolean(v)),
  );
  const processed = new Set<string>();

  for (const item of baseRecords) {
    const mapping = byBase.get(item.id);
    if (!mapping) continue;
    const local = localRows.find((r) => r.id === mapping.localId);
    if (!local) continue;
    processed.add(local.id);
    const baseNo = readTextField(item.record['跟进编号']);
    if (local.followNo) {
      if (local.followNo !== baseNo) {
        await bitable.batchUpdateRecords(
          CAPABILITY_INSTANCE_IDS.syncFollowUp,
          [{ id: item.id, record: { 跟进编号: local.followNo } }],
        );
        summary.fixed += 1;
      } else {
        summary.ok += 1;
      }
      continue;
    }
    if (baseNo && !isUuidLike(baseNo) && !usedNos.has(baseNo)) {
      await db
        .update(followUp)
        .set({ followNo: baseNo })
        .where(eq(followUp.id, local.id));
      usedNos.add(baseNo);
      summary.adopted += 1;
      continue;
    }
    const newNo = await generateFollowNo(db);
    await db
      .update(followUp)
      .set({ followNo: newNo })
      .where(eq(followUp.id, local.id));
    await bitable.batchUpdateRecords(CAPABILITY_INSTANCE_IDS.syncFollowUp, [
      { id: item.id, record: { 跟进编号: newNo } },
    ]);
    summary.fixed += 1;
  }

  for (const row of localRows) {
    if (row.followNo || processed.has(row.id)) continue;
    const newNo = await generateFollowNo(db);
    await db
      .update(followUp)
      .set({ followNo: newNo })
      .where(eq(followUp.id, row.id));
  }
  return summary;
}

async function repairShipmentItems(
  db: PostgresJsDatabase,
  bitable: BitableClient,
  mappingService: SyncMappingService,
): Promise<RepairSummary> {
  const summary: RepairSummary = { fixed: 0, adopted: 0, ok: 0 };
  const baseRecords = await searchAllRecords(
    bitable,
    CAPABILITY_INSTANCE_IDS.syncShipmentItem,
  );
  const mappings = await mappingService.listByEntity('shipment_item');
  const byBase = new Map(mappings.map((m) => [m.baseRecordId, m]));
  const localRows = await db
    .select({ id: shipmentItem.id, detailNo: shipmentItem.detailNo })
    .from(shipmentItem);
  const usedNos = new Set(
    localRows
      .map((r) => r.detailNo)
      .filter((v): v is string => Boolean(v)),
  );
  const processed = new Set<string>();

  for (const item of baseRecords) {
    const mapping = byBase.get(item.id);
    if (!mapping) continue;
    const local = localRows.find((r) => r.id === mapping.localId);
    if (!local) continue;
    processed.add(local.id);
    const baseNo = readTextField(item.record['明细编号']);
    if (local.detailNo) {
      if (local.detailNo !== baseNo) {
        await bitable.batchUpdateRecords(
          CAPABILITY_INSTANCE_IDS.syncShipmentItem,
          [{ id: item.id, record: { 明细编号: local.detailNo } }],
        );
        summary.fixed += 1;
      } else {
        summary.ok += 1;
      }
      continue;
    }
    if (baseNo && !isUuidLike(baseNo) && !usedNos.has(baseNo)) {
      await db
        .update(shipmentItem)
        .set({ detailNo: baseNo })
        .where(eq(shipmentItem.id, local.id));
      usedNos.add(baseNo);
      summary.adopted += 1;
      continue;
    }
    const newNo = (await generateDetailNos(db, 1))[0];
    if (!newNo) continue;
    await db
      .update(shipmentItem)
      .set({ detailNo: newNo })
      .where(eq(shipmentItem.id, local.id));
    await bitable.batchUpdateRecords(CAPABILITY_INSTANCE_IDS.syncShipmentItem, [
      { id: item.id, record: { 明细编号: newNo } },
    ]);
    summary.fixed += 1;
  }

  for (const row of localRows) {
    if (row.detailNo || processed.has(row.id)) continue;
    const newNo = (await generateDetailNos(db, 1))[0];
    if (!newNo) continue;
    await db
      .update(shipmentItem)
      .set({ detailNo: newNo })
      .where(eq(shipmentItem.id, row.id));
  }
  return summary;
}
