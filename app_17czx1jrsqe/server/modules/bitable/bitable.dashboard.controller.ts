import { Controller, Get, Query } from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import { BitableDashboardService } from './bitable.dashboard.service';

@Controller('api/dashboard')
@NeedLogin()
export class BitableDashboardController {
  constructor(private readonly dashboardService: BitableDashboardService) {}

  @Get('summary')
  async getSummary(@Query('range') range?: string) {
    const data = await this.dashboardService.getSummary(range || 'month');
    return { code: 0, data };
  }

  @Get('realtime')
  async getRealtime() {
    const data = await this.dashboardService.getRealtime();
    return { code: 0, data };
  }

  @Get('charts')
  async getCharts(@Query('time_dim') timeDim?: string) {
    const data = await this.dashboardService.getCharts(timeDim || 'month');
    return { code: 0, data };
  }

  @Get('rankings')
  async getRankings(
    @Query('port') port?: string,
    @Query('time_dim') timeDim?: string,
  ) {
    const data = await this.dashboardService.getRankings(port || 'all', timeDim || 'month');
    return { code: 0, data };
  }

  @Get('targets')
  async getTargets() {
    const data = await this.dashboardService.getTargets();
    return { code: 0, data };
  }

  @Get('performance')
  async getPerformance() {
    const data = await this.dashboardService.getPerformance();
    return { code: 0, data };
  }
}