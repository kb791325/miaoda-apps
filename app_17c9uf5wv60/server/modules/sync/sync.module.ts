import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';
import { FeishuApiService } from '@server/common/services/feishu-api.service';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [HttpModule, AuditLogsModule],
  controllers: [SyncController],
  providers: [SyncService, FeishuApiService],
  exports: [SyncService],
})
export class SyncModule {}
