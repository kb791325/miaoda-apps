import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { StructuredLoggerService } from './structured-logger.service';
import type { LogEntry, LogStats } from '@shared/api.interface';

@ApiTags('日志查询')
@Controller('api/monitoring/logs')
export class LogQueryController {
  constructor(private readonly structuredLogger: StructuredLoggerService) {}

  @ApiOperation({ summary: '查询日志' })
  @ApiQuery({ name: 'startTime', required: false, type: String })
  @ApiQuery({ name: 'endTime', required: false, type: String })
  @ApiQuery({ name: 'level', required: false, type: String })
  @ApiQuery({ name: 'category', required: false, type: String })
  @ApiQuery({ name: 'keyword', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiResponse({ status: 200, description: '成功' })
  @Get()
  queryLogs(
    @Query('startTime') startTime?: string,
    @Query('endTime') endTime?: string,
    @Query('level') level?: string,
    @Query('category') category?: string,
    @Query('keyword') keyword?: string,
    @Query('page') pageStr?: string,
    @Query('pageSize') pageSizeStr?: string,
  ): { items: LogEntry[]; total: number } {
    return this.structuredLogger.query({
      startTime,
      endTime,
      level,
      category,
      keyword,
      page: pageStr ? parseInt(pageStr, 10) : 1,
      pageSize: pageSizeStr ? parseInt(pageSizeStr, 10) : 20,
    });
  }

  @ApiOperation({ summary: '获取日志统计' })
  @ApiResponse({ status: 200, description: '成功' })
  @Get('stats')
  getLogStats(): LogStats {
    return this.structuredLogger.getStats();
  }
}