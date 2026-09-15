import { Module } from '@nestjs/common';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { BitableModule } from '@server/modules/bitable/bitable.module';
import { ProductModule } from '@server/modules/product/product.module';
import { ShipmentModule } from '@server/modules/shipment/shipment.module';
import { FeeModule } from '@server/modules/fee/fee.module';
import { AuthModule } from '@server/modules/auth/auth.module';

@Module({
  imports: [BitableModule, ProductModule, ShipmentModule, FeeModule, AuthModule],
  controllers: [OrderController],
  providers: [OrderService],
})
export class OrderModule {}
