import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from '@lark-apaas/fullstack-nestjs-core';
import { orderOwner, productProfile, shipment } from '@server/database/schema';
import {
  BitableClient,
  readFormulaNumber,
  readFormulaText,
  readLinkIds,
  readTextField,
  type BitableFilterCondition,
  type BitableRecordItem,
} from '@server/common/utils/bitable-client';
import { CAPABILITY_INSTANCE_IDS } from '@server/common/constants/capability-instance-ids';
import { ProductService } from '@server/modules/product/product.service';
import { ShipmentService } from '@server/modules/shipment/shipment.service';
import { OrderFeeService } from '@server/modules/fee/order-fee.service';
import { ReceivableService } from '@server/modules/finance-contract/receivable.service';
import { OpLogService } from '@server/modules/op-log/op-log.service';
import type { OperatorContext } from '@server/modules/auth/auth.types';
import type { ShipmentStatus } from '@shared/shipment';
import type {
  CreateOrderRequest,
  Order,
  OrderBatchResponse,
  OrderDetail,
  OrderListParams,
  OrderListResponse,
  OrderStatus,
} from '@shared/order';

const ORDER_FIELDS = [
  '订单号',
  '订单状态',
  '下单时间',
  '数量',
  '备注',
  '收货地址',
  '快递单号',
  '发货时间',
  '商品',
  '客户',
  '商品名称',
  '订单金额',
  '销售单价',
];

/** bitable_order_1 实例字段快照可读写客户/商品关联字段，但不含发货时间 */
const ORDER_LINK_FIELDS = ORDER_FIELDS.filter((f: string): boolean => f !== '发货时间');

/** 关联字段（客户/商品）可读写的订单表实例，与 v2 指向同一张表 */
const ORDER_LINK_INSTANCE = 'bitable_order_1';

/** 拉取订单的上限保护 */
const MAX_ORDER_PULL = 5000;

/** 历史订单状态 → 新状态体系映射（Base 存量数据读取时归一化） */
const LEGACY_STATUS_MAP: Record<string, OrderStatus> = {
  待发货: '待出库',
  已发货: '运输中',
  已签收: '已完成',
  已退回: '已完成',
};

/** 进行中的配送状态：阻断订单删除 */
const ACTIVE_SHIPMENT_STATUSES: ShipmentStatus[] = ['运输中', '在安装'];

