import { eq } from 'drizzle-orm';
import { Logger } from '@nestjs/common';
import type { PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { shipment, shipmentItem } from '@server/database/schema';
import { CAPABILITY_INSTANCE_IDS, SYNC_BASE_TABLE_IDS } from '@server/common/constants/capability-instance-ids';
import {
  BitableClient,
  readDateField,
  readFormulaText,
  readLinkIds,
  readNumberField,
  readTextField,
} from '@server/common/utils/bitable-client';
import {
  generateDetailNos,
  isUuidLike,
} from '@server/common/utils/business-no';
import { SyncMappingService } from './sync-mapping.service';
import {
  ORDER_LINK_INSTANCE_ID,
  inEnum,
  readSelectField,
  readUserFieldFirst,
} from './sync-constants';
import {
  emptySummary,
  loadCustomerNameMap,
  loadProductNameMap,
  searchAllRecords,
  type PullSummary,
} from './sync-pull-helpers';

const logger = new Logger('BitableSyncPull');

/** Base 发货单表 → 应用库 shipment（不回写发货状态，避免绕过库存联动） */
export async function pullShipments(
  db: PostgresJsDatabase,
  bitable: BitableClient,
  mappingService: SyncMappingService,
): Promise<PullSummary> {
  const summary = emptySummary();
  const baseRecords = await searchAllRecords(
    bitable,
    CAPABILITY_INSTANCE_IDS.syncShipment,
  );
  const mappings = await mappingService.listByEntity('shipment');
  const byBase = new Map(mappings.map((m) => [m.baseRecordId, m]));

  for (const item of baseRecords) {
    const rec = item.record;
    const shipNo = readTextField(rec['发货单号']);
    const patch: Partial<typeof shipment.$inferInsert> = {};
    // 出库时间：新字段优先，存量 Base 记录的「发货时间」即出库时间
    const outboundIso =
      readDateField(rec['出库时间']) || readDateField(rec['发货时间']);
    if (outboundIso) patch.outboundTime = new Date(outboundIso);
    patch.remark = readTextField(rec['备注']);
    patch.hasModelDiff = readSelectField(rec['型号核对结果']) === '存在异常';
    const shipperId = readUserFieldFirst(rec['发货人']);
    if (shipperId) patch.shipper = shipperId;
    const truckDriver = readTextField(rec['货车/司机']);
    if (truckDriver) patch.truckDriver = truckDriver;
    const installAddress = readTextField(rec['安装地址']);
    if (installAddress) patch.installAddress = installAddress;
    const installContact = readTextField(rec['安装联系人']);
    if (installContact) patch.installContact = installContact;
    const installPhone = readTextField(rec['安装电话']);
    if (installPhone) patch.installPhone = installPhone;
    const appointmentIso = readDateField(rec['预约安装时间']);
    if (appointmentIso) patch.appointmentTime = new Date(appointmentIso);
    const installerId = readUserFieldFirst(rec['安装人员']);
    if (installerId) patch.installerId = installerId;
    const installStartIso = readDateField(rec['开始安装时间']);
    if (installStartIso) patch.installStartTime = new Date(installStartIso);
    const installCompleteIso = readDateField(rec['安装完成时间']);
    if (installCompleteIso) {
      patch.installCompleteTime = new Date(installCompleteIso);
    }
    const installFee = readNumberField(rec['安装费用']);
    if (installFee > 0) patch.installFee = String(installFee);
    const installRemark = readTextField(rec['安装备注']);
    if (installRemark) patch.installRemark = installRemark;

    const mapping = byBase.get(item.id);
    if (mapping) {
      const updated = await db
        .update(shipment)
        .set({ ...patch, updatedAt: new Date() })
        .where(eq(shipment.id, mapping.localId))
        .returning({ id: shipment.id });
      if (updated.length > 0) {
        await mappingService.touch('shipment', mapping.localId);
        summary.updated += 1;
        continue;
      }
    }
    if (!shipNo) {
      summary.skipped += 1;
      logger.warn(`shipment skipped: ${item.id} missing 发货单号`);
      continue;
    }
    const existing = await db
      .select({ id: shipment.id })
      .from(shipment)
      .where(eq(shipment.shipNo, shipNo));
    if (existing.length > 0) {
      await db
        .update(shipment)
        .set({ ...patch, updatedAt: new Date() })
        .where(eq(shipment.id, existing[0].id));
      await mappingService.upsert(
        'shipment',
        existing[0].id,
        SYNC_BASE_TABLE_IDS.shipment,
        item.id,
      );
      summary.updated += 1;
      continue;
    }
    const orderId = readLinkIds(rec['关联订单'])[0];
    const created = orderId
      ? await insertLocalShipment(db, bitable, orderId, shipNo, patch)
      : undefined;
    if (!created) {
      summary.skipped += 1;
      logger.warn(`shipment skipped: ${item.id} missing 关联订单`);
      continue;
    }
    await mappingService.upsert(
      'shipment',
      created,
      SYNC_BASE_TABLE_IDS.shipment,
      item.id,
    );
    summary.added += 1;
  }
  logger.log(`shipment pull: ${JSON.stringify(summary)}`);
  return summary;
}

async function insertLocalShipment(
  db: PostgresJsDatabase,
  bitable: BitableClient,
  orderId: string,
  shipNo: string,
  patch: Partial<typeof shipment.$inferInsert>,
): Promise<string | undefined> {
  const orderRec = await bitable
    .getRecord(ORDER_LINK_INSTANCE_ID, orderId)
    .catch(() => undefined);
  if (!orderRec || !orderRec.record) return undefined;
  const orderNo = readTextField(orderRec.record['订单号']);
  const customerId = readLinkIds(orderRec.record['客户'])[0];
  const customerName = customerId
    ? await loadCustomerNameMap(bitable).then((m) => m.get(customerId) ?? '')
    : '';
  const customerAddress = customerId
    ? await bitable
        .getRecord(CAPABILITY_INSTANCE_IDS.customer, customerId)
        .then((rec) => readTextField(rec.record['收货地址']))
        .catch(() => '')
    : '';
  try {
    const inserted = await db
      .insert(shipment)
      .values({
        shipNo,
        orderId,
        orderNo,
        customerName,
        installAddress: customerAddress,
        installContact: customerName,
        shipStatus: '待出库',
        stockStatus: 'none',
        remark: '',
        ...patch,
      })
      .returning({ id: shipment.id });
    return inserted[0]?.id;
  } catch (error) {
    logger.warn(`insert shipment ${shipNo} failed: ${(error as Error).message}`);
    return undefined;
  }
}

/** Base 发货明细表 → 应用库 shipment_item（不回写发货数量，避免与库存扣减冲突） */
export async function pullShipmentItems(
  db: PostgresJsDatabase,
  bitable: BitableClient,
  mappingService: SyncMappingService,
): Promise<PullSummary> {
  const summary = emptySummary();
  const baseRecords = await searchAllRecords(
    bitable,
    CAPABILITY_INSTANCE_IDS.syncShipmentItem,
  );
  const itemMappings = await mappingService.listByEntity('shipment_item');
  const itemByBase = new Map(itemMappings.map((m) => [m.baseRecordId, m]));
  const shipMappings = await mappingService.listByEntity('shipment');
  const shipByBase = new Map(shipMappings.map((m) => [m.baseRecordId, m]));
  const productNameById = await loadProductNameMap(bitable);

  for (const item of baseRecords) {
    const rec = item.record;
    const actualModel = readTextField(rec['实际发货型号']);
    const requiredModel = readTextField(rec['订单要求型号']);
    const modelMatch = readSelectField(rec['型号是否一致']) !== '不一致';
    const mapping = itemByBase.get(item.id);
    if (mapping) {
      const updated = await db
        .update(shipmentItem)
        .set({
          actualModel,
          requiredModel,
          modelMatch,
          updatedAt: new Date(),
        })
        .where(eq(shipmentItem.id, mapping.localId))
        .returning({ id: shipmentItem.id });
      if (updated.length > 0) {
        await mappingService.touch('shipment_item', mapping.localId);
        summary.updated += 1;
        continue;
      }
    }
    const detailNo = readTextField(rec['明细编号']);
    const matchedItemId = await findLocalItemId(db, detailNo);
    if (matchedItemId) {
      await mappingService.upsert(
        'shipment_item',
        matchedItemId,
        SYNC_BASE_TABLE_IDS.shipmentItem,
        item.id,
      );
      summary.updated += 1;
      continue;
    }
    const shipBaseId = readLinkIds(rec['关联发货单'])[0];
    const shipMapping = shipBaseId ? shipByBase.get(shipBaseId) : undefined;
    const actualProductId = readLinkIds(rec['关联商品'])[0];
    if (!shipMapping || !actualProductId) {
      summary.skipped += 1;
      logger.warn(
        `shipment_item skipped: ${item.id} missing 关联发货单映射 or 关联商品`,
      );
      continue;
    }
    const created = await insertLocalShipmentItem(
      db,
      bitable,
      shipMapping.localId,
      actualProductId,
      actualModel,
      modelMatch,
      productNameById,
      item.id,
      detailNo,
    );
    if (!created) {
      summary.skipped += 1;
      logger.warn(`shipment_item skipped: ${item.id} insert failed`);
      continue;
    }
    await mappingService.upsert(
      'shipment_item',
      created,
      SYNC_BASE_TABLE_IDS.shipmentItem,
      item.id,
    );
    summary.added += 1;
  }
  logger.log(`shipment_item pull: ${JSON.stringify(summary)}`);
  return summary;
}

/** 映射丢失重建：优先按明细编号匹配，兼容历史遗留的 UUID 编号 */
async function findLocalItemId(
  db: PostgresJsDatabase,
  detailNo: string,
): Promise<string | undefined> {
  if (!detailNo) return undefined;
  const byNo = await db
    .select({ id: shipmentItem.id })
    .from(shipmentItem)
    .where(eq(shipmentItem.detailNo, detailNo));
  const matched = byNo[0];
  if (matched) return matched.id;
  if (isUuidLike(detailNo)) {
    const byId = await db
      .select({ id: shipmentItem.id })
      .from(shipmentItem)
      .where(eq(shipmentItem.id, detailNo));
    return byId[0]?.id;
  }
  return undefined;
}

async function insertLocalShipmentItem(
  db: PostgresJsDatabase,
  bitable: BitableClient,
  localShipmentId: string,
  actualProductId: string,
  actualModel: string,
  modelMatch: boolean,
  productNameById: Map<string, string>,
  baseRecordId: string,
  baseDetailNo: string,
): Promise<string | undefined> {
  const shipRows = await db
    .select()
    .from(shipment)
    .where(eq(shipment.id, localShipmentId));
  const ship = shipRows[0];
  if (!ship) return undefined;
  const orderRec = await bitable
    .getRecord(ORDER_LINK_INSTANCE_ID, ship.orderId)
    .catch(() => undefined);
  if (!orderRec || !orderRec.record) return undefined;
  const requiredProductId = readLinkIds(orderRec.record['商品'])[0] ?? '';
  const requiredModel = readFormulaText(orderRec.record['SKU编码']);
  const requiredQuantity = readNumberField(orderRec.record['数量']) || 1;
  let detailNo: string;
  let writeBack = true;
  if (baseDetailNo && !isUuidLike(baseDetailNo)) {
    const dup = await db
      .select({ id: shipmentItem.id })
      .from(shipmentItem)
      .where(eq(shipmentItem.detailNo, baseDetailNo));
    if (dup.length === 0) {
      detailNo = baseDetailNo;
      writeBack = false;
    } else {
      const generated = await generateDetailNos(db, 1);
      detailNo = generated[0] ?? '';
    }
  } else {
    const generated = await generateDetailNos(db, 1);
    detailNo = generated[0] ?? '';
  }
  if (!detailNo) {
    logger.warn(`shipment_item skipped: ${baseRecordId} detail no gen failed`);
    return undefined;
  }
  try {
    const inserted = await db
      .insert(shipmentItem)
      .values({
        shipmentId: localShipmentId,
        detailNo,
        orderItemId: ship.orderId,
        requiredProductId,
        requiredProductName: readFormulaText(orderRec.record['商品名称']),
        requiredModel,
        requiredQuantity,
        actualProductId,
        actualProductName: productNameById.get(actualProductId) ?? '',
        actualModel,
        shipQuantity: requiredQuantity,
        modelMatch: modelMatch && requiredModel.trim() === actualModel.trim(),
      })
      .returning({ id: shipmentItem.id });
    const newId = inserted[0]?.id;
    if (newId && writeBack) {
      await bitable
        .batchUpdateRecords(CAPABILITY_INSTANCE_IDS.syncShipmentItem, [
          { id: baseRecordId, record: { 明细编号: detailNo } },
        ])
        .catch((error: Error) => {
          logger.warn(`write back 明细编号 failed: ${error.message}`);
        });
    }
    return newId;
  } catch (error) {
    logger.warn(
      `insert shipment_item failed: ${(error as Error).message}`,
    );
    return undefined;
  }
}
