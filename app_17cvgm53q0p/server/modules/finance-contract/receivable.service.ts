import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from '@lark-apaas/fullstack-nestjs-core';
import { and, count, desc, eq, gte, ilike, inArray, lte, ne, or, sql } from 'drizzle-orm';
import { arReceivable } from '@server/database/schema';
import { CAPABILITY_INSTANCE_IDS } from '@server/common/constants/capability-instance-ids';
import {
  BitableClient,
  readTextField,
} from '@server/common/utils/bitable-client';
import { generateReceivableNo } from '@server/common/utils/business-no';
import { round2 } from '@server/modules/finance/finance-aggregate';
import { ReceiptPaymentService } from './receipt-payment.service';
import type {
  ArDetail,
  ArListParams,
  ArListResponse,
  ArReceivableItem,
  LedgerSummary,
  ReceiptPaymentRecord,
  UpdateArRequest,
} from '@shared/finance-contract';

type DbWriter = Pick<
  PostgresJsDatabase,
  'select' | 'insert' | 'update' | 'delete'
>;
type DbReader = Pick<PostgresJsDatabase, 'select'>;

const UUID_PATTERN: RegExp =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface ArRow {
  id: string;
  receivableNo: string;
  customerId: string;
  orderId: string | null;
  orderNo: string | null;
  totalAmount: string;
  receivedAmount: string;
  unpaidAmount: string;
  status: string;
  dueDate: string | null;
  remark: string | null;
  createdAt: Date;
}

export interface CreateFromOrderParams {
  orderId: string;
  orderNo: string;
  customerId: string;
  totalAmount: number;
  operatorId?: string;
}

@Injectable()
export class ReceivableService {
  private readonly logger = new Logger(ReceivableService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: DbWriter,
    private readonly bitableClient: BitableClient,
    private readonly receiptPaymentService: ReceiptPaymentService,
  ) {}

  /** 客户名称映射（bitable 查询，失败返回空映射降级） */
  async loadCustomerNames(customerIds: string[]): Promise<Map<string, string>> {
    const names = new Map<string, string>();
    if (customerIds.length === 0) return names;
    try {
      const output = await this.bitableClient.searchRecords(
        CAPABILITY_INSTANCE_IDS.customer,
        { pageSize: 500, fieldNames: ['客户姓名'] },
      );
      for (const record of output.records) {
        names.set(record.id, readTextField(record.record['客户姓名']));
      }
    } catch (error) {
      this.logger.warn(`customer name lookup failed: ${String(error)}`);
    }
    return names;
  }

  private toItem(row: ArRow, customerName: string): ArReceivableItem {
    return {
      id: row.id,
      receivableNo: row.receivableNo,
      customerId: row.customerId,
      customerName,
      orderId: row.orderId,
      orderNo: row.orderNo,
      totalAmount: round2(Number(row.totalAmount)),
      receivedAmount: round2(Number(row.receivedAmount)),
      unpaidAmount: round2(Number(row.unpaidAmount)),
      status: row.status as ArReceivableItem['status'],
      dueDate: row.dueDate,
      remark: row.remark,
      createdAt: row.createdAt.toISOString(),
    };
  }

  async list(params: ArListParams): Promise<ArListResponse> {
    const page: number = Math.max(1, Number(params.page ?? 1) || 1);
    const pageSize: number = Math.min(
      50,
      Math.max(1, Number(params.pageSize ?? 20) || 20),
    );
    const conditions = [];
    const customerId: string = (params.customerId ?? '').trim();
    if (customerId) conditions.push(eq(arReceivable.customerId, customerId));
    const status: string = (params.status ?? '').trim();
    if (status) conditions.push(eq(arReceivable.status, status));
    const dueStart: string = (params.dueStart ?? '').trim();
    if (dueStart) conditions.push(gte(arReceivable.dueDate, dueStart));
    const dueEnd: string = (params.dueEnd ?? '').trim();
    if (dueEnd) conditions.push(lte(arReceivable.dueDate, dueEnd));
    const keyword: string = (params.keyword ?? '').trim();
    if (keyword) {
      conditions.push(
        or(
          ilike(arReceivable.receivableNo, `%${keyword}%`),
          ilike(arReceivable.orderNo, `%${keyword}%`),
        ),
      );
    }
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const countRows: Array<{ value: number }> = await this.db
      .select({ value: count() })
      .from(arReceivable)
      .where(whereClause);
    const total: number = countRows[0]?.value ?? 0;

    const summaryRows: Array<{
      total: string | null;
      received: string | null;
      unpaid: string | null;
    }> = await this.db
      .select({
        total: sql<string>`coalesce(sum(${arReceivable.totalAmount}), 0)`,
        received: sql<string>`coalesce(sum(${arReceivable.receivedAmount}), 0)`,
        unpaid: sql<string>`coalesce(sum(${arReceivable.unpaidAmount}), 0)`,
      })
      .from(arReceivable)
      .where(
        whereClause
          ? and(whereClause, ne(arReceivable.status, '已作废'))
          : ne(arReceivable.status, '已作废'),
      );
    const openRows: Array<{ value: number }> = await this.db
      .select({ value: count() })
      .from(arReceivable)
      .where(
        and(
          whereClause,
          inArray(arReceivable.status, ['未结清', '部分结清']),
        ),
      );
    const summary: LedgerSummary = {
      totalAmount: round2(Number(summaryRows[0]?.total ?? 0)),
      receivedAmount: round2(Number(summaryRows[0]?.received ?? 0)),
      unpaidAmount: round2(Number(summaryRows[0]?.unpaid ?? 0)),
      openCount: openRows[0]?.value ?? 0,
    };

    const rows: ArRow[] = await this.db
      .select()
      .from(arReceivable)
      .where(whereClause)
      .orderBy(desc(arReceivable.createdAt))
      .offset((page - 1) * pageSize)
      .limit(pageSize);

    const customerIds: string[] = Array.from(
      new Set(rows.map((row: ArRow): string => row.customerId)),
    );
    const nameMap: Map<string, string> = await this.loadCustomerNames(customerIds);
    const items: ArReceivableItem[] = rows.map((row: ArRow): ArReceivableItem =>
      this.toItem(row, nameMap.get(row.customerId) ?? ''),
    );
    return { items, total, page, pageSize, summary };
  }

