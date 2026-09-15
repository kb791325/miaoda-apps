import { Module } from '@nestjs/common';
import { BitableReconcileService } from '@server/src/common/bitable-sync/bitable-reconcile.service';
import { BitableRetryController } from './bitable-retry.controller';

@Module({
  controllers: [BitableRetryController],
  providers: [BitableReconcileService],
})
export class BitableRetryModule {}