interface RawOrder {
  id: string;
  orderNo: string;
  customerId: string;
  customerName: string;
  productId: string;
  productName: string;
  quantity: number;
  amount: number;
  unitPrice: number;
  orderTime: string;
  orderTimeTs: number;
  status: OrderStatus;
  shipTime?: string;
  payStatus: string;
  expressNo: string;
  remark: string;
  address: string;
}

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    private readonly bitableClient: BitableClient,
    private readonly productService: ProductService,
    private readonly shipmentService: ShipmentService,
    private readonly orderFeeService: OrderFeeService,
    private readonly receivableService: ReceivableService,
    private readonly opLogService: OpLogService,
  ) {}

  /**
   * 订单列表：多维表格侧按状态/客户/日期过滤并全量拉取（游标循环），
   * 关键词（订单号/客户名/商品名）内存模糊匹配后做偏移分页。
   */
  async list(
    params: OrderListParams,
    operator?: OperatorContext,
  ): Promise<OrderListResponse> {
    const conditions: BitableFilterCondition[] = [];
    if (params.status) {
      conditions.push({
        fieldName: '订单状态',
        operator: 'is',
        value: [params.status],
      });
    }
    if (params.customerId) {
      conditions.push({
        fieldName: '客户',
        operator: 'is',
        value: [params.customerId],
      });
    }
    if (params.dateStart) {
      conditions.push({
        fieldName: '下单时间',
        operator: 'isGreater',
        value: ['ExactDate', String(new Date(params.dateStart).getTime() - 1)],
      });
    }
    if (params.dateEnd) {
      const end = new Date(params.dateEnd);
      end.setDate(end.getDate() + 1);
      conditions.push({
        fieldName: '下单时间',
        operator: 'isLess',
        value: ['ExactDate', String(end.getTime())],
      });
    }

    const allRecords: BitableRecordItem[] = [];
    let pageToken: string | undefined;
    do {
      const output = await this.bitableClient.searchRecords(
        ORDER_LINK_INSTANCE,
        {
          pageSize: 500,
          pageToken,
          sort: [{ fieldName: '下单时间', desc: true }],
          fieldNames: ORDER_LINK_FIELDS,
          filter:
            conditions.length > 0
              ? { conjunction: 'and', conditions }
              : undefined,
        },
      );
      allRecords.push(...output.records);
      pageToken = output.hasMore ? output.pageToken : undefined;
    } while (pageToken && allRecords.length < MAX_ORDER_PULL);

    const customerNameById = await this.loadCustomerNames();
    const rawOrders = allRecords.map((item: BitableRecordItem) =>
      this.mapRawOrder(item, customerNameById),
    );

    let filtered = rawOrders;
    if (operator?.roleCode === 'sales') {
      const ownedIds: Set<string> = await this.ownedOrderIds(operator.userId);
      filtered = filtered.filter((o: RawOrder): boolean => ownedIds.has(o.id));
    }

    const keyword = params.keyword?.trim();
    if (keyword) {
      filtered = rawOrders.filter(
        (o: RawOrder): boolean =>
          o.orderNo.includes(keyword) ||
          o.customerName.includes(keyword) ||
          o.productName.includes(keyword),
      );
    }

    const pageSize = Math.min(
      Math.max(Math.floor(params.pageSize ?? 10) || 10, 1),
      500,
    );
    const total = filtered.length;
    const maxPage = Math.max(Math.ceil(total / pageSize), 1);
    const page = Math.min(Math.max(Math.floor(params.page ?? 1) || 1, 1), maxPage);
    const items = filtered.slice((page - 1) * pageSize, page * pageSize);

    const feeTotals: Map<string, number> =
      await this.orderFeeService.sumTotalsByOrderIds(
        items.map((o: RawOrder): string => o.id),
      );

    return {
      items: items.map((o: RawOrder): Order => ({
        ...this.toOrder(o),
        totalFee: feeTotals.get(o.id) ?? 0,
      })),
      total,
      page,
      pageSize,
    };
  }

  /** 订单详情：完整信息 + 该订单触发的库存变动流水 */
  async getDetail(
    id: string,
    operator?: OperatorContext,
  ): Promise<OrderDetail> {
    await this.assertOrderOwned(id, operator);
    const detail = await this.bitableClient.getRecord(ORDER_LINK_INSTANCE, id);
    if (!detail.record || Object.keys(detail.record).length === 0) {
      throw new NotFoundException('订单不存在');
    }
    const customerNameById = await this.loadCustomerNames();
    const raw = this.mapRawOrder(
      { id: detail.id, record: detail.record },
      customerNameById,
    );
    const v2Detail = await this.bitableClient
      .getRecord(CAPABILITY_INSTANCE_IDS.order, id)
      .catch(() => null);
    const shipTs = v2Detail?.record?.['发货时间'];
    if (typeof shipTs === 'number' && !raw.shipTime) {
      raw.shipTime = new Date(shipTs).toISOString();
    }

    const stockChanges = await this.productService.listStockChanges({
      productId: raw.productId,
      orderNo: raw.orderNo,
      pageSize: 100,
    });
    const fees = await this.orderFeeService.listByOrder(id);
    const feeTotals: Map<string, number> =
      await this.orderFeeService.sumTotalsByOrderIds([id]);

    return {
      order: {
        ...this.toOrder(raw),
        totalFee: feeTotals.get(id) ?? 0,
      },
      fees: fees.items,
      stockChanges: stockChanges.items,
    };
  }

  /**
   * 创建订单（上门安装模式）：①创建订单记录（待出库）②自动生成配送安装单。
   * 库存不在此时扣减，确认出库时才扣减；配送单创建失败时删除订单保证一致。
   */
  async create(
    dto: CreateOrderRequest,
    operator?: OperatorContext,
  ): Promise<{ id: string }> {
    if (!dto.customerId || !dto.productId) {
      throw new BadRequestException('客户与商品为必填项');
    }
    if (!Number.isInteger(dto.quantity) || dto.quantity <= 0) {
      throw new BadRequestException('数量必须为正整数');
    }
    const stock = await this.productService.getProductStock(dto.productId);
    if (stock < dto.quantity) {
      throw new BadRequestException(
        `库存不足：当前库存 ${stock}，无法创建数量为 ${dto.quantity} 的订单`,
      );
    }

    const orderNo = this.generateOrderNo();
    const record: Record<string, unknown> = {
      订单号: orderNo,
      客户: [dto.customerId],
      商品: [dto.productId],
      数量: dto.quantity,
      下单时间: Date.now(),
      订单状态: '待出库',
    };
    if (dto.address) record['收货地址'] = dto.address;
    if (dto.remark) record['备注'] = dto.remark;

    const output = await this.bitableClient.batchAddRecords(
      ORDER_LINK_INSTANCE,
      [{ record }],
    );
    const orderId = output.records[0]?.id ?? '';

    // 下单时自动快照商品当前成本价，供利润计算（失败回退实时成本价）
    await this.saveCostSnapshot(orderId, dto.productId);

    const ownerId: string = operator?.userId ?? '';
    try {
      await this.shipmentService.createFromOrder(orderId, ownerId);
    } catch (error) {
      await this.bitableClient.deleteRecords(ORDER_LINK_INSTANCE, [orderId]);
      this.logger.warn(
        `shipment auto-create failed, order ${orderId} rolled back: ${error instanceof Error ? error.message : 'unknown'}`,
      );
      throw error;
    }

    if (dto.fees && dto.fees.length > 0) {
      try {
        for (const fee of dto.fees) {
          await this.orderFeeService.add(orderId, fee, ownerId);
        }
      } catch (error) {
        await this.orderFeeService
          .deleteByOrders([orderId])
          .catch(() => undefined);
        await this.cancelPendingShipments(orderId, ownerId).catch(
          () => undefined,
        );
        await this.bitableClient
          .deleteRecords(ORDER_LINK_INSTANCE, [orderId])
          .catch(() => undefined);
        this.logger.warn(
          `order ${orderNo} fee creation failed, order rolled back: ${error instanceof Error ? error.message : 'unknown'}`,
        );
        throw error;
      }
    }

    if (ownerId) {
      await this.db
        .insert(orderOwner)
        .values({ orderId, ownerUserId: ownerId })
        .onConflictDoNothing({ target: orderOwner.orderId });
    }

    // 创建完成后统一重算一次财务，拿到订单总金额（商品金额 + 向客户收取的费用）
    let orderTotalAmount = 0;
    try {
      const summary = await this.orderFeeService.recomputeOrderFinancials(orderId);
      orderTotalAmount = summary.totalAmount;
    } catch (error) {
      this.logger.warn(
        `recompute after create failed for order ${orderId}: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }

    // 信用额度管控：未收账款 + 本单金额超过客户额度则阻断并回滚订单
    try {
      await this.receivableService.assertCreditAvailable(
        dto.customerId,
        orderTotalAmount,
      );
    } catch (error) {
      await this.orderFeeService
        .deleteByOrders([orderId])
        .catch(() => undefined);
      await this.cancelPendingShipments(orderId, ownerId).catch(
        () => undefined,
      );
      await this.bitableClient
        .deleteRecords(ORDER_LINK_INSTANCE, [orderId])
        .catch(() => undefined);
      this.logger.warn(
        `order ${orderNo} blocked by credit limit: ${error instanceof Error ? error.message : 'unknown'}`,
      );
      throw error;
    }

    // 自动生成应收账款（金额 = 订单总金额），失败仅告警不阻断下单
    await this.receivableService
      .createFromOrder({
        orderId,
        orderNo,
        customerId: dto.customerId,
        totalAmount: orderTotalAmount,
        operatorId: operator?.userId,
      })
      .catch((error: unknown): void => {
        this.logger.warn(
          `receivable create skipped for order ${orderId}: ${error instanceof Error ? error.message : 'unknown'}`,
        );
      });

    await this.opLogService.record({
      entityType: 'order',
      entityId: orderId,
      entityName: orderNo,
      action: '创建订单',
      detail: `数量 ${dto.quantity}`,
      afterValue: '待出库',
      operatorId: operator?.userId,
    });
    this.logger.log(`order ${orderNo} (${orderId}) created with shipment`);
    return { id: orderId };
  }

  /**
   * 编辑订单：仅更新档案字段（库存不随订单变动）；
   * 待出库订单同步更新其配送安装单的商品明细与安装联系信息。
   */
  async update(
    id: string,
    dto: CreateOrderRequest,
    operator?: OperatorContext,
  ): Promise<{ success: boolean }> {
    await this.assertOrderOwned(id, operator);
    if (!dto.customerId || !dto.productId) {
      throw new BadRequestException('客户与商品为必填项');
    }
    if (!Number.isInteger(dto.quantity) || dto.quantity <= 0) {
      throw new BadRequestException('数量必须为正整数');
    }
    const current = await this.loadOrder(id);

    const record: Record<string, unknown> = {
      客户: [dto.customerId],
      商品: [dto.productId],
      数量: dto.quantity,
    };
    if (dto.address !== undefined) record['收货地址'] = dto.address;
    if (dto.remark !== undefined) record['备注'] = dto.remark;

    const output = await this.bitableClient.batchUpdateRecords(
      ORDER_LINK_INSTANCE,
      [{ id, record }],
    );

    // 商品变更时刷新成本快照；仅数量变更沿用原快照（下单时成本不变）
    if (dto.productId !== current.productId) {
      await this.saveCostSnapshot(id, dto.productId);
    }

    if (current.status === '待出库') {
      try {
        await this.shipmentService.syncFromOrder(id, {
          customerId: dto.customerId,
          productId: dto.productId,
          quantity: dto.quantity,
          address: dto.address,
        });
      } catch (error) {
        this.logger.warn(
          `sync shipment from order ${id} failed: ${error instanceof Error ? error.message : 'unknown'}`,
        );
      }
    }

    // 商品明细（商品/数量）变更后重算利润，失败仅告警不阻断编辑
    await this.orderFeeService
      .recomputeOrderFinancials(id)
      .catch((error: unknown): void => {
        this.logger.warn(
          `recompute after update failed for order ${id}: ${error instanceof Error ? error.message : 'unknown'}`,
        );
      });

    await this.opLogService.record({
      entityType: 'order',
      entityId: id,
      entityName: current.orderNo,
      action: '修改订单',
      detail: `数量 ${current.quantity} → ${dto.quantity}`,
      beforeValue: current.status,
      afterValue: current.status,
      operatorId: operator?.userId,
    });
    this.logger.log(`order ${id} updated`);
    return { success: output.records.length > 0 };
  }

  /**
   * 取消订单：已完成/已取消不可取消；取消原因必填。
   * 联动取消全部未完成配送单（待出库/运输中/在安装），
   * 已出库单据由配送单取消逻辑自动回补库存。
   */
  async cancel(
    id: string,
    cancelReason: string,
    operator?: OperatorContext,
  ): Promise<{ success: boolean }> {
    const reason: string = cancelReason?.trim() ?? '';
    if (!reason) {
      throw new BadRequestException('请填写取消原因');
    }
    await this.assertOrderOwned(id, operator);
    const current = await this.loadOrder(id);
    if (current.status === '已取消') {
      throw new BadRequestException('订单已取消，请勿重复操作');
    }
    if (current.status === '已完成') {
      throw new BadRequestException('已完成的订单不可取消');
    }
    await this.cancelShipmentsByStatuses(id, operator?.userId, [
      '待出库',
      '运输中',
      '在安装',
    ]);
    const output = await this.bitableClient.batchUpdateRecords(
      CAPABILITY_INSTANCE_IDS.order,
      [{ id, record: { 订单状态: '已取消' } }],
    );
    // 订单取消时自动作废对应应收账款（失败仅告警）
    await this.receivableService.voidByOrders([id]).catch((error: unknown): void => {
      this.logger.warn(`receivable void skipped for order ${id}: ${String(error)}`);
    });
    await this.opLogService.record({
      entityType: 'order',
      entityId: id,
      entityName: current.orderNo,
      action: '订单取消',
      detail: `取消原因：${reason}`,
      beforeValue: current.status,
      afterValue: '已取消',
      operatorId: operator?.userId,
    });
    this.logger.log(`order ${id} cancelled: ${reason}`);
    return { success: output.records.length > 0 };
  }

  /**
   * 删除订单：存在进行中配送单（运输中/在安装）时拒绝；
   * 待出库配送单先行取消清理，已完成配送单不影响删除。
   */
  async remove(
    id: string,
    operator?: OperatorContext,
  ): Promise<{ success: boolean }> {
    await this.assertOrderOwned(id, operator);
    const current = await this.loadOrder(id);
    await this.assertNoActiveShipments([id]);
    await this.cancelPendingShipments(id, operator?.userId);
    const output = await this.bitableClient.deleteRecords(
      CAPABILITY_INSTANCE_IDS.order,
      [id],
    );
    await this.orderFeeService.deleteByOrders([id]);
    await this.receivableService.voidByOrders([id]).catch((error: unknown): void => {
      this.logger.warn(`receivable void skipped for order ${id}: ${String(error)}`);
    });
    await this.opLogService.record({
      entityType: 'order',
      entityId: id,
      entityName: current.orderNo,
      action: '删除订单',
      beforeValue: current.status,
      operatorId: operator?.userId,
    });
    this.logger.log(`order ${id} deleted`);
    return { success: output.success };
  }

  /** 批量删除：进行中配送单的订单跳过，待出库配送单先取消再删除 */
  async batchDelete(
    ids: string[],
    operator?: OperatorContext,
  ): Promise<OrderBatchResponse> {
    const failedIds: string[] = [];
    let candidateIds = ids;
    if (operator?.roleCode === 'sales') {
      const ownedIds: Set<string> = await this.ownedOrderIds(operator.userId);
      for (const id of ids) {
        if (!ownedIds.has(id)) failedIds.push(id);
      }
      candidateIds = ids.filter((id: string): boolean => ownedIds.has(id));
    }
    const deletable: string[] = [];
    const blockedIds: Set<string> =
      await this.findActiveShipmentOrderIds(candidateIds);
    for (const id of candidateIds) {
      if (blockedIds.has(id)) {
        failedIds.push(id);
        continue;
      }
      const current = await this.loadOrder(id).catch(() => null);
      if (!current) {
        failedIds.push(id);
        continue;
      }
      await this.cancelPendingShipments(id, operator?.userId);
      deletable.push(id);
    }
    if (deletable.length > 0) {
      await this.bitableClient.deleteRecords(CAPABILITY_INSTANCE_IDS.order, deletable);
      await this.orderFeeService.deleteByOrders(deletable);
      await this.receivableService.voidByOrders(deletable).catch((error: unknown): void => {
        this.logger.warn(`receivable void skipped for batch delete: ${String(error)}`);
      });
      await this.opLogService.record({
        entityType: 'order',
        entityId: deletable.join(','),
        action: '批量删除订单',
        detail: `成功 ${deletable.length} 笔，失败 ${failedIds.length} 笔`,
        operatorId: operator?.userId,
      });
    }
    this.logger.log(`batch delete: ${deletable.length} ok, ${failedIds.length} failed`);
    return { successCount: deletable.length, failedIds };
  }

  /** 更新订单支付状态（财务/管理员） */
  async updatePayStatus(
    id: string,
    payStatus: string,
    operator?: OperatorContext,
  ): Promise<{ success: boolean }> {
    const status = payStatus?.trim() ?? '';
    if (!status) {
      throw new BadRequestException('支付状态不能为空');
    }
    await this.loadOrder(id);
    await this.assertOrderOwned(id, operator);
    const output = await this.bitableClient.batchUpdateRecords(
      ORDER_LINK_INSTANCE,
      [{ id, record: { 支付状态: status } }],
    );
    this.logger.log(`order ${id} pay status -> ${status}`);
    return { success: output.records.length > 0 };
  }

  /** 销售角色可见的订单 id 集合（order_owner 归属表） */
  private async ownedOrderIds(userId: string): Promise<Set<string>> {
    if (!userId) return new Set();
    const rows: Array<{ orderId: string }> = await this.db
      .select({ orderId: orderOwner.orderId })
      .from(orderOwner)
      .where(eq(orderOwner.ownerUserId, userId));
    return new Set(rows.map((row: { orderId: string }): string => row.orderId));
  }

  /** 销售角色写操作前的订单归属校验 */
  private async assertOrderOwned(
    orderId: string,
    operator?: OperatorContext,
  ): Promise<void> {
    if (operator?.roleCode !== 'sales') return;
    const rows: Array<{ orderId: string }> = await this.db
      .select({ orderId: orderOwner.orderId })
      .from(orderOwner)
      .where(
        and(
          eq(orderOwner.orderId, orderId),
          eq(orderOwner.ownerUserId, operator.userId),
        ),
      )
      .limit(1);
    if (rows.length === 0) {
      throw new ForbiddenException('只能查看或操作自己创建的订单');
    }
  }

  /** 取消订单关联的全部待出库配送单（库存未扣减，仅清理单据与同步记录） */
  private async cancelPendingShipments(
    orderId: string,
    userId?: string,
  ): Promise<void> {
    await this.cancelShipmentsByStatuses(orderId, userId, ['待出库']);
  }

  /** 取消订单关联的指定状态配送单；已出库单据由配送单取消逻辑自动回补库存 */
  private async cancelShipmentsByStatuses(
    orderId: string,
    userId: string | undefined,
    statuses: string[],
  ): Promise<void> {
    const rows: Array<{ id: string }> = await this.db
      .select({ id: shipment.id })
      .from(shipment)
      .where(
        and(
          eq(shipment.orderId, orderId),
          inArray(shipment.shipStatus, statuses),
        ),
      );
    for (const row of rows) {
      await this.shipmentService.cancel(row.id, userId ?? '', {
        skipOrderRevert: true,
      });
    }
  }

  /** 删除防护：订单存在进行中配送单（运输中/在安装）时拒绝删除 */
  private async assertNoActiveShipments(orderIds: string[]): Promise<void> {
    const blocked: Set<string> = await this.findActiveShipmentOrderIds(orderIds);
    if (blocked.size > 0) {
      throw new ConflictException(
        '订单存在进行中的配送安装单，请先处理后再删除订单',
      );
    }
  }

  /** 批量查询存在进行中配送单的订单 id 集合 */
  private async findActiveShipmentOrderIds(
    orderIds: string[],
  ): Promise<Set<string>> {
    if (orderIds.length === 0) return new Set();
    const rows: Array<{ orderId: string }> = await this.db
      .select({ orderId: shipment.orderId })
      .from(shipment)
      .where(
        and(
          inArray(shipment.orderId, orderIds),
          inArray(shipment.shipStatus, ACTIVE_SHIPMENT_STATUSES),
        ),
      );
    return new Set(rows.map((row: { orderId: string }) => row.orderId));
  }

  /** 写入下单成本快照（尽力而为，失败时利润计算回退实时成本价） */
  private async saveCostSnapshot(
    orderId: string,
    productId: string,
  ): Promise<void> {
    try {
      const costPrice: number = await this.readProductCost(productId);
      await this.orderFeeService.upsertCostSnapshot(
        orderId,
        productId,
        costPrice,
      );
    } catch (error) {
      this.logger.warn(
        `save cost snapshot failed for order ${orderId}: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
  }

  /** 读取商品当前成本价（未建档视为 0） */
  private async readProductCost(productId: string): Promise<number> {
    const rows: Array<{ costPrice: string }> = await this.db
      .select({ costPrice: productProfile.costPrice })
      .from(productProfile)
      .where(eq(productProfile.productId, productId))
      .limit(1);
    return Number(rows[0]?.costPrice ?? 0) || 0;
  }

  private async loadOrder(id: string): Promise<RawOrder> {
    const detail = await this.bitableClient.getRecord(ORDER_LINK_INSTANCE, id);
    if (!detail.record || Object.keys(detail.record).length === 0) {
      throw new NotFoundException('订单不存在');
    }
    const customerNameById = await this.loadCustomerNames();
    return this.mapRawOrder(
      { id: detail.id, record: detail.record },
      customerNameById,
    );
  }

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

  private mapRawOrder(
    item: BitableRecordItem,
    customerNameById: Map<string, string>,
  ): RawOrder {
    const r = item.record;
    const orderTimeTs = typeof r['下单时间'] === 'number' ? r['下单时间'] : 0;
    const rawStatus = typeof r['订单状态'] === 'string' ? r['订单状态'] : '待出库';
    return {
      id: item.id,
      orderNo: readTextField(r['订单号']),
      customerId: readLinkIds(r['客户'])[0] ?? '',
      customerName: customerNameById.get(readLinkIds(r['客户'])[0] ?? '') ?? '',
      productId: readLinkIds(r['商品'])[0] ?? '',
      productName: readFormulaText(r['商品名称']),
      quantity: typeof r['数量'] === 'number' ? r['数量'] : 0,
      amount: readFormulaNumber(r['订单金额']),
      unitPrice: readFormulaNumber(r['销售单价']),
      orderTime: orderTimeTs > 0 ? new Date(orderTimeTs).toISOString() : '',
      orderTimeTs,
      status: LEGACY_STATUS_MAP[rawStatus] ?? (rawStatus as OrderStatus),
      shipTime:
        typeof r['发货时间'] === 'number'
          ? new Date(r['发货时间']).toISOString()
          : undefined,
      payStatus: typeof r['支付状态'] === 'string' ? r['支付状态'] : '',
      expressNo: readTextField(r['快递单号']),
      remark: readTextField(r['备注']),
      address: readTextField(r['收货地址']),
    };
  }

  private toOrder(o: RawOrder): Order {
    return {
      id: o.id,
      orderNo: o.orderNo,
      customerId: o.customerId,
      customerName: o.customerName,
      productId: o.productId,
      productName: o.productName,
      quantity: o.quantity,
      amount: o.amount,
      unitPrice: o.unitPrice,
      orderTime: o.orderTime,
      status: o.status,
      shipTime: o.shipTime,
      payStatus: o.payStatus,
      expressNo: o.expressNo,
      remark: o.remark,
    };
  }

  private generateOrderNo(): string {
    const now = new Date();
    const date = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
    ].join('');
    const rand = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
    return `JSD${date}${rand}`;
  }
}
