import { Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from "@lark-apaas/fullstack-nestjs-core";
import { eq } from "drizzle-orm";
import { inventoryChecks } from "@server/database/schema";
import { FeishuBitableService } from "../feishu-bitable/feishu-bitable.service";
import { CacheService } from "@server/common/cache/cache.service";
import type {
  ConfirmDiffResponse,
  UpdateCheckResponse,
} from "@shared/api.interface";

@Injectable()
export class InventoryChecksService {
  private readonly logger = new Logger(InventoryChecksService.name);
  private readonly checksDomain = "inventory_checks";
  private readonly tasksDomain = "inventory_tasks";
  private readonly ASSET_META_MARKER = "[ASSET_META]";

  constructor(
    private readonly bitable: FeishuBitableService,
    private readonly cache: CacheService,
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  private async invalidateInventoryCaches(): Promise<void> {
    await this.cache.deleteByPrefix("report:inventory");
    await this.cache.deleteByPrefix("dash:inventory:");
  }

  async updateCheck(
    id: string,
    dto: { actualQuantity: number; remark?: string; status?: string },
    _userId: string,
  ): Promise<UpdateCheckResponse & { id: string; actualQuantity: number; difference: number; status: string; isAbnormal: boolean; remark: string }> {
    const check = await this.bitable.getRecord<Record<string, unknown>>(
      this.checksDomain,
      id,
    );
    if (!check) {
      throw new NotFoundException("盘点记录不存在");
    }

    const bookQuantity = Number(check.book_quantity ?? 0);
    const difference = dto.actualQuantity - bookQuantity;
    const isAbnormal = difference !== 0;
    const newStatus = dto.status || "checked";

    const oldRemark = (check.remark as string) ?? "";
    const metaPrefix = oldRemark.startsWith(this.ASSET_META_MARKER)
      ? oldRemark.split("\n")[0] + "\n"
      : "";
    const userRemark = dto.remark !== undefined ? dto.remark : oldRemark.startsWith(this.ASSET_META_MARKER)
      ? (oldRemark.split("\n")[1] || "")
      : oldRemark;
    const storedRemark = metaPrefix + userRemark;

    await this.bitable.updateRecord(this.checksDomain, id, {
      actual_quantity: dto.actualQuantity,
      status: newStatus,
      remark: storedRemark,
    });

    await this.invalidateInventoryCaches();

    return {
      id,
      actualQuantity: dto.actualQuantity,
      difference,
      status: newStatus,
      isAbnormal,
      remark: userRemark,
    };
  }

  async confirmDiff(
    id: string,
    dto: {
      confirmType: "profit" | "loss" | "adjust";
      adjustStock?: number;
      remark?: string;
    },
    _userId: string,
  ): Promise<ConfirmDiffResponse> {
    const check = await this.bitable.getRecord<Record<string, unknown>>(
      this.checksDomain,
      id,
    );
    if (!check) {
      throw new NotFoundException("盘点记录不存在");
    }

    await this.bitable.updateRecord(this.checksDomain, id, {
      status: "confirmed",
    });

    // 优先按资产ID匹配，匹配不到再 fallback 到名称匹配，更新 Bitable 中对应资产的 current_stock
    const rawRemark = (check.remark as string) ?? "";
    let assetIdFromMeta = "";
    if (rawRemark.startsWith(this.ASSET_META_MARKER)) {
      const firstLine = rawRemark.split("\n")[0];
      const parts = firstLine.slice(this.ASSET_META_MARKER.length).split("|");
      if (parts.length >= 4) assetIdFromMeta = parts[3] || "";
    }
    const assetName = (check.asset_name as string) ?? "";
    const bookQuantity = Number(check.book_quantity ?? 0);
    const actualQuantity = Number(check.actual_quantity ?? 0);

    let assetUpdated = false;
    if ((assetIdFromMeta || assetName) && actualQuantity !== bookQuantity) {
      try {
        const allAssets = await this.bitable.getAllRecords(
          "fixed_assets",
        );
        const assetById = new Map<string, string>();
        const assetByName = new Map<string, string>();
        for (const a of allAssets) {
          const name = (a.asset_name as string) ?? "";
          const rid = (a.recordId as string) ?? (a.id as string) ?? "";
          if (rid) {
            assetById.set(rid, rid);
          }
          if (name && rid && !assetByName.has(name)) {
            assetByName.set(name, rid);
          }
        }

        let matchedAssetId: string | undefined;
        if (assetIdFromMeta) {
          matchedAssetId = assetById.get(assetIdFromMeta);
        }
        if (!matchedAssetId && assetName) {
          matchedAssetId = assetByName.get(assetName);
        }

        if (matchedAssetId) {
          let newStock: number;
          if (dto.confirmType === "adjust" && dto.adjustStock !== undefined) {
            newStock = dto.adjustStock;
          } else {
            newStock = actualQuantity;
          }
          await this.bitable.updateRecord("fixed_assets", matchedAssetId, {
            current_stock: newStock,
          });
          assetUpdated = true;
        }
      } catch (err) {
        this.logger.error(
          `确认差异更新资产库存失败: ${JSON.stringify({ checkId: id, assetName, assetId: assetIdFromMeta, err: String(err) })}`,
        );
      }
    }

    await this.invalidateInventoryCaches();
    if (assetUpdated) {
      await this.cache.deleteByPrefix("dash:asset");
      await this.cache.deleteByPrefix("report:asset");
    }

    return { success: true };
  }

  async batchUpdateChecks(
    _taskId: string,
    updates: Array<{ id: string; actualQuantity: number; remark?: string }>,
    _userId: string,
  ): Promise<{ successCount: number; failedCount: number }> {
    let successCount = 0;
    let failedCount = 0;

    for (const upd of updates) {
      try {
        const [check] = await this.db
          .select({
            bookQuantity: inventoryChecks.bookQuantity,
          })
          .from(inventoryChecks)
          .where(eq(inventoryChecks.id, upd.id));

        if (!check) {
          failedCount += 1;
          continue;
        }

        const bookQuantity: number = check.bookQuantity ?? 0;
        const difference: number = upd.actualQuantity - bookQuantity;
        const status: string =
          difference !== 0 ? "abnormal" : "checked";

        await this.db
          .update(inventoryChecks)
          .set({
            actualQuantity: upd.actualQuantity,
            difference,
            status,
            remark: upd.remark ?? null,
          })
          .where(eq(inventoryChecks.id, upd.id));

        successCount += 1;
      } catch {
        failedCount += 1;
      }
    }

    await this.invalidateInventoryCaches();
    return { successCount, failedCount };
  }
}
