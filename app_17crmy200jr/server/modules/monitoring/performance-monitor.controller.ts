import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { PerformanceMonitorService } from './performance-monitor.service';
import type {
  PerformanceOverview,
  ResponseTimeStats,
  ThroughputStats,
  SlowRequestItem,
  CacheStats,
} from '@shared/api.interface';

@ApiTags('性能监控')
@Controller('api/monitoring/performance')
export class PerformanceMonitorController {
  constructor(
    private readonly performanceMonitorService: PerformanceMonitorService,
  ) {}

  @ApiOperation({ summary: '获取性能总览' })
  @ApiResponse({ status: 200, description: '成功' })
  @Get('overview')
  getOverview(): PerformanceOverview {
    return this.performanceMonitorService.getOverview();
  }

  @ApiOperation({ summary: '获取响应时间统计' })
  @ApiResponse({ status: 200, description: '成功' })
  @Get('response-time')
  getResponseTimeStats(): ResponseTimeStats {
    return this.performanceMonitorService.getResponseTimeStats();
  }

  @ApiOperation({ summary: '获取吞吐量统计' })
  @ApiResponse({ status: 200, description: '成功' })
  @Get('throughput')
  getThroughputStats(): ThroughputStats {
    return this.performanceMonitorService.getThroughputStats();
  }

  @ApiOperation({ summary: '获取慢请求列表' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: '成功' })
  @Get('slow-requests')
  getSlowRequests(
    @Query('limit') limitStr?: string,
  ): SlowRequestItem[] {
    const limit = limitStr ? parseInt(limitStr, 10) : 50;
    return this.performanceMonitorService.getSlowRequests(limit);
  }

  @ApiOperation({ summary: '获取缓存统计' })
  @ApiResponse({ status: 200, description: '成功' })
  @Get('cache')
  getCacheStats(): CacheStats {
    return this.performanceMonitorService.getCacheStats();
  }
}