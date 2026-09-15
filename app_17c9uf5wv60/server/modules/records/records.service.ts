import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from '@lark-apaas/fullstack-nestjs-core';
import {
  stockTransactions,
  warehouseInventory,
  products,
  transfers,
  inventoryChecks,
  inventoryCheckItems,
} from '@server/database/schema';
import { eq, and, desc, count, inArray, gte, lt } from 'drizzle-orm';
import type {
  TransactionListParams,
  TransactionListResponse,
  StockTransaction,
  Transfer,
  InventoryCheck,
  InventoryCheckItem,
  SubmitInventoryCheckRequest,
  AuditActionType,
} from '@shared/api.interface';
import { SyncService } from '../sync/sync.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class RecordsService {
  private readonly logger = new Logger(RecordsService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    private readonly syncService: SyncService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  private fireAndForgetAuditLog(
    actionType: AuditActionType,
    targetType: string,
    targetId: string,
    operatorUserId: string,
    detail?: Record<string, unknown>,
  ): void {
    void this.auditLogsService.createLog({
      actionType,
      targetType,
      targetId,
      operatorUserId,
      detail,
    });
  }

  private fireAndForgetSync(
    domain: 'products' | 'transactions' | 'transfers' | 'inventory_checks' | 'warehouse_inventory',
    recordId: string,
    action: 'create' | 'update' | 'delete',
  ): void {
    this.syncService.pushOne(domain, recordId, action).catch((err: unknown) => {
      this.logger.warn(
        `飞书同步失败 domain=${domain} id=${recordId} action=${action} err=${String(err)}`,
      );
    });
  }

  async getTransactions(
    params: TransactionListParams,
  ): Promise<TransactionListResponse> {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 20;
    const offset = (page - 1) * pageSize;

    const conditions = [];
    if (params.type) {
      conditions.push(eq(stockTransactions.type, params.type));
    }

    const whereClause =
      conditions.length > 0 ? and(...conditions) : undefined;

    const totalResult = await this.db
      .select({ count: count() })
      .from(stockTransactions)
      .where(whereClause);
    const total = Number(totalResult[0].count);

    const rows = await this.db
      .select({
        id: stockTransactions.id,
        productId: stockTransactions.productId,
        productName: products.name,
        productCode: products.code,
        warehouse: stockTransactions.warehouse,
        type: stockTransactions.type,
        subType: stockTransactions.subType,
        quantity: stockTransactions.quantity,
        unitPrice: stockTransactions.unitPrice,
        totalAmount: stockTransactions.totalAmount,
        orderNo: stockTransactions.orderNo,
        operator: stockTransactions.operator,
        supplier: stockTransactions.supplier,
        remark: stockTransactions.remark,
        transactionDate: stockTransactions.transactionDate,
        createdAt: stockTransactions.createdAt,
      })
      .from(stockTransactions)
      .leftJoin(
        products,
        eq(stockTransactions.productId, products.id),
      )
      .where(whereClause)
      .orderBy(desc(stockTransactions.transactionDate))
      .limit(pageSize)
      .offset(offset);

    const items: StockTransaction[] = rows.map(
      (row: Record<string, unknown>) => ({
        id: row.id as string,
        productId: row.productId as string,
        productName: (row.productName as string) ?? '',
        productCode: (row.productCode as string) ?? '',
        warehouse: row.warehouse as string,
        type: row.type as string,
        subType: (row.subType as string) ?? '',
        quantity: row.quantity as number,
        unitPrice: Number(row.unitPrice ?? 0),
        totalAmount: Number(row.totalAmount ?? 0),
        orderNo: (row.orderNo as string) ?? '',
        operator: (row.operator as string) ?? '',
        supplier: (row.supplier as string) ?? '',
        remark: (row.remark as string) ?? '',
        transactionDate:
          row.transactionDate instanceof Date
            ? row.transactionDate.toISOString()
            : String(row.transactionDate ?? ''),
        createdAt:
          row.createdAt instanceof Date
            ? row.createdAt.toISOString()
            : String(row.createdAt ?? ''),
      }),
    );

    return { items, total, page, pageSize };
  }

  async exportTransactions(params?: {
    type?: string;
  }): Promise<StockTransaction[]> {
    const conditions = [];
    if (params?.type) {
      conditions.push(eq(stockTransactions.type, params.type));
    }

    const whereClause =
      conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await this.db
      .select({
        id: stockTransactions.id,
        productId: stockTransactions.productId,
        productName: products.name,
        productCode: products.code,
        warehouse: stockTransactions.warehouse,
        type: stockTransactions.type,
        subType: stockTransactions.subType,
        quantity: stockTransactions.quantity,
        unitPrice: stockTransactions.unitPrice,
        totalAmount: stockTransactions.totalAmount,
        orderNo: stockTransactions.orderNo,
        operator: stockTransactions.operator,
        supplier: stockTransactions.supplier,
        remark: stockTransactions.remark,
        transactionDate: stockTransactions.transactionDate,
        createdAt: stockTransactions.createdAt,
      })
      .from(stockTransactions)
      .leftJoin(
        products,
        eq(stockTransactions.productId, products.id),
      )
      .where(whereClause)
      .orderBy(desc(stockTransactions.transactionDate));

    return rows.map((row: Record<string, unknown>) => ({
      id: row.id as string,
      productId: row.productId as string,
      productName: (row.productName as string) ?? '',
      productCode: (row.productCode as string) ?? '',
      warehouse: row.warehouse as string,
      type: row.type as string,
      subType: (row.subType as string) ?? '',
      quantity: row.quantity as number,
      unitPrice: Number(row.unitPrice ?? 0),
      totalAmount: Number(row.totalAmount ?? 0),
      orderNo: (row.orderNo as string) ?? '',
      operator: (row.operator as string) ?? '',
      supplier: (row.supplier as string) ?? '',
      remark: (row.remark as string) ?? '',
      transactionDate:
        row.transactionDate instanceof Date
          ? row.transactionDate.toISOString()
          : String(row.transactionDate ?? ''),
      createdAt:
        row.createdAt instanceof Date
          ? row.createdAt.toISOString()
          : String(row.createdAt ?? ''),
    }));
  }

  private async generateCheckNo(): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const dateStr = `${year}${month}${day}`;

    const startOfDay = new Date(year, now.getMonth(), now.getDate());
    const endOfDay = new Date(year, now.getMonth(), now.getDate() + 1);

    const rows = await this.db
      .select({ count: count() })
      .from(inventoryChecks)
      .where(
        and(
          gte(inventoryChecks.checkDate, startOfDay),
          lt(inventoryChecks.checkDate, endOfDay),
        ),
      );
    const seq = Number(rows[0]?.count ?? 0) + 1;

    return `CK-${dateStr}-${String(seq).padStart(4, '0')}`;
  }

  async createInventoryCheck(warehouse: string, userId: string) {
    const checkNo = await this.generateCheckNo();
    return this.db.transaction(async (tx) => {
      // Insert inventory check record
      const checkResult = await tx
        .insert(inventoryChecks)
        .values({ warehouse, checkNo })
        .returning();
      const check = checkResult[0];

      // Get all inventory for this warehouse
      const inventoryRows = await tx
        .select()
        .from(warehouseInventory)
        .where(eq(warehouseInventory.warehouse, warehouse));

      if (inventoryRows.length === 0) {
        const result = {
          check: {
            id: check.id,
            checkNo: check.checkNo,
            warehouse: check.warehouse,
            status: check.status,
            checkDate:
              check.checkDate instanceof Date
                ? check.checkDate.toISOString()
                : String(check.checkDate),
            createdAt:
              check.createdAt instanceof Date
                ? check.createdAt.toISOString()
                : String(check.createdAt),
          },
          items: [] as InventoryCheckItem[],
        };
        this.fireAndForgetSync('inventory_checks', check.id, 'create');
        this.fireAndForgetAuditLog('inventory_check', 'inventory_check', check.id, userId, {
          after: {
            warehouse: check.warehouse,
            status: check.status,
            itemCount: 0,
          },
        });
        return result;
      }

      // Batch fetch product info
      const productIds = inventoryRows.map((inv) => inv.productId);
      const productList = await tx
        .select()
        .from(products)
        .where(inArray(products.id, productIds));
      const productMap = new Map(
        productList.map((p) => [p.id, p]),
      );

      // Insert check items for each inventory record
      const itemsToInsert = inventoryRows.map((inv) => {
        const product = productMap.get(inv.productId);
        return {
          checkId: check.id,
          productId: inv.productId,
          systemQuantity: inv.quantity,
          actualQuantity: inv.quantity,
          difference: 0,
          remark: product ? `${product.name} - ${product.code}` : null,
        };
      });

      await tx.insert(inventoryCheckItems).values(itemsToInsert);

      // Fetch inserted items with product info
      const items = await tx
        .select({
          id: inventoryCheckItems.id,
          checkId: inventoryCheckItems.checkId,
          productId: inventoryCheckItems.productId,
          productName: products.name,
          productCode: products.code,
          location: inventoryCheckItems.location,
          systemQuantity: inventoryCheckItems.systemQuantity,
          actualQuantity: inventoryCheckItems.actualQuantity,
          difference: inventoryCheckItems.difference,
          remark: inventoryCheckItems.remark,
        })
        .from(inventoryCheckItems)
        .leftJoin(
          products,
          eq(inventoryCheckItems.productId, products.id),
        )
        .where(eq(inventoryCheckItems.checkId, check.id));

      const result = {
        check: {
          id: check.id,
          checkNo: check.checkNo,
          warehouse: check.warehouse,
          status: check.status,
          checkDate:
            check.checkDate instanceof Date
              ? check.checkDate.toISOString()
              : String(check.checkDate),
          createdAt:
            check.createdAt instanceof Date
              ? check.createdAt.toISOString()
              : String(check.createdAt),
        },
        items: items.map((item: Record<string, unknown>) => ({
          id: item.id as string,
          checkId: item.checkId as string,
          productId: item.productId as string,
          productName: (item.productName as string) ?? '',
          productCode: (item.productCode as string) ?? '',
          location: (item.location as string) ?? '',
          systemQuantity: item.systemQuantity as number,
          actualQuantity: (item.actualQuantity as number) ?? 0,
          difference: (item.difference as number) ?? 0,
          remark: (item.remark as string) ?? '',
        })),
      };
       this.fireAndForgetAuditLog('inventory_check', 'inventory_check', check.id, userId, {
         after: {
           warehouse: check.warehouse,
           status: check.status,
           itemCount: itemsToInsert.length,
         },
       });
       return result;
     });
   }

   async getInventoryCheck(checkId: string) {
    const checkRows = await this.db
      .select()
      .from(inventoryChecks)
      .where(eq(inventoryChecks.id, checkId));

    if (checkRows.length === 0) {
      throw new NotFoundException('盘点单不存在');
    }
    const checkRow = checkRows[0];

    const items = await this.db
      .select({
        id: inventoryCheckItems.id,
        checkId: inventoryCheckItems.checkId,
        productId: inventoryCheckItems.productId,
        productName: products.name,
        productCode: products.code,
        location: inventoryCheckItems.location,
        systemQuantity: inventoryCheckItems.systemQuantity,
        actualQuantity: inventoryCheckItems.actualQuantity,
        difference: inventoryCheckItems.difference,
        remark: inventoryCheckItems.remark,
      })
      .from(inventoryCheckItems)
      .leftJoin(
        products,
        eq(inventoryCheckItems.productId, products.id),
      )
      .where(eq(inventoryCheckItems.checkId, checkId));

    return {
      check: {
        id: checkRow.id,
        checkNo: checkRow.checkNo,
        warehouse: checkRow.warehouse,
        status: checkRow.status,
        checkDate:
          checkRow.checkDate instanceof Date
            ? checkRow.checkDate.toISOString()
            : String(checkRow.checkDate),
        createdAt:
          checkRow.createdAt instanceof Date
            ? checkRow.createdAt.toISOString()
            : String(checkRow.createdAt),
      },
      items: items.map((item: Record<string, unknown>) => ({
        id: item.id as string,
        checkId: item.checkId as string,
        productId: item.productId as string,
        productName: (item.productName as string) ?? '',
        productCode: (item.productCode as string) ?? '',
        location: (item.location as string) ?? '',
        systemQuantity: item.systemQuantity as number,
        actualQuantity: (item.actualQuantity as number) ?? 0,
        difference: (item.difference as number) ?? 0,
        remark: (item.remark as string) ?? '',
      })),
    };
  }

  async listInventoryChecks(params: {
    page?: number;
    pageSize?: number;
    warehouse?: string;
  }): Promise<{ items: (InventoryCheck & { itemCount: number })[]; total: number; page: number; pageSize: number }> {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 10;
    const offset = (page - 1) * pageSize;

    const conditions = [];
    if (params.warehouse) {
      conditions.push(eq(inventoryChecks.warehouse, params.warehouse));
    }
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const totalResult = await this.db
      .select({ count: count() })
      .from(inventoryChecks)
      .where(whereClause);
    const total = Number(totalResult[0].count);

    const checks = await this.db
      .select({
        id: inventoryChecks.id,
        checkNo: inventoryChecks.checkNo,
        warehouse: inventoryChecks.warehouse,
        status: inventoryChecks.status,
        checkDate: inventoryChecks.checkDate,
        createdAt: inventoryChecks.createdAt,
      })
      .from(inventoryChecks)
      .where(whereClause)
      .orderBy(desc(inventoryChecks.checkDate))
      .limit(pageSize)
      .offset(offset);

    if (checks.length === 0) {
      return { items: [], total, page, pageSize };
    }

    const checkIds = checks.map((c) => c.id);
    const itemCounts = await this.db
      .select({
        checkId: inventoryCheckItems.checkId,
        count: count(),
      })
      .from(inventoryCheckItems)
      .where(inArray(inventoryCheckItems.checkId, checkIds))
      .groupBy(inventoryCheckItems.checkId);

    const countMap = new Map(
      itemCounts.map((ic) => [ic.checkId, Number(ic.count)]),
    );

    const items = checks.map((c) => ({
      id: c.id,
      checkNo: c.checkNo,
      warehouse: c.warehouse,
      status: c.status,
      checkDate:
        c.checkDate instanceof Date
          ? c.checkDate.toISOString()
          : String(c.checkDate),
      createdAt:
        c.createdAt instanceof Date
          ? c.createdAt.toISOString()
          : String(c.createdAt),
      itemCount: countMap.get(c.id) ?? 0,
    }));

    return { items, total, page, pageSize };
  }

  async submitInventoryCheck(
    checkId: string,
    data: SubmitInventoryCheckRequest,
    userId: string,
  ) {
    return this.db.transaction(async (tx) => {
      for (const item of data.items) {
        // Get system quantity from existing record
        const existingRows = await tx
          .select({ systemQuantity: inventoryCheckItems.systemQuantity })
          .from(inventoryCheckItems)
          .where(eq(inventoryCheckItems.id, item.id));

        if (existingRows.length === 0) continue;

        const systemQty = existingRows[0].systemQuantity;
        const difference = systemQty - item.actualQuantity;

        await tx
          .update(inventoryCheckItems)
          .set({
            actualQuantity: item.actualQuantity,
            difference,
            remark: item.remark ?? null,
          })
          .where(eq(inventoryCheckItems.id, item.id));
      }

      const updated = await tx
        .update(inventoryChecks)
        .set({ status: 'completed' })
        .where(eq(inventoryChecks.id, checkId))
        .returning({ id: inventoryChecks.id });

      if (updated.length === 0) {
        throw new NotFoundException('盘点单不存在');
      }

      this.fireAndForgetSync('inventory_checks', checkId, 'update');

      this.fireAndForgetAuditLog('inventory_check', 'inventory_check', checkId, userId, {
        before: { status: 'in_progress' },
        after: { status: 'completed', submittedItemCount: data.items.length },
        changes: { status: { from: 'in_progress', to: 'completed' } },
      });

      return { success: true };
    });
  }

  async getTransfers(params?: {
    page?: number;
    pageSize?: number;
  }): Promise<{ items: Transfer[]; total: number }> {
    const page = params?.page ?? 1;
    const pageSize = params?.pageSize ?? 20;
    const offset = (page - 1) * pageSize;

    const totalResult = await this.db
      .select({ count: count() })
      .from(transfers);
    const total = Number(totalResult[0].count);

    const rows = await this.db
      .select({
        id: transfers.id,
        transferNo: transfers.transferNo,
        productId: transfers.productId,
        productName: products.name,
        productCode: products.code,
        sourceWarehouse: transfers.sourceWarehouse,
        targetWarehouse: transfers.targetWarehouse,
        quantity: transfers.quantity,
        remark: transfers.remark,
        transferDate: transfers.transferDate,
        createdAt: transfers.createdAt,
      })
      .from(transfers)
      .leftJoin(products, eq(transfers.productId, products.id))
      .orderBy(desc(transfers.transferDate))
      .limit(pageSize)
      .offset(offset);

    const items: Transfer[] = rows.map(
      (row: Record<string, unknown>) => ({
        id: row.id as string,
        transferNo: row.transferNo as string,
        productId: row.productId as string,
        productName: (row.productName as string) ?? '',
        productCode: (row.productCode as string) ?? '',
        sourceWarehouse: row.sourceWarehouse as string,
        targetWarehouse: row.targetWarehouse as string,
        quantity: row.quantity as number,
        remark: (row.remark as string) ?? '',
        transferDate:
          row.transferDate instanceof Date
            ? row.transferDate.toISOString()
            : String(row.transferDate ?? ''),
        createdAt:
          row.createdAt instanceof Date
            ? row.createdAt.toISOString()
            : String(row.createdAt ?? ''),
      }),
    );

    return { items, total };
  }
}
