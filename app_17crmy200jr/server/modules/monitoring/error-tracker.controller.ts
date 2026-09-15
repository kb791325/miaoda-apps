import {
  Controller,
  Get,
  Put,
  Delete,
  Param,
  Query,
  Body,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { ErrorTrackerService } from './error-tracker.service';
import type { ErrorEntry, ErrorStats } from '@shared/api.interface';

@ApiTags('错误追踪')
@Controller('api/monitoring/errors')
export class ErrorTrackerController {
  constructor(private readonly errorTrackerService: ErrorTrackerService) {}

  @ApiOperation({ summary: '获取错误列表' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiResponse({ status: 200, description: '成功' })
  @Get()
  getErrors(
    @Query('page') pageStr?: string,
    @Query('pageSize') pageSizeStr?: string,
    @Query('status') status?: string,
  ): { items: ErrorEntry[]; total: number } {
    const page = pageStr ? parseInt(pageStr, 10) : 1;
    const pageSize = pageSizeStr ? parseInt(pageSizeStr, 10) : 20;
    return this.errorTrackerService.getErrors(
      page,
      pageSize,
      status as ErrorEntry['status'] | undefined,
    );
  }

  @ApiOperation({ summary: '获取错误统计' })
  @ApiResponse({ status: 200, description: '成功' })
  @Get('stats')
  getErrorStats(): ErrorStats {
    return this.errorTrackerService.getErrorStats();
  }

  @ApiOperation({ summary: '获取错误详情' })
  @ApiResponse({ status: 200, description: '成功' })
  @Get(':id')
  getErrorById(@Param('id') id: string): ErrorEntry | undefined {
    return this.errorTrackerService.getErrorById(id);
  }

  @ApiOperation({ summary: '更新错误状态' })
  @ApiResponse({ status: 200, description: '成功' })
  @Put(':id/status')
  updateErrorStatus(
    @Param('id') id: string,
    @Body() body: { status: string },
  ): void {
    this.errorTrackerService.updateErrorStatus(
      id,
      body.status as ErrorEntry['status'],
    );
  }

  @ApiOperation({ summary: '删除错误' })
  @ApiResponse({ status: 200, description: '成功' })
  @Delete(':id')
  deleteError(@Param('id') id: string): void {
    this.errorTrackerService.deleteError(id);
  }
}