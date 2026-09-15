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
  readTextField,
} from '@server/common/utils/bitable-client';
import {
  CAPABILITY_INSTANCE_IDS,
  SYNC_BASE_TABLE_IDS,
} from '@server/common/constants/capability-instance-ids';
import { SyncMappingService } from './sync-mapping.service';
import { SyncPushService } from './sync-push.service';
import { SyncPullService, type SyncPullResult } from './sync-pull.service';
import { searchAllRecords } from './sync-pull-helpers';
import type { SyncEntityType } from './sync-constants';

export interface EntityRepairReport {
  entity: SyncEntityType;
  localCount: number;
  healthy: number;
  mappingRebuilt: number;
  pushedCreated: number;
  orphanMappingDropped: number;
  failed: number;
  errors: string[];
}

/** 库存变动表关联字段存量回填结果 */
export interface StockFlowLinkRepairReport {
  checked: number;
  filledOrderLink: number;
  filledShipmentLink: number;
  unresolvable: number;
  errors: string[];
}

export interface SyncRepairResult {
  entities: EntityRepairReport[];
  stockFlowLinks: StockFlowLinkRepairReport | null;
  pull: SyncPullResult | null;
  errors: string[];
}

/** 历史快递模式状态 → 上门安装模式状态映射（幂等，已迁移的记录不再命中） */
const LEGACY_STATUS_MAP: Record<string, string> = {
  待发货: '待出库',
  已发货: '运输中',
  已签收: '已完成',
  已退回: '已完成',
};

/**
 * 数据一致性修复：应用库 ↔ 多维表格全量对账。
 * - 映射指向已删除的 Base 记录 → 丢弃孤儿映射
 * - 本地有记录、Base 有同编号记录但缺映射 → 按业务编号重建映射
 * - 本地有记录、Base 无对应记录 → 推送创建
 * 修复推送完成后执行一次全量拉取，收敛 Base→应用方向。
 */
@Injectable()
export class SyncRepairService {
  private readonly logger = new Logger(SyncRepairService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    private readonly bitableClient: BitableClient,
    private readonly mappingService: SyncMappingService,
    private readonly pushService: SyncPushService,
    private readonly pullService: SyncPullService,
  ) {}

  async repairAll(): Promise<SyncRepairResult> {
    const entities: EntityRepairReport[] = [];
    const errors: string[] = [];
    for (const task of [
      () => this.repairFollowUps(),
      () => this.repairShipments(),
      () => this.repairShipmentItems(),
      () => this.repairCustomerCrm(),
    ]) {
      try {
        entities.push(await task());
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'unknown';
        errors.push(message);
        this.logger.error(`repair task failed: ${message}`);
      }
    }

    let stockFlowLinks: StockFlowLinkRepairReport | null = null;
    try {
      stockFlowLinks = await this.repairStockFlowLinks();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown';
      errors.push(`stockFlowLinks failed: ${message}`);
      this.logger.error(`repair stock flow links failed: ${message}`);
    }

    let pull: SyncPullResult | null = null;
    try {
      pull = await this.pullService.pullAll();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown';
      errors.push(`pullAll failed: ${message}`);
      this.logger.error(`repair pullAll failed: ${message}`);
    }

    this.logger.log(
      `repair done: ${JSON.stringify({ entities, stockFlowLinks, errors })}`,
    );
    return { entities, stockFlowLinks, pull, errors };
  }

  private async repairFollowUps(): Promise<EntityRepairReport> {
    const rows: Array<{ id: string; no: string | null }> = await this.db
      .select({ id: followUp.id, no: followUp.followNo })
      .from(followUp);
    return this.reconcileEntity({
      entity: 'follow_up',
      instanceId: CAPABILITY_INSTANCE_IDS.syncFollowUp,
      baseTableId: SYNC_BASE_TABLE_IDS.followUp,
      localRows: rows,
      noField: '跟进编号',
      push: (localId: string): Promise<boolean> =>
        this.pushService.pushFollowUp(localId),
    });
  }

  private async repairShipments(): Promise<EntityRepairReport> {
    const rows: Array<{ id: string; no: string | null }> = await this.db
      .select({ id: shipment.id, no: shipment.shipNo })
      .from(shipment);
    return this.reconcileEntity({
      entity: 'shipment',
      instanceId: CAPABILITY_INSTANCE_IDS.syncShipment,
      baseTableId: SYNC_BASE_TABLE_IDS.shipment,
      localRows: rows,
      noField: '发货单号',
      push: (localId: string): Promise<boolean> =>
        this.pushService.pushShipment(localId),
    });
  }

