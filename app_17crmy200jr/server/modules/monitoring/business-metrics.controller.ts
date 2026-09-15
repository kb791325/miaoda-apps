import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { BusinessMetricsService } from './business-metrics.service';
import type {
  BusinessMetricsOverview,
  ExpenseMetrics,
  AssetMetrics,
  InventoryMetrics,
  BudgetMetrics,
  MetricTrend,
} from '@shared/api.interface';

@ApiTags('业务指标')
@Controller('api/monitoring/business')
export class BusinessMetricsController {
  constructor(
    private readonly businessMetricsService: BusinessMetricsService,
  ) {}

  @ApiOperation({ summary: '获取业务指标总览' })
  @ApiResponse({ status: 200, description: '成功' })
  @Get('overview')
  async getOverview(): Promise<BusinessMetricsOverview> {
    return this.businessMetricsService.getOverview();
  }

  @ApiOperation({ summary: '获取支出指标' })
  @ApiResponse({ status: 200, description: '成功' })
  @Get('expenses')
  async getExpenseMetrics(): Promise<ExpenseMetrics> {
    return this.businessMetricsService.getExpenseMetrics();
  }

  @ApiOperation({ summary: '获取资产指标' })
  @ApiResponse({ status: 200, description: '成功' })
  @Get('assets')
  async getAssetMetrics(): Promise<AssetMetrics> {
    return this.businessMetricsService.getAssetMetrics();
  }

  @ApiOperation({ summary: '获取盘点指标' })
  @ApiResponse({ status: 200, description: '成功' })
  @Get('inventory')
  async getInventoryMetrics(): Promise<InventoryMetrics> {
    return this.businessMetricsService.getInventoryMetrics();
  }

  @ApiOperation({ summary: '获取预算指标' })
  @ApiResponse({ status: 200, description: '成功' })
  @Get('budget')
  async getBudgetMetrics(): Promise<BudgetMetrics> {
    return this.businessMetricsService.getBudgetMetrics();
  }

  @ApiOperation({ summary: '获取指标趋势' })
  @ApiQuery({ name: 'type', required: true, type: String })
  @ApiQuery({ name: 'days', required: false, type: Number })
  @ApiResponse({ status: 200, description: '成功' })
  @Get('trends')
  async getTrends(
    @Query('type') type: string,
    @Query('days') daysStr?: string,
  ): Promise<MetricTrend[]> {
    const days = daysStr ? parseInt(daysStr, 10) : 7;
    return this.businessMetricsService.getTrends(type, days);
  }
}