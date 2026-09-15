import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Req,
} from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import type { Request } from 'express';
import { SalesOrdersService } from './sales-orders.service';
import type {
  SalesOrder,
  SalesOrderListParams,
  SalesOrderListResponse,
  CreateSalesOrderRequest,
  UpdateSalesOrderRequest,
} from '@shared/api.interface';

@Controller('api/sales-orders')
export class SalesOrdersController {
  constructor(private readonly salesOrdersService: SalesOrdersService) {}

  @NeedLogin()
  @Get()
  async list(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('status') status?: string,
    @Query('keyword') keyword?: string,
    @Query('warehouse') warehouse?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<SalesOrderListResponse> {
    const params: SalesOrderListParams = {
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
      status: status as SalesOrderListParams['status'],
      keyword,
      warehouse,
      startDate,
      endDate,
    };
    return this.salesOrdersService.list(params);
  }

  @NeedLogin()
  @Get('export')
  async exportList(
    @Query('status') status?: string,
    @Query('keyword') keyword?: string,
    @Query('warehouse') warehouse?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<SalesOrder[]> {
    const params: SalesOrderListParams = {
      status: status as SalesOrderListParams['status'],
      keyword,
      warehouse,
      startDate,
      endDate,
    };
    return this.salesOrdersService.exportList(params);
  }

  @NeedLogin()
  @Get(':id')
  async getById(@Param('id') id: string): Promise<SalesOrder> {
    return this.salesOrdersService.getById(id);
  }

  @NeedLogin()
  @Post()
  async create(
    @Req() req: Request,
    @Body() dto: CreateSalesOrderRequest,
  ): Promise<SalesOrder> {
    const { userId } = req.userContext;
    return this.salesOrdersService.create(dto, userId);
  }

  @NeedLogin()
  @Patch(':id')
  async update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateSalesOrderRequest,
  ): Promise<SalesOrder> {
    const { userId } = req.userContext;
    return this.salesOrdersService.update(id, dto, userId);
  }

  @NeedLogin()
  @Post(':id/confirm')
  async confirm(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<SalesOrder> {
    const { userId } = req.userContext;
    return this.salesOrdersService.confirm(id, userId);
  }

  @NeedLogin()
  @Post(':id/cancel')
  async cancel(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<SalesOrder> {
    const { userId } = req.userContext;
    return this.salesOrdersService.cancel(id, userId);
  }

  @NeedLogin()
  @Post(':id/start-picking')
  async startPicking(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<SalesOrder> {
    const { userId } = req.userContext;
    return this.salesOrdersService.startPicking(id, userId);
  }

  @NeedLogin()
  @Post(':id/ship')
  async ship(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<{ success: boolean; orderId: string; transactionId: string }> {
    const { userId } = req.userContext;
    return this.salesOrdersService.ship(id, userId);
  }

  @NeedLogin()
  @Post(':id/complete')
  async complete(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<SalesOrder> {
    const { userId } = req.userContext;
    return this.salesOrdersService.complete(id, userId);
  }
}
