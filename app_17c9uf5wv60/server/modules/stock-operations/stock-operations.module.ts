import { Module } from '@nestjs/common';
import { StockOperationsController } from './stock-operations.controller';
import { StockOperationsService } from './stock-operations.service';
import { SyncModule } from '../sync/sync.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [SyncModule, AuditLogsModule],
  controllers: [StockOperationsController],
  providers: [StockOperationsService],
  exports: [StockOperationsService],
})
export class StockOperationsModule {}
