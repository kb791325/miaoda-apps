import { Module } from '@nestjs/common';
import { BitableModule } from '@server/modules/bitable/bitable.module';
import { ProductController } from './product.controller';
import { StockChangeController } from './stock-change.controller';
import { InventoryFlowController } from './inventory-flow.controller';
import { ProductService } from './product.service';
import { AuthModule } from '@server/modules/auth/auth.module';

@Module({
  imports: [BitableModule, AuthModule],
  controllers: [ProductController, StockChangeController, InventoryFlowController],
  providers: [ProductService],
  exports: [ProductService],
})
export class ProductModule {}
