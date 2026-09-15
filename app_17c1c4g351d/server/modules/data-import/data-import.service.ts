import { Injectable, Inject, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase, CapabilityService } from '@lark-apaas/fullstack-nestjs-core';
import { eq } from 'drizzle-orm';
import {
  product,
  inventory,
  customer,
  afterSaleOrder,
  channel,
  trafficKeyword,
  bitableSyncConfig,
} from '../../database/schema';

type ImportResult = { imported: number; errors: string[] };

export interface BitableConfig {
  id: string;
  entity: string;
  appToken: string;
  tableId: string;
  label: string;
}

function getField(row: Record<string, unknown>, ...names: string[]): unknown {
  for (const name of names) {
    if (row[name] !== undefined && row[name] !== null && row[name] !== '') return row[name];
  }
  return undefined;
}

function toNum(value: unknown, defaultVal = 0): string {
  if (value === undefined || value === null || value === '') return String(defaultVal);
  const num = Number(value);
  return String(isNaN(num) ? defaultVal : num);
}

function toInt(value: unknown, defaultVal = 0): number {
  if (value === undefined || value === null || value === '') return defaultVal;
  const num = Number(value);
  return isNaN(num) ? defaultVal : Math.round(num);
}

function toBool(value: unknown, defaultVal = false): boolean {
  if (value === undefined || value === null) return defaultVal;
  if (typeof value === 'boolean') return value;
  const str = String(value).trim().toLowerCase();
  return ['true', '是', '1', 'yes'].includes(str);
}

function genOrderNo(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  return `IMP${date}${rand}`;
}

const BITABLE_INSTANCE_IDS: Record<string, string> = {
  products: 'feishu_bitable_product_sync_reader_1',
  inventory: 'bitable_inventory_reader_1',
  customers: 'bitable_customer_reader_1',
  'after-sale': 'bitable_aftersale_reader_1',
  channels: 'bitable_channel_reader_1',
  keywords: 'bitable_keyword_reader_1',
};

@Injectable()
export class DataImportService {
  private readonly logger = new Logger(DataImportService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    private readonly capabilityService: CapabilityService,
  ) {}

  async listBitableConfigs(): Promise<BitableConfig[]> {
    const rows = await this.db.select({
      id: bitableSyncConfig.id,
      entity: bitableSyncConfig.entity,
      appToken: bitableSyncConfig.appToken,
      tableId: bitableSyncConfig.tableId,
      label: bitableSyncConfig.label,
    }).from(bitableSyncConfig);
    return rows;
  }

  async getBitableConfigByEntity(entity: string): Promise<BitableConfig | null> {
    const rows = await this.db.select({
      id: bitableSyncConfig.id,
      entity: bitableSyncConfig.entity,
      appToken: bitableSyncConfig.appToken,
      tableId: bitableSyncConfig.tableId,
      label: bitableSyncConfig.label,
    }).from(bitableSyncConfig).where(eq(bitableSyncConfig.entity, entity));
    return rows[0] || null;
  }

  async saveBitableConfig(config: { entity: string; appToken: string; tableId: string; label: string }): Promise<BitableConfig> {
    const existing = await this.getBitableConfigByEntity(config.entity);
    if (existing) {
      const updated = await this.db.update(bitableSyncConfig)
        .set({
          appToken: config.appToken,
          tableId: config.tableId,
          label: config.label,
          updatedAt: new Date(),
        })
        .where(eq(bitableSyncConfig.id, existing.id))
        .returning({
          id: bitableSyncConfig.id,
          entity: bitableSyncConfig.entity,
          appToken: bitableSyncConfig.appToken,
          tableId: bitableSyncConfig.tableId,
          label: bitableSyncConfig.label,
        });
      return updated[0];
    }
    const inserted = await this.db.insert(bitableSyncConfig)
      .values(config)
      .returning({
        id: bitableSyncConfig.id,
        entity: bitableSyncConfig.entity,
        appToken: bitableSyncConfig.appToken,
        tableId: bitableSyncConfig.tableId,
        label: bitableSyncConfig.label,
      });
    return inserted[0];
  }

