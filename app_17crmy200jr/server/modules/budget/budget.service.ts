import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from "@lark-apaas/fullstack-nestjs-core";
import {
  and,
  count,
  desc,
  eq,
  ilike,
  sql,
} from "drizzle-orm";
import {
  budgets,
  budgetAdjustments,
} from "@server/database/schema";
import { FeishuBitableService } from "../feishu-bitable/feishu-bitable.service";
import type {
  Budget,
  BudgetAdjustment,
  BudgetBatchCreateRequest,
  BudgetExecutionResponse,
  BudgetListResponse,
  OverrunCheckResponse,
} from "@shared/api.interface";

interface ListQueryParams {
  year: number;
  month?: string;
  department?: string;
  page: number;
  pageSize: number;
}

@Injectable()
export class BudgetService {
  private readonly logger = new Logger(BudgetService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    private readonly bitable: FeishuBitableService,
  ) {}

  private toNum(value: string | number | null | undefined): number {
    if (value == null) return 0;
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  private calcRate(used: number, budget: number): number {
    const safeUsed = Number.isFinite(used) ? used : 0;
    const safeBudget = Number.isFinite(budget) ? budget : 0;
    if (safeBudget <= 0) return 0;
    const rate = (safeUsed / safeBudget) * 100;
    if (!Number.isFinite(rate)) return 0;
    return +rate.toFixed(2);
  }

  private getStatus(rate: number): "normal" | "warning" | "overrun" {
    if (rate > 100) return "overrun";
    if (rate >= 80) return "warning";
    return "normal";
  }

  /**
   * 从 Bitable expenses 按部门+月份统计已通过(approved)的金额（单月）
   */
  private async getUsedAmountByDept(
    year: number,
    month: string,
  ): Promise<Map<string, number>> {
    const allRecords = await this.bitable.getAllRecords("expenses");
    const map = new Map<string, number>();
    for (const rec of allRecords) {
      const recYear = Number(rec.year ?? 0);
      const recMonth = String(rec.month ?? "");
      const dept = (rec.department as string) ?? "";
      const amount = Number(rec.amount ?? 0);
      if (recYear === year && recMonth === month && dept) {
        map.set(dept, (map.get(dept) ?? 0) + amount);
      }
    }
    return map;
  }

  /**
   * 从 Bitable expenses 按月份+部门批量统计金额（多月）
   * 返回 Map<`${monthStr}_${department}`, amount>
   */
  private async getUsedAmountByDeptMonth(
    year: number,
    months: string[],
  ): Promise<Map<string, number>> {
    const monthSet = new Set(months);
    const allRecords = await this.bitable.getAllRecords("expenses");
    const map = new Map<string, number>();
    for (const rec of allRecords) {
      const recYear = Number(rec.year ?? 0);
      const recMonth = String(rec.month ?? "");
      const dept = (rec.department as string) ?? "";
      const amount = Number(rec.amount ?? 0);
      if (recYear === year && monthSet.has(recMonth) && dept) {
        const key = `${recMonth}_${dept}`;
        map.set(key, (map.get(key) ?? 0) + amount);
      }
    }
    return map;
  }

  async findAll(params: ListQueryParams): Promise<BudgetListResponse> {
    const page = Math.max(1, params.page);
    const pageSize = Math.min(100, Math.max(1, params.pageSize));
    const offset = (page - 1) * pageSize;

    const targetYear = Number.isFinite(params.year) ? params.year : new Date().getFullYear();
    const conditions = [eq(budgets.budgetYear, targetYear)];
    if (params.month) {
      conditions.push(eq(budgets.budgetMonth, params.month));
    }
    if (params.department) {
      const escaped = params.department.replace(/[%_\\]/g, '\\$&');
      conditions.push(ilike(budgets.department, `%${escaped}%`));
    }
    const whereClause = and(...conditions);

    const rows = await this.db
      .select({
        id: budgets.id,
        budgetYear: budgets.budgetYear,
        budgetMonth: budgets.budgetMonth,
        department: budgets.department,
        budgetAmount: budgets.budgetAmount,
        isOverridden: budgets.isOverridden,
        remark: budgets.remark,
        createdAt: budgets.createdAt,
        updatedAt: budgets.updatedAt,
      })
      .from(budgets)
      .where(whereClause)
      .orderBy(desc(budgets.budgetMonth), desc(budgets.createdAt))
      .limit(pageSize)
      .offset(offset);

    const countResult = await this.db
      .select({ total: count() })
      .from(budgets)
      .where(whereClause);

    const total = Number(countResult[0]?.total ?? 0);

    // 按月+部门批量统计已用金额（一次查询，避免 N+1）
    const monthSet = new Set<string>();
    for (const row of rows) {
      if (row.budgetMonth) monthSet.add(row.budgetMonth);
    }

    const usedByDeptMonth = monthSet.size > 0
      ? await this.getUsedAmountByDeptMonth(
        targetYear,
        Array.from(monthSet),
      )
      : new Map<string, number>();

    const items: Budget[] = rows.map((row) => {
      const usedAmount = usedByDeptMonth.get(
        `${row.budgetMonth}_${row.department}`,
      ) ?? 0;
      const budgetAmount = this.toNum(row.budgetAmount);
      return {
        id: row.id,
        budgetYear: row.budgetYear,
        budgetMonth: row.budgetMonth,
        department: row.department ?? "",
        budgetAmount,
        usedAmount,
        isOverridden: !!row.isOverridden,
        remark: row.remark ?? undefined,
        createdAt: (row.createdAt as Date).toISOString(),
        updatedAt: (row.updatedAt as Date).toISOString(),
      };
    });

    return { items, total, page, pageSize };
  }

  async findOne(id: string): Promise<Budget> {
    const rows = await this.db
      .select({
        id: budgets.id,
        budgetYear: budgets.budgetYear,
        budgetMonth: budgets.budgetMonth,
        department: budgets.department,
        budgetAmount: budgets.budgetAmount,
        isOverridden: budgets.isOverridden,
        remark: budgets.remark,
        createdAt: budgets.createdAt,
        updatedAt: budgets.updatedAt,
      })
      .from(budgets)
      .where(eq(budgets.id, id))
      .limit(1);

    if (rows.length === 0) {
      throw new NotFoundException("预算记录不存在");
    }

    const row = rows[0];
    const usedMap = await this.getUsedAmountByDept(
      row.budgetYear,
      row.budgetMonth,
    );
    const usedAmount = usedMap.get(row.department ?? "") ?? 0;
    const budgetAmount = this.toNum(row.budgetAmount);

    return {
      id: row.id,
      budgetYear: row.budgetYear,
      budgetMonth: row.budgetMonth,
      department: row.department ?? "",
      budgetAmount,
      usedAmount,
      isOverridden: !!row.isOverridden,
      remark: row.remark ?? undefined,
      createdAt: (row.createdAt as Date).toISOString(),
      updatedAt: (row.updatedAt as Date).toISOString(),
    };
  }

  async create(dto: {
    year: number;
    month: string;
    department: string;
    budgetAmount: number;
    remark?: string;
  }): Promise<{ id: string }> {
    // 检查是否已存在
    const existing = await this.db
      .select({ id: budgets.id })
      .from(budgets)
      .where(
        and(
          eq(budgets.budgetYear, dto.year),
          eq(budgets.budgetMonth, dto.month),
          eq(budgets.department, dto.department),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      throw new ConflictException("该部门该月预算已存在");
    }

    const result = await this.db
      .insert(budgets)
      .values({
        budgetYear: dto.year,
        budgetMonth: dto.month,
        department: dto.department,
        budgetAmount: String(dto.budgetAmount),
        usedAmount: "0",
        remark: dto.remark,
      })
      .returning({ id: budgets.id });

    return { id: result[0].id };
  }

  async update(
    id: string,
    dto: { budgetAmount?: number; remark?: string; adjustReason?: string },
  ): Promise<Budget> {
    const patch: Partial<typeof budgets.$inferInsert> = {};

    if (dto.budgetAmount !== undefined) {
      patch.budgetAmount = String(dto.budgetAmount);
    }
    if (dto.remark !== undefined) {
      patch.remark = dto.remark;
    }

    if (Object.keys(patch).length === 0) {
      throw new BadRequestException("未提供可更新字段");
    }

    const result = await this.db.transaction(async (tx) => {
      // 1. 查询旧值
      const oldRows = await tx
        .select({
          id: budgets.id,
          budgetAmount: budgets.budgetAmount,
          budgetYear: budgets.budgetYear,
          budgetMonth: budgets.budgetMonth,
          department: budgets.department,
        })
        .from(budgets)
        .where(eq(budgets.id, id))
        .limit(1);

      if (oldRows.length === 0) {
        throw new NotFoundException("预算记录不存在");
      }

      const oldRow = oldRows[0];
      const oldAmount = this.toNum(oldRow.budgetAmount);

      // 2. 更新预算
      const updated = await tx
        .update(budgets)
        .set(patch)
        .where(eq(budgets.id, id))
        .returning();

      if (updated.length === 0) {
        throw new NotFoundException("预算记录不存在");
      }

      // 3. 金额变更时写入调整历史
      if (
        dto.budgetAmount !== undefined &&
        dto.budgetAmount !== oldAmount
      ) {
        await tx.insert(budgetAdjustments).values({
          budgetId: id,
          oldAmount: String(oldAmount),
          newAmount: String(dto.budgetAmount),
          adjustReason: dto.adjustReason ?? null,
        });
      }

      return updated[0];
    });

    return this.findOne(result.id);
  }

  async remove(id: string): Promise<{ success: boolean }> {
    const deleted = await this.db
      .delete(budgets)
      .where(eq(budgets.id, id))
      .returning({ id: budgets.id });

    if (deleted.length === 0) {
      throw new NotFoundException("预算记录不存在");
    }

    return { success: true };
  }

  async batchCreate(
    dto: BudgetBatchCreateRequest,
  ): Promise<{ successCount: number }> {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException("批量数据不能为空");
    }

    const values = dto.items.map((item) => ({
      budgetYear: dto.year,
      budgetMonth: dto.month,
      department: item.department,
      budgetAmount: String(item.budgetAmount),
      usedAmount: "0",
    }));

    // ON CONFLICT (budget_year, budget_month, department) DO UPDATE
    const result = await this.db
      .insert(budgets)
      .values(values)
      .onConflictDoUpdate({
        target: [budgets.budgetYear, budgets.budgetMonth, budgets.department],
        set: {
          budgetAmount: sql.raw(`EXCLUDED.${"budget_amount"}`),
        },
      })
      .returning({ id: budgets.id });

    return { successCount: result.length };
  }

  async getAdjustments(budgetId: string): Promise<BudgetAdjustment[]> {
    const rows = await this.db
      .select({
        id: budgetAdjustments.id,
        budgetId: budgetAdjustments.budgetId,
        oldAmount: budgetAdjustments.oldAmount,
        newAmount: budgetAdjustments.newAmount,
        adjustReason: budgetAdjustments.adjustReason,
        createdAt: budgetAdjustments.createdAt,
      })
      .from(budgetAdjustments)
      .where(eq(budgetAdjustments.budgetId, budgetId))
      .orderBy(desc(budgetAdjustments.createdAt));

    return rows.map((row) => ({
      id: row.id,
      budgetId: row.budgetId,
      oldAmount: this.toNum(row.oldAmount),
      newAmount: this.toNum(row.newAmount),
      adjustReason: row.adjustReason ?? undefined,
      createdAt: (row.createdAt as Date).toISOString(),
    }));
  }

  async getExecutionSummary(
    year: number,
    month: string,
  ): Promise<BudgetExecutionResponse> {
    const usedMap = await this.getUsedAmountByDept(year, month);

    const rows = await this.db
      .select({
        department: budgets.department,
        budgetAmount: budgets.budgetAmount,
      })
      .from(budgets)
      .where(
        and(
          eq(budgets.budgetYear, year),
          eq(budgets.budgetMonth, month),
        ),
      )
      .orderBy(budgets.department);

    let totalBudget = 0;
    let totalUsed = 0;

    const items = rows.map((row) => {
      const budgetAmount = this.toNum(row.budgetAmount);
      const usedAmount = usedMap.get(row.department ?? "") ?? 0;
      const remainingAmount = Math.max(0, budgetAmount - usedAmount);
      const executionRate = this.calcRate(usedAmount, budgetAmount);
      const status = this.getStatus(executionRate);

      totalBudget += budgetAmount;
      totalUsed += usedAmount;

      return {
        department: row.department ?? "",
        budgetAmount,
        usedAmount,
        remainingAmount,
        executionRate,
        status,
      } as const;
    });

    const overallExecutionRate = this.calcRate(totalUsed, totalBudget);

    return {
      items,
      totalBudget,
      totalUsed,
      overallExecutionRate,
    };
  }

  /**
   * 调整指定部门+月份预算的 usedAmount
   * - amount > 0: 增加已用金额
   * - amount < 0: 减少已用金额
   * - 若预算记录不存在，自动创建（budgetAmount=0）
   * - 确保 usedAmount 不会变为负数
   */
  async adjustUsedAmount(params: {
    departmentId: string;
    year: number;
    month: number;
    amount: number;
    categoryL1?: string;
  }): Promise<void> {
    const { departmentId, year, amount } = params;
    const monthStr = String(params.month).padStart(2, "0");

    if (!departmentId || departmentId.trim() === "") {
      throw new BadRequestException("departmentId 不能为空");
    }
    if (!Number.isFinite(year) || year <= 0) {
      throw new BadRequestException("year 必须是有效的正整数");
    }
    if (!Number.isFinite(params.month) || params.month < 1 || params.month > 12) {
      throw new BadRequestException("month 必须是 1-12 的整数");
    }
    if (!Number.isFinite(amount)) {
      throw new BadRequestException("amount 必须是有效数字");
    }
    if (amount === 0) return; // 无变化直接返回

    // 使用整数分运算避免浮点精度问题
    const amountCents = Math.round(amount * 100);

    await this.db.transaction(async (tx) => {
      // 1. 查询现有预算记录
      const existing = await tx
        .select({
          id: budgets.id,
          usedAmount: budgets.usedAmount,
          budgetAmount: budgets.budgetAmount,
        })
        .from(budgets)
        .where(
          and(
            eq(budgets.budgetYear, year),
            eq(budgets.budgetMonth, monthStr),
            eq(budgets.department, departmentId),
          ),
        )
        .limit(1);

      if (existing.length === 0) {
        // 记录不存在，创建新记录
        if (amount < 0) {
          // 减少操作但记录不存在，usedAmount 不能为负，直接忽略
          this.logger.warn(
            `adjustUsedAmount: 预算记录不存在，无法减少已用金额，跳过。` +
              `year=${year}, month=${monthStr}, department=${departmentId}, amount=${amount}`,
          );
          return;
        }
        const initialUsed = (amountCents / 100).toFixed(2);
        await tx.insert(budgets).values({
          budgetYear: year,
          budgetMonth: monthStr,
          department: departmentId,
          budgetAmount: "0",
          usedAmount: initialUsed,
          remark: params.categoryL1
            ? `由支出联动自动创建（${params.categoryL1}）`
            : "由支出联动自动创建",
        });
        this.logger.log(
          `adjustUsedAmount: 自动创建预算记录并增加已用金额 ` +
            `year=${year}, month=${monthStr}, department=${departmentId}, usedAmount=${initialUsed}`,
        );
        return;
      }

      // 2. 记录存在，计算新的 usedAmount
      const row = existing[0];
      const currentUsed = this.toNum(row.usedAmount);
      const currentUsedCents = Math.round(currentUsed * 100);
      const newUsedCents = currentUsedCents + amountCents;

      if (newUsedCents < 0) {
        // usedAmount 不能为负，按 0 处理并记录告警
        this.logger.warn(
          `adjustUsedAmount: usedAmount 将变为负数，已钳位到 0。` +
            `year=${year}, month=${monthStr}, department=${departmentId}, ` +
            `currentUsed=${currentUsed}, adjustAmount=${amount}`,
        );
        await tx
          .update(budgets)
          .set({ usedAmount: "0" })
          .where(eq(budgets.id, row.id));
        return;
      }

      const newUsedStr = (newUsedCents / 100).toFixed(2);
      await tx
        .update(budgets)
        .set({ usedAmount: newUsedStr })
        .where(eq(budgets.id, row.id));

      this.logger.log(
        `adjustUsedAmount: 已更新预算已用金额 ` +
          `year=${year}, month=${monthStr}, department=${departmentId}, ` +
          `old=${currentUsed.toFixed(2)}, delta=${amount >= 0 ? "+" : ""}${amount.toFixed(2)}, new=${newUsedStr}`,
      );
    });
  }

  async checkOverrun(params: {
    department: string;
    month: string;
    year: number;
    amount: number;
  }): Promise<OverrunCheckResponse> {
    if (!params.department || typeof params.department !== "string" || params.department.trim() === "") {
      throw new BadRequestException("department 不能为空");
    }
    if (!params.month || typeof params.month !== "string" || params.month.trim() === "") {
      throw new BadRequestException("month 不能为空");
    }
    if (!Number.isFinite(params.year) || params.year <= 0) {
      throw new BadRequestException("year 必须是有效的正整数");
    }
    if (!Number.isFinite(params.amount) || params.amount <= 0) {
      throw new BadRequestException("amount 必须是大于 0 的数字");
    }

    const rows = await this.db
      .select({
        budgetAmount: budgets.budgetAmount,
      })
      .from(budgets)
      .where(
        and(
          eq(budgets.budgetYear, params.year),
          eq(budgets.budgetMonth, params.month),
          eq(budgets.department, params.department),
        ),
      )
      .limit(1);

    const budgetAmount = rows.length > 0
      ? this.toNum(rows[0].budgetAmount)
      : 0;

    const usedMap = await this.getUsedAmountByDept(params.year, params.month);
    const usedAmount = usedMap.get(params.department) ?? 0;

    const remainingAmount = Math.max(0, budgetAmount - usedAmount);
    const executionRate = this.calcRate(usedAmount, budgetAmount);
    const isOverrun = usedAmount + params.amount > budgetAmount
      && budgetAmount > 0;

    return {
      isOverrun,
      budgetAmount,
      usedAmount,
      remainingAmount,
      executionRate,
    };
  }
}