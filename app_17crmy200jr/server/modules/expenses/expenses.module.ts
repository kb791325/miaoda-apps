import { Module } from '@nestjs/common';
import { ExpensesController } from './expenses.controller';
import { ExpensesService } from './expenses.service';
import { FeishuBitableModule } from '../feishu-bitable/feishu-bitable.module';
import { FixedAssetsModule } from '../fixed-assets/fixed-assets.module';
import { BudgetModule } from '../budget/budget.module';
import { RolesModule } from '../roles/roles.module';

@Module({
  imports: [FeishuBitableModule, FixedAssetsModule, BudgetModule, RolesModule],
  controllers: [ExpensesController],
  providers: [ExpensesService],
  exports: [ExpensesService],
})
export class ExpensesModule {}
