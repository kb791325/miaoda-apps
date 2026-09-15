import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { FeishuBitableService } from "../feishu-bitable/feishu-bitable.service";
import { CacheService } from "@server/common/cache/cache.service";
import { RolesService } from "../roles/roles.service";
import type {
  DataScope,
  InventoryCheckItem,
  InventoryCheckStatus,
  InventoryTaskDetail,
  InventoryTaskItem,
  InventoryTaskStatus,
  PagedResponse,
  ScopeType,
} from "@shared/api.interface";

interface ListQuery {
  page: number;
  pageSize: number;
  status?: string;
  checkMonth?: string;
  keyword?: string;
  userId?: string;
}

@Injectable()
export class InventoryTasksService {
  private readonly logger = new Logger(InventoryTasksService.name);
  private readonly domain = "inventory_tasks";
  private readonly checksDomain = "inventory_checks";
  private readonly TASK_MARKER = "[TASK]";
  private readonly ASSET_META_MARKER = "[ASSET_META]";

  constructor(
    private readonly bitable: FeishuBitableService,
    private readonly cache: CacheService,
    private readonly rolesService: RolesService,
  ) {}

  private async invalidateInventoryCaches(): Promise<void> {
    await this.cache.deleteByPrefix("report:inventory");
    await this.cache.deleteByPrefix("dash:inventory:");
  }

  async list(params: ListQuery): Promise<PagedResponse<InventoryTaskItem>> {
    const { page, pageSize, status, checkMonth, keyword, userId } = params;

    const allRecords = await this.bitable.getAllRecords(this.domain);

    let filtered = allRecords.filter(
      (rec: Record<string, unknown>) =>
        String(rec.remark ?? "").startsWith(this.TASK_MARKER),
    );

    // 数据权限过滤
    if (userId) {
      const dataScope: DataScope = await this.rolesService.getUserDataScope(
        userId,
        "inventory",
      );
      if (dataScope === "personal") {
        filtered = filtered.filter(
          (rec: Record<string, unknown>) =>
            (rec.checker as string) === userId ||
            (rec.checker as string)?.includes?.(userId),
        );
      } else if (dataScope === "department") {
        const userInfo = await this.rolesService.getUserInfo(userId);
        if (userInfo.department) {
          // 盘点任务没有直接的部门字段，降级为 personal 范围
          // 后续如有部门字段再调整
          filtered = filtered.filter(
            (rec: Record<string, unknown>) =>
              (rec.checker as string) === userId ||
              (rec.checker as string)?.includes?.(userId),
          );
        } else {
          filtered = filtered.filter(
            (rec: Record<string, unknown>) =>
              (rec.checker as string) === userId ||
              (rec.checker as string)?.includes?.(userId),
          );
        }
      }
      // all: 不过滤
    }

    if (status) {
      filtered = filtered.filter(
        (rec: Record<string, unknown>) => rec.status === status,
      );
    }
    if (checkMonth) {
      filtered = filtered.filter(
        (rec: Record<string, unknown>) =>
          (rec.check_month as string)?.startsWith(checkMonth),
      );
    }
    if (keyword) {
      filtered = filtered.filter(
        (rec: Record<string, unknown>) =>
          (rec.check_no as string)?.includes(keyword),
      );
    }

    filtered.sort(
      (a: Record<string, unknown>, b: Record<string, unknown>) =>
        ((b.check_date as string) ?? "").localeCompare(
          (a.check_date as string) ?? "",
        ),
    );

    const total = filtered.length;
    const start = (page - 1) * pageSize;
    const pageItems = filtered.slice(start, start + pageSize);

    let checkCounts: Map<string, { total: number; checked: number; abnormal: number }> | undefined;
    const needCounts = pageItems.some((rec: Record<string, unknown>) => {
      const meta = this.parseTaskRemark(String(rec.remark ?? ""));
      return !meta.totalCount || !meta.checkedCount;
    });
    if (needCounts) {
      const allChecks = await this.bitable.getAllRecords<Record<string, unknown>>(this.checksDomain);
      checkCounts = this.computeCheckCountsFromChecks(pageItems, allChecks);
    }

    return {
      items: pageItems.map((rec: Record<string, unknown>) =>
        this.toTaskItem(rec, checkCounts),
      ),
      total,
    };
  }

  private toTaskItem(
    rec: Record<string, unknown>,
    checkCounts?: Map<string, { total: number; checked: number; abnormal: number }>,
  ): InventoryTaskItem {
    const remarkText = String(rec.remark ?? "");
    const meta = this.parseTaskRemark(remarkText);

    let totalCount = meta.totalCount ?? 0;
    let checkedCount = meta.checkedCount ?? 0;
    const taskId = (rec.recordId as string) ?? (rec.id as string) ?? "";

    if (
      (totalCount === 0 || checkedCount === 0) &&
      checkCounts &&
      checkCounts.has(taskId)
    ) {
      const counts = checkCounts.get(taskId);
      if (counts) {
        totalCount = totalCount || counts.total;
        checkedCount = checkedCount || counts.checked;
      }
    }

    return {
      id: taskId,
      taskNo: (rec.check_no as string) ?? "",
      checkYear: Number(rec.check_year ?? 0),
      checkMonth: (rec.check_month as string) ?? "",
      checker: (rec.checker as string) ?? "",
      status: (rec.status as InventoryTaskStatus) ?? "pending",
      progress:
        totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0,
      totalCount,
      checkedCount,
      createdAt: (rec.check_date as string) ?? "",
    };
  }

  private buildTaskRemark(meta: {
    taskName: string;
    scopeType: ScopeType;
    scopeValue?: string;
    totalCount?: number;
    checkedCount?: number;
    abnormalCount?: number;
    progress?: number;
  }): string {
    const parts: string[] = [this.TASK_MARKER, meta.taskName, meta.scopeType];
    if (meta.scopeValue) parts.push(meta.scopeValue);
    if (meta.totalCount !== undefined) parts.push(`tc:${meta.totalCount}`);
    if (meta.checkedCount !== undefined) parts.push(`cc:${meta.checkedCount}`);
    if (meta.abnormalCount !== undefined) parts.push(`ac:${meta.abnormalCount}`);
    if (meta.progress !== undefined) parts.push(`pg:${meta.progress}`);
    return parts.join("|");
  }

  private parseTaskRemark(remark: string): {
    taskName: string;
    scopeType: ScopeType;
    scopeValue: string[];
    totalCount?: number;
    checkedCount?: number;
    abnormalCount?: number;
    progress?: number;
  } {
    const body = remark.startsWith(this.TASK_MARKER)
      ? remark.slice(this.TASK_MARKER.length + 1)
      : remark;
    const parts = body.split("|");
    const [taskName = "", scopeType = "all", scopeValueStr = ""] = parts;
    const meta: Record<string, unknown> = { taskName, scopeType, scopeValue: scopeValueStr ? scopeValueStr.split(",") : [] };
    for (const part of parts) {
      if (part.startsWith("tc:")) meta.totalCount = Number(part.slice(3));
      else if (part.startsWith("cc:")) meta.checkedCount = Number(part.slice(3));
      else if (part.startsWith("ac:")) meta.abnormalCount = Number(part.slice(3));
      else if (part.startsWith("pg:")) meta.progress = Number(part.slice(3));
    }
    return meta as {
      taskName: string;
      scopeType: ScopeType;
      scopeValue: string[];
      totalCount?: number;
      checkedCount?: number;
      abnormalCount?: number;
      progress?: number;
    };
  }

  private computeCheckCountsFromChecks(
    pageItems: Record<string, unknown>[],
    allChecks: Record<string, unknown>[],
  ): Map<string, { total: number; checked: number; abnormal: number }> {
    const result = new Map<string, { total: number; checked: number; abnormal: number }>();
    const checkNoToTaskId = new Map<string, string>();

    for (const rec of pageItems) {
      const taskId = (rec.recordId as string) ?? (rec.id as string) ?? "";
      const checkNo = String(rec.check_no ?? "");
      result.set(taskId, { total: 0, checked: 0, abnormal: 0 });
      checkNoToTaskId.set(checkNo, taskId);
    }

    for (const rec of allChecks) {
      const recId = (rec.recordId as string) ?? (rec.id as string) ?? "";
      const remark = String(rec.remark ?? "");
      if (remark.startsWith(this.TASK_MARKER)) continue;
      const recCheckNo = String(rec.check_no ?? "");
      const taskId = checkNoToTaskId.get(recCheckNo);
      if (taskId && recId !== taskId) {
        const acc = result.get(taskId)!;
        acc.total += 1;
        const status = (rec.status as string) ?? "pending";
        if (status !== "pending" && status !== "unchecked") {
          acc.checked += 1;
          const actual = rec.actual_quantity;
          const book = Number(rec.book_quantity ?? 0);
          const actualNum =
            actual !== undefined && actual !== null ? Number(actual) : null;
          if (actualNum !== null && actualNum - book !== 0) {
            acc.abnormal += 1;
          }
        }
      }
    }

    return result;
  }

  async getDetail(taskId: string, userId?: string): Promise<InventoryTaskDetail> {
    const task = await this.bitable.getRecord<Record<string, unknown>>(
      this.domain,
      taskId,
    );
    if (!task) {
      throw new NotFoundException("盘点任务不存在");
    }

    // 数据权限查看校验
    if (userId) {
      const dataScope = await this.rolesService.getUserDataScope(
        userId,
        "inventory",
      );
      if (dataScope === "personal") {
        const checker = (task.checker as string) ?? "";
        if (checker !== userId && !checker?.includes?.(userId)) {
          throw new ForbiddenException("无权限查看他人的盘点任务");
        }
      }
      // department: 无部门字段，all 则不限制
    }

    const taskNo = String(task.check_no ?? "");

    const allChecks = await this.bitable.getAllRecords(this.checksDomain);
    const checks = allChecks.filter(
      (rec: Record<string, unknown>) => {
        const recId =
          (rec.recordId as string) ?? (rec.id as string) ?? "";
        const recCheckNo = String(rec.check_no ?? "");
        return (
          recId !== taskId &&
          recCheckNo === taskNo &&
          !String(rec.remark ?? "").startsWith(this.TASK_MARKER)
        );
      },
    );

    const checkItems: InventoryCheckItem[] = checks.map(
      (rec: Record<string, unknown>) => this.toCheckItem(rec),
    );

    const item = this.toTaskItem(task);
    const remarkText = String(task.remark ?? "");
    const meta = this.parseTaskRemark(remarkText);

    return {
      ...item,
      checks: checkItems,
      abnormalCount: meta.abnormalCount ?? 0,
      scopeType: meta.scopeType,
      scopeValue: meta.scopeValue,
      remark: meta.taskName,
    };
  }

  private toCheckItem(rec: Record<string, unknown>): InventoryCheckItem {
    const actualRaw = rec.actual_quantity;
    const status = (rec.status as string) ?? "pending";
    const isChecked = status !== "pending" && status !== "unchecked";
    const actual = isChecked && actualRaw !== undefined && actualRaw !== null
      ? Number(actualRaw)
      : null;
    const book = Number(rec.book_quantity ?? 0);
    const diff = actual !== null ? actual - book : null;

    const id = (rec.recordId as string) ?? (rec.id as string) ?? "";
    const rawRemark = (rec.remark as string) ?? "";
    let assetName = (rec.asset_name as string) ?? "";
    let assetType = (rec.asset_type as string) ?? "";
    let assetOwner = (rec.owner as string) ?? "";
    let assetCode = "";
    let userRemark = "";

    if (rawRemark.startsWith(this.ASSET_META_MARKER)) {
      const firstLine = rawRemark.split("\n")[0];
      const parts = firstLine.slice(this.ASSET_META_MARKER.length).split("|");
      if (parts.length >= 2) assetName = assetName || parts[1] || "";
      if (parts.length >= 3) assetType = assetType || parts[2] || "";
      if (parts.length >= 4) assetCode = parts[3] || "";
      if (parts.length >= 5) assetOwner = assetOwner || parts[4] || "";
      userRemark = rawRemark.slice(firstLine.length + 1);
    } else {
      userRemark = rawRemark;
    }

    return {
      id,
      assetId: assetCode,
      assetName,
      assetType,
      owner: assetOwner,
      bookQuantity: book,
      actualQuantity: actual,
      difference: diff,
      status: (isChecked ? status : "pending") as InventoryCheckStatus,
      remark: userRemark,
      isAbnormal: diff !== null && diff !== 0,
    };
  }

  private async generateUniqueTaskNo(checkMonth: string): Promise<string> {
    const monthPart = checkMonth.replace(/-/g, "");
    const allTasks = await this.getAllTasks();
    const monthTasks = allTasks.filter((rec: Record<string, unknown>) =>
      String(rec.check_month ?? "") === checkMonth,
    );
    const existingNos = new Set(
      allTasks.map((rec: Record<string, unknown>) =>
        String(rec.check_no ?? ""),
      ),
    );

    let seq = monthTasks.length + 1;
    let taskNo = `CK-${monthPart}-${String(seq).padStart(4, "0")}`;
    let retries = 0;
    while (existingNos.has(taskNo) && retries < 50) {
      seq += 1;
      taskNo = `CK-${monthPart}-${String(seq).padStart(4, "0")}`;
      retries += 1;
    }

    if (existingNos.has(taskNo)) {
      const randSuffix = String(
        Math.floor(Math.random() * 9000) + 1000,
      );
      taskNo = `CK-${monthPart}-${randSuffix}`;
    }

    return taskNo;
  }

  private async getAllTasks(): Promise<Record<string, unknown>[]> {
    const allRecords = await this.bitable.getAllRecords(this.domain);
    return allRecords.filter((rec: Record<string, unknown>) =>
      String(rec.remark ?? "").startsWith(this.TASK_MARKER),
    );
  }

  async create(dto: {
    taskName?: string;
    checkYear: number;
    checkMonth: string;
    checker?: string;
    scopeType: ScopeType;
    scopeValue?: string[];
    assetType?: string;
    floor?: string;
    department?: string;
    remark?: string;
  }): Promise<{ id: string; taskNo: string; totalCount: number }> {
    const taskNo = await this.generateUniqueTaskNo(dto.checkMonth);
    const today = new Date().toISOString().slice(0, 10);
    const taskName = dto.taskName?.trim() || taskNo;

    const remark = this.buildTaskRemark({
      taskName,
      scopeType: dto.scopeType,
      scopeValue: dto.scopeValue?.join(","),
      totalCount: 0,
      checkedCount: 0,
      abnormalCount: 0,
      progress: 0,
    });

    const result = await this.bitable.createRecord(this.domain, {
      check_no: taskNo,
      check_year: dto.checkYear,
      check_month: dto.checkMonth,
      checker: dto.checker ?? "",
      status: "in_progress",
      book_quantity: 0,
      actual_quantity: 0,
      remark,
      check_date: today,
    });

    const allAssets = await this.bitable.getAllRecords<Record<string, unknown>>("fixed_assets");
    const assets = this.filterAssetsByScope(allAssets, dto.scopeType, dto.scopeValue ?? []);

    const assetMetas: string[] = [];
    const checkRecords = assets.map((asset: Record<string, unknown>) => {
      const stock = asset.current_stock !== undefined ? Number(asset.current_stock) : 1;
      const assetRecordId = (asset.recordId as string) ?? (asset.id as string) ?? "";
      const assetMeta = `${this.ASSET_META_MARKER}|${String(asset.asset_name ?? "")}|${String(asset.asset_type ?? "")}|${assetRecordId}|${String(asset.owner ?? "")}`;
      assetMetas.push(assetMeta);
      return {
        check_no: taskNo,
        check_year: dto.checkYear,
        check_month: dto.checkMonth,
        check_date: today,
        checker: dto.checker ?? "",
        book_quantity: stock,
        status: "pending",
      };
    });

    let createdIds: string[] = [];
    if (checkRecords.length > 0) {
      createdIds = await this.bitable.batchCreateRecords(this.checksDomain, checkRecords);
    }

    if (createdIds.length > 0) {
      const remarkUpdates = createdIds.map((id, idx) => ({
        id,
        record: { remark: assetMetas[idx] },
      }));
      await this.bitable.batchUpdateRecords(this.checksDomain, remarkUpdates);
    }

    const updatedRemark = this.buildTaskRemark({
      taskName: dto.taskName,
      scopeType: dto.scopeType,
      scopeValue: dto.scopeValue?.join(","),
      totalCount: checkRecords.length,
      checkedCount: 0,
      abnormalCount: 0,
      progress: 0,
    });

    await this.bitable.updateRecord(this.domain, result.id, {
      remark: updatedRemark,
      book_quantity: checkRecords.length,
    });

    this.logger.log(
      `盘点任务已创建: ${taskNo}, 生成检查项 ${checkRecords.length} 条`,
    );
    await this.invalidateInventoryCaches();
    return { id: result.id, taskNo, totalCount: checkRecords.length };
  }

