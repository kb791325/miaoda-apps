import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from '@lark-apaas/fullstack-nestjs-core';
import {
  products,
  purchaseOrderItems,
  purchaseOrders,
  suppliers,
} from '@server/database/schema';
import { and, count, desc, eq, gte, ilike, lt, or } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import type {
  CreatePurchaseOrderRequest,
  InboundResponse,
  PurchaseOrder,
  PurchaseOrderItem,
  PurchaseOrderItemInput,
  PurchaseOrderListParams,
  PurchaseOrderListResponse,
  PurchaseOrderStatus,
} from '@shared/api.interface';
import { StockOperationsService } from '../stock-operations/stock-operations.service';

interface PurchaseOrderRow {
  id: string;
  orderNo: string;
  supplierId: string | null;
  supplierName: string | null;
  warehouse: string;
  status: string;
  totalAmount: string;
  expectedDate: string | null;
  remark: string | null;
  inboundNo: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface PurchaseOrderItemRow {
  id: string;
  productId: string;
  productName: string | null;
  productCode: string | null;
  productUnit: string | null;
  quantity: number;
  receivedQuantity: number;
  unitPrice: string;
  totalPrice: string;
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

@Injectable()
export class PurchaseOrdersService {
  private readonly logger = new Logger(PurchaseOrdersService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    private readonly stockOperationsService: StockOperationsService,
  ) {}

  private toOrderStatus(value: string): PurchaseOrderStatus {
    if (value === 'approved' || value === 'received' || value === 'cancelled') {
      return value;
    }
    return 'pending';
  }

  private mapOrderRow(row: PurchaseOrderRow): PurchaseOrder {
    return {
      id: row.id,
      orderNo: row.orderNo,
      supplierId: row.supplierId,
      supplierName: row.supplierName ?? '',
      warehouse: row.warehouse,
      status: this.toOrderStatus(row.status),
      totalAmount: Number(row.totalAmount),
      expectedDate: row.expectedDate ?? null,
      remark: row.remark ?? null,
      inboundNo: row.inboundNo ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private selectOrderWithSupplier() {
    return this.db
      .select({
        id: purchaseOrders.id,
        orderNo: purchaseOrders.orderNo,
        supplierId: purchaseOrders.supplierId,
        supplierName: suppliers.name,
        warehouse: purchaseOrders.warehouse,
        status: purchaseOrders.status,
        totalAmount: purchaseOrders.totalAmount,
        expectedDate: purchaseOrders.expectedDate,
        remark: purchaseOrders.remark,
        inboundNo: purchaseOrders.inboundNo,
        createdAt: purchaseOrders.createdAt,
        updatedAt: purchaseOrders.updatedAt,
      })
      .from(purchaseOrders)
      .leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id));
  }

  async list(params: PurchaseOrderListParams): Promise<PurchaseOrderListResponse> {
    const rawPage: number = params.page ?? 1;
    const rawPageSize: number = params.pageSize ?? 20;
    const page: number = Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : 1;
    const pageSize: number = Number.isFinite(rawPageSize) && rawPageSize >= 1
      ? Math.min(Math.floor(rawPageSize), 100)
      : 20;

    const conditions: SQL<unknown>[] = [];
    if (params.status) {
      conditions.push(eq(purchaseOrders.status, params.status));
    }
    if (params.keyword) {
      const kw: string = `%${params.keyword}%`;
      conditions.push(or(ilike(purchaseOrders.orderNo, kw), ilike(suppliers.name, kw)));
    }
    const whereClause: SQL<unknown> | undefined =
      conditions.length > 0 ? and(...conditions) : undefined;

    return this.runListQuery(whereClause, page, pageSize);
  }

  private async runListQuery(
    whereClause: SQL<unknown> | undefined,
    page: number,
    pageSize: number,
  ): Promise<PurchaseOrderListResponse> {
    const countResult: { count: number }[] = await this.db
      .select({ count: count() })
      .from(purchaseOrders)
      .leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
      .where(whereClause);
    const total: number = Number(countResult[0]?.count ?? 0);

    const rows: PurchaseOrderRow[] = await this.selectOrderWithSupplier()
      .where(whereClause)
      .orderBy(desc(purchaseOrders.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const items: PurchaseOrder[] = rows.map((row: PurchaseOrderRow) => this.mapOrderRow(row));
    return { items, total, page, pageSize };
  }

  async detail(id: string): Promise<PurchaseOrder> {
    const orderRows: PurchaseOrderRow[] = await this.selectOrderWithSupplier()
      .where(eq(purchaseOrders.id, id));
    if (orderRows.length === 0) {
      throw new NotFoundException('采购订单不存在');
    }
    const order: PurchaseOrder = this.mapOrderRow(orderRows[0]);

    const itemRows: PurchaseOrderItemRow[] = await this.db
      .select({
        id: purchaseOrderItems.id,
        productId: purchaseOrderItems.productId,
        productName: products.name,
        productCode: products.code,
        productUnit: products.unit,
        quantity: purchaseOrderItems.quantity,
        receivedQuantity: purchaseOrderItems.receivedQuantity,
        unitPrice: purchaseOrderItems.unitPrice,
        totalPrice: purchaseOrderItems.totalPrice,
      })
      .from(purchaseOrderItems)
      .leftJoin(products, eq(purchaseOrderItems.productId, products.id))
      .where(eq(purchaseOrderItems.orderId, id));

    const items: PurchaseOrderItem[] = itemRows.map((row: PurchaseOrderItemRow) => ({
      id: row.id,
      productId: row.productId,
      productName: row.productName ?? '',
      productCode: row.productCode ?? '',
      productUnit: row.productUnit ?? '',
      quantity: row.quantity,
      receivedQuantity: row.receivedQuantity,
      unitPrice: Number(row.unitPrice),
      totalPrice: Number(row.totalPrice),
    }));
    return { ...order, items };
  }

  private validateItems(items: PurchaseOrderItemInput[]): void {
    if (!items || items.length === 0) {
      throw new BadRequestException('采购订单明细不能为空');
    }
    for (const item of items) {
      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        throw new BadRequestException('明细数量必须为正整数');
      }
      if (item.unitPrice < 0) {
        throw new BadRequestException('明细单价不能为负数');
      }
    }
  }

  private async generateOrderNo(): Promise<string> {
    const now: Date = new Date();
    const dateStr: string = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const startOfDay: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const rows: { count: number }[] = await this.db
      .select({ count: count() })
      .from(purchaseOrders)
      .where(
        and(
          gte(purchaseOrders.createdAt, startOfDay),
          lt(purchaseOrders.createdAt, endOfDay),
        ),
      );
    const seq: number = Number(rows[0]?.count ?? 0) + 1;
    return `PO-${dateStr}-${String(seq).padStart(4, '0')}`;
  }

  async create(dto: CreatePurchaseOrderRequest, userId: string): Promise<PurchaseOrder> {
    this.validateItems(dto.items);
    const totalAmount: number = dto.items.reduce(
      (sum: number, item: PurchaseOrderItemInput) => sum + item.quantity * item.unitPrice,
      0,
    );

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const orderNo: string = await this.generateOrderNo();
      try {
        const orderId: string = await this.db.transaction(async (tx) => {
          const inserted: { id: string }[] = await tx
            .insert(purchaseOrders)
            .values({
              orderNo,
              supplierId: dto.supplierId,
              warehouse: dto.warehouse,
              status: 'pending',
              totalAmount: totalAmount.toFixed(2),
              expectedDate: dto.expectedDate,
              remark: dto.remark,
              createdBy: userId,
            })
            .returning({ id: purchaseOrders.id });
          if (inserted.length === 0) {
            throw new BadRequestException('采购订单创建失败');
          }
          const newOrderId: string = inserted[0].id;
          await tx.insert(purchaseOrderItems).values(
            dto.items.map((item: PurchaseOrderItemInput) => ({
              orderId: newOrderId,
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice.toFixed(2),
              totalPrice: (item.quantity * item.unitPrice).toFixed(2),
            })),
          );
          return newOrderId;
        });
        this.logger.log(`采购订单创建成功 orderNo=${orderNo} by=${userId}`);
        return this.detail(orderId);
      } catch (error: unknown) {
        if (extractPostgresErrorCode(error) === '23505' && attempt === 0) {
          this.logger.warn(`采购订单号 ${orderNo} 唯一冲突，重试生成`);
          continue;
        }
        throw error;
      }
    }
    throw new BadRequestException('采购订单创建失败');
  }

  async approve(id: string, userId: string): Promise<PurchaseOrder> {
    const rows: { status: string }[] = await this.db
      .select({ status: purchaseOrders.status })
      .from(purchaseOrders)
      .where(eq(purchaseOrders.id, id));
    if (rows.length === 0) {
      throw new NotFoundException('采购订单不存在');
    }
    if (rows[0].status !== 'pending') {
      throw new BadRequestException('仅待审核状态的采购订单可以审核');
    }
    const updated: { id: string }[] = await this.db
      .update(purchaseOrders)
      .set({ status: 'approved', updatedAt: new Date(), updatedBy: userId })
      .where(eq(purchaseOrders.id, id))
      .returning({ id: purchaseOrders.id });
    if (updated.length === 0) {
      throw new NotFoundException('采购订单不存在');
    }
    return this.detail(id);
  }

  async receive(id: string, userId: string): Promise<PurchaseOrder> {
    const orderRows: PurchaseOrderRow[] = await this.selectOrderWithSupplier()
      .where(eq(purchaseOrders.id, id));
    if (orderRows.length === 0) {
      throw new NotFoundException('采购订单不存在');
    }
    const order: PurchaseOrder = this.mapOrderRow(orderRows[0]);
    if (order.status !== 'approved') {
      throw new BadRequestException('仅已审核状态的采购订单可以入库');
    }

    const itemRows: {
      id: string;
      productId: string;
      quantity: number;
      unitPrice: string;
    }[] = await this.db
      .select({
        id: purchaseOrderItems.id,
        productId: purchaseOrderItems.productId,
        quantity: purchaseOrderItems.quantity,
        unitPrice: purchaseOrderItems.unitPrice,
      })
      .from(purchaseOrderItems)
      .where(eq(purchaseOrderItems.orderId, id));

    let inboundNo: string | null = null;
    for (const item of itemRows) {
      const inboundRes: InboundResponse = await this.stockOperationsService.inbound(
        {
          productId: item.productId,
          warehouse: order.warehouse,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          operator: userId,
          subType: 'purchase',
          remark: `采购入库 ${order.orderNo}`,
        },
        userId,
      );
      if (inboundNo === null) {
        inboundNo = inboundRes.docNo;
      }
    }

    await this.db.transaction(async (tx) => {
      for (const item of itemRows) {
        const updatedItem: { id: string }[] = await tx
          .update(purchaseOrderItems)
          .set({ receivedQuantity: item.quantity, updatedAt: new Date(), updatedBy: userId })
          .where(eq(purchaseOrderItems.id, item.id))
          .returning({ id: purchaseOrderItems.id });
        if (updatedItem.length === 0) {
          throw new NotFoundException('采购订单明细不存在');
        }
      }
      const updatedOrder: { id: string }[] = await tx
        .update(purchaseOrders)
        .set({ status: 'received', inboundNo, updatedAt: new Date(), updatedBy: userId })
        .where(eq(purchaseOrders.id, id))
        .returning({ id: purchaseOrders.id });
      if (updatedOrder.length === 0) {
        throw new NotFoundException('采购订单不存在');
      }
    });
    this.logger.log(`采购订单入库完成 orderNo=${order.orderNo} by=${userId}`);
    return this.detail(id);
  }

  async cancel(id: string, userId: string): Promise<PurchaseOrder> {
    const rows: { status: string }[] = await this.db
      .select({ status: purchaseOrders.status })
      .from(purchaseOrders)
      .where(eq(purchaseOrders.id, id));
    if (rows.length === 0) {
      throw new NotFoundException('采购订单不存在');
    }
    if (rows[0].status !== 'pending') {
      throw new BadRequestException('仅待审核状态的采购订单可以取消');
    }
    const updated: { id: string }[] = await this.db
      .update(purchaseOrders)
      .set({ status: 'cancelled', updatedAt: new Date(), updatedBy: userId })
      .where(eq(purchaseOrders.id, id))
      .returning({ id: purchaseOrders.id });
    if (updated.length === 0) {
      throw new NotFoundException('采购订单不存在');
    }
    return this.detail(id);
  }
}
