import { Controller, Get, Query, Req } from "@nestjs/common";
import { NeedLogin } from "@lark-apaas/fullstack-nestjs-core";
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from "@nestjs/swagger";
import { DashboardService } from "./dashboard.service";
import type {
  DashboardAssetOverview,
  DashboardCategoryItem,
  DashboardDepartmentItem,
  DashboardEntityItem,
  DashboardExpenseOverview,
  DashboardFloorItem,
  DashboardTrendItem,
} from "@shared/api.interface";

@ApiTags("综合看板")
@Controller("api/dashboard")
@NeedLogin()
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @ApiOperation({ summary: "获取支出总览" })
  @ApiResponse({ status: 200, description: "成功" })
  @Get("expense-overview")
  async getExpenseOverview(): Promise<DashboardExpenseOverview> {
    return this.dashboardService.getExpenseOverview();
  }

  @ApiOperation({ summary: "获取支出趋势（按月）" })
  @ApiQuery({ name: "months", required: false, description: "月数", example: "12" })
  @ApiResponse({ status: 200, description: "成功" })
  @Get("expense-trend")
  async getExpenseTrend(
    @Query("months") months?: string,
  ): Promise<{ items: DashboardTrendItem[] }> {
    const n = months ? parseInt(months, 10) : 12;
    return this.dashboardService.getExpenseTrend(Number.isFinite(n) ? n : 12);
  }

  @ApiOperation({ summary: "获取支出分类统计" })
  @ApiResponse({ status: 200, description: "成功" })
  @Get("expense-by-category")
  async getExpenseByCategory(): Promise<{
    items: DashboardCategoryItem[];
  }> {
    return this.dashboardService.getExpenseByCategory();
  }

  @ApiOperation({ summary: "获取支出主体统计" })
  @ApiResponse({ status: 200, description: "成功" })
  @Get("expense-by-entity")
  async getExpenseByEntity(): Promise<{ items: DashboardEntityItem[] }> {
    return this.dashboardService.getExpenseByEntity();
  }

  @ApiOperation({ summary: "获取支出楼层统计" })
  @ApiResponse({ status: 200, description: "成功" })
  @Get("expense-by-floor")
  async getExpenseByFloor(): Promise<{ items: DashboardFloorItem[] }> {
    return this.dashboardService.getExpenseByFloor();
  }

  @ApiOperation({ summary: "获取支出部门统计" })
  @ApiResponse({ status: 200, description: "成功" })
  @Get("expense-by-department")
  async getExpenseByDepartment(
    @Query("limit") limit?: string,
  ): Promise<{ items: DashboardDepartmentItem[] }> {
    const n = limit ? parseInt(limit, 10) : 10;
    return this.dashboardService.getExpenseByDepartment(
      Number.isFinite(n) ? n : 10,
    );
  }

  @ApiOperation({ summary: "获取资产总览" })
  @ApiResponse({ status: 200, description: "成功" })
  @Get("asset-overview")
  async getAssetOverview(): Promise<DashboardAssetOverview> {
    return this.dashboardService.getAssetOverview();
  }

  @ApiOperation({ summary: "获取支出预算执行情况" })
  @ApiResponse({ status: 200, description: "成功" })
  @Get("expense-budget-execution")
  async getExpenseBudgetExecution(): Promise<{
    items: Array<{ month: string; budget: number; actual: number; executionRate: number }>;
  }> {
    return this.dashboardService.getExpenseBudgetExecution();
  }

  @ApiOperation({ summary: "获取支出排行榜" })
  @ApiResponse({ status: 200, description: "成功" })
  @Get("expense-ranking")
  async getExpenseRanking(): Promise<{
    byDepartment: Array<{ name: string; amount: number }>;
    byCategory: Array<{ name: string; amount: number }>;
    byHandler: Array<{ name: string; amount: number }>;
  }> {
    return this.dashboardService.getExpenseRanking();
  }

  @ApiOperation({ summary: "获取资产状态分布" })
  @ApiResponse({ status: 200, description: "成功" })
  @Get("asset-status-distribution")
  async getAssetStatusDistribution(): Promise<
    Array<{ status: string; count: number; value: number }>
  > {
    return this.dashboardService.getAssetStatusDistribution();
  }

  @ApiOperation({ summary: "获取资产折旧汇总" })
  @ApiResponse({ status: 200, description: "成功" })
  @Get("asset-depreciation")
  async getAssetDepreciation(): Promise<{
    originalValue: number;
    accumulatedDepreciation: number;
    netValue: number;
    monthlyDepreciation: number;
  }> {
    return this.dashboardService.getAssetDepreciation();
  }

  @ApiOperation({ summary: "获取待维修资产列表" })
  @ApiResponse({ status: 200, description: "成功" })
  @Get("asset-repair-pending")
  async getAssetRepairPending(): Promise<
    Array<{
      id: string;
      assetName: string;
      assetType: string;
      status: string;
      repairReason?: string;
      repairDate?: string;
    }>
  > {
    return this.dashboardService.getAssetRepairPending();
  }
}
