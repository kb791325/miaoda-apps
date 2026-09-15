import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { inArray } from 'drizzle-orm';
import * as XLSX from 'xlsx';
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from '@lark-apaas/fullstack-nestjs-core';
import { orderFee, productProfile } from '@server/database/schema';
import {
  BitableClient,
  readFormulaNumber,
  readFormulaText,
  readLinkIds,
  readNumberField,
  readTextField,
  type BitableFilterCondition,
  type BitableRecordItem,
} from '@server/common/utils/bitable-client';
import { CAPABILITY_INSTANCE_IDS } from '@server/common/constants/capability-instance-ids';
import { OrderFeeService } from '@server/modules/fee/order-fee.service';
import type {
  CustomerProfitRow,
  FinanceDashboardResponse,
  FinanceExportType,
  FinanceGroupBy,
  FinanceReportCustomerResponse,
  FinanceReportProductResponse,
  FinanceReportTimelineResponse,
  FinanceSummary,
  FinanceTrendPoint,
  ProductProfitRow,
} from '@shared/finance';
import {
  buildCustomerRows,
  buildProductRows,
  buildSummary,
  buildTrend,
  formatFileDate,
  normalizeExportType,
  normalizeGroupBy,
  round2,
  type OrderFinance,
} from './finance-aggregate';

type OrderFeeRow = typeof orderFee.$inferSelect;

/** 订单表关联字段（客户/商品/数量/订单金额公式）可读的实例 */
const ORDER_LINK_INSTANCE = 'bitable_order_1';

/** 订单拉取字段 */
const ORDER_LINK_FIELDS: string[] = [
  '订单号',
  '下单时间',
  '数量',
  '订单金额',
  '商品',
  '客户',
  '商品名称',
];

/** 单次统计最多拉取订单数 */
const MAX_ORDER_PULL = 5000;

const DAY_MS = 86400000;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;

/** 统计区间（毫秒时间戳，半开 [startTs, endTs)） */
interface DateRange {
  startTs: number;
  endTs: number;
}

@Injectable()
export class FinanceService {
  private readonly logger = new Logger(FinanceService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    private readonly bitableClient: BitableClient,
    private readonly orderFeeService: OrderFeeService,
  ) {}

  /** 财务仪表盘：汇总 + 按日趋势 + 商品/客户利润 Top10 */
  async getDashboard(
    startDate?: string,
    endDate?: string,
  ): Promise<FinanceDashboardResponse> {
    const range: DateRange = this.resolveRange(startDate, endDate);
    const [orders, customerNames]: [OrderFinance[], Map<string, string>] =
      await Promise.all([this.computeOrders(range), this.loadCustomerNames()]);
    const productRows: ProductProfitRow[] = buildProductRows(orders);
    const customerRows: CustomerProfitRow[] = buildCustomerRows(orders, customerNames);
    return {
      summary: buildSummary(orders),
      trend: buildTrend(orders, 'day'),
      productRank: productRows.slice(0, 10),
      customerRank: customerRows.slice(0, 10),
    };
  }

  /** 时间维度利润报表（按日/周/月分组，返回全部行） */
  async getTimelineReport(
    startDate?: string,
    endDate?: string,
    groupBy?: string,
  ): Promise<FinanceReportTimelineResponse> {
    const range: DateRange = this.resolveRange(startDate, endDate);
    const normalizedGroupBy: FinanceGroupBy = normalizeGroupBy(groupBy);
    const orders: OrderFinance[] = await this.computeOrders(range);
    return {
      summary: buildSummary(orders),
      rows: buildTrend(orders, normalizedGroupBy),
    };
  }

  /** 商品维度利润报表（全部行，利润降序） */
  async getProductReport(
    startDate?: string,
    endDate?: string,
  ): Promise<FinanceReportProductResponse> {
    const range: DateRange = this.resolveRange(startDate, endDate);
    const orders: OrderFinance[] = await this.computeOrders(range);
    return {
      summary: buildSummary(orders),
      rows: buildProductRows(orders),
    };
  }

  /** 客户维度利润报表（全部行，利润降序） */
  async getCustomerReport(
    startDate?: string,
    endDate?: string,
  ): Promise<FinanceReportCustomerResponse> {
    const range: DateRange = this.resolveRange(startDate, endDate);
    const [orders, customerNames]: [OrderFinance[], Map<string, string>] =
      await Promise.all([this.computeOrders(range), this.loadCustomerNames()]);
    return {
      summary: buildSummary(orders),
      rows: buildCustomerRows(orders, customerNames),
    };
  }

  /** 导出 xlsx 文件内容与文件名 */
  async exportXlsx(
    type: string,
    startDate?: string,
    endDate?: string,
    groupBy?: string,
  ): Promise<{ buffer: Buffer; filename: string }> {
    const exportType: FinanceExportType = normalizeExportType(type);
    const range: DateRange = this.resolveRange(startDate, endDate);
    const orders: OrderFinance[] = await this.computeOrders(range);

    let sheetRows: Array<Record<string, string | number>> = [];
    if (exportType === 'timeline') {
      const normalizedGroupBy: FinanceGroupBy = normalizeGroupBy(groupBy);
      sheetRows = buildTrend(orders, normalizedGroupBy).map(
        (point: FinanceTrendPoint) => ({
          期间: point.period,
          收入: point.revenue,
          商品成本: point.goodsCost,
          费用成本: point.feeCost,
          利润: point.profit,
          '利润率(%)': point.profitRate,
          订单数: point.orderCount,
        }),
      );
    } else if (exportType === 'product') {
      sheetRows = buildProductRows(orders).map((row: ProductProfitRow) => ({
        商品名称: row.productName,
        销量: row.quantity,
        收入: row.revenue,
        成本: row.cost,
        利润: row.profit,
        '利润率(%)': row.profitRate,
      }));
    } else {
      const customerNames: Map<string, string> = await this.loadCustomerNames();
      sheetRows = buildCustomerRows(orders, customerNames).map(
        (row: CustomerProfitRow) => ({
          客户名称: row.customerName,
          订单数: row.orderCount,
          收入: row.revenue,
          成本: row.cost,
          利润: row.profit,
          '利润率(%)': row.profitRate,
        }),
      );
    }

    const worksheet = XLSX.utils.json_to_sheet(sheetRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '财务利润');
    const buffer: Buffer = XLSX.write(workbook, {
      type: 'buffer',
      bookType: 'xlsx',
    });
    const filename = `finance-${exportType}-${formatFileDate()}.xlsx`;
    return { buffer, filename };
  }

  /**
   * 解析日期区间（Asia/Shanghai，半开 [当日 00:00, endDate 次日 00:00)）。
   * 未传日期默认本月 1 号至今天。
   */
  private resolveRange(startDate?: string, endDate?: string): DateRange {
    const now: Date = new Date(Date.now() + 8 * 3600 * 1000);
    const year: number = now.getUTCFullYear();
    const month: number = now.getUTCMonth() + 1;
    const day: number = now.getUTCDate();

    let startTs: number;
    let endTs: number;
    if (startDate) {
      startTs = this.parseDayToUtc8Start(startDate, 'startDate');
    } else {
      startTs = Date.UTC(year, month - 1, 1, -8);
    }
    if (endDate) {
      endTs = this.parseDayToUtc8Start(endDate, 'endDate') + DAY_MS;
    } else {
      endTs = Date.UTC(year, month - 1, day, -8) + DAY_MS;
    }
    if (startTs >= endTs) {
      throw new BadRequestException('startDate 必须早于或等于 endDate');
    }
    return { startTs, endTs };
  }

  /** YYYY-MM-DD → 当日 00:00:00 +08:00 的毫秒时间戳 */
  private parseDayToUtc8Start(value: string, label: string): number {
    if (!DATE_PATTERN.test(value)) {
      throw new BadRequestException(`${label} 格式非法，应为 YYYY-MM-DD`);
    }
    const parts: number[] = value.split('-').map((seg: string) => Number(seg));
    const year: number = parts[0];
    const month: number = parts[1];
    const day: number = parts[2];
    const ts: number = Date.UTC(year, month - 1, day, -8);
    // 回读校验，拒绝 2026-02-31 这类不存在的日期
    const check: Date = new Date(ts + 8 * 3600 * 1000);
    if (
      check.getUTCFullYear() !== year ||
      check.getUTCMonth() !== month - 1 ||
      check.getUTCDate() !== day
    ) {
      throw new BadRequestException(`${label} 日期不存在`);
    }
    return ts;
  }

  /**
   * 拉取区间内已完成订单并计算每单财务口径：
   * revenue = 订单金额 + 向客户收取的费用；
   * goodsCost = 下单时成本快照 × 数量（无快照回退商品当前成本价）；
   * feeCost = 全部订单费用；profit = revenue - goodsCost - feeCost。
   */
  private async computeOrders(range: DateRange): Promise<OrderFinance[]> {
    const records: BitableRecordItem[] = await this.pullOrders(range);
    if (records.length === 0) return [];

    const orderIds: string[] = records.map((item: BitableRecordItem) => item.id);
    const [feeRows, snapshotMap] = await Promise.all([
      this.db
        .select()
        .from(orderFee)
        .where(inArray(orderFee.orderId, orderIds)),
      this.orderFeeService.getSnapshotCostMap(orderIds),
    ]);

    // 无快照订单回退商品当前成本价（批量查询，禁止 N+1）
    const productIds: string[] = Array.from(
      new Set(
        records
          .map((item: BitableRecordItem) => readLinkIds(item.record['商品'])[0] ?? '')
          .filter((id: string) => id !== ''),
      ),
    );
    const profileCostMap = new Map<string, number>();
    if (productIds.length > 0) {
      const profiles: Array<{ productId: string; costPrice: string }> =
        await this.db
          .select({
            productId: productProfile.productId,
            costPrice: productProfile.costPrice,
          })
          .from(productProfile)
          .where(inArray(productProfile.productId, productIds));
      for (const profile of profiles) {
        profileCostMap.set(profile.productId, Number(profile.costPrice) || 0);
      }
    }

    // 订单费用批量聚合
    const chargeFeeByOrder = new Map<string, number>();
    const totalFeeByOrder = new Map<string, number>();
    for (const row of feeRows as OrderFeeRow[]) {
      const amount: number = Number(row.amount) || 0;
      totalFeeByOrder.set(row.orderId, (totalFeeByOrder.get(row.orderId) ?? 0) + amount);
      if (row.isChargeCustomer) {
        chargeFeeByOrder.set(row.orderId, (chargeFeeByOrder.get(row.orderId) ?? 0) + amount);
      }
    }

    const orders: OrderFinance[] = [];
    for (const item of records) {
      const record: Record<string, unknown> = item.record ?? {};
      const rawTs: unknown = record['下单时间'];
      const orderTs: number = typeof rawTs === 'number' ? rawTs : 0;
      const quantity: number = readNumberField(record['数量']);
      const amount: number = readFormulaNumber(record['订单金额']);
      const productId: string = readLinkIds(record['商品'])[0] ?? '';
      const customerId: string = readLinkIds(record['客户'])[0] ?? '';
      const productName: string = readFormulaText(record['商品名称']);

      const snapshotCost: number | undefined = snapshotMap.get(item.id);
      const costPrice: number =
        snapshotCost !== undefined
          ? snapshotCost
          : profileCostMap.get(productId) ?? 0;

      const revenue: number = round2(amount + (chargeFeeByOrder.get(item.id) ?? 0));
      const goodsCost: number = round2(costPrice * quantity);
      const feeCost: number = round2(totalFeeByOrder.get(item.id) ?? 0);
      const profit: number = round2(revenue - goodsCost - feeCost);

      orders.push({
        id: item.id,
        orderTs,
        productId,
        productName,
        customerId,
        quantity,
        revenue,
        goodsCost,
        feeCost,
        profit,
      });
    }
    return orders;
  }

  /** 分页拉取区间内已完成订单（上限 5000 条） */
  private async pullOrders(range: DateRange): Promise<BitableRecordItem[]> {
    const conditions: BitableFilterCondition[] = [
      { fieldName: '订单状态', operator: 'is', value: ['已完成'] },
      {
        fieldName: '下单时间',
        operator: 'isGreater',
        value: ['ExactDate', String(range.startTs)],
      },
      {
        fieldName: '下单时间',
        operator: 'isLess',
        value: ['ExactDate', String(range.endTs)],
      },
    ];

    const allRecords: BitableRecordItem[] = [];
    let pageToken: string | undefined;
    do {
      const output = await this.bitableClient.searchRecords(
        ORDER_LINK_INSTANCE,
        {
          pageSize: 500,
          pageToken,
          fieldNames: ORDER_LINK_FIELDS,
          filter: { conjunction: 'and', conditions },
        },
      );
      allRecords.push(...output.records);
      pageToken = output.hasMore ? output.pageToken : undefined;
    } while (pageToken && allRecords.length < MAX_ORDER_PULL);

    if (allRecords.length >= MAX_ORDER_PULL) {
      this.logger.warn(
        `finance order pull hit limit ${MAX_ORDER_PULL}, results may be truncated`,
      );
    }
    return allRecords;
  }

  /** 批量拉取客户姓名：recordId → 客户姓名（分页循环） */
  private async loadCustomerNames(): Promise<Map<string, string>> {
    const names = new Map<string, string>();
    let pageToken: string | undefined;
    do {
      const output = await this.bitableClient.searchRecords(
        CAPABILITY_INSTANCE_IDS.customer,
        {
          pageSize: 500,
          pageToken,
          fieldNames: ['客户姓名'],
        },
      );
      for (const item of output.records) {
        names.set(item.id, readTextField(item.record['客户姓名']));
      }
      pageToken = output.hasMore ? output.pageToken : undefined;
    } while (pageToken && names.size < MAX_ORDER_PULL);
    return names;
  }
}
