import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { NeedLogin } from "@lark-apaas/fullstack-nestjs-core";
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@ApiTags('分类管理')
@Controller('api/categories')
@NeedLogin()
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  /**
   * 一级类目列表（含子类目数量）
   */
  @ApiOperation({ summary: '获取一级类目列表' })
  @ApiResponse({ status: 200, description: '成功' })
  @ApiResponse({ status: 400, description: '参数验证失败' })
  @ApiResponse({ status: 401, description: '未认证' })
  @Get('l1')
  async getL1List() {
    return this.categoriesService.getL1List();
  }

  /**
   * 二级类目列表（分页、按 categoryL1 过滤、关键词搜索）
   */
  @ApiOperation({ summary: '获取二级类目列表（分页、筛选）' })
  @ApiResponse({ status: 200, description: '成功' })
  @ApiResponse({ status: 400, description: '参数验证失败' })
  @ApiResponse({ status: 401, description: '未认证' })
  @Get('l2')
  async getL2List(
    @Query('categoryL1') categoryL1?: string,
    @Query('keyword') keyword?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    let pageSizeNum = pageSize ? parseInt(pageSize, 10) : 50;
    if (pageSizeNum > 100) pageSizeNum = 100;
    if (pageSizeNum < 1) pageSizeNum = 50;

    return this.categoriesService.getL2List({
      categoryL1,
      keyword,
      page: pageNum,
      pageSize: pageSizeNum,
    });
  }

  /**
   * 类目联动选项（一级+二级树形）
   */
  @ApiOperation({ summary: '获取类目联动选项' })
  @ApiResponse({ status: 200, description: '成功' })
  @ApiResponse({ status: 400, description: '参数验证失败' })
  @ApiResponse({ status: 401, description: '未认证' })
  @Get('options')
  async getOptions() {
    return this.categoriesService.getOptions();
  }

  /**
   * 新增一级类目
   */
  @NeedLogin()
  @Post('l1')
  @ApiOperation({ summary: '新增一级类目' })
  @ApiResponse({ status: 200, description: '成功' })
  @ApiResponse({ status: 400, description: '参数验证失败' })
  @ApiResponse({ status: 401, description: '未认证' })
  async createL1(@Body() body: CreateCategoryDto) {
    return this.categoriesService.createL1(body.categoryL1);
  }

  /**
   * 新增二级类目
   */
  @NeedLogin()
  @Post('l2')
  @ApiOperation({ summary: '新增二级类目' })
  @ApiResponse({ status: 200, description: '成功' })
  @ApiResponse({ status: 400, description: '参数验证失败' })
  @ApiResponse({ status: 401, description: '未认证' })
  async createL2(@Body() body: CreateCategoryDto) {
    return this.categoriesService.createL2({
      categoryL1: body.categoryL1,
      categoryL2: body.categoryL2,
      sortOrder: body.sortOrder ?? 0,
    });
  }

  /**
   * 编辑类目
   */
  @NeedLogin()
  @Put(':id')
  @ApiOperation({ summary: '编辑类目' })
  @ApiParam({ name: 'id', description: '类目ID' })
  @ApiResponse({ status: 200, description: '成功' })
  @ApiResponse({ status: 400, description: '参数验证失败' })
  @ApiResponse({ status: 401, description: '未认证' })
  @ApiResponse({ status: 404, description: '资源不存在' })
  async update(
    @Param('id') id: string,
    @Body() body: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(id, body);
  }

  /**
   * 删除类目
   */
  @NeedLogin()
  @Delete(':id')
  @ApiOperation({ summary: '删除类目' })
  @ApiParam({ name: 'id', description: '类目ID' })
  @ApiResponse({ status: 200, description: '成功' })
  @ApiResponse({ status: 400, description: '参数验证失败' })
  @ApiResponse({ status: 401, description: '未认证' })
  @ApiResponse({ status: 404, description: '资源不存在' })
  async remove(@Param('id') id: string) {
    return this.categoriesService.remove(id);
  }
}
