import { Controller, Get, Param, Query, NotFoundException } from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { OperationLogService } from './operation-log.service';
import { QueryOperationLogDto } from './dto/query-operation-log.dto';
import type {
  OperationLogListResponse,
  OperationLogDetail,
  OperationLogStatItem,
} from '@shared/api.interface';

@ApiTags('操作日志')
@Controller('api/operation-logs')
@NeedLogin()
export class OperationLogController {
  constructor(private readonly operationLogService: OperationLogService) {}

  @ApiOperation({ summary: '获取操作日志统计' })
  @ApiResponse({ status: 200, description: '成功' })
  @Get('stats')
  async getStats(): Promise<OperationLogStatItem[]> {
    return this.operationLogService.getStats();
  }

  @ApiOperation({ summary: '获取操作日志详情' })
  @ApiParam({ name: 'id', description: '日志ID' })
  @ApiResponse({ status: 200, description: '成功' })
  @Get(':id')
  async getDetail(@Param('id') id: string): Promise<OperationLogDetail> {
    const log = await this.operationLogService.getDetail(id);
    if (!log) {
      throw new NotFoundException('操作日志不存在');
    }
    return log;
  }

  @ApiOperation({ summary: '获取操作日志列表（分页、筛选）' })
  @ApiResponse({ status: 200, description: '成功' })
  @Get()
  async getOperationLogs(
    @Query() query: QueryOperationLogDto,
  ): Promise<OperationLogListResponse> {
    return this.operationLogService.getOperationLogs({
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
      operatorId: query.operatorId,
      operationType: query.operationType,
      targetType: query.targetType,
      startDate: query.startDate,
      endDate: query.endDate,
    });
  }
}