  async detail(id: string): Promise<ArDetail> {
    if (!UUID_PATTERN.test(id)) throw new NotFoundException('应收账款记录不存在');
    const rows: ArRow[] = await this.db
      .select()
      .from(arReceivable)
      .where(eq(arReceivable.id, id));
    const row: ArRow | undefined = rows[0];
    if (!row) throw new NotFoundException('应收账款记录不存在');

    const nameMap: Map<string, string> = await this.loadCustomerNames([row.customerId]);
    const receipts: ReceiptPaymentRecord[] =
      await this.receiptPaymentService.loadRecordsByRelatedIds([id], '收款');
    return { ...this.toItem(row, nameMap.get(row.customerId) ?? ''), receipts };
  }

  async update(id: string, dto: UpdateArRequest): Promise<{ success: boolean }> {
    if (!UUID_PATTERN.test(id)) throw new NotFoundException('应收账款记录不存在');
    const patch: Partial<typeof arReceivable.$inferInsert> = {};
    if (dto.dueDate !== undefined) patch.dueDate = dto.dueDate || null;
    if (dto.remark !== undefined) patch.remark = dto.remark.trim() || null;
    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('未提供可更新字段');
    }
    patch.updatedAt = new Date();
    const rows: Array<{ id: string }> = await this.db
      .update(arReceivable)
      .set(patch)
      .where(eq(arReceivable.id, id))
      .returning({ id: arReceivable.id });
    if (rows.length === 0) throw new NotFoundException('应收账款记录不存在');
    return { success: true };
  }

  /** 客户应收汇总（供客户档案展示） */
  async customerSummary(customerId: string): Promise<LedgerSummary> {
    const summaryRows: Array<{
      total: string | null;
      received: string | null;
      unpaid: string | null;
    }> = await this.db
      .select({
        total: sql<string>`coalesce(sum(${arReceivable.totalAmount}), 0)`,
        received: sql<string>`coalesce(sum(${arReceivable.receivedAmount}), 0)`,
        unpaid: sql<string>`coalesce(sum(${arReceivable.unpaidAmount}), 0)`,
      })
      .from(arReceivable)
      .where(
        and(
          eq(arReceivable.customerId, customerId),
          ne(arReceivable.status, '已作废'),
        ),
      );
    const openRows: Array<{ value: number }> = await this.db
      .select({ value: count() })
      .from(arReceivable)
      .where(
        and(
          eq(arReceivable.customerId, customerId),
          inArray(arReceivable.status, ['未结清', '部分结清']),
        ),
      );
    return {
      totalAmount: round2(Number(summaryRows[0]?.total ?? 0)),
      receivedAmount: round2(Number(summaryRows[0]?.received ?? 0)),
      unpaidAmount: round2(Number(summaryRows[0]?.unpaid ?? 0)),
      openCount: openRows[0]?.value ?? 0,
    };
  }

  /** 订单创建后自动生成应收账款（金额 = 订单总金额含向客户收取的费用） */
  async createFromOrder(params: CreateFromOrderParams): Promise<void> {
    if (params.totalAmount <= 0) {
      this.logger.log(`skip receivable for order ${params.orderId}: amount <= 0`);
      return;
    }
    const existing: Array<{ id: string }> = await this.db
      .select({ id: arReceivable.id })
      .from(arReceivable)
      .where(eq(arReceivable.orderId, params.orderId));
    if (existing.length > 0) {
      this.logger.log(`receivable exists for order ${params.orderId}, skip`);
      return;
    }
    const receivableNo: string = await generateReceivableNo(
      this.db as unknown as DbReader,
    );
    const dueDate: string = new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000,
    ).toISOString().slice(0, 10);
    const amount: string = round2(params.totalAmount).toFixed(2);
    await this.db.insert(arReceivable).values({
      receivableNo,
      customerId: params.customerId,
      orderId: params.orderId,
      orderNo: params.orderNo,
      totalAmount: amount,
      receivedAmount: '0',
      unpaidAmount: amount,
      status: '未结清',
      dueDate,
      remark: null,
      createdBy: params.operatorId || undefined,
    });
    this.logger.log(`receivable ${receivableNo} created for order ${params.orderId}`);
  }

  /** 订单取消/删除时作废对应应收账款 */
  async voidByOrders(orderIds: string[]): Promise<void> {
    if (orderIds.length === 0) return;
    const rows: Array<{ id: string }> = await this.db
      .update(arReceivable)
      .set({ status: '已作废', updatedAt: new Date() })
      .where(
        and(
          inArray(arReceivable.orderId, orderIds),
          ne(arReceivable.status, '已作废'),
        ),
      )
      .returning({ id: arReceivable.id });
    if (rows.length > 0) {
      this.logger.log(`voided ${rows.length} receivables for orders ${orderIds.join(',')}`);
    }
  }
}
