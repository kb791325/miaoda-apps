import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { OrderService } from './order.service';
import { AppAuthGuard } from '@server/modules/auth/app-auth.guard';
import { RequirePermissions } from '@server/modules/auth/auth.decorator';
import { getOperatorContext } from '@server/common/utils/operator';
import type {
  CancelOrderRequest,
  CreateOrderRequest,
  OrderBatchRequest,
  OrderListParams,
  OrderStatus,
} from '@shared/order';

@Controller('api/orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @UseGuards(AppAuthGuard)
  @RequirePermissions('order:view')
  @Get()
  list(@Req() req: Request, @Query() query: Record<string, string>) {
    const params: OrderListParams = {};
    if (query.keyword) params.keyword = query.keyword;
    if (query.status) params.status = query.status as OrderStatus;
    if (query.customerId) params.customerId = query.customerId;
    if (query.dateStart) params.dateStart = query.dateStart;
    if (query.dateEnd) params.dateEnd = query.dateEnd;
    if (query.page) params.page = Number(query.page);
    if (query.pageSize) params.pageSize = Number(query.pageSize);
    return this.orderService.list(params, getOperatorContext(req));
  }

  /** 订单详情（含库存变动流水） */
  @UseGuards(AppAuthGuard)
  @RequirePermissions('order:view')
  @Get(':id/detail')
  detail(@Req() req: Request, @Param('id') id: string) {
    return this.orderService.getDetail(id, getOperatorContext(req));
  }

  /** 更新订单支付状态（财务/管理员） */
  @UseGuards(AppAuthGuard)
  @RequirePermissions('order:pay')
  @Patch(':id/pay-status')
  updatePayStatus(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: { payStatus: string },
  ) {
    return this.orderService.updatePayStatus(
      id,
      dto.payStatus,
      getOperatorContext(req),
    );
  }

  @UseGuards(AppAuthGuard)
  @RequirePermissions('order:create')
  @Post()
  create(@Req() req: Request, @Body() dto: CreateOrderRequest) {
    return this.orderService.create(dto, getOperatorContext(req));
  }

  /** 批量删除 */
  @UseGuards(AppAuthGuard)
  @RequirePermissions('order:delete')
  @Post('batch-delete')
  batchDelete(@Req() req: Request, @Body() dto: OrderBatchRequest) {
    return this.orderService.batchDelete(
      dto.ids ?? [],
      getOperatorContext(req),
    );
  }

  @UseGuards(AppAuthGuard)
  @RequirePermissions('order:update')
  @Put(':id')
  update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: CreateOrderRequest,
  ) {
    return this.orderService.update(id, dto, getOperatorContext(req));
  }

  @UseGuards(AppAuthGuard)
  @RequirePermissions('order:update')
  @Post(':id/cancel')
  cancel(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: CancelOrderRequest,
  ) {
    return this.orderService.cancel(id, dto?.cancelReason ?? '', getOperatorContext(req));
  }

  @UseGuards(AppAuthGuard)
  @RequirePermissions('order:delete')
  @Delete(':id')
  remove(@Req() req: Request, @Param('id') id: string) {
    return this.orderService.remove(id, getOperatorContext(req));
  }
}
