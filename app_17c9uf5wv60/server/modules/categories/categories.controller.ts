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
import { NeedLogin, CanRole } from '@lark-apaas/fullstack-nestjs-core';
import { CategoriesService } from './categories.service';
import type {
  Category,
  CategoryListResponse,
  CreateCategoryRequest,
  UpdateCategoryRequest,
} from '@shared/api.interface';

@Controller('api/categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @NeedLogin()
  @CanRole(['boss', 'supervisor', 'warehouse_admin', 'purchaser', 'sales', 'finance'])
  @Get()
  async findAll(
    @Query('keyword') keyword?: string,
  ): Promise<CategoryListResponse> {
    return this.categoriesService.findAll(keyword);
  }

  @NeedLogin()
  @CanRole(['boss', 'supervisor', 'warehouse_admin', 'purchaser', 'sales', 'finance'])
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Category> {
    return this.categoriesService.findOne(id);
  }

  @NeedLogin()
  @CanRole(['boss', 'supervisor', 'warehouse_admin'])
  @Post()
  async create(
    @Req() req: Request,
    @Body() dto: CreateCategoryRequest,
  ): Promise<Category> {
    const { userId } = (req as any).userContext;
    return this.categoriesService.create(dto, userId);
  }

  @NeedLogin()
  @CanRole(['boss', 'supervisor', 'warehouse_admin'])
  @Patch(':id')
  async update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateCategoryRequest,
  ): Promise<Category> {
    const { userId } = (req as any).userContext;
    return this.categoriesService.update(id, dto, userId);
  }

  @NeedLogin()
  @CanRole(['boss', 'supervisor', 'warehouse_admin'])
  @Delete(':id')
  async remove(@Param('id') id: string): Promise<void> {
    return this.categoriesService.remove(id);
  }
}
