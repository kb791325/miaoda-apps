import {
  Controller,
  Get,
  Put,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { AlertService } from './alert.service';
import type { AlertEvent, AlertStats } from '@shared/api.interface';

@ApiTags('告警管理')
@Controller('api/monitoring/alerts')
export class AlertController {
  constructor(private readonly alertService: AlertService) {}

  @ApiOperation({ summary: '获取告警列表' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiResponse({ status: 200, description: '成功' })
  @Get()
  getAlerts(
    @Query('page') pageStr?: string,
    @Query('pageSize') pageSizeStr?: string,
    @Query('status') status?: string,
  ): { items: AlertEvent[]; total: number } {
    const page = pageStr ? parseInt(pageStr, 10) : 1;
    const pageSize = pageSizeStr ? parseInt(pageSizeStr, 10) : 20;
    return this.alertService.getAlerts(page, pageSize, status);
  }

  @ApiOperation({ summary: '获取活跃告警' })
  @ApiResponse({ status: 200, description: '成功' })
  @Get('active')
  getActiveAlerts(): AlertEvent[] {
    return this.alertService.getActiveAlerts();
  }

  @ApiOperation({ summary: '获取告警统计' })
  @ApiResponse({ status: 200, description: '成功' })
  @Get('stats')
  getAlertStats(): AlertStats {
    return this.alertService.getAlertStats();
  }

  @ApiOperation({ summary: '确认告警' })
  @ApiResponse({ status: 200, description: '成功' })
  @Put(':id/acknowledge')
  acknowledgeAlert(@Param('id') id: string): void {
    this.alertService.acknowledgeAlert(id);
  }

  @ApiOperation({ summary: '解决告警' })
  @ApiResponse({ status: 200, description: '成功' })
  @Put(':id/resolve')
  resolveAlert(@Param('id') id: string): void {
    this.alertService.resolveAlert(id);
  }
}