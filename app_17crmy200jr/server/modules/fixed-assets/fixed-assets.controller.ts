import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
} from "@nestjs/common";
import { NeedLogin } from "@lark-apaas/fullstack-nestjs-core";
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import { FixedAssetsService } from "./fixed-assets.service";
import type {
  AssetOperationRecord,
  AssetStatus,
  AssetSummary,
  AssetUserOption,
  BatchOperationResult,
  CheckHistoryItem,
  FixedAssetDetail,
  FixedAssetItem,
  PagedResponse,
} from "@shared/api.interface";
import { CreateFixedAssetDto } from './dto/create-fixed-asset.dto';
import { UpdateFixedAssetDto } from './dto/update-fixed-asset.dto';
import { AuditAction } from '@server/common/interceptors/audit.interceptor';

interface ListQuery {
  page?: string;
  pageSize?: string;
  assetType?: string;
  floor?: string;
  purchaseDepartment?: string;
  payerEntity?: string;
  owner?: string;
  keyword?: string;
  sortBy?: "currentStock" | "purchaseAmount" | "assetName";
  sortOrder?: "asc" | "desc";
}

interface CheckHistoryQuery {
  page?: string;
  pageSize?: string;
}

interface BorrowBody {
  targetUserId: string;
  expectedReturnDate?: string;
  reason?: string;
  remark?: string;
}

interface ReturnBody {
  remark?: string;
}

interface RepairStartBody {
  reason: string;
  expectedDate?: string;
  cost?: number;
  vendor?: string;
  remark?: string;
}

interface RepairCompleteBody {
  actualCost?: number;
  remark?: string;
}

interface TransferStartBody {
  targetDepartment?: string;
  targetFloor?: string;
  targetUserId?: string;
  reason?: string;
  remark?: string;
}

interface TransferCompleteBody {
  remark?: string;
}

interface ScrapBody {
  reason: string;
  remark?: string;
}

@ApiTags('固定资产')
@Controller("api/fixed-assets")
@NeedLogin()
export class FixedAssetsController {
  constructor(private readonly fixedAssetsService: FixedAssetsService) {}

  // 1. 汇总统计（静态路由，必须在 :id 之前）
  @ApiOperation({ summary: '获取资产汇总统计' })
  @ApiResponse({ status: 200, description: '成功' })
  @ApiResponse({ status: 400, description: '参数验证失败' })
  @Get("summary")
  async getSummary(
    @Query() query: ListQuery,
  ): Promise<AssetSummary> {
    return this.fixedAssetsService.getSummary({
      assetType: query.assetType,
      floor: query.floor,
      purchaseDepartment: query.purchaseDepartment,
      payerEntity: query.payerEntity,
      owner: query.owner,
      keyword: query.keyword,
    });
  }

  // 1.5 用户选项列表（必须在 :id 之前）
  @ApiOperation({ summary: '获取资产用户选项列表' })
  @ApiResponse({ status: 200, description: '成功' })
  @Get("user-options")
  async getUserOptions(): Promise<AssetUserOption[]> {
    return this.fixedAssetsService.getUserOptions();
  }

  // 2. 资产列表
  @ApiOperation({ summary: '获取资产列表（分页、筛选、排序）' })
  @ApiQuery({ name: 'page', required: false, description: '页码' })
  @ApiQuery({ name: 'pageSize', required: false, description: '每页条数' })
  @ApiQuery({ name: 'assetType', required: false, description: '资产类型' })
  @ApiQuery({ name: 'floor', required: false, description: '楼层' })
  @ApiQuery({ name: 'purchaseDepartment', required: false, description: '采购部门' })
  @ApiQuery({ name: 'payerEntity', required: false, description: '付款主体' })
  @ApiQuery({ name: 'owner', required: false, description: '责任人' })
  @ApiQuery({ name: 'keyword', required: false, description: '关键词搜索' })
  @ApiQuery({ name: 'sortBy', required: false, description: '排序字段' })
  @ApiQuery({ name: 'sortOrder', required: false, description: '排序方向' })
  @ApiResponse({ status: 200, description: '成功' })
  @Get()
  async getList(
    @Query() query: ListQuery,
  ): Promise<PagedResponse<FixedAssetItem>> {
    const page = Math.max(1, parseInt(query.page ?? "1", 10) || 1);
    const pageSize = Math.min(
      100,
      Math.max(1, parseInt(query.pageSize ?? "20", 10) || 20),
    );

    return this.fixedAssetsService.getList({
      page,
      pageSize,
      assetType: query.assetType,
      floor: query.floor,
      purchaseDepartment: query.purchaseDepartment,
      payerEntity: query.payerEntity,
      owner: query.owner,
      keyword: query.keyword,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });
  }

  // 3. 盘点历史（必须在 :id 详情之前）
  @ApiOperation({ summary: '获取资产盘点历史' })
  @ApiParam({ name: 'id', description: '资产ID' })
  @ApiResponse({ status: 200, description: '成功' })
  @Get(":id/check-history")
  async getCheckHistory(
    @Param("id") id: string,
    @Query() query: CheckHistoryQuery,
  ): Promise<PagedResponse<CheckHistoryItem>> {
    const page = Math.max(1, parseInt(query.page ?? "1", 10) || 1);
    const pageSize = Math.min(
      50,
      Math.max(1, parseInt(query.pageSize ?? "10", 10) || 10),
    );
    return this.fixedAssetsService.getCheckHistory(id, page, pageSize);
  }

  // 3.5 操作历史（必须在 :id 详情之前）
  @ApiOperation({ summary: '获取资产操作历史' })
  @ApiParam({ name: 'id', description: '资产ID' })
  @ApiResponse({ status: 200, description: '成功' })
  @Get(":id/operation-history")
  async getOperationHistory(
    @Param("id") id: string,
    @Query() query: CheckHistoryQuery,
  ): Promise<PagedResponse<AssetOperationRecord>> {
    const page = Math.max(1, parseInt(query.page ?? "1", 10) || 1);
    const pageSize = Math.min(
      50,
      Math.max(1, parseInt(query.pageSize ?? "10", 10) || 10),
    );
    return this.fixedAssetsService.getOperationHistory(id, page, pageSize);
  }

  // 4. 资产详情
  @ApiOperation({ summary: '获取资产详情' })
  @ApiParam({ name: 'id', description: '资产ID' })
  @ApiResponse({ status: 200, description: '成功' })
  @ApiResponse({ status: 404, description: '资源不存在' })
  @Get(":id")
  async getDetail(
    @Param("id") id: string,
  ): Promise<FixedAssetDetail> {
    return this.fixedAssetsService.getDetail(id);
  }

  // 5. 新增资产
  @NeedLogin()
  @ApiOperation({ summary: '新增资产' })
  @ApiResponse({ status: 200, description: '成功' })
  @ApiResponse({ status: 400, description: '参数验证失败' })
  @Post()
  @AuditAction('fixed_asset', 'CREATE', 'fixed_asset')
  async create(
    @Body() body: CreateFixedAssetDto,
  ): Promise<{ id: string }> {
    return this.fixedAssetsService.create(body);
  }

  // 5.5 批量操作（静态路由，必须在 :id 之前）

  @NeedLogin()
  @ApiOperation({ summary: '批量更新资产分类' })
  @ApiResponse({ status: 200, description: '成功' })
  @Post("batch-update-category")
  async batchUpdateCategory(
    @Req() req: { userContext: { userId: string } },
    @Body() body: { ids: string[]; assetCategory: string },
  ): Promise<BatchOperationResult> {
    const { userId } = req.userContext;
    return this.fixedAssetsService.batchUpdateCategory(
      body.ids,
      body.assetCategory,
      userId,
    );
  }

  @NeedLogin()
  @ApiOperation({ summary: '批量更新资产楼层' })
  @ApiResponse({ status: 200, description: '成功' })
  @Post("batch-update-floor")
  async batchUpdateFloor(
    @Req() req: { userContext: { userId: string } },
    @Body() body: { ids: string[]; floor: string },
  ): Promise<BatchOperationResult> {
    const { userId } = req.userContext;
    return this.fixedAssetsService.batchUpdateFloor(
      body.ids,
      body.floor,
      userId,
    );
  }

  @NeedLogin()
  @ApiOperation({ summary: '批量资产调拨' })
  @ApiResponse({ status: 200, description: '成功' })
  @Post("batch-transfer")
  async batchTransfer(
    @Req() req: { userContext: { userId: string } },
    @Body() body: {
      ids: string[];
      targetDepartment?: string;
      targetFloor?: string;
      targetUserId?: string;
      reason?: string;
      remark?: string;
    },
  ): Promise<BatchOperationResult> {
    const { userId } = req.userContext;
    return this.fixedAssetsService.batchTransfer(body.ids, userId, {
      targetDepartment: body.targetDepartment,
      targetFloor: body.targetFloor,
      targetUserId: body.targetUserId,
      reason: body.reason,
      remark: body.remark,
    });
  }

  @NeedLogin()
  @ApiOperation({ summary: '批量资产报废' })
  @ApiResponse({ status: 200, description: '成功' })
  @Post("batch-scrap")
  async batchScrap(
    @Req() req: { userContext: { userId: string } },
    @Body() body: { ids: string[]; reason: string; remark?: string },
  ): Promise<BatchOperationResult> {
    const { userId } = req.userContext;
    return this.fixedAssetsService.batchScrap(
      body.ids,
      userId,
      body.reason,
      body.remark,
    );
  }

  // 6. 编辑资产
  @NeedLogin()
  @ApiOperation({ summary: '编辑资产' })
  @ApiParam({ name: 'id', description: '资产ID' })
  @ApiResponse({ status: 200, description: '成功' })
  @ApiResponse({ status: 400, description: '参数验证失败' })
  @ApiResponse({ status: 404, description: '资源不存在' })
  @Put(":id")
  @AuditAction('fixed_asset', 'UPDATE', 'fixed_asset')
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateFixedAssetDto,
  ): Promise<{ success: boolean }> {
    return this.fixedAssetsService.update(id, dto);
  }

  // 7. 删除资产
  @NeedLogin()
  @ApiOperation({ summary: '删除资产' })
  @ApiParam({ name: 'id', description: '资产ID' })
  @ApiResponse({ status: 200, description: '成功' })
  @ApiResponse({ status: 404, description: '资源不存在' })
  @Delete(":id")
  @AuditAction('fixed_asset', 'DELETE', 'fixed_asset')
  async remove(
    @Param("id") id: string,
  ): Promise<{ success: boolean }> {
    return this.fixedAssetsService.remove(id);
  }

  // 8. 领用资产
  @NeedLogin()
  @ApiOperation({ summary: '领用资产' })
  @ApiParam({ name: 'id', description: '资产ID' })
  @ApiResponse({ status: 200, description: '成功' })
  @Post(":id/borrow")
  @AuditAction('fixed_asset', 'BORROW', 'fixed_asset')
  async borrow(
    @Req() req: { userContext: { userId: string } },
    @Param("id") id: string,
    @Body() body: BorrowBody,
  ): Promise<{ success: boolean; assetStatus: AssetStatus }> {
    const { userId } = req.userContext;
    return this.fixedAssetsService.borrowAsset(id, {
      userId,
      targetUserId: body.targetUserId,
      expectedReturnDate: body.expectedReturnDate,
      reason: body.reason,
      remark: body.remark,
    });
  }

  // 9. 归还资产
  @NeedLogin()
  @ApiOperation({ summary: '归还资产' })
  @ApiParam({ name: 'id', description: '资产ID' })
  @ApiResponse({ status: 200, description: '成功' })
  @Post(":id/return")
  @AuditAction('fixed_asset', 'RETURN', 'fixed_asset')
  async returnAsset(
    @Req() req: { userContext: { userId: string } },
    @Param("id") id: string,
    @Body() body: ReturnBody,
  ): Promise<{ success: boolean; assetStatus: AssetStatus }> {
    const { userId } = req.userContext;
    return this.fixedAssetsService.returnAsset(id, {
      userId,
      remark: body.remark,
    });
  }

  // 10. 发起维修
  @NeedLogin()
  @ApiOperation({ summary: '资产送修' })
  @ApiParam({ name: 'id', description: '资产ID' })
  @ApiResponse({ status: 200, description: '成功' })
  @Post(":id/repair/start")
  async startRepair(
    @Req() req: { userContext: { userId: string } },
    @Param("id") id: string,
    @Body() body: RepairStartBody,
  ): Promise<{ success: boolean; assetStatus: AssetStatus }> {
    const { userId } = req.userContext;
    return this.fixedAssetsService.startRepair(id, {
      userId,
      reason: body.reason,
      expectedDate: body.expectedDate,
      cost: body.cost,
      vendor: body.vendor,
      remark: body.remark,
    });
  }

  // 11. 完成维修
  @NeedLogin()
  @ApiOperation({ summary: '资产维修完成' })
  @ApiParam({ name: 'id', description: '资产ID' })
  @ApiResponse({ status: 200, description: '成功' })
  @Post(":id/repair/complete")
  async completeRepair(
    @Req() req: { userContext: { userId: string } },
    @Param("id") id: string,
    @Body() body: RepairCompleteBody,
  ): Promise<{ success: boolean; assetStatus: AssetStatus }> {
    const { userId } = req.userContext;
    return this.fixedAssetsService.completeRepair(id, {
      userId,
      actualCost: body.actualCost,
      remark: body.remark,
    });
  }

  // 12. 发起调拨
  @NeedLogin()
  @ApiOperation({ summary: '发起资产调拨' })
  @ApiParam({ name: 'id', description: '资产ID' })
  @ApiResponse({ status: 200, description: '成功' })
  @Post(":id/transfer/start")
  async startTransfer(
    @Req() req: { userContext: { userId: string } },
    @Param("id") id: string,
    @Body() body: TransferStartBody,
  ): Promise<{ success: boolean; assetStatus: AssetStatus }> {
    const { userId } = req.userContext;
    return this.fixedAssetsService.startTransfer(id, {
      userId,
      targetDepartment: body.targetDepartment,
      targetFloor: body.targetFloor,
      targetUserId: body.targetUserId,
      reason: body.reason,
      remark: body.remark,
    });
  }

  // 13. 完成调拨
  @NeedLogin()
  @ApiOperation({ summary: '完成资产调拨' })
  @ApiParam({ name: 'id', description: '资产ID' })
  @ApiResponse({ status: 200, description: '成功' })
  @Post(":id/transfer/complete")
  async completeTransfer(
    @Req() req: { userContext: { userId: string } },
    @Param("id") id: string,
    @Body() body: TransferCompleteBody,
  ): Promise<{ success: boolean; assetStatus: AssetStatus }> {
    const { userId } = req.userContext;
    return this.fixedAssetsService.completeTransfer(id, {
      userId,
      remark: body.remark,
    });
  }

  // 14. 报废资产
  @NeedLogin()
  @ApiOperation({ summary: '资产报废' })
  @ApiParam({ name: 'id', description: '资产ID' })
  @ApiResponse({ status: 200, description: '成功' })
  @Post(":id/scrap")
  async scrap(
    @Req() req: { userContext: { userId: string } },
    @Param("id") id: string,
    @Body() body: ScrapBody,
  ): Promise<{ success: boolean; assetStatus: AssetStatus }> {
    const { userId } = req.userContext;
    return this.fixedAssetsService.scrapAsset(id, {
      userId,
      reason: body.reason,
      remark: body.remark,
    });
  }

}
