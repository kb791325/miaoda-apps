import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { OrderFeeService } from './order-fee.service';
import { AppAuthGuard } from '@server/modules/auth/app-auth.guard';
import { RequirePermissions } from '@server/modules/auth/auth.decorator';
import { getRequestOperator } from '@server/common/utils/operator';
import type {
  CreateOrderFeeRequest,
  UpdateOrderFeeRequest,
} from '@shared/fee';

/** 订单费用明细：嵌套于订单资源 */
@Controller('api/orders')
export class OrderFeeController {
  constructor(private readonly orderFeeService: OrderFeeService) {}

  @UseGuards(AppAuthGuard)
  @RequirePermissions('fee:view')
  @Get(':id/fees')
  list(@Param('id') id: string) {
    return this.orderFeeService.listByOrder(id);
  }

  @UseGuards(AppAuthGuard)
  @RequirePermissions('fee:manage')
  @Post(':id/fees')
  add(
    @Param('id') id: string,
    @Body() dto: CreateOrderFeeRequest,
    @Req() req: Request,
  ) {
    return this.orderFeeService.add(id, dto, getRequestOperator(req));
  }

  @UseGuards(AppAuthGuard)
  @RequirePermissions('fee:manage')
  @Put(':id/fees/:feeId')
  update(
    @Param('id') id: string,
    @Param('feeId') feeId: string,
    @Body() dto: UpdateOrderFeeRequest,
    @Req() req: Request,
  ) {
    return this.orderFeeService.update(id, feeId, dto, getRequestOperator(req));
  }

  @UseGuards(AppAuthGuard)
  @RequirePermissions('fee:manage')
  @Delete(':id/fees/:feeId')
  remove(@Param('id') id: string, @Param('feeId') feeId: string) {
    return this.orderFeeService.remove(id, feeId);
  }
}
