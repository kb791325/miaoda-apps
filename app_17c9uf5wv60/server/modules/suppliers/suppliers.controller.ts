import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Req,
} from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import { SuppliersService } from './suppliers.service';
import type {
  Supplier,
  SupplierListParams,
  SupplierListResponse,
  CreateSupplierRequest,
  UpdateSupplierRequest,
  SupplierDetail,
  SupplierProductListResponse,
} from '@shared/api.interface';

@Controller('api/suppliers')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @NeedLogin()
  @Get()
  async findList(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('status') status?: string,
    @Query('keyword') keyword?: string,
  ): Promise<SupplierListResponse> {
    const params: SupplierListParams = {
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
      status,
      keyword,
    };
    return this.suppliersService.findList(params);
  }

  @NeedLogin()
  @Get('all')
  async findAllActive(): Promise<{ id: string; code: string; name: string }[]> {
    return this.suppliersService.findAllActive();
  }

  @NeedLogin()
  @Get(':id')
  async findDetail(@Param('id') id: string): Promise<SupplierDetail> {
    return this.suppliersService.findDetail(id);
  }

  @NeedLogin()
  @Post()
  async create(
    @Req() req: Request,
    @Body() dto: CreateSupplierRequest,
  ): Promise<Supplier> {
    const { userId } = (req as unknown as { userContext: { userId: string } })
      .userContext;
    return this.suppliersService.create(dto, userId);
  }

  @NeedLogin()
  @Patch(':id')
  async update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateSupplierRequest,
  ): Promise<Supplier> {
    const { userId } = (req as unknown as { userContext: { userId: string } })
      .userContext;
    return this.suppliersService.update(id, dto, userId);
  }

  @NeedLogin()
  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @Req() req: { userContext: { userId: string } },
  ): Promise<{ success: true }> {
    const { userId } = req.userContext;
    return this.suppliersService.remove(id, userId);
  }

  @NeedLogin()
  @Get(':id/products')
  async findSupplierProducts(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<SupplierProductListResponse> {
    return this.suppliersService.findSupplierProducts(
      id,
      page ? parseInt(page, 10) : 1,
      pageSize ? parseInt(pageSize, 10) : 20,
    );
  }
}
