import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import cacheConfig from './cache.config';
import { CacheService } from './cache.service';
import { MemoryCacheService } from './memory-cache.service';

@Global()
@Module({
  imports: [ConfigModule.forFeature(cacheConfig)],
  providers: [MemoryCacheService, CacheService],
  exports: [CacheService, MemoryCacheService],
})
export class CacheModule {}