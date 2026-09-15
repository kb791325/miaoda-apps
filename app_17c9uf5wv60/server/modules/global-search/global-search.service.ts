import { Injectable, Inject } from '@nestjs/common';
import { and, desc, isNull, ilike, or } from 'drizzle-orm';
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from '@lark-apaas/fullstack-nestjs-core';
import { products, salesOrders, suppliers } from '@server/database/schema';
import type {
  GlobalSearchProductHit,
  GlobalSearchOrderHit,
  GlobalSearchResponse,
  GlobalSearchSupplierHit,
} from '@shared/api.interface';

const HIT_LIMIT = 5;

@Injectable()
export class GlobalSearchService {
  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  async search(keyword: string): Promise<GlobalSearchResponse> {
    const trimmed: string = keyword.trim();
    if (!trimmed) {
      return { products: [], salesOrders: [], suppliers: [] };
    }
    const pattern: string = `%${trimmed}%`;

    const [productRows, orderRows, supplierRows] = await Promise.all([
      this.db
        .select({
          id: products.id,
          code: products.code,
          name: products.name,
          category: products.category,
          shelfStatus: products.status,
        })
        .from(products)
        .where(
          and(
            isNull(products.deletedAt),
            or(ilike(products.name, pattern), ilike(products.code, pattern)),
          ),
        )
        .orderBy(products.code)
        .limit(HIT_LIMIT),
      this.db
        .select({
          id: salesOrders.id,
          orderNo: salesOrders.orderNo,
          customerName: salesOrders.customerName,
          totalAmount: salesOrders.totalAmount,
          status: salesOrders.status,
        })
        .from(salesOrders)
        .where(
          or(
            ilike(salesOrders.orderNo, pattern),
            ilike(salesOrders.customerName, pattern),
          ),
        )
        .orderBy(desc(salesOrders.createdAt))
        .limit(HIT_LIMIT),
      this.db
        .select({
          id: suppliers.id,
          code: suppliers.code,
          name: suppliers.name,
          contactPerson: suppliers.contactPerson,
          mainCategory: suppliers.mainCategory,
          status: suppliers.status,
        })
        .from(suppliers)
        .where(
          or(
            ilike(suppliers.name, pattern),
            ilike(suppliers.contactPerson, pattern),
          ),
        )
        .orderBy(suppliers.code)
        .limit(HIT_LIMIT),
    ]);

    const hitProducts: GlobalSearchProductHit[] = productRows.map(
      (row): GlobalSearchProductHit => ({
        id: row.id,
        code: row.code,
        name: row.name,
        category: row.category,
        shelfStatus: row.shelfStatus,
      }),
    );
    const hitOrders: GlobalSearchOrderHit[] = orderRows.map(
      (row): GlobalSearchOrderHit => ({
        id: row.id,
        orderNo: row.orderNo,
        customerName: row.customerName,
        totalAmount: Number(row.totalAmount),
        status: row.status,
      }),
    );
    const hitSuppliers: GlobalSearchSupplierHit[] = supplierRows.map(
      (row): GlobalSearchSupplierHit => ({
        id: row.id,
        code: row.code,
        name: row.name,
        contactPerson: row.contactPerson ?? '',
        mainCategory: row.mainCategory ?? '',
        status: row.status,
      }),
    );

    return {
      products: hitProducts,
      salesOrders: hitOrders,
      suppliers: hitSuppliers,
    };
  }
}
