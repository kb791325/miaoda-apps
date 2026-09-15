import {
  BadRequestException,
  Injectable,
  Inject,
  Logger,
} from '@nestjs/common';
import { desc } from 'drizzle-orm';
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from '@lark-apaas/fullstack-nestjs-core';
import {
  backupRecords,
  categories,
  inventoryCheckItems,
  inventoryChecks,
  products,
  purchaseOrderItems,
  purchaseOrders,
  salesOrderItems,
  salesOrders,
  stockTransactions,
  suppliers,
  transfers,
  warehouseInventory,
} from '@server/database/schema';
import type {
  BackupExportResponse,
  BackupRecord,
  RestoreResponse,
} from '@shared/api.interface';

const BACKUP_TABLES = [
  'categories',
  'suppliers',
  'products',
  'salesOrders',
  'purchaseOrders',
  'warehouseInventory',
  'stockTransactions',
  'transfers',
  'inventoryChecks',
  'inventoryCheckItems',
  'salesOrderItems',
  'purchaseOrderItems',
] as const;

type BackupTableKey = (typeof BACKUP_TABLES)[number];
type BackupTables = Record<string, Record<string, unknown>[]>;

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  async exportAll(
    operatorId: string,
    operatorName: string,
  ): Promise<BackupExportResponse> {
    const [
      categoryRows,
      supplierRows,
      productRows,
      salesOrderRows,
      purchaseOrderRows,
      inventoryRows,
      transactionRows,
      transferRows,
      checkRows,
      checkItemRows,
      salesItemRows,
      purchaseItemRows,
    ] = await Promise.all([
      this.db.select().from(categories),
      this.db.select().from(suppliers),
      this.db.select().from(products),
      this.db.select().from(salesOrders),
      this.db.select().from(purchaseOrders),
      this.db.select().from(warehouseInventory),
      this.db.select().from(stockTransactions),
      this.db.select().from(transfers),
      this.db.select().from(inventoryChecks),
      this.db.select().from(inventoryCheckItems),
      this.db.select().from(salesOrderItems),
      this.db.select().from(purchaseOrderItems),
    ]);

    const data: BackupTables = {
      categories: categoryRows,
      suppliers: supplierRows,
      products: productRows,
      salesOrders: salesOrderRows,
      purchaseOrders: purchaseOrderRows,
      warehouseInventory: inventoryRows,
      stockTransactions: transactionRows,
      transfers: transferRows,
      inventoryChecks: checkRows,
      inventoryCheckItems: checkItemRows,
      salesOrderItems: salesItemRows,
      purchaseOrderItems: purchaseItemRows,
    };

    const tableCounts: Record<string, number> = {};
    let recordCount = 0;
    for (const key of BACKUP_TABLES) {
      const count = (data[key] ?? []).length;
      tableCounts[key] = count;
      recordCount += count;
    }

    const [record] = await this.db
      .insert(backupRecords)
      .values({
        type: 'export',
        fileName: `inventory-backup-${new Date().toISOString().slice(0, 10)}.json`,
        recordCount,
        tableCounts: JSON.stringify(tableCounts),
        operatorName: operatorName || operatorId,
      })
      .returning();

    this.logger.log(`数据备份完成: ${recordCount} 条, 操作人 ${operatorId}`);
    return {
      backupId: record.id,
      exportedAt: record.createdAt.toISOString(),
      data,
    };
  }

  async restore(
    payload: BackupTables,
    fileName: string | undefined,
    operatorId: string,
    operatorName: string,
  ): Promise<RestoreResponse> {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new BadRequestException('备份文件格式不正确');
    }
    for (const key of Object.keys(payload)) {
      if (!BACKUP_TABLES.includes(key as BackupTableKey)) {
        throw new BadRequestException(`备份文件包含不支持的数据表: ${key}`);
      }
      if (!Array.isArray(payload[key])) {
        throw new BadRequestException(`备份文件数据表 ${key} 格式不正确`);
      }
    }

    const tableCounts: Record<string, number> = {};
    let recordCount = 0;

    await this.db.transaction(async (tx) => {
      await tx.delete(purchaseOrderItems);
      await tx.delete(salesOrderItems);
      await tx.delete(inventoryCheckItems);
      await tx.delete(stockTransactions);
      await tx.delete(transfers);
      await tx.delete(inventoryChecks);
      await tx.delete(warehouseInventory);
      await tx.delete(purchaseOrders);
      await tx.delete(salesOrders);
      await tx.delete(products);
      await tx.delete(suppliers);
      await tx.delete(categories);

      const counts: [string, number][] = [
        ['categories', await this.insertRows(tx, categories, payload.categories)],
        ['suppliers', await this.insertRows(tx, suppliers, payload.suppliers)],
        ['products', await this.insertRows(tx, products, payload.products)],
        ['salesOrders', await this.insertRows(tx, salesOrders, payload.salesOrders)],
        ['purchaseOrders', await this.insertRows(tx, purchaseOrders, payload.purchaseOrders)],
        ['warehouseInventory', await this.insertRows(tx, warehouseInventory, payload.warehouseInventory)],
        ['stockTransactions', await this.insertRows(tx, stockTransactions, payload.stockTransactions)],
        ['transfers', await this.insertRows(tx, transfers, payload.transfers)],
        ['inventoryChecks', await this.insertRows(tx, inventoryChecks, payload.inventoryChecks)],
        ['inventoryCheckItems', await this.insertRows(tx, inventoryCheckItems, payload.inventoryCheckItems)],
        ['salesOrderItems', await this.insertRows(tx, salesOrderItems, payload.salesOrderItems)],
        ['purchaseOrderItems', await this.insertRows(tx, purchaseOrderItems, payload.purchaseOrderItems)],
      ];
      for (const [key, count] of counts) {
        tableCounts[key] = count;
        recordCount += count;
      }
    });

    const [record] = await this.db
      .insert(backupRecords)
      .values({
        type: 'restore',
        fileName: fileName ?? null,
        recordCount,
        tableCounts: JSON.stringify(tableCounts),
        operatorName: operatorName || operatorId,
      })
      .returning();

    this.logger.log(`数据恢复完成: ${recordCount} 条, 操作人 ${operatorId}`);
    return { success: true, backupId: record.id, tableCounts };
  }

  async listRecords(): Promise<{ items: BackupRecord[] }> {
    const rows = await this.db
      .select()
      .from(backupRecords)
      .orderBy(desc(backupRecords.createdAt))
      .limit(50);
    const items: BackupRecord[] = rows.map((row) => ({
      id: row.id,
      type: row.type as 'export' | 'restore',
      fileName: row.fileName ?? null,
      recordCount: row.recordCount,
      tableCounts: (row.tableCounts ?? {}) as Record<string, number>,
      operatorName: row.operatorName ?? null,
      createdAt: row.createdAt.toISOString(),
    }));
    return { items };
  }

  private async insertRows<T>(
    tx: PostgresJsDatabase,
    table: Parameters<PostgresJsDatabase['insert']>[0],
    rows: Record<string, unknown>[] | undefined,
  ): Promise<number> {
    if (!rows || rows.length === 0) return 0;
    await tx.insert(table).values(rows as T[]);
    return rows.length;
  }
}
