import { Injectable, BadRequestException, NotFoundException, ConflictException, Inject } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { eq, sql, ilike } from 'drizzle-orm';
import { inventory } from '../../database/schema';
import type {
  InventoryItem,
  InventoryChangeRequest,
  InventoryBatchChangeItem,
  InventoryBatchChangeResult,
} from '@shared/api.interface';

@Injectable()
export class InventoryService {
  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  async findAll(): Promise<InventoryItem[]> {
    const rows = await this.db.select().from(inventory);
    return rows.map((row) => this.toInventoryItem(row));
  }

  async change(
    req: InventoryChangeRequest,
    userId: string,
  ): Promise<{ item: InventoryItem; message: string }> {
    const productName = req.productName.trim();
    const quantity = Math.round(req.quantity);

    if (!productName) {
      throw new BadRequestException('请输入商品名称');
    }
    if (quantity <= 0) {
      throw new BadRequestException('库存数量必须大于 0');
    }

    const existing = await this.db
      .select()
      .from(inventory)
      .where(ilike(inventory.productName, productName))
      .limit(1);

    if (existing.length > 0) {
      const row = existing[0];
      if (req.direction === 'out' && row.currentStock < quantity) {
        throw new ConflictException(
          `库存不足，当前库存 ${row.currentStock}，无法出库 ${quantity}`,
        );
      }

      const newStock =
        req.direction === 'in'
          ? row.currentStock + quantity
          : row.currentStock - quantity;

      const avg7d = Number(row.avgDailySales7d);
      const daysAvailable = avg7d > 0 ? Math.round(newStock / avg7d) : 365;
      const suggestedRestock =
        newStock < row.safetyStock ? Math.round(row.safetyStock * 2) : 0;
      const unitPrice = row.currentStock > 0 ? Number(row.stockValue) / row.currentStock : 0;
      const newStockValue = String(Math.round(newStock * unitPrice));

      const updated = await this.db
        .update(inventory)
        .set({
          currentStock: newStock,
          daysAvailable,
          suggestedRestock,
          isSlowMoving: daysAvailable > 60,
          stockValue: newStockValue,
          updatedAt: new Date(),
          updatedBy: userId,
        })
        .where(eq(inventory.id, row.id))
        .returning();

      if (updated.length === 0) {
        throw new NotFoundException('商品不存在');
      }

      const message = `${req.direction === 'in' ? '入库' : '出库'}成功：${productName} ${req.direction === 'in' ? '+' : '-'}${quantity}`;
      return { item: this.toInventoryItem(updated[0]), message };
    }

    if (req.direction === 'out') {
      throw new BadRequestException('该商品不存在，无法出库');
    }

    const countResult = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(inventory);
    const nextNum = (countResult[0]?.count ?? 0) + 1;

    const inserted = await this.db
      .insert(inventory)
      .values({
        productId: `P${String(nextNum).padStart(3, '0')}`,
        productName,
        category: req.category,
        currentStock: quantity,
        safetyStock: Math.round(quantity * 0.3),
        avgDailySales7d: '0',
        avgDailySales30d: '0',
        daysAvailable: 365,
        suggestedRestock: 0,
        isSlowMoving: false,
        stockValue: '0',
        createdBy: userId,
        updatedBy: userId,
      })
      .returning();

    const message = `已新增商品「${productName}」，入库 ${quantity} 件`;
    return { item: this.toInventoryItem(inserted[0]), message };
  }

  async batchChange(
    items: InventoryBatchChangeItem[],
    userId: string,
  ): Promise<{ results: InventoryBatchChangeResult[]; successCount: number; failedCount: number }> {
    if (!items || items.length === 0) {
      throw new BadRequestException('批量调整列表不能为空');
    }
    if (items.length > 50) {
      throw new BadRequestException('单次批量调整不能超过 50 条');
    }

    const results: InventoryBatchChangeResult[] = [];
    for (const item of items) {
      try {
        const found = await this.db
          .select()
          .from(inventory)
          .where(eq(inventory.productId, item.productId))
          .limit(1);
        if (found.length === 0) {
          results.push({
            productId: item.productId,
            productName: item.productId,
            success: false,
            message: '商品不存在',
          });
          continue;
        }
        const res = await this.change(
          {
            productName: found[0].productName,
            category: found[0].category,
            quantity: item.quantity,
            direction: item.direction,
          },
          userId,
        );
        results.push({
          productId: item.productId,
          productName: res.item.productName,
          success: true,
          message: res.message,
          newStock: res.item.currentStock,
        });
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : '调整失败';
        results.push({
          productId: item.productId,
          productName: item.productId,
          success: false,
          message: msg,
        });
      }
    }
    const successCount = results.filter((r) => r.success).length;
    return { results, successCount, failedCount: results.length - successCount };
  }

  async remove(id: string): Promise<void> {
    if (!id) {
      throw new BadRequestException('缺少库存记录 ID');
    }
    const deleted = await this.db
      .delete(inventory)
      .where(eq(inventory.id, id))
      .returning({ id: inventory.id });
    if (deleted.length === 0) {
      throw new NotFoundException('库存记录不存在');
    }
  }

  private toInventoryItem(row: typeof inventory.$inferSelect): InventoryItem {
    return {
      id: row.id,
      productId: row.productId,
      productName: row.productName,
      category: row.category,
      currentStock: row.currentStock,
      safetyStock: row.safetyStock,
      avgDailySales7d: Number(row.avgDailySales7d),
      avgDailySales30d: Number(row.avgDailySales30d),
      daysAvailable: row.daysAvailable,
      suggestedRestock: row.suggestedRestock,
      isSlowMoving: row.isSlowMoving,
      stockValue: Number(row.stockValue),
    };
  }
}
