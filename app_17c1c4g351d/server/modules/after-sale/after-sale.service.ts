import {
  Injectable,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from '@lark-apaas/fullstack-nestjs-core';
import { eq } from 'drizzle-orm';
import { afterSaleOrder } from '../../database/schema';
import type {
  AfterSaleOrder,
  AfterSaleCreateRequest,
  ReasonCategory,
  RefundRateTrend,
} from '@shared/api.interface';

const ALL_REASONS = ['质量问题', '物流问题', '描述不符', '七天无理由', '其他'];

function generateOrderNo(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const rand = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  return `AS${y}${m}${d}${rand}`;
}

function mapRow(row: typeof afterSaleOrder.$inferSelect): AfterSaleOrder {
  return {
    id: row.id,
    orderNo: row.orderNo,
    productId: row.productId,
    productName: row.productName,
    reason: row.reason,
    handleType: (row.handleType as 'refund' | 'compensation') ?? 'refund',
    refundAmount: Number(row.refundAmount),
    compensationAmount: Number(row.compensationAmount ?? 0),
    status: row.status,
    processDuration: Number(row.processDuration),
    isOverdue: row.isOverdue,
  };
}

@Injectable()
export class AfterSaleService {
  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  async findAll(): Promise<{
    orders: AfterSaleOrder[];
    reasonCategories: ReasonCategory[];
    refundRateTrend: RefundRateTrend[];
  }> {
    const rows = await this.db.select().from(afterSaleOrder);

    const orders: AfterSaleOrder[] = rows.map(mapRow);

    const reasonCountMap = new Map<string, number>();
    for (const r of ALL_REASONS) {
      reasonCountMap.set(r, 0);
    }
      for (const order of orders) {
      const current = reasonCountMap.get(order.reason.trim()) ?? 0;
      reasonCountMap.set(order.reason.trim(), current + 1);
    }
    const reasonCategories: ReasonCategory[] = ALL_REASONS.map((reason) => ({
      reason,
      count: reasonCountMap.get(reason) ?? 0,
    }));

    const refundRateTrend: RefundRateTrend[] = [
      { date: '01-09', rate: 4.2 },
      { date: '01-10', rate: 4.8 },
      { date: '01-11', rate: 5.1 },
      { date: '01-12', rate: 4.5 },
      { date: '01-13', rate: 5.8 },
      { date: '01-14', rate: 6.2 },
      { date: '01-15', rate: 5.5 },
    ];

    return { orders, reasonCategories, refundRateTrend };
  }

  async create(
    req: AfterSaleCreateRequest,
    userId: string,
  ): Promise<AfterSaleOrder> {
    const orderNo = generateOrderNo();

    const inserted = await this.db
      .insert(afterSaleOrder)
      .values({
        orderNo,
        productId: req.productId,
        productName: req.productName.trim(),
        reason: req.reason.trim(),
        handleType: req.handleType,
        refundAmount: String(req.refundAmount),
        compensationAmount: String(req.compensationAmount ?? 0),
        status: '待处理',
        processDuration: '0',
        isOverdue: false,
        createdBy: userId,
        updatedBy: userId,
      })
      .returning();

    return mapRow(inserted[0]);
  }

  async updateStatus(
    id: string,
    status: '处理中' | '已完成' | '已拒绝',
    userId: string,
  ): Promise<AfterSaleOrder> {
    const existing = await this.db
      .select()
      .from(afterSaleOrder)
      .where(eq(afterSaleOrder.id, id));
    if (existing.length === 0) {
      throw new NotFoundException('工单不存在');
    }

    const row = existing[0];
    const patch: Partial<typeof afterSaleOrder.$inferInsert> = {
      status,
      updatedBy: userId,
    };

    if (status === '处理中' && row.status === '待处理') {
      const now = new Date();
      const startTs = row.createdAt.getTime();
      const hours = Math.max(0, (now.getTime() - startTs) / 3600000);
      patch.processDuration = String(Math.round(hours * 10) / 10);
      patch.isOverdue = hours > 24;
    }

    if ((status === '已完成' || status === '已拒绝') && row.status === '处理中') {
      const startTs = row.createdAt.getTime();
      const now = new Date();
      const hours = Math.max(0, (now.getTime() - startTs) / 3600000);
      patch.processDuration = String(Math.round(hours * 10) / 10);
      patch.isOverdue = hours > 24;
    }

    const updated = await this.db
      .update(afterSaleOrder)
      .set(patch)
      .where(eq(afterSaleOrder.id, id))
      .returning();

    return mapRow(updated[0]);
  }
}
