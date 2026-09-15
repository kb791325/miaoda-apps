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
import {
  and,
  count,
  desc,
  eq,
  gte,
  inArray,
  lte,
  sql,
} from 'drizzle-orm';
import {
  apPayable,
  appUser,
  arReceivable,
  receiptPayment,
  supplier,
} from '@server/database/schema';
import { CAPABILITY_INSTANCE_IDS } from '@server/common/constants/capability-instance-ids';
import {
  BitableClient,
  readTextField,
} from '@server/common/utils/bitable-client';
import { round2 } from '@server/modules/finance/finance-aggregate';
import {
  FundFlowService,
} from '@server/modules/fund-flow/fund-flow.service';
import type {
  CreateReceiptRequest,
  CreateReceiptResponse,
  ReceiptDetail,
  ReceiptListParams,
  ReceiptListResponse,
  ReceiptPaymentRecord,
} from '@shared/finance-contract';

type DbWriter = Pick<
  PostgresJsDatabase,
  'select' | 'insert' | 'update' | 'delete' | 'transaction'
>;

const PAYMENT_METHOD_SET: Set<string> = new Set([
  '现金',
  '银行转账',
  '微信',
  '支付宝',
  '其他',
]);
const DATE_PATTERN: RegExp = /^\d{4}-\d{2}-\d{2}$/;
const UUID_PATTERN: RegExp =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PAYMENT_METHOD_ACCOUNT: Record<string, string> = {
  现金: '现金',
  银行转账: '银行账户',
  微信: '微信',
  支付宝: '支付宝',
  其他: '银行账户',
};

@Injectable()
export class ReceiptPaymentService {
  private readonly logger = new Logger(ReceiptPaymentService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: DbWriter,
    private readonly bitableClient: BitableClient,
    private readonly fundFlowService: FundFlowService,
  ) {}

  async create(
    dto: CreateReceiptRequest,
    operatorId: string,
  ): Promise<CreateReceiptResponse> {
    const type: string = (dto.type ?? '').trim();
    if (type !== '收款' && type !== '付款') {
      throw new BadRequestException('无效的类型');
    }
    const partyId: string = (dto.partyId ?? '').trim();
    if (!partyId) throw new BadRequestException('请选择客户或供应商');
    if (!Array.isArray(dto.items) || dto.items.length === 0) {
      throw new BadRequestException('请至少选择一笔账款');
    }
    if (dto.items.length > 20) {
      throw new BadRequestException('单次最多处理 20 笔账款');
    }
    if (!PAYMENT_METHOD_SET.has(dto.paymentMethod)) {
      throw new BadRequestException('无效的收付款方式');
    }
    if (!DATE_PATTERN.test(dto.paymentDate ?? '')) {
      throw new BadRequestException('请选择有效的收付款日期');
    }
    for (const item of dto.items) {
      const amount: number = Number(item.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new BadRequestException('金额必须大于 0');
      }
    }

    const datePart: string = dto.paymentDate.replace(/-/gu, '');
    const batchNo: string = `${type === '收款' ? 'SK' : 'FK'}${datePart}${String(
      Math.floor(1000 + Math.random() * 9000),
    )}`;
    const remark: string | null = (dto.remark ?? '').trim() || null;
    let totalAmount = 0;
    const flowItems: Array<{
      relatedId: string;
      amount: number;
      orderNo: string | null;
    }> = [];

    await this.db.transaction(async (tx): Promise<void> => {
      for (const item of dto.items) {
        const amountStr: string = round2(Number(item.amount)).toFixed(2);
        let orderNo: string | null = null;

        if (type === '收款') {
          const rows: Array<{
            id: string;
            customerId: string;
            orderNo: string | null;
          }> = await tx
            .select({
              id: arReceivable.id,
              customerId: arReceivable.customerId,
              orderNo: arReceivable.orderNo,
            })
            .from(arReceivable)
            .where(eq(arReceivable.id, item.relatedId));
          const row = rows[0];
          if (!row) throw new NotFoundException(`应收账款 ${item.relatedId} 不存在`);
          if (row.customerId !== partyId) {
            throw new BadRequestException('存在与所选客户不一致的应收单');
          }
          orderNo = row.orderNo;
          const updated: Array<{ id: string }> = await tx
            .update(arReceivable)
            .set({
              receivedAmount: sql`${arReceivable.receivedAmount} + ${amountStr}::numeric`,
              unpaidAmount: sql`${arReceivable.totalAmount} - (${arReceivable.receivedAmount} + ${amountStr}::numeric)`,
              status: sql`CASE WHEN ${arReceivable.receivedAmount} + ${amountStr}::numeric >= ${arReceivable.totalAmount} THEN '已结清' ELSE '部分结清' END`,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(arReceivable.id, item.relatedId),
                inArray(arReceivable.status, ['未结清', '部分结清']),
                sql`${arReceivable.receivedAmount} + ${amountStr}::numeric <= ${arReceivable.totalAmount}`,
              ),
            )
            .returning({ id: arReceivable.id });
          if (updated.length === 0) {
            throw new ConflictException('收款金额超过未收余额，或账款状态已变化，请刷新重试');
          }
        } else {
          const rows: Array<{
            id: string;
            supplierId: string;
            purchaseOrderNo: string | null;
          }> = await tx
            .select({
              id: apPayable.id,
              supplierId: apPayable.supplierId,
              purchaseOrderNo: apPayable.purchaseOrderNo,
            })
            .from(apPayable)
            .where(eq(apPayable.id, item.relatedId));
          const row = rows[0];
          if (!row) throw new NotFoundException(`应付账款 ${item.relatedId} 不存在`);
          if (row.supplierId !== partyId) {
            throw new BadRequestException('存在与所选供应商不一致的应付单');
          }
          orderNo = row.purchaseOrderNo;
          const updated: Array<{ id: string }> = await tx
            .update(apPayable)
            .set({
              paidAmount: sql`${apPayable.paidAmount} + ${amountStr}::numeric`,
              unpaidAmount: sql`${apPayable.totalAmount} - (${apPayable.paidAmount} + ${amountStr}::numeric)`,
              status: sql`CASE WHEN ${apPayable.paidAmount} + ${amountStr}::numeric >= ${apPayable.totalAmount} THEN '已结清' ELSE '部分结清' END`,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(apPayable.id, item.relatedId),
                inArray(apPayable.status, ['未结清', '部分结清']),
                sql`${apPayable.paidAmount} + ${amountStr}::numeric <= ${apPayable.totalAmount}`,
              ),
            )
            .returning({ id: apPayable.id });
          if (updated.length === 0) {
            throw new ConflictException('付款金额超过未付余额，或账款状态已变化，请刷新重试');
          }
        }

        await tx.insert(receiptPayment).values({
          type,
          relatedId: item.relatedId,
          partyId,
          orderNo,
          amount: amountStr,
          paymentMethod: dto.paymentMethod,
          paymentDate: dto.paymentDate,
          batchNo,
          remark,
          operator: operatorId || undefined,
        });
        flowItems.push({
          relatedId: item.relatedId,
          amount: Number(amountStr),
          orderNo,
        });
        totalAmount += Number(amountStr);
      }
    });

    this.logger.log(`${type} batch ${batchNo}: ${dto.items.length} items, total ${totalAmount}`);

    // 收付款成功后自动生成资金流水（失败仅告警，不阻断收付款结果）
    await this.fundFlowService
      .recordFromReceipts({
        type: type as '收款' | '付款',
        partyId,
        account: PAYMENT_METHOD_ACCOUNT[dto.paymentMethod] ?? '银行账户',
        flowDate: dto.paymentDate,
        operatorId,
        remark,
        items: flowItems,
      })
      .catch((error: unknown): void => {
        this.logger.warn(
          `fund flow for batch ${batchNo} failed: ${error instanceof Error ? error.message : 'unknown'}`,
        );
      });

    return {
      successCount: dto.items.length,
      batchNo,
      totalAmount: round2(totalAmount),
    };
  }

  async getDetail(id: string): Promise<ReceiptDetail | null> {
    const rows: Array<{
      id: string;
      type: string;
      relatedId: string;
      partyId: string;
      orderNo: string | null;
      batchNo: string | null;
      amount: string;
      paymentMethod: string;
      paymentDate: string;
      operator: string | null;
      remark: string | null;
      createdAt: Date;
    }> = await this.db
      .select()
      .from(receiptPayment)
      .where(eq(receiptPayment.id, id));
    if (rows.length === 0) return null;

    const enriched = await this.enrichRecords(rows);
    const record: ReceiptPaymentRecord = enriched[0];

    let relatedStatus: string | null = null;
    let relatedTotalAmount: number | null = null;
    let relatedReceivedAmount: number | null = null;
    let relatedUnpaidAmount: number | null = null;

    if (record.type === '收款') {
      const arRows = await this.db
        .select({
          totalAmount: arReceivable.totalAmount,
          receivedAmount: arReceivable.receivedAmount,
          unpaidAmount: arReceivable.unpaidAmount,
          status: arReceivable.status,
        })
        .from(arReceivable)
        .where(eq(arReceivable.id, record.relatedId));
      if (arRows.length > 0) {
        const row = arRows[0];
        relatedStatus = row.status;
        relatedTotalAmount = Number(row.totalAmount);
        relatedReceivedAmount = Number(row.receivedAmount);
        relatedUnpaidAmount = Number(row.unpaidAmount);
      }
    } else {
      const apRows = await this.db
        .select({
          totalAmount: apPayable.totalAmount,
          paidAmount: apPayable.paidAmount,
          unpaidAmount: apPayable.unpaidAmount,
          status: apPayable.status,
        })
        .from(apPayable)
        .where(eq(apPayable.id, record.relatedId));
      if (apRows.length > 0) {
        const row = apRows[0];
        relatedStatus = row.status;
        relatedTotalAmount = Number(row.totalAmount);
        relatedReceivedAmount = Number(row.paidAmount);
        relatedUnpaidAmount = Number(row.unpaidAmount);
      }
    }

    return {
      ...record,
      relatedStatus: relatedStatus as ReceiptDetail['relatedStatus'],
      relatedTotalAmount,
      relatedReceivedAmount,
      relatedUnpaidAmount,
    };
  }

  async list(params: ReceiptListParams): Promise<ReceiptListResponse> {
    const page: number = Math.max(1, Number(params.page ?? 1) || 1);
    const pageSize: number = Math.min(
      50,
      Math.max(1, Number(params.pageSize ?? 20) || 20),
    );
    const conditions = [];
    const type: string = (params.type ?? '').trim();
    if (type) conditions.push(eq(receiptPayment.type, type));
    const partyId: string = (params.partyId ?? '').trim();
    if (partyId) conditions.push(eq(receiptPayment.partyId, partyId));
    const paymentMethod: string = (params.paymentMethod ?? '').trim();
    if (paymentMethod) conditions.push(eq(receiptPayment.paymentMethod, paymentMethod));
    const dateStart: string = (params.dateStart ?? '').trim();
    if (dateStart) conditions.push(gte(receiptPayment.paymentDate, dateStart));
    const dateEnd: string = (params.dateEnd ?? '').trim();
    if (dateEnd) conditions.push(lte(receiptPayment.paymentDate, dateEnd));
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const countRows: Array<{ value: number }> = await this.db
      .select({ value: count() })
      .from(receiptPayment)
      .where(whereClause);
    const total: number = countRows[0]?.value ?? 0;

    const sumRows: Array<{ value: string | null }> = await this.db
      .select({ value: sql<string>`coalesce(sum(${receiptPayment.amount}), 0)` })
      .from(receiptPayment)
      .where(whereClause);

    const rows: Array<{
      id: string;
      type: string;
      relatedId: string;
      partyId: string;
      orderNo: string | null;
      batchNo: string | null;
      amount: string;
      paymentMethod: string;
      paymentDate: string;
      operator: string | null;
      remark: string | null;
      createdAt: Date;
    }> = await this.db
      .select()
      .from(receiptPayment)
      .where(whereClause)
      .orderBy(desc(receiptPayment.paymentDate), desc(receiptPayment.createdAt))
      .offset((page - 1) * pageSize)
      .limit(pageSize);

    const items: ReceiptPaymentRecord[] = await this.enrichRecords(rows);
    return {
      items,
      total,
      page,
      pageSize,
      totalAmount: round2(Number(sumRows[0]?.value ?? 0)),
    };
  }

  /** 供对账单复用：按类型/对象/日期范围查询富化后的记录 */
  async loadRecordsByParty(
    type: string,
    partyId: string,
    dateStart: string,
    dateEnd: string,
  ): Promise<ReceiptPaymentRecord[]> {
    const rows: Array<{
      id: string;
      type: string;
      relatedId: string;
      partyId: string;
      orderNo: string | null;
      batchNo: string | null;
      amount: string;
      paymentMethod: string;
      paymentDate: string;
      operator: string | null;
      remark: string | null;
      createdAt: Date;
    }> = await this.db
      .select()
      .from(receiptPayment)
      .where(
        and(
          eq(receiptPayment.type, type),
          eq(receiptPayment.partyId, partyId),
          gte(receiptPayment.paymentDate, dateStart),
          lte(receiptPayment.paymentDate, dateEnd),
        ),
      )
      .orderBy(desc(receiptPayment.paymentDate), desc(receiptPayment.createdAt));
    return this.enrichRecords(rows);
  }

  /** 供应收/应付详情复用的关联记录查询 */
  async loadRecordsByRelatedIds(
    relatedIds: string[],
    type: string,
  ): Promise<ReceiptPaymentRecord[]> {
    if (relatedIds.length === 0) return [];
    const rows: Array<{
      id: string;
      type: string;
      relatedId: string;
      partyId: string;
      orderNo: string | null;
      batchNo: string | null;
      amount: string;
      paymentMethod: string;
      paymentDate: string;
      operator: string | null;
      remark: string | null;
      createdAt: Date;
    }> = await this.db
      .select()
      .from(receiptPayment)
      .where(
        and(
          inArray(receiptPayment.relatedId, relatedIds),
          eq(receiptPayment.type, type),
        ),
      )
      .orderBy(desc(receiptPayment.paymentDate), desc(receiptPayment.createdAt));
    return this.enrichRecords(rows);
  }

  private async enrichRecords(
    rows: Array<{
      id: string;
      type: string;
      relatedId: string;
      partyId: string;
      orderNo: string | null;
      batchNo: string | null;
      amount: string;
      paymentMethod: string;
      paymentDate: string;
      operator: string | null;
      remark: string | null;
      createdAt: Date;
    }>,
  ): Promise<ReceiptPaymentRecord[]> {
    if (rows.length === 0) return [];

    const receiptIds: string[] = rows
      .filter((row): boolean => row.type === '收款')
      .map((row): string => row.relatedId);
    const paymentIds: string[] = rows
      .filter((row): boolean => row.type === '付款')
      .map((row): string => row.relatedId);
    const noMap = new Map<string, string>();
    if (receiptIds.length > 0) {
      const arRows: Array<{ id: string; receivableNo: string }> = await this.db
        .select({ id: arReceivable.id, receivableNo: arReceivable.receivableNo })
        .from(arReceivable)
        .where(inArray(arReceivable.id, receiptIds));
      for (const row of arRows) noMap.set(row.id, row.receivableNo);
    }
    if (paymentIds.length > 0) {
      const apRows: Array<{ id: string; payableNo: string }> = await this.db
        .select({ id: apPayable.id, payableNo: apPayable.payableNo })
        .from(apPayable)
        .where(inArray(apPayable.id, paymentIds));
      for (const row of apRows) noMap.set(row.id, row.payableNo);
    }

    const partyIds: string[] = Array.from(new Set(rows.map((r): string => r.partyId)));
    const supplierIds: string[] = partyIds.filter((id: string): boolean =>
      UUID_PATTERN.test(id),
    );
    const customerIds: string[] = partyIds.filter(
      (id: string): boolean => !UUID_PATTERN.test(id),
    );
    const partyNames = new Map<string, string>();
    if (supplierIds.length > 0) {
      const supplierRows: Array<{ id: string; name: string }> = await this.db
        .select({ id: supplier.id, name: supplier.name })
        .from(supplier)
        .where(inArray(supplier.id, supplierIds));
      for (const row of supplierRows) partyNames.set(row.id, row.name);
    }
    if (customerIds.length > 0) {
      try {
        const output = await this.bitableClient.searchRecords(
          CAPABILITY_INSTANCE_IDS.customer,
          { pageSize: 500, fieldNames: ['客户姓名'] },
        );
        for (const record of output.records) {
          partyNames.set(record.id, readTextField(record.record['客户姓名']));
        }
      } catch (error) {
        this.logger.warn(`customer name lookup failed: ${String(error)}`);
      }
    }

    const operatorIds: string[] = Array.from(
      new Set(
        rows
          .map((row): string | null => row.operator)
          .filter(
            (v: string | null): v is string =>
              Boolean(v) && UUID_PATTERN.test(v as string),
          ),
      ),
    );
    const operatorNames = new Map<string, string>();
    if (operatorIds.length > 0) {
      const userRows: Array<{ id: string; name: string }> = await this.db
        .select({ id: appUser.id, name: appUser.name })
        .from(appUser)
        .where(inArray(appUser.id, operatorIds));
      for (const row of userRows) operatorNames.set(row.id, row.name);
    }

    return rows.map(
      (row): ReceiptPaymentRecord => ({
        id: row.id,
        type: row.type as ReceiptPaymentRecord['type'],
        relatedId: row.relatedId,
        relatedNo: noMap.get(row.relatedId) ?? '',
        partyId: row.partyId,
        partyName: partyNames.get(row.partyId) ?? '',
        orderNo: row.orderNo,
        batchNo: row.batchNo,
        amount: round2(Number(row.amount)),
        paymentMethod: row.paymentMethod as ReceiptPaymentRecord['paymentMethod'],
        paymentDate: row.paymentDate,
        operatorName: row.operator ? operatorNames.get(row.operator) ?? '' : '',
        remark: row.remark,
        createdAt: row.createdAt.toISOString(),
      }),
    );
  }
}
