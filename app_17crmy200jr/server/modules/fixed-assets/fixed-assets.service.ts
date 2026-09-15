import {
  BadRequestException,
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
import { FeishuBitableService } from "../feishu-bitable/feishu-bitable.service";
import { fixedAssets } from "@server/database/schema";
import type { BitableFilter } from "../feishu-bitable/feishu-bitable.service";
import { AuthNPaasService } from "@lark-apaas/fullstack-nestjs-core";
import { CacheService } from "@server/common/cache/cache.service";
import type {
  AssetOperationRecord,
  AssetOperationType,
  AssetStatus,
  AssetSummary,
  AssetType,
  BatchOperationResult,
  CheckHistoryItem,
  FixedAssetDetail,
  FixedAssetItem,
  PagedResponse,
} from "@shared/api.interface";
import type { CreateFixedAssetDto } from './dto/create-fixed-asset.dto';
import type { UpdateFixedAssetDto } from './dto/update-fixed-asset.dto';
import { DEFAULT_PAGE_SIZE } from "@server/common/constants/pagination";

interface ListQuery {
  page: number;
  pageSize: number;
  assetType?: string;
  floor?: string;
  purchaseDepartment?: string;
  payerEntity?: string;
  owner?: string;
  keyword?: string;
  sortBy?: "currentStock" | "purchaseAmount" | "assetName";
  sortOrder?: "asc" | "desc";
}

interface SummaryQuery {
  assetType?: string;
  floor?: string;
  purchaseDepartment?: string;
  payerEntity?: string;
  owner?: string;
  keyword?: string;
}

const DEPRECIATION_MONTHS = 36;
const CHECK_HISTORY_DOMAIN = "inventory_checks";

@Injectable()
export class FixedAssetsService {
  private readonly logger = new Logger(FixedAssetsService.name);
  private readonly domain = "fixed_assets";

  constructor(
    private readonly bitable: FeishuBitableService,
    private readonly authnService: AuthNPaasService,
    private readonly cache: CacheService,
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  private async invalidateAssetCaches(): Promise<void> {
    await this.cache.deleteByPrefix("dash:asset");
    await this.cache.deleteByPrefix("report:asset");
  }

  private extractUserId(value: unknown): string {
    if (Array.isArray(value) && value.length > 0) {
      const first = value[0] as { id?: number | string; name?: string };
      if (first?.id !== undefined && first.id !== null) {
        return String(first.id);
      }
    }
    if (typeof value === "string" && value) return value;
    return "";
  }

  private extractUserName(value: unknown): string {
    if (Array.isArray(value) && value.length > 0) {
      const first = value[0] as { name?: string };
      return first?.name ?? "";
    }
    return "";
  }

  private toFixedAssetItem(
    rec: Record<string, unknown>,
  ): FixedAssetItem {
    const purchaseDate = (rec.purchase_date as string) ?? "";
    const purchaseAmount = Number(rec.purchase_amount ?? 0);
    const currentStock = Number(rec.current_stock ?? 1);
    const ownerId = this.extractUserId(rec.owner);
    const rawAssetStatus = (rec.asset_status as string) ?? "";
    let assetStatus: AssetStatus;
    if (rawAssetStatus === "in_stock" || rawAssetStatus === "在库") {
      assetStatus = "in_stock";
    } else if (rawAssetStatus === "in_use" || rawAssetStatus === "在用") {
      assetStatus = "in_use";
    } else if (rawAssetStatus === "idle" || rawAssetStatus === "闲置") {
      assetStatus = "idle";
    } else if (rawAssetStatus === "repairing" || rawAssetStatus === "维修") {
      assetStatus = "repairing";
    } else if (rawAssetStatus === "transferring" || rawAssetStatus === "转移中") {
      assetStatus = "transferring";
    } else if (rawAssetStatus === "scrapped" || rawAssetStatus === "报废") {
      assetStatus = "scrapped";
    } else if (currentStock <= 0) {
      assetStatus = "scrapped";
    } else if (ownerId) {
      assetStatus = "in_use";
    } else {
      assetStatus = "in_stock";
    }
    const { accumulatedDep } = this.calculateDepreciation(
      purchaseDate,
      purchaseAmount,
    );

    return {
      id: (rec.recordId as string) ?? (rec.id as string) ?? "",
      assetName: (rec.asset_name as string) ?? "",
      assetType: (rec.asset_type as string) as AssetType,
      assetCategory: (rec.asset_category as string) ?? "",
      purchaseDate: purchaseDate ? purchaseDate.slice(0, 10) : "",
      purchaseAmount,
      owner: ownerId,
      floor: (rec.floor as string) ?? "",
      currentStock,
      assetStatus,
      netValue: Math.max(0, purchaseAmount - accumulatedDep),
    };
  }

  private calculateDepreciation(
    purchaseDate: string,
    purchaseAmount: number,
  ): { monthlyDep: number; accumulatedDep: number } {
    const monthlyDep =
      purchaseAmount > 0
        ? Math.round((purchaseAmount / DEPRECIATION_MONTHS) * 100) / 100
        : 0;

    let accumulatedDep = 0;
    if (purchaseDate && purchaseAmount > 0) {
      const pd = new Date(purchaseDate);
      const now = new Date();
      if (!isNaN(pd.getTime())) {
        const diffMonths = Math.max(
          0,
          (now.getFullYear() - pd.getFullYear()) * 12 +
            (now.getMonth() - pd.getMonth()),
        );
        const elapsed = Math.min(diffMonths, DEPRECIATION_MONTHS);
        accumulatedDep = Math.round(monthlyDep * elapsed * 100) / 100;
      }
    }

    return { monthlyDep, accumulatedDep };
  }

  private buildFilter(query: ListQuery | SummaryQuery): BitableFilter | undefined {
    const conditions: BitableFilter["conditions"] = [];

    if (query.assetType) {
      conditions.push({
        fieldName: "资产类型",
        operator: "is",
        value: [query.assetType],
      });
    }
    if (query.floor) {
      conditions.push({
        fieldName: "使用楼层",
        operator: "is",
        value: [query.floor],
      });
    }
    if (query.purchaseDepartment) {
      conditions.push({
        fieldName: "采购申请部门",
        operator: "is",
        value: [query.purchaseDepartment],
      });
    }
    if (query.payerEntity) {
      conditions.push({
        fieldName: "付费主体",
        operator: "is",
        value: [query.payerEntity],
      });
    }
    if (query.keyword) {
      conditions.push({
        fieldName: "资产名称",
        operator: "contains",
        value: [query.keyword],
      });
    }

    if (conditions.length === 0) return undefined;
    return { conjunction: "and" as const, conditions };
  }

  private getSortConfig(
    sortBy: string | undefined,
    sortOrder: "asc" | "desc",
  ) {
    const sortMap: Record<string, string> = {
      purchaseAmount: "采购金额",
      assetName: "资产名称",
      currentStock: "当前库存",
    };
    return [
      {
        fieldName: sortMap[sortBy ?? ""] ?? "采购日期",
        desc: sortOrder === "desc",
      },
    ];
  }

  /**
   * 更新资产状态
   */
  async updateAssetStatus(assetId: string, status: string): Promise<void> {
    await this.db
      .update(fixedAssets)
      .set({ assetStatus: status })
      .where(eq(fixedAssets.id, assetId));
    this.logger.log(
      `资产状态更新: assetId=${assetId}, status=${status}`,
    );
  }

  async getList(query: ListQuery): Promise<{
    items: FixedAssetItem[];
    total: number;
  }> {
    const page = Math.max(1, query.page);
    const pageSize = Math.min(100, Math.max(1, query.pageSize));
    const sortOrder = (query.sortOrder ?? "desc") as "asc" | "desc";
    const sort = this.getSortConfig(query.sortBy, sortOrder);
    const filter = this.buildFilter(query);

    const result = await this.bitable.listRecords({
      domain: this.domain,
      page,
      pageSize,
      filter,
      sort,
    });

    const items: FixedAssetItem[] = result.items.map((rec) =>
      this.toFixedAssetItem(rec),
    );

    return { items, total: result.total };
  }

  async getSummary(query: SummaryQuery): Promise<AssetSummary> {
    const filter = this.buildFilter(query);
    const allRecords = await this.bitable.getAllRecords(this.domain, filter);

    let totalValue = 0;
    let inStock = 0;
    let inUse = 0;
    let totalAccumulatedDep = 0;

    for (const rec of allRecords) {
      const amount = Number(rec.purchase_amount ?? 0);
      const status = (rec.asset_status as string) ?? "";
      const purchaseDate = (rec.purchase_date as string) ?? "";
      totalValue += amount;

      if (
        status === "in_stock" ||
        status === "在库" ||
        status === "idle" ||
        status === "闲置" ||
        !status
      ) {
        inStock += 1;
      } else if (status === "in_use" || status === "在用") {
        inUse += 1;
      }

      const { accumulatedDep } = this.calculateDepreciation(
        purchaseDate,
        amount,
      );
      totalAccumulatedDep += accumulatedDep;
    }

    return {
      totalCount: allRecords.length,
      totalValue: Math.round(totalValue * 100) / 100,
      inStockCount: inStock,
      inUseCount: inUse,
    };
  }

  async getDetail(id: string): Promise<FixedAssetDetail> {
    const rec = await this.bitable.getRecord<Record<string, unknown>>(
      this.domain,
      id,
    );

    if (!rec) {
      throw new NotFoundException("资产不存在");
    }

    const item = this.toFixedAssetItem(rec);
    const purchaseAmount = Number(rec.purchase_amount ?? 0);
    const purchaseDate = (rec.purchase_date as string) ?? "";
    const { monthlyDep, accumulatedDep } = this.calculateDepreciation(
      purchaseDate,
      purchaseAmount,
    );
    const handlerId = this.extractUserId(rec.handler);
    const ownerId = this.extractUserId(rec.owner);
    const ownerName = this.extractUserName(rec.owner);

    const operationHistory: AssetOperationRecord[] = [];

    const detail: FixedAssetDetail = {
      id: item.id,
      assetName: item.assetName,
      assetType: item.assetType,
      assetCategory: item.assetCategory,
      purchaseDate: item.purchaseDate,
      purchaseAmount: item.purchaseAmount,
      purchaseDepartment: (rec.purchase_department as string) ?? "",
      payerEntity: (rec.payer_entity as string) ?? "",
      floor: item.floor,
      handler: { userId: handlerId, name: "" },
      owner: { userId: ownerId, name: ownerName },
      lastCheckDate: "",
      currentStock: item.currentStock,
      assetStatus: item.assetStatus,
      originalValue: purchaseAmount,
      accumulatedDepreciation: accumulatedDep,
      monthlyDepreciation: monthlyDep,
      netValue: item.netValue,
      depreciationMonths: DEPRECIATION_MONTHS,
      operationHistory,
    };

    return detail;
  }

  async create(dto: CreateFixedAssetDto): Promise<{ id: string }> {
    const fields: Record<string, unknown> = {
      asset_name: dto.assetName,
      asset_type: dto.assetType,
      asset_category: dto.assetCategory ?? "",
      purchase_date: dto.purchaseDate,
      purchase_amount: dto.purchaseAmount,
      purchase_department: dto.purchaseDepartment ?? "",
      payer_entity: dto.payerEntity ?? "",
      floor: dto.floor ?? "",
      handler: dto.handler ?? "",
      asset_status: "在库",
      current_stock: dto.currentStock ?? 1,
    };

    if (dto.owner) {
      fields.owner = dto.owner;
    }

    const result = await this.bitable.createRecord(this.domain, fields);
    this.logger.log(`固定资产已创建: ${result.id}`);
    await this.invalidateAssetCaches();
    return { id: result.id };
  }

  async update(
    id: string,
    dto: UpdateFixedAssetDto,
  ): Promise<{ success: boolean }> {
    const existing = await this.bitable.getRecord(this.domain, id);
    if (!existing) {
      throw new NotFoundException("资产不存在");
    }

    const fields: Record<string, unknown> = {};
    if (dto.assetName !== undefined) fields.asset_name = dto.assetName;
    if (dto.assetType !== undefined) fields.asset_type = dto.assetType;
    if (dto.assetCategory !== undefined) fields.asset_category = dto.assetCategory;
    if (dto.purchaseDate !== undefined) fields.purchase_date = dto.purchaseDate;
    if (dto.purchaseAmount !== undefined)
      fields.purchase_amount = dto.purchaseAmount;
    if (dto.purchaseDepartment !== undefined)
      fields.purchase_department = dto.purchaseDepartment;
    if (dto.payerEntity !== undefined) fields.payer_entity = dto.payerEntity;
    if (dto.floor !== undefined) fields.floor = dto.floor;
    if (dto.handler !== undefined) fields.handler = dto.handler;
    if (dto.owner !== undefined) fields.owner = dto.owner;
    if (dto.currentStock !== undefined) fields.current_stock = dto.currentStock;

    if (Object.keys(fields).length === 0) {
      throw new BadRequestException("未提供可更新字段");
    }

    await this.bitable.updateRecord(this.domain, id, fields);
    await this.invalidateAssetCaches();
    return { success: true };
  }

  async remove(id: string): Promise<{ success: boolean }> {
    const existing = await this.bitable.getRecord(this.domain, id);
    if (!existing) {
      throw new NotFoundException("资产不存在");
    }

    await this.bitable.deleteRecord(this.domain, id);
    this.logger.log(`固定资产已删除: ${id}`);
    await this.invalidateAssetCaches();
    return { success: true };
  }

  async getCheckHistory(
    id: string,
    page = 1,
    pageSize = DEFAULT_PAGE_SIZE,
  ): Promise<PagedResponse<CheckHistoryItem>> {
    const asset = await this.bitable.getRecord<Record<string, unknown>>(
      this.domain,
      id,
    );
    if (!asset) {
      throw new NotFoundException("资产不存在");
    }

    const assetName = (asset.asset_name as string) ?? "";
    if (!assetName) {
      return { items: [], total: 0 };
    }

    const filter: BitableFilter = {
      conjunction: "and",
      conditions: [
        { fieldName: "资产名称", operator: "contains", value: [assetName] },
      ],
    };
    const result = await this.bitable.listRecords<
      Record<string, unknown>
    >({
      domain: CHECK_HISTORY_DOMAIN,
      page,
      pageSize,
      filter,
    });

    const items: CheckHistoryItem[] = result.items.map(
      (rec: Record<string, unknown>) => ({
        id: (rec.recordId as string) ?? (rec.id as string) ?? "",
        checkDate: (rec.check_date as string) ?? "",
        checker: (rec.checker as string) ?? "",
        actualQuantity: Number(rec.actual_quantity ?? 0),
        difference: Number(rec.difference ?? 0),
        status: (rec.check_status as string) ?? "unchecked",
        checkNo: (rec.check_no as string) ?? "",
      }),
    );

    return { items, total: result.total };
  }

  private readonly statusToFeishuMap: Record<string, string> = {
    in_stock: "在库",
    in_use: "在用",
    idle: "闲置",
    repairing: "维修",
    transferring: "转移中",
    scrapped: "报废",
  };

  private readonly feishuToStatusMap: Record<string, string> = {
    在库: "in_stock",
    在用: "in_use",
    闲置: "idle",
    维修: "repairing",
    转移中: "transferring",
    报废: "scrapped",
  };

  private parseAssetStatus(raw: unknown): AssetStatus {
    if (typeof raw !== "string" || !raw) return "in_stock";
    if (this.feishuToStatusMap[raw]) return this.feishuToStatusMap[raw] as AssetStatus;
    return (raw as AssetStatus);
  }

  private toFeishuStatus(status: AssetStatus): string {
    return this.statusToFeishuMap[status] ?? status;
  }

  async borrowAsset(
    id: string,
    params: {
      userId: string;
      targetUserId: string;
      expectedReturnDate?: string;
      reason?: string;
      remark?: string;
    },
  ): Promise<{ success: boolean; assetStatus: AssetStatus }> {
    const existing = await this.bitable.getRecord(this.domain, id);
    if (!existing) throw new NotFoundException("资产不存在");

    const currentStatus = this.parseAssetStatus(existing.asset_status);
    if (currentStatus !== "in_stock") {
      throw new BadRequestException(
        `领用操作的前置状态必须是在库(in_stock)，当前状态为 ${currentStatus}`,
      );
    }

    await this.bitable.updateRecord(this.domain, id, {
      asset_status: this.toFeishuStatus("in_use"),
      owner: params.targetUserId,
      current_stock: Math.max(0, (existing.current_stock as number) - 1),
    });

    await this.invalidateAssetCaches();
    return { success: true, assetStatus: "in_use" as AssetStatus };
  }

  async returnAsset(
    id: string,
    params: { userId: string; remark?: string },
  ): Promise<{ success: boolean; assetStatus: AssetStatus }> {
    const existing = await this.bitable.getRecord(this.domain, id);
    if (!existing) throw new NotFoundException("资产不存在");

    const currentStatus = this.parseAssetStatus(existing.asset_status);
    if (currentStatus !== "in_use") {
      throw new BadRequestException(
        `归还操作的前置状态必须是在用(in_use)，当前状态为 ${currentStatus}`,
      );
    }

    await this.bitable.updateRecord(this.domain, id, {
      asset_status: this.toFeishuStatus("in_stock"),
      owner: "",
      current_stock: (existing.current_stock as number) + 1,
    });

    await this.invalidateAssetCaches();
    return { success: true, assetStatus: "in_stock" as AssetStatus };
  }

  async startRepair(
    id: string,
    params: {
      userId: string;
      reason: string;
      expectedDate?: string;
      cost?: number;
      vendor?: string;
      remark?: string;
    },
  ): Promise<{ success: boolean; assetStatus: AssetStatus }> {
    const existing = await this.bitable.getRecord(this.domain, id);
    if (!existing) throw new NotFoundException("资产不存在");

    const currentStatus = this.parseAssetStatus(existing.asset_status);
    if (currentStatus !== "in_stock" && currentStatus !== "in_use") {
      throw new BadRequestException(
        `送修操作的前置状态必须是在库(in_stock)或在用(in_use)，当前状态为 ${currentStatus}`,
      );
    }

    await this.bitable.updateRecord(this.domain, id, {
      asset_status: this.toFeishuStatus("repairing"),
    });

    await this.invalidateAssetCaches();
    return { success: true, assetStatus: "repairing" as AssetStatus };
  }

  async completeRepair(
    id: string,
    params: { userId: string; actualCost?: number; remark?: string },
  ): Promise<{ success: boolean; assetStatus: AssetStatus }> {
    const existing = await this.bitable.getRecord(this.domain, id);
    if (!existing) throw new NotFoundException("资产不存在");

    const currentStatus = this.parseAssetStatus(existing.asset_status);
    if (currentStatus !== "repairing") {
      throw new BadRequestException(
        `维修完成操作的前置状态必须是维修(repairing)，当前状态为 ${currentStatus}`,
      );
    }

    await this.bitable.updateRecord(this.domain, id, {
      asset_status: this.toFeishuStatus("in_stock"),
    });

    await this.invalidateAssetCaches();
    return { success: true, assetStatus: "in_stock" as AssetStatus };
  }

  async startTransfer(
    id: string,
    params: {
      userId: string;
      targetFloor?: string;
      targetDepartment?: string;
      targetUserId?: string;
      reason?: string;
      remark?: string;
    },
  ): Promise<{ success: boolean; assetStatus: AssetStatus }> {
    const existing = await this.bitable.getRecord(this.domain, id);
    if (!existing) throw new NotFoundException("资产不存在");

    const currentStatus = this.parseAssetStatus(existing.asset_status);
    if (currentStatus !== "in_stock" && currentStatus !== "in_use") {
      throw new BadRequestException(
        `调拨操作的前置状态必须是在库(in_stock)或在用(in_use)，当前状态为 ${currentStatus}`,
      );
    }

    const updateFields: Record<string, unknown> = {
      asset_status: this.toFeishuStatus("transferring"),
    };
    if (params.targetFloor) updateFields.floor = params.targetFloor;

    await this.bitable.updateRecord(this.domain, id, updateFields);

    await this.invalidateAssetCaches();
    return { success: true, assetStatus: "transferring" as AssetStatus };
  }

  async completeTransfer(
    id: string,
    params: {
      userId: string;
      targetFloor?: string;
      targetDepartment?: string;
      targetHandler?: string;
      targetUserId?: string;
      remark?: string;
    },
  ): Promise<{ success: boolean; assetStatus: AssetStatus }> {
    const existing = await this.bitable.getRecord(this.domain, id);
    if (!existing) throw new NotFoundException("资产不存在");

    const currentStatus = this.parseAssetStatus(existing.asset_status);
    if (currentStatus !== "transferring") {
      throw new BadRequestException(
        `完成调拨操作的前置状态必须是调拨中(transferring)，当前状态为 ${currentStatus}`,
      );
    }

    const updateFields: Record<string, unknown> = {
      asset_status: this.toFeishuStatus("in_stock"),
    };
    if (params.targetFloor) updateFields.floor = params.targetFloor;
    if (params.targetDepartment)
      updateFields.purchase_department = params.targetDepartment;
    if (params.targetHandler) updateFields.handler = params.targetHandler;
    if (params.targetUserId) updateFields.owner = params.targetUserId;

    await this.bitable.updateRecord(this.domain, id, updateFields);
    await this.invalidateAssetCaches();
    return { success: true, assetStatus: "in_stock" as AssetStatus };
  }

  async scrapAsset(
    id: string,
    params: {
      userId: string;
      scrapValue?: number;
      reason: string;
      remark?: string;
    },
  ): Promise<{ success: boolean; assetStatus: AssetStatus }> {
    const existing = await this.bitable.getRecord(this.domain, id);
    if (!existing) throw new NotFoundException("资产不存在");

    const currentStatus = this.parseAssetStatus(existing.asset_status);
    if (
      currentStatus !== "in_stock" &&
      currentStatus !== "in_use" &&
      currentStatus !== "repairing"
    ) {
      throw new BadRequestException(
        `报废操作的前置状态必须是在库(in_stock)、在用(in_use)或维修(repairing)，当前状态为 ${currentStatus}`,
      );
    }

    await this.bitable.updateRecord(this.domain, id, {
      asset_status: this.toFeishuStatus("scrapped"),
    });

    await this.invalidateAssetCaches();
    return { success: true, assetStatus: "scrapped" as AssetStatus };
  }

  async batchUpdateCategory(
    ids: string[],
    assetCategory: string,
    _userId: string,
  ): Promise<BatchOperationResult> {
    if (ids.length === 0) {
      return { successCount: 0, failedCount: 0, failedItems: [] };
    }
    const updated = await this.db
      .update(fixedAssets)
      .set({ assetCategory })
      .where(inArray(fixedAssets.id, ids))
      .returning({ id: fixedAssets.id });
    await this.invalidateAssetCaches();
    return {
      successCount: updated.length,
      failedCount: ids.length - updated.length,
      failedItems: [],
    };
  }

  async batchUpdateFloor(
    ids: string[],
    floor: string,
    _userId: string,
  ): Promise<BatchOperationResult> {
    if (ids.length === 0) {
      return { successCount: 0, failedCount: 0, failedItems: [] };
    }
    const updated = await this.db
      .update(fixedAssets)
      .set({ floor })
      .where(inArray(fixedAssets.id, ids))
      .returning({ id: fixedAssets.id });
    await this.invalidateAssetCaches();
    return {
      successCount: updated.length,
      failedCount: ids.length - updated.length,
      failedItems: [],
    };
  }

  async batchTransfer(
    ids: string[],
    _userId: string,
    params: {
      targetFloor?: string;
      targetDepartment?: string;
      targetHandler?: string;
      targetUserId?: string;
      reason?: string;
      remark?: string;
    },
  ): Promise<BatchOperationResult> {
    if (ids.length === 0) {
      return { successCount: 0, failedCount: 0, failedItems: [] };
    }
    const patch: Record<string, unknown> = {
      assetStatus: "in_stock",
    };
    if (params.targetFloor) patch.floor = params.targetFloor;
    if (params.targetDepartment)
      patch.purchaseDepartment = params.targetDepartment;
    if (params.targetHandler) patch.handler = params.targetHandler;
    if (params.targetUserId) patch.owner = params.targetUserId;
    const updated = await this.db
      .update(fixedAssets)
      .set(patch)
      .where(inArray(fixedAssets.id, ids))
      .returning({ id: fixedAssets.id });
    await this.invalidateAssetCaches();
    return {
      successCount: updated.length,
      failedCount: ids.length - updated.length,
      failedItems: [],
    };
  }

  async batchScrap(
    ids: string[],
    _userId: string,
    _reason: string,
    _remark?: string,
  ): Promise<BatchOperationResult> {
    if (ids.length === 0) {
      return { successCount: 0, failedCount: 0, failedItems: [] };
    }
    const updated = await this.db
      .update(fixedAssets)
      .set({ assetStatus: "scrapped" })
      .where(inArray(fixedAssets.id, ids))
      .returning({ id: fixedAssets.id });
    await this.invalidateAssetCaches();
    return {
      successCount: updated.length,
      failedCount: ids.length - updated.length,
      failedItems: [],
    };
  }

  async getOperationHistory(
    id: string,
    page = 1,
    pageSize = DEFAULT_PAGE_SIZE,
  ): Promise<PagedResponse<AssetOperationRecord>> {
    const asset = await this.bitable.getRecord<Record<string, unknown>>(
      this.domain,
      id,
    );
    if (!asset) {
      throw new NotFoundException("资产不存在");
    }

    const assetName = (asset.asset_name as string) ?? "";
    if (!assetName) {
      return { items: [], total: 0 };
    }

    // 从盘点记录中推断操作历史：已盘点/异常盘点视为一次操作记录
    const filter: BitableFilter = {
      conjunction: "and",
      conditions: [
        { fieldName: "资产名称", operator: "contains", value: [assetName] },
      ],
    };
    const result = await this.bitable.listRecords<
      Record<string, unknown>
    >({
      domain: CHECK_HISTORY_DOMAIN,
      page,
      pageSize,
      filter,
    });

    const items: AssetOperationRecord[] = result.items.map(
      (rec: Record<string, unknown>) => {
        const diff = Number(rec.difference ?? 0);
        const operationType: AssetOperationType =
          diff < 0 ? "repair_start" : "status_change";
        return {
          id: (rec.recordId as string) ?? (rec.id as string) ?? "",
          assetId: id,
          operationType,
          operatorId: (rec.checker as string) ?? "",
          remark: (rec.remark as string) ?? undefined,
          createdAt: (rec.check_date as string) ?? "",
        };
      },
    );

    return { items, total: result.total };
  }

  private readonly USER_OPTIONS_CACHE_KEY = "fa:user-opts";
  private readonly USER_OPTIONS_CACHE_TTL = 5 * 60 * 1000;

  async getUserOptions(): Promise<
    Array<{ id: string; name: string }>
  > {
    const cached = await this.cache.get<Array<{ id: string; name: string }>>(
      this.USER_OPTIONS_CACHE_KEY,
    );
    if (cached) return cached;

    const userMap = new Map<string, string>();
    const domains: Array<{ domain: string; fields: string[] }> = [
      { domain: "fixed_assets", fields: ["handler", "owner"] },
      { domain: "expenses", fields: ["handler"] },
      { domain: "inventory_checks", fields: ["checker"] },
    ];

    for (const { domain, fields } of domains) {
      try {
        const records = await this.bitable.getAllRecords<
          Record<string, unknown>
        >(domain);
        for (const rec of records) {
          for (const field of fields) {
            const userId = this.extractUserId(rec[field]);
            const userName = this.extractUserName(rec[field]);
            if (userId && !userMap.has(userId)) {
              userMap.set(userId, userName);
            }
          }
        }
      } catch (err) {
        this.logger.error(
          `getAllRecords failed for domain ${domain}: ${JSON.stringify(err)}`,
        );
      }
    }

    const ids = Array.from(userMap.keys()).filter(
      (id) => id && /^\d+$/.test(id),
    );
    if (ids.length > 0) {
      try {
        const batchSize = 100;
        for (let i = 0; i < ids.length; i += batchSize) {
          const batch = ids.slice(i, i + batchSize);
          const users = await this.authnService.listUsersByIds(batch);
          for (let j = 0; j < batch.length; j++) {
            const user = users[j];
            if (!user) continue;
            const name =
              (user.name as { zh_cn?: string; en_us?: string } | undefined)
                ?.zh_cn ||
              (user.name as { zh_cn?: string; en_us?: string } | undefined)
                ?.en_us ||
              "";
            if (name) userMap.set(batch[j], name);
          }
        }
      } catch (err) {
        this.logger.error(
          `listUsersByIds failed: ${JSON.stringify(err)}`,
        );
      }
    }
    const result: Array<{ id: string; name: string }> = [];
    for (const [id, name] of userMap.entries()) {
      result.push({ id, name: name || id });
    }
    const sorted = result.sort((a, b) =>
      a.name.localeCompare(b.name, "zh"),
    );

    await this.cache.set(
      this.USER_OPTIONS_CACHE_KEY,
      sorted,
      this.USER_OPTIONS_CACHE_TTL,
    );
    return sorted;
  }
}
