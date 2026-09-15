import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { AppAuthGuard } from '@server/modules/auth/app-auth.guard';
import { RequirePermissions } from '@server/modules/auth/auth.decorator';
import type {
  DashboardSummary,
  SalesRankResponse,
  StatusDistributionResponse,
  TrendResponse,
} from '@shared/dashboard';
import { BadRequestException } from '@nestjs/common';

@Controller('api/dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @UseGuards(AppAuthGuard)
  @RequirePermissions('dashboard:view')
  @Get('summary')
  getSummary(): Promise<DashboardSummary> {
    return this.dashboardService.getSummary();
  }

  @UseGuards(AppAuthGuard)
  @RequirePermissions('dashboard:view')
  @Get('trend')
  getTrend(@Query('days') days?: string): Promise<TrendResponse> {
    const parsed = Number(days ?? 30);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 90) {
      throw new BadRequestException('days 必须为 1-90 的整数');
    }
    return this.dashboardService.getTrend(parsed);
  }

  @UseGuards(AppAuthGuard)
  @RequirePermissions('dashboard:view')
  @Get('order-status-distribution')
  getStatusDistribution(): Promise<StatusDistributionResponse> {
    return this.dashboardService.getStatusDistribution();
  }

  @UseGuards(AppAuthGuard)
  @RequirePermissions('dashboard:view')
  @Get('product-sales-rank')
  getSalesRank(@Query('limit') limit?: string): Promise<SalesRankResponse> {
    const parsed = Number(limit ?? 10);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 50) {
      throw new BadRequestException('limit 必须为 1-50 的整数');
    }
    return this.dashboardService.getSalesRank(parsed);
  }
}
