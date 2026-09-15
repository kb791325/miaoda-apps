import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CacheService } from '../cache/cache.service';

@ApiTags('健康检查')
@Controller('api/health')
export class HealthController {
  constructor(private readonly cacheService: CacheService) {}

  @ApiOperation({ summary: '获取缓存健康状态' })
  @ApiResponse({ status: 200, description: '成功' })
  @Get('cache')
  async getCacheHealth() {
    const stats = this.cacheService.getStats();
    return {
      status: 'ok',
      cache: {
        redis: stats.redisStatus,
        memory: stats.memory,
      },
      timestamp: new Date().toISOString(),
    };
  }
}