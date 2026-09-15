import { Injectable, Inject, Logger } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase, CapabilityService } from '@lark-apaas/fullstack-nestjs-core';
import { afterSaleOrder, inventory } from '../../database/schema';
import type { PushEntity, PushBitableResult } from '@shared/api.interface';

const WRITER_INSTANCES: Record<PushEntity, string> = {
  'after-sale': 'after_sales_ticket_bitable_writer_3',
  inventory: 'product_inventory_bitable_writer_2',
  review: 'data_review_bitable_writer_2',
};

const STATUS_MAP: Record<string, string> = {
  '待处理': '待审核',
  '处理中': '处理中',
  '已完成': '已完成',
  '已拒绝': '已关闭',
};

const CATEGORY_OPTIONS = ['服饰', '数码', '食品', '家居', '美妆', '其他'];

interface SearchRecordsResult {
  records: Array<{ id: string; record: Record<string, unknown> }>;
  hasMore: boolean;
  pageToken?: string;
}

@Injectable()
export class PushBitableService {
  private readonly logger = new Logger(PushBitableService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    private readonly capabilityService: CapabilityService,
  ) {}

  async pushToBitable(entity: PushEntity): Promise<PushBitableResult> {
    try {
      switch (entity) {
        case 'after-sale':
          return await this.pushAfterSaleOrders();
        case 'inventory':
          return await this.pushInventory();
        case 'review':
          return await this.pushReviewStats();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`推送到多维表格失败: entity=${entity}, ${msg}`);
      return { pushed: 0, updated: 0, skipped: 0, errors: [`推送失败: ${msg}`] };
    }
  }

  private async pushAfterSaleOrders(): Promise<PushBitableResult> {
    const orders = await this.db.select().from(afterSaleOrder);
    if (orders.length === 0) {
      return { pushed: 0, updated: 0, skipped: 0, errors: [] };
    }
    const instanceId = WRITER_INSTANCES['after-sale'];
    const existing = await this.fetchExistingTextValues(instanceId, '工单编号');
    const toAdd = orders
      .filter((o) => !existing.has(o.orderNo))
      .map((o) => this.buildTicketRecord(o));
    await this.batchAdd(instanceId, toAdd);
    this.logger.log(`售后工单推送: 新增 ${toAdd.length}, 跳过 ${orders.length - toAdd.length}`);
    return { pushed: toAdd.length, updated: 0, skipped: orders.length - toAdd.length, errors: [] };
  }

  private async pushInventory(): Promise<PushBitableResult> {
    const rows = await this.db.select().from(inventory);
    if (rows.length === 0) {
      return { pushed: 0, updated: 0, skipped: 0, errors: [] };
    }
    const instanceId = WRITER_INSTANCES['inventory'];
    const existing = await this.fetchExistingTextValues(instanceId, 'SKU编码');
    const toAdd = rows
      .filter((r) => !existing.has(r.productId))
      .map((r) => this.buildInventoryRecord(r));
    await this.batchAdd(instanceId, toAdd);
    this.logger.log(`库存推送: 新增 ${toAdd.length}, 跳过 ${rows.length - toAdd.length}`);
    return { pushed: toAdd.length, updated: 0, skipped: rows.length - toAdd.length, errors: [] };
  }

  private async pushReviewStats(): Promise<PushBitableResult> {
    const orders = await this.db.select().from(afterSaleOrder);
    if (orders.length === 0) {
      return { pushed: 0, updated: 0, skipped: 0, errors: [] };
    }
    const dailyRows = this.aggregateDailyStats(orders);
    const instanceId = WRITER_INSTANCES['review'];
    const existingByDay = await this.fetchExistingReviewRecords(instanceId);
    const toAdd: Array<Record<string, unknown>> = [];
    const toUpdate: Array<{ id: string; record: Record<string, unknown> }> = [];
    for (const row of dailyRows) {
      const recordId = existingByDay.get(row.dayKey);
      if (recordId) {
        toUpdate.push({ id: recordId, record: row.record });
      } else {
        toAdd.push(row.record);
      }
    }
    if (toAdd.length > 0) {
      await this.batchAdd(instanceId, toAdd);
    }
    if (toUpdate.length > 0) {
      await this.capabilityService
        .load(instanceId)
        .call('batchUpdateRecords', { records: toUpdate });
    }
    this.logger.log(`复盘推送: 新增 ${toAdd.length}, 更新 ${toUpdate.length}`);
    return { pushed: toAdd.length, updated: toUpdate.length, skipped: 0, errors: [] };
  }

  private buildTicketRecord(order: typeof afterSaleOrder.$inferSelect): Record<string, unknown> {
    const record: Record<string, unknown> = {
      '工单编号': order.orderNo,
      '订单号': order.orderNo,
      '商品SKU': order.productId,
      '问题描述': `${order.reason}（${order.productName}）`,
      '售后类型': order.reason,
      '处理方案': order.handleType === 'compensation' ? '补偿' : '退款',
      '处理状态': STATUS_MAP[order.status] ?? '待审核',
      '退款金额': Number(order.refundAmount),
      '是否差评': false,
      '备注': `处理时长 ${order.processDuration} 小时；${order.isOverdue ? '已超时' : '未超时'}`,
    };
    if (order.status === '已完成') {
      record['完成时间'] = Date.now();
    }
    return record;
  }

