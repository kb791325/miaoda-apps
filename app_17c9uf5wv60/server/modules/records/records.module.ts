import { Module } from '@nestjs/common';
import { RecordsController } from './records.controller';
import { RecordsService } from './records.service';
import { SyncModule } from '../sync/sync.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [SyncModule, AuditLogsModule],
  controllers: [RecordsController],
  providers: [RecordsService],
})
export class RecordsModule {}