  async deleteBitableConfig(id: string): Promise<void> {
    const deleted = await this.db.delete(bitableSyncConfig)
      .where(eq(bitableSyncConfig.id, id))
      .returning({ id: bitableSyncConfig.id });
    if (deleted.length === 0) {
      throw new NotFoundException('配置不存在');
    }
  }

  async syncFromBitable(entity: string): Promise<ImportResult> {
    const config = await this.getBitableConfigByEntity(entity);
    if (!config) {
      return { imported: 0, errors: [`请先配置「${entity}」对应的多维表格`] };
    }

    try {
      const instanceId = BITABLE_INSTANCE_IDS[entity] || config.appToken;
      const records = await this.fetchBitableRecords(config.appToken, config.tableId, instanceId);
      if (records.length === 0) {
        return { imported: 0, errors: ['多维表格中暂无数据'] };
      }
      this.logger.log(`Bitable 同步: entity=${entity}, records=${records.length}`);
      return this.importByEntity(entity, records);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Bitable 同步失败: ${msg}`);
      return { imported: 0, errors: [`同步失败: ${msg}`] };
    }
  }

  private async fetchBitableRecords(appToken: string, tableId: string, instanceId?: string): Promise<Array<Record<string, unknown>>> {
    const allRecords: Array<Record<string, unknown>> = [];
    let pageToken: string | undefined;

    for (let page = 0; page < 10; page++) {
      const input: Record<string, unknown> = {
        appToken,
        tableId,
        pageSize: 100,
      };
      if (pageToken) {
        input.pageToken = pageToken;
      }

      if (!instanceId) {
        throw new BadRequestException('未配置多维表格插件实例');
      }
      const result = await this.capabilityService
        .load(instanceId)
        .call('searchRecords', input) as Record<string, unknown>;

      const records = (result.records as Array<Record<string, unknown>>) || [];
      for (const record of records) {
        const fields = (record.record as Record<string, unknown>) || record;
        allRecords.push(this.flattenBitableFields(fields));
      }

      const hasMore = result.hasMore as boolean;
      const nextToken = result.pageToken as string | undefined;
      if (!hasMore || !nextToken) break;
      pageToken = nextToken;
    }

    return allRecords;
  }

  private flattenBitableFields(fields: Record<string, unknown>): Record<string, unknown> {
    const flat: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (value && typeof value === 'object' && 'text' in value) {
        flat[key] = (value as Record<string, unknown>).text;
      } else if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object' && 'text' in value[0]) {
        flat[key] = (value[0] as Record<string, unknown>).text;
      } else {
        flat[key] = value;
      }
    }
    return flat;
  }

  private importByEntity(entity: string, data: Array<Record<string, unknown>>): Promise<ImportResult> {
    switch (entity) {
      case 'products': return this.importProducts(data);
      case 'inventory': return this.importInventory(data);
      case 'customers': return this.importCustomers(data);
      case 'after-sale': return this.importAfterSaleOrders(data);
      case 'channels': return this.importChannels(data);
      case 'keywords': return this.importKeywords(data);
      default: return Promise.resolve({ imported: 0, errors: [`未知类型: ${entity}`] });
    }
  }

  async importProducts(items: Array<Record<string, unknown>>): Promise<ImportResult> {
    let imported = 0;
    const errors: string[] = [];
    for (let i = 0; i < items.length; i++) {
      const row = items[i];
      try {
        const name = String(getField(row, '商品名称', 'name') ?? '').trim();
        if (!name) {
          errors.push(`行${i + 1}: 缺少商品名称`);
          continue;
        }
        await this.db.insert(product).values({
          name,
          category: String(getField(row, '分类', 'category') ?? '未分类'),
          price: toNum(getField(row, '售价', 'price')),
          cost: toNum(getField(row, '成本', 'cost')),
          shippingCost: toNum(getField(row, '运费', 'shippingCost')),
          refundLossRate: toNum(getField(row, '退款损耗率', 'refundLossRate')),
          salesVolume: toInt(getField(row, '销量', 'salesVolume')),
          salesAmount: toNum(getField(row, '销售额', 'salesAmount')),
          profit: toNum(getField(row, '利润', 'profit')),
          profitMargin: toNum(getField(row, '利润率', 'profitMargin')),
          conversionRate: toNum(getField(row, '转化率', 'conversionRate')),
          status: String(getField(row, '状态', 'status') ?? '潜力款'),
          daysZeroSales: toInt(getField(row, '零销量天数', 'daysZeroSales')),
        }).returning();
        imported++;
      } catch (err) {
        this.logger.error(`导入商品行${i + 1}失败: ${JSON.stringify(err)}`);
        errors.push(`行${i + 1}: 导入失败`);
      }
    }
    return { imported, errors };
  }

  async importInventory(items: Array<Record<string, unknown>>): Promise<ImportResult> {
    let imported = 0;
    const errors: string[] = [];
    for (let i = 0; i < items.length; i++) {
      const row = items[i];
      try {
        const productName = String(getField(row, '商品名称', 'productName') ?? '').trim();
        if (!productName) {
          errors.push(`行${i + 1}: 缺少商品名称`);
          continue;
        }
        await this.db.insert(inventory).values({
          productId: String(getField(row, '商品ID', 'productId') ?? ''),
          productName,
          category: String(getField(row, '分类', 'category') ?? '未分类'),
          currentStock: toInt(getField(row, '当前库存', 'currentStock')),
          safetyStock: toInt(getField(row, '安全库存', 'safetyStock')),
          avgDailySales7d: toNum(getField(row, '近7天日均销量', 'avgDailySales7d')),
          avgDailySales30d: toNum(getField(row, '近30天日均销量', 'avgDailySales30d')),
          daysAvailable: toInt(getField(row, '可售天数', 'daysAvailable'), 365),
          suggestedRestock: toInt(getField(row, '建议补货量', 'suggestedRestock')),
          isSlowMoving: toBool(getField(row, '是否滞销', 'isSlowMoving')),
          stockValue: toNum(getField(row, '库存金额', 'stockValue')),
        }).returning();
        imported++;
      } catch (err) {
        this.logger.error(`导入库存行${i + 1}失败: ${JSON.stringify(err)}`);
        errors.push(`行${i + 1}: 导入失败`);
      }
    }
    return { imported, errors };
  }

  async importCustomers(items: Array<Record<string, unknown>>): Promise<ImportResult> {
    let imported = 0;
    const errors: string[] = [];
    for (let i = 0; i < items.length; i++) {
      const row = items[i];
      try {
        const customerCode = String(getField(row, '客户编号', 'customerCode') ?? '').trim();
        if (!customerCode) {
          errors.push(`行${i + 1}: 缺少客户编号`);
          continue;
        }
        await this.db.insert(customer).values({
          customerCode,
          firstPurchaseDate: String(getField(row, '首购日期', 'firstPurchaseDate') ?? ''),
          totalSpent: toNum(getField(row, '累计消费', 'totalSpent')),
          purchaseCount: toInt(getField(row, '购买次数', 'purchaseCount')),
          lastPurchaseDate: String(getField(row, '最后购买', 'lastPurchaseDate', 'lastPurchase') ?? ''),
          rfmScore: toInt(getField(row, 'RFM评分', 'rfmScore')),
          tag: String(getField(row, '标签', 'tag') ?? '新客'),
        }).returning();
        imported++;
      } catch (err) {
        this.logger.error(`导入客户行${i + 1}失败: ${JSON.stringify(err)}`);
        errors.push(`行${i + 1}: 导入失败`);
      }
    }
    return { imported, errors };
  }

  async importAfterSaleOrders(items: Array<Record<string, unknown>>): Promise<ImportResult> {
    let imported = 0;
    const errors: string[] = [];
    for (let i = 0; i < items.length; i++) {
      const row = items[i];
      try {
        const productName = String(getField(row, '商品名称', 'productName') ?? '').trim();
        if (!productName) {
          errors.push(`行${i + 1}: 缺少商品名称`);
          continue;
        }
        const orderNo = String(getField(row, '订单号', 'orderNo') ?? genOrderNo()).trim();
        await this.db.insert(afterSaleOrder).values({
          orderNo,
          productId: String(getField(row, '商品ID', 'productId') ?? ''),
          productName,
          reason: String(getField(row, '售后原因', 'reason') ?? '其他'),
          handleType: String(getField(row, '处理类型', 'handleType') ?? 'refund'),
          refundAmount: toNum(getField(row, '退款金额', 'refundAmount')),
          compensationAmount: toNum(getField(row, '补偿金额', 'compensationAmount')),
          status: String(getField(row, '状态', 'status') ?? '待处理'),
          processDuration: toNum(getField(row, '处理时长', 'processDuration')),
          isOverdue: toBool(getField(row, '是否超时', 'isOverdue')),
        }).returning();
        imported++;
      } catch (err) {
        this.logger.error(`导入售后单行${i + 1}失败: ${JSON.stringify(err)}`);
        errors.push(`行${i + 1}: 导入失败`);
      }
    }
    return { imported, errors };
  }

  async importChannels(items: Array<Record<string, unknown>>): Promise<ImportResult> {
    let imported = 0;
    const errors: string[] = [];
    for (let i = 0; i < items.length; i++) {
      const row = items[i];
      try {
        const name = String(getField(row, '渠道名称', 'name') ?? '').trim();
        if (!name) {
          errors.push(`行${i + 1}: 缺少渠道名称`);
          continue;
        }
        await this.db.insert(channel).values({
          name,
          cost: toNum(getField(row, '花费', 'cost')),
          clicks: toInt(getField(row, '点击量', 'clicks')),
          ctr: toNum(getField(row, '点击率', 'ctr')),
          conversionRate: toNum(getField(row, '转化率', 'conversionRate')),
          gmv: toNum(getField(row, 'GMV', 'gmv')),
          roi: toNum(getField(row, 'ROI', 'roi')),
        }).returning();
        imported++;
      } catch (err) {
        this.logger.error(`导入渠道行${i + 1}失败: ${JSON.stringify(err)}`);
        errors.push(`行${i + 1}: 导入失败`);
      }
    }
    return { imported, errors };
  }

  async importKeywords(items: Array<Record<string, unknown>>): Promise<ImportResult> {
    let imported = 0;
    const errors: string[] = [];
    for (let i = 0; i < items.length; i++) {
      const row = items[i];
      try {
        const content = String(getField(row, '内容', 'content') ?? '').trim();
        if (!content) {
          errors.push(`行${i + 1}: 缺少关键词内容`);
          continue;
        }
        await this.db.insert(trafficKeyword).values({
          content,
          type: String(getField(row, '类型', 'type') ?? 'keyword'),
          clicks: toInt(getField(row, '点击量', 'clicks')),
          conversionRate: toNum(getField(row, '转化率', 'conversionRate')),
          gmv: toNum(getField(row, 'GMV', 'gmv')),
          roi: toNum(getField(row, 'ROI', 'roi')),
        }).returning();
        imported++;
      } catch (err) {
        this.logger.error(`导入关键词行${i + 1}失败: ${JSON.stringify(err)}`);
        errors.push(`行${i + 1}: 导入失败`);
      }
    }
    return { imported, errors };
  }
}
