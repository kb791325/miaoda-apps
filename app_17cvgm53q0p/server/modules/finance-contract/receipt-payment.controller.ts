import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { ReceiptPaymentService } from './receipt-payment.service';
import { AppAuthGuard } from '@server/modules/auth/app-auth.guard';
import { RequirePermissions } from '@server/modules/auth/auth.decorator';
import { getRequestOperator } from '@server/common/utils/operator';
import type {
  CreateReceiptRequest,
  ReceiptListParams,
} from '@shared/finance-contract';

const UUID_PATTERN: RegExp =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Controller('api/receipt-payments')
@UseGuards(AppAuthGuard)
export class ReceiptPaymentController {
  constructor(private readonly receiptPaymentService: ReceiptPaymentService) {}

  @Get()
  @RequirePermissions('finance:payment:view')
  list(@Query() query: ReceiptListParams) {
    return this.receiptPaymentService.list(query);
  }

  @Post()
  @RequirePermissions('finance:payment:edit')
  create(@Req() req: Request, @Body() dto: CreateReceiptRequest) {
    return this.receiptPaymentService.create(dto, getRequestOperator(req));
  }

  @Get(':id')
  @RequirePermissions('finance:payment:view')
  getDetail(@Param('id') id: string) {
    if (!UUID_PATTERN.test(id)) throw new BadRequestException('无效的记录 ID');
    const detail = this.receiptPaymentService.getDetail(id);
    if (!detail) throw new NotFoundException('记录不存在');
    return detail;
  }
}
