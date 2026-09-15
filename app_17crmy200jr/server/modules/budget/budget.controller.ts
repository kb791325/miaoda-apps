import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { NeedLogin } from "@lark-apaas/fullstack-nestjs-core";
import { BudgetService } from "./budget.service";
import type {
  Budget,
  BudgetAdjustment,
  BudgetExecutionResponse,
  BudgetListResponse,
  OverrunCheckResponse,
} from "@shared/api.interface";
import { CreateBudgetDto } from "./dto/create-budget.dto";
import { UpdateBudgetDto } from "./dto/update-budget.dto";
import { BatchCreateBudgetDto } from "./dto/batch-create-budget.dto";
import { AuditAction } from "@server/common/interceptors/audit.interceptor";

@ApiTags('预算管理')
@Controller("api/budget")
@NeedLogin()
export class BudgetController {
  constructor(private readonly budgetService: BudgetService) {}

  @ApiOperation({ summary: '获取预算列表（分页、筛选）' })
  @ApiResponse({ status: 200, description: '成功' })
  @ApiResponse({ status: 400, description: '参数验证失败' })
  @ApiResponse({ status: 401, description: '未认证' })
  @Get()
  async findAll(
    @Query("year") year: string,
    @Query("month") month?: string,
    @Query("department") department?: string,
    @Query("page") page = "1",
    @Query("pageSize") pageSize = "20",
  ): Promise<BudgetListResponse> {
    return this.budgetService.findAll({
      year: parseInt(year, 10),
      month,
      department,
      page: parseInt(page, 10),
      pageSize: parseInt(pageSize, 10),
    });
  }

  // 静态路由必须在动态 :id 之前
  @ApiOperation({ summary: '获取预算执行汇总' })
  @ApiResponse({ status: 200, description: '成功' })
  @ApiResponse({ status: 400, description: '参数验证失败' })
  @ApiResponse({ status: 401, description: '未认证' })
  @Get("execution/summary")
  async getExecutionSummary(
    @Query("year") year: string,
    @Query("month") month: string,
  ): Promise<BudgetExecutionResponse> {
    return this.budgetService.getExecutionSummary(
      parseInt(year, 10),
      month,
    );
  }

  @ApiOperation({ summary: '检查预算超支' })
  @ApiResponse({ status: 200, description: '成功' })
  @ApiResponse({ status: 400, description: '参数验证失败' })
  @ApiResponse({ status: 401, description: '未认证' })
  @Get("check-overrun")
  async checkOverrun(
    @Query("department") department: string,
    @Query("month") month: string,
    @Query("year") year: string,
    @Query("amount") amount: string,
  ): Promise<OverrunCheckResponse> {
    if (!department || typeof department !== "string" || department.trim() === "") {
      throw new BadRequestException("department 不能为空");
    }
    if (!month || typeof month !== "string" || month.trim() === "") {
      throw new BadRequestException("month 不能为空");
    }
    const parsedYear = parseInt(year, 10);
    if (!Number.isFinite(parsedYear) || parsedYear <= 0) {
      throw new BadRequestException("year 必须是有效的正整数");
    }
    const parsedAmount = Number(amount);
    if (amount === undefined || amount === null || amount === "") {
      throw new BadRequestException("amount 不能为空");
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      throw new BadRequestException("amount 必须是大于 0 的数字");
    }
    return this.budgetService.checkOverrun({
      department: department.trim(),
      month: month.trim(),
      year: parsedYear,
      amount: parsedAmount,
    });
  }

  @Post("batch")
  @NeedLogin()
  @ApiOperation({ summary: '批量创建预算' })
  @ApiResponse({ status: 200, description: '成功' })
  @ApiResponse({ status: 400, description: '参数验证失败' })
  @ApiResponse({ status: 401, description: '未认证' })
  async batchCreate(
    @Body() dto: BatchCreateBudgetDto,
  ): Promise<{ successCount: number }> {
    return this.budgetService.batchCreate(dto);
  }

  @ApiOperation({ summary: '获取预算详情' })
  @ApiParam({ name: 'id', description: '预算ID' })
  @ApiResponse({ status: 200, description: '成功' })
  @ApiResponse({ status: 400, description: '参数验证失败' })
  @ApiResponse({ status: 401, description: '未认证' })
  @ApiResponse({ status: 404, description: '资源不存在' })
  @Get(":id")
  async findOne(@Param("id") id: string): Promise<Budget> {
    return this.budgetService.findOne(id);
  }

  @Post()
  @NeedLogin()
  @AuditAction('budget', 'CREATE', 'budget')
  @ApiOperation({ summary: '创建预算' })
  @ApiResponse({ status: 200, description: '成功' })
  @ApiResponse({ status: 400, description: '参数验证失败' })
  @ApiResponse({ status: 401, description: '未认证' })
  async create(
    @Body() dto: CreateBudgetDto,
  ): Promise<{ id: string }> {
    return this.budgetService.create(dto);
  }

  @Put(":id")
  @NeedLogin()
  @AuditAction('budget', 'UPDATE', 'budget')
  @ApiOperation({ summary: '更新预算' })
  @ApiParam({ name: 'id', description: '预算ID' })
  @ApiResponse({ status: 200, description: '成功' })
  @ApiResponse({ status: 400, description: '参数验证失败' })
  @ApiResponse({ status: 401, description: '未认证' })
  @ApiResponse({ status: 404, description: '资源不存在' })
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateBudgetDto,
  ): Promise<Budget> {
    return this.budgetService.update(id, dto);
  }

  @Delete(":id")
  @NeedLogin()
  @ApiOperation({ summary: '删除预算' })
  @ApiParam({ name: 'id', description: '预算ID' })
  @ApiResponse({ status: 200, description: '成功' })
  @ApiResponse({ status: 400, description: '参数验证失败' })
  @ApiResponse({ status: 401, description: '未认证' })
  @ApiResponse({ status: 404, description: '资源不存在' })
  async remove(@Param("id") id: string): Promise<{ success: boolean }> {
    return this.budgetService.remove(id);
  }

  @ApiOperation({ summary: '获取预算调整记录' })
  @ApiParam({ name: 'id', description: '预算ID' })
  @ApiResponse({ status: 200, description: '成功' })
  @ApiResponse({ status: 400, description: '参数验证失败' })
  @ApiResponse({ status: 401, description: '未认证' })
  @ApiResponse({ status: 404, description: '资源不存在' })
  @Get(":id/adjustments")
  async getAdjustments(
    @Param("id") id: string,
  ): Promise<BudgetAdjustment[]> {
    return this.budgetService.getAdjustments(id);
  }
}
