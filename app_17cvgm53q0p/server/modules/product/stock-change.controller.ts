import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ProductService } from './product.service';
import { AppAuthGuard } from '@server/modules/auth/app-auth.guard';
import { RequirePermissions } from '@server/modules/auth/auth.decorator';
import type { StockChangeListResponse } from '@shared/product';

interface StockChangeListQuery {
  productId?: string;
  orderNo?: string;
  pageSize?: string;
}

@Controller('api/stock-changes')
export class StockChangeController {
  constructor(private readonly productService: ProductService) {}

  /** 库存变动流水列表（按变动时间倒序，可按商品/关联订单号过滤） */
  @UseGuards(AppAuthGuard)
  @RequirePermissions('stockflow:view')
  @Get()
  async list(
    @Query() query: StockChangeListQuery,
  ): Promise<StockChangeListResponse> {
    return this.productService.listStockChanges({
      productId: query.productId,
      orderNo: query.orderNo,
      pageSize: query.pageSize ? Number(query.pageSize) : undefined,
    });
  }
}
