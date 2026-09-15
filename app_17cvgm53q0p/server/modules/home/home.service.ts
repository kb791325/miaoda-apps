import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from '@lark-apaas/fullstack-nestjs-core';
import { and, count, gte, inArray, isNotNull, lt } from 'drizzle-orm';
import {
  followUp,
  inventoryFlow,
  shipment,
} from '@server/database/schema';
import { BitableClient } from '@server/common/utils/bitable-client';
import { CAPABILITY_INSTANCE_IDS } from '@server/common/constants/capability-instance-ids';

export interface HomeTodoItem {
  label: string;
  count: number;
  path: string;
}

interface ShipmentTodoDef {
  label: string;
  status: string;
}

const KNOWN_ROLES = [
  'admin',
  'sales',
  'warehouse',
  'installer',
  'finance',
  'inventory',
] as const;

const SHIPMENT_TODO_DEFS: ShipmentTodoDef[] = [
  { label: '待出库配送单', status: '待出库' },
  { label: '运输中配送单', status: '运输中' },
  { label: '在安装配送单', status: '在安装' },
];

const OUTFLOW_BUSINESS_TYPES: string[] = ['销售出库', '发货出库', '其他出库'];

/**
 * 工作台待办服务。
 *
 * 各角色待办数据来源：
 * - admin/warehouse/installer：应用库 shipment 表按 shipStatus 计数
 * - sales：follow_up 表 next_follow_up_at <= 今天(23:59:59) 且非空，按 customer_id 去重计数
 * - finance：飞书多维表格订单表（状态=已完成 且 下单时间为今天，Asia/Shanghai 自然日）；
 *   bitable 查询失败时降级为不返回该条目，不让整个接口 500
 * - inventory：inventory_flow 表今日（Asia/Shanghai）出库类流水计数
 */
@Injectable()
export class HomeService {
  private readonly logger = new Logger(HomeService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    private readonly bitableClient: BitableClient,
  ) {}

  async getTodos(role?: string): Promise<{ items: HomeTodoItem[] }> {
    if (!role || !(KNOWN_ROLES as readonly string[]).includes(role)) {
      return { items: [] };
    }

    let items: HomeTodoItem[] = [];
    switch (role) {
      case 'admin': {
        items = await this.getShipmentTodos(SHIPMENT_TODO_DEFS);
        break;
      }
      case 'warehouse': {
        items = await this.getShipmentTodos(SHIPMENT_TODO_DEFS.slice(0, 1));
        break;
      }
      case 'installer': {
        items = await this.getShipmentTodos(SHIPMENT_TODO_DEFS.slice(1));
        break;
      }
      case 'sales': {
        items = await this.getSalesTodos();
        break;
      }
      case 'finance': {
        items = await this.getFinanceTodos();
        break;
      }
      case 'inventory': {
        items = await this.getInventoryTodos();
        break;
      }
    }

    // count 为 0 的条目不返回
    const visible: HomeTodoItem[] = items.filter(
      (item: HomeTodoItem): boolean => item.count > 0,
    );
    this.logger.log(
      `home todos: ${JSON.stringify({ role, count: visible.length })}`,
    );
    return { items: visible };
  }

  /** 配送单按状态计数（一次 group by 查询，避免逐状态 N+1） */
  private async getShipmentTodos(
    defs: ShipmentTodoDef[],
  ): Promise<HomeTodoItem[]> {
    const statuses: string[] = defs.map((def: ShipmentTodoDef): string => def.status);
    const rows: { status: string; cnt: number }[] = await this.db
      .select({ status: shipment.shipStatus, cnt: count() })
      .from(shipment)
      .where(inArray(shipment.shipStatus, statuses))
      .groupBy(shipment.shipStatus);

    const byStatus = new Map<string, number>();
    for (const row of rows) {
      byStatus.set(row.status, row.cnt);
    }
    return defs.map((def: ShipmentTodoDef): HomeTodoItem => ({
      label: def.label,
      count: byStatus.get(def.status) ?? 0,
      path: '/shipments',
    }));
  }

