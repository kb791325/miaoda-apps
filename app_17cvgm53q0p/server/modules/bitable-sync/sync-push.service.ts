import { Inject, Injectable, Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from '@lark-apaas/fullstack-nestjs-core';
import {
  customerCrm,
  followUp,
  shipment,
  shipmentItem,
} from '@server/database/schema';
import {
  BitableClient,
  readLinkIds,
} from '@server/common/utils/bitable-client';
import {
  generateDetailNos,
  generateFollowNo,
} from '@server/common/utils/business-no';
import {
  CAPABILITY_INSTANCE_IDS,
  SYNC_BASE_TABLE_IDS,
} from '@server/common/constants/capability-instance-ids';
import { FOLLOW_UP_INTENTS, FOLLOW_UP_METHODS } from '@shared/follow-up';
import { CUSTOMER_SOURCES, SALES_STAGES } from '@shared/customer';
import { SHIPMENT_STATUS_OPTIONS } from '@shared/shipment';
import { SyncMappingService } from './sync-mapping.service';
import {
  addLinkChange,
  applyFollowUpCustomerLinks,
  emptyLinkChanges,
} from './follow-up-customer-link';
import {
  BASE_CUSTOMER_SOURCES,
  STOCK_STATUS_TO_BASE,
  gradeToBase,
  inEnum,
  toBaseMs,
  toBaseUserIds,
  type SyncEntityType,
} from './sync-constants';

/** 应用数据库 → 多维表格推送：由业务写入路径调用，失败仅记录日志不阻断业务 */
@Injectable()
export class SyncPushService {
  private readonly logger = new Logger(SyncPushService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    private readonly bitableClient: BitableClient,
    private readonly mappingService: SyncMappingService,
  ) {}

  /** 推送单条跟进记录 */
  async pushFollowUp(localId: string): Promise<boolean> {
    try {
      await this.pushFollowUpInner(localId);
      return true;
    } catch (error) {
      this.logger.error(
        `push follow_up ${localId} failed: ${(error as Error).message}`,
      );
      return false;
    }
  }

  /** 推送发货单及其全部明细 */
  async pushShipment(shipmentId: string): Promise<boolean> {
    try {
      await this.pushShipmentInner(shipmentId);
      return true;
    } catch (error) {
      this.logger.error(
        `push shipment ${shipmentId} failed: ${(error as Error).message}`,
      );
      return false;
    }
  }

  /** 推送客户 CRM 扩展字段（写回客户表） */
  async pushCustomerCrm(customerId: string): Promise<boolean> {
    try {
      await this.pushCustomerCrmInner(customerId);
      return true;
    } catch (error) {
      this.logger.error(
        `push customer_crm ${customerId} failed: ${(error as Error).message}`,
      );
      return false;
    }
  }

  /** 全量重推（手动触发 / 兜底对账用） */
  async pushAll(): Promise<{ pushed: number; failed: number }> {
    let pushed = 0;
    let failed = 0;
    const followUps = await this.db.select({ id: followUp.id }).from(followUp);
    for (const row of followUps) {
      if (await this.pushFollowUp(row.id)) pushed += 1;
      else failed += 1;
    }
    const shipments = await this.db
      .select({ id: shipment.id })
      .from(shipment);
    for (const row of shipments) {
      if (await this.pushShipment(row.id)) pushed += 1;
      else failed += 1;
    }
    const crmRows = await this.db
      .select({ customerId: customerCrm.customerId })
      .from(customerCrm);
    for (const row of crmRows) {
      if (await this.pushCustomerCrm(row.customerId)) pushed += 1;
      else failed += 1;
    }
    return { pushed, failed };
  }

  private async pushFollowUpInner(localId: string): Promise<void> {
    const rows = await this.db
      .select()
      .from(followUp)
      .where(eq(followUp.id, localId));
    const row = rows[0];
    if (!row) return;

    const existingMapping = await this.mappingService.getByLocal(
      'follow_up',
      row.id,
    );
    let oldCustomerId: string | undefined;
    if (existingMapping) {
      try {
        const detail = await this.bitableClient.getRecord(
          CAPABILITY_INSTANCE_IDS.syncFollowUp,
          existingMapping.baseRecordId,
        );
        oldCustomerId = readLinkIds(detail.record?.['关联客户'])[0];
      } catch {
        // 旧记录读取失败不影响本次推送，反向关联按追加幂等处理
      }
    }

    let followNo = row.followNo;
    if (!followNo) {
      followNo = await generateFollowNo(this.db);
      await this.db
        .update(followUp)
        .set({ followNo })
        .where(eq(followUp.id, row.id));
    }

    const record: Record<string, unknown> = {
      跟进编号: followNo,
      关联客户: [row.customerId],
      跟进时间: row.followUpAt.getTime(),
      跟进内容: row.content,
    };
    if (inEnum(row.method, FOLLOW_UP_METHODS)) record['跟进方式'] = row.method;
    const followerIds = toBaseUserIds(row.follower);
    if (followerIds) record['跟进人'] = followerIds;
    if (row.intent && inEnum(row.intent, FOLLOW_UP_INTENTS)) {
      record['客户意向度'] = row.intent;
    }
    if (row.budget !== null) {
      const num = Number(row.budget);
      if (Number.isFinite(num)) record['预计预算'] = num;
    }
    if (row.stageChange && inEnum(row.stageChange, SALES_STAGES)) {
      record['阶段变化'] = row.stageChange;
    }
    const nextMs = toBaseMs(row.nextFollowUpAt);
    if (nextMs) record['下次跟进时间'] = nextMs;
    if (row.demandProduct) {
      const productId = await this.findProductByName(row.demandProduct);
      if (productId) record['需求产品'] = [productId];
    }
    const baseFollowUpId = await this.upsertRecord(
      CAPABILITY_INSTANCE_IDS.syncFollowUp,
      'follow_up',
      row.id,
      SYNC_BASE_TABLE_IDS.followUp,
      record,
    );

    const linkChanges = emptyLinkChanges();
    addLinkChange(linkChanges.additions, row.customerId, baseFollowUpId);
    if (oldCustomerId && oldCustomerId !== row.customerId) {
      addLinkChange(linkChanges.removals, oldCustomerId, baseFollowUpId);
    }
    await applyFollowUpCustomerLinks(this.bitableClient, linkChanges);
  }

  private async pushShipmentInner(shipmentId: string): Promise<void> {
    const shipRows = await this.db
      .select()
      .from(shipment)
      .where(eq(shipment.id, shipmentId));
    const ship = shipRows[0];
    if (!ship) return;

    const record: Record<string, unknown> = {
      发货单号: ship.shipNo,
      型号核对结果: ship.hasModelDiff ? '存在异常' : '全部一致',
    };
    // 关联订单仅在订单确实存在于 Base 时写入：link 字段引用不存在的记录会导致整条写入失败，
    // 而一条关联失效的发货单会阻断后续所有发货单的同步，形成永久性卡点。
    try {
      const { record: orderRecord } = await this.bitableClient.getRecord(
        CAPABILITY_INSTANCE_IDS.order,
        ship.orderId,
      );
      if (Object.keys(orderRecord).length > 0) {
        record['关联订单'] = [ship.orderId];
      } else {
        this.logger.warn(
          `shipment ${ship.shipNo}: order ${ship.orderId} missing in Base, link field skipped`,
        );
      }
    } catch (error) {
      this.logger.warn(
        `shipment ${ship.shipNo}: order ${ship.orderId} existence check failed, link field skipped: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
    if (inEnum(ship.shipStatus, SHIPMENT_STATUS_OPTIONS)) {
      record['发货状态'] = ship.shipStatus;
    }
    const outboundMs = toBaseMs(ship.outboundTime);
    if (outboundMs) record['出库时间'] = outboundMs;
    const shipperIds = toBaseUserIds(ship.shipper);
    if (shipperIds) record['发货人'] = shipperIds;
    if (ship.truckDriver) record['货车/司机'] = ship.truckDriver;
    if (ship.installAddress) record['安装地址'] = ship.installAddress;
    if (ship.installContact) record['安装联系人'] = ship.installContact;
    if (ship.installPhone) record['安装电话'] = ship.installPhone;
    const appointmentMs = toBaseMs(ship.appointmentTime);
    if (appointmentMs) record['预约安装时间'] = appointmentMs;
    const installerIds = toBaseUserIds(ship.installerId);
    if (installerIds) record['安装人员'] = installerIds;
    const installStartMs = toBaseMs(ship.installStartTime);
    if (installStartMs) record['开始安装时间'] = installStartMs;
    const installCompleteMs = toBaseMs(ship.installCompleteTime);
    if (installCompleteMs) record['安装完成时间'] = installCompleteMs;
    if (ship.installFee != null) record['安装费用'] = Number(ship.installFee);
    if (ship.installRemark) record['安装备注'] = ship.installRemark;
    if (ship.acceptancePhotos && ship.acceptancePhotos.length > 0) {
      record['验收照片'] = ship.acceptancePhotos.join(',');
    }
    if (ship.remark) record['备注'] = ship.remark;

    await this.upsertRecord(
      CAPABILITY_INSTANCE_IDS.syncShipment,
      'shipment',
      ship.id,
      SYNC_BASE_TABLE_IDS.shipment,
      record,
    );
    const mapping = await this.mappingService.getByLocal('shipment', ship.id);
    const baseShipId = mapping?.baseRecordId;
    if (!baseShipId) return;

    const items = await this.db
      .select()
      .from(shipmentItem)
      .where(eq(shipmentItem.shipmentId, ship.id));
    const missing = items.filter(
      (item: typeof shipmentItem.$inferSelect): boolean => !item.detailNo,
    );
    if (missing.length > 0) {
      const nos: string[] = await generateDetailNos(this.db, missing.length);
      for (let i = 0; i < missing.length; i += 1) {
        const target = missing[i];
        const no = nos[i];
        if (!target || !no) continue;
        await this.db
          .update(shipmentItem)
          .set({ detailNo: no })
          .where(eq(shipmentItem.id, target.id));
        target.detailNo = no;
      }
    }
    for (const item of items) {
      const itemRecord: Record<string, unknown> = {
        明细编号: item.detailNo ?? '',
        关联发货单: [baseShipId],
        订单要求型号: item.requiredModel,
        实际发货型号: item.actualModel,
        发货数量: item.shipQuantity,
        型号是否一致: item.modelMatch ? '一致' : '不一致',
      };
      if (item.actualProductId) {
        itemRecord['关联商品'] = [item.actualProductId];
      }
      const stockLabel = STOCK_STATUS_TO_BASE[ship.stockStatus];
      if (stockLabel) itemRecord['库存扣减状态'] = stockLabel;
      await this.upsertRecord(
        CAPABILITY_INSTANCE_IDS.syncShipmentItem,
        'shipment_item',
        item.id,
        SYNC_BASE_TABLE_IDS.shipmentItem,
        itemRecord,
      );
    }
  }

  private async pushCustomerCrmInner(customerId: string): Promise<void> {
    const rows = await this.db
      .select()
      .from(customerCrm)
      .where(eq(customerCrm.customerId, customerId));
    const row = rows[0];
    if (!row) return;

    const record: Record<string, unknown> = {};
    if (inEnum(row.salesStage, SALES_STAGES)) record['销售阶段'] = row.salesStage;
    const ownerIds = toBaseUserIds(row.owner);
    if (ownerIds) record['负责销售'] = ownerIds;
    const firstMs = toBaseMs(row.firstContactAt);
    if (firstMs) record['首次接触时间'] = firstMs;
    const dealMs = toBaseMs(row.expectedDealAt);
    if (dealMs) record['预计成交时间'] = dealMs;
    const nextMs = toBaseMs(row.nextFollowUpAt);
    if (nextMs) record['下次跟进时间'] = nextMs;
    const baseGrade = row.grade ? gradeToBase(row.grade) : undefined;
    if (baseGrade) {
      record['客户等级'] = baseGrade;
    }
    if (row.source && inEnum(row.source, BASE_CUSTOMER_SOURCES)) {
      record['客户来源'] = row.source;
    }

    const mapping = await this.mappingService.getByLocal(
      'customer_crm',
      customerId,
    );
    if (!mapping) {
      await this.mappingService.upsert(
        'customer_crm',
        customerId,
        SYNC_BASE_TABLE_IDS.customer,
        customerId,
      );
    }
    if (Object.keys(record).length === 0) return;
    await this.bitableClient.batchUpdateRecords(
      CAPABILITY_INSTANCE_IDS.syncCustomer,
      [{ id: customerId, record }],
    );
    await this.mappingService.touch('customer_crm', customerId);
  }

  /** 映射存在则更新对应 Base 记录，否则新增并登记映射；返回 Base record_id */
  private async upsertRecord(
    instanceId: string,
    entityType: SyncEntityType,
    localId: string,
    baseTableId: string,
    record: Record<string, unknown>,
  ): Promise<string> {
    const mapping = await this.mappingService.getByLocal(entityType, localId);
    if (mapping) {
      await this.bitableClient.batchUpdateRecords(instanceId, [
        { id: mapping.baseRecordId, record },
      ]);
      await this.mappingService.touch(entityType, localId);
      return mapping.baseRecordId;
    }
    const output = await this.bitableClient.batchAddRecords(instanceId, [
      { record },
    ]);
    const baseId = output.records[0]?.id ?? '';
    if (!baseId) throw new Error('batchAddRecords returned empty id');
    await this.mappingService.upsert(entityType, localId, baseTableId, baseId);
    return baseId;
  }

  /** 按商品名称在商品表查 record_id（用于跟进记录「需求产品」链接） */
  private async findProductByName(name: string): Promise<string | undefined> {
    const output = await this.bitableClient.searchRecords(
      CAPABILITY_INSTANCE_IDS.product,
      {
        filter: {
          conjunction: 'and',
          conditions: [
            { fieldName: '商品名称', operator: 'is', value: [name] },
          ],
        },
        pageSize: 1,
      },
    );
    return output.records[0]?.id;
  }
}
