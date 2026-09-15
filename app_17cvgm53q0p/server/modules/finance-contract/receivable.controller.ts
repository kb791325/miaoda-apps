import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ReceivableService } from './receivable.service';
import { AppAuthGuard } from '@server/modules/auth/app-auth.guard';
import { RequirePermissions } from '@server/modules/auth/auth.decorator';
import type { ArListParams, UpdateArRequest } from '@shared/finance-contract';

@Controller('api/receivables')
@UseGuards(AppAuthGuard)
export class ReceivableController {
  constructor(private readonly receivableService: ReceivableService) {}

  @Get()
  @RequirePermissions('finance:receivable:view')
  list(@Query() query: ArListParams) {
    return this.receivableService.list(query);
  }

  @Get('customer-summary/:customerId')
  @RequirePermissions('finance:receivable:view')
  customerSummary(@Param('customerId') customerId: string) {
    return this.receivableService.customerSummary(customerId);
  }

  @Get('overdue-summary')
  @RequirePermissions('finance:receivable:view')
  overdueSummary() {
    return this.receivableService.overdueSummary();
  }

  @Get(':id')
  @RequirePermissions('finance:receivable:view')
  detail(@Param('id') id: string) {
    return this.receivableService.detail(id);
  }

  @Patch(':id')
  @RequirePermissions('finance:receivable:edit')
  update(@Param('id') id: string, @Body() dto: UpdateArRequest) {
    return this.receivableService.update(id, dto);
  }
}
