import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  NotFoundException,
} from '@nestjs/common';
import { NeedLogin, CanRole } from '@lark-apaas/fullstack-nestjs-core';
import type { Request } from 'express';
import { ProductsService } from './products.service';
import type {
  ProductListParams,
  ProductListResponse,
  Product,
  ProductWithInventory,
  CreateProductRequest,
  UpdateProductRequest,
  ArchivedProduct,
  ArchivedProductDetail,
  ArchivedProductListParams,
  ArchivedProductListResponse,
  BatchImportItem,
  BatchImportResult,
  BulkIdsRequest,
  BulkCategoryRequest,
  BulkShelfRequest,
  BulkOperationResponse,
} from '@shared/api.interface';

@Controller('api/products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @NeedLogin()
  @CanRole(['boss', 'supervisor', 'warehouse_admin', 'purchaser', 'sales', 'finance'])
  @Get()
  async list(@Query() query: ProductListParams): Promise<ProductListResponse> {
    return this.productsService.listProducts({
      page: query.page ? parseInt(String(query.page), 10) : undefined,
      pageSize: query.pageSize
        ? parseInt(String(query.pageSize), 10)
        : undefined,
      category: query.category,
      status: query.status,
      keyword: query.keyword,
      maxStock: query.maxStock !== undefined ? Number(query.maxStock) : undefined,
      sortBy: query.sortBy,
    });
  }

  @NeedLogin()
  @CanRole(['boss', 'supervisor', 'warehouse_admin', 'purchaser', 'sales', 'finance'])
  @Get('all')
  async getAll(): Promise<ProductWithInventory[]> {
    return this.productsService.getAllProducts();
  }

  @NeedLogin()
  @CanRole(['boss', 'supervisor', 'warehouse_admin'])
  @Post()
  async create(
    @Body() dto: CreateProductRequest,
    @Req() req: Request,
  ): Promise<Product> {
    const { userId } = req.userContext;
    return this.productsService.createProduct(dto, userId);
  }

  @NeedLogin()
  @CanRole(['boss', 'supervisor', 'warehouse_admin'])
  @Post('batch-import')
  async batchImport(
    @Body() body: { items: BatchImportItem[] },
  ): Promise<BatchImportResult> {
    const items = body?.items ?? [];
    return this.productsService.batchImport(items);
  }

  @NeedLogin()
  @CanRole(['boss', 'supervisor', 'warehouse_admin'])
  @Post('bulk-delete')
  async bulkDelete(
    @Body() dto: BulkIdsRequest,
    @Req() req: Request,
  ): Promise<BulkOperationResponse> {
    const { userId } = req.userContext;
    return this.productsService.bulkDeleteProducts(dto?.ids ?? [], userId);
  }

  @NeedLogin()
  @CanRole(['boss', 'supervisor', 'warehouse_admin'])
  @Post('bulk-category')
  async bulkCategory(
    @Body() dto: BulkCategoryRequest,
    @Req() req: Request,
  ): Promise<BulkOperationResponse> {
    const { userId } = req.userContext;
    return this.productsService.bulkUpdateCategory(
      dto?.ids ?? [],
      dto?.category ?? '',
      userId,
    );
  }

  @NeedLogin()
  @CanRole(['boss', 'supervisor', 'warehouse_admin'])
  @Post('bulk-shelf')
  async bulkShelf(
    @Body() dto: BulkShelfRequest,
    @Req() req: Request,
  ): Promise<BulkOperationResponse> {
    const { userId } = req.userContext;
    return this.productsService.bulkShelfProducts(
      dto?.ids ?? [],
      Boolean(dto?.onShelf),
      userId,
    );
  }

  @NeedLogin()
  @CanRole(['boss', 'supervisor', 'warehouse_admin', 'finance'])
  @Get('export')
  async exportData(
    @Query() query: ProductListParams,
  ): Promise<ProductWithInventory[]> {
    return this.productsService.exportProducts({
      category: query.category,
      status: query.status,
      keyword: query.keyword,
      maxStock: query.maxStock !== undefined ? Number(query.maxStock) : undefined,
      sortBy: query.sortBy,
    });
  }

  @NeedLogin()
  @CanRole(['boss', 'supervisor', 'warehouse_admin'])
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProductRequest,
    @Req() req: Request,
  ): Promise<Product> {
    const { userId } = req.userContext;
    return this.productsService.updateProduct(id, dto, userId);
  }

  @NeedLogin()
  @CanRole(['boss', 'supervisor', 'warehouse_admin', 'purchaser', 'sales', 'finance'])
  @Get('archived/list')
  async listArchived(
    @Query() query: ArchivedProductListParams,
  ): Promise<ArchivedProductListResponse> {
    return this.productsService.listArchivedProducts({
      page: query.page ? parseInt(String(query.page), 10) : undefined,
      pageSize: query.pageSize ? parseInt(String(query.pageSize), 10) : undefined,
      keyword: query.keyword,
    });
  }

  @NeedLogin()
  @CanRole(['boss', 'supervisor', 'warehouse_admin', 'purchaser', 'sales', 'finance'])
  @Get('archived/:id')
  async getArchived(
    @Param('id') id: string,
  ): Promise<ArchivedProductDetail> {
    return this.productsService.getArchivedProduct(id);
  }

  @NeedLogin()
  @CanRole(['boss', 'supervisor', 'warehouse_admin'])
  @Post('archived/:id/restore')
  async restoreArchived(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<{ success: boolean }> {
    const { userId } = req.userContext;
    await this.productsService.restoreArchivedProduct(id, userId);
    return { success: true };
  }

  @NeedLogin()
  @CanRole(['boss', 'supervisor', 'warehouse_admin'])
  @Delete('archived/:id')
  async purgeArchived(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<{ success: boolean }> {
    const { userId } = req.userContext;
    await this.productsService.purgeArchivedProduct(id, userId);
    return { success: true };
  }

  @NeedLogin()
  @CanRole(['boss', 'supervisor', 'warehouse_admin'])
  @Delete(':id')
  async delete(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<{ success: boolean }> {
    const { userId } = req.userContext;
    await this.productsService.deleteProduct(id, userId);
    return { success: true };
  }

  @NeedLogin()
  @CanRole(['boss', 'supervisor', 'warehouse_admin', 'purchaser', 'sales', 'finance'])
  @Get(':id')
  async getOne(@Param('id') id: string): Promise<ProductWithInventory> {
    const product = await this.productsService.getProduct(id);
    if (!product) {
      throw new NotFoundException('商品不存在');
    }
    return product;
  }
}
