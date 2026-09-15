import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  Req,
  ParseIntPipe,
} from '@nestjs/common';
import { NeedLogin, CanRole } from '@lark-apaas/fullstack-nestjs-core';
import type { Request } from 'express';
import { RecordsService } from './records.service';
import type {
  CreateInventoryCheckRequest,
  SubmitInventoryCheckRequest,
} from '@shared/api.interface';

@Controller('api/records')
export class RecordsController {
  constructor(private readonly recordsService: RecordsService) {}

  @NeedLogin()
  @CanRole(['boss', 'supervisor', 'warehouse_admin', 'purchaser', 'sales', 'finance'])
  @Get('transactions')
  async getTransactions(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize?: number,
    @Query('type') type?: string,
  ) {
    return this.recordsService.getTransactions({
      page,
      pageSize,
      type,
    });
  }

  @NeedLogin()
  @CanRole(['boss', 'supervisor', 'finance'])
  @Get('transactions/export')
  async exportTransactions(@Query('type') type?: string) {
    return this.recordsService.exportTransactions({ type });
  }

  @NeedLogin()
  @CanRole(['boss', 'supervisor', 'warehouse_admin'])
  @Post('inventory-check')
  async createInventoryCheck(
    @Req() req: Request,
    @Body() dto: CreateInventoryCheckRequest,
  ) {
    const { userId } = req.userContext;
    return this.recordsService.createInventoryCheck(
      dto.warehouse,
      userId,
    );
  }

  @NeedLogin()
  @CanRole(['boss', 'supervisor', 'warehouse_admin', 'purchaser', 'sales', 'finance'])
  @Get('inventory-checks')
  async listInventoryChecks(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize?: number,
    @Query('warehouse') warehouse?: string,
  ) {
    return this.recordsService.listInventoryChecks({
      page,
      pageSize,
      warehouse,
    });
  }

  @NeedLogin()
  @CanRole(['boss', 'supervisor', 'warehouse_admin', 'purchaser', 'sales', 'finance'])
  @Get('inventory-check/:checkId')
  async getInventoryCheck(@Param('checkId') checkId: string) {
    return this.recordsService.getInventoryCheck(checkId);
  }

  @NeedLogin()
  @CanRole(['boss', 'supervisor', 'warehouse_admin'])
  @Patch('inventory-check/:checkId')
  async submitInventoryCheck(
    @Req() req: Request,
    @Param('checkId') checkId: string,
    @Body() dto: SubmitInventoryCheckRequest,
  ) {
    const { userId } = req.userContext;
    return this.recordsService.submitInventoryCheck(
      checkId,
      dto,
      userId,
    );
  }

  @NeedLogin()
  @CanRole(['boss', 'supervisor', 'warehouse_admin', 'purchaser', 'sales', 'finance'])
  @Get('transfers')
  async getTransfers(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize?: number,
  ) {
    return this.recordsService.getTransfers({ page, pageSize });
  }
}
