import { Module } from '@nestjs/common';
import { BitableSyncModule } from '@server/modules/bitable-sync/bitable-sync.module';
import { CrmService } from './crm.service';

@Module({
  imports: [BitableSyncModule],
  providers: [CrmService],
  exports: [CrmService],
})
export class CrmModule {}
