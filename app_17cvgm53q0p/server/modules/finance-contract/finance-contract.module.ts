import { Module } from '@nestjs/common';
import { AuthModule } from '@server/modules/auth/auth.module';
import { BitableModule } from '@server/modules/bitable/bitable.module';
import { ReceivableService } from './receivable.service';
import { ReceivableController } from './receivable.controller';
import { PayableService } from './payable.service';
import { PayableController } from './payable.controller';
import {
  ReceiptPaymentService,
} from './receipt-payment.service';
import { ReceiptPaymentController } from './receipt-payment.controller';
import {
  ReconciliationService,
} from './reconciliation.service';
import { ReconciliationController } from './reconciliation.controller';

@Module({
  imports: [BitableModule, AuthModule],
  controllers: [
    ReceivableController,
    PayableController,
    ReceiptPaymentController,
    ReconciliationController,
  ],
  providers: [
    ReceivableService,
    PayableService,
    ReceiptPaymentService,
    ReconciliationService,
  ],
  exports: [ReceivableService],
})
export class FinanceContractModule {}
