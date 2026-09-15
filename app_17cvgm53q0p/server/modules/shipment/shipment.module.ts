import { Module } from '@nestjs/common';
import { BitableModule } from '@server/modules/bitable/bitable.module';
import { BitableSyncModule } from '@server/modules/bitable-sync/bitable-sync.module';
import { ProductModule } from '@server/modules/product/product.module';
import { FeeModule } from '@server/modules/fee/fee.module';
import { AuthModule } from '@server/modules/auth/auth.module';
import { ShipmentController } from './shipment.controller';
import { ShipmentService } from './shipment.service';

@Module({
  imports: [BitableModule, ProductModule, BitableSyncModule, FeeModule, AuthModule],
  controllers: [ShipmentController],
  providers: [ShipmentService],
  exports: [ShipmentService],
})
export class ShipmentModule {}
