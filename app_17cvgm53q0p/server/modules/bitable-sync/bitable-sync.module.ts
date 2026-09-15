import { Module } from '@nestjs/common';
import { BitableModule } from '@server/modules/bitable/bitable.module';
import { BitableSyncController } from './bitable-sync.controller';
import { BitableSyncAutomation } from './bitable-sync.automation';
import { SyncMappingService } from './sync-mapping.service';
import { SyncPushService } from './sync-push.service';
import { SyncPullService } from './sync-pull.service';
import { SyncRepairService } from './sync-repair.service';
import { AuthModule } from '@server/modules/auth/auth.module';

/** 应用数据库 ↔ 多维表格双向同步模块 */
@Module({
  imports: [BitableModule, AuthModule],
  controllers: [BitableSyncController],
  providers: [
    SyncMappingService,
    SyncPushService,
    SyncPullService,
    SyncRepairService,
    BitableSyncAutomation,
  ],
  exports: [SyncPushService, SyncMappingService],
})
export class BitableSyncModule {}
