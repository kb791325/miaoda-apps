import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { asc, eq, inArray } from 'drizzle-orm';
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from '@lark-apaas/fullstack-nestjs-core';
import {
  orderCostSnapshot,
  orderFee,
  productProfile,
} from '@server/database/schema';
import {
  BitableClient,
  readFormulaNumber,
  readLinkIds,
} from '@server/common/utils/bitable-client';
import { CAPABILITY_INSTANCE_IDS } from '@server/common/constants/capability-instance-ids';
import { FeeTypeService } from './fee-type.service';
import type {
  CreateOrderFeeRequest,
  OrderFee,
  OrderFeeListResponse,
  UpdateOrderFeeRequest,
} from '@shared/fee';

type OrderFeeRow = typeof orderFee.$inferSelect;
type OrderCostSnapshotRow = typeof orderCostSnapshot.$inferSelect;

/** 订单表关联字段（客户/商品/数量/订单金额公式）可读的实例 */
const ORDER_LINK_INSTANCE = 'bitable_order_1';

/** 安装费同步目标费用类型名称（系统预设） */
const INSTALL_FEE_TYPE_NAME = '安装费';

/** 安装费同步默认备注 */
const INSTALL_FEE_REMARK = '安装完成时自动添加';

/** 金额保留两位小数 */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** 订单财务汇总 */
export interface OrderFinancialSummary {
  /** 向客户收取的费用合计 */
  totalFee: number;
  /** 全部费用金额合计（成本口径） */
  totalCost: number;
  /** 订单总金额 = 商品金额 + 收取费用 */
  totalAmount: number;
  /** 利润 = 订单总金额 - 商品成本 - 全部费用 */
  profit: number;
  /** 利润率（%）= 利润 / 订单总金额 */
  profitRate: number;
}

@Injectable()
export class OrderFeeService {
  private readonly logger = new Logger(OrderFeeService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    private readonly bitableClient: BitableClient,
    private readonly feeTypeService: FeeTypeService,
  ) {}

  /** 订单费用列表（按创建时间升序） */
  async listByOrder(orderId: string): Promise<OrderFeeListResponse> {
    const rows: OrderFeeRow[] = await this.db
      .select()
      .from(orderFee)
      .where(eq(orderFee.orderId, orderId))
      .orderBy(asc(orderFee.createdAt));
    return { items: rows.map((row: OrderFeeRow) => this.mapOrderFee(row)) };
  }

  /** 批量聚合：订单 → 向客户收取的费用合计（列表页订单总金额用） */
  async sumTotalsByOrderIds(orderIds: string[]): Promise<Map<string, number>> {
    const totals = new Map<string, number>();
    if (orderIds.length === 0) return totals;
    const rows: Array<{ orderId: string; amount: string; charge: boolean }> =
      await this.db
        .select({
          orderId: orderFee.orderId,
          amount: orderFee.amount,
          charge: orderFee.isChargeCustomer,
        })
        .from(orderFee)
        .where(inArray(orderFee.orderId, orderIds));
    for (const row of rows) {
      if (!row.charge) continue;
      totals.set(row.orderId, (totals.get(row.orderId) ?? 0) + Number(row.amount));
    }
    return totals;
  }

  /** 添加订单费用并触发财务重算 */
  async add(
    orderId: string,
    dto: CreateOrderFeeRequest,
    userId?: string,
  ): Promise<OrderFee> {
    const type = await this.feeTypeService.getRequired(dto.feeTypeId);
    this.assertAmount(dto.amount);
    const rows: OrderFeeRow[] = await this.db
      .insert(orderFee)
      .values({
        orderId,
        feeTypeId: type.id,
        feeTypeName: type.name,
        amount: String(round2(dto.amount)),
        isChargeCustomer: dto.isChargeCustomer ?? true,
        remark: dto.remark?.trim() || null,
        createdBy: userId,
        updatedBy: userId,
      })
      .returning();
    await this.recomputeOrderFinancials(orderId);
    return this.mapOrderFee(rows[0]);
  }

  /** 更新订单费用（增量，仅覆盖提供的字段）并触发财务重算 */
  async update(
    orderId: string,
    feeId: string,
    dto: UpdateOrderFeeRequest,
    userId?: string,
  ): Promise<OrderFee> {
    const row: OrderFeeRow = await this.getRequiredFee(orderId, feeId);
    const patch: Partial<typeof orderFee.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (userId) patch.updatedBy = userId;
    if (dto.amount !== undefined) {
      this.assertAmount(dto.amount);
      patch.amount = String(round2(dto.amount));
    }
    if (dto.isChargeCustomer !== undefined) {
      patch.isChargeCustomer = dto.isChargeCustomer;
    }
    if (dto.remark !== undefined) {
      patch.remark = dto.remark.trim() || null;
    }
    const updated: OrderFeeRow[] = await this.db
      .update(orderFee)
      .set(patch)
      .where(eq(orderFee.id, row.id))
      .returning();
    await this.recomputeOrderFinancials(orderId);
    return this.mapOrderFee(updated[0]);
  }

  /** 删除订单费用并触发财务重算 */
  async remove(orderId: string, feeId: string): Promise<{ success: boolean }> {
    await this.getRequiredFee(orderId, feeId);
    await this.db.delete(orderFee).where(eq(orderFee.id, feeId));
    await this.recomputeOrderFinancials(orderId);
    return { success: true };
  }

  /** 订单删除时清理其全部费用明细与成本快照 */
  async deleteByOrders(orderIds: string[]): Promise<void> {
    if (orderIds.length === 0) return;
    await this.db.delete(orderFee).where(inArray(orderFee.orderId, orderIds));
    await this.db
      .delete(orderCostSnapshot)
      .where(inArray(orderCostSnapshot.orderId, orderIds));
  }

  /**
   * 写入/更新下单时成本快照（幂等）：
   * 订单创建与商品变更时调用，利润计算以此为准，不受后续成本价调整影响。
   */
  async upsertCostSnapshot(
    orderId: string,
    productId: string,
    costPrice: number,
  ): Promise<void> {
    const costValue: string = costPrice.toFixed(2);
    const now = new Date();
    await this.db
      .insert(orderCostSnapshot)
      .values({
        orderId,
        productId,
        costPrice: costValue,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: orderCostSnapshot.orderId,
        set: { productId, costPrice: costValue, updatedAt: now },
      });
  }

  /** 读取单个订单的成本快照，无快照返回 null */
  async getSnapshotCost(orderId: string): Promise<number | null> {
    const rows: OrderCostSnapshotRow[] = await this.db
      .select()
      .from(orderCostSnapshot)
      .where(eq(orderCostSnapshot.orderId, orderId))
      .limit(1);
    const row: OrderCostSnapshotRow | undefined = rows[0];
    return row ? Number(row.costPrice) : null;
  }

  /** 批量读取订单成本快照：orderId → 下单时成本价 */
  async getSnapshotCostMap(orderIds: string[]): Promise<Map<string, number>> {
    const result = new Map<string, number>();
    if (orderIds.length === 0) return result;
    const rows: OrderCostSnapshotRow[] = await this.db
      .select()
      .from(orderCostSnapshot)
      .where(inArray(orderCostSnapshot.orderId, orderIds));
    for (const row of rows) {
      result.set(row.orderId, Number(row.costPrice));
    }
    return result;
  }

  /**
   * 安装完成同步安装费：订单已有「安装费」明细则更新金额，否则新增
   * （向客户收取，备注「安装完成时自动添加」），完成后触发财务重算。
   */
  async syncInstallFee(
    orderId: string,
    amount: number,
    userId?: string,
  ): Promise<void> {
    this.assertAmount(amount);
    const type = await this.feeTypeService.findByName(INSTALL_FEE_TYPE_NAME);
    if (!type) {
      this.logger.warn('install fee type not found, skip sync');
      return;
    }
    const existing: OrderFeeRow[] = await this.db
      .select()
      .from(orderFee)
      .where(eq(orderFee.orderId, orderId));
    const installRow: OrderFeeRow | undefined = existing.find(
      (row: OrderFeeRow) => row.feeTypeId === type.id,
    );
    if (installRow) {
      await this.db
        .update(orderFee)
        .set({
          amount: String(round2(amount)),
          isChargeCustomer: true,
          remark: INSTALL_FEE_REMARK,
          updatedAt: new Date(),
          ...(userId ? { updatedBy: userId } : {}),
        })
        .where(eq(orderFee.id, installRow.id));
    } else {
      await this.db.insert(orderFee).values({
        orderId,
        feeTypeId: type.id,
        feeTypeName: type.name,
        amount: String(round2(amount)),
        isChargeCustomer: true,
        remark: INSTALL_FEE_REMARK,
        createdBy: userId,
        updatedBy: userId,
      });
    }
    await this.recomputeOrderFinancials(orderId);
  }

