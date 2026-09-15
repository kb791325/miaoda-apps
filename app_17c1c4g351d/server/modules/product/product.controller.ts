import { Controller, Get, Post, Delete, Body, Param } from '@nestjs/common';
import { CanRole, NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import { ProductService } from './product.service';
import type { ProductListResponse, CreateProductRequest, CreateProductResponse } from '@shared/api.interface';
import { ROLE_PROCUREMENT, ROLE_OPERATIONS, ROLE_SUPERVISOR, ROLE_BOSS } from '@shared/roles';

@Controller('api/products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @CanRole([ROLE_PROCUREMENT, ROLE_OPERATIONS, ROLE_SUPERVISOR, ROLE_BOSS])
  @Get()
  async findAll(): Promise<ProductListResponse> {
    const items = await this.productService.findAll();
    return { items };
  }

  @CanRole([ROLE_PROCUREMENT, ROLE_OPERATIONS, ROLE_SUPERVISOR, ROLE_BOSS])
  @NeedLogin()
  @Post()
  async create(@Body() dto: CreateProductRequest): Promise<CreateProductResponse> {
    const item = await this.productService.create(dto);
    return { item };
  }

  @CanRole([ROLE_PROCUREMENT, ROLE_OPERATIONS, ROLE_SUPERVISOR, ROLE_BOSS])
  @NeedLogin()
  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.productService.remove(id);
    return { success: true };
  }
}
