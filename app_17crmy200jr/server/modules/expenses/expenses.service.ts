import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from "@lark-apaas/fullstack-nestjs-core";
import { eq, inArray } from "drizzle-orm";
import { expenses } from "@server/database/schema";
import { FeishuBitableService } from "../feishu-bitable/feishu-bitable.service";
import type { BitableFilter } from "../feishu-bitable/feishu-bitable.service";
import { FixedAssetsService } from "../fixed-assets/fixed-assets.service";
import { BudgetService } from "../budget/budget.service";
import { CacheService } from "@server/common/cache/cache.service";
import { RolesService } from "../roles/roles.service";
import { isFixedAsset, inferAssetType } from "@shared/asset-utils";
import type {
  BatchOperationResult,
  CreateExpenseDto,
  DataScope,
  ExpenseDetail,
  ExpenseItem,
  ExpenseListResponse,
} from "@shared/api.interface";

interface ListQueryParams {
   page: number;
   pageSize: number;
   startDate?: string;
   endDate?: string;
   categoryL1?: string;
   categoryL2?: string;
   payerEntity?: string;
   floor?: string;
   department?: string;
   handler?: string;
   keyword?: string;
   sortBy?: string;
   sortOrder?: "asc" | "desc";
   viewScope?: string;
   currentUserId?: string;
 }

@Injectable()
export class ExpensesService {
  private readonly logger = new Logger(ExpensesService.name);
  private readonly domain = "expenses";