  async updateStatus(
    taskId: string,
    status: InventoryTaskStatus,
  ): Promise<{ success: boolean }> {
    const task = await this.bitable.getRecord(this.domain, taskId);
    if (!task) {
      throw new NotFoundException("盘点任务不存在");
    }

    await this.bitable.updateRecord(this.domain, taskId, {
      status,
    });

    return { success: true };
  }

  async completeTask(
    taskId: string,
  ): Promise<{
    success: boolean;
    checkedCount: number;
    totalCount: number;
    abnormalCount: number;
    surplusTotal: number;
    lossTotal: number;
    updatedAssetCount: number;
    unmatchedAssetCount: number;
  }> {
    const task = await this.bitable.getRecord<Record<string, unknown>>(
      this.domain,
      taskId,
    );
    if (!task) {
      throw new NotFoundException("盘点任务不存在");
    }

    const taskNo = String(task.check_no ?? "");
    const remarkText = String(task.remark ?? "");
    const meta = this.parseTaskRemark(remarkText);

    const allChecks = await this.bitable.getAllRecords(this.checksDomain);
    const checks = allChecks.filter((rec: Record<string, unknown>) => {
      const recId = (rec.recordId as string) ?? (rec.id as string) ?? "";
      const recCheckNo = String(rec.check_no ?? "");
      return (
        recId !== taskId &&
        recCheckNo === taskNo &&
        !String(rec.remark ?? "").startsWith(this.TASK_MARKER)
      );
    });

    const checkItems = checks.map(
      (rec: Record<string, unknown>) => this.toCheckItem(rec),
    );

    const totalCount = checkItems.length;
    const checkedCount = checkItems.filter(
      (c) => c.status !== "pending",
    ).length;
    const diffItems = checkItems.filter(
      (c) => c.difference !== null && c.difference !== 0,
    );
    const abnormalCount = diffItems.length;
    const surplusTotal = diffItems.reduce(
      (sum, item) => sum + Math.max(0, item.difference ?? 0),
      0,
    );
    const lossTotal = diffItems.reduce(
      (sum, item) => sum + Math.min(0, item.difference ?? 0) * -1,
      0,
    );

    const updatedRemark = this.buildTaskRemark({
      taskName: meta.taskName,
      scopeType: meta.scopeType,
      scopeValue: meta.scopeValue.join(","),
      totalCount,
      checkedCount,
      abnormalCount,
      progress: totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0,
    });

    await this.bitable.updateRecord(this.domain, taskId, {
      status: "completed",
      remark: updatedRemark,
    });

    let updatedAssetCount = 0;
    let unmatchedAssetCount = 0;

    try {
      const allAssets = await this.bitable.getAllRecords<Record<string, unknown>>(
        "fixed_assets",
      );
      const assetById = new Map<string, string>();
      const assetByName = new Map<string, string>();
      for (const a of allAssets) {
        const name = (a.asset_name as string) ?? "";
        const id = (a.recordId as string) ?? (a.id as string) ?? "";
        if (id) {
          assetById.set(id, id);
        }
        if (name && id && !assetByName.has(name)) {
          assetByName.set(name, id);
        }
      }

      const updates: Array<{ id: string; fields: Record<string, unknown> }> = [];
      for (const item of checkItems) {
        if (item.actualQuantity === null || item.difference === 0) continue;
        let matchedAssetId: string | undefined;
        if (item.assetId) {
          matchedAssetId = assetById.get(item.assetId);
        }
        if (!matchedAssetId && item.assetName) {
          matchedAssetId = assetByName.get(item.assetName);
        }
        if (!matchedAssetId) {
          unmatchedAssetCount += 1;
          continue;
        }
        updates.push({
          id: matchedAssetId,
          fields: { current_stock: item.actualQuantity },
        });
      }

      if (updates.length > 0) {
        await this.bitable.batchUpdateRecords(
          "fixed_assets",
          updates.map((u) => ({ id: u.id, record: u.fields })),
        );
        updatedAssetCount = updates.length;
      }
    } catch (err) {
      this.logger.error(
        `更新固定资产库存失败: ${JSON.stringify({ err: String(err) })}`,
      );
    }

    this.logger.log(
      `盘点任务完成: ${task.check_no}, 已盘点${checkedCount}/${totalCount}, 更新固定资产${updatedAssetCount}条, 未匹配${unmatchedAssetCount}条`,
    );

    await this.invalidateInventoryCaches();
    if (updatedAssetCount > 0) {
      await this.cache.deleteByPrefix("dash:asset");
      await this.cache.deleteByPrefix("report:asset");
    }
    return {
      success: true,
      checkedCount,
      totalCount,
      abnormalCount,
      surplusTotal,
      lossTotal,
      updatedAssetCount,
      unmatchedAssetCount,
    };
  }

