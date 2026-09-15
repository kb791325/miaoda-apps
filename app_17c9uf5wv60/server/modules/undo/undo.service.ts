import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Inject,
  Logger,
} from '@nestjs/common';
import { and, eq, isNotNull, sql } from 'drizzle-orm';
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from '@lark-apaas/fullstack-nestjs-core';
import {
  products,
  stockTransactions,
  warehouseInventory,
} from '@server/database/schema';
import type { UndoRequest, UndoResponse } from '@shared/api.interface';

const UNDO_WINDOW_MS = 30 * 60 * 1000;

@Injectable()
export class UndoService {
  private readonly logger = new Logger(UndoService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  async undo(dto: UndoRequest, userId: string): Promise<UndoResponse> {
    if (dto.action === 'outbound') {
      return this.undoOutbound(dto.targetId, userId);
    }
    if (dto.action === 'product_delete') {
      return this.undoProductDelete(dto.targetId, userId);
    }
    throw new BadRequestException('不支持的撤销操作类型');
  }

  private async undoOutbound(
    transactionId: string,
    userId: string,
  ): Promise<UndoResponse> {
    const rows = await this.db
      .select()
      .from(stockTransactions)
      .where(
        and(
          eq(stockTransactions.id, transactionId),
          eq(stockTransactions.type, 'outbound'),
        ),
      )
      .limit(1);
    if (rows.length === 0) {
      throw new NotFoundException('出库记录不存在或已被撤销');
    }
    const record = rows[0];
    if (this.isExpired(record.createdAt)) {
      throw new BadRequestException('仅支持撤销最近 30 分钟内的出库操作');
    }

    await this.db.transaction(async (tx) => {
      const restored = await tx
        .update(warehouseInventory)
        .set({
          quantity: sql`${warehouseInventory.quantity} + ${record.quantity}`,
          stockValue: sql`${warehouseInventory.stockValue} + ${Number(record.totalAmount ?? 0)}`,
        })
        .where(
          and(
            eq(warehouseInventory.productId, record.productId),
            eq(warehouseInventory.warehouse, record.warehouse),
          ),
        )
        .returning({ id: warehouseInventory.id });
      if (restored.length === 0) {
        throw new NotFoundException('对应仓库库存记录不存在，无法撤销');
      }
      const deleted = await tx
        .delete(stockTransactions)
        .where(eq(stockTransactions.id, transactionId))
        .returning({ id: stockTransactions.id });
      if (deleted.length === 0) {
        throw new NotFoundException('出库记录不存在或已被撤销');
      }
    });

    this.logger.log(
      `出库已撤销: ${transactionId}, 商品 ${record.productId}, 数量 ${record.quantity}, 操作人 ${userId}`,
    );
    return {
      success: true,
      message: `已撤销出库 ${record.quantity} 件，库存已恢复`,
    };
  }

  private async undoProductDelete(
    productId: string,
    userId: string,
  ): Promise<UndoResponse> {
    const rows = await this.db
      .select({
        id: products.id,
        name: products.name,
        deletedAt: products.deletedAt,
      })
      .from(products)
      .where(and(eq(products.id, productId), isNotNull(products.deletedAt)))
      .limit(1);
    if (rows.length === 0) {
      throw new NotFoundException('商品未被删除或已恢复');
    }
    const record = rows[0];
    if (record.deletedAt && this.isExpired(record.deletedAt)) {
      throw new BadRequestException('仅支持撤销最近 30 分钟内的删除操作');
    }

    await this.db.transaction(async (tx) => {
      await tx
        .update(products)
        .set({ deletedAt: null, deletedBy: null })
        .where(eq(products.id, productId));
      await tx
        .update(warehouseInventory)
        .set({ status: 'active' })
        .where(eq(warehouseInventory.productId, productId));
    });

    this.logger.log(`商品删除已撤销: ${productId}, 操作人 ${userId}`);
    return { success: true, message: `已恢复商品「${record.name}」` };
  }

  private isExpired(time: Date): boolean {
    return Date.now() - time.getTime() > UNDO_WINDOW_MS;
  }
}
