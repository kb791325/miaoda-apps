import { Injectable, Inject, BadRequestException, NotFoundException } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { eq } from 'drizzle-orm';
import { product, inventory } from '../../database/schema';
import type { Product, CreateProductRequest } from '@shared/api.interface';

@Injectable()
export class ProductService {
  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  private mapRow(row: typeof product.$inferSelect): Product {
    return {
      id: row.id,
      name: row.name,
      category: row.category,
      price: Number(row.price),
      cost: Number(row.cost),
      shippingCost: Number(row.shippingCost),
      refundLossRate: Number(row.refundLossRate),
      salesVolume: row.salesVolume,
      salesAmount: Number(row.salesAmount),
      profit: Number(row.profit),
      profitMargin: Number(row.profitMargin),
      conversionRate: Number(row.conversionRate),
      status: row.status,
      daysZeroSales: row.daysZeroSales,
    };
  }

  async findAll(): Promise<Product[]> {
    const rows = await this.db.select().from(product);
    return rows.map((row) => this.mapRow(row));
  }

  async create(dto: CreateProductRequest): Promise<Product> {
    if (!dto.name?.trim()) {
      throw new BadRequestException('商品名称不能为空');
    }
    if (dto.price <= 0 || dto.cost <= 0) {
      throw new BadRequestException('售价和成本必须大于0');
    }

    const commission = dto.price * 0.05;
    const refundLoss = dto.price * 0.03;
    const unitProfit = dto.price - dto.cost - commission - dto.shippingCost - refundLoss;
    const margin = dto.price > 0 ? (unitProfit / dto.price) * 100 : 0;

    const [row] = await this.db
      .insert(product)
      .values({
        name: dto.name.trim(),
        category: dto.category || '未分类',
        price: String(dto.price),
        cost: String(dto.cost),
        shippingCost: String(dto.shippingCost || 0),
        refundLossRate: '3',
        status: dto.status || '潜力款',
        profitMargin: String(Math.round(margin * 10) / 10),
      })
      .returning();

    await this.db.insert(inventory).values({
      productId: row.id,
      productName: row.name,
      category: row.category,
      currentStock: 0,
      safetyStock: 50,
      avgDailySales7d: '0',
      avgDailySales30d: '0',
      daysAvailable: 0,
      suggestedRestock: 100,
      isSlowMoving: true,
      stockValue: '0',
    });

    return this.mapRow(row);
  }

  async remove(id: string): Promise<void> {
    if (!id) {
      throw new BadRequestException('缺少商品 ID');
    }
    const deleted = await this.db
      .delete(product)
      .where(eq(product.id, id))
      .returning({ id: product.id });
    if (deleted.length === 0) {
      throw new NotFoundException('商品不存在');
    }
    await this.db.delete(inventory).where(eq(inventory.productId, id));
  }
}