  async resetChecks(taskId: string): Promise<{ success: boolean; resetCount: number }> {
    const task = await this.bitable.getRecord<Record<string, unknown>>(
      this.domain,
      taskId,
    );
    if (!task) {
      throw new NotFoundException("盘点任务不存在");
    }

    const taskNo = String(task.check_no ?? "");
    const remarkText = String(task.remark ?? "");
    const meta = this.parseTaskRemark(remarkText);

    const allChecks = await this.bitable.getAllRecords(this.checksDomain);
    const targetChecks = allChecks.filter((rec: Record<string, unknown>) => {
      const recId = (rec.recordId as string) ?? (rec.id as string) ?? "";
      const recCheckNo = String(rec.check_no ?? "");
      return (
        recId !== taskId &&
        recCheckNo === taskNo &&
        !String(rec.remark ?? "").startsWith(this.TASK_MARKER)
      );
    });

    const checkIds = targetChecks.map((rec: Record<string, unknown>) =>
      (rec.recordId as string) ?? (rec.id as string) ?? "",
    ).filter((v): v is string => typeof v === "string" && v.length > 0);

    if (checkIds.length === 0) {
      return { success: true, resetCount: 0 };
    }

    const updates = targetChecks.map((rec: Record<string, unknown>) => {
      const id = (rec.recordId as string) ?? (rec.id as string) ?? "";
      const oldRemark = String(rec.remark ?? "");
      const keepMeta = oldRemark.startsWith(this.ASSET_META_MARKER)
        ? oldRemark.split("\n")[0]
        : "";
      return {
        id,
        record: {
          actual_quantity: 0,
          status: "pending",
          remark: keepMeta,
        },
      };
    });

    try {
      await this.bitable.batchUpdateRecords(this.checksDomain, updates);
    } catch (err) {
      this.logger.error(
        `重置盘点检查项失败: ${JSON.stringify({ taskId, checkCount: checkIds.length, err: String(err) })}`,
      );
      throw new BadRequestException(`重置检查项失败: ${(err as Error).message}`);
    }

    const updatedRemark = this.buildTaskRemark({
      taskName: meta.taskName,
      scopeType: meta.scopeType,
      scopeValue: meta.scopeValue.join(","),
      totalCount: checkIds.length,
      checkedCount: 0,
      abnormalCount: 0,
      progress: 0,
    });

    await this.bitable.updateRecord(this.domain, taskId, {
      status: "in_progress",
      remark: updatedRemark,
    });

    this.logger.log(
      `盘点任务检查项已重置: ${task.check_no}, 共 ${checkIds.length} 条`,
    );
    await this.invalidateInventoryCaches();
    return { success: true, resetCount: checkIds.length };
  }

  async regenerateChecks(
    taskId: string,
  ): Promise<{ totalCount: number }> {
    const task = await this.bitable.getRecord<Record<string, unknown>>(
      this.domain,
      taskId,
    );
    if (!task) {
      throw new NotFoundException("盘点任务不存在");
    }

    const checkYear = Number(task.check_year ?? 0);
    const checkMonth = String(task.check_month ?? "");
    const taskNo = String(task.check_no ?? "");
    const remarkText = String(task.remark ?? "");
    const meta = this.parseTaskRemark(remarkText);

    const allChecks = await this.bitable.getAllRecords<Record<string, unknown>>(
      this.checksDomain,
    );
    const existingIds = allChecks
      .filter(
        (rec: Record<string, unknown>) => {
          const recId =
            (rec.recordId as string) ?? (rec.id as string) ?? "";
          const recCheckNo = String(rec.check_no ?? "");
          return (
            recId !== taskId &&
            recCheckNo === taskNo &&
            !String(rec.remark ?? "").startsWith(this.TASK_MARKER)
          );
        },
      )
      .map(
        (rec: Record<string, unknown>) =>
          (rec.recordId as string) ?? (rec.id as string),
      )
      .filter((v): v is string => typeof v === 'string' && v.length > 0);

    if (existingIds.length > 0) {
      try {
        await this.bitable.batchDeleteRecords(this.checksDomain, existingIds);
      } catch (err) {
        this.logger.error(
          `重新生成检查项-删除旧记录失败: ${JSON.stringify({ taskId, count: existingIds.length, err: String(err) })}`,
        );
        throw new BadRequestException(`删除旧检查项失败: ${(err as Error).message}`);
      }
    }

    const allAssets = await this.bitable.getAllRecords<Record<string, unknown>>(
      "fixed_assets",
    );
    const assets = this.filterAssetsByScope(
      allAssets,
      meta.scopeType,
      meta.scopeValue,
    );
    const today = new Date().toISOString().slice(0, 10);
    const checker = (task.checker as string) ?? "";

    const assetMetas2: string[] = [];
    const checkRecords = assets.map((asset: Record<string, unknown>) => {
      const stock =
        asset.current_stock !== undefined
          ? Number(asset.current_stock)
          : 1;
      const assetRecordId = (asset.recordId as string) ?? (asset.id as string) ?? "";
      const assetMeta = `${this.ASSET_META_MARKER}|${String(asset.asset_name ?? "")}|${String(asset.asset_type ?? "")}|${assetRecordId}|${String(asset.owner ?? "")}`;
      assetMetas2.push(assetMeta);
      return {
        check_no: taskNo,
        check_year: checkYear,
        check_month: checkMonth,
        check_date: today,
        checker,
        book_quantity: stock,
        status: "pending",
        remark: assetMeta,
      };
    });

    let createdIds: string[] = [];
    if (checkRecords.length > 0) {
      try {
        createdIds = await this.bitable.batchCreateRecords(this.checksDomain, checkRecords);
      } catch (err) {
        this.logger.error(
          `重新生成检查项-创建新记录失败: ${JSON.stringify({ taskId, count: checkRecords.length, err: String(err) })}`,
        );
        throw new BadRequestException(`创建检查项失败: ${(err as Error).message}`);
      }
    }

    if (createdIds.length > 0) {
      try {
        const remarkUpdates = createdIds.map((id, idx) => ({
          id,
          record: { remark: assetMetas2[idx] },
        }));
        await this.bitable.batchUpdateRecords(this.checksDomain, remarkUpdates);
      } catch (err) {
        this.logger.error(
          `重新生成检查项-更新资产元信息失败: ${JSON.stringify({ taskId, count: createdIds.length, err: String(err) })}`,
        );
      }
    }

    const updatedRemark = this.buildTaskRemark({
      taskName: meta.taskName,
      scopeType: meta.scopeType,
      scopeValue: meta.scopeValue.join(","),
      totalCount: checkRecords.length,
      checkedCount: 0,
      abnormalCount: 0,
      progress: 0,
    });

    await this.bitable.updateRecord(this.domain, taskId, {
      remark: updatedRemark,
      status: "in_progress",
      book_quantity: checkRecords.length,
    });

    this.logger.log(
      `盘点任务重新生成检查项: ${taskNo}, 共 ${checkRecords.length} 条`,
    );
    await this.invalidateInventoryCaches();
    return { totalCount: checkRecords.length };
  }

