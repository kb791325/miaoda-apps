import {
  Inject,
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { eq, count, desc, ilike, and, sql, gte } from 'drizzle-orm';
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from '@lark-apaas/fullstack-nestjs-core';
import { suppliers, products, stockTransactions } from '@server/database/schema';
import type {
  Supplier,
  SupplierListParams,
  SupplierListResponse,
  CreateSupplierRequest,
  UpdateSupplierRequest,
  SupplierDetail,
  SupplierProductListResponse,
  Product,
  AuditActionType,
} from '@shared/api.interface';
import { extractPostgresErrorCode } from '@server/common/utils/pg-error';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class SuppliersService {
  private readonly logger = new Logger(SuppliersService.name);

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

  private computeChanges(
    before: Record<string, unknown>,
    after: Record<string, unknown>,
  ): Record<string, unknown> {
    const changes: Record<string, unknown> = {};
    for (const key of Object.keys(after)) {
      if (before[key] !== after[key]) {
        changes[key] = { from: before[key], to: after[key] };
      }
    }
    return changes;
  }

  private mapSupplier(row: {
    id: string;
    code: string;
    name: string;
    contactPerson: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    mainCategory: string | null;
    status: string;
    remark: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): Supplier {
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      contactPerson: row.contactPerson ?? undefined,
      phone: row.phone ?? undefined,
      email: row.email ?? undefined,
      address: row.address ?? undefined,
      mainCategory: row.mainCategory ?? undefined,
      status: row.status as Supplier['status'],
      remark: row.remark ?? undefined,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private mapProduct(row: {
    id: string;
    code: string;
    name: string;
    category: string;
    brand: string | null;
    spec: string | null;
    unit: string;
    safetyStock: number;
    unitPrice: string | number;
    status: string;
    deletedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    imageUrl?: string | null;
    baseUnit?: string;
    salesUnit?: string | null;
    conversionRatio?: string | number | null;
  }): Product {
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      category: row.category,
      brand: row.brand ?? undefined,
      spec: row.spec ?? undefined,
      unit: row.unit,
      safetyStock: row.safetyStock,
      unitPrice: Number(row.unitPrice),
      status: row.status,
      shelfStatus: row.status,
      imageUrl: row.imageUrl ?? null,
      baseUnit: row.baseUnit ?? '件',
      salesUnit: row.salesUnit ?? null,
      conversionRatio:
        row.conversionRatio === null || row.conversionRatio === undefined
          ? null
          : Number(row.conversionRatio),
      deletedAt: row.deletedAt ? row.deletedAt.toISOString() : null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async findList(params: SupplierListParams): Promise<SupplierListResponse> {
    const page = params.page ?? 1;
    const pageSize = Math.min(params.pageSize ?? 20, 100);
    const offset = (page - 1) * pageSize;

    const conditions = [];
    if (params.status) {
      conditions.push(eq(suppliers.status, params.status));
    }
    if (params.keyword?.trim()) {
      const kw = `%${params.keyword.trim()}%`;
      conditions.push(
        sql`(${suppliers.code} ilike ${kw} OR ${suppliers.name} ilike ${kw} OR ${suppliers.contactPerson} ilike ${kw})`,
      );
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [listResult, countResult] = await Promise.all([
      this.db
        .select({
          id: suppliers.id,
          code: suppliers.code,
          name: suppliers.name,
          contactPerson: suppliers.contactPerson,
          phone: suppliers.phone,
          email: suppliers.email,
          address: suppliers.address,
          mainCategory: suppliers.mainCategory,
          status: suppliers.status,
          remark: suppliers.remark,
          createdAt: suppliers.createdAt,
          updatedAt: suppliers.updatedAt,
        })
        .from(suppliers)
        .where(where)
        .orderBy(desc(suppliers.createdAt))
        .limit(pageSize)
        .offset(offset),
      this.db.select({ count: count() }).from(suppliers).where(where),
    ]);

    const items: Supplier[] = listResult.map((row) => this.mapSupplier(row));

    return {
      items,
      total: Number(countResult[0]?.count ?? 0),
      page,
      pageSize,
    };
  }

  async findAllActive(): Promise<{ id: string; code: string; name: string }[]> {
    const rows = await this.db
      .select({
        id: suppliers.id,
        code: suppliers.code,
        name: suppliers.name,
      })
      .from(suppliers)
      .where(eq(suppliers.status, 'active'))
      .orderBy(suppliers.name);

    return rows.map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
    }));
  }

  async findDetail(id: string): Promise<SupplierDetail> {
    const rows = await this.db
      .select({
        id: suppliers.id,
        code: suppliers.code,
        name: suppliers.name,
        contactPerson: suppliers.contactPerson,
        phone: suppliers.phone,
        email: suppliers.email,
        address: suppliers.address,
        mainCategory: suppliers.mainCategory,
        status: suppliers.status,
        remark: suppliers.remark,
        createdAt: suppliers.createdAt,
        updatedAt: suppliers.updatedAt,
      })
      .from(suppliers)
      .where(eq(suppliers.id, id))
      .limit(1);

    if (rows.length === 0) {
      throw new NotFoundException('供应商不存在');
    }

    const supplier = this.mapSupplier(rows[0]);

    const [productRows, statRows] = await Promise.all([
      this.db
        .select({
          id: products.id,
          code: products.code,
          name: products.name,
          category: products.category,
          brand: products.brand,
          spec: products.spec,
          unit: products.unit,
          safetyStock: products.safetyStock,
          unitPrice: products.unitPrice,
          status: products.status,
          deletedAt: products.deletedAt,
          createdAt: products.createdAt,
          updatedAt: products.updatedAt,
        })
        .from(products)
        .where(
          and(eq(products.supplierId, id), eq(products.status, 'active')),
        )
        .orderBy(desc(products.createdAt)),
      this.db
        .select({
          purchaseCount: count(),
          purchaseAmount: sql<string>`COALESCE(SUM(${stockTransactions.totalAmount}), 0)`,
        })
        .from(stockTransactions)
        .where(
          and(
            eq(stockTransactions.supplier, supplier.name),
            eq(stockTransactions.type, 'inbound'),
            gte(
              stockTransactions.transactionDate,
              sql`NOW() - INTERVAL '30 days'`,
            ),
          ),
        ),
    ]);

    const productList: Product[] = productRows.map((row) =>
      this.mapProduct(row),
    );

    return {
      ...supplier,
      products: productList,
      purchaseCount: Number(statRows[0]?.purchaseCount ?? 0),
      purchaseAmount: Number(statRows[0]?.purchaseAmount ?? 0),
    };
  }

  async create(dto: CreateSupplierRequest, userId: string): Promise<Supplier> {
    if (!dto.code?.trim()) {
      throw new BadRequestException('供应商编码不能为空');
    }
    if (!dto.name?.trim()) {
      throw new BadRequestException('供应商名称不能为空');
    }

    try {
      const rows = await this.db
        .insert(suppliers)
        .values({
          code: dto.code.trim(),
          name: dto.name.trim(),
          contactPerson: dto.contactPerson?.trim() ?? null,
          phone: dto.phone?.trim() ?? null,
          email: dto.email?.trim() ?? null,
          address: dto.address?.trim() ?? null,
          mainCategory: dto.mainCategory?.trim() ?? null,
          status: dto.status ?? 'active',
          remark: dto.remark?.trim() ?? null,
          createdBy: userId,
          updatedBy: userId,
        })
        .returning({
          id: suppliers.id,
          code: suppliers.code,
          name: suppliers.name,
          contactPerson: suppliers.contactPerson,
          phone: suppliers.phone,
          email: suppliers.email,
          address: suppliers.address,
          mainCategory: suppliers.mainCategory,
          status: suppliers.status,
          remark: suppliers.remark,
          createdAt: suppliers.createdAt,
          updatedAt: suppliers.updatedAt,
        });

      this.logger.log(`供应商创建成功: ${rows[0].code}`);
      const created = this.mapSupplier(rows[0]);
      this.fireAndForgetAuditLog('create', 'supplier', created.id, userId, {
        after: { ...created },
      });
      return created;
    } catch (err: unknown) {
      if (extractPostgresErrorCode(err) === '23505') {
        throw new ConflictException('供应商编码已存在');
      }
      throw err;
    }
  }

  async update(
    id: string,
    dto: UpdateSupplierRequest,
    userId: string,
  ): Promise<Supplier> {
    const existingRows = await this.db
      .select()
      .from(suppliers)
      .where(eq(suppliers.id, id))
      .limit(1);
    if (existingRows.length === 0) {
      throw new NotFoundException('供应商不存在');
    }
    const oldSupplier = existingRows[0];

    const patch: Partial<typeof suppliers.$inferInsert> = {};

    if (dto.code !== undefined) {
      if (!dto.code.trim()) {
        throw new BadRequestException('供应商编码不能为空');
      }
      patch.code = dto.code.trim();
    }
    if (dto.name !== undefined) {
      if (!dto.name.trim()) {
        throw new BadRequestException('供应商名称不能为空');
      }
      patch.name = dto.name.trim();
    }
    if (dto.contactPerson !== undefined) {
      patch.contactPerson = dto.contactPerson.trim() ?? null;
    }
    if (dto.phone !== undefined) {
      patch.phone = dto.phone.trim() ?? null;
    }
    if (dto.email !== undefined) {
      patch.email = dto.email.trim() ?? null;
    }
    if (dto.address !== undefined) {
      patch.address = dto.address.trim() ?? null;
    }
    if (dto.mainCategory !== undefined) {
      patch.mainCategory = dto.mainCategory.trim() ?? null;
    }
    if (dto.status !== undefined) {
      patch.status = dto.status;
    }
    if (dto.remark !== undefined) {
      patch.remark = dto.remark.trim() ?? null;
    }

    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('未提供可更新字段');
    }

    patch.updatedAt = new Date();
    patch.updatedBy = userId;

    try {
      const rows = await this.db
        .update(suppliers)
        .set(patch)
        .where(eq(suppliers.id, id))
        .returning({
          id: suppliers.id,
          code: suppliers.code,
          name: suppliers.name,
          contactPerson: suppliers.contactPerson,
          phone: suppliers.phone,
          email: suppliers.email,
          address: suppliers.address,
          mainCategory: suppliers.mainCategory,
          status: suppliers.status,
          remark: suppliers.remark,
          createdAt: suppliers.createdAt,
          updatedAt: suppliers.updatedAt,
        });

      if (rows.length === 0) {
        throw new NotFoundException('供应商不存在');
      }

      this.logger.log(`供应商更新成功: ${rows[0].code}`);
      const updated = this.mapSupplier(rows[0]);
      const beforeValues: Record<string, unknown> = {};
      const afterValues: Record<string, unknown> = {};
      for (const key of Object.keys(patch)) {
        beforeValues[key] = oldSupplier[key as keyof typeof oldSupplier];
        afterValues[key] = rows[0][key as keyof typeof rows[0]];
      }
      const changes = this.computeChanges(beforeValues, afterValues);
      this.fireAndForgetAuditLog('update', 'supplier', id, userId, {
        before: beforeValues,
        after: afterValues,
        changes,
      });
      return updated;
    } catch (err: unknown) {
      if (extractPostgresErrorCode(err) === '23505') {
        throw new ConflictException('供应商编码已存在');
      }
      throw err;
    }
  }

  async remove(id: string, userId: string): Promise<{ success: true }> {
    const relatedCount = await this.db
      .select({ count: count() })
      .from(products)
      .where(eq(products.supplierId, id));

    if (Number(relatedCount[0]?.count ?? 0) > 0) {
      throw new BadRequestException('该供应商下有关联商品，无法删除');
    }

    const beforeRows = await this.db
      .select()
      .from(suppliers)
      .where(eq(suppliers.id, id))
      .limit(1);

    const rows = await this.db
      .delete(suppliers)
      .where(eq(suppliers.id, id))
      .returning({ id: suppliers.id });

    if (rows.length === 0) {
      throw new NotFoundException('供应商不存在');
    }

    this.logger.log(`供应商删除成功: ${id}`);
    if (beforeRows.length > 0) {
      this.fireAndForgetAuditLog('delete', 'supplier', id, userId, {
        before: { ...beforeRows[0] },
      });
    }
    return { success: true };
  }

  async findSupplierProducts(
    supplierId: string,
    page: number = 1,
    pageSize: number = 20,
  ): Promise<SupplierProductListResponse> {
    const actualPageSize = Math.min(pageSize, 100);
    const offset = (page - 1) * actualPageSize;

    const [listResult, countResult] = await Promise.all([
      this.db
        .select({
          id: products.id,
          code: products.code,
          name: products.name,
          category: products.category,
          brand: products.brand,
          spec: products.spec,
          unit: products.unit,
          safetyStock: products.safetyStock,
          unitPrice: products.unitPrice,
          status: products.status,
          deletedAt: products.deletedAt,
          createdAt: products.createdAt,
          updatedAt: products.updatedAt,
        })
        .from(products)
        .where(eq(products.supplierId, supplierId))
        .orderBy(desc(products.createdAt))
        .limit(actualPageSize)
        .offset(offset),
      this.db
        .select({ count: count() })
        .from(products)
        .where(eq(products.supplierId, supplierId)),
    ]);

    const items: Product[] = listResult.map((row) => this.mapProduct(row));

    return {
      items,
      total: Number(countResult[0]?.count ?? 0),
      page,
      pageSize: actualPageSize,
    };
  }
}