  constructor(
    private readonly bitable: FeishuBitableService,
    private readonly fixedAssetsService: FixedAssetsService,
    private readonly budgetService: BudgetService,
    private readonly cache: CacheService,
    private readonly rolesService: RolesService,
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  private async invalidateExpenseCaches(): Promise<void> {
    await this.cache.deleteByPrefix("dash:expense");
    await this.cache.deleteByPrefix("report:expense");
  }

  private toExpenseItem(
    rec: Record<string, unknown>,
  ): ExpenseItem {
    const expenseDate = rec.expense_date as string | undefined;
    const amount = rec.amount as number | undefined;
    return {
      id: (rec.recordId as string) ?? (rec.id as string) ?? "",
      expenseDate: expenseDate ? expenseDate.slice(0, 10) : "",
      amount: Number(amount ?? 0),
      description: this.stripCategoryFromDescription(
        (rec.description as string) ?? "",
      ),
      categoryL1:
        (rec.category_l1 as string) ??
        this.parseCategoryFromDescription(
          (rec.description as string) ?? "",
        ).categoryL1,
      categoryL2:
        (rec.category_l2 as string) ??
        this.parseCategoryFromDescription(
          (rec.description as string) ?? "",
        ).categoryL2,
      payerEntity: (rec.payer_entity as string) ?? "",
      floor: (rec.floor as string) ?? "",
      department: (rec.department as string) ?? "",
      handler: (rec.handler as string) ?? "",
      invoiceUrl: (rec.invoice_url as string) ?? "",
      screenshotUrl: (rec.screenshot_url as string) ?? "",
    };
  }

  private computeDateParts(expenseDate: string): {
    year: number;
    month: number;
    quarter: number;
  } {
    const d = new Date(expenseDate);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const quarter = Math.ceil(month / 3);
    return { year, month, quarter };
  }

  private readonly CATEGORY_MARK = "【类目数据】";

  private encodeCategoryToDescription(
    description: string,
    categoryL1: string,
    categoryL2: string,
  ): string {
    const cleanDesc = this.stripCategoryFromDescription(description);
    if (!categoryL1 && !categoryL2) return cleanDesc;
    const payload = JSON.stringify({
      categoryL1: categoryL1 || "",
      categoryL2: categoryL2 || "",
    });
    return cleanDesc
      ? `${cleanDesc}\n${this.CATEGORY_MARK}${payload}`
      : `${this.CATEGORY_MARK}${payload}`;
  }

  private stripCategoryFromDescription(description: string): string {
    if (!description) return "";
    const idx = description.lastIndexOf(this.CATEGORY_MARK);
    if (idx === -1) return description;
    return description.slice(0, idx).replace(/\n+$/, "");
  }

  private parseCategoryFromDescription(
    description: string,
  ): { categoryL1: string; categoryL2: string; cleanDescription: string } {
    if (!description) {
      return { categoryL1: "", categoryL2: "", cleanDescription: "" };
    }
    const idx = description.lastIndexOf(this.CATEGORY_MARK);
    if (idx === -1) {
      return {
        categoryL1: "",
        categoryL2: "",
        cleanDescription: description,
      };
    }
    const payloadStr = description.slice(idx + this.CATEGORY_MARK.length);
    const cleanDesc = description.slice(0, idx).replace(/\n+$/, "");
    try {
      const data = JSON.parse(payloadStr) as {
        categoryL1?: string;
        categoryL2?: string;
      };
      return {
        categoryL1: data.categoryL1 || "",
        categoryL2: data.categoryL2 || "",
        cleanDescription: cleanDesc,
      };
    } catch {
      return { categoryL1: "", categoryL2: "", cleanDescription: cleanDesc };
    }
  }

  private buildFeishuFilter(params: ListQueryParams): BitableFilter | undefined {
    const conditions: BitableFilter["conditions"] = [];

    if (params.startDate) {
      conditions.push({
        fieldName: "支出日期",
        operator: "isGreaterEqual",
        value: [params.startDate],
      });
    }
    if (params.endDate) {
      conditions.push({
        fieldName: "支出日期",
        operator: "isLess",
        value: [params.endDate],
      });
    }
    if (params.categoryL1) {
      conditions.push({
        fieldName: "一级类目",
        operator: "is",
        value: [params.categoryL1],
      });
    }
    if (params.categoryL2) {
      conditions.push({
        fieldName: "二级类目",
        operator: "is",
        value: [params.categoryL2],
      });
    }
    if (params.payerEntity) {
      conditions.push({
        fieldName: "付费主体",
        operator: "is",
        value: [params.payerEntity],
      });
    }
    if (params.floor) {
      conditions.push({
        fieldName: "使用楼层",
        operator: "is",
        value: [params.floor],
      });
    }
    if (params.department) {
      conditions.push({
        fieldName: "部门",
        operator: "is",
        value: [params.department],
      });
    }
    if (params.handler) {
      conditions.push({
        fieldName: "经办人",
        operator: "contains",
        value: [params.handler],
      });
    }
     if (params.keyword) {
       conditions.push({
         fieldName: "支出说明",
         operator: "contains",
         value: [params.keyword],
       });
     }
     if (params.viewScope === "mine" && params.currentUserId) {
       conditions.push({
         fieldName: "经办人",
         operator: "is",
         value: [params.currentUserId],
       });
     }

    if (conditions.length === 0) return undefined;
    return { conjunction: "and" as const, conditions };
  }

   private buildDataScopeFilter(
    baseFilter: BitableFilter | undefined,
    dataScope: string,
    userId: string,
    userDepartment?: string,
  ): BitableFilter | undefined {
    if (dataScope === "all" || !userId) return baseFilter;

    const conditions: BitableFilter["conditions"] = [
      ...(baseFilter?.conditions ?? []),
    ];

    if (dataScope === "personal") {
      conditions.push({
        fieldName: "经办人",
        operator: "is" as const,
        value: [userId],
      });
    } else if (dataScope === "department" && userDepartment) {
      conditions.push({
        fieldName: "部门",
        operator: "is" as const,
        value: [userDepartment],
      });
    }

    if (conditions.length === 0) return undefined;
    return { conjunction: "and" as const, conditions };
  }

  async findAll(params: ListQueryParams): Promise<ExpenseListResponse> {
     const page = Math.max(1, params.page);
     const pageSize = Math.min(100, Math.max(1, params.pageSize));
     const sortBy = params.sortBy ?? "expenseDate";
     const sortOrder = (params.sortOrder ?? "desc") as "asc" | "desc";

     const userId = params.currentUserId ?? "";
      const dataScope: DataScope = userId
        ? await this.rolesService.getUserDataScope(userId, "expenses")
        : "all";

      let userDepartment: string | undefined;
      if (dataScope === "department" && userId) {
        const userInfo = await this.rolesService.getUserInfo(userId);
        userDepartment = userInfo.department;
      }

    const sortMap: Record<string, string> = {
       expenseDate: "支出日期",
       amount: "支出金额",
       categoryL1: "一级类目",
       categoryL2: "二级类目",
       department: "部门",
     };

      const primaryField = sortMap[sortBy] ?? "支出日期";
      const sort = [
        { fieldName: primaryField, desc: sortOrder === "desc" },
      ];

    const filter = this.buildFeishuFilter(params);

    const result = await this.bitable.listRecords({
      domain: this.domain,
      page,
      pageSize,
      filter,
      sort,
    });

     const rawItems = result.items.map((rec) =>
        this.toExpenseItem(rec),
      );

     // 数据权限内存过滤
     let items: ExpenseItem[];
     if (dataScope === "all" || !userId) {
       items = rawItems;
     } else if (dataScope === "personal") {
       items = rawItems.filter(
         (item: ExpenseItem) => item.handler === userId,
       );
      } else {
        // department 范围：优先按部门过滤，拿不到部门则降级为 personal
        if (userDepartment) {
          items = rawItems.filter(
            (item: ExpenseItem) =>
              item.department === userDepartment ||
              item.handler === userId,
          );
        } else {
         items = rawItems.filter(
           (item: ExpenseItem) => item.handler === userId,
         );
       }
     }

      if (primaryField === "支出日期") {
        items.sort((a, b) => {
          if (a.expenseDate < b.expenseDate) return sortOrder === "desc" ? 1 : -1;
          if (a.expenseDate > b.expenseDate) return sortOrder === "desc" ? -1 : 1;
          // 日期相同时按 id 字符串二次排序
          return sortOrder === "desc"
            ? b.id.localeCompare(a.id)
            : a.id.localeCompare(b.id);
        });
      }

       let totalAmount = 0;
       let filteredTotal: number = result.total;
       // 使用聚合查询计算 totalAmount，避免全量拉取
       if (result.total > 0) {
         const aggFilter = this.buildDataScopeFilter(
           filter,
           dataScope,
           userId,
           userDepartment,
         );
         try {
           const aggResult = await this.bitable.aggregateQuery(this.domain, {
             measures: [
               {
                 fieldName: "支出金额",
                 aggregation: "sum",
                 alias: "totalAmount",
               },
               {
                 fieldName: "支出金额",
                 aggregation: "count",
                 alias: "recordCount",
               },
             ],
             filter: aggFilter,
           });
           if (aggResult.result && aggResult.result.length > 0) {
             totalAmount = this.extractNumberValue(
               aggResult.result[0].totalAmount,
             );
             if (dataScope !== "all" && userId) {
               filteredTotal = Number(
                 aggResult.result[0].recordCount ?? result.total,
               );
             }
           }
         } catch (err) {
           this.logger.warn(
             `aggregateQuery 计算 totalAmount 失败，使用当前页数据: ${(err as Error).message}`,
           );
           totalAmount = items.reduce(
             (sum: number, item: ExpenseItem) => sum + item.amount,
             0,
           );
         }
       }

     return {
       items,
       total: dataScope === "all" || !userId ? result.total : filteredTotal,
       summary: { totalAmount },
     };
  }
  private extractNumberValue(val: unknown): number {
    if (typeof val === "number") return val;
    if (val === null || val === undefined) return 0;
    if (typeof val === "object") {
      const obj = val as Record<string, unknown>;
      if (typeof obj.amount === "number") return obj.amount;
      if (typeof obj.amount === "string") return Number(obj.amount) || 0;
      if (typeof obj.value === "number") return obj.value;
      if (typeof obj.value === "string") return Number(obj.value) || 0;
      if (typeof obj.originValue === "number") return obj.originValue;
    }
    const num = Number(val);
    return Number.isNaN(num) ? 0 : num;
  }

  async findOne(id: string, userId?: string): Promise<ExpenseDetail> {
    const rec = await this.bitable.getRecord<Record<string, unknown>>(
      this.domain,
      id,
    );

    if (!rec) {
      throw new NotFoundException("支出记录不存在");
    }

    // 数据权限查看校验
    if (userId) {
      const dataScope = await this.rolesService.getUserDataScope(
        userId,
        "expenses",
      );
      if (dataScope === "personal") {
        const handler = (rec.handler as string) ?? "";
        if (handler !== userId) {
          throw new ForbiddenException("无权限查看他人的支出记录");
        }
      } else if (dataScope === "department") {
        const userInfo = await this.rolesService.getUserInfo(userId);
        const handler = (rec.handler as string) ?? "";
        const department = (rec.department as string) ?? "";
        if (userInfo.department) {
          if (
            handler !== userId &&
            department !== userInfo.department
          ) {
            throw new ForbiddenException("无权限查看其他部门的支出记录");
          }
        } else if (handler !== userId) {
          throw new ForbiddenException("无权限查看他人的支出记录");
        }
      }
    }

    const expenseDate = rec.expense_date as string | undefined;
    const dateStr = expenseDate ? expenseDate.slice(0, 10) : "";
    const { year, month, quarter } = dateStr
      ? this.computeDateParts(dateStr)
      : { year: 0, month: 0, quarter: 0 };

    const handlerId = (rec.handler as string) ?? "";

    return {
      id,
      expenseDate: dateStr,
      amount: Number(rec.amount ?? 0),
      description: this.stripCategoryFromDescription(
        (rec.description as string) ?? "",
      ),
      categoryL1:
        (rec.category_l1 as string) ||
        this.parseCategoryFromDescription(
          (rec.description as string) ?? "",
        ).categoryL1,
      categoryL2:
        (rec.category_l2 as string) ||
        this.parseCategoryFromDescription(
          (rec.description as string) ?? "",
        ).categoryL2,
      payerEntity: (rec.payer_entity as string) ?? "",
      floor: (rec.floor as string) ?? "",
      department: (rec.department as string) ?? "",
      handler: handlerId,
      purchaseDepartment: (rec.purchase_department as string) ?? "",
      handlerDetail: {
        userId: handlerId,
        name: "",
      },
      invoiceUrl: (rec.invoice_url as string) ?? "",
      screenshotUrl: (rec.screenshot_url as string) ?? "",
      year,
      month,
      quarter,
      createdAt: dateStr,
      updatedAt: dateStr,
    };
  }

  async create(dto: CreateExpenseDto, userId?: string): Promise<{ id: string; assetId?: string; assetError?: string }> {
    const encodedDescription = this.encodeCategoryToDescription(
      dto.description ?? "",
      dto.categoryL1 ?? "",
      dto.categoryL2 ?? "",
    );
    const fields: Record<string, unknown> = {
      expense_date: dto.expenseDate,
      amount: dto.amount,
      description: encodedDescription,
      category_l1: dto.categoryL1 ?? "",
      category_l2: dto.categoryL2 ?? "",
      payer_entity: dto.payerEntity ?? "",
      floor: dto.floor ?? "",
      department: dto.department ?? "",
      purchase_department: dto.purchaseDepartment ?? "",
      handler: dto.handler ?? "",
      invoice_url: dto.invoiceUrl ?? "",
      screenshot_url: dto.screenshotUrl ?? "",
    };

    const result = await this.bitable.createRecord(this.domain, fields);
    this.logger.log(`支出记录已创建: ${result.id}`);
    await this.invalidateExpenseCaches();

    // 联动更新预算 usedAmount
    this.adjustBudgetForCreate(dto, result.id);

    let assetId: string | undefined;
    let assetError: string | undefined;
    const shouldCreateAsset = isFixedAsset(dto.categoryL1, dto.categoryL2);
    if (shouldCreateAsset) {
      try {
        const assetName = dto.asset?.assetName || dto.description || dto.categoryL2 || "";
        const assetType = dto.asset?.assetType || inferAssetType(dto.categoryL2);
        const owner = dto.asset?.owner || userId || dto.handler || "";
        const currentStock = dto.asset?.currentStock ?? 1;

        const assetResult = await this.fixedAssetsService.create({
          assetName,
          assetType,
          assetCategory: dto.categoryL2 ?? "",
          purchaseDate: dto.expenseDate,
          purchaseAmount: dto.amount,
          purchaseDepartment: dto.purchaseDepartment ?? "",
          payerEntity: dto.payerEntity ?? "",
          floor: dto.floor ?? "",
          handler: dto.handler ?? "",
          owner,
          currentStock,
        });
        assetId = assetResult.id;
        this.logger.log(
          `支出联动创建固定资产成功: expense=${result.id}, asset=${assetResult.id}`,
        );
      } catch (err) {
        assetError = (err as Error).message;
        this.logger.warn(
          `支出联动创建固定资产失败，开始回滚支出记录: expense=${result.id}, error=${assetError}`,
        );
        // 补偿回滚：删除已创建的支出记录
        try {
          await this.bitable.deleteRecord(this.domain, result.id);
          this.logger.log(
            `支出记录回滚删除成功: expense=${result.id}`,
          );
        } catch (rollbackErr) {
          const rollbackMsg = (rollbackErr as Error).message;
          this.logger.error(
            `[严重] 支出记录回滚删除失败，数据不一致: expense=${result.id}, rollbackError=${rollbackMsg}, assetError=${assetError}`,
          );
        }
      }
    }

    return { id: result.id, assetId, assetError };
  }

  /**
   * 支出创建后联动更新预算（异步，失败不阻塞主流程）
   */
  private adjustBudgetForCreate(dto: CreateExpenseDto, expenseId: string): void {
    const department = dto.department || dto.purchaseDepartment || "";
    if (!department) {
      this.logger.warn(
        `支出创建后跳过预算更新：部门为空。expenseId=${expenseId}`,
      );
      return;
    }
    const dateStr = dto.expenseDate ? String(dto.expenseDate).slice(0, 10) : "";
    if (!dateStr) {
      this.logger.warn(
        `支出创建后跳过预算更新：支出日期为空。expenseId=${expenseId}`,
      );
      return;
    }
    const { year, month } = this.computeDateParts(dateStr);
    if (!year || !month) {
      this.logger.warn(
        `支出创建后跳过预算更新：日期解析失败。expenseId=${expenseId}, date=${dateStr}`,
      );
      return;
    }

    // 异步调用，失败仅记录日志不阻塞
    this.budgetService
      .adjustUsedAmount({
        departmentId: department,
        year,
        month,
        amount: Number(dto.amount) || 0,
        categoryL1: dto.categoryL1 || undefined,
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(
          `[预算联动失败] 支出创建后更新预算失败，数据可能不一致。` +
            `expenseId=${expenseId}, dept=${department}, ` +
            `year=${year}, month=${month}, amount=${dto.amount}, error=${msg}`,
        );
      });
  }

  async update(
    id: string,
    dto: Partial<CreateExpenseDto>,
    userId?: string,
  ): Promise<{ success: boolean }> {
    const existing = await this.bitable.getRecord(this.domain, id);
    if (!existing) {
      throw new NotFoundException("支出记录不存在");
    }

    // 数据权限写操作校验
    if (userId) {
      const dataScope = await this.rolesService.getUserDataScope(
        userId,
        "expenses",
      );
      if (dataScope === "personal") {
        const handler = (existing.handler as string) ?? "";
        if (handler !== userId) {
          throw new ForbiddenException("无权限修改他人的支出记录");
        }
      }
    }

    const currentDesc = (existing.description as string) ?? "";
    const parsed = this.parseCategoryFromDescription(currentDesc);
    let nextCategoryL1: string =
      (existing.category_l1 as string) || parsed.categoryL1;
    let nextCategoryL2: string =
      (existing.category_l2 as string) || parsed.categoryL2;
    let nextDescription: string = parsed.cleanDescription;

    if (dto.description !== undefined) {
      nextDescription = this.stripCategoryFromDescription(dto.description);
    }
    if (dto.categoryL1 !== undefined) nextCategoryL1 = dto.categoryL1;
    if (dto.categoryL2 !== undefined) nextCategoryL2 = dto.categoryL2;

    const fields: Record<string, unknown> = {};
    if (
      dto.description !== undefined ||
      dto.categoryL1 !== undefined ||
      dto.categoryL2 !== undefined
    ) {
      fields.description = this.encodeCategoryToDescription(
        nextDescription,
        nextCategoryL1,
        nextCategoryL2,
      );
    }
    if (dto.expenseDate !== undefined) fields.expense_date = dto.expenseDate;
    if (dto.amount !== undefined) fields.amount = dto.amount;
    if (dto.categoryL1 !== undefined) fields.category_l1 = dto.categoryL1;
    if (dto.categoryL2 !== undefined) fields.category_l2 = dto.categoryL2;
    if (dto.payerEntity !== undefined) fields.payer_entity = dto.payerEntity;
    if (dto.floor !== undefined) fields.floor = dto.floor;
    if (dto.department !== undefined) fields.department = dto.department;
    if (dto.purchaseDepartment !== undefined)
      fields.purchase_department = dto.purchaseDepartment;
    if (dto.handler !== undefined) fields.handler = dto.handler;
    if (dto.invoiceUrl !== undefined) fields.invoice_url = dto.invoiceUrl;
    if (dto.screenshotUrl !== undefined) fields.screenshot_url = dto.screenshotUrl;

    if (Object.keys(fields).length === 0) {
      throw new BadRequestException("未提供可更新字段");
    }

    // 保存旧值用于预算调整
    const oldAmount = this.extractNumberValue(existing.amount);
    const oldDepartment =
      (existing.department as string) ||
      (existing.purchase_department as string) ||
      "";
    const oldDateRaw = existing.expense_date as string | undefined;
    const oldDateStr = oldDateRaw ? oldDateRaw.slice(0, 10) : "";
    const oldParts = oldDateStr
      ? this.computeDateParts(oldDateStr)
      : { year: 0, month: 0 };
    const oldCategoryL1 = (existing.category_l1 as string) || "";

    await this.bitable.updateRecord(this.domain, id, fields);
    await this.invalidateExpenseCaches();

    // 计算新值用于预算调整
    const newAmount = dto.amount !== undefined ? Number(dto.amount) : oldAmount;
    const newDepartment =
      dto.department !== undefined
        ? dto.department
        : dto.purchaseDepartment !== undefined
          ? dto.purchaseDepartment
          : (existing.department as string) ||
            (existing.purchase_department as string) ||
            "";
    const newDateStr =
      dto.expenseDate !== undefined
        ? String(dto.expenseDate).slice(0, 10)
        : oldDateStr;
    const newParts = newDateStr
      ? this.computeDateParts(newDateStr)
      : { year: 0, month: 0 };
    const newCategoryL1 =
      dto.categoryL1 !== undefined ? dto.categoryL1 : oldCategoryL1;

    // 联动更新预算 usedAmount
    this.adjustBudgetForUpdate(
      id,
      { amount: oldAmount, department: oldDepartment, year: oldParts.year, month: oldParts.month, categoryL1: oldCategoryL1 },
      { amount: newAmount, department: newDepartment, year: newParts.year, month: newParts.month, categoryL1: newCategoryL1 },
    );

    return { success: true };
  }

  /**
   * 支出更新后联动调整预算（异步，失败不阻塞主流程）
   */
  private adjustBudgetForUpdate(
    expenseId: string,
    oldInfo: { amount: number; department: string; year: number; month: number; categoryL1: string },
    newInfo: { amount: number; department: string; year: number; month: number; categoryL1: string },
  ): void {
    const sameDept = oldInfo.department === newInfo.department;
    const sameMonth =
      oldInfo.year === newInfo.year && oldInfo.month === newInfo.month;
    const sameAmount = oldInfo.amount === newInfo.amount;

    // 部门、月份、金额都没变，无需调整
    if (sameDept && sameMonth && sameAmount) return;

    if (sameDept && sameMonth) {
      // 同一部门同一月份，只调整差额
      const delta = newInfo.amount - oldInfo.amount;
      if (delta === 0) return;
      if (!newInfo.department) {
        this.logger.warn(
          `支出更新后跳过预算调整：部门为空。expenseId=${expenseId}`,
        );
        return;
      }
      if (!newInfo.year || !newInfo.month) {
        this.logger.warn(
          `支出更新后跳过预算调整：日期无效。expenseId=${expenseId}`,
        );
        return;
      }
      this.budgetService
        .adjustUsedAmount({
          departmentId: newInfo.department,
          year: newInfo.year,
          month: newInfo.month,
          amount: delta,
          categoryL1: newInfo.categoryL1 || undefined,
        })
        .catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : String(err);
          this.logger.error(
            `[预算联动失败] 支出更新后调整预算差额失败，数据可能不一致。` +
              `expenseId=${expenseId}, dept=${newInfo.department}, ` +
              `year=${newInfo.year}, month=${newInfo.month}, ` +
              `delta=${delta}, error=${msg}`,
          );
        });
      return;
    }