  async remove(taskId: string, userId?: string): Promise<{ success: boolean }> {
    const task = await this.bitable.getRecord(this.domain, taskId);
    if (!task) {
      throw new NotFoundException("盘点任务不存在");
    }

    // 数据权限写操作校验
    if (userId) {
      const dataScope = await this.rolesService.getUserDataScope(
        userId,
        "inventory",
      );
      if (dataScope === "personal") {
        const checker = (task.checker as string) ?? "";
        if (checker !== userId && !checker?.includes?.(userId)) {
          throw new ForbiddenException("无权限删除他人的盘点任务");
        }
      }
    }

    await this.bitable.deleteRecord(this.domain, taskId);
    await this.invalidateInventoryCaches();
    return { success: true };
  }

  async clearAll(): Promise<{ deletedCount: number }> {
    const all = await this.bitable.getAllRecords<Record<string, unknown>>(this.domain);
    const ids = all
      .map((rec) => (rec as { recordId?: string; id?: string }).recordId || (rec as { id?: string }).id)
      .filter((v): v is string => typeof v === 'string' && v.length > 0);

    if (ids.length === 0) {
      return { deletedCount: 0 };
    }

    await this.bitable.batchDeleteRecords(this.domain, ids);
    await this.invalidateInventoryCaches();
    return { deletedCount: ids.length };
  }

  async getChecks(taskId: string, userId?: string): Promise<InventoryCheckItem[]> {
    const task = await this.bitable.getRecord<Record<string, unknown>>(
      this.domain,
      taskId,
    );
    if (!task) {
      throw new NotFoundException("盘点任务不存在");
    }

    // 数据权限查看校验
    if (userId) {
      const dataScope = await this.rolesService.getUserDataScope(
        userId,
        "inventory",
      );
      if (dataScope === "personal") {
        const checker = (task.checker as string) ?? "";
        if (checker !== userId && !checker?.includes?.(userId)) {
          throw new ForbiddenException("无权限查看他人盘点任务的检查项");
        }
      }
    }

    const taskNo = String(task.check_no ?? "");

    const allChecks = await this.bitable.getAllRecords(this.checksDomain);
    const checks = allChecks.filter(
      (rec: Record<string, unknown>) => {
        const recId =
          (rec.recordId as string) ?? (rec.id as string) ?? "";
        const recCheckNo = String(rec.check_no ?? "");
        return (
          recId !== taskId &&
          recCheckNo === taskNo &&
          !String(rec.remark ?? "").startsWith(this.TASK_MARKER)
        );
      },
    );

    return checks.map((rec: Record<string, unknown>) => this.toCheckItem(rec));
  }

  private filterAssetsByScope(
    assets: Record<string, unknown>[],
    scopeType: ScopeType,
    scopeValue: string[],
  ): Record<string, unknown>[] {
    if (scopeType === "all" || !scopeValue || scopeValue.length === 0) {
      return assets;
    }
    const values = new Set(scopeValue);
    return assets.filter((asset: Record<string, unknown>) => {
      let fieldValue: string = "";
      switch (scopeType) {
        case "department":
          fieldValue = (asset.purchase_department as string) ?? "";
          break;
        case "floor":
          fieldValue = (asset.floor as string) ?? "";
          break;
        case "owner": {
          const ownerRaw = asset.owner;
          if (Array.isArray(ownerRaw) && ownerRaw.length > 0) {
            const first = ownerRaw[0] as { id?: number | string };
            fieldValue = first?.id !== undefined ? String(first.id) : "";
          } else if (typeof ownerRaw === "string") {
            fieldValue = ownerRaw;
          }
          break;
        }
        case "asset_type":
          fieldValue = (asset.asset_type as string) ?? "";
          break;
        default:
          return true;
      }
      return values.has(fieldValue);
    });
  }
}
