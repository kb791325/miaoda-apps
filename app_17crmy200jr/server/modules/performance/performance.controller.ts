import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PerformanceService } from './performance.service';
import type { FrontendMetricReport } from '@shared/api.interface';

@ApiTags('性能监控')
@Controller('api/performance')
export class PerformanceController {
  constructor(private readonly performanceService: PerformanceService) {}

  @Get('slow-requests')
  getSlowRequests(@Query('limit') limit?: string) {
    const numLimit = limit ? parseInt(limit, 10) : 50;
    return this.performanceService.getSlowRequests(Math.min(numLimit, 200));
  }

  @Get('stats')
  getStats() {
    return this.performanceService.getStats();
  }

  @Post('frontend')
  reportFrontend(@Body() report: FrontendMetricReport) {
    this.performanceService.recordFrontendMetric(report);
    return { success: true };
  }

  @Get('frontend')
  getFrontendMetrics(@Query('page') page?: string) {
    return this.performanceService.getFrontendMetrics(page);
  }
}