import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  and,
  count,
  desc,
  eq,
  gte,
  inArray,
  lte,
  sql,
  type SQL,
} from 'drizzle-orm';
import {
  AuthNPaasService,
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from '@lark-apaas/fullstack-nestjs-core';
import { inventoryFlow, productProfile } from '@server/database/schema';
import {
  BitableClient,
  readDateField,
  readLinkIds,
  readNumberField,
  readTextField,
  type BitableFilter,
  type BitableFilterCondition,
  type BitableRecordItem,
} from '@server/common/utils/bitable-client';
import { CAPABILITY_INSTANCE_IDS } from '@server/common/constants/capability-instance-ids';
import type { OperatorContext } from '@server/modules/auth/auth.types';
import {
  type CreateProductRequest,
  type CreateProductResponse,
  type Product,
  type ProductListParams,
  type ProductListResponse,
  type ProductMutationResponse,
  type StockChangeListParams,
  type StockChangeListResponse,
  type StockChangeRecord,
  type StockChangeRequest,
  type StockChangeResponse,
  type StocktakeResponse,
  type UpdateProductRequest,
} from '@shared/product';
import type {
  InventoryFlow,
  InventoryFlowListParams,
  InventoryFlowListResponse,
} from '@shared/inventory-flow';

type ProductProfileRow = typeof productProfile.$inferSelect;
type InventoryFlowRow = typeof inventoryFlow.$inferSelect;

/** 商品库存表字段名（多维表格真实字段） */
const PRODUCT_FIELD = {
  productName: '商品名称',
  sku: 'SKU编码',
  brand: '品牌',
  specModel: '规格型号',
  price: '销售单价',
  stock: '总库存数量',
  warningThreshold: '安全库存预警值',
  warehouse: '仓库位置',
} as const;

/** 库存变动表字段名（多维表格真实字段） */
const STOCK_CHANGE_FIELD = {
  changeNo: '变动编号',
  product: '商品',
  changeType: '变动类型',
  quantity: '变动数量',
  changeTime: '变动时间',
  remark: '备注',
};

/** 库存变动表关联字段（经独立维护实例读写，主实例快照不含链接字段） */
const STOCK_CHANGE_LINK_FIELD = {
  relatedOrder: '关联订单',
  relatedShipment: '关联发货单',
};

/** 库存流水类型（订单相关类型为写入时自动创建的单选选项） */
export type StockFlowKind =
  | '入库'
  | '出库'
  | '其他出库'
  | '订单出库'
  | '订单恢复'
  | '发货出库'
  | '发货退回'
  | '采购入库'
  | '退货入库'
  | '盘点调整';

/** 流水变动类型 → 应用库流水台账业务类型映射 */
const FLOW_BUSINESS_TYPE_MAP: Record<StockFlowKind, string> = {
  入库: '采购入库',
  采购入库: '采购入库',
  退货入库: '退货入库',
  订单出库: '销售出库',
  发货出库: '发货出库',
  发货退回: '发货退回',
  订单恢复: '订单恢复',
  出库: '其他出库',
  其他出库: '其他出库',
  盘点调整: '盘点调整',
};

/** 关联订单号从流水备注中的提取规则 */
const ORDER_NO_PATTERN = /(JSD\d{6,})/;

/** 商品/库存变动查询单次最大条数 */
const PRODUCT_PAGE_SIZE = 500;

/** 新增商品默认安全库存预警值 */
const DEFAULT_WARNING_THRESHOLD = 10;

/** SingleSelect 读值为 string；Text 读值为 { text } */
function readSelectField(value: unknown): string {
  if (typeof value === 'string') return value;
  return readTextField(value);
}

function padStart2(value: number): string {
  return String(value).padStart(2, '0');
}

/** 库存变动编号：CK+日期(8位)+3位随机数 */
function generateChangeNo(now: Date): string {
  const datePart = [
    String(now.getFullYear()),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('');
  const randomPart = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
  return `CK${datePart}${randomPart}`;
}

/** 自动 SKU 编码：SP+日期(8位)+4位随机数 */
function generateSku(now: Date): string {
  const datePart = [
    String(now.getFullYear()),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('');
  const randomPart = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  return `SP${datePart}${randomPart}`;
}

/** 生成应用库流水号：LS + yyyyMMdd + 4 位随机数字 */
function generateFlowNo(now: Date): string {
  const datePart = `${String(now.getFullYear())}${padStart2(
    now.getMonth() + 1,
  )}${padStart2(now.getDate())}`;
  const randomPart = String(Math.floor(Math.random() * 10000)).padStart(
    4,
    '0',
  );
  return `LS${datePart}${randomPart}`;
}

/** Drizzle 可能把原始 PostgreSQL error 放在 cause 链里，逐层提取 SQLSTATE */
function extractPostgresErrorCode(error: unknown): string | undefined {
  let current: unknown = error;
  for (
    let depth = 0;
    depth < 4 && current && typeof current === 'object';
    depth += 1
  ) {
    const { code, cause } = current as { code?: unknown; cause?: unknown };
    if (typeof code === 'string') return code;
    current = cause;
  }
  return undefined;
}

@Injectable()
export class ProductService {
  private readonly logger = new Logger(ProductService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    private readonly bitableClient: BitableClient,
    private readonly authn: AuthNPaasService,
  ) {}

  /** 商品列表（keyword/warningOnly 内存过滤；成本类字段按权限隐藏） */
  async listProducts(
    params: ProductListParams,
    operator?: OperatorContext,
  ): Promise<ProductListResponse> {
    const result = await this.bitableClient.searchRecords(
      CAPABILITY_INSTANCE_IDS.product,
      {
        pageSize: PRODUCT_PAGE_SIZE,
        fieldNames: [
          PRODUCT_FIELD.productName,
          PRODUCT_FIELD.sku,
          PRODUCT_FIELD.brand,
          PRODUCT_FIELD.specModel,
          PRODUCT_FIELD.price,
          PRODUCT_FIELD.stock,
          PRODUCT_FIELD.warningThreshold,
          PRODUCT_FIELD.warehouse,
        ],
      },
    );

    let items: Product[] = result.records.map((item: BitableRecordItem) =>
      this.mapProduct(item),
    );

    const keyword = params.keyword?.trim();
    if (keyword) {
      items = items.filter(
        (product: Product) =>
          product.productName.includes(keyword) ||
          product.productNo.includes(keyword),
      );
    }
    if (params.warningOnly) {
      items = items.filter((product: Product) => product.isWarning === true);
    }

    const costVisible: boolean =
      operator?.permissions.includes('cost:view') ?? false;
    items = await this.enrichProducts(items, costVisible);
    return { items, total: items.length };
  }

  /** 创建商品（SKU 自动生成），初始库存大于 0 时自动记一条「入库」流水 */
  async createProduct(
    dto: CreateProductRequest,
    userId?: string,
  ): Promise<CreateProductResponse> {
    const productName: string = dto.productName.trim();
    if (productName === '') {
      throw new BadRequestException('商品名称不能为空');
    }
    if (typeof dto.price !== 'number' || Number.isNaN(dto.price) || dto.price < 0) {
      throw new BadRequestException('销售单价必须为非负数字');
    }
    if (!Number.isInteger(dto.initialStock) || dto.initialStock < 0) {
      throw new BadRequestException('初始库存必须为非负整数');
    }
    const warningThreshold: number =
      typeof dto.warningThreshold === 'number' &&
      !Number.isNaN(dto.warningThreshold) &&
      dto.warningThreshold >= 0
        ? dto.warningThreshold
        : DEFAULT_WARNING_THRESHOLD;

    // SKU 自动生成，已被占用（并发/手动录入）时换号重试，最多 3 次；禁止 SELECT→计算→UPDATE 写数值模式，依赖 is 查重 + 唯一性换号
    let sku = '';
    for (let attempt = 0; attempt < 3 && sku === ''; attempt += 1) {
      const candidate: string = generateSku(new Date());
      const existing = await this.bitableClient.searchRecords(
        CAPABILITY_INSTANCE_IDS.product,
        {
          fieldNames: [PRODUCT_FIELD.sku],
          filter: {
            conjunction: 'and',
            conditions: [
              {
                fieldName: PRODUCT_FIELD.sku,
                operator: 'is',
                value: [candidate],
              },
            ],
          },
          pageSize: 1,
        },
      );
      if (existing.records.length === 0) {
        sku = candidate;
      } else {
        this.logger.warn(`sku ${candidate} exists, regenerating`);
      }
    }
    if (sku === '') {
      throw new ConflictException('SKU 编码生成失败，请重试');
    }

    const record: Record<string, unknown> = {
      [PRODUCT_FIELD.productName]: productName,
      [PRODUCT_FIELD.sku]: sku,
      [PRODUCT_FIELD.price]: dto.price,
      [PRODUCT_FIELD.stock]: dto.initialStock,
      [PRODUCT_FIELD.warningThreshold]: warningThreshold,
    };
    if (dto.brand !== undefined && dto.brand.trim() !== '') {
      record[PRODUCT_FIELD.brand] = dto.brand.trim();
    }
    if (dto.specModel !== undefined && dto.specModel.trim() !== '') {
      record[PRODUCT_FIELD.specModel] = dto.specModel.trim();
    }

    const output = await this.bitableClient.batchAddRecords(
      CAPABILITY_INSTANCE_IDS.product,
      [{ record }],
    );
    const id: string | undefined = output.records[0]?.id;
    if (!id) {
      throw new NotFoundException('商品记录创建失败');
    }

    if (dto.imageUrl !== undefined && dto.imageUrl !== '') {
      await this.saveProductImage(id, dto.imageUrl, userId);
    }

    if (dto.costPrice !== undefined) {
      try {
        await this.updateProductProfile(id, dto.costPrice, userId ?? '');
      } catch (error) {
        await this.rollbackCreatedProduct(id, sku);
        throw error;
      }
    }

    if (dto.initialStock > 0) {
      try {
        await this.writeStockFlow(id, '采购入库', dto.initialStock, '新增商品初始入库');
      } catch (error) {
        await this.rollbackCreatedProduct(id, sku);
        throw error;
      }

      try {
        await this.writeInventoryFlow({
          productId: id,
          productName,
          direction: 1,
          businessType: FLOW_BUSINESS_TYPE_MAP['采购入库'],
          quantity: dto.initialStock,
          stockBefore: 0,
          stockAfter: dto.initialStock,
          orderNo: '',
          shipmentNo: '',
          operator: userId,
          remark: '新增商品初始入库',
        });
      } catch (error) {
        await this.rollbackCreatedProduct(id, sku);
        throw error;
      }
    }

    this.logger.log(`product created: id=${id} sku=${sku}`);
    return { id, productNo: sku };
  }

  /** 商品图片保存到 product_profile（尽力而为，失败仅告警不阻断商品创建） */
  private async saveProductImage(
    productId: string,
    imageUrl: string,
    userId?: string,
  ): Promise<void> {
    const now = new Date();
    try {
      await this.db
        .insert(productProfile)
        .values({
          productId,
          costPrice: '0',
          imageUrl,
          createdBy: userId,
          updatedBy: userId,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: productProfile.productId,
          set: { imageUrl, updatedAt: now, updatedBy: userId },
        });
    } catch (error) {
      this.logger.warn(
        `save product image failed for ${productId}: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
  }

  /** 流水写入失败时删除刚创建的商品记录（回滚） */
  private async rollbackCreatedProduct(
    id: string,
    sku: string,
  ): Promise<void> {
    try {
      await this.bitableClient.deleteRecords(CAPABILITY_INSTANCE_IDS.product, [id]);
      this.logger.warn(`product ${sku} deleted after stock flow failure`);
    } catch (deleteError) {
      this.logger.error(
        `rollback delete failed for ${sku}: ${deleteError instanceof Error ? deleteError.message : 'unknown'}`,
      );
    }
  }

  /**
   * 库存联动原子化核心：更新商品库存 + 写库存变动流水。
   * 流水写入失败时补偿回滚库存，保证两张表最终一致。
   * @param direction 1=入库方向（加库存），-1=出库方向（减库存）
   * @param extra 可选：操作人（妙搭 userId）与关联订单号/发货单号，写入应用库流水
   * @returns 变动后的最新库存
   */
  async applyStockChange(
    productId: string,
    direction: 1 | -1,
    quantity: number,
    kind: StockFlowKind,
    remark?: string,
    extra?: {
      operator?: string;
      orderNo?: string;
      shipmentNo?: string;
      orderRecordId?: string;
      shipmentRecordId?: string;
    },
  ): Promise<number> {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new BadRequestException('变动数量必须是正整数');
    }
    const { record } = await this.bitableClient.getRecord(
      CAPABILITY_INSTANCE_IDS.product,
      productId,
    );
    if (!record || Object.keys(record).length === 0) {
      throw new NotFoundException('商品不存在');
    }
    // 变动前库存必须在更新前读取，供应用库流水记录 stockBefore/stockAfter
    const currentStock = readNumberField(record[PRODUCT_FIELD.stock]);
    const productName = readTextField(record[PRODUCT_FIELD.productName]);
    const newStock = currentStock + direction * quantity;
    if (newStock < 0) {
      throw new ConflictException(
        `库存不足：当前库存 ${currentStock}，本次需扣减 ${quantity}`,
      );
    }

    await this.bitableClient.batchUpdateRecords(
      CAPABILITY_INSTANCE_IDS.product,
      [{ id: productId, record: { [PRODUCT_FIELD.stock]: newStock } }],
    );

    try {
      await this.writeStockFlow(productId, kind, quantity, remark ?? '', {
        orderRecordId: extra?.orderRecordId,
        shipmentRecordId: extra?.shipmentRecordId,
      });
    } catch (error) {
      try {
        await this.bitableClient.batchUpdateRecords(
          CAPABILITY_INSTANCE_IDS.product,
          [{ id: productId, record: { [PRODUCT_FIELD.stock]: currentStock } }],
        );
        this.logger.warn(
          `stock flow failed, stock of ${productId} rolled back to ${currentStock}`,
        );
      } catch (rollbackError) {
        this.logger.error(
          `stock rollback failed for ${productId}: ${rollbackError instanceof Error ? rollbackError.message : 'unknown'}`,
        );
      }
      throw error;
    }

    try {
      await this.writeInventoryFlow({
        productId,
        productName,
        direction,
        businessType: FLOW_BUSINESS_TYPE_MAP[kind],
        quantity,
        stockBefore: currentStock,
        stockAfter: newStock,
        orderNo: extra?.orderNo ?? '',
        shipmentNo: extra?.shipmentNo ?? '',
        operator: extra?.operator,
        remark: remark ?? '',
      });
    } catch (error) {
      try {
        await this.bitableClient.batchUpdateRecords(
          CAPABILITY_INSTANCE_IDS.product,
          [{ id: productId, record: { [PRODUCT_FIELD.stock]: currentStock } }],
        );
        this.logger.error(
          `inventory flow failed, stock of ${productId} rolled back to ${currentStock}: ${error instanceof Error ? error.message : 'unknown'}`,
        );
      } catch (rollbackError) {
        this.logger.error(
          `stock rollback failed for ${productId}: ${rollbackError instanceof Error ? rollbackError.message : 'unknown'}`,
        );
      }
      throw error;
    }

    this.logger.log(
      `stock change: product=${productId} kind=${kind} quantity=${direction * quantity} newStock=${newStock}`,
    );
    return newStock;
  }

  /** 写应用数据库库存流水；流水号 23505 冲突时换号重试（最多 3 次） */
  private async writeInventoryFlow(input: {
    productId: string;
    productName: string;
    direction: 1 | -1;
    businessType: string;
    quantity: number;
    stockBefore: number;
    stockAfter: number;
    orderNo: string;
    shipmentNo: string;
    operator?: string;
    remark: string;
  }): Promise<void> {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const flowNo: string = generateFlowNo(new Date());
      try {
        await this.db.insert(inventoryFlow).values({
          flowNo,
          productId: input.productId,
          productName: input.productName,
          changeDirection: input.direction > 0 ? 'in' : 'out',
          businessType: input.businessType,
          quantity: input.quantity,
          stockBefore: input.stockBefore,
          stockAfter: input.stockAfter,
          orderNo: input.orderNo,
          shipmentNo: input.shipmentNo,
          operator: input.operator,
          operatedAt: new Date(),
          remark: input.remark,
        });
        return;
      } catch (error) {
        if (extractPostgresErrorCode(error) === '23505' && attempt < 2) {
          this.logger.warn(`flowNo ${flowNo} conflict, retrying`);
          continue;
        }
        throw error;
      }
    }
  }

  /** 查询商品当前库存（供订单链路预检） */
  async getProductStock(productId: string): Promise<number> {
    const { record } = await this.bitableClient.getRecord(
      CAPABILITY_INSTANCE_IDS.product,
      productId,
    );
    if (!record || Object.keys(record).length === 0) {
      throw new NotFoundException('商品不存在');
    }
    return readNumberField(record[PRODUCT_FIELD.stock]);
  }

  private async writeStockFlow(
    productId: string,
    kind: StockFlowKind,
    quantity: number,
    remark: string,
    links?: { orderRecordId?: string; shipmentRecordId?: string },
  ): Promise<void> {
    const now = new Date();
    const output = await this.bitableClient.batchAddRecords(
      CAPABILITY_INSTANCE_IDS.stockChange,
      [
        {
          record: {
            [STOCK_CHANGE_FIELD.changeNo]: generateChangeNo(now),
            [STOCK_CHANGE_FIELD.product]: [productId],
            [STOCK_CHANGE_FIELD.changeType]: kind,
            [STOCK_CHANGE_FIELD.quantity]: quantity,
            [STOCK_CHANGE_FIELD.changeTime]: now.getTime(),
            [STOCK_CHANGE_FIELD.remark]: remark,
          },
        },
      ],
    );
    const createdId: string | undefined = output.records[0]?.id;
    if (createdId) {
      await this.writeStockChangeLinks(createdId, links ?? {});
    }
  }

  /** 变动记录创建后补写关联订单/关联发货单链接；尽力而为，失败仅告警不回滚库存 */
  private async writeStockChangeLinks(
    recordId: string,
    links: { orderRecordId?: string; shipmentRecordId?: string },
  ): Promise<void> {
    const record: Record<string, unknown> = {};
    if (links.orderRecordId) {
      record[STOCK_CHANGE_LINK_FIELD.relatedOrder] = [links.orderRecordId];
    }
    if (links.shipmentRecordId) {
      record[STOCK_CHANGE_LINK_FIELD.relatedShipment] = [links.shipmentRecordId];
    }
    if (Object.keys(record).length === 0) return;
    try {
      await this.bitableClient.batchUpdateRecords(
        CAPABILITY_INSTANCE_IDS.stockChangeLink,
        [{ id: recordId, record }],
      );
    } catch (error) {
      this.logger.warn(
        `stock change ${recordId} link fields fill failed: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
  }

  private mapProduct(item: BitableRecordItem): Product {
    const record: Record<string, unknown> = item.record;
    const stock = readNumberField(record[PRODUCT_FIELD.stock]);
    const warningThreshold = readNumberField(
      record[PRODUCT_FIELD.warningThreshold],
    );
    return {
      id: item.id,
      productNo: readTextField(record[PRODUCT_FIELD.sku]),
      productName: readTextField(record[PRODUCT_FIELD.productName]),
      price: readNumberField(record[PRODUCT_FIELD.price]),
      stock,
      warningThreshold,
      brand: readTextField(record[PRODUCT_FIELD.brand]),
      specModel: readTextField(record[PRODUCT_FIELD.specModel]),
      warehouse: readTextField(record[PRODUCT_FIELD.warehouse]),
      isWarning: stock < warningThreshold,
      costPrice: 0,
      stockValue: 0,
      cumulativeSales: 0,
    };
  }

  /**
   * 批量补充成本价/库存金额/累计销量：
   * productProfile 一次 inArray 查询 + 销售出库流水一次聚合，Map 回填，禁止 N+1。
   */
  private async enrichProducts(
    products: Product[],
    costVisible: boolean,
  ): Promise<Product[]> {
    if (products.length === 0) return products;
    const productIds: string[] = products.map(
      (product: Product): string => product.id,
    );

    const profiles: ProductProfileRow[] = await this.db
      .select()
      .from(productProfile)
      .where(inArray(productProfile.productId, productIds));
    const costByProductId = new Map<string, number>();
    const imageByProductId = new Map<string, string>();
    for (const profile of profiles) {
      if (costVisible) {
        costByProductId.set(profile.productId, Number(profile.costPrice));
      }
      if (profile.imageUrl) {
        imageByProductId.set(profile.productId, profile.imageUrl);
      }
    }

    const salesRows: Array<{ productId: string; total: number }> =
      await this.db
        .select({
          productId: inventoryFlow.productId,
          total: sql<number>`sum(${inventoryFlow.quantity})`,
        })
        .from(inventoryFlow)
        .where(eq(inventoryFlow.businessType, '销售出库'))
        .groupBy(inventoryFlow.productId);
    const salesByProductId = new Map<string, number>();
    for (const row of salesRows) {
      salesByProductId.set(row.productId, Number(row.total));
    }

    return products.map((product: Product): Product => {
      const costPrice: number = costByProductId.get(product.id) ?? 0;
      return {
        ...product,
        costPrice,
        imageUrl: imageByProductId.get(product.id),
        stockValue: Math.round(product.stock * costPrice * 100) / 100,
        cumulativeSales: salesByProductId.get(product.id) ?? 0,
      };
    });
  }

  /** 更新商品信息与预警阈值（只写提供的字段；价格类字段需价格修改权限） */
  async updateProduct(
    id: string,
    dto: UpdateProductRequest,
    userId?: string,
    operator?: OperatorContext,
  ): Promise<ProductMutationResponse> {
    const priceTouched: boolean =
      dto.price !== undefined || dto.costPrice !== undefined;
    if (priceTouched && !(operator?.permissions.includes('price:manage') ?? false)) {
      throw new ForbiddenException('仅管理员与财务可修改价格与成本价');
    }
    if (dto.price !== undefined && (typeof dto.price !== 'number' || dto.price < 0)) {
      throw new BadRequestException('销售单价必须为非负数字');
    }
    if (
      dto.warningThreshold !== undefined &&
      (typeof dto.warningThreshold !== 'number' || dto.warningThreshold < 0)
    ) {
      throw new BadRequestException('安全库存预警值必须为非负数字');
    }
    if (
      dto.productName !== undefined &&
      (typeof dto.productName !== 'string' || dto.productName.trim() === '')
    ) {
      throw new BadRequestException('商品名称不能为空');
    }
    if (
      dto.costPrice !== undefined &&
      (typeof dto.costPrice !== 'number' || dto.costPrice < 0)
    ) {
      throw new BadRequestException('成本价必须为非负数字');
    }

    const patch: Record<string, unknown> = {};
    if (dto.productName !== undefined) {
      patch[PRODUCT_FIELD.productName] = dto.productName.trim();
    }
    if (dto.price !== undefined) patch[PRODUCT_FIELD.price] = dto.price;
    if (dto.warningThreshold !== undefined) {
      patch[PRODUCT_FIELD.warningThreshold] = dto.warningThreshold;
    }
    if (Object.keys(patch).length === 0 && dto.costPrice === undefined) {
      throw new BadRequestException('未提供可更新字段');
    }

    const { record } = await this.bitableClient.getRecord(
      CAPABILITY_INSTANCE_IDS.product,
      id,
    );
    if (!record || Object.keys(record).length === 0) {
      throw new NotFoundException('商品不存在');
    }

    if (Object.keys(patch).length > 0) {
      await this.bitableClient.batchUpdateRecords(
        CAPABILITY_INSTANCE_IDS.product,
        [{ id, record: patch }],
      );
      this.logger.log(`product ${id} updated: ${JSON.stringify(Object.keys(patch))}`);
    }
    if (dto.costPrice !== undefined) {
      await this.updateProductProfile(id, dto.costPrice, userId ?? '');
    }
    return { success: true };
  }

  /** 删除商品：存在未取消订单或剩余库存时禁止，同步清理应用库商品档案 */
  async remove(id: string): Promise<ProductMutationResponse> {
    const { record } = await this.bitableClient.getRecord(
      CAPABILITY_INSTANCE_IDS.product,
      id,
    );
    if (!record || Object.keys(record).length === 0) {
      throw new NotFoundException('商品不存在');
    }

    const stock: number = readNumberField(record[PRODUCT_FIELD.stock]);
    if (stock > 0) {
      throw new ConflictException(
        `该商品剩余库存 ${stock} 件，请先处理库存后再删除`,
      );
    }

    const ordersOutput = await this.bitableClient.searchRecords(
      CAPABILITY_INSTANCE_IDS.order,
      {
        pageSize: 200,
        fieldNames: ['订单状态'],
        filter: {
          conjunction: 'and',
          conditions: [{ fieldName: '商品', operator: 'is', value: [id] }],
        },
      },
    );
    const activeOrderCount: number = ordersOutput.records.filter(
      (item): boolean =>
        typeof item.record['订单状态'] === 'string' &&
        item.record['订单状态'] !== '已取消',
    ).length;
    if (activeOrderCount > 0) {
      throw new ConflictException(
        `该商品存在 ${activeOrderCount} 笔未取消订单，无法删除`,
      );
    }

    const output = await this.bitableClient.deleteRecords(
      CAPABILITY_INSTANCE_IDS.product,
      [id],
    );
    await this.db
      .delete(productProfile)
      .where(eq(productProfile.productId, id));
    this.logger.log(`product ${id} deleted`);
    return { success: output.success };
  }

  /** 入库/其他出库登记：更新库存 + 写库存变动流水（原子联动） */
  async createStockChange(
    id: string,
    dto: StockChangeRequest,
    userId: string,
  ): Promise<StockChangeResponse> {
    const isIn = dto.changeType === 'in';
    const isOut =
      dto.changeType === 'otherOut' || dto.changeType === 'out';
    if (!isIn && !isOut) {
      throw new BadRequestException(
        '变动类型必须是 in（入库）或 otherOut（其他出库）',
      );
    }
    if (!Number.isInteger(dto.quantity) || dto.quantity <= 0) {
      throw new BadRequestException('变动数量必须是正整数');
    }

    let kind: StockFlowKind;
    if (isIn) {
      if (dto.businessType !== '采购入库' && dto.businessType !== '退货入库') {
        throw new BadRequestException(
          '入库必须指定业务类型：采购入库或退货入库',
        );
      }
      kind = dto.businessType;
    } else {
      kind = '其他出库';
    }

    const direction: 1 | -1 = isIn ? 1 : -1;
    const newStock = await this.applyStockChange(
      id,
      direction,
      dto.quantity,
      kind,
      dto.remark ?? '',
      { operator: userId },
    );
    return {
      success: true,
      currentStock: newStock,
      stockBefore: newStock - direction * dto.quantity,
    };
  }

  /** 库存盘点：实盘数量与当前库存比对，差值经「盘点调整」流水原子调整 */
  async stocktake(
    productId: string,
    actualQuantity: number,
    remark: string | undefined,
    userId: string,
  ): Promise<StocktakeResponse> {
    if (
      typeof actualQuantity !== 'number' ||
      !Number.isInteger(actualQuantity) ||
      actualQuantity < 0
    ) {
      throw new BadRequestException('实盘数量必须是非负整数');
    }
    const currentStock: number = await this.getProductStock(productId);
    const diff: number = actualQuantity - currentStock;
    if (diff === 0) {
      return { adjusted: 0, stockAfter: actualQuantity };
    }
    const direction: 1 | -1 = diff > 0 ? 1 : -1;
    const label: string = diff > 0 ? '盘盈' : '盘亏';
    const trimmedRemark: string = remark?.trim() ?? '';
    const flowRemark: string = `盘点：${currentStock} → ${actualQuantity}（${label} ${Math.abs(diff)}）${trimmedRemark !== '' ? `，${trimmedRemark}` : ''}`;
    await this.applyStockChange(
      productId,
      direction,
      Math.abs(diff),
      '盘点调整',
      flowRemark,
      { operator: userId },
    );
    this.logger.log(
      `stocktake: product=${productId} ${currentStock} -> ${actualQuantity}`,
    );
    return { adjusted: diff, stockAfter: actualQuantity };
  }

  /** 库存变动流水列表（productId/orderNo 走 filter，按变动时间倒序） */
  async listStockChanges(
    params: StockChangeListParams,
  ): Promise<StockChangeListResponse> {
    const rawPageSize = params.pageSize ?? 20;
    const pageSize = Math.min(Math.max(Math.floor(rawPageSize) || 20, 1), 100);

    const conditions: BitableFilterCondition[] = [];
    if (params.productId) {
      conditions.push({
        fieldName: STOCK_CHANGE_FIELD.product,
        operator: 'is',
        value: [params.productId],
      });
    }
    if (params.orderNo) {
      conditions.push({
        fieldName: STOCK_CHANGE_FIELD.remark,
        operator: 'contains',
        value: [params.orderNo],
      });
    }
    const filter: BitableFilter | undefined =
      conditions.length > 0
        ? { conjunction: 'and', conditions }
        : undefined;

    const result = await this.bitableClient.searchRecords(
      CAPABILITY_INSTANCE_IDS.stockChange,
      {
        filter,
        sort: [{ fieldName: STOCK_CHANGE_FIELD.changeTime, desc: true }],
        pageSize,
      },
    );

    const changes: StockChangeRecord[] = result.records.map(
      (item: BitableRecordItem): StockChangeRecord => {
        const record: Record<string, unknown> = item.record;
        const linkIds = readLinkIds(record[STOCK_CHANGE_FIELD.product]);
        const changeType = readSelectField(record[STOCK_CHANGE_FIELD.changeType]);
        const remark = readTextField(record[STOCK_CHANGE_FIELD.remark]);
        const orderNoMatch = remark.match(ORDER_NO_PATTERN);
        return {
          id: item.id,
          productId: linkIds.length > 0 ? linkIds[0] : '',
          productName: '',
          changeType,
          quantity: readNumberField(record[STOCK_CHANGE_FIELD.quantity]),
          changeTime: readDateField(record[STOCK_CHANGE_FIELD.changeTime]),
          orderNo: orderNoMatch ? orderNoMatch[1] : undefined,
          remark,
        };
      },
    );

    // 批量拉商品表建 id→名称 Map，禁止 N+1
    const productIds = Array.from(
      new Set(
        changes
          .map((change: StockChangeRecord) => change.productId)
          .filter((pid: string) => pid !== ''),
      ),
    );
    const nameMap = new Map<string, string>();
    if (productIds.length > 0) {
      const products = await this.bitableClient.searchRecords(
        CAPABILITY_INSTANCE_IDS.product,
        {
          pageSize: PRODUCT_PAGE_SIZE,
          fieldNames: [PRODUCT_FIELD.productName],
        },
      );
      for (const product of products.records) {
        nameMap.set(
          product.id,
          readTextField(product.record[PRODUCT_FIELD.productName]),
        );
      }
    }
    const items = changes.map((change: StockChangeRecord) => ({
      ...change,
      productName: nameMap.get(change.productId) ?? '',
    }));

    return { items, total: result.total };
  }

  /** 应用库库存流水台账：商品/业务类型/日期范围过滤，操作时间倒序分页 */
  async listInventoryFlows(
    params: InventoryFlowListParams,
  ): Promise<InventoryFlowListResponse> {
    const page: number = Math.max(Math.floor(params.page ?? 1) || 1, 1);
    const pageSize: number = Math.min(
      Math.max(Math.floor(params.pageSize ?? 20) || 20, 1),
      100,
    );

    const conditions: SQL[] = [];
    if (params.productId) {
      conditions.push(eq(inventoryFlow.productId, params.productId));
    }
    if (params.businessType) {
      conditions.push(eq(inventoryFlow.businessType, params.businessType));
    }
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (params.startTime) {
      if (!datePattern.test(params.startTime)) {
        throw new BadRequestException('startTime 格式必须为 YYYY-MM-DD');
      }
      conditions.push(
        gte(
          inventoryFlow.operatedAt,
          new Date(`${params.startTime}T00:00:00+08:00`),
        ),
      );
    }
    if (params.endTime) {
      if (!datePattern.test(params.endTime)) {
        throw new BadRequestException('endTime 格式必须为 YYYY-MM-DD');
      }
      conditions.push(
        lte(
          inventoryFlow.operatedAt,
          new Date(`${params.endTime}T23:59:59+08:00`),
        ),
      );
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const countResult: Array<{ count: number }> = await this.db
      .select({ count: count() })
      .from(inventoryFlow)
      .where(where);
    const total: number = Number(countResult[0]?.count ?? 0);

    const rows: InventoryFlowRow[] =
      total === 0
        ? []
        : await this.db
            .select()
            .from(inventoryFlow)
            .where(where)
            .orderBy(desc(inventoryFlow.operatedAt))
            .offset((page - 1) * pageSize)
            .limit(pageSize);

    const operatorNameById = await this.loadOperatorNames(rows);
    const items: InventoryFlow[] = rows.map(
      (row: InventoryFlowRow): InventoryFlow => {
        const operatorId: string = row.operator ?? '';
        return {
          id: row.id,
          flowNo: row.flowNo,
          productId: row.productId,
          productName: row.productName,
          changeDirection: row.changeDirection === 'in' ? 'in' : 'out',
          businessType: row.businessType,
          quantity: row.quantity,
          stockBefore: row.stockBefore,
          stockAfter: row.stockAfter,
          orderNo: row.orderNo,
          shipmentNo: row.shipmentNo,
          operatorId,
          operatorName: operatorNameById.get(operatorId) ?? '',
          operatedAt: row.operatedAt.toISOString(),
          remark: row.remark,
        };
      },
    );

    return { items, total, page, pageSize };
  }

  /** 更新商品成本价档案（product_profile upsert） */
  async updateProductProfile(
    productId: string,
    costPrice: number,
    userId: string,
  ): Promise<ProductMutationResponse> {
    if (typeof costPrice !== 'number' || Number.isNaN(costPrice) || costPrice < 0) {
      throw new BadRequestException('成本价必须为非负数字');
    }
    const { record } = await this.bitableClient.getRecord(
      CAPABILITY_INSTANCE_IDS.product,
      productId,
    );
    if (!record || Object.keys(record).length === 0) {
      throw new NotFoundException('商品不存在');
    }

    const operatorId: string = userId;
    const now = new Date();
    const costValue: string = costPrice.toFixed(2);
    const updated = await this.db
      .insert(productProfile)
      .values({
        productId,
        costPrice: costValue,
        createdBy: operatorId,
        updatedBy: operatorId,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: productProfile.productId,
        set: { costPrice: costValue, updatedAt: now, updatedBy: operatorId },
      })
      .returning({ id: productProfile.id });
    if (updated.length === 0) {
      throw new NotFoundException('商品档案更新失败');
    }
    this.logger.log(`product profile ${productId} costPrice=${costValue}`);
    return { success: true };
  }

  /** 批量翻译操作人姓名（miaoda_user_id → name），拿不到的回退空串 */
  private async loadOperatorNames(
    rows: InventoryFlowRow[],
  ): Promise<Map<string, string>> {
    const operatorIds: string[] = Array.from(
      new Set(
        rows
          .map((row: InventoryFlowRow): string => row.operator ?? '')
          .filter((uid: string): boolean => uid !== ''),
      ),
    );
    const nameById = new Map<string, string>();
    if (operatorIds.length === 0) {
      return nameById;
    }
    const users = await this.authn.listUsersByIds(operatorIds);
    operatorIds.forEach((uid: string, index: number) => {
      const user = users[index] ?? null;
      nameById.set(uid, user?.name?.zh_cn ?? user?.name?.en_us ?? '');
    });
    return nameById;
  }
}
