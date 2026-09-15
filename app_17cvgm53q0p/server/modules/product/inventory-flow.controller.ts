import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ProductService } from './product.service';
import { AppAuthGuard } from '@server/modules/auth/app-auth.guard';
import { RequirePermissions } from '@server/modules/auth/auth.decorator';
import type {
  InventoryFlowListParams,
  InventoryFlowListResponse,
} from '@shared/inventory-flow';

interface InventoryFlowListQuery {
  productId?: string;
  businessType?: string;
  startTime?: string;
  endTime?: string;
  page?: string;
  pageSize?: string;
}

@Controller('api/stock-flows')
export class InventoryFlowController {
  constructor(private readonly productService: ProductService) {}

  /** 库存流水台账列表（按操作时间倒序，可按商品/业务类型/日期范围过滤） */
  @UseGuards(AppAuthGuard)
  @RequirePermissions('stockflow:view')
  @Get()
  async list(
    @Query() query: InventoryFlowListQuery,
  ): Promise<InventoryFlowListResponse> {
    const params: InventoryFlowListParams = {
      productId: query.productId,
      businessType: query.businessType,
      startTime: query.startTime,
      endTime: query.endTime,
      page: query.page ? Number(query.page) : undefined,
      pageSize: query.pageSize ? Number(query.pageSize) : undefined,
    };
    return this.productService.listInventoryFlows(params);
  }
}
