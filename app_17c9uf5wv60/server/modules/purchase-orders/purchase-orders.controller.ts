import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import type {
  CreatePurchaseOrderRequest,
  PurchaseOrder,
  PurchaseOrderListParams,
  PurchaseOrderListResponse,
} from '@shared/api.interface';
import { PurchaseOrdersService } from './purchase-orders.service';

interface RequestContext {
  userContext: { userId: string };
}

@Controller('api/purchase-orders')
export class PurchaseOrdersController {
  constructor(private readonly purchaseOrdersService: PurchaseOrdersService) {}

  @Get()
  async list(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('status') status?: string,
    @Query('keyword') keyword?: string,
  ): Promise<PurchaseOrderListResponse> {
    const params: PurchaseOrderListParams = {
      page: page ? Number.parseInt(page, 10) : undefined,
      pageSize: pageSize ? Number.parseInt(pageSize, 10) : undefined,
      status: status || undefined,
      keyword: keyword || undefined,
    };
    return this.purchaseOrdersService.list(params);
  }

  @NeedLogin()
  @Post()
  async create(
    @Req() req: RequestContext,
    @Body() dto: CreatePurchaseOrderRequest,
  ): Promise<PurchaseOrder> {
    return this.purchaseOrdersService.create(dto, req.userContext.userId);
  }

  @Get(':id')
  async detail(@Param('id') id: string): Promise<PurchaseOrder> {
    return this.purchaseOrdersService.detail(id);
  }

  @NeedLogin()
  @Post(':id/approve')
  async approve(
    @Req() req: RequestContext,
    @Param('id') id: string,
  ): Promise<PurchaseOrder> {
    return this.purchaseOrdersService.approve(id, req.userContext.userId);
  }

  @NeedLogin()
  @Post(':id/receive')
  async receive(
    @Req() req: RequestContext,
    @Param('id') id: string,
  ): Promise<PurchaseOrder> {
    return this.purchaseOrdersService.receive(id, req.userContext.userId);
  }

  @NeedLogin()
  @Post(':id/cancel')
  async cancel(
    @Req() req: RequestContext,
    @Param('id') id: string,
  ): Promise<PurchaseOrder> {
    return this.purchaseOrdersService.cancel(id, req.userContext.userId);
  }
}
