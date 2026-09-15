import {
  Controller,
  Get,
  Post,
  Patch,
  Query,
  Param,
  Body,
} from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import { InventoryDashboardService } from './inventory-dashboard.service';
import { ResolveAbnormalDto } from './dto/resolve-abnormal.dto';
import type {
  InventoryOverview,
  OwnerMatrixRow,
  TimelineOwner,
  StockOverview,
  StockTrendItem,
  AbnormalCheckItem,
  PagedResponse,
} from '@shared/api.interface';

@ApiTags('盘点看板')
@Controller('api/inventory-dashboard')
@NeedLogin()
export class InventoryDashboardController {
  constructor(private readonly service: InventoryDashboardService) {}

  @ApiOperation({ summary: '获取盘点总览' })
  @ApiResponse({ status: 200, description: '成功' })
  @Get('overview')
  async getOverview(): Promise<InventoryOverview> {
    return this.service.getOverview();
  }

  @ApiOperation({ summary: '获取保管人盘点矩阵' })
  @ApiQuery({ name: 'department', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiResponse({ status: 200, description: '成功' })
  @Get('owner-matrix')
  async getOwnerMatrix(
    @Query('department') department?: string,
    @Query('search') search?: string,
  ): Promise<{ items: OwnerMatrixRow[] }> {
    return this.service.getOwnerMatrix(department, search);
  }

  @ApiOperation({ summary: '获取盘点时间线' })
  @ApiQuery({ name: 'sort', required: false })
  @ApiResponse({ status: 200, description: '成功' })
  @Get('timeline')
  async getTimeline(
    @Query('sort') sort?: string,
  ): Promise<{ items: TimelineOwner[] }> {
    return this.service.getTimeline(sort);
  }

  @ApiOperation({ summary: '获取库存概览' })
  @ApiResponse({ status: 200, description: '成功' })
  @Get('stock')
  async getStock(): Promise<StockOverview> {
    return this.service.getStock();
  }

  @ApiOperation({ summary: '获取库存趋势' })
  @ApiQuery({ name: 'months', required: false })
  @ApiResponse({ status: 200, description: '成功' })
  @Get('stock-trend')
  async getStockTrend(
    @Query('months') months?: string,
  ): Promise<{ items: StockTrendItem[] }> {
    return this.service.getStockTrend(months);
  }

  @ApiOperation({ summary: '获取异常盘点项列表' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  @ApiResponse({ status: 200, description: '成功' })
  @Get('abnormal-list')
  async getAbnormalList(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<PagedResponse<AbnormalCheckItem>> {
    return this.service.getAbnormalList({
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : 20,
    });
  }

  @ApiOperation({ summary: '获取盘点完成率趋势' })
  @ApiQuery({ name: 'months', required: false })
  @ApiResponse({ status: 200, description: '成功' })
  @Get('completion-rate-trend')
  async getCompletionRateTrend(
    @Query('months') months?: string,
  ): Promise<{
    items: Array<{ month: string; rate: number; total: number; checked: number }>;
  }> {
    return this.service.getCompletionRateTrend(months ?? '6');
  }

  @ApiOperation({ summary: '批量清理异常项' })
  @ApiResponse({ status: 200, description: '成功' })
  @Post('batch-clean-abnormal')
  async batchCleanAbnormal(): Promise<{ deletedCount: number }> {
    return this.service.batchCleanAbnormal();
  }

  @ApiOperation({ summary: '获取部门盘点完成率排行' })
  @ApiResponse({ status: 200, description: '成功' })
  @Get('department-completion-ranking')
  async getDepartmentCompletionRanking(): Promise<{
    items: Array<{ department: string; rate: number; checked: number; total: number }>;
  }> {
    return this.service.getDepartmentCompletionRanking();
  }
}

@ApiTags('盘点检查项')
@Controller('api/inventory-dashboard/checks')
@NeedLogin()
export class InventoryChecksResolveController {
  constructor(private readonly service: InventoryDashboardService) {}

  @ApiOperation({ summary: '处理异常检查项' })
  @ApiParam({ name: 'id', description: '检查项ID' })
  @ApiResponse({ status: 200, description: '成功' })
  @Patch(':id/resolve')
  async resolve(
    @Param('id') id: string,
    @Body() body: ResolveAbnormalDto,
  ): Promise<{ success: boolean }> {
    return this.service.resolveAbnormal(id);
  }
}
