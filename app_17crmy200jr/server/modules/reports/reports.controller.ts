import { Controller, Get, Query } from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { QueryExpenseAnalysisDto } from './dto/query-expense-analysis.dto';
import type {
  ExpenseAnalysisResponse,
  AssetAnalysisResponse,
  InventoryAnalysisResponse,
} from '@shared/api.interface';

@ApiTags('报表')
@Controller('api/reports')
@NeedLogin()
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @ApiOperation({ summary: '获取支出分析报表' })
  @ApiResponse({ status: 200, description: '成功' })
  @Get('expense-analysis')
  async getExpenseAnalysis(
    @Query() query: QueryExpenseAnalysisDto,
  ): Promise<ExpenseAnalysisResponse> {
    return this.reportsService.getExpenseAnalysis(query);
  }

  @ApiOperation({ summary: '获取资产分析报表' })
  @ApiResponse({ status: 200, description: '成功' })
  @Get('asset-analysis')
  async getAssetAnalysis(): Promise<AssetAnalysisResponse> {
    return this.reportsService.getAssetAnalysis();
  }

  @ApiOperation({ summary: '获取盘点分析报表' })
  @ApiQuery({ name: 'year', required: false })
  @ApiResponse({ status: 200, description: '成功' })
  @Get('inventory-analysis')
  async getInventoryAnalysis(
    @Query('year') year?: string,
  ): Promise<InventoryAnalysisResponse> {
    const yearNum = year ? parseInt(year, 10) : new Date().getFullYear();
    return this.reportsService.getInventoryAnalysis(yearNum);
  }
}
