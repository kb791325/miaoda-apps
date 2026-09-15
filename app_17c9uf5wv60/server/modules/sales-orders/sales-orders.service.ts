import {
  Injectable,
  Inject,
  Logger,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from '@lark-apaas/fullstack-nestjs-core';
import {
  salesOrders,
  salesOrderItems,
  products,
  warehouseInventory,
  stockTransactions,
} from '@server/database/schema';
import { eq, and, desc, ilike, or, gte, lt, inArray, sql, count } from 'drizzle-orm';
import type {
  SalesOrder,
  SalesOrderItem,
  SalesOrderStatus,
  SalesOrderListParams,
  SalesOrderListResponse,
  CreateSalesOrderRequest,
  UpdateSalesOrderRequest,
  CreateSalesOrderItemRequest,
  AuditActionType,
} from '@shared/api.interface';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

type SalesOrderRow = typeof salesOrders.$inferSelect;
type SalesOrderItemRow = typeof salesOrderItems.$inferSelect;

@Injectable()
export class SalesOrdersService {
  private readonly logger = new Logger(SalesOrdersService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  private fireAndForgetAuditLog(
    actionType: AuditActionType,
    targetType: string,
    targetId: string,
    operatorUserId: string,
    detail?: { before?: Record<string, unknown>; after?: Record<string, unknown>; changes?: Record<string, unknown> },
  ): void {
    void this.auditLogsService.createLog({
      actionType,
      targetType,
      targetId,
      operatorUserId,
      detail,
    });
  }

  // ---------- Helpers ----------

  private rowToDto(row: SalesOrderRow): SalesOrder {
    return {
      id: row.id,
      orderNo: row.orderNo,
      customerName: row.customerName,
      customerContact: row.customerContact ?? undefined,
      customerPhone: row.customerPhone ?? undefined,
      warehouse: row.warehouse,
      totalAmount: Number(row.totalAmount),
      status: row.status as SalesOrderStatus,
      expectedShipDate: row.expectedShipDate ?? null,
      remark: row.remark ?? undefined,
      transactionId: row.transactionId ?? null,
      createdAt: row.createdAt.toISOString(),
      createdBy: row.createdBy ?? undefined,
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private itemRowToDto(row: {
    id: string;
    orderId: string;
    productId: string;
    quantity: number;
    unitPrice: string | number;
    totalPrice: string | number;
    productName?: string | null;
    productCode?: string | null;
    productSpec?: string | null;
    unit?: string | null;
  }): SalesOrderItem {
    return {
      id: row.id,
      orderId: row.orderId,
      productId: row.productId,
      productName: row.productName,
      productCode: row.productCode,
      productSpec: row.productSpec,
      unit: row.unit,
      quantity: row.quantity,
      unitPrice: Number(row.unitPrice),
      totalPrice: Number(row.totalPrice),
    };
  }

  private async generateOrderNo(): Promise<string> {
    const now: Date = new Date();
    const yyyy: string = String(now.getFullYear());
    const mm: string = String(now.getMonth() + 1).padStart(2, '0');
    const dd: string = String(now.getDate()).padStart(2, '0');
    const datePart: string = `${yyyy}${mm}${dd}`;
    const prefix: string = `SO-${datePart}-`;

    // 用事务 + FOR UPDATE 避免并发重复；这里简化为 count+1 插入
    // 因 order_no 有唯一索引，冲突时重试一次
    const existing: { count: string | number }[] = await this.db
      .select({ count: count() })
      .from(salesOrders)
      .where(ilike(salesOrders.orderNo, `${prefix}%`));
    const seq: number = Number(existing[0]?.count ?? 0) + 1;
    return `${prefix}${String(seq).padStart(4, '0')}`;
  }

  private async getOrderOrThrow(id: string): Promise<SalesOrderRow> {
    const rows: SalesOrderRow[] = await this.db
      .select()
      .from(salesOrders)
      .where(eq(salesOrders.id, id));
    if (rows.length === 0) {
      throw new NotFoundException('销售订单不存在');
    }
    return rows[0];
  }

  private async getOrderItemsWithProduct(
    orderId: string,
  ): Promise<SalesOrderItem[]> {
    const rows = await this.db
      .select({
        id: salesOrderItems.id,
        orderId: salesOrderItems.orderId,
        productId: salesOrderItems.productId,
        quantity: salesOrderItems.quantity,
        unitPrice: salesOrderItems.unitPrice,
        totalPrice: salesOrderItems.totalPrice,
        productName: products.name,
        productCode: products.code,
        productSpec: products.spec,
        unit: products.unit,
      })
      .from(salesOrderItems)
      .leftJoin(products, eq(salesOrderItems.productId, products.id))
      .where(eq(salesOrderItems.orderId, orderId));

    return rows.map((row) => this.itemRowToDto(row));
  }

  private calculateItemTotals(
    items: CreateSalesOrderItemRequest[],
  ): { totalAmount: number; itemsWithTotal: Array<CreateSalesOrderItemRequest & { totalPrice: number }> } {
    let totalAmount: number = 0;
    const itemsWithTotal: Array<CreateSalesOrderItemRequest & { totalPrice: number }> = [];
    for (const item of items) {
      const totalPrice: number = Number(
        (item.quantity * item.unitPrice).toFixed(2),
      );
      totalAmount = Number((totalAmount + totalPrice).toFixed(2));
      itemsWithTotal.push({ ...item, totalPrice });
    }
    return { totalAmount, itemsWithTotal };
  }

  private async validateProductsExist(itemDtos: CreateSalesOrderItemRequest[]): Promise<void> {
    const productIds: string[] = itemDtos.map((i: CreateSalesOrderItemRequest) => i.productId);
    const prodRows = await this.db
      .select({ id: products.id })
      .from(products)
      .where(inArray(products.id, productIds));
    if (prodRows.length !== productIds.length) {
      throw new BadRequestException('部分商品不存在');
    }
  }

  private assertStatus(
    current: string,
    allowed: SalesOrderStatus[],
    action: string,
  ): void {
    if (!allowed.includes(current as SalesOrderStatus)) {
      throw new BadRequestException(
        `当前状态「${current}」不允许执行「${action}」操作`,
      );
    }
  }

  // ---------- List ----------

  private buildListConditions(params: SalesOrderListParams) {
    const conditions = [];
    if (params.status) {
      conditions.push(eq(salesOrders.status, params.status));
    }
    if (params.warehouse) {
      conditions.push(eq(salesOrders.warehouse, params.warehouse));
    }
    if (params.keyword) {
      const kw: string = `%${params.keyword}%`;
      conditions.push(
        or(ilike(salesOrders.orderNo, kw), ilike(salesOrders.customerName, kw)),
      );
    }
    if (params.startDate) {
      conditions.push(gte(salesOrders.createdAt, new Date(params.startDate)));
    }
    if (params.endDate) {
      // endDate 按天算，包含当天
      const end: Date = new Date(params.endDate);
      end.setDate(end.getDate() + 1);
      conditions.push(lt(salesOrders.createdAt, end));
    }
    return conditions.length > 0 ? and(...conditions) : undefined;
  }

  async list(params: SalesOrderListParams): Promise<SalesOrderListResponse> {
    const page: number = params.page && params.page > 0 ? params.page : 1;
    const pageSize: number =
      params.pageSize && params.pageSize > 0 ? params.pageSize : 20;
    const offset: number = (page - 1) * pageSize;

    const whereClause = this.buildListConditions(params);

    const [countRows, orderRows]: Array<{ count: string | number }[] | SalesOrderRow[]> =
      await Promise.all([
        this.db
          .select({ count: count() })
          .from(salesOrders)
          .where(whereClause),
        this.db
          .select()
          .from(salesOrders)
          .where(whereClause)
          .orderBy(desc(salesOrders.createdAt))
          .limit(pageSize)
          .offset(offset),
      ]);

    const total: number = Number((countRows as { count: string | number }[])[0]?.count ?? 0);
    const items: SalesOrder[] = (orderRows as SalesOrderRow[]).map((row: SalesOrderRow) =>
      this.rowToDto(row),
    );

    return { items, total, page, pageSize };
  }

  async exportList(params: SalesOrderListParams): Promise<SalesOrder[]> {
    const whereClause = this.buildListConditions(params);
    const rows: SalesOrderRow[] = await this.db
      .select()
      .from(salesOrders)
      .where(whereClause)
      .orderBy(desc(salesOrders.createdAt))
      .limit(5000);
    return rows.map((row: SalesOrderRow) => this.rowToDto(row));
  }

  // ---------- Detail ----------

  async getById(id: string): Promise<SalesOrder> {
    const order: SalesOrderRow = await this.getOrderOrThrow(id);
    const items: SalesOrderItem[] = await this.getOrderItemsWithProduct(id);
    const dto: SalesOrder = this.rowToDto(order);
    dto.items = items;
    dto.statusHistory = []; // 按需求简化：无专门状态历史表，返回空数组
    return dto;
  }

  // ---------- Create ----------

  async create(dto: CreateSalesOrderRequest, userId: string): Promise<SalesOrder> {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('订单商品明细不能为空');
    }
    await this.validateProductsExist(dto.items);

    const { totalAmount, itemsWithTotal } = this.calculateItemTotals(dto.items);

    // 并发重试：order_no 唯一索引冲突时重算一次
    let orderNo: string;
    let attempt: number = 0;
    const maxAttempts: number = 3;

    while (attempt < maxAttempts) {
      try {
        orderNo = await this.generateOrderNo();
        const result = await this.db.transaction(async (tx) => {
          const inserted = await tx
            .insert(salesOrders)
            .values({
              orderNo,
              customerName: dto.customerName,
              customerContact: dto.customerContact ?? null,
              customerPhone: dto.customerPhone ?? null,
              warehouse: dto.warehouse,
              totalAmount: totalAmount.toString(),
              status: 'pending',
              expectedShipDate: dto.expectedShipDate ?? null,
              remark: dto.remark ?? null,
              createdBy: userId,
              updatedBy: userId,
            })
            .returning();

          const orderId: string = inserted[0].id;
          await tx.insert(salesOrderItems).values(
            itemsWithTotal.map((item) => ({
              orderId,
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice.toString(),
              totalPrice: item.totalPrice.toString(),
              createdBy: userId,
              updatedBy: userId,
            })),
          );

          return inserted[0];
        });

       const dtoResult: SalesOrder = this.rowToDto(result);
         dtoResult.items = await this.getOrderItemsWithProduct(result.id);

         this.fireAndForgetAuditLog('create', 'sales_order', result.id, userId, {
           after: {
             orderNo: dtoResult.orderNo,
             customerName: dtoResult.customerName,
             warehouse: dtoResult.warehouse,
             totalAmount: dtoResult.totalAmount,
             itemCount: dtoResult.items?.length ?? 0,
             status: dtoResult.status,
           },
         });

         return dtoResult;
      } catch (err: unknown) {
        const code: string | undefined = this.extractPostgresErrorCode(err);
        if (code === '23505') {
          attempt += 1;
          this.logger.warn(
            `订单号冲突，重试中 attempt=${attempt} orderNo=${orderNo!}`,
          );
          continue;
        }
        throw err;
      }
    }
    throw new ConflictException('生成订单号失败，请重试');
  }

  // ---------- Update ----------

  async update(
    id: string,
    dto: UpdateSalesOrderRequest,
    userId: string,
  ): Promise<SalesOrder> {
    const order: SalesOrderRow = await this.getOrderOrThrow(id);
    this.assertStatus(order.status, ['pending'], '更新');

    const patch: Record<string, unknown> = {};
    if (dto.customerName !== undefined) patch.customerName = dto.customerName;
    if (dto.customerContact !== undefined)
      patch.customerContact = dto.customerContact ?? null;
    if (dto.customerPhone !== undefined)
      patch.customerPhone = dto.customerPhone ?? null;
    if (dto.warehouse !== undefined) patch.warehouse = dto.warehouse;
    if (dto.expectedShipDate !== undefined)
      patch.expectedShipDate = dto.expectedShipDate ?? null;
    if (dto.remark !== undefined) patch.remark = dto.remark ?? null;

    if (dto.items !== undefined) {
      if (dto.items.length === 0) {
        throw new BadRequestException('订单商品明细不能为空');
      }
      await this.validateProductsExist(dto.items);
      const { totalAmount, itemsWithTotal } = this.calculateItemTotals(dto.items);
      patch.totalAmount = totalAmount.toString();

      await this.db.transaction(async (tx) => {
        // 非空 patch 时先更新主表
        if (Object.keys(patch).length > 0) {
          patch.updatedAt = new Date();
          patch.updatedBy = userId;
          await tx
            .update(salesOrders)
            .set(patch)
            .where(eq(salesOrders.id, id));
        }

        // 删除旧明细，插入新明细
        await tx
          .delete(salesOrderItems)
          .where(eq(salesOrderItems.orderId, id));
        await tx.insert(salesOrderItems).values(
          itemsWithTotal.map((item) => ({
            orderId: id,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice.toString(),
            totalPrice: item.totalPrice.toString(),
            createdBy: userId,
            updatedBy: userId,
          })),
        );
      });
    } else if (Object.keys(patch).length > 0) {
      patch.updatedAt = new Date();
      patch.updatedBy = userId;
      await this.db
        .update(salesOrders)
        .set(patch)
        .where(eq(salesOrders.id, id));
    } else {
      throw new BadRequestException('未提供可更新字段');
    }

    return this.getById(id);
  }

  // ---------- Status transitions ----------

  async confirm(id: string, userId: string): Promise<SalesOrder> {
    return this.updateStatus(id, 'pending', 'confirmed', '确认', userId);
  }

  async cancel(id: string, userId: string): Promise<SalesOrder> {
    return this.updateStatus(
      id,
      ['pending', 'confirmed', 'picking'],
      'cancelled',
      '取消',
      userId,
    );
  }

  async startPicking(id: string, userId: string): Promise<SalesOrder> {
    return this.updateStatus(id, 'confirmed', 'picking', '开始备货', userId);
  }

  async complete(id: string, userId: string): Promise<SalesOrder> {
    return this.updateStatus(id, 'shipped', 'completed', '完成', userId);
  }

   private async updateStatus(
     id: string,
     from: SalesOrderStatus | SalesOrderStatus[],
     to: SalesOrderStatus,
     action: string,
     userId: string,
   ): Promise<SalesOrder> {
     const order: SalesOrderRow = await this.getOrderOrThrow(id);
     const allowed: SalesOrderStatus[] = Array.isArray(from) ? from : [from];
     this.assertStatus(order.status, allowed, action);

     const updated = await this.db
       .update(salesOrders)
       .set({
         status: to,
         updatedAt: new Date(),
         updatedBy: userId,
       })
       .where(eq(salesOrders.id, id))
       .returning();

     if (updated.length === 0) {
       throw new NotFoundException('销售订单不存在');
     }

     const actionTypeMap: Record<string, AuditActionType> = {
       '确认': 'order_confirm',
       '取消': 'order_cancel',
       '开始备货': 'update',
       '完成': 'order_complete',
     };
     const auditActionType: AuditActionType = actionTypeMap[action] ?? 'update';
     this.fireAndForgetAuditLog(auditActionType, 'sales_order', id, userId, {
       before: { status: order.status },
       after: { status: to },
       changes: { status: { from: order.status, to } },
     });

     return this.getById(id);
   }

  // ---------- Ship (出库) ----------

  async ship(
    id: string,
    userId: string,
  ): Promise<{ success: boolean; orderId: string; transactionId: string }> {
    const order: SalesOrderRow = await this.getOrderOrThrow(id);
    this.assertStatus(order.status, ['picking'], '出库');

    const items: SalesOrderItemRow[] = await this.db
      .select()
      .from(salesOrderItems)
      .where(eq(salesOrderItems.orderId, id));

    if (items.length === 0) {
      throw new BadRequestException('订单无商品明细，无法出库');
    }

    const productIds: string[] = items.map((i: SalesOrderItemRow) => i.productId);
    const productsResult = await this.db
      .select({ id: products.id, name: products.name })
      .from(products)
      .where(inArray(products.id, productIds));
    const productNameMap: Map<string, string> = new Map();
    for (const p of productsResult) productNameMap.set(p.id, p.name);

    const result = await this.db.transaction(async (tx) => {
      // 1. 批量原子扣减库存（用 CASE WHEN 批量更新，逐个校验生效行数）
      const caseWhenClauses = items.map((item: SalesOrderItemRow) =>
        sql`when ${warehouseInventory.productId} = ${item.productId} then ${warehouseInventory.quantity} - ${item.quantity}`,
      );
      const valueCaseWhenClauses = items.map((item: SalesOrderItemRow) => {
        const unitPriceNum = Number(item.unitPrice);
        return sql`when ${warehouseInventory.productId} = ${item.productId} then ${warehouseInventory.stockValue} - ${item.quantity * unitPriceNum}`;
      });

      const updatedResult = await tx
        .update(warehouseInventory)
        .set({
          quantity: sql`case ${sql.join(caseWhenClauses, sql` `)} end`,
          stockValue: sql`case ${sql.join(valueCaseWhenClauses, sql` `)} end`,
        })
        .where(
          and(
            eq(warehouseInventory.warehouse, order.warehouse),
            inArray(warehouseInventory.productId, productIds),
          ),
        )
        .returning({ id: warehouseInventory.id, productId: warehouseInventory.productId, quantity: warehouseInventory.quantity });

      // 校验每个商品都扣减成功且库存未为负
      for (const item of items) {
        const updatedItem = updatedResult.find((r: { productId: string }) => r.productId === item.productId);
        if (!updatedItem) {
          throw new ConflictException(
            `商品 ${productNameMap.get(item.productId) || item.productId} 在 ${order.warehouse} 无库存记录`,
          );
        }
        // 原子更新前数量 - 本次数量 = 更新后数量，如果更新后数量<0说明扣减超了
        // 由于我们的 case when 直接减，需要判断更新后是否非负来决定是否回滚
        // 更安全：使用 where gte 条件，但批量更新无法逐行写 gte，所以这里用负数判断
      }

      // 检查是否有负库存，若有则整体回滚（事务会自动回滚）
      for (const row of updatedResult) {
        if (row.quantity < 0) {
          const productName = productNameMap.get(row.productId) || row.productId;
          throw new ConflictException(
            `商品 ${productName} 在 ${order.warehouse} 库存不足`,
          );
        }
      }

      // 2. 生成主交易 ID
      const now: Date = new Date();

      // 3. 插入流水（库存已在上方批量扣减）
      const txIds: string[] = [];
      for (const item of items) {
        const unitPriceNum: number = Number(item.unitPrice);
        const totalPriceNum: number = Number(item.totalPrice);

        const txInserted = await tx
          .insert(stockTransactions)
          .values({
            productId: item.productId,
            warehouse: order.warehouse,
            type: 'outbound',
            subType: '销售出库',
            quantity: item.quantity,
            unitPrice: unitPriceNum.toString(),
            totalAmount: totalPriceNum.toString(),
            orderNo: order.orderNo,
            operator: '销售订单出库',
            transactionDate: now,
            createdBy: userId,
            updatedBy: userId,
          })
          .returning({ id: stockTransactions.id });

        txIds.push(txInserted[0].id);
      }

      // 4. 更新订单状态为 shipped，并记录主流水 id
      await tx
        .update(salesOrders)
        .set({
          status: 'shipped',
          transactionId: txIds[0],
          updatedAt: now,
          updatedBy: userId,
        })
        .where(eq(salesOrders.id, id));

      return { transactionId: txIds[0] };
    });

    this.logger.log(
      `销售订单出库完成 orderId=${id} transactionId=${result.transactionId}`,
    );

    this.fireAndForgetAuditLog('order_ship', 'sales_order', id, userId, {
      after: {
        orderNo: order.orderNo,
        warehouse: order.warehouse,
        itemCount: items.length,
        status: 'shipped',
        transactionId: result.transactionId,
      },
    });

    return {
      success: true,
      orderId: id,
      transactionId: result.transactionId,
    };
  }

  // ---------- Error helpers ----------

  private extractPostgresErrorCode(error: unknown): string | undefined {
    let current: unknown = error;
    for (let depth = 0; depth < 4 && current && typeof current === 'object'; depth += 1) {
      const { code, cause } = current as { code?: unknown; cause?: unknown };
      if (typeof code === 'string') return code;
      current = cause;
    }
    return undefined;
  }
}
