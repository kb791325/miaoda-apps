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
import { CustomerService } from './customer.service';
import { AppAuthGuard } from '@server/modules/auth/app-auth.guard';
import { RequirePermissions } from '@server/modules/auth/auth.decorator';
import { getOperatorContext } from '@server/common/utils/operator';
import {
  ReceivableService,
} from '@server/modules/finance-contract/receivable.service';
import type {
  CustomerFormRequest,
  CustomerListParams,
  CustomerMutationResponse,
  UpdateCustomerStageRequest,
} from '@shared/customer';
import type {
  UpdateCustomerCreditRequest,
} from '@shared/finance-contract';

interface ReassignOwnerRequest {
  ownerId: string;
}

@Controller('api/customers')
export class CustomerController {
  constructor(
    private readonly customerService: CustomerService,
    private readonly receivableService: ReceivableService,
  ) {}

  @UseGuards(AppAuthGuard)
  @RequirePermissions('customer:view')
  @Get()
  list(
    @Req() req: Request,
    @Query() query: CustomerListParams,
  ) {
    return this.customerService.list(query, getOperatorContext(req));
  }

  @UseGuards(AppAuthGuard)
  @RequirePermissions('customer:view')
  @Get(':id/profile')
  profile(@Req() req: Request, @Param('id') id: string) {
    return this.customerService.getProfile(id, getOperatorContext(req));
  }

  /** 客户应收欠款汇总（客户档案展示，销售/财务均可见） */
  @UseGuards(AppAuthGuard)
  @RequirePermissions('customer:view')
  @Get(':id/receivable-summary')
  receivableSummary(@Param('id') id: string) {
    return this.receivableService.customerSummary(id);
  }

  /** 客户信用额度视图（额度/已用/剩余/预警，销售可见） */
  @UseGuards(AppAuthGuard)
  @RequirePermissions('customer:view')
  @Get(':id/credit')
  creditView(@Param('id') id: string) {
    return this.receivableService.creditView(id);
  }

  /** 设置客户信用额度与预警比例（仅额度管理权限） */
  @UseGuards(AppAuthGuard)
  @RequirePermissions('finance_credit_manage')
  @Patch(':id/credit')
  updateCredit(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateCustomerCreditRequest,
  ) {
    return this.customerService.updateCredit(id, dto, getOperatorContext(req));
  }

  @UseGuards(AppAuthGuard)
  @RequirePermissions('customer:manage')
  @Post()
  create(@Req() req: Request, @Body() dto: CustomerFormRequest) {
    return this.customerService.create(dto, getOperatorContext(req));
  }

  @UseGuards(AppAuthGuard)
  @RequirePermissions('customer:manage')
  @Put(':id')
  update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: CustomerFormRequest,
  ) {
    return this.customerService.update(id, dto, getOperatorContext(req));
  }

  @UseGuards(AppAuthGuard)
  @RequirePermissions('customer:manage')
  @Patch(':id/stage')
  updateStage(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateCustomerStageRequest,
  ) {
    return this.customerService.updateStage(id, dto, getOperatorContext(req));
  }

  @UseGuards(AppAuthGuard)
  @RequirePermissions('customer:manage')
  @Patch(':id/owner')
  reassignOwner(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: ReassignOwnerRequest,
  ) {
    return this.customerService.reassignOwner(
      id,
      dto.ownerId,
      getOperatorContext(req),
    );
  }

  @UseGuards(AppAuthGuard)
  @RequirePermissions('customer:manage')
  @Delete(':id')
  remove(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<CustomerMutationResponse> {
    return this.customerService.remove(id, getOperatorContext(req));
  }
}
