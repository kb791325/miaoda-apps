import { Module } from '@nestjs/common';
import { CustomerController } from './customer.controller';
import { CustomerService } from './customer.service';
import { BitableModule } from '@server/modules/bitable/bitable.module';
import { BitableSyncModule } from '@server/modules/bitable-sync/bitable-sync.module';
import { CrmModule } from '@server/modules/crm/crm.module';
import { FollowUpModule } from '@server/modules/follow-up/follow-up.module';
import { AuthModule } from '@server/modules/auth/auth.module';

@Module({
  imports: [BitableModule, BitableSyncModule, CrmModule, FollowUpModule, AuthModule],
  controllers: [CustomerController],
  providers: [CustomerService],
})
export class CustomerModule {}