  /** 销售待跟进客户：next_follow_up_at <= 今天 23:59:59 且非空，按 customer_id 去重 */
  private async getSalesTodos(): Promise<HomeTodoItem[]> {
    const { nextDayStart } = this.getShanghaiDayBounds();
    const rows: { customerId: string }[] = await this.db
      .select({ customerId: followUp.customerId })
      .from(followUp)
      .where(
        and(
          isNotNull(followUp.nextFollowUpAt),
          // 半开区间：<= 今天 23:59:59 等价于 < 次日 00:00:00
          lt(followUp.nextFollowUpAt, nextDayStart),
        ),
      );
    const distinctCustomers = new Set<string>(
      rows.map((row: { customerId: string }): string => row.customerId),
    );
    return [
      { label: '待跟进客户', count: distinctCustomers.size, path: '/follow-ups' },
    ];
  }

  /**
   * 今日已完成订单：复用 dashboard 已验证的 bitable 日期/状态过滤模式
   * （下单时间 ExactDate 毫秒比较 + 订单状态 is 匹配）。
   * 「订单金额」是 Formula 字段无法用 aggregateQuery，但此处只计数，
   * 仍沿用 searchRecords 明细计数以保持与 dashboard 同一过滤路径。
   * 查询失败降级：不返回该条目，不让整个接口 500。
   */
  private async getFinanceTodos(): Promise<HomeTodoItem[]> {
    const { dayStart, nextDayStart } = this.getShanghaiDayBounds();
    try {
      const output = await this.bitableClient.searchRecords(
        CAPABILITY_INSTANCE_IDS.order,
        {
          filter: {
            conjunction: 'and',
            conditions: [
              { fieldName: '订单状态', operator: 'is', value: ['已完成'] },
              {
                fieldName: '下单时间',
                operator: 'isGreater',
                value: ['ExactDate', String(dayStart.getTime() - 1)],
              },
              {
                fieldName: '下单时间',
                operator: 'isLess',
                value: ['ExactDate', String(nextDayStart.getTime())],
              },
            ],
          },
          pageSize: 500,
          fieldNames: ['订单号'],
        },
      );
      return [
        { label: '今日已完成订单', count: output.records.length, path: '/finance' },
      ];
    } catch (error: unknown) {
      this.logger.warn(
        `finance home todo degraded: ${
          error instanceof Error ? error.stack : String(error)
        }`,
      );
      return [];
    }
  }

  /** 今日出库流水：今天（Asia/Shanghai）且 business_type 属于出库类 */
  private async getInventoryTodos(): Promise<HomeTodoItem[]> {
    const { dayStart, nextDayStart } = this.getShanghaiDayBounds();
    const rows: { cnt: number }[] = await this.db
      .select({ cnt: count() })
      .from(inventoryFlow)
      .where(
        and(
          gte(inventoryFlow.operatedAt, dayStart),
          lt(inventoryFlow.operatedAt, nextDayStart),
          inArray(inventoryFlow.businessType, OUTFLOW_BUSINESS_TYPES),
        ),
      );
    const total: number = rows[0]?.cnt ?? 0;
    return [{ label: '今日出库流水', count: total, path: '/stock-flows' }];
  }

  /**
   * Asia/Shanghai（固定 UTC+8，无夏令时）自然日起止：
   * 返回当日 00:00:00 与次日 00:00:00（半开区间，便于 gte/lt 过滤）。
   */
  private getShanghaiDayBounds(): { dayStart: Date; nextDayStart: Date } {
    const offsetMs = 8 * 60 * 60 * 1000;
    const shifted = new Date(Date.now() + offsetMs);
    const dayStartMs =
      Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()) -
      offsetMs;
    return {
      dayStart: new Date(dayStartMs),
      nextDayStart: new Date(dayStartMs + 24 * 60 * 60 * 1000),
    };
  }
}