  private buildInventoryRecord(row: typeof inventory.$inferSelect): Record<string, unknown> {
    const category = row.category === '服装' ? '服饰' : row.category;
    return {
      'SKU编码': row.productId,
      '商品名称': row.productName,
      '商品分类': CATEGORY_OPTIONS.includes(category) ? category : '其他',
      '当前库存': row.currentStock,
      '安全库存': row.safetyStock,
      '近7天销量': Math.round(Number(row.avgDailySales7d) * 7),
      '近7天退货量': 0,
      '补货建议': row.suggestedRestock > 0 ? `建议补货 ${row.suggestedRestock} 件` : '库存充足',
      '备注': `近30天日均销量 ${row.avgDailySales30d}，可售 ${row.daysAvailable} 天${row.isSlowMoving ? '，滞销' : ''}`,
    };
  }

  private aggregateDailyStats(
    orders: Array<typeof afterSaleOrder.$inferSelect>,
  ): Array<{ dayKey: string; record: Record<string, unknown> }> {
    const byDay = new Map<string, Array<typeof afterSaleOrder.$inferSelect>>();
    for (const order of orders) {
      const { key } = this.toShanghaiDay(order.createdAt.getTime());
      byDay.set(key, [...(byDay.get(key) ?? []), order]);
    }
    return [...byDay.entries()].map(([dayKey, dayOrders]) => {
      const total = dayOrders.length;
      const overdueCount = dayOrders.filter((o) => o.isOverdue).length;
      const refundOrders = dayOrders.filter((o) => o.handleType === 'refund' && o.status !== '已拒绝');
      const refundAmount = refundOrders.reduce((sum, o) => sum + Number(o.refundAmount), 0);
      const avgDuration = Math.round(
        (dayOrders.reduce((sum, o) => sum + Number(o.processDuration), 0) / total) * 100,
      ) / 100;
      const reasonCount = new Map<string, number>();
      for (const o of dayOrders) {
        reasonCount.set(o.reason, (reasonCount.get(o.reason) ?? 0) + 1);
      }
      const topReason = [...reasonCount.entries()].sort((a, b) => b[1] - a[1])[0][0];
      const { ms } = this.toShanghaiDay(dayOrders[0].createdAt.getTime());
      return {
        dayKey,
        record: {
          '统计日期': ms,
          '售后工单量': total,
          '紧急工单量': overdueCount,
          '退款单数': refundOrders.length,
          '退款金额': Math.round(refundAmount * 100) / 100,
          'TOP问题类型': topReason,
          '平均响应时长': avgDuration,
          '平均解决时长': avgDuration,
          '差评数': 0,
          '负面情绪数': 0,
          '咨询总量': 0,
          '备注': '由妙搭应用自动推送',
        } as Record<string, unknown>,
      };
    });
  }

  private toShanghaiDay(timestamp: number): { key: string; ms: number } {
    const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(new Date(timestamp));
    return { key: date, ms: new Date(`${date}T00:00:00+08:00`).getTime() };
  }

  private async fetchExistingTextValues(instanceId: string, fieldName: string): Promise<Set<string>> {
    const values = new Set<string>();
    let pageToken: string | undefined;
    for (let page = 0; page < 10; page++) {
      const input: Record<string, unknown> = { fieldNames: [fieldName], pageSize: 500 };
      if (pageToken) {
        input.pageToken = pageToken;
      }
      const result = await this.capabilityService.load(instanceId).call('searchRecords', input) as SearchRecordsResult;
      for (const r of result.records) {
        const text = this.extractText(r.record[fieldName]);
        if (text) {
          values.add(text);
        }
      }
      if (!result.hasMore || !result.pageToken) break;
      pageToken = result.pageToken;
    }
    return values;
  }

  private extractText(value: unknown): string | undefined {
    if (typeof value === 'string') {
      return value;
    }
    if (Array.isArray(value)) {
      return value
        .map((item) => (item && typeof item === 'object' && 'text' in item ? String((item as { text: string }).text) : ''))
        .join('');
    }
    if (value && typeof value === 'object' && 'text' in value) {
      return String((value as { text: string }).text);
    }
    return undefined;
  }

  private async fetchExistingReviewRecords(instanceId: string): Promise<Map<string, string>> {
    const byDay = new Map<string, string>();
    let pageToken: string | undefined;
    for (let page = 0; page < 10; page++) {
      const input: Record<string, unknown> = { fieldNames: ['统计日期'], pageSize: 500 };
      if (pageToken) {
        input.pageToken = pageToken;
      }
      const result = await this.capabilityService.load(instanceId).call('searchRecords', input) as SearchRecordsResult;
      for (const r of result.records) {
        const value = r.record['统计日期'];
        if (typeof value === 'number') {
          byDay.set(this.toShanghaiDay(value).key, r.id);
        } else if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'number') {
          byDay.set(this.toShanghaiDay(value[0]).key, r.id);
        }
      }
      if (!result.hasMore || !result.pageToken) break;
      pageToken = result.pageToken;
    }
    return byDay;
  }

  private async batchAdd(instanceId: string, records: Array<Record<string, unknown>>): Promise<void> {
    for (let i = 0; i < records.length; i += 500) {
      const chunk = records.slice(i, i + 500).map((record) => ({ record }));
      await this.capabilityService.load(instanceId).call('batchAddRecords', { records: chunk });
    }
  }
}