    // 部门或月份变化：旧记录减，新记录加
    // 旧记录扣减（如果旧部门和旧日期有效）
    if (oldInfo.department && oldInfo.year && oldInfo.month) {
      this.budgetService
        .adjustUsedAmount({
          departmentId: oldInfo.department,
          year: oldInfo.year,
          month: oldInfo.month,
          amount: -oldInfo.amount,
          categoryL1: oldInfo.categoryL1 || undefined,
        })
        .catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : String(err);
          this.logger.error(
            `[预算联动失败] 支出更新后扣减旧预算失败，数据可能不一致。` +
              `expenseId=${expenseId}, oldDept=${oldInfo.department}, ` +
              `oldYear=${oldInfo.year}, oldMonth=${oldInfo.month}, ` +
              `oldAmount=${oldInfo.amount}, error=${msg}`,
          );
        });
    } else {
      this.logger.warn(
        `支出更新后跳过旧预算扣减：旧部门或旧日期无效。expenseId=${expenseId}`,
      );
    }

    // 新记录增加（如果新部门和新日期有效）
    if (newInfo.department && newInfo.year && newInfo.month) {
      this.budgetService
        .adjustUsedAmount({
          departmentId: newInfo.department,
          year: newInfo.year,
          month: newInfo.month,
          amount: newInfo.amount,
          categoryL1: newInfo.categoryL1 || undefined,
        })
        .catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : String(err);
          this.logger.error(
            `[预算联动失败] 支出更新后增加新预算失败，数据可能不一致。` +
              `expenseId=${expenseId}, newDept=${newInfo.department}, ` +
              `newYear=${newInfo.year}, newMonth=${newInfo.month}, ` +
              `newAmount=${newInfo.amount}, error=${msg}`,
          );
        });
    } else {
      this.logger.warn(
        `支出更新后跳过新预算增加：新部门或新日期无效。expenseId=${expenseId}`,
      );
    }
  }

  async remove(id: string, userId?: string): Promise<{ success: boolean }> {
    const existing = await this.bitable.getRecord(this.domain, id);
    if (!existing) {
      throw new NotFoundException("支出记录不存在");
    }

    // 数据权限写操作校验
    if (userId) {
      const dataScope = await this.rolesService.getUserDataScope(
        userId,
        "expenses",
      );
      if (dataScope === "personal") {
        const handler = (existing.handler as string) ?? "";
        if (handler !== userId) {
          throw new ForbiddenException("无权限删除他人的支出记录");
        }
      }
    }

    const delAmount = this.extractNumberValue(existing.amount);
    const delDepartment =
      (existing.department as string) ||
      (existing.purchase_department as string) ||
      "";
    const delDateRaw = existing.expense_date as string | undefined;
    const delDateStr = delDateRaw ? delDateRaw.slice(0, 10) : "";
    const delParts = delDateStr
      ? this.computeDateParts(delDateStr)
      : { year: 0, month: 0 };
    const delCategoryL1 = (existing.category_l1 as string) || "";

    await this.bitable.deleteRecord(this.domain, id);
    this.logger.log(`支出记录已删除: ${id}`);
    await this.invalidateExpenseCaches();

    // 联动扣减预算 usedAmount
    this.adjustBudgetForRemove(id, {
      amount: delAmount,
      department: delDepartment,
      year: delParts.year,
      month: delParts.month,
      categoryL1: delCategoryL1,
    });

    return { success: true };
  }

  /**
   * 支出删除后联动扣减预算（异步，失败不阻塞主流程）
   */
  private adjustBudgetForRemove(
    expenseId: string,
    info: { amount: number; department: string; year: number; month: number; categoryL1: string },
  ): void {
    if (!info.department) {
      this.logger.warn(
        `支出删除后跳过预算扣减：部门为空。expenseId=${expenseId}`,
      );
      return;
    }
    if (!info.year || !info.month) {
      this.logger.warn(
        `支出删除后跳过预算扣减：日期无效。expenseId=${expenseId}`,
      );
      return;
    }
    if (info.amount === 0) return;

    this.budgetService
      .adjustUsedAmount({
        departmentId: info.department,
        year: info.year,
        month: info.month,
        amount: -info.amount,
        categoryL1: info.categoryL1 || undefined,
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(
          `[预算联动失败] 支出删除后扣减预算失败，数据可能不一致。` +
            `expenseId=${expenseId}, dept=${info.department}, ` +
            `year=${info.year}, month=${info.month}, ` +
            `amount=${info.amount}, error=${msg}`,
        );
       });
   }

   // ---------- 批量操作 ----------

  async batchUpdateCategory(
    ids: string[],
    categoryL1: string,
    categoryL2: string,
    _userId: string,
  ): Promise<BatchOperationResult> {
    if (ids.length === 0) {
      return { successCount: 0, failedCount: 0, failedItems: [] };
    }
    const updated = await this.db
      .update(expenses)
      .set({ categoryL1, categoryL2 })
      .where(inArray(expenses.id, ids))
      .returning({ id: expenses.id });
    await this.invalidateExpenseCaches();
    return {
      successCount: updated.length,
      failedCount: ids.length - updated.length,
      failedItems: [],
    };
  }

  async batchUpdateDepartment(
    ids: string[],
    department: string,
    _userId: string,
  ): Promise<BatchOperationResult> {
    if (ids.length === 0) {
      return { successCount: 0, failedCount: 0, failedItems: [] };
    }
    const updated = await this.db
      .update(expenses)
      .set({ department })
      .where(inArray(expenses.id, ids))
      .returning({ id: expenses.id });
    await this.invalidateExpenseCaches();
    return {
      successCount: updated.length,
      failedCount: ids.length - updated.length,
      failedItems: [],
    };
  }
}
