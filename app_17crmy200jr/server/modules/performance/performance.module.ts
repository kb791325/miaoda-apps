import { Module } from '@nestjs/common';
import { PerformanceController } from './performance.controller';
import { PerformanceService } from './performance.service';
import { CacheHealthController } from './cache-health.controller';

@Module({
  controllers: [PerformanceController, CacheHealthController],
  providers: [PerformanceService],
})
export class PerformanceModule {}