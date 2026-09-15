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
import { and, count, desc, eq, gte, inArray, lte, sql } from 'drizzle-orm';
import { appUser, expense } from '@server/database/schema';
import { generateExpenseNo } from '@server/common/utils/business-no';
import { round2 } from '@server/modules/finance/finance-aggregate';
import { FundFlowService } from '@server/modules/fund-flow/fund-flow.service';
import type {
  ApproveExpenseRequest,
  CreateExpenseRequest,
  ExpenseItem,
  ExpenseListParams,
  ExpenseListResponse,
  ExpenseSummary,
  UpdateExpenseRequest,
} from '@shared/finance-contract';

type DbWriter = Pick<
  PostgresJsDatabase,
  'select' | 'insert' | 'update' | 'delete'
>;
type DbReader = Pick<PostgresJsDatabase, 'select'>;

const UUID_PATTERN: RegExp =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_PATTERN: RegExp = /^\d{4}-\d{2}-\d{2}$/;
const ACCOUNT_SET: Set<string> = new Set([
  '现金',
  '银行账户',
  '微信',
  '支付宝',
]);
const CATEGORY_SET: Set<string> = new Set([
  '房租',
  '水电',
  '工资',
  '办公费',
  '差旅费',
  '营销费',
  '其他',
]);

interface ExpenseRow {
  id: string;
  expenseNo: string;
  category: string;
  amount: string;
  expenseDate: string;
  payer: string | null;
  account: string;
  approvalStatus: string;
  approver: string | null;
  approvalTime: Date | null;
  approvalRemark: string | null;
  remark: string | null;
  attachment: string | null;
  createdAt: Date;
  updatedAt: Date | null;
}

@Injectable()
export class ExpenseService {
  private readonly logger = new Logger(ExpenseService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: DbWriter,
    private readonly fundFlowService: FundFlowService,
  ) {}

  async list(params: ExpenseListParams): Promise<ExpenseListResponse> {
    const page: number = Math.max(1, Number(params.page ?? 1) || 1);
    const pageSize: number = Math.min(
      50,
      Math.max(1, Number(params.pageSize ?? 20) || 20),
    );
    const conditions = [];
    const category: string = (params.category ?? '').trim();
    if (category) conditions.push(eq(expense.category, category));
    const approvalStatus: string = (params.approvalStatus ?? '').trim();
    if (approvalStatus) {
      conditions.push(eq(expense.approvalStatus, approvalStatus));
    }
    const dateStart: string = (params.dateStart ?? '').trim();
    if (dateStart) conditions.push(gte(expense.expenseDate, dateStart));
    const dateEnd: string = (params.dateEnd ?? '').trim();
    if (dateEnd) conditions.push(lte(expense.expenseDate, dateEnd));
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const countRows: Array<{ value: number }> = await this.db
      .select({ value: count() })
      .from(expense)
      .where(whereClause);
    const total: number = countRows[0]?.value ?? 0;

    const sumExpr = sql<string>`coalesce(sum(${expense.amount}), 0)`;
    const approvedConds = whereClause
      ? [whereClause, eq(expense.approvalStatus, '已审批')]
      : [eq(expense.approvalStatus, '已审批')];
    const pendingConds = whereClause
      ? [whereClause, eq(expense.approvalStatus, '待审批')]
      : [eq(expense.approvalStatus, '待审批')];
    const [totalRows, approvedRows, pendingRows]: Array<
      Array<{ value: string | number | null }>
    > = await Promise.all([
      this.db.select({ value: sumExpr }).from(expense).where(whereClause),
      this.db.select({ value: sumExpr }).from(expense).where(and(...approvedConds)),
      this.db
        .select({ value: count() })
        .from(expense)
        .where(and(...pendingConds)),
    ]);
    const summary: ExpenseSummary = {
      totalAmount: round2(Number(totalRows[0]?.value ?? 0)),
      approvedAmount: round2(Number(approvedRows[0]?.value ?? 0)),
      pendingCount: Number(pendingRows[0]?.value ?? 0),
    };

    const rows: ExpenseRow[] = await this.db
      .select()
      .from(expense)
      .where(whereClause)
      .orderBy(desc(expense.expenseDate), desc(expense.createdAt))
      .offset((page - 1) * pageSize)
      .limit(pageSize);

    const items: ExpenseItem[] = await this.enrich(rows);
    return { items, total, page, pageSize, summary };
  }

  async detail(id: string): Promise<ExpenseItem> {
    if (!UUID_PATTERN.test(id)) throw new NotFoundException('费用单不存在');
    const rows: ExpenseRow[] = await this.db
      .select()
      .from(expense)
      .where(eq(expense.id, id));
    const row: ExpenseRow | undefined = rows[0];
    if (!row) throw new NotFoundException('费用单不存在');
    const items: ExpenseItem[] = await this.enrich([row]);
    return items[0] as ExpenseItem;
  }

  async create(
    dto: CreateExpenseRequest,
    operatorId?: string,
  ): Promise<ExpenseItem> {
    this.validateForm(dto);
    const expenseNo: string = await generateExpenseNo(
      this.db as unknown as DbReader,
    );
    const rows: ExpenseRow[] = await this.db
      .insert(expense)
      .values({
        expenseNo,
        category: dto.category,
        amount: round2(Number(dto.amount)).toFixed(2),
        expenseDate: dto.expenseDate,
        payer: dto.payerId?.trim() || null,
        account: dto.account,
        approvalStatus: '待审批',
        remark: (dto.remark ?? '').trim() || null,
        attachment: (dto.attachmentUrl ?? '').trim() || null,
        createdBy: operatorId || undefined,
      })
      .returning();
    this.logger.log(`expense ${expenseNo} created`);
    const items: ExpenseItem[] = await this.enrich(rows);
    return items[0] as ExpenseItem;
  }

  async update(
    id: string,
    dto: UpdateExpenseRequest,
    operatorId?: string,
  ): Promise<ExpenseItem> {
    if (!UUID_PATTERN.test(id)) throw new NotFoundException('费用单不存在');
    const rows: ExpenseRow[] = await this.db
      .select()
      .from(expense)
      .where(eq(expense.id, id));
    const row: ExpenseRow | undefined = rows[0];
    if (!row) throw new NotFoundException('费用单不存在');
    if (row.approvalStatus !== '待审批') {
      throw new BadRequestException('仅待审批的费用单可编辑');
    }
    const patch: Partial<typeof expense.$inferInsert> = {};
    if (dto.category !== undefined) {
      if (!CATEGORY_SET.has(dto.category)) {
        throw new BadRequestException('无效的费用分类');
      }
      patch.category = dto.category;
    }
    if (dto.amount !== undefined) {
      const amount: number = Number(dto.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new BadRequestException('金额必须大于 0');
      }
      patch.amount = round2(amount).toFixed(2);
    }
    if (dto.expenseDate !== undefined) {
      if (!DATE_PATTERN.test(dto.expenseDate)) {
        throw new BadRequestException('请选择有效的发生日期');
      }
      patch.expenseDate = dto.expenseDate;
    }
    if (dto.payerId !== undefined) {
      const payerId: string = dto.payerId.trim();
      if (payerId && !UUID_PATTERN.test(payerId)) {
        throw new BadRequestException('报销人无效');
      }
      patch.payer = payerId || null;
    }
    if (dto.account !== undefined) {
      if (!ACCOUNT_SET.has(dto.account)) {
        throw new BadRequestException('无效的支付账户');
      }
      patch.account = dto.account;
    }
    if (dto.remark !== undefined) patch.remark = dto.remark.trim() || null;
    if (dto.attachmentUrl !== undefined) {
      patch.attachment = dto.attachmentUrl.trim() || null;
    }
    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('未提供可更新字段');
    }
    patch.updatedBy = operatorId || undefined;
    const updated: Array<ExpenseRow> = await this.db
      .update(expense)
      .set(patch)
      .where(eq(expense.id, id))
      .returning();
    const items: ExpenseItem[] = await this.enrich(updated);
    return items[0] as ExpenseItem;
  }

  /** 审批通过/驳回；通过后自动生成支出资金流水 */
  async approve(
    id: string,
    dto: ApproveExpenseRequest,
    approverId: string,
  ): Promise<ExpenseItem> {
    if (!UUID_PATTERN.test(id)) throw new NotFoundException('费用单不存在');
    const rows: ExpenseRow[] = await this.db
      .select()
      .from(expense)
      .where(eq(expense.id, id));
    const row: ExpenseRow | undefined = rows[0];
    if (!row) throw new NotFoundException('费用单不存在');
    if (row.approvalStatus !== '待审批') {
      throw new BadRequestException('该费用单已审批，不可重复操作');
    }
    const updated: Array<ExpenseRow> = await this.db
      .update(expense)
      .set({
        approvalStatus: dto.approve ? '已审批' : '已驳回',
        approver: approverId || undefined,
        approvalTime: new Date(),
        approvalRemark: (dto.remark ?? '').trim() || null,
        updatedBy: approverId || undefined,
      })
      .where(eq(expense.id, id))
      .returning();
    const items: ExpenseItem[] = await this.enrich(updated);
    const item: ExpenseItem = items[0] as ExpenseItem;
    if (dto.approve) {
      await this.fundFlowService
        .recordFromExpense({
          expenseId: item.id,
          expenseNo: item.expenseNo,
          amount: item.amount,
          expenseDate: item.expenseDate,
          account: item.account,
          payerName: item.payerName,
          remark: item.remark,
        })
        .catch((error: unknown): void => {
          this.logger.warn(
            `fund flow for expense ${item.expenseNo} failed: ${error instanceof Error ? error.message : 'unknown'}`,
          );
        });
    }
    this.logger.log(
      `expense ${row.expenseNo} ${dto.approve ? 'approved' : 'rejected'}`,
    );
    return item;
  }

  async remove(id: string): Promise<{ success: boolean }> {
    if (!UUID_PATTERN.test(id)) throw new NotFoundException('费用单不存在');
    const rows: ExpenseRow[] = await this.db
      .select()
      .from(expense)
      .where(eq(expense.id, id));
    const row: ExpenseRow | undefined = rows[0];
    if (!row) throw new NotFoundException('费用单不存在');
    if (row.approvalStatus === '已审批') {
      throw new BadRequestException('已审批的费用单已生成资金流水，不可删除');
    }
    const deleted: Array<{ id: string }> = await this.db
      .delete(expense)
      .where(eq(expense.id, id))
      .returning({ id: expense.id });
    if (deleted.length === 0) throw new NotFoundException('费用单不存在');
    return { success: true };
  }

  private validateForm(dto: CreateExpenseRequest): void {
    if (!CATEGORY_SET.has(dto.category)) {
      throw new BadRequestException('无效的费用分类');
    }
    const amount: number = Number(dto.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('金额必须大于 0');
    }
    if (!DATE_PATTERN.test(dto.expenseDate ?? '')) {
      throw new BadRequestException('请选择有效的发生日期');
    }
    if (!ACCOUNT_SET.has(dto.account)) {
      throw new BadRequestException('无效的支付账户');
    }
    if (dto.payerId && !UUID_PATTERN.test(dto.payerId.trim())) {
      throw new BadRequestException('报销人无效');
    }
  }

  private async enrich(rows: ExpenseRow[]): Promise<ExpenseItem[]> {
    if (rows.length === 0) return [];
    const userIds: string[] = Array.from(
      new Set(
        rows
          .flatMap((row): Array<string | null> => [row.payer, row.approver])
          .filter(
            (v: string | null): v is string =>
              Boolean(v) && UUID_PATTERN.test(v as string),
          ),
      ),
    );
    const nameMap = new Map<string, string>();
    if (userIds.length > 0) {
      const userRows: Array<{ id: string; name: string }> = await this.db
        .select({ id: appUser.id, name: appUser.name })
        .from(appUser)
        .where(inArray(appUser.id, userIds));
      for (const row of userRows) nameMap.set(row.id, row.name);
    }
    return rows.map(
      (row): ExpenseItem => ({
        id: row.id,
        expenseNo: row.expenseNo,
        category: row.category as ExpenseItem['category'],
        amount: round2(Number(row.amount)),
        expenseDate: row.expenseDate,
        payerId: row.payer,
        payerName: row.payer ? nameMap.get(row.payer) ?? '' : '',
        account: row.account as ExpenseItem['account'],
        approvalStatus: row.approvalStatus as ExpenseItem['approvalStatus'],
        approverName: row.approver ? nameMap.get(row.approver) ?? null : null,
        approvalTime: row.approvalTime ? row.approvalTime.toISOString() : null,
        approvalRemark: row.approvalRemark,
        remark: row.remark,
        attachmentUrl: row.attachment,
        createdAt: row.createdAt.toISOString(),
      }),
    );
  }
}
