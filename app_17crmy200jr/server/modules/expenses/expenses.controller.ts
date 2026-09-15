import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBody, ApiParam } from '@nestjs/swagger';
import { NeedLogin } from "@lark-apaas/fullstack-nestjs-core";
import { ExpensesService } from "./expenses.service";
import type {
  BatchOperationResult,
  ExpenseDetail,
  ExpenseListResponse,
} from "@shared/api.interface";
import { CreateExpenseDto } from "./dto/create-expense.dto";
import { UpdateExpenseDto } from "./dto/update-expense.dto";
import { AuditAction } from "@server/common/interceptors/audit.interceptor";

@ApiTags('支出管理')
@Controller("api/expenses")
@NeedLogin()
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @ApiOperation({ summary: '获取支出列表（支持分页、筛选、搜索）' })
  @ApiQuery({ name: 'page', required: false, description: '页码', example: '1' })
  @ApiQuery({ name: 'pageSize', required: false, description: '每页条数', example: '20' })
  @ApiQuery({ name: 'startDate', required: false, description: '开始日期' })
  @ApiQuery({ name: 'endDate', required: false, description: '结束日期' })
  @ApiQuery({ name: 'categoryL1', required: false, description: '一级分类' })
  @ApiQuery({ name: 'categoryL2', required: false, description: '二级分类' })
  @ApiQuery({ name: 'payerEntity', required: false, description: '付款主体' })
  @ApiQuery({ name: 'floor', required: false, description: '楼层' })
  @ApiQuery({ name: 'department', required: false, description: '部门' })
  @ApiQuery({ name: 'handler', required: false, description: '经办人' })
  @ApiQuery({ name: 'keyword', required: false, description: '关键词搜索' })
  @ApiQuery({ name: 'sortBy', required: false, description: '排序字段' })
  @ApiQuery({ name: 'sortOrder', required: false, description: '排序方向', enum: ['asc', 'desc'] })
  @ApiQuery({ name: 'viewScope', required: false, description: '视图范围' })
  @ApiResponse({ status: 200, description: '成功' })
  @ApiResponse({ status: 400, description: '参数验证失败' })
  @ApiResponse({ status: 401, description: '未认证' })
   @Get()
   async findAll(
     @Req() req: Request,
     @Query("page") page = "1",
     @Query("pageSize") pageSize = "20",
     @Query("startDate") startDate?: string,
     @Query("endDate") endDate?: string,
     @Query("categoryL1") categoryL1?: string,
     @Query("categoryL2") categoryL2?: string,
     @Query("payerEntity") payerEntity?: string,
     @Query("floor") floor?: string,
     @Query("department") department?: string,
     @Query("handler") handler?: string,
     @Query("keyword") keyword?: string,
     @Query("sortBy") sortBy?: string,
     @Query("sortOrder") sortOrder?: "asc" | "desc",
     @Query("viewScope") viewScope?: string,
   ): Promise<ExpenseListResponse> {
     const userId = (req as unknown as { userContext: { userId: string } })
       .userContext.userId;
     return this.expensesService.findAll({
       page: parseInt(page, 10),
       pageSize: parseInt(pageSize, 10),
       startDate,
       endDate,
       categoryL1,
       categoryL2,
       payerEntity,
       floor,
       department,
       handler,
       keyword,
       sortBy,
       sortOrder,
       viewScope,
       currentUserId: userId,
     });
  }

  @Post()
  @NeedLogin()
  @AuditAction('expense', 'CREATE', 'expense')
  @ApiOperation({ summary: '创建支出记录' })
  @ApiBody({ type: CreateExpenseDto })
  @ApiResponse({ status: 200, description: '成功' })
  @ApiResponse({ status: 400, description: '参数验证失败' })
  @ApiResponse({ status: 401, description: '未认证' })
  async create(
    @Req() req: Request,
    @Body() dto: CreateExpenseDto,
  ): Promise<{ id: string; assetId?: string; assetError?: string }> {
    const userId = (req as unknown as { userContext: { userId: string } })
      .userContext.userId;
    return this.expensesService.create(dto, userId);
  }

  // ---------- 批量操作（静态路由，必须在 :id 之前）----------

  @Post("batch-update-category")
  @NeedLogin()
  @ApiOperation({ summary: '批量更新支出分类' })
  @ApiResponse({ status: 200, description: '成功' })
  @ApiResponse({ status: 400, description: '参数验证失败' })
  @ApiResponse({ status: 401, description: '未认证' })
  async batchUpdateCategory(
    @Req() req: Request,
    @Body() body: {
      ids: string[];
      categoryL1: string;
      categoryL2: string;
    },
  ): Promise<BatchOperationResult> {
    const userId = (req as unknown as { userContext: { userId: string } })
      .userContext.userId;
    return this.expensesService.batchUpdateCategory(
      body.ids,
      body.categoryL1,
      body.categoryL2,
      userId,
    );
  }

  @Post("batch-update-department")
  @NeedLogin()
  @ApiOperation({ summary: '批量更新支出部门' })
  @ApiResponse({ status: 200, description: '成功' })
  @ApiResponse({ status: 400, description: '参数验证失败' })
  @ApiResponse({ status: 401, description: '未认证' })
  async batchUpdateDepartment(
    @Req() req: Request,
    @Body() body: { ids: string[]; department: string },
  ): Promise<BatchOperationResult> {
    const userId = (req as unknown as { userContext: { userId: string } })
      .userContext.userId;
    return this.expensesService.batchUpdateDepartment(
      body.ids,
      body.department,
      userId,
    );
  }

  // ---------- 基础 CRUD ----------

  @ApiOperation({ summary: '获取支出详情' })
  @ApiParam({ name: 'id', description: '支出ID' })
  @ApiResponse({ status: 200, description: '成功' })
  @ApiResponse({ status: 400, description: '参数验证失败' })
  @ApiResponse({ status: 401, description: '未认证' })
  @ApiResponse({ status: 404, description: '资源不存在' })
  @Get(":id")
  async findOne(
    @Req() req: Request,
    @Param("id") id: string,
  ): Promise<ExpenseDetail> {
    const userId = (req as unknown as { userContext: { userId: string } })
      .userContext.userId;
    return this.expensesService.findOne(id, userId);
  }

  @Put(":id")
  @NeedLogin()
  @AuditAction('expense', 'UPDATE', 'expense')
  @ApiOperation({ summary: '更新支出记录' })
  @ApiParam({ name: 'id', description: '支出ID' })
  @ApiResponse({ status: 200, description: '成功' })
  @ApiResponse({ status: 400, description: '参数验证失败' })
  @ApiResponse({ status: 401, description: '未认证' })
  @ApiResponse({ status: 404, description: '资源不存在' })
  async update(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() dto: UpdateExpenseDto,
  ): Promise<{ success: boolean }> {
    const userId = (req as unknown as { userContext: { userId: string } })
      .userContext.userId;
    return this.expensesService.update(id, dto, userId);
  }

  @Delete(":id")
  @NeedLogin()
  @AuditAction('expense', 'DELETE', 'expense')
  @ApiOperation({ summary: '删除支出记录' })
  @ApiParam({ name: 'id', description: '支出ID' })
  @ApiResponse({ status: 200, description: '成功' })
  @ApiResponse({ status: 400, description: '参数验证失败' })
  @ApiResponse({ status: 401, description: '未认证' })
  @ApiResponse({ status: 404, description: '资源不存在' })
  async remove(
    @Req() req: Request,
    @Param("id") id: string,
  ): Promise<{ success: boolean }> {
    const userId = (req as unknown as { userContext: { userId: string } })
      .userContext.userId;
    return this.expensesService.remove(id, userId);
  }
}