  private async repairShipmentItems(): Promise<EntityRepairReport> {
    const rows: Array<{
      id: string;
      no: string | null;
      shipmentId: string;
    }> = await this.db
      .select({
        id: shipmentItem.id,
        no: shipmentItem.detailNo,
        shipmentId: shipmentItem.shipmentId,
      })
      .from(shipmentItem);
    const parentByItem = new Map<string, string>(
      rows.map(
        (row: { id: string; shipmentId: string }): [string, string] => [
          row.id,
          row.shipmentId,
        ],
      ),
    );
    const pushedParents = new Set<string>();
    return this.reconcileEntity({
      entity: 'shipment_item',
      instanceId: CAPABILITY_INSTANCE_IDS.syncShipmentItem,
      baseTableId: SYNC_BASE_TABLE_IDS.shipmentItem,
      localRows: rows,
      noField: '明细编号',
      // 明细随发货单整体推送：重推父发货单即幂等补齐全部明细
      push: async (localId: string): Promise<boolean> => {
        const parentId: string | undefined = parentByItem.get(localId);
        if (!parentId) return false;
        if (pushedParents.has(parentId)) return true;
        const ok: boolean = await this.pushService.pushShipment(parentId);
        if (ok) pushedParents.add(parentId);
        return ok;
      },
    });
  }

  private async repairCustomerCrm(): Promise<EntityRepairReport> {
    const rows: Array<{ id: string }> = await this.db
      .select({ id: customerCrm.customerId })
      .from(customerCrm);
    return this.reconcileEntity({
      entity: 'customer_crm',
      instanceId: CAPABILITY_INSTANCE_IDS.syncCustomer,
      baseTableId: SYNC_BASE_TABLE_IDS.customer,
      // 客户表记录 id 即客户 id，无编号字段，按记录 id 匹配
      localRows: rows.map(
        (row: { id: string }): { id: string; no: string | null } => ({
          id: row.id,
          no: null,
        }),
      ),
      noField: null,
      push: (localId: string): Promise<boolean> =>
        this.pushService.pushCustomerCrm(localId),
    });
  }

  /**
   * 库存变动表关联字段修复：关联订单/关联发货单为空、或链接指向已删除的
   * 幽灵记录时，从备注解析订单号（JSD…）/发货单号（FHD…），
   * 解析出当前有效的 Base 记录 id 后回写链接字段。
   * 发货单号 Lookup 为公式字段，关联发货单写入后自动填充。
   */
  private async repairStockFlowLinks(): Promise<StockFlowLinkRepairReport> {
    const report: StockFlowLinkRepairReport = {
      checked: 0,
      filledOrderLink: 0,
      filledShipmentLink: 0,
      unresolvable: 0,
      errors: [],
    };

    const flowRecords = await searchAllRecords(
      this.bitableClient,
      CAPABILITY_INSTANCE_IDS.stockChangeLink,
    );
    const orderRecords = await searchAllRecords(
      this.bitableClient,
      CAPABILITY_INSTANCE_IDS.order,
    );
    const orderByNo = new Map<string, string>();
    for (const item of orderRecords) {
      const no: string = readTextField(item.record['订单号']);
      if (no && !orderByNo.has(no)) orderByNo.set(no, item.id);
    }

    const updates: Array<{ id: string; record: Record<string, unknown> }> = [];
    for (const item of flowRecords) {
      report.checked += 1;
      const remark: string = readTextField(item.record['备注']);
      const orderNo: string | undefined = remark.match(/JSD\d+/)?.[0];
      const shipNo: string | undefined = remark.match(/FHD\d+/)?.[0];
      if (!orderNo && !shipNo) continue;

      const curOrderIds: string[] = readLinkIds(item.record['关联订单']);
      const curShipIds: string[] = readLinkIds(item.record['关联发货单']);
      const desiredOrderId: string | undefined = orderNo
        ? orderByNo.get(orderNo)
        : undefined;
      const desiredShipId: string | undefined = shipNo
        ? await this.findShipmentBaseId(shipNo)
        : undefined;

      // 链接为空、或指向已被删除的幽灵记录时都需要重写
      const needOrder: boolean =
        !!desiredOrderId &&
        (curOrderIds.length !== 1 || curOrderIds[0] !== desiredOrderId);
      const needShip: boolean =
        !!desiredShipId &&
        (curShipIds.length !== 1 || curShipIds[0] !== desiredShipId);

      if (!needOrder && !needShip) {
        const orderMissing: boolean =
          !!orderNo && !desiredOrderId && curOrderIds.length === 0;
        const shipMissing: boolean =
          !!shipNo && !desiredShipId && curShipIds.length === 0;
        if (orderMissing || shipMissing) report.unresolvable += 1;
        continue;
      }

      const record: Record<string, unknown> = {};
      if (needOrder) {
        record['关联订单'] = [desiredOrderId];
        report.filledOrderLink += 1;
      }
      if (needShip) {
        record['关联发货单'] = [desiredShipId];
        report.filledShipmentLink += 1;
      }
      updates.push({ id: item.id, record });
    }

    for (let i = 0; i < updates.length; i += 100) {
      await this.bitableClient.batchUpdateRecords(
        CAPABILITY_INSTANCE_IDS.stockChangeLink,
        updates.slice(i, i + 100),
      );
    }
    return report;
  }

