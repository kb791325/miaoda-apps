import { Module } from '@nestjs/common';
import { BitableModule } from '@server/modules/bitable/bitable.module';
import { FeeTypeController } from './fee-type.controller';
import { FeeTypeService } from './fee-type.service';
import { OrderFeeController } from './order-fee.controller';
import { OrderFeeService } from './order-fee.service';
import { AuthModule } from '@server/modules/auth/auth.module';

@Module({
  imports: [BitableModule, AuthModule],
  controllers: [FeeTypeController, OrderFeeController],
  providers: [FeeTypeService, OrderFeeService],
  exports: [FeeTypeService, OrderFeeService],
})
export class FeeModule {}
