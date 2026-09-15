import { Controller, Get, Post, Query } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { CacheService } from '../../common/cache/cache.service';

@Controller('api/cache')
export class CacheHealthController {
  private readonly logger = new Logger(CacheHealthController.name);

  constructor(private readonly cacheService: CacheService) {}

  @Get('health')
  async getHealth() {
    const connState = this.cacheService.getConnectionState();
    const stats = this.cacheService.getStats();
    const hitRate = this.cacheService.getHitRateStats();
    return {
      status: connState === 'connected' ? 'healthy' : 'degraded',
      connectionState: connState,
      stats,
      hitRate,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('metrics')
  async getMetrics() {
    const stats = this.cacheService.getStats();
    const hitRate = this.cacheService.getHitRateStats();
    return {
      ...stats,
      hitRate,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('slow-logs')
  async getSlowLogs(@Query('limit') limit?: string) {
    const numLimit = limit ? parseInt(limit, 10) : 50;
    const logs = this.cacheService.getSlowLogs(Math.min(numLimit, 200));
    return { items: logs, total: logs.length };
  }

  @Get('keys')
  async getKeys(
    @Query('pattern') pattern?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const p = page ? parseInt(page, 10) : 1;
    const ps = pageSize ? parseInt(pageSize, 10) : 50;
    const patternStr = pattern || '*';
    const allKeys = await this.cacheService.getKeysByPattern(patternStr);
    const total = allKeys.length;
    const start = (p - 1) * ps;
    const items = allKeys.slice(start, start + ps);
    return { items, total, page: p, pageSize: ps };
  }

  @Post('clear')
  async clearCache() {
    await this.cacheService.flush();
    this.logger.log('缓存已清除');
    return { success: true, message: '缓存已清除' };
  }

  @Post('warmup')
  async warmupCache() {
    await this.cacheService.warmup();
    const warmed = this.cacheService.isWarmed();
    return { success: true, warmed };
  }
}