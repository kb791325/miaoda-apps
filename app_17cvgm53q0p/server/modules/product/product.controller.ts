import {
  BadRequestException,
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
import { ProductService } from './product.service';
import { AppAuthGuard } from '@server/modules/auth/app-auth.guard';
import { RequirePermissions } from '@server/modules/auth/auth.decorator';
import {
  getOperatorContext,
  getRequestOperator,
} from '@server/common/utils/operator';
import type {
  CreateProductRequest,
  CreateProductResponse,
  ProductListResponse,
  ProductMutationResponse,
  StockChangeResponse,
  StocktakeRequest,
  StocktakeResponse,
  UpdateProductRequest,
} from '@shared/product';
import type { UpdateProductProfileRequest } from '@shared/inventory-flow';

interface ProductListQuery {
  keyword?: string;
  warningOnly?: string;
}

@Controller('api/products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  /** 商品列表（keyword/warningOnly 筛选） */
  @UseGuards(AppAuthGuard)
  @RequirePermissions('product:view')
  @Get()
  async list(
    @Req() req: Request,
    @Query() query: ProductListQuery,
  ): Promise<ProductListResponse> {
    return this.productService.listProducts(
      {
        keyword: query.keyword,
        warningOnly: query.warningOnly === 'true',
      },
      getOperatorContext(req),
    );
  }

  /** 新增商品（SKU 自动生成，初始库存大于 0 时自动记入库流水） */
  @UseGuards(AppAuthGuard)
  @RequirePermissions('product:manage')
  @Post()
  async create(
    @Req() req: Request,
    @Body() dto: CreateProductRequest,
  ): Promise<CreateProductResponse> {
    return this.productService.createProduct(dto, getRequestOperator(req));
  }

  /** 更新商品成本价档案（仅管理员与财务） */
  @UseGuards(AppAuthGuard)
  @RequirePermissions('price:manage')
  @Patch(':id/profile')
  async updateProfile(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateProductProfileRequest,
  ): Promise<ProductMutationResponse> {
    return this.productService.updateProductProfile(
      id,
      typeof dto.costPrice === 'number' ? dto.costPrice : NaN,
      getRequestOperator(req),
    );
  }

  /** 更新商品信息、预警阈值与成本价（商品管理或价格管理权限均可） */
  @UseGuards(AppAuthGuard)
  @RequirePermissions('product:manage', 'price:manage')
  @Put(':id')
  async update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateProductRequest,
  ): Promise<ProductMutationResponse> {
    return this.productService.updateProduct(
      id,
      dto,
      getRequestOperator(req),
      getOperatorContext(req),
    );
  }

  /** 删除商品 */
  @UseGuards(AppAuthGuard)
  @RequirePermissions('product:manage')
  @Delete(':id')
  async remove(@Param('id') id: string): Promise<ProductMutationResponse> {
    return this.productService.remove(id);
  }

  /** 入库/其他出库登记（后端原子联动库存与流水） */
  @UseGuards(AppAuthGuard)
  @RequirePermissions('stock:manage')
  @Post(':id/stock-changes')
  async createStockChange(
    @Req() req: Request,
    @Param('id') id: string,
    @Body()
    dto: {
      changeType: string;
      quantity: unknown;
      businessType?: string;
      remark?: string;
    },
  ): Promise<StockChangeResponse> {
    if (
      dto.changeType !== 'in' &&
      dto.changeType !== 'otherOut' &&
      dto.changeType !== 'out'
    ) {
      throw new BadRequestException(
        '变动类型必须是 in（入库）或 otherOut（其他出库）',
      );
    }
    return this.productService.createStockChange(
      id,
      {
        changeType: dto.changeType,
        quantity: typeof dto.quantity === 'number' ? dto.quantity : NaN,
        businessType: dto.businessType,
        remark: dto.remark,
      },
      getRequestOperator(req),
    );
  }

  /** 库存盘点（实盘数量与当前库存比对，差值记「盘点调整」流水） */
  @UseGuards(AppAuthGuard)
  @RequirePermissions('stock:manage')
  @Post(':id/stocktake')
  async stocktake(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: StocktakeRequest,
  ): Promise<StocktakeResponse> {
    return this.productService.stocktake(
      id,
      typeof dto.actualQuantity === 'number' ? dto.actualQuantity : NaN,
      dto.remark,
      getRequestOperator(req),
    );
  }
}
