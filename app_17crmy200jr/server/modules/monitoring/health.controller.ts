import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService } from './health.service';
import type { HealthStatus } from '@shared/api.interface';

@ApiTags('健康检查')
@Controller('api/health')
export class MonitoringHealthController {
  constructor(private readonly healthService: HealthService) {}

  @ApiOperation({ summary: '存活探针' })
  @ApiResponse({ status: 200, description: '成功' })
  @Get('live')
  async checkLiveness(): Promise<{ status: string; uptime: number }> {
    return this.healthService.checkLiveness();
  }

  @ApiOperation({ summary: '就绪探针' })
  @ApiResponse({ status: 200, description: '成功' })
  @Get('ready')
  async checkReadiness(): Promise<HealthStatus> {
    return this.healthService.checkReadiness();
  }

  @ApiOperation({ summary: '详细健康信息' })
  @ApiResponse({ status: 200, description: '成功' })
  @Get('details')
  async checkDetails(): Promise<HealthStatus> {
    return this.healthService.checkDetails();
  }
}