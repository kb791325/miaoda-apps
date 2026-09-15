import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from '@lark-apaas/fullstack-nestjs-core';
import { and, count, desc, eq, gte, lt, lte, ne, sql } from 'drizzle-orm';
import {
  apPayable,
  arReceivable,
  reconciliation,
  supplier,
} from '@server/database/schema';
import { CAPABILITY_INSTANCE_IDS } from '@server/common/constants/capability-instance-ids';
import {
  BitableClient,
  readTextField,
} from '@server/common/utils/bitable-client';
import { generateReconNo } from '@server/common/utils/business-no';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
import { round2 } from '@server/modules/finance/finance-aggregate';
import { ReceiptPaymentService } from './receipt-payment.service';
import type {
  ReconciliationDetail,
  ReconciliationItem,
  ReconLedgerRow,
  ReconListParams,
  ReconListResponse,
  ReconPreviewRequest,
  ReconPreviewResponse,
  ReconShareView,
} from '@shared/finance-contract';

type DbWriter = Pick<
  PostgresJsDatabase,
  'select' | 'insert' | 'update' | 'delete'
>;

const DATE_PATTERN: RegExp = /^\d{4}-\d{2}-\d{2}$/;
/** 业务账期按自然日处理，固定东八区 */
const TZ_OFFSET: string = '+08:00';

interface ReconRow {
  id: string;
  reconNo: string;
  type: string;
  partyId: string;
  periodStart: string;
  periodEnd: string;
  totalAmount: string;
  receivedAmount: string;
  unpaidAmount: string;
  status: string;
  confirmedAt: Date | null;
  shareToken: string | null;
  remark: string | null;
  createdAt: Date;
}

@Injectable()
export class ReconciliationService {
  private readonly logger = new Logger(ReconciliationService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: DbWriter,
    private readonly bitableClient: BitableClient,
    private readonly receiptPaymentService: ReceiptPaymentService,
  ) {}

  private validatePeriod(periodStart: string, periodEnd: string): void {
    if (!DATE_PATTERN.test(periodStart) || !DATE_PATTERN.test(periodEnd)) {
      throw new BadRequestException('请选择有效的账期范围');
    }
    if (periodStart > periodEnd) {
      throw new BadRequestException('账期开始日期不能晚于结束日期');
    }
  }

  private periodBounds(periodStart: string, periodEnd: string): { start: Date; endExclusive: Date } {
    const start = new Date(`${periodStart}T00:00:00${TZ_OFFSET}`);
    const end = new Date(`${periodEnd}T00:00:00${TZ_OFFSET}`);
    return { start, endExclusive: new Date(end.getTime() + 24 * 60 * 60 * 1000) };
  }

  private async resolvePartyName(type: string, partyId: string): Promise<string> {
    if (type === '供应商对账') {
      const rows: Array<{ name: string }> = await this.db
        .select({ name: supplier.name })
        .from(supplier)
        .where(eq(supplier.id, partyId));
      if (rows.length === 0) throw new NotFoundException('供应商不存在');
      return rows[0]?.name ?? '';
    }
    try {
      const output = await this.bitableClient.searchRecords(
        CAPABILITY_INSTANCE_IDS.customer,
        { pageSize: 500, fieldNames: ['客户姓名'] },
      );
      const record = output.records.find((r): boolean => r.id === partyId);
      return record ? readTextField(record.record['客户姓名']) : '';
    } catch (error) {
      this.logger.warn(`customer name lookup failed: ${String(error)}`);
      return '';
    }
  }

  /** 按账期重算对账明细（客户：应收+收款；供应商：应付+付款） */
  private async computeRows(
    type: string,
    partyId: string,
    periodStart: string,
    periodEnd: string,
  ): Promise<{
    totalAmount: number;
    receivedAmount: number;
    unpaidAmount: number;
    ledgerRows: ReconLedgerRow[];
    paymentRows: Awaited<ReturnType<ReceiptPaymentService['loadRecordsByParty']>>;
  }> {
    const { start, endExclusive } = this.periodBounds(periodStart, periodEnd);

    if (type === '客户对账') {
      const periodRows: Array<{
        receivableNo: string;
        orderNo: string | null;
        totalAmount: string;
        receivedAmount: string;
        unpaidAmount: string;
        status: string;
        createdAt: Date;
      }> = await this.db
        .select()
        .from(arReceivable)
        .where(
          and(
            eq(arReceivable.customerId, partyId),
            gte(arReceivable.createdAt, start),
            lt(arReceivable.createdAt, endExclusive),
            ne(arReceivable.status, '已作废'),
          ),
        )
        .orderBy(arReceivable.createdAt);
      const openRows: Array<{ unpaid: string | null }> = await this.db
        .select({ unpaid: sql<string>`coalesce(sum(${arReceivable.unpaidAmount}), 0)` })
        .from(arReceivable)
        .where(
          and(
            eq(arReceivable.customerId, partyId),
            lt(arReceivable.createdAt, endExclusive),
            ne(arReceivable.status, '已作废'),
          ),
        );
      const ledgerRows: ReconLedgerRow[] = periodRows.map(
        (row): ReconLedgerRow => ({
          ledgerNo: row.receivableNo,
          orderNo: row.orderNo ?? '',
          totalAmount: round2(Number(row.totalAmount)),
          settledAmount: round2(Number(row.receivedAmount)),
          unpaidAmount: round2(Number(row.unpaidAmount)),
          status: row.status as ReconLedgerRow['status'],
          createdAt: row.createdAt.toISOString(),
        }),
      );
      const paymentRows = await this.receiptPaymentService.loadRecordsByParty(
        '收款',
        partyId,
        periodStart,
        periodEnd,
      );
      return {
        totalAmount: round2(ledgerRows.reduce((sum: number, r): number => sum + r.totalAmount, 0)),
        receivedAmount: round2(paymentRows.reduce((sum, r): number => sum + r.amount, 0)),
        unpaidAmount: round2(Number(openRows[0]?.unpaid ?? 0)),
        ledgerRows,
        paymentRows,
      };
    }

    const periodRows: Array<{
      payableNo: string;
      purchaseOrderNo: string | null;
      totalAmount: string;
      paidAmount: string;
      unpaidAmount: string;
      status: string;
      createdAt: Date;
    }> = await this.db
      .select()
      .from(apPayable)
      .where(
        and(
          eq(apPayable.supplierId, partyId),
          gte(apPayable.createdAt, start),
          lt(apPayable.createdAt, endExclusive),
          ne(apPayable.status, '已作废'),
        ),
      )
      .orderBy(apPayable.createdAt);
    const openRows: Array<{ unpaid: string | null }> = await this.db
      .select({ unpaid: sql<string>`coalesce(sum(${apPayable.unpaidAmount}), 0)` })
      .from(apPayable)
      .where(
        and(
          eq(apPayable.supplierId, partyId),
          lt(apPayable.createdAt, endExclusive),
          ne(apPayable.status, '已作废'),
        ),
      );
    const ledgerRows: ReconLedgerRow[] = periodRows.map(
      (row): ReconLedgerRow => ({
        ledgerNo: row.payableNo,
        orderNo: row.purchaseOrderNo ?? '',
        totalAmount: round2(Number(row.totalAmount)),
        settledAmount: round2(Number(row.paidAmount)),
        unpaidAmount: round2(Number(row.unpaidAmount)),
        status: row.status as ReconLedgerRow['status'],
        createdAt: row.createdAt.toISOString(),
      }),
    );
    const paymentRows = await this.receiptPaymentService.loadRecordsByParty(
      '付款',
      partyId,
      periodStart,
      periodEnd,
    );
    return {
      totalAmount: round2(ledgerRows.reduce((sum: number, r): number => sum + r.totalAmount, 0)),
      receivedAmount: round2(paymentRows.reduce((sum, r): number => sum + r.amount, 0)),
      unpaidAmount: round2(Number(openRows[0]?.unpaid ?? 0)),
      ledgerRows,
      paymentRows,
    };
  }

  async preview(dto: ReconPreviewRequest): Promise<ReconPreviewResponse> {
    if (dto.type !== '客户对账' && dto.type !== '供应商对账') {
      throw new BadRequestException('无效的对账类型');
    }
    const partyId: string = (dto.partyId ?? '').trim();
    if (!partyId) throw new BadRequestException('请选择对账对象');
    this.validatePeriod(dto.periodStart, dto.periodEnd);
    const partyName: string = await this.resolvePartyName(dto.type, partyId);
    const computed = await this.computeRows(dto.type, partyId, dto.periodStart, dto.periodEnd);
    return { partyName, ...computed };
  }

  async generate(dto: ReconPreviewRequest): Promise<ReconciliationDetail> {
    const preview = await this.preview(dto);
    const reconNo: string = await generateReconNo(this.db);
    const rows: ReconRow[] = await this.db
      .insert(reconciliation)
      .values({
        reconNo,
        type: dto.type,
        partyId: dto.partyId,
        periodStart: dto.periodStart,
        periodEnd: dto.periodEnd,
        totalAmount: preview.totalAmount.toFixed(2),
        receivedAmount: preview.receivedAmount.toFixed(2),
        unpaidAmount: preview.unpaidAmount.toFixed(2),
        status: '待确认',
        shareToken: randomBytes(24).toString('base64url'),
      })
      .returning();
    const row: ReconRow = rows[0] as ReconRow;
    this.logger.log(`reconciliation ${reconNo} generated`);
    const detail: ReconciliationDetail = this.buildDetail(
      row,
      preview.ledgerRows,
      preview.paymentRows,
      true,
    );
    return { ...detail, partyName: preview.partyName };
  }

  private toItem(row: ReconRow, partyName: string): ReconciliationItem {
    return {
      id: row.id,
      reconNo: row.reconNo,
      type: row.type as ReconciliationItem['type'],
      partyId: row.partyId,
      partyName,
      periodStart: row.periodStart,
      periodEnd: row.periodEnd,
      totalAmount: round2(Number(row.totalAmount)),
      receivedAmount: round2(Number(row.receivedAmount)),
      unpaidAmount: round2(Number(row.unpaidAmount)),
      status: row.status as ReconciliationItem['status'],
      confirmedAt: row.confirmedAt ? row.confirmedAt.toISOString() : null,
      remark: row.remark,
      createdAt: row.createdAt.toISOString(),
    };
  }

  private buildDetail(
    row: ReconRow,
    ledgerRows: ReconLedgerRow[],
    paymentRows: Awaited<ReturnType<ReceiptPaymentService['loadRecordsByParty']>>,
    includeToken: boolean,
  ): ReconciliationDetail {
    return {
      ...this.toItem(row, ''),
      partyName: '',
      shareToken: includeToken ? row.shareToken : null,
      ledgerRows,
      paymentRows,
    };
  }

  async list(params: ReconListParams): Promise<ReconListResponse> {
    const page: number = Math.max(1, Number(params.page ?? 1) || 1);
    const pageSize: number = Math.min(
      50,
      Math.max(1, Number(params.pageSize ?? 20) || 20),
    );
    const conditions = [];
    const type: string = (params.type ?? '').trim();
    if (type) conditions.push(eq(reconciliation.type, type));
    const status: string = (params.status ?? '').trim();
    if (status) conditions.push(eq(reconciliation.status, status));
    const periodStart: string = (params.periodStart ?? '').trim();
    const periodEnd: string = (params.periodEnd ?? '').trim();
    if (periodStart && DATE_PATTERN.test(periodStart)) {
      conditions.push(gte(reconciliation.periodEnd, periodStart));
    }
    if (periodEnd && DATE_PATTERN.test(periodEnd)) {
      conditions.push(lte(reconciliation.periodStart, periodEnd));
    }
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const countRows: Array<{ value: number }> = await this.db
      .select({ value: count() })
      .from(reconciliation)
      .where(whereClause);
    const total: number = countRows[0]?.value ?? 0;
    const rows: ReconRow[] = await this.db
      .select()
      .from(reconciliation)
      .where(whereClause)
      .orderBy(desc(reconciliation.createdAt))
      .offset((page - 1) * pageSize)
      .limit(pageSize);

    const items: ReconciliationItem[] = [];
    for (const row of rows) {
      const partyName: string = await this.resolvePartyName(row.type, row.partyId).catch(
        (): string => '',
      );
      items.push(this.toItem(row, partyName));
    }
    return { items, total, page, pageSize };
  }

  async detail(id: string): Promise<ReconciliationDetail> {
    if (!UUID_PATTERN.test(id)) throw new NotFoundException('对账单不存在');
    const rows: ReconRow[] = await this.db
      .select()
      .from(reconciliation)
      .where(eq(reconciliation.id, id));
    const row: ReconRow | undefined = rows[0];
    if (!row) throw new NotFoundException('对账单不存在');
    const computed = await this.computeRows(row.type, row.partyId, row.periodStart, row.periodEnd);
    const partyName: string = await this.resolvePartyName(row.type, row.partyId).catch(
      (): string => '',
    );
    const detail: ReconciliationDetail = this.buildDetail(row, computed.ledgerRows, computed.paymentRows, true);
    return { ...detail, partyName };
  }

  /** 分享链接公开视图（不返回分享令牌） */
  async sharedView(token: string): Promise<ReconShareView> {
    const row: ReconRow | undefined = await this.findByToken(token);
    if (!row) throw new NotFoundException('对账单链接无效或已失效');
    return this.buildShareView(row);
  }

  /** 客户在线确认对账单 */
  async confirm(token: string): Promise<ReconShareView> {
    const row: ReconRow | undefined = await this.findByToken(token);
    if (!row) throw new NotFoundException('对账单链接无效或已失效');
    if (row.status === '已确认') {
      throw new BadRequestException('该对账单已确认，无需重复操作');
    }
    const updated: ReconRow[] = await this.db
      .update(reconciliation)
      .set({ status: '已确认', confirmedAt: new Date() })
      .where(eq(reconciliation.id, row.id))
      .returning();
    const target: ReconRow = (updated[0] as ReconRow) ?? row;
    return this.buildShareView(target);
  }

  private async findByToken(token: string): Promise<ReconRow | undefined> {
    if (!token) return undefined;
    const rows: ReconRow[] = await this.db
      .select()
      .from(reconciliation)
      .where(eq(reconciliation.shareToken, token));
    return rows[0];
  }

  private async buildShareView(row: ReconRow): Promise<ReconShareView> {
    const computed = await this.computeRows(row.type, row.partyId, row.periodStart, row.periodEnd);
    const partyName: string = await this.resolvePartyName(row.type, row.partyId).catch(
      (): string => '',
    );
    return {
      reconNo: row.reconNo,
      type: row.type as ReconShareView['type'],
      partyName,
      periodStart: row.periodStart,
      periodEnd: row.periodEnd,
      totalAmount: round2(Number(row.totalAmount)),
      receivedAmount: round2(Number(row.receivedAmount)),
      unpaidAmount: round2(Number(row.unpaidAmount)),
      status: row.status as ReconShareView['status'],
      confirmedAt: row.confirmedAt ? row.confirmedAt.toISOString() : null,
      ledgerRows: computed.ledgerRows,
      paymentRows: computed.paymentRows,
    };
  }
}
