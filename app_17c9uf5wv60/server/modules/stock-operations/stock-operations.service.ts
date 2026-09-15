import {
  Injectable,
  Inject,
  Logger,
  ConflictException,
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
} from '@server/database/schema';
import { eq, and, gte, lt, count, sql } from 'drizzle-orm';
import type {
  InboundRequest,
  InboundResponse,
  OutboundRequest,
  OutboundResponse,
  TransferRequest,
  TransferResponse,
  AuditActionType,
} from '@shared/api.interface';
import { SyncService } from '../sync/sync.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class StockOperationsService {
  private readonly logger = new Logger(StockOperationsService.name);

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

  private async generateOrderNo(
    type: 'inbound' | 'outbound',
  ): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const dateStr = `${year}${month}${day}`;

    const startOfDay = new Date(year, now.getMonth(), now.getDate());
    const endOfDay = new Date(year, now.getMonth(), now.getDate() + 1);

    const rows = await this.db
      .select({ count: count() })
      .from(stockTransactions)
      .where(
        and(
          gte(stockTransactions.transactionDate, startOfDay),
          lt(stockTransactions.transactionDate, endOfDay),
        ),
      );
    const seq = Number(rows[0]?.count ?? 0) + 1;

    return `SO-${dateStr}-${String(seq).padStart(4, '0')}`;
  }

  private generateTransferNo(): string {
    return `TR${Date.now()}`;
  }

  private syncTransactionAndInventory(
    txId: string,
    productId: string,
    warehouse: string,
  ): void {
    this.fireAndForgetSync('transactions', txId, 'create');
    this.db
      .select({ id: warehouseInventory.id })
      .from(warehouseInventory)
      .where(
        and(
          eq(warehouseInventory.productId, productId),
          eq(warehouseInventory.warehouse, warehouse),
        ),
      )
      .then((rows) => {
        if (rows.length > 0) {
          this.fireAndForgetSync('warehouse_inventory', rows[0].id, 'update');
        }
      })
      .catch((err: unknown) => {
        this.logger.warn(`查仓库库存用于同步失败: ${String(err)}`);
      });
  }

  async inbound(dto: InboundRequest, userId: string): Promise<InboundResponse> {
    const orderNo = dto.orderNo && dto.orderNo.trim()
      ? dto.orderNo
      : await this.generateOrderNo('inbound');

    return this.db.transaction(async (tx) => {
      const existing = await tx
        .select()
        .from(warehouseInventory)
        .where(
          and(
            eq(warehouseInventory.productId, dto.productId),
            eq(warehouseInventory.warehouse, dto.warehouse),
          ),
        );

      const productRows = await tx
        .select()
        .from(products)
        .where(eq(products.id, dto.productId));
      if (productRows.length === 0) {
        throw new NotFoundException('商品不存在');
      }
      const product = productRows[0];
      const productUnitPrice = Number(product.unitPrice);
      const effectiveUnitPrice: number = Number.isFinite(dto.unitPrice)
        ? dto.unitPrice
        : productUnitPrice;
      const totalAmount = dto.quantity * effectiveUnitPrice;

      if (existing.length === 0) {
        await tx.insert(warehouseInventory).values({
          productId: dto.productId,
          warehouse: dto.warehouse,
          quantity: dto.quantity,
          stockValue: String(dto.quantity * productUnitPrice),
        });
      } else {
        const inv = existing[0];
        const newQuantity = inv.quantity + dto.quantity;
        const updated = await tx
          .update(warehouseInventory)
          .set({
            quantity: newQuantity,
            stockValue: String(newQuantity * productUnitPrice),
          })
          .where(eq(warehouseInventory.id, inv.id))
          .returning({ id: warehouseInventory.id });
        if (updated.length === 0) {
          throw new NotFoundException('库存记录不存在');
        }
      }

      const inserted = await tx.insert(stockTransactions).values({
        productId: dto.productId,
        warehouse: dto.warehouse,
        type: 'inbound',
        subType: dto.subType ?? '采购入库',
        quantity: dto.quantity,
        unitPrice: String(effectiveUnitPrice),
        totalAmount: String(totalAmount),
        orderNo,
        operator: dto.operator,
        supplier: null,
        remark: dto.remark ?? null,
      }).returning({ id: stockTransactions.id });

      if (inserted.length > 0) {
        this.fireAndForgetSync('transactions', inserted[0].id, 'create');
      }

      this.fireAndForgetAuditLog('inbound', 'stock_operation', inserted[0]?.id ?? '', userId, {
        after: {
          productId: dto.productId,
          warehouse: dto.warehouse,
          quantity: dto.quantity,
          orderNo,
          operator: dto.operator,
          subType: dto.subType ?? '采购入库',
        },
      });

      return { success: true, docNo: orderNo };
    });
  }

  async outbound(dto: OutboundRequest, userId: string): Promise<OutboundResponse> {
    const productRows = await this.db
      .select()
      .from(products)
      .where(eq(products.id, dto.productId));
    if (productRows.length === 0) {
      throw new NotFoundException('商品不存在');
    }
    const product = productRows[0];
    const productUnitPrice = Number(product.unitPrice);

    const orderNo = dto.orderNo && dto.orderNo.trim()
      ? dto.orderNo
      : await this.generateOrderNo('outbound');

    return this.db.transaction(async (tx) => {
      const currentInv = await tx
        .select()
        .from(warehouseInventory)
        .where(
          and(
            eq(warehouseInventory.productId, dto.productId),
            eq(warehouseInventory.warehouse, dto.warehouse),
          ),
        );
      if (currentInv.length === 0) {
        throw new ConflictException('库存记录不存在');
      }
      const inv = currentInv[0];

      if (dto.quantity > inv.quantity) {
        throw new ConflictException(
          `库存不足，当前库存 ${inv.quantity}，请求出库 ${dto.quantity}`,
        );
      }

      const newQuantity = inv.quantity - dto.quantity;
      const warning = newQuantity < product.safetyStock;

      if (!dto.confirm && warning) {
        return { success: true, warning: true };
      }

      const updated = await tx
        .update(warehouseInventory)
        .set({
          quantity: sql`${warehouseInventory.quantity} - ${dto.quantity}`,
          stockValue: sql`${warehouseInventory.stockValue} - ${dto.quantity * productUnitPrice}`,
        })
        .where(
          and(
            eq(warehouseInventory.id, inv.id),
            gte(warehouseInventory.quantity, dto.quantity),
          ),
        )
        .returning({ id: warehouseInventory.id });
      if (updated.length === 0) {
        throw new ConflictException(
          `库存不足，当前库存 ${inv.quantity}，请求出库 ${dto.quantity}`,
        );
      }

      const totalAmount = dto.quantity * productUnitPrice;
      const inserted = await tx.insert(stockTransactions).values({
        productId: dto.productId,
        warehouse: dto.warehouse,
        type: 'outbound',
        subType: dto.subType,
        quantity: dto.quantity,
        unitPrice: String(productUnitPrice),
        totalAmount: String(totalAmount),
        orderNo,
        operator: dto.operator || userId,
        remark: dto.remark ?? null,
      }).returning({ id: stockTransactions.id });

      if (inserted.length > 0) {
        this.fireAndForgetSync('transactions', inserted[0].id, 'create');
      }

      this.fireAndForgetAuditLog('outbound', 'stock_operation', inserted[0]?.id ?? '', userId, {
        after: {
          productId: dto.productId,
          warehouse: dto.warehouse,
          quantity: dto.quantity,
          orderNo,
          operator: dto.operator || userId,
          subType: dto.subType,
        },
      });

      return {
        success: true,
        warning: false,
        docNo: orderNo,
        transactionId: inserted[0]?.id,
      };
    });
  }

  async transfer(dto: TransferRequest, userId: string): Promise<TransferResponse> {
    const transferNo = this.generateTransferNo();

    return this.db.transaction(async (tx) => {
      // Check source warehouse inventory
      const sourceRows = await tx
        .select()
        .from(warehouseInventory)
        .where(
          and(
            eq(warehouseInventory.productId, dto.productId),
            eq(warehouseInventory.warehouse, dto.sourceWarehouse),
          ),
        );

      if (sourceRows.length === 0) {
        throw new ConflictException('源仓库库存记录不存在');
      }
      const source = sourceRows[0];

      if (dto.quantity > source.quantity) {
        throw new ConflictException(
          `源仓库库存不足，当前库存 ${source.quantity}，请求调拨 ${dto.quantity}`,
        );
      }

      // Get product info for stockValue calculation
      const productRows = await tx
        .select()
        .from(products)
        .where(eq(products.id, dto.productId));
      if (productRows.length === 0) {
        throw new NotFoundException('商品不存在');
      }
      const productUnitPrice = Number(productRows[0].unitPrice);

      // Update source warehouse (atomic condition check to prevent TOCTOU)
      const sourceUpdated = await tx
        .update(warehouseInventory)
        .set({
          quantity: sql`${warehouseInventory.quantity} - ${dto.quantity}`,
          stockValue: sql`${warehouseInventory.stockValue} - ${dto.quantity * productUnitPrice}`,
        })
        .where(
          and(
            eq(warehouseInventory.id, source.id),
            gte(warehouseInventory.quantity, dto.quantity),
          ),
        )
        .returning({ id: warehouseInventory.id });
      if (sourceUpdated.length === 0) {
        throw new ConflictException(
          `源仓库库存不足，当前库存 ${source.quantity}，请求调拨 ${dto.quantity}`,
        );
      }

      // Check or create target warehouse inventory
      const targetRows = await tx
        .select()
        .from(warehouseInventory)
        .where(
          and(
            eq(warehouseInventory.productId, dto.productId),
            eq(warehouseInventory.warehouse, dto.targetWarehouse),
          ),
        );

      if (targetRows.length === 0) {
        await tx.insert(warehouseInventory).values({
          productId: dto.productId,
          warehouse: dto.targetWarehouse,
          quantity: dto.quantity,
          stockValue: String(dto.quantity * productUnitPrice),
        });
      } else {
        const target = targetRows[0];
        const newTargetQty = target.quantity + dto.quantity;
        const targetUpdated = await tx
          .update(warehouseInventory)
          .set({
            quantity: newTargetQty,
            stockValue: String(newTargetQty * productUnitPrice),
          })
          .where(eq(warehouseInventory.id, target.id))
          .returning({ id: warehouseInventory.id });
        if (targetUpdated.length === 0) {
          throw new NotFoundException('目标仓库库存记录不存在');
        }
      }

      // Insert transfer record
      const transferInserted = await tx.insert(transfers).values({
        transferNo,
        productId: dto.productId,
        sourceWarehouse: dto.sourceWarehouse,
        targetWarehouse: dto.targetWarehouse,
        quantity: dto.quantity,
        remark: dto.remark ?? null,
      }).returning({ id: transfers.id });

      // Insert two stock transactions (source outbound + target inbound)
      const txInserted = await tx.insert(stockTransactions).values([
        {
          productId: dto.productId,
          warehouse: dto.sourceWarehouse,
          type: 'outbound',
          subType: '调拨出库',
          quantity: dto.quantity,
          unitPrice: String(productUnitPrice),
          totalAmount: String(dto.quantity * productUnitPrice),
          operator: userId,
          remark: `调拨至 ${dto.targetWarehouse}`,
        },
        {
          productId: dto.productId,
          warehouse: dto.targetWarehouse,
          type: 'inbound',
          subType: '调拨入库',
          quantity: dto.quantity,
          unitPrice: String(productUnitPrice),
          totalAmount: String(dto.quantity * productUnitPrice),
          operator: userId,
          remark: `从 ${dto.sourceWarehouse} 调拨`,
        },
      ]).returning({ id: stockTransactions.id });

      if (transferInserted.length > 0) {
        this.fireAndForgetSync('transfers', transferInserted[0].id, 'create');
      }
      for (const row of txInserted) {
        this.fireAndForgetSync('transactions', row.id, 'create');
      }
      this.fireAndForgetAuditLog('transfer', 'stock_transfer', transferInserted[0]?.id ?? '', userId, {
        after: {
          productId: dto.productId,
          sourceWarehouse: dto.sourceWarehouse,
          targetWarehouse: dto.targetWarehouse,
          quantity: dto.quantity,
          transferNo,
          remark: dto.remark ?? '',
        },
      });
      this.syncTransactionAndInventory(
        txInserted[0]?.id ?? '',
        dto.productId,
        dto.sourceWarehouse,
      );
      this.syncTransactionAndInventory(
        txInserted[1]?.id ?? '',
        dto.productId,
        dto.targetWarehouse,
      );

      return { success: true, docNo: transferNo };
    });
  }
}
