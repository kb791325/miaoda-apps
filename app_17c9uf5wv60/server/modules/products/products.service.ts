import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import type { AuditActionType } from '@shared/api.interface';
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from '@lark-apaas/fullstack-nestjs-core';
import {
  eq,
  and,
  or,
  ilike,
  inArray,
  desc,
  isNull,
  isNotNull,
  sql,
} from 'drizzle-orm';
import {
  products,
  warehouseInventory,
  stockTransactions,
  transfers,
  inventoryCheckItems,
  inventoryChecks,
} from '@server/database/schema';
import type {
  Product,
  ProductWithInventory,
  WarehouseInventoryItem,
  CreateProductRequest,
  UpdateProductRequest,
  ArchivedProduct,
  ArchivedProductDetail,
  StockTransaction,
  Transfer,
  InventoryCheck,
  InventoryCheckItem,
  BatchImportItem,
  BatchImportResult,
} from '@shared/api.interface';
import { SyncService } from '../sync/sync.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

const WAREHOUSES = ['北京仓', '上海仓', '广州仓', '成都仓'];

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

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

  private async mapInventory(
    productList: typeof products.$inferSelect[],
  ): Promise<ProductWithInventory[]> {
    if (productList.length === 0) return [];

    const productIds = productList.map(
      (p: typeof products.$inferSelect) => p.id,
    );
    const allInventory = await this.db
      .select()
      .from(warehouseInventory)
      .where(inArray(warehouseInventory.productId, productIds));

    const inventoryMap = new Map<string, WarehouseInventoryItem[]>();
    for (const inv of allInventory) {
      const item: WarehouseInventoryItem = {
        warehouse: inv.warehouse,
        quantity: inv.quantity,
        stockValue: Number(inv.stockValue),
      };
      const existing = inventoryMap.get(inv.productId) ?? [];
      inventoryMap.set(inv.productId, [...existing, item]);
    }

    return productList.map((p) => {
      const inventory = inventoryMap.get(p.id) ?? [];
      const totalQuantity = inventory.reduce(
        (sum: number, i: WarehouseInventoryItem) => sum + i.quantity,
        0,
      );
      const totalValue = inventory.reduce(
        (sum: number, i: WarehouseInventoryItem) => sum + i.stockValue,
        0,
      );
      return {
        id: p.id,
        code: p.code,
        name: p.name,
        category: p.category,
        brand: p.brand ?? '',
        spec: p.spec ?? '',
        unit: p.unit,
        safetyStock: p.safetyStock,
        unitPrice: Number(p.unitPrice),
        status: p.status,
        stockStatus:
          totalQuantity === 0
            ? 'shortage'
            : totalQuantity < p.safetyStock
              ? 'warning'
              : 'normal',
        shelfStatus: p.status,
        imageUrl: p.imageUrl ?? null,
        baseUnit: p.baseUnit,
        salesUnit: p.salesUnit ?? null,
        conversionRatio:
          p.conversionRatio === null ? null : Number(p.conversionRatio),
        deletedAt: p.deletedAt ? p.deletedAt.toISOString() : null,
        deletedBy: p.deletedBy ?? null,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
        inventory,
        totalQuantity,
        totalValue,
      };
    });
  }

  async listProducts(params: {
    page?: number;
    pageSize?: number;
    category?: string;
    status?: string;
    keyword?: string;
    maxStock?: number;
    sortBy?: string;
  }): Promise<{
    items: ProductWithInventory[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 10;

    const conditions = [isNull(products.deletedAt)];
    if (params.category) {
      conditions.push(eq(products.category, params.category));
    }
    if (params.keyword) {
      conditions.push(
        or(
          ilike(products.name, `%${params.keyword}%`),
          ilike(products.code, `%${params.keyword}%`),
        ),
      );
    }

    const whereClause = and(...conditions);

    const productList = await this.db
      .select()
      .from(products)
      .where(whereClause)
      .orderBy(products.code);

    let items = await this.mapInventory(productList);

    if (params.status) {
      const healthValues = ['normal', 'warning', 'shortage'];
      items = items.filter((item: ProductWithInventory) =>
        healthValues.includes(params.status!)
          ? item.stockStatus === params.status
          : item.status === params.status,
      );
    }

    if (params.maxStock !== undefined) {
      items = items.filter(
        (item: ProductWithInventory) => item.totalQuantity <= params.maxStock!,
      );
    }

    items = this.applySorting(items, params.sortBy);

    const total = items.length;
    const paged = items.slice((page - 1) * pageSize, page * pageSize);

    return { items: paged, total, page, pageSize };
  }

  async getAllProducts(): Promise<ProductWithInventory[]> {
    const productList = await this.db
      .select()
      .from(products)
      .where(isNull(products.deletedAt))
      .orderBy(products.code);

    return this.mapInventory(productList);
  }

  async createProduct(dto: CreateProductRequest, userId: string): Promise<Product> {
    const code = await this.generateNextCode();

    const [product] = await this.db
      .insert(products)
      .values({
        code,
        name: dto.name,
        category: dto.category,
        brand: dto.brand ?? null,
        spec: dto.spec ?? null,
        unit: dto.unit,
        safetyStock: dto.safetyStock,
        unitPrice: String(dto.unitPrice),
        status: 'active',
        imageUrl: dto.imageUrl ?? null,
        baseUnit: dto.baseUnit ?? '件',
        salesUnit: dto.salesUnit ?? null,
        conversionRatio:
          dto.conversionRatio !== undefined && dto.conversionRatio !== null
            ? String(dto.conversionRatio)
            : null,
      })
      .returning();

    const inventoryMap = new Map<string, number>();
    if (dto.initialInventory && Array.isArray(dto.initialInventory)) {
      for (const item of dto.initialInventory) {
        if (item && typeof item.warehouse === 'string' && typeof item.quantity === 'number') {
          const qty = Math.max(0, Math.floor(item.quantity));
          inventoryMap.set(item.warehouse, qty);
        }
      }
    }

    const unitPriceNum = Number(dto.unitPrice) || 0;
    await this.db.insert(warehouseInventory).values(
      WAREHOUSES.map((warehouse) => {
        const qty = inventoryMap.get(warehouse) ?? 0;
        return {
          productId: product.id,
          warehouse,
          quantity: qty,
          stockValue: String((qty * unitPriceNum).toFixed(2)),
        };
      }),
    );

    const result: Product = {
      id: product.id,
      code: product.code,
      name: product.name,
      category: product.category,
      brand: product.brand ?? '',
      spec: product.spec ?? '',
      unit: product.unit,
      safetyStock: product.safetyStock,
      unitPrice: Number(product.unitPrice),
      status: product.status,
      shelfStatus: product.status,
      imageUrl: product.imageUrl ?? null,
      baseUnit: product.baseUnit,
      salesUnit: product.salesUnit ?? null,
      conversionRatio:
        product.conversionRatio === null ? null : Number(product.conversionRatio),
      stockStatus: (() => {
        const totalInitial: number = [...inventoryMap.values()].reduce(
          (sum: number, q: number) => sum + q,
          0,
        );
        if (totalInitial === 0) return 'shortage';
        return totalInitial < product.safetyStock ? 'warning' : 'normal';
      })(),
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
    };
    this.fireAndForgetSync('products', product.id, 'create');
    this.fireAndForgetAuditLog('create', 'product', product.id, userId, {
      after: { ...result },
    });
    return result;
  }

  private async generateNextCode(): Promise<string> {
    const allCodes = await this.db
      .select({ code: products.code })
      .from(products)
      .where(ilike(products.code, 'SKU%'))
      .orderBy(products.code);
    const usedNums = new Set<number>();
    for (const row of allCodes) {
      const match = row.code.match(/SKU(\d+)/);
      if (match) usedNums.add(parseInt(match[1], 10));
    }
    let nextNum = 1;
    while (usedNums.has(nextNum)) {
      nextNum += 1;
    }
    return `SKU${String(nextNum).padStart(3, '0')}`;
  }

  async batchImport(items: BatchImportItem[]): Promise<BatchImportResult> {
    const failures: { row: number; code?: string; reason: string }[] = [];
    let successCount = 0;

    const usedCodes = new Set<string>();

    for (let i = 0; i < items.length; i += 1) {
      const row = i + 1;
      const item = items[i];

      try {
        if (!item.code || !item.code.trim()) {
          throw new Error('SKU编码不能为空');
        }
        if (!item.name || !item.name.trim()) {
          throw new Error('商品名称不能为空');
        }
        if (!item.category || !item.category.trim()) {
          throw new Error('分类不能为空');
        }
        if (!item.unit || !item.unit.trim()) {
          throw new Error('单位不能为空');
        }
        if (typeof item.safetyStock !== 'number' || Number.isNaN(item.safetyStock)) {
          throw new Error('安全库存必须是数字');
        }
        if (typeof item.unitPrice !== 'number' || Number.isNaN(item.unitPrice)) {
          throw new Error('单价必须是数字');
        }
        if (item.unitPrice < 0) {
          throw new Error('单价不能为负数');
        }
        if (item.safetyStock < 0) {
          throw new Error('安全库存不能为负数');
        }

        const code = item.code.trim();

        if (usedCodes.has(code)) {
          throw new Error('SKU编码在导入文件中重复');
        }

        const existing = await this.db
          .select({ id: products.id })
          .from(products)
          .where(and(eq(products.code, code), isNull(products.deletedAt)))
          .limit(1);
        if (existing.length > 0) {
          throw new Error('SKU编码已存在');
        }

        usedCodes.add(code);

        const safetyStock = Math.floor(item.safetyStock);
        const unitPriceNum = Number(item.unitPrice) || 0;
        const initialQty = item.initialQuantity !== undefined && item.initialQuantity !== null
          ? Math.max(0, Math.floor(item.initialQuantity))
          : 0;
        const warehouse = item.warehouse?.trim() || '';

        await this.db.transaction(async (tx) => {
          const [product] = await tx
            .insert(products)
            .values({
              code,
              name: item.name.trim(),
              category: item.category.trim(),
              brand: item.brand?.trim() ?? null,
              spec: item.spec?.trim() ?? null,
              unit: item.unit.trim(),
              safetyStock,
              unitPrice: String(unitPriceNum),
              status: 'active',
            })
            .returning();

          const inventoryMap = new Map<string, number>();
          if (warehouse && initialQty > 0) {
            inventoryMap.set(warehouse, initialQty);
          }

          await tx.insert(warehouseInventory).values(
            WAREHOUSES.map((wh) => {
              const qty = inventoryMap.get(wh) ?? 0;
              return {
                productId: product.id,
                warehouse: wh,
                quantity: qty,
                stockValue: String((qty * unitPriceNum).toFixed(2)),
              };
            }),
          );

          this.fireAndForgetSync('products', product.id, 'create');
        });

        successCount += 1;
      } catch (err: unknown) {
        const reason = err instanceof Error ? err.message : String(err);
        failures.push({ row, code: item.code, reason });
      }
    }

    return {
      successCount,
      failCount: failures.length,
      failures,
    };
  }

  async getProduct(id: string): Promise<ProductWithInventory | null> {
    const productList = await this.db
      .select()
      .from(products)
      .where(and(eq(products.id, id), isNull(products.deletedAt)))
      .limit(1);

    if (productList.length === 0) return null;

    const mapped = await this.mapInventory(productList);
    return mapped[0];
  }

  async updateProduct(
    id: string,
    dto: UpdateProductRequest,
    userId: string,
  ): Promise<Product> {
    const oldRows = await this.db
      .select()
      .from(products)
      .where(eq(products.id, id))
      .limit(1);
    if (oldRows.length === 0) throw new NotFoundException('商品不存在');
    const oldProduct = oldRows[0];

    const patch: Partial<typeof products.$inferInsert> = {};
    if (dto.code !== undefined) patch.code = dto.code;
    if (dto.name !== undefined) patch.name = dto.name;
    if (dto.category !== undefined) patch.category = dto.category;
    if (dto.brand !== undefined) patch.brand = dto.brand;
    if (dto.spec !== undefined) patch.spec = dto.spec;
    if (dto.unit !== undefined) patch.unit = dto.unit;
    if (dto.safetyStock !== undefined) patch.safetyStock = dto.safetyStock;
    if (dto.unitPrice !== undefined) {
      patch.unitPrice = String(dto.unitPrice);
    }
    if (dto.status !== undefined) patch.status = dto.status;
    if (dto.imageUrl !== undefined) patch.imageUrl = dto.imageUrl;
    if (dto.baseUnit !== undefined) patch.baseUnit = dto.baseUnit;
    if (dto.salesUnit !== undefined) patch.salesUnit = dto.salesUnit;
    if (dto.conversionRatio !== undefined) {
      patch.conversionRatio =
        dto.conversionRatio === null ? null : String(dto.conversionRatio);
    }

    if (Object.keys(patch).length === 0) {
      return {
        id: oldProduct.id,
        code: oldProduct.code,
        name: oldProduct.name,
        category: oldProduct.category,
        brand: oldProduct.brand ?? '',
        spec: oldProduct.spec ?? '',
        unit: oldProduct.unit,
        safetyStock: oldProduct.safetyStock,
        unitPrice: Number(oldProduct.unitPrice),
        status: oldProduct.status,
        shelfStatus: oldProduct.status,
        imageUrl: oldProduct.imageUrl ?? null,
        baseUnit: oldProduct.baseUnit,
        salesUnit: oldProduct.salesUnit ?? null,
        conversionRatio:
          oldProduct.conversionRatio === null
            ? null
            : Number(oldProduct.conversionRatio),
        createdAt: oldProduct.createdAt.toISOString(),
        updatedAt: oldProduct.updatedAt.toISOString(),
      };
    }

    const beforeValues: Record<string, unknown> = {};
    for (const key of Object.keys(patch)) {
      const k = key as keyof typeof oldProduct;
      beforeValues[key] = oldProduct[k];
    }

    const updated = await this.db
      .update(products)
      .set(patch)
      .where(eq(products.id, id))
      .returning();

    if (updated.length === 0) {
      throw new NotFoundException('商品不存在');
    }

    const p = updated[0];
    const result = {
      id: p.id,
      code: p.code,
      name: p.name,
      category: p.category,
      brand: p.brand ?? '',
      spec: p.spec ?? '',
      unit: p.unit,
      safetyStock: p.safetyStock,
      unitPrice: Number(p.unitPrice),
      status: p.status,
      shelfStatus: p.status,
      imageUrl: p.imageUrl ?? null,
      baseUnit: p.baseUnit,
      salesUnit: p.salesUnit ?? null,
      conversionRatio:
        p.conversionRatio === null ? null : Number(p.conversionRatio),
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    };
    this.fireAndForgetSync('products', p.id, 'update');

    const afterValues: Record<string, unknown> = {};
    for (const key of Object.keys(patch)) {
      afterValues[key] = p[key as keyof typeof p];
    }
    const changes = this.computeChanges(beforeValues, afterValues);
    this.fireAndForgetAuditLog('update', 'product', p.id, userId, {
      before: beforeValues,
      after: afterValues,
      changes,
    });

    return result;
  }

  async exportProducts(params: {
    category?: string;
    status?: string;
    keyword?: string;
    maxStock?: number;
    sortBy?: string;
  }): Promise<ProductWithInventory[]> {
    const conditions = [isNull(products.deletedAt)];
    if (params.category) {
      conditions.push(eq(products.category, params.category));
    }
    if (params.keyword) {
      conditions.push(
        or(
          ilike(products.name, `%${params.keyword}%`),
          ilike(products.code, `%${params.keyword}%`),
        ),
      );
    }

    const whereClause = and(...conditions);

    const productList = await this.db
      .select()
      .from(products)
      .where(whereClause)
      .orderBy(products.code);

    let items = await this.mapInventory(productList);

    if (params.status) {
      const healthValues = ['normal', 'warning', 'shortage'];
      items = items.filter((item: ProductWithInventory) =>
        healthValues.includes(params.status!)
          ? item.stockStatus === params.status
          : item.status === params.status,
      );
    }

    if (params.maxStock !== undefined) {
      items = items.filter(
        (item: ProductWithInventory) => item.totalQuantity <= params.maxStock!,
      );
    }

    items = this.applySorting(items, params.sortBy);

    return items;
  }

  async deleteProduct(id: string, userId: string): Promise<void> {
    const existing = await this.db
      .select()
      .from(products)
      .where(and(eq(products.id, id), isNull(products.deletedAt)))
      .limit(1);

    if (existing.length === 0) {
      throw new NotFoundException('商品不存在');
    }

    const beforeProduct = existing[0];

    await this.db.transaction(async (tx) => {
      await tx
        .update(products)
        .set({
          deletedAt: new Date(),
          deletedBy: userId,
        })
        .where(eq(products.id, id));

      await tx
        .update(warehouseInventory)
        .set({ status: 'archived' })
        .where(eq(warehouseInventory.productId, id));
    });

    this.logger.log(`商品已软删除: ${id}`);
    this.fireAndForgetSync('products', id, 'delete');
    this.fireAndForgetAuditLog('archive', 'product', id, userId, {
      before: {
        id: beforeProduct.id,
        code: beforeProduct.code,
        name: beforeProduct.name,
        status: beforeProduct.status,
      },
    });
  }

  async bulkDeleteProducts(
    ids: string[],
    userId: string,
  ): Promise<{ successCount: number }> {
    if (!ids || ids.length === 0) {
      throw new BadRequestException('请选择要删除的商品');
    }

    const existingRows = await this.db
      .select({ id: products.id, code: products.code, name: products.name })
      .from(products)
      .where(and(inArray(products.id, ids), isNull(products.deletedAt)));

    if (existingRows.length === 0) {
      throw new NotFoundException('未找到可删除的商品');
    }

    const validIds: string[] = existingRows.map((r) => r.id);

    await this.db.transaction(async (tx) => {
      await tx
        .update(products)
        .set({ deletedAt: new Date(), deletedBy: userId })
        .where(inArray(products.id, validIds));

      await tx
        .update(warehouseInventory)
        .set({ status: 'archived' })
        .where(inArray(warehouseInventory.productId, validIds));
    });

    for (const row of existingRows) {
      this.fireAndForgetSync('products', row.id, 'delete');
      this.fireAndForgetAuditLog('archive', 'product', row.id, userId, {
        before: { id: row.id, code: row.code, name: row.name },
        changes: { bulk: true },
      });
    }

    this.logger.log(`批量删除商品 ${validIds.length} 个`);
    return { successCount: validIds.length };
  }

  async bulkUpdateCategory(
    ids: string[],
    category: string,
    userId: string,
  ): Promise<{ successCount: number }> {
    if (!ids || ids.length === 0) {
      throw new BadRequestException('请选择要修改的商品');
    }
    if (!category || !category.trim()) {
      throw new BadRequestException('请选择目标品类');
    }

    const updated = await this.db
      .update(products)
      .set({
        category: category.trim(),
        updatedAt: new Date(),
        updatedBy: userId,
      })
      .where(and(inArray(products.id, ids), isNull(products.deletedAt)))
      .returning({ id: products.id });

    if (updated.length === 0) {
      throw new NotFoundException('未找到可修改的商品');
    }

    this.fireAndForgetAuditLog('update', 'product', updated[0].id, userId, {
      changes: { bulkCategory: category.trim(), count: updated.length },
    });

    this.logger.log(`批量修改品类 ${updated.length} 个商品 -> ${category}`);
    return { successCount: updated.length };
  }

  async bulkShelfProducts(
    ids: string[],
    onShelf: boolean,
    userId: string,
  ): Promise<{ successCount: number }> {
    if (!ids || ids.length === 0) {
      throw new BadRequestException('请选择要操作的商品');
    }

    const status: string = onShelf ? 'active' : 'inactive';

    const updated = await this.db
      .update(products)
      .set({ status, updatedAt: new Date(), updatedBy: userId })
      .where(and(inArray(products.id, ids), isNull(products.deletedAt)))
      .returning({ id: products.id });

    if (updated.length === 0) {
      throw new NotFoundException('未找到可操作的商品');
    }

    this.fireAndForgetAuditLog('update', 'product', updated[0].id, userId, {
      changes: { bulkShelf: onShelf ? 'on' : 'off', count: updated.length },
    });

    this.logger.log(`批量${onShelf ? '上架' : '下架'}商品 ${updated.length} 个`);
    return { successCount: updated.length };
  }

  async listArchivedProducts(params: {
    page?: number;
    pageSize?: number;
    keyword?: string;
  }): Promise<{
    items: ArchivedProduct[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 20;

    const conditions = [isNotNull(products.deletedAt)];
    if (params.keyword) {
      conditions.push(
        or(
          ilike(products.name, `%${params.keyword}%`),
          ilike(products.code, `%${params.keyword}%`),
        ),
      );
    }

    const productList = await this.db
      .select()
      .from(products)
      .where(and(...conditions))
      .orderBy(desc(products.deletedAt));

    const productIds = productList.map((p) => p.id);

    const inventoryMap = await this.buildInventoryMap(productIds);
    const txCountMap = await this.buildCountMap(
      stockTransactions,
      stockTransactions.productId,
      productIds,
    );
    const trCountMap = await this.buildCountMap(
      transfers,
      transfers.productId,
      productIds,
    );
    const icCountMap = await this.buildCountMap(
      inventoryCheckItems,
      inventoryCheckItems.productId,
      productIds,
    );

    const items: ArchivedProduct[] = productList.map((p) => {
      const inventory = inventoryMap.get(p.id) ?? [];
      const totalQuantity = inventory.reduce(
        (sum: number, i: WarehouseInventoryItem) => sum + i.quantity,
        0,
      );
      const totalValue = inventory.reduce(
        (sum: number, i: WarehouseInventoryItem) => sum + i.stockValue,
        0,
      );
      return {
        id: p.id,
        code: p.code,
        name: p.name,
        category: p.category,
        brand: p.brand ?? '',
        spec: p.spec ?? '',
        unit: p.unit,
        safetyStock: p.safetyStock,
        unitPrice: Number(p.unitPrice),
        status: p.status,
        deletedAt: p.deletedAt?.toISOString() ?? '',
        deletedBy: p.deletedBy ?? '',
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
        inventory,
        totalQuantity,
        totalValue,
        transactionCount: txCountMap.get(p.id) ?? 0,
        transferCount: trCountMap.get(p.id) ?? 0,
        inventoryCheckCount: icCountMap.get(p.id) ?? 0,
      };
    });

    const total = items.length;
    const paged = items.slice((page - 1) * pageSize, page * pageSize);
    return { items: paged, total, page, pageSize };
  }

  async getArchivedProduct(id: string): Promise<ArchivedProductDetail> {
    const productList = await this.db
      .select()
      .from(products)
      .where(and(eq(products.id, id), isNotNull(products.deletedAt)))
      .limit(1);

    if (productList.length === 0) {
      throw new NotFoundException('已删除商品不存在');
    }

    const p = productList[0];
    const inventoryMap = await this.buildInventoryMap([p.id]);
    const inventory = inventoryMap.get(p.id) ?? [];
    const totalQuantity = inventory.reduce(
      (sum: number, i: WarehouseInventoryItem) => sum + i.quantity,
      0,
    );
    const totalValue = inventory.reduce(
      (sum: number, i: WarehouseInventoryItem) => sum + i.stockValue,
      0,
    );

    const transactions = await this.db
      .select()
      .from(stockTransactions)
      .where(eq(stockTransactions.productId, p.id))
      .orderBy(desc(stockTransactions.transactionDate));

    const transferRows = await this.db
      .select()
      .from(transfers)
      .where(eq(transfers.productId, p.id))
      .orderBy(desc(transfers.transferDate));

    const checkItemRows = await this.db
      .select()
      .from(inventoryCheckItems)
      .where(eq(inventoryCheckItems.productId, p.id));

    const inventoryChecksList: { check: InventoryCheck; items: InventoryCheckItem[] }[] = [];
    if (checkItemRows.length > 0) {
      const checkIds = Array.from(new Set(checkItemRows.map((c) => c.checkId)));
      const checks = await this.db
        .select()
        .from(inventoryChecks)
        .where(inArray(inventoryChecks.id, checkIds))
        .orderBy(desc(inventoryChecks.checkDate));
      const itemsByCheck = new Map<string, InventoryCheckItem[]>();
      for (const item of checkItemRows) {
        const list = itemsByCheck.get(item.checkId) ?? [];
        list.push({
          id: item.id,
          checkId: item.checkId,
          productId: item.productId,
          productName: p.name,
          productCode: p.code,
          location: item.location ?? '',
          systemQuantity: item.systemQuantity,
          actualQuantity: item.actualQuantity ?? 0,
          difference: item.difference ?? 0,
          remark: item.remark ?? '',
        });
        itemsByCheck.set(item.checkId, list);
      }
      for (const c of checks) {
        inventoryChecksList.push({
          check: {
            id: c.id,
            warehouse: c.warehouse,
            status: c.status,
            checkDate: c.checkDate.toISOString(),
            createdAt: c.createdAt.toISOString(),
            checkNo: c.checkNo ?? '',
          },
          items: itemsByCheck.get(c.id) ?? [],
        });
      }
    }

    const txCount = transactions.length;
    const trCount = transferRows.length;
    const icCount = checkItemRows.length;

    return {
      id: p.id,
      code: p.code,
      name: p.name,
      category: p.category,
      brand: p.brand ?? '',
      spec: p.spec ?? '',
      unit: p.unit,
      safetyStock: p.safetyStock,
      unitPrice: Number(p.unitPrice),
      status: p.status,
      deletedAt: p.deletedAt?.toISOString() ?? '',
      deletedBy: p.deletedBy ?? '',
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
      inventory,
      totalQuantity,
      totalValue,
      transactionCount: txCount,
      transferCount: trCount,
      inventoryCheckCount: icCount,
      transactions: transactions.map((t): StockTransaction => ({
        id: t.id,
        productId: t.productId,
        productName: p.name,
        productCode: p.code,
        warehouse: t.warehouse,
        type: t.type,
        subType: t.subType ?? '',
        quantity: t.quantity,
        unitPrice: Number(t.unitPrice ?? 0),
        totalAmount: Number(t.totalAmount ?? 0),
        orderNo: t.orderNo ?? '',
        operator: t.operator ?? '',
        supplier: t.supplier ?? '',
        remark: t.remark ?? '',
        transactionDate: t.transactionDate.toISOString(),
        createdAt: t.createdAt.toISOString(),
      })),
      transfers: transferRows.map((t): Transfer => ({
        id: t.id,
        transferNo: t.transferNo,
        productId: t.productId,
        productName: p.name,
        productCode: p.code,
        sourceWarehouse: t.sourceWarehouse,
        targetWarehouse: t.targetWarehouse,
        quantity: t.quantity,
        remark: t.remark ?? '',
        transferDate: t.transferDate.toISOString(),
        createdAt: t.createdAt.toISOString(),
      })),
      inventoryChecks: inventoryChecksList,
    };
  }

  async purgeArchivedProduct(id: string, userId: string): Promise<void> {
    const existing = await this.db
      .select()
      .from(products)
      .where(and(eq(products.id, id), isNotNull(products.deletedAt)))
      .limit(1);

    if (existing.length === 0) {
      throw new NotFoundException('已删除商品不存在');
    }

    const beforeProduct = existing[0];

    await this.db
      .delete(stockTransactions)
      .where(eq(stockTransactions.productId, id));
    await this.db.delete(transfers).where(eq(transfers.productId, id));
    await this.db
      .delete(inventoryCheckItems)
      .where(eq(inventoryCheckItems.productId, id));
    await this.db
      .delete(warehouseInventory)
      .where(eq(warehouseInventory.productId, id));
    await this.db.delete(products).where(eq(products.id, id));

    this.logger.log(`商品已永久删除: ${id}`);
    this.fireAndForgetAuditLog('delete', 'product', id, userId, {
      before: {
        id: beforeProduct.id,
        code: beforeProduct.code,
        name: beforeProduct.name,
        status: beforeProduct.status,
      },
    });
  }

  async restoreArchivedProduct(id: string, userId: string): Promise<void> {
    const existing = await this.db
      .select({ id: products.id, status: products.status })
      .from(products)
      .where(and(eq(products.id, id), isNotNull(products.deletedAt)))
      .limit(1);

    if (existing.length === 0) {
      throw new NotFoundException('已删除商品不存在');
    }

    const beforeProduct = existing[0];

    await this.db.transaction(async (tx) => {
      await tx
        .update(products)
        .set({ deletedAt: null, deletedBy: null })
        .where(eq(products.id, id));

      await tx
        .update(warehouseInventory)
        .set({ status: 'active' })
        .where(eq(warehouseInventory.productId, id));
    });

    this.logger.log(`商品已恢复: ${id}`);
    this.fireAndForgetAuditLog('restore', 'product', id, userId, {
      before: { id: beforeProduct.id, status: 'archived' },
      after: { id: beforeProduct.id, status: beforeProduct.status },
    });
  }

  private async buildInventoryMap(
    productIds: string[],
  ): Promise<Map<string, WarehouseInventoryItem[]>> {
    const map = new Map<string, WarehouseInventoryItem[]>();
    if (productIds.length === 0) return map;
    const rows = await this.db
      .select()
      .from(warehouseInventory)
      .where(inArray(warehouseInventory.productId, productIds));
    for (const inv of rows) {
      const item: WarehouseInventoryItem = {
        warehouse: inv.warehouse,
        quantity: inv.quantity,
        stockValue: Number(inv.stockValue),
      };
      const list = map.get(inv.productId) ?? [];
      list.push(item);
      map.set(inv.productId, list);
    }
    return map;
  }

  private async buildCountMap<T extends { productId: any }>(
    table: any,
    productIdCol: any,
    productIds: string[],
  ): Promise<Map<string, number>> {
    const map = new Map<string, number>();
    if (productIds.length === 0) return map;
    const rows = await this.db
      .select({
        productId: productIdCol,
        count: sql<number>`count(*)::int`.as('count'),
      })
      .from(table)
      .where(inArray(productIdCol, productIds))
      .groupBy(productIdCol);
    for (const row of rows) {
      map.set(row.productId as string, Number(row.count));
    }
    return map;
  }

  private applySorting(
    items: ProductWithInventory[],
    sortBy?: string,
  ): ProductWithInventory[] {
    if (!sortBy) {
      return [...items].sort((a: ProductWithInventory, b: ProductWithInventory) =>
        a.code.localeCompare(b.code),
      );
    }

    if (sortBy === 'value_desc') {
      return [...items].sort(
        (a: ProductWithInventory, b: ProductWithInventory) => b.totalValue - a.totalValue,
      );
    }

    if (sortBy === 'stock_asc') {
      return [...items].sort(
        (a: ProductWithInventory, b: ProductWithInventory) => a.totalQuantity - b.totalQuantity,
      );
    }

    const whMatch = sortBy.match(/^warehouse_(.+)_desc$/);
    if (whMatch) {
      const wh = whMatch[1];
      return [...items].sort(
        (a: ProductWithInventory, b: ProductWithInventory) => {
          const aQty = a.inventory.find(
            (inv) => inv.warehouse === wh,
          )?.quantity ?? 0;
          const bQty = b.inventory.find(
            (inv) => inv.warehouse === wh,
          )?.quantity ?? 0;
          return bQty - aQty;
        },
      );
    }

    return items;
  }
}
