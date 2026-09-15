import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { SyncModule } from '../sync/sync.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [SyncModule, AuditLogsModule],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
