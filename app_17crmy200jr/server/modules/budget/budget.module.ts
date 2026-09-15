import { Module } from '@nestjs/common';
import { BudgetController } from './budget.controller';
import { BudgetService } from './budget.service';
import { FeishuBitableModule } from '../feishu-bitable/feishu-bitable.module';

@Module({
  imports: [FeishuBitableModule],
  controllers: [BudgetController],
  providers: [BudgetService],
  exports: [BudgetService],
})
export class BudgetModule {}
