import { Controller, Post, Body, Req } from '@nestjs/common';
import { NeedLogin, CanRole } from '@lark-apaas/fullstack-nestjs-core';
import type { Request } from 'express';
import { StockOperationsService } from './stock-operations.service';
import type {
  InboundRequest,
  OutboundRequest,
  TransferRequest,
} from '@shared/api.interface';

@Controller('api/stock-operations')
export class StockOperationsController {
  constructor(private readonly stockOperationsService: StockOperationsService) {}

  @NeedLogin()
  @CanRole(['boss', 'supervisor', 'warehouse_admin', 'purchaser'])
  @Post('inbound')
  async inbound(@Req() req: Request, @Body() dto: InboundRequest) {
    const { userId, userName } = req.userContext;
    return this.stockOperationsService.inbound(
      { ...dto, operator: dto.operator?.trim() || userName },
      userId,
    );
  }

  @NeedLogin()
  @CanRole(['boss', 'supervisor', 'warehouse_admin', 'sales'])
  @Post('outbound')
  async outbound(@Req() req: Request, @Body() dto: OutboundRequest) {
    const { userId, userName } = req.userContext;
    return this.stockOperationsService.outbound(
      { ...dto, operator: dto.operator?.trim() || userName },
      userId,
    );
  }

  @NeedLogin()
  @CanRole(['boss', 'supervisor', 'warehouse_admin'])
  @Post('transfer')
  async transfer(@Req() req: Request, @Body() dto: TransferRequest) {
    const { userId } = req.userContext;
    return this.stockOperationsService.transfer(dto, userId);
  }
}
