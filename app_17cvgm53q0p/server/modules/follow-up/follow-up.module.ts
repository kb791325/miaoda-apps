import { Module } from '@nestjs/common';
import { FollowUpController } from './follow-up.controller';
import { FollowUpService } from './follow-up.service';
import { CrmModule } from '@server/modules/crm/crm.module';
import { BitableModule } from '@server/modules/bitable/bitable.module';
import { BitableSyncModule } from '@server/modules/bitable-sync/bitable-sync.module';
import { AuthModule } from '@server/modules/auth/auth.module';

@Module({
  imports: [CrmModule, BitableModule, BitableSyncModule, AuthModule],
  controllers: [FollowUpController],
  providers: [FollowUpService],
  exports: [FollowUpService],
})
export class FollowUpModule {}
