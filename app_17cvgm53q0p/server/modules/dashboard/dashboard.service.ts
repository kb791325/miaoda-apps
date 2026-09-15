import { Injectable, Logger } from '@nestjs/common';
import {
  BitableClient,
  BitableFilter,
  readFormulaNumber,
  readFormulaText,
} from '@server/common/utils/bitable-client';
import { CAPABILITY_INSTANCE_IDS } from '@server/common/constants/capability-instance-ids';
import type {
  DashboardSummary,
  SalesRankItem,
  SalesRankResponse,
  StatusDistributionItem,
  StatusDistributionResponse,
  TrendPoint,
  TrendResponse,
} from '@shared/dashboard';

/**
 * 数据仪表盘服务。
 *
 * 聚合方式说明（被迫降级，注明原因）：
 * 多维表格的「订单金额」「商品名称」是 Formula 字段，
 * aggregateQuery 的 measures/dimensions 均不支持 Formula 字段，
 * 因此涉及金额求和、按天趋势、按商品聚合的统计必须用 searchRecords
 * 拉取订单明细后在服务端内存聚合（订单量约 15-30 条，pageSize 500 单页足够）。
 * 能用 aggregateQuery 的场景（订单状态分布 count）坚持使用 aggregateQuery。
 */
@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(private readonly bitableClient: BitableClient) {}

  /** 经营总览：本月订单数 / 待出库数 / 本月销售额 / 库存预警数 */
  async getSummary(): Promise<DashboardSummary> {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    // 金额是 Formula 字段，aggregateQuery 不支持，被迫 searchRecords 内存求和
    const [monthOrders, pendingAgg, products] = await Promise.all([
      this.bitableClient.searchRecords(CAPABILITY_INSTANCE_IDS.order, {
        filter: {
          conjunction: 'and',
          conditions: [
            {
              fieldName: '下单时间',
              operator: 'isGreater',
              value: ['ExactDate', String(monthStart.getTime() - 1)],
            },
            {
              fieldName: '订单状态',
              operator: 'isNot',
              value: ['已取消'],
            },
          ],
        },
        pageSize: 500,
        fieldNames: ['数量', '订单金额', '下单时间', '订单状态'],
      }),
      // 待出库计数不涉及 Formula 字段，用 aggregateQuery
      this.bitableClient.aggregateQuery(CAPABILITY_INSTANCE_IDS.order, {
        filter: {
          conjunction: 'and',
          conditions: [
            { fieldName: '订单状态', operator: 'is', value: ['待出库'] },
          ],
        },
        measures: [{ fieldName: '订单号', aggregation: 'count', alias: 'count' }],
        pageSize: 100,
      }),
      this.bitableClient.searchRecords(CAPABILITY_INSTANCE_IDS.product, {
        pageSize: 500,
        fieldNames: ['总库存数量', '安全库存预警值'],
      }),
    ]);

    const monthOrderCount: number = monthOrders.records.length;
    const monthSalesAmount: number = monthOrders.records.reduce(
      (sum: number, item): number =>
        sum + readFormulaNumber(item.record['订单金额']),
      0,
    );

    const pendingShipmentCount: number = pendingAgg.result.reduce(
      (sum: number, row): number => sum + Number(row.count?.value ?? 0),
      0,
    );

    let warningProductCount = 0;
    for (const item of products.records) {
      const stock: number =
        typeof item.record['总库存数量'] === 'number'
          ? (item.record['总库存数量'] as number)
          : 0;
      const threshold: number =
        typeof item.record['安全库存预警值'] === 'number'
          ? (item.record['安全库存预警值'] as number)
          : 0;
      if (stock < threshold) warningProductCount += 1;
    }

    this.logger.log(
      `dashboard summary: ${JSON.stringify({
        monthOrderCount,
        pendingShipmentCount,
        monthSalesAmount,
        warningProductCount,
      })}`,
    );

    return {
      monthOrderCount,
      pendingShipmentCount,
      monthSalesAmount,
      warningProductCount,
    };
  }

  /** 近 N 天订单量与销售额趋势（按本地时区日期分组，无数据天补 0） */
  async getTrend(days: number): Promise<TrendResponse> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(today);
    start.setDate(start.getDate() - (days - 1));

    // 金额是 Formula 字段，aggregateQuery 不支持，被迫 searchRecords 内存按天分组
    const output = await this.bitableClient.searchRecords(
      CAPABILITY_INSTANCE_IDS.order,
      {
        filter: {
          conjunction: 'and',
          conditions: [
            {
              fieldName: '下单时间',
              operator: 'isGreater',
              value: ['ExactDate', String(start.getTime() - 1)],
            },
            {
              fieldName: '订单状态',
              operator: 'isNot',
              value: ['已取消'],
            },
          ],
        },
        pageSize: 500,
        fieldNames: ['下单时间', '订单金额'],
      },
    );

    const byDate = new Map<string, { orderCount: number; salesAmount: number }>();
    for (const item of output.records) {
      const rawTime: unknown = item.record['下单时间'];
      if (typeof rawTime !== 'number') continue;
      const date = new Date(rawTime);
      const key = this.formatLocalDate(date);
      const bucket = byDate.get(key) ?? { orderCount: 0, salesAmount: 0 };
      bucket.orderCount += 1;
      bucket.salesAmount += readFormulaNumber(item.record['订单金额']);
      byDate.set(key, bucket);
    }

    const items: TrendPoint[] = [];
    const cursor = new Date(start);
    while (cursor.getTime() <= today.getTime()) {
      const key = this.formatLocalDate(cursor);
      const bucket = byDate.get(key);
      items.push({
        date: key,
        orderCount: bucket?.orderCount ?? 0,
        salesAmount: bucket?.salesAmount ?? 0,
      });
      cursor.setDate(cursor.getDate() + 1);
    }

    return { items };
  }

  /** 订单状态分布：无 Formula 字段参与，使用 aggregateQuery */
  async getStatusDistribution(): Promise<StatusDistributionResponse> {
    const output = await this.bitableClient.aggregateQuery(
      CAPABILITY_INSTANCE_IDS.order,
      {
        dimensions: ['订单状态'],
        measures: [
          { fieldName: '订单号', aggregation: 'count', alias: 'count' },
        ],
        pageSize: 100,
      },
    );

    const items: StatusDistributionItem[] = output.result.map(
      (row): StatusDistributionItem => ({
        status: String(row['订单状态']?.value ?? ''),
        count: Number(row.count?.value ?? 0),
      }),
    );
    return { items };
  }

  /** 商品销量排行 TOP N（商品名称是 Formula 字段，被迫内存聚合） */
  async getSalesRank(limit: number): Promise<SalesRankResponse> {
    const output = await this.bitableClient.searchRecords(
      CAPABILITY_INSTANCE_IDS.order,
      {
        filter: {
          conjunction: 'and',
          conditions: [
            { fieldName: '订单状态', operator: 'isNot', value: ['已取消'] },
          ],
        },
        pageSize: 500,
        fieldNames: ['商品名称', '数量'],
      },
    );

    const byProduct = new Map<string, number>();
    for (const item of output.records) {
      const productName = readFormulaText(item.record['商品名称']);
      if (!productName) continue;
      const quantity: number =
        typeof item.record['数量'] === 'number'
          ? (item.record['数量'] as number)
          : 0;
      byProduct.set(productName, (byProduct.get(productName) ?? 0) + quantity);
    }

    const items: SalesRankItem[] = [...byProduct.entries()]
      .map(([productName, salesCount]): SalesRankItem => ({
        productName,
        salesCount,
      }))
      .sort((a: SalesRankItem, b: SalesRankItem): number => b.salesCount - a.salesCount)
      .slice(0, limit);

    return { items };
  }

  /** 本地时区日期 → YYYY-MM-DD */
  private formatLocalDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
