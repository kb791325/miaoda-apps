import {
  BadRequestException,
  ConflictException,
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
import { apPayable, supplier } from '@server/database/schema';
import { generatePayableNo } from '@server/common/utils/business-no';
import { round2 } from '@server/modules/finance/finance-aggregate';
import { ReceiptPaymentService } from './receipt-payment.service';
import type {
  ApDetail,
  ApListParams,
  ApListResponse,
  ApPayableItem,
  CreateApRequest,
  LedgerSummary,
  ReceiptPaymentRecord,
  UpdateApRequest,
} from '@shared/finance-contract';

type DbWriter = Pick<
  PostgresJsDatabase,
  'select' | 'insert' | 'update' | 'delete'
>;

interface ApRow {
  id: string;
  payableNo: string;
  supplierId: string;
  purchaseOrderNo: string | null;
  totalAmount: string;
  paidAmount: string;
  unpaidAmount: string;
  status: string;
  dueDate: string | null;
  remark: string | null;
  createdAt: Date;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class PayableService {
  private readonly logger = new Logger(PayableService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: DbWriter,
    private readonly receiptPaymentService: ReceiptPaymentService,
  ) {}

  private async supplierNameMap(
    supplierIds: string[],
  ): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    if (supplierIds.length === 0) return map;
    const rows: Array<{ id: string; name: string }> = await this.db
      .select({ id: supplier.id, name: supplier.name })
      .from(supplier)
      .where(inArray(supplier.id, supplierIds));
    for (const row of rows) map.set(row.id, row.name);
    return map;
  }

  private toItem(row: ApRow, supplierName: string): ApPayableItem {
    return {
      id: row.id,
      payableNo: row.payableNo,
      supplierId: row.supplierId,
      supplierName,
      purchaseOrderNo: row.purchaseOrderNo,
      totalAmount: round2(Number(row.totalAmount)),
      paidAmount: round2(Number(row.paidAmount)),
      unpaidAmount: round2(Number(row.unpaidAmount)),
      status: row.status as ApPayableItem['status'],
      dueDate: row.dueDate,
      remark: row.remark,
      createdAt: row.createdAt.toISOString(),
    };
  }

  async list(params: ApListParams): Promise<ApListResponse> {
    const page: number = Math.max(1, Number(params.page ?? 1) || 1);
    const pageSize: number = Math.min(
      50,
      Math.max(1, Number(params.pageSize ?? 20) || 20),
    );
    const conditions = [];
    const supplierId: string = (params.supplierId ?? '').trim();
    if (supplierId) conditions.push(eq(apPayable.supplierId, supplierId));
    const status: string = (params.status ?? '').trim();
    if (status) conditions.push(eq(apPayable.status, status));
    const dueStart: string = (params.dueStart ?? '').trim();
    if (dueStart) conditions.push(gte(apPayable.dueDate, dueStart));
    const dueEnd: string = (params.dueEnd ?? '').trim();
    if (dueEnd) conditions.push(lte(apPayable.dueDate, dueEnd));
    const keyword: string = (params.keyword ?? '').trim();
    if (keyword) {
      conditions.push(
        or(
          ilike(apPayable.payableNo, `%${keyword}%`),
          ilike(apPayable.purchaseOrderNo, `%${keyword}%`),
        ),
      );
    }
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const countRows: Array<{ value: number }> = await this.db
      .select({ value: count() })
      .from(apPayable)
      .where(whereClause);
    const total: number = countRows[0]?.value ?? 0;

    const summaryRows: Array<{
      total: string | null;
      paid: string | null;
      unpaid: string | null;
    }> = await this.db
      .select({
        total: sql<string>`coalesce(sum(${apPayable.totalAmount}), 0)`,
        paid: sql<string>`coalesce(sum(${apPayable.paidAmount}), 0)`,
        unpaid: sql<string>`coalesce(sum(${apPayable.unpaidAmount}), 0)`,
      })
      .from(apPayable)
      .where(
        whereClause
          ? and(whereClause, ne(apPayable.status, '已作废'))
          : ne(apPayable.status, '已作废'),
      );
    const openRows: Array<{ value: number }> = await this.db
      .select({ value: count() })
      .from(apPayable)
      .where(
        and(whereClause, inArray(apPayable.status, ['未结清', '部分结清'])),
      );
    const summary: LedgerSummary = {
      totalAmount: round2(Number(summaryRows[0]?.total ?? 0)),
      receivedAmount: round2(Number(summaryRows[0]?.paid ?? 0)),
      unpaidAmount: round2(Number(summaryRows[0]?.unpaid ?? 0)),
      openCount: openRows[0]?.value ?? 0,
    };

    const rows: ApRow[] = await this.db
      .select()
      .from(apPayable)
      .where(whereClause)
      .orderBy(desc(apPayable.createdAt))
      .offset((page - 1) * pageSize)
      .limit(pageSize);

    const supplierIds: string[] = Array.from(
      new Set(rows.map((row: ApRow): string => row.supplierId)),
    );
    const nameMap: Map<string, string> = await this.supplierNameMap(supplierIds);
    const items: ApPayableItem[] = rows.map((row: ApRow): ApPayableItem =>
      this.toItem(row, nameMap.get(row.supplierId) ?? ''),
    );
    return { items, total, page, pageSize, summary };
  }

  async detail(id: string): Promise<ApDetail> {
    if (!UUID_PATTERN.test(id)) throw new NotFoundException('应付账款记录不存在');
    const rows: ApRow[] = await this.db
      .select()
      .from(apPayable)
      .where(eq(apPayable.id, id));
    const row: ApRow | undefined = rows[0];
    if (!row) throw new NotFoundException('应付账款记录不存在');
    const nameMap: Map<string, string> = await this.supplierNameMap([row.supplierId]);
    const payments: ReceiptPaymentRecord[] =
      await this.receiptPaymentService.loadRecordsByRelatedIds([id], '付款');
    return { ...this.toItem(row, nameMap.get(row.supplierId) ?? ''), payments };
  }

  async create(dto: CreateApRequest): Promise<ApPayableItem> {
    const supplierId: string = (dto.supplierId ?? '').trim();
    if (!supplierId) throw new BadRequestException('请选择供应商');
    const totalAmount: number = round2(Number(dto.totalAmount));
    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      throw new BadRequestException('应付金额必须大于 0');
    }
    const supplierRows: Array<{ id: string; name: string; status: string }> =
      await this.db
        .select({ id: supplier.id, name: supplier.name, status: supplier.status })
        .from(supplier)
        .where(eq(supplier.id, supplierId));
    const supplierRow = supplierRows[0];
    if (!supplierRow) throw new NotFoundException('供应商不存在');
    if (supplierRow.status === '已停用') {
      throw new ConflictException('供应商已停用，不可新建应付/采购记录');
    }

    const payableNo: string = await generatePayableNo(this.db);
    const amountStr: string = totalAmount.toFixed(2);
    const rows: ApRow[] = await this.db
      .insert(apPayable)
      .values({
        payableNo,
        supplierId,
        purchaseOrderNo: (dto.purchaseOrderNo ?? '').trim() || null,
        totalAmount: amountStr,
        paidAmount: '0',
        unpaidAmount: amountStr,
        status: '未结清',
        dueDate: (dto.dueDate ?? '').trim() || null,
        remark: (dto.remark ?? '').trim() || null,
      })
      .returning();
    return this.toItem(rows[0] as ApRow, supplierRow.name);
  }

  async update(id: string, dto: UpdateApRequest): Promise<{ success: boolean }> {
    if (!UUID_PATTERN.test(id)) throw new NotFoundException('应付账款记录不存在');
    const patch: Partial<typeof apPayable.$inferInsert> = {};
    if (dto.dueDate !== undefined) patch.dueDate = dto.dueDate || null;
    if (dto.remark !== undefined) patch.remark = dto.remark.trim() || null;
    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('未提供可更新字段');
    }
    patch.updatedAt = new Date();
    const rows: Array<{ id: string }> = await this.db
      .update(apPayable)
      .set(patch)
      .where(eq(apPayable.id, id))
      .returning({ id: apPayable.id });
    if (rows.length === 0) throw new NotFoundException('应付账款记录不存在');
    return { success: true };
  }
}
