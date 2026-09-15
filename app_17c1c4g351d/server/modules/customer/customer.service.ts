import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { customer, repurchaseTrend } from '../../database/schema';
import type {
  Customer,
  RfmDistribution,
  RepurchaseTrend,
  CustomerResponse,
} from '@shared/api.interface';

@Injectable()
export class CustomerService {
  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  async findAll(): Promise<CustomerResponse> {
    const rows = await this.db.select().from(customer);

    const customers: Customer[] = rows.map((row) => ({
      id: row.id,
      customerCode: row.customerCode,
      firstPurchaseDate: row.firstPurchaseDate,
      totalSpent: Number(row.totalSpent),
      purchaseCount: row.purchaseCount,
      lastPurchaseDate: row.lastPurchaseDate,
      rfmScore: row.rfmScore,
      tag: row.tag,
    }));

    // Derive rfmDistribution by grouping customers by tag
    const tagCountMap = new Map<string, number>();
    for (const c of customers) {
      tagCountMap.set(c.tag, (tagCountMap.get(c.tag) ?? 0) + 1);
    }
    const rfmDistribution: RfmDistribution[] = Array.from(
      tagCountMap.entries(),
    ).map(([tag, count]) => ({ tag, count }));

    // Query repurchase trend
    const trendRows = await this.db.select().from(repurchaseTrend);
    const repurchaseTrendData: RepurchaseTrend[] = trendRows.map((row) => ({
      id: row.id,
      month: row.month,
      rate: Number(row.rate),
    }));

    return { customers, rfmDistribution, repurchaseTrend: repurchaseTrendData };
  }
}
