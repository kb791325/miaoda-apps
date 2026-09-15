import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  and,
  asc,
  count,
  desc,
  eq,
  inArray,
  like,
  or,
  type SQL,
} from 'drizzle-orm';
import {
  AuthNPaasService,
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from '@lark-apaas/fullstack-nestjs-core';
import { appUser, shipment, shipmentItem } from '@server/database/schema';
import { generateDetailNos } from '@server/common/utils/business-no';
import {
  BitableClient,
  readFormulaNumber,
  readFormulaText,
  readLinkIds,
  readTextField,
} from '@server/common/utils/bitable-client';
import { CAPABILITY_INSTANCE_IDS } from '@server/common/constants/capability-instance-ids';
import { SyncPushService } from '@server/modules/bitable-sync/sync-push.service';
import { SyncMappingService } from '@server/modules/bitable-sync/sync-mapping.service';
import { OpLogService } from '@server/modules/op-log/op-log.service';
import {
  ProductService,
} from '@server/modules/product/product.service';
import { OrderFeeService } from '@server/modules/fee/order-fee.service';
import type { OperatorContext } from '@server/modules/auth/auth.types';
import type { Order, OrderStatus } from '@shared/order';
import type {
  Shipment,
  ShipmentDetail,
  ShipmentItem,
  ShipmentListItem,
  ShipmentListParams,
  ShipmentListResponse,
  ShipmentMutationResponse,
  ShipmentStatus,
  ShipmentStockStatus,
  UpdateShipmentInfoRequest,
  UpdateShipmentStatusRequest,
} from '@shared/shipment';

type ShipmentRow = typeof shipment.$inferSelect;
type ShipmentInsert = typeof shipment.$inferInsert;
type ShipmentItemRow = typeof shipmentItem.$inferSelect;

/** 关联字段（客户/商品）可读写的订单表实例，与 v2 指向同一张表 */
const ORDER_LINK_INSTANCE = 'bitable_order_1';

/** 状态机：待出库 → 运输中（确认出库）→ 在安装（开始安装）→ 已完成（确认完成） */
const ALLOWED_TRANSITIONS: Record<ShipmentStatus, ShipmentStatus[]> = {
  待出库: ['运输中'],
  运输中: ['在安装'],
  在安装: ['已完成'],
  已完成: [],
};

/** 进行中（未完成）的配送单状态，用于订单侧防护与幂等判断 */
const ACTIVE_STATUSES: ShipmentStatus[] = ['待出库', '运输中', '在安装'];

/** 客户档案（姓名/收货地址/联系电话） */
interface CustomerInfo {
  name: string;
  address: string;
  phone: string;
}

/** Drizzle 可能把原始 PostgreSQL error 放在 cause 链里，逐层提取 SQLSTATE */
function extractPostgresErrorCode(error: unknown): string | undefined {
  let current: unknown = error;
  for (
    let depth = 0;
    depth < 4 && current && typeof current === 'object';
    depth += 1
  ) {
    const { code, cause } = current as { code?: unknown; cause?: unknown };
    if (typeof code === 'string') return code;
    current = cause;
  }
  return undefined;
}

@Injectable()
export class ShipmentService {
  private readonly logger = new Logger(ShipmentService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    private readonly bitableClient: BitableClient,
    private readonly productService: ProductService,
    private readonly authn: AuthNPaasService,
    private readonly syncPush: SyncPushService,
    private readonly syncMapping: SyncMappingService,
    private readonly orderFeeService: OrderFeeService,
    private readonly opLogService: OpLogService,
  ) {}

  /**
   * 配送安装单列表：关键词（单号/客户/订单号）+ 状态过滤，
   * 明细计数批量查询后内存分组，人员姓名批量翻译，禁止 N+1。
   */
  async list(
    params: ShipmentListParams,
    operator?: OperatorContext,
  ): Promise<ShipmentListResponse> {
    const page = Math.max(Math.floor(params.page ?? 1) || 1, 1);
    const pageSize = Math.min(
      Math.max(Math.floor(params.pageSize ?? 10) || 10, 1),
      100,
    );

    const allowedStatuses: ShipmentStatus[] | undefined =
      this.allowedStatusesForRole(operator);
    if (params.status && allowedStatuses && !allowedStatuses.includes(params.status)) {
      return { items: [], total: 0, page, pageSize };
    }

    const conditions: SQL[] = [];
    const keyword = params.keyword?.trim();
    if (keyword) {
      const keywordCondition = or(
        like(shipment.shipNo, `%${keyword}%`),
        like(shipment.customerName, `%${keyword}%`),
        like(shipment.orderNo, `%${keyword}%`),
      );
      if (keywordCondition) conditions.push(keywordCondition);
    }
    if (params.status) {
      conditions.push(eq(shipment.shipStatus, params.status));
    } else if (allowedStatuses) {
      conditions.push(inArray(shipment.shipStatus, allowedStatuses));
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const countResult: Array<{ count: number }> = await this.db
      .select({ count: count() })
      .from(shipment)
      .where(where);
    const total: number = Number(countResult[0]?.count ?? 0);

    const rows: ShipmentRow[] =
      total === 0
        ? []
        : await this.db
            .select()
            .from(shipment)
            .where(where)
            .orderBy(desc(shipment.createdAt))
            .offset((page - 1) * pageSize)
            .limit(pageSize);

    const rowIds: string[] = rows.map((row: ShipmentRow): string => row.id);
    const itemRows: ShipmentItemRow[] =
      rowIds.length > 0
        ? await this.db
            .select()
            .from(shipmentItem)
            .where(inArray(shipmentItem.shipmentId, rowIds))
        : [];
    const itemsByShipment = new Map<string, ShipmentItemRow[]>();
    for (const item of itemRows) {
      itemsByShipment.set(item.shipmentId, [
        ...(itemsByShipment.get(item.shipmentId) ?? []),
        item,
      ]);
    }

    const userNameById = await this.loadUserNames(rows);

    const items: ShipmentListItem[] = rows.map(
      (row: ShipmentRow): ShipmentListItem => {
        const group: ShipmentItemRow[] = itemsByShipment.get(row.id) ?? [];
        return {
          ...this.toShipment(row, userNameById),
          itemCount: group.length,
          matchedCount: group.filter(
            (item: ShipmentItemRow): boolean => item.modelMatch,
          ).length,
        };
      },
    );

    return { items, total, page, pageSize };
  }

  /** 配送安装单详情：主单 + 明细（按创建顺序）+ 订单实时快照 */
  async getDetail(
    id: string,
    operator?: OperatorContext,
  ): Promise<ShipmentDetail> {
    const rows: ShipmentRow[] = await this.db
      .select()
      .from(shipment)
      .where(eq(shipment.id, id));
    const row = rows[0];
    if (!row) {
      throw new NotFoundException('配送安装单不存在');
    }
    const allowedStatuses: ShipmentStatus[] | undefined =
      this.allowedStatusesForRole(operator);
    if (allowedStatuses && !allowedStatuses.includes(row.shipStatus as ShipmentStatus)) {
      throw new ForbiddenException('该配送单不在您的可见范围内');
    }

    const itemRows: ShipmentItemRow[] = await this.db
      .select()
      .from(shipmentItem)
      .where(eq(shipmentItem.shipmentId, id))
      .orderBy(asc(shipmentItem.createdAt));

    const userNameById = await this.loadUserNames([row]);

    let order: Order | undefined;
    try {
      const detail = await this.bitableClient.getRecord(
        ORDER_LINK_INSTANCE,
        row.orderId,
      );
      if (detail.record && Object.keys(detail.record).length > 0) {
        const customerNameById = await this.loadCustomerNames();
        order = this.mapOrderRecord(detail.id, detail.record, customerNameById);
      }
    } catch (error) {
      this.logger.warn(
        `order snapshot unavailable for order ${row.orderId}: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }

    return {
      shipment: this.toShipment(row, userNameById),
      items: itemRows.map(
        (item: ShipmentItemRow): ShipmentItem => this.toItemRecord(item),
      ),
      order,
    };
  }

  /**
   * 订单创建后自动生成配送安装单（待出库）：
   * 明细取订单商品本身（实际=需求，型号天然一致），
   * 安装联系人/电话/地址默认带出客户档案，可后续修改。
   */
  async createFromOrder(
    orderId: string,
    userId?: string,
  ): Promise<{ id: string }> {
    const orderDetail = await this.bitableClient.getRecord(
      ORDER_LINK_INSTANCE,
      orderId,
    );
    if (!orderDetail.record || Object.keys(orderDetail.record).length === 0) {
      throw new BadRequestException('订单不存在');
    }
    const r: Record<string, unknown> = orderDetail.record;
    const orderStatus = typeof r['订单状态'] === 'string' ? r['订单状态'] : '';
    if (orderStatus !== '待出库') {
      throw new BadRequestException('仅待出库状态的订单可生成配送安装单');
    }

    const existing = await this.db
      .select({ id: shipment.id })
      .from(shipment)
      .where(
        and(
          eq(shipment.orderId, orderId),
          inArray(shipment.shipStatus, ACTIVE_STATUSES),
        ),
      );
    if (existing.length > 0) {
      throw new ConflictException('该订单已存在进行中的配送安装单');
    }

    const orderNo = readTextField(r['订单号']);
    const quantity = typeof r['数量'] === 'number' ? r['数量'] : 1;
    const customerId = readLinkIds(r['客户'])[0] ?? '';
    const productId = readLinkIds(r['商品'])[0] ?? '';
    const orderAddress = readTextField(r['收货地址']);

    const customer = await this.loadCustomerInfo(customerId);
    const productRecord = await this.bitableClient.getRecord(
      CAPABILITY_INSTANCE_IDS.product,
      productId,
    );
    const productFields: Record<string, unknown> = productRecord.record ?? {};
    const productName = readFormulaText(productFields['商品名称'])
      || readTextField(productFields['商品名称']);
    const sku = readTextField(productFields['SKU编码']);

    let createdId = '';
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const shipNo = this.generateShipNo();
      const detailNos: string[] = await generateDetailNos(this.db, 1);
      try {
        const inserted: ShipmentRow[] = await this.db.transaction(
          async (tx): Promise<ShipmentRow[]> => {
            const shipRows: ShipmentRow[] = await tx
              .insert(shipment)
              .values({
                shipNo,
                orderId,
                orderNo,
                customerName: customer.name,
                shipStatus: '待出库',
                hasModelDiff: false,
                stockStatus: 'none',
                remark: '',
                installAddress: orderAddress || customer.address,
                installContact: customer.name,
                installPhone: customer.phone,
                createdBy: userId ?? undefined,
              } satisfies ShipmentInsert)
              .returning();
            const shipRow = shipRows[0];
            await tx.insert(shipmentItem).values({
              shipmentId: shipRow.id,
              detailNo: detailNos[0] ?? '',
              orderItemId: orderId,
              requiredProductId: productId,
              requiredProductName: productName,
              requiredModel: sku,
              requiredQuantity: quantity,
              actualProductId: productId,
              actualProductName: productName,
              actualModel: sku,
              shipQuantity: quantity,
              modelMatch: true,
            });
            return shipRows;
          },
        );
        createdId = inserted[0]?.id ?? '';
        break;
      } catch (error) {
        if (extractPostgresErrorCode(error) === '23505' && attempt < 2) {
          this.logger.warn(`shipNo ${shipNo} conflict, retrying`);
          continue;
        }
        throw error;
      }
    }
    if (!createdId) {
      throw new ConflictException('配送单号生成失败，请重试');
    }

    this.logger.log(`shipment ${createdId} auto-created from order ${orderId}`);
    await this.syncPush.pushShipment(createdId);
    return { id: createdId };
  }

  /**
   * 订单编辑后同步待出库配送单：明细商品/数量与安装联系信息跟随订单更新。
   * 已出库的配送单不受影响。
   */
  async syncFromOrder(
    orderId: string,
    dto: {
      customerId: string;
      productId: string;
      quantity: number;
      address?: string;
    },
  ): Promise<void> {
    const rows: ShipmentRow[] = await this.db
      .select()
      .from(shipment)
      .where(
        and(eq(shipment.orderId, orderId), eq(shipment.shipStatus, '待出库')),
      );
    const row = rows[0];
    if (!row) return;

    const customer = await this.loadCustomerInfo(dto.customerId);
    const productRecord = await this.bitableClient.getRecord(
      CAPABILITY_INSTANCE_IDS.product,
      dto.productId,
    );
    const productFields: Record<string, unknown> = productRecord.record ?? {};
    const productName = readFormulaText(productFields['商品名称'])
      || readTextField(productFields['商品名称']);
    const sku = readTextField(productFields['SKU编码']);

    await this.db
      .update(shipmentItem)
      .set({
        requiredProductId: dto.productId,
        requiredProductName: productName,
        requiredModel: sku,
        requiredQuantity: dto.quantity,
        actualProductId: dto.productId,
        actualProductName: productName,
        actualModel: sku,
        shipQuantity: dto.quantity,
        modelMatch: true,
        updatedAt: new Date(),
      })
      .where(eq(shipmentItem.shipmentId, row.id));

    await this.db
      .update(shipment)
      .set({
        customerName: customer.name,
        installAddress: (dto.address ?? '') || customer.address,
        installContact: customer.name,
        installPhone: customer.phone,
        hasModelDiff: false,
        updatedAt: new Date(),
      })
      .where(eq(shipment.id, row.id));

    await this.syncPush.pushShipment(row.id);
  }

  /** 修改配送信息（安装地址/联系人/电话/预约时间/安装人员/货车司机） */
  async updateInfo(
    id: string,
    dto: UpdateShipmentInfoRequest,
    userId: string,
  ): Promise<ShipmentMutationResponse> {
    const rows: ShipmentRow[] = await this.db
      .select()
      .from(shipment)
      .where(eq(shipment.id, id));
    if (rows.length === 0) {
      throw new NotFoundException('配送安装单不存在');
    }

    const patch: Partial<ShipmentInsert> = {
      updatedAt: new Date(),
      updatedBy: userId,
    };
    if (dto.installAddress !== undefined) {
      patch.installAddress = dto.installAddress.trim();
    }
    if (dto.installContact !== undefined) {
      patch.installContact = dto.installContact.trim();
    }
    if (dto.installPhone !== undefined) {
      patch.installPhone = dto.installPhone.trim();
    }
    if (dto.appointmentTime !== undefined) {
      patch.appointmentTime = dto.appointmentTime
        ? new Date(dto.appointmentTime)
        : null;
    }
    if (dto.installerId !== undefined) {
      patch.installerId = dto.installerId || null;
    }
    if (dto.truckDriver !== undefined) {
      patch.truckDriver = dto.truckDriver.trim() || null;
    }

    await this.db
      .update(shipment)
      .set(patch)
      .where(eq(shipment.id, id));
    await this.syncPush.pushShipment(id);
    return { success: true };
  }

  /**
   * 状态流转：待出库→运输中（确认出库：扣库存 + 订单运输中）
   * →在安装（开始安装）→已完成（确认安装完成：订单已完成 + 安装费用同步）。
   */
  async updateStatus(
    id: string,
    dto: UpdateShipmentStatusRequest,
    userId: string,
  ): Promise<ShipmentMutationResponse> {
    const rows: ShipmentRow[] = await this.db
      .select()
      .from(shipment)
      .where(eq(shipment.id, id));
    const row = rows[0];
    if (!row) {
      throw new NotFoundException('配送安装单不存在');
    }
    const current = row.shipStatus as ShipmentStatus;
    const target = dto.targetStatus;
    if (!ALLOWED_TRANSITIONS[current].includes(target)) {
      throw new BadRequestException(
        `配送安装单状态无法从「${current}」流转为「${target}」`,
      );
    }

    const items: ShipmentItemRow[] = await this.db
      .select()
      .from(shipmentItem)
      .where(eq(shipmentItem.shipmentId, id));

    const shipMapping = await this.syncMapping.getByLocal('shipment', id);
    const shipmentRecordId: string | undefined = shipMapping?.baseRecordId;

    const now = new Date();
    const patch: Partial<ShipmentInsert> = { updatedAt: now, updatedBy: userId };

    if (target === '运输中') {
      await this.deductStockForShipment(
        items,
        row.shipNo,
        row.orderNo,
        userId,
        shipmentRecordId,
      );
      await this.markOrderInTransit(
        row.orderId,
        row.orderNo,
        items,
        row.shipNo,
        userId,
      );
      patch.shipStatus = '运输中';
      patch.outboundTime = now;
      patch.shipper = userId;
      patch.stockStatus = 'deducted';
      if (dto.truckDriver !== undefined) {
        patch.truckDriver = dto.truckDriver.trim() || null;
      }
    } else if (target === '在安装') {
      patch.shipStatus = '在安装';
      patch.installStartTime = now;
      if (dto.installerId?.trim()) patch.installerId = dto.installerId.trim();
    } else if (target === '已完成') {
      if (dto.installFee !== undefined) {
        if (!Number.isFinite(dto.installFee) || dto.installFee < 0) {
          throw new BadRequestException('安装费用必须为非负数字');
        }
        patch.installFee = String(dto.installFee);
      }
      patch.shipStatus = '已完成';
      patch.installCompleteTime = now;
      if (dto.installerId?.trim()) patch.installerId = dto.installerId.trim();
      if (dto.installRemark !== undefined) {
        patch.installRemark = dto.installRemark.trim() || null;
      }
      if (dto.acceptancePhotos !== undefined) {
        patch.acceptancePhotos = dto.acceptancePhotos.filter(
          (url: string): boolean => typeof url === 'string' && url !== '',
        );
      }
    }

    const updated = await this.db
      .update(shipment)
      .set(patch)
      .where(eq(shipment.id, id))
      .returning({ id: shipment.id });
    if (updated.length === 0) {
      throw new NotFoundException('配送安装单不存在');
    }

    if (target === '在安装') {
      await this.syncOrderStatus(row.orderId, '在安装');
    }
    if (target === '已完成') {
      const extra: Record<string, unknown> = {};
      if (dto.installFee !== undefined) extra['安装费用'] = dto.installFee;
      await this.syncOrderStatus(row.orderId, '已完成', extra);
      if (dto.installFee !== undefined) {
        await this.syncInstallFeeToOrder(row.orderId, dto.installFee, userId);
      }
      // 订单完成时最终确认财务数据（覆盖无安装费的场景），失败仅告警不阻断
      await this.orderFeeService
        .recomputeOrderFinancials(row.orderId)
        .catch((error: unknown): void => {
          this.logger.warn(
            `recompute on complete failed for order ${row.orderId}: ${error instanceof Error ? error.message : 'unknown'}`,
          );
        });
    }

    if (target === '运输中') {
      const totalQty: number = items.reduce(
        (sum: number, item: ShipmentItemRow): number => sum + item.shipQuantity,
        0,
      );
      await this.opLogService.record({
        entityType: 'shipment',
        entityId: id,
        entityName: row.shipNo,
        action: '确认出库',
        detail: `订单 ${row.orderNo}，出库 ${totalQty} 件`,
        beforeValue: current,
        afterValue: target,
        operatorId: userId,
      });
    } else if (target === '已完成') {
      await this.opLogService.record({
        entityType: 'shipment',
        entityId: id,
        entityName: row.shipNo,
        action: '安装完成',
        detail: `订单 ${row.orderNo}`,
        beforeValue: current,
        afterValue: target,
        operatorId: userId,
      });
    }
    this.logger.log(`shipment ${row.shipNo} status: ${current} -> ${target}`);
    await this.syncPush.pushShipment(id);
    return { success: true };
  }

  /**
   * 取消配送安装单（已完成不可取消）：已出库则回补库存，
   * 删除 Base 侧同步记录与映射，订单状态回退为待出库。
   */
  async cancel(
    id: string,
    userId: string,
    options?: { skipOrderRevert?: boolean },
  ): Promise<ShipmentMutationResponse> {
    const rows: ShipmentRow[] = await this.db
      .select()
      .from(shipment)
      .where(eq(shipment.id, id));
    const row = rows[0];
    if (!row) {
      throw new NotFoundException('配送安装单不存在');
    }
    if (row.shipStatus === '已完成') {
      throw new BadRequestException('已完成的配送安装单不可取消');
    }

    const items: ShipmentItemRow[] = await this.db
      .select()
      .from(shipmentItem)
      .where(eq(shipmentItem.shipmentId, id));
    const shipMapping = await this.syncMapping.getByLocal('shipment', id);

    if (row.stockStatus === 'deducted') {
      await this.restoreStockForShipment(
        items,
        row.shipNo,
        row.orderNo,
        userId,
        shipMapping?.baseRecordId,
      );
    }

    await this.removeBaseRecords(id, items, shipMapping?.baseRecordId);
    await this.db.delete(shipment).where(eq(shipment.id, id));

    if (!options?.skipOrderRevert) {
      await this.revertOrderToOutboundPending(row.orderId);
    }

    await this.opLogService.record({
      entityType: 'shipment',
      entityId: id,
      entityName: row.shipNo,
      action: '取消配送单',
      detail:
        row.stockStatus === 'deducted'
          ? `订单 ${row.orderNo}，已回补库存`
          : `订单 ${row.orderNo}`,
      beforeValue: row.shipStatus,
      afterValue: '已取消',
      operatorId: userId,
    });
    this.logger.log(`shipment ${row.shipNo} cancelled by ${userId}`);
    return { success: true };
  }

  /** 逐明细扣减库存；任一行失败时逐行回补已扣减的行 */
  private async deductStockForShipment(
    items: ShipmentItemRow[],
    shipNo: string,
    orderNo: string,
    userId: string,
    shipmentRecordId?: string,
  ): Promise<void> {
    const deducted: ShipmentItemRow[] = [];
    try {
      for (const item of items) {
        await this.productService.applyStockChange(
          item.actualProductId,
          -1,
          item.shipQuantity,
          '发货出库',
          `配送单 ${shipNo} 出库`,
          { operator: userId, shipmentNo: shipNo, orderNo, shipmentRecordId },
        );
        deducted.push(item);
      }
    } catch (error) {
      for (const item of deducted) {
        await this.productService.applyStockChange(
          item.actualProductId,
          1,
          item.shipQuantity,
          '发货退回',
          `配送单 ${shipNo} 出库失败回滚`,
          { operator: userId, shipmentNo: shipNo, orderNo },
        );
      }
      this.logger.warn(
        `stock deduction failed for ${shipNo}, rolled back ${deducted.length} item(s)`,
      );
      throw error;
    }
  }

  /** 确认出库后订单置为运输中并写出库时间；失败时补偿回库存 */
  private async markOrderInTransit(
    orderId: string,
    orderNo: string,
    items: ShipmentItemRow[],
    shipNo: string,
    userId: string,
  ): Promise<void> {
    try {
      await this.bitableClient.batchUpdateRecords(
        CAPABILITY_INSTANCE_IDS.order,
        [
          {
            id: orderId,
            record: { 订单状态: '运输中', 发货时间: Date.now() },
          },
        ],
      );
    } catch (error) {
      for (const item of items) {
        await this.productService.applyStockChange(
          item.actualProductId,
          1,
          item.shipQuantity,
          '发货退回',
          `配送单 ${shipNo} 出库失败回滚`,
          { operator: userId, shipmentNo: shipNo, orderNo },
        );
      }
      this.logger.warn(
        `bitable order update failed for ${shipNo}, stock restored`,
      );
      throw error;
    }
  }

  /** 同步订单状态（在安装/已完成）；失败仅告警不阻断主流程 */
  private async syncOrderStatus(
    orderId: string,
    status: '在安装' | '已完成',
    extra?: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.bitableClient.batchUpdateRecords(CAPABILITY_INSTANCE_IDS.order, [
        { id: orderId, record: { 订单状态: status, ...extra } },
      ]);
    } catch (error) {
      this.logger.warn(
        `sync order ${orderId} status to ${status} failed: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
  }

  /** 安装费用同步到订单费用明细（安装费类型，已有则更新金额）；失败仅告警不阻断 */
  private async syncInstallFeeToOrder(
    orderId: string,
    amount: number,
    userId: string,
  ): Promise<void> {
    try {
      await this.orderFeeService.syncInstallFee(orderId, amount, userId);
    } catch (error) {
      this.logger.warn(
        `sync install fee to order ${orderId} failed: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
  }

  /** 取消配送后订单回退待出库（订单当前为运输中/在安装时才回退） */
  private async revertOrderToOutboundPending(orderId: string): Promise<void> {
    let currentStatus = '';
    try {
      const detail = await this.bitableClient.getRecord(
        ORDER_LINK_INSTANCE,
        orderId,
      );
      if (detail.record && Object.keys(detail.record).length > 0) {
        const raw = detail.record['订单状态'];
        currentStatus = typeof raw === 'string' ? raw : '';
      }
    } catch (error) {
      this.logger.warn(
        `read order ${orderId} failed when cancelling shipment: ${error instanceof Error ? error.message : 'unknown'}`,
      );
      return;
    }
    if (currentStatus === '运输中' || currentStatus === '在安装') {
      try {
        await this.bitableClient.batchUpdateRecords(
          CAPABILITY_INSTANCE_IDS.order,
          [{ id: orderId, record: { 订单状态: '待出库' } }],
        );
      } catch (error) {
        this.logger.warn(
          `order ${orderId} revert to 待出库 failed: ${error instanceof Error ? error.message : 'unknown'}`,
        );
      }
    }
  }

  /** 逐明细回补库存；任一行失败时把已回补的行重新扣回 */
  private async restoreStockForShipment(
    items: ShipmentItemRow[],
    shipNo: string,
    orderNo: string,
    userId: string,
    shipmentRecordId?: string,
  ): Promise<void> {
    const restored: ShipmentItemRow[] = [];
    try {
      for (const item of items) {
        await this.productService.applyStockChange(
          item.actualProductId,
          1,
          item.shipQuantity,
          '发货退回',
          `配送单 ${shipNo} 取消回补`,
          { operator: userId, shipmentNo: shipNo, orderNo, shipmentRecordId },
        );
        restored.push(item);
      }
    } catch (error) {
      for (const item of restored) {
        await this.productService.applyStockChange(
          item.actualProductId,
          -1,
          item.shipQuantity,
          '发货出库',
          `配送单 ${shipNo} 取消回补失败回滚`,
          { operator: userId, shipmentNo: shipNo, orderNo },
        );
      }
      this.logger.warn(
        `stock restore failed for ${shipNo}, rolled back ${restored.length} item(s)`,
      );
      throw error;
    }
  }

  /** 删除 Base 侧发货单/明细同步记录与本地映射（尽力而为） */
  private async removeBaseRecords(
    shipmentId: string,
    items: ShipmentItemRow[],
    baseShipmentRecordId?: string,
  ): Promise<void> {
    if (baseShipmentRecordId) {
      try {
        await this.bitableClient.deleteRecords(
          CAPABILITY_INSTANCE_IDS.syncShipment,
          [baseShipmentRecordId],
        );
      } catch (error) {
        this.logger.warn(
          `delete base shipment record ${baseShipmentRecordId} failed: ${error instanceof Error ? error.message : 'unknown'}`,
        );
      }
    }
    await this.syncMapping.remove('shipment', shipmentId);

    for (const item of items) {
      const itemMapping = await this.syncMapping.getByLocal(
        'shipment_item',
        item.id,
      );
      if (!itemMapping) continue;
      try {
        await this.bitableClient.deleteRecords(
          CAPABILITY_INSTANCE_IDS.syncShipmentItem,
          [itemMapping.baseRecordId],
        );
      } catch (error) {
        this.logger.warn(
          `delete base shipment_item record ${itemMapping.baseRecordId} failed: ${error instanceof Error ? error.message : 'unknown'}`,
        );
      }
      await this.syncMapping.remove('shipment_item', item.id);
    }
  }

  /** 批量翻译人员姓名（发货人 + 安装人），拿不到的回退空串 */
  private async loadUserNames(rows: ShipmentRow[]): Promise<Map<string, string>> {
    const userIds: string[] = Array.from(
      new Set(
        rows
          .flatMap((row: ShipmentRow): string[] => [
            row.shipper ?? '',
            row.installerId ?? '',
          ])
          .filter((uid: string): boolean => uid !== ''),
      ),
    );
    const nameById = new Map<string, string>();
    if (userIds.length === 0) {
      return nameById;
    }
    const users = await this.authn.listUsersByIds(userIds);
    userIds.forEach((uid: string, index: number) => {
      const user = users[index] ?? null;
      nameById.set(uid, user?.name?.zh_cn ?? user?.name?.en_us ?? '');
    });
    const missing: string[] = userIds.filter(
      (uid: string): boolean => !(nameById.get(uid) ?? ''),
    );
    if (missing.length > 0) {
      const appRows: Array<{ id: string; name: string }> = await this.db
        .select({ id: appUser.id, name: appUser.name })
        .from(appUser)
        .where(inArray(appUser.id, missing));
      for (const appRow of appRows) {
        nameById.set(appRow.id, appRow.name);
      }
    }
    return nameById;
  }

  /** 角色可见配送状态：仓库发货员仅待出库，安装人员仅运输中/在安装 */
  private allowedStatusesForRole(
    operator?: OperatorContext,
  ): ShipmentStatus[] | undefined {
    if (operator?.roleCode === 'warehouse') return ['待出库'];
    if (operator?.roleCode === 'installer') return ['运输中', '在安装'];
    return undefined;
  }

  /** 取客户档案（姓名/收货地址/联系电话）；读取失败降级为空不阻断 */
  private async loadCustomerInfo(customerId: string): Promise<CustomerInfo> {
    if (!customerId) return { name: '', address: '', phone: '' };
    try {
      const detail = await this.bitableClient.getRecord(
        CAPABILITY_INSTANCE_IDS.customer,
        customerId,
      );
      return {
        name: readTextField(detail.record['客户姓名']),
        address: readTextField(detail.record['收货地址']),
        phone: readTextField(detail.record['联系电话']),
      };
    } catch (error) {
      this.logger.warn(
        `customer info unavailable for ${customerId}: ${error instanceof Error ? error.message : 'unknown'}`,
      );
      return { name: '', address: '', phone: '' };
    }
  }

  /** 客户表全量拉取客户姓名（单表数据量小） */
  private async loadCustomerNames(): Promise<Map<string, string>> {
    const nameById = new Map<string, string>();
    const customers = await this.bitableClient.searchRecords(
      CAPABILITY_INSTANCE_IDS.customer,
      { pageSize: 500, fieldNames: ['客户姓名'] },
    );
    for (const c of customers.records) {
      nameById.set(c.id, readTextField(c.record['客户姓名']));
    }
    return nameById;
  }

  private toShipment(
    row: ShipmentRow,
    userNameById: Map<string, string>,
  ): Shipment {
    const shipperId: string = row.shipper ?? '';
    const installerId: string = row.installerId ?? '';
    return {
      id: row.id,
      shipNo: row.shipNo,
      orderId: row.orderId,
      orderNo: row.orderNo,
      customerName: row.customerName,
      shipStatus: row.shipStatus as ShipmentStatus,
      installAddress: row.installAddress,
      installContact: row.installContact ?? '',
      installPhone: row.installPhone ?? '',
      appointmentTime: row.appointmentTime
        ? row.appointmentTime.toISOString()
        : undefined,
      installerId,
      installerName: userNameById.get(installerId) ?? '',
      outboundTime: row.outboundTime ? row.outboundTime.toISOString() : undefined,
      shipperId,
      shipperName: userNameById.get(shipperId) ?? '',
      truckDriver: row.truckDriver ?? '',
      installStartTime: row.installStartTime
        ? row.installStartTime.toISOString()
        : undefined,
      installCompleteTime: row.installCompleteTime
        ? row.installCompleteTime.toISOString()
        : undefined,
      installFee: row.installFee != null ? Number(row.installFee) : undefined,
      installRemark: row.installRemark ?? '',
      acceptancePhotos: row.acceptancePhotos ?? [],
      hasModelDiff: row.hasModelDiff,
      stockStatus: row.stockStatus as ShipmentStockStatus,
      remark: row.remark,
      createdAt: row.createdAt.toISOString(),
    };
  }

  private toItemRecord(row: ShipmentItemRow): ShipmentItem {
    return {
      id: row.id,
      orderId: row.orderItemId,
      requiredProductId: row.requiredProductId,
      requiredProductName: row.requiredProductName,
      requiredModel: row.requiredModel,
      requiredQuantity: row.requiredQuantity,
      actualProductId: row.actualProductId,
      actualProductName: row.actualProductName,
      actualModel: row.actualModel,
      shipQuantity: row.shipQuantity,
      modelMatch: row.modelMatch,
    };
  }

  /** 多维表格订单记录 → shared Order（金额走 Formula，时间转 ISO） */
  private mapOrderRecord(
    id: string,
    r: Record<string, unknown>,
    customerNameById: Map<string, string>,
  ): Order {
    const customerId = readLinkIds(r['客户'])[0] ?? '';
    const orderTimeTs = typeof r['下单时间'] === 'number' ? r['下单时间'] : 0;
    return {
      id,
      orderNo: readTextField(r['订单号']),
      customerId,
      customerName: customerNameById.get(customerId) ?? '',
      productId: readLinkIds(r['商品'])[0] ?? '',
      productName: readFormulaText(r['商品名称']),
      quantity: typeof r['数量'] === 'number' ? r['数量'] : 0,
      amount: readFormulaNumber(r['订单金额']),
      unitPrice: readFormulaNumber(r['销售单价']),
      orderTime: orderTimeTs > 0 ? new Date(orderTimeTs).toISOString() : '',
      status: (typeof r['订单状态'] === 'string'
        ? r['订单状态']
        : '待出库') as OrderStatus,
      shipTime:
        typeof r['发货时间'] === 'number'
          ? new Date(r['发货时间']).toISOString()
          : undefined,
      payStatus: typeof r['支付状态'] === 'string' ? r['支付状态'] : '',
      expressNo: readTextField(r['快递单号']),
      remark: readTextField(r['备注']),
    };
  }

  /** 配送单号：FHD + yyyyMMdd + 4 位随机数字 */
  private generateShipNo(): string {
    const now = new Date();
    const datePart = [
      String(now.getFullYear()),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
    ].join('');
    const randPart = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
    return `FHD${datePart}${randPart}`;
  }
}
