import { Controller, Get } from '@nestjs/common';
import { CanRole } from '@lark-apaas/fullstack-nestjs-core';
import { CustomerService } from './customer.service';
import type { CustomerResponse } from '@shared/api.interface';
import { ROLE_OPERATIONS, ROLE_SUPERVISOR, ROLE_BOSS } from '@shared/roles';

@Controller('api/customers')
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @CanRole([ROLE_OPERATIONS, ROLE_SUPERVISOR, ROLE_BOSS])
  @Get()
  async findAll(): Promise<CustomerResponse> {
    return this.customerService.findAll();
  }
}