  /** 发货单号 → 本地发货单 → 同步映射 → Base record_id */
  private async findShipmentBaseId(shipNo: string): Promise<string | undefined> {
    const rows: Array<{ id: string }> = await this.db
      .select({ id: shipment.id })
      .from(shipment)
      .where(eq(shipment.shipNo, shipNo));
    const local: { id: string } | undefined = rows[0];
    if (!local) return undefined;
    const mapping = await this.mappingService.getByLocal('shipment', local.id);
    return mapping?.baseRecordId;
  }

  private async reconcileEntity(opts: {
    entity: SyncEntityType;
    instanceId: string;
    baseTableId: string;
    localRows: Array<{ id: string; no: string | null }>;
    noField: string | null;
    push: (localId: string) => Promise<boolean>;
  }): Promise<EntityRepairReport> {
    const report: EntityRepairReport = {
      entity: opts.entity,
      localCount: opts.localRows.length,
      healthy: 0,
      mappingRebuilt: 0,
      pushedCreated: 0,
      orphanMappingDropped: 0,
      failed: 0,
      errors: [],
    };

    let baseIds = new Set<string>();
    const noToRecordId = new Map<string, string>();
    try {
      const baseRecords = await searchAllRecords(
        this.bitableClient,
        opts.instanceId,
      );
      baseIds = new Set(baseRecords.map((item): string => item.id));
      if (opts.noField) {
        for (const item of baseRecords) {
          const no: string = readTextField(item.record[opts.noField]);
          if (no && !noToRecordId.has(no)) noToRecordId.set(no, item.id);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown';
      report.errors.push(`Base table read failed: ${message}`);
      report.failed = report.localCount;
      return report;
    }

    for (const row of opts.localRows) {
      const mapping = await this.mappingService.getByLocal(
        opts.entity,
        row.id,
      );
      if (mapping) {
        if (baseIds.has(mapping.baseRecordId)) {
          report.healthy += 1;
          continue;
        }
        await this.mappingService.remove(opts.entity, row.id);
        report.orphanMappingDropped += 1;
      }

      let matchedRecordId: string | undefined;
      if (opts.noField) {
        matchedRecordId = row.no ? noToRecordId.get(row.no) : undefined;
      } else if (baseIds.has(row.id)) {
        matchedRecordId = row.id;
      }
      if (matchedRecordId) {
        await this.mappingService.upsert(
          opts.entity,
          row.id,
          opts.baseTableId,
          matchedRecordId,
        );
        report.mappingRebuilt += 1;
        continue;
      }

      const ok: boolean = await opts.push(row.id);
      if (ok) {
        report.pushedCreated += 1;
      } else {
        report.failed += 1;
        report.errors.push(`${opts.entity} ${row.id} push failed`);
      }
    }
    return report;
  }

  /**
   * 历史状态迁移（一次性，幂等）：
   * 订单表与发货单表中的旧快递状态批量更新为新安装状态，
   * 已退回订单/发货单归入已完成。
   */
  async migrateLegacyStatuses(): Promise<{ orders: number; shipments: number }> {
    let orderCount = 0;
    let shipmentCount = 0;

    const orders = await searchAllRecords(
      this.bitableClient,
      CAPABILITY_INSTANCE_IDS.order,
    );
    const orderUpdates = orders
      .filter((item) => {
        const status = readTextField(item.record['订单状态']);
        return status in LEGACY_STATUS_MAP;
      })
      .map((item) => ({
        id: item.id,
        record: {
          订单状态: LEGACY_STATUS_MAP[readTextField(item.record['订单状态'])],
        },
      }));
    if (orderUpdates.length > 0) {
      await this.bitableClient.batchUpdateRecords(
        CAPABILITY_INSTANCE_IDS.order,
        orderUpdates,
      );
      orderCount = orderUpdates.length;
    }

    const baseShipments = await searchAllRecords(
      this.bitableClient,
      CAPABILITY_INSTANCE_IDS.syncShipment,
    );
    const shipmentUpdates = baseShipments
      .filter((item) => {
        const status = readTextField(item.record['发货状态']);
        return status in LEGACY_STATUS_MAP;
      })
      .map((item) => ({
        id: item.id,
        record: {
          发货状态: LEGACY_STATUS_MAP[readTextField(item.record['发货状态'])],
        },
      }));
    if (shipmentUpdates.length > 0) {
      await this.bitableClient.batchUpdateRecords(
        CAPABILITY_INSTANCE_IDS.syncShipment,
        shipmentUpdates,
      );
      shipmentCount = shipmentUpdates.length;
    }

    this.logger.log(
      `legacy status migrated: orders=${orderCount} shipments=${shipmentCount}`,
    );
    return { orders: orderCount, shipments: shipmentCount };
  }
}