  /**
   * 财务重算：汇总费用 → 读订单商品金额与商品成本 → 计算利润 →
   * 推送多维表格订单表财务字段（尽力而为，推送失败不阻断）。
   */
  async recomputeOrderFinancials(orderId: string): Promise<OrderFinancialSummary> {
    const list = await this.listByOrder(orderId);
    const totalFee: number = round2(
      list.items
        .filter((fee: OrderFee) => fee.isChargeCustomer)
        .reduce((sum: number, fee: OrderFee) => sum + fee.amount, 0),
    );
    const totalCost: number = round2(
      list.items.reduce((sum: number, fee: OrderFee) => sum + fee.amount, 0),
    );

    let amount = 0;
    let productCost = 0;
    try {
      const detail = await this.bitableClient.getRecord(
        ORDER_LINK_INSTANCE,
        orderId,
      );
      const record = detail.record ?? {};
      amount = readFormulaNumber(record['订单金额']);
      const quantity: number =
        typeof record['数量'] === 'number' ? record['数量'] : 0;
      const productId: string = readLinkIds(record['商品'])[0] ?? '';
      if (productId && quantity > 0) {
        // 优先用下单时成本快照；无快照回退商品当前成本价（存量订单兼容）
        const snapshotCost: number | null = await this.getSnapshotCost(orderId);
        let costPrice: number;
        if (snapshotCost !== null) {
          costPrice = snapshotCost;
        } else {
          const profiles: Array<{ costPrice: string }> = await this.db
            .select({ costPrice: productProfile.costPrice })
            .from(productProfile)
            .where(eq(productProfile.productId, productId))
            .limit(1);
          costPrice = Number(profiles[0]?.costPrice ?? 0) || 0;
        }
        productCost = round2(costPrice * quantity);
      }
    } catch (error) {
      this.logger.warn(
        `read order ${orderId} for financial recompute failed: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }

    const totalAmount: number = round2(amount + totalFee);
    const profit: number = round2(totalAmount - productCost - totalCost);
    const profitRate: number =
      totalAmount > 0 ? round2((profit / totalAmount) * 100) : 0;
    const summary: OrderFinancialSummary = {
      totalFee,
      totalCost,
      totalAmount,
      profit,
      profitRate,
    };

    try {
      await this.bitableClient.batchUpdateRecords(
        CAPABILITY_INSTANCE_IDS.orderFinance,
        [
          {
            id: orderId,
            record: {
              费用总金额: totalFee,
              成本总金额: totalCost,
              利润: profit,
              订单总金额: totalAmount,
              利润率: profitRate,
            },
          },
        ],
      );
    } catch (error) {
      this.logger.warn(
        `push order ${orderId} finance fields failed: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
    return summary;
  }

  private assertAmount(amount: unknown): void {
    if (!Number.isFinite(amount) || Number(amount) < 0) {
      throw new BadRequestException('费用金额必须为非负数字');
    }
  }

  private async getRequiredFee(orderId: string, feeId: string): Promise<OrderFeeRow> {
    const rows: OrderFeeRow[] = await this.db
      .select()
      .from(orderFee)
      .where(eq(orderFee.id, feeId))
      .limit(1);
    const row: OrderFeeRow | undefined = rows[0];
    if (!row || row.orderId !== orderId) {
      throw new NotFoundException('订单费用不存在');
    }
    return row;
  }

  private mapOrderFee(row: OrderFeeRow): OrderFee {
    return {
      id: row.id,
      orderId: row.orderId,
      feeTypeId: row.feeTypeId,
      feeTypeName: row.feeTypeName,
      amount: Number(row.amount),
      isChargeCustomer: row.isChargeCustomer,
      remark: row.remark ?? '',
      createdAt: row.createdAt.toISOString(),
    };
  }
}
