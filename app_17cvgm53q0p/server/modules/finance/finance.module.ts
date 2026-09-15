import { Module } from '@nestjs/common';
import { BitableModule } from '@server/modules/bitable/bitable.module';
import { FeeModule } from '@server/modules/fee/fee.module';
import { AuthModule } from '@server/modules/auth/auth.module';
import { FinanceController } from './finance.controller';
import { FinanceService } from './finance.service';

@Module({
  imports: [BitableModule, FeeModule, AuthModule],
  controllers: [FinanceController],
  providers: [FinanceService],
  exports: [FinanceService],
})
export class FinanceModule {}
