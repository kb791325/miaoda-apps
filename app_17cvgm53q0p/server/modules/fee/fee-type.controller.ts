import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { FeeTypeService } from './fee-type.service';
import { AppAuthGuard } from '@server/modules/auth/app-auth.guard';
import { RequirePermissions } from '@server/modules/auth/auth.decorator';
import { getRequestOperator } from '@server/common/utils/operator';
import type { CreateFeeTypeRequest } from '@shared/fee';

@Controller('api/fee-types')
export class FeeTypeController {
  constructor(private readonly feeTypeService: FeeTypeService) {}

  @UseGuards(AppAuthGuard)
  @RequirePermissions('fee:view')
  @Get()
  list() {
    return this.feeTypeService.list();
  }

  @UseGuards(AppAuthGuard)
  @RequirePermissions('fee:manage')
  @Post()
  create(@Body() dto: CreateFeeTypeRequest, @Req() req: Request) {
    return this.feeTypeService.create(dto, getRequestOperator(req));
  }

  @UseGuards(AppAuthGuard)
  @RequirePermissions('fee:manage')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.feeTypeService.remove(id);
  }
}
