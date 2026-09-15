import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Delete,
} from '@nestjs/common';
import type { Request } from 'express';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import { InventoryTasksService } from './inventory-tasks.service';
import { InventoryChecksService } from './inventory-checks.service';
import type {
  ConfirmDiffResponse,
  CreateInventoryTaskResponse,
  InventoryCheckItem,
  InventoryTaskDetail,
  InventoryTaskItem,
  PagedResponse,
  ScopeType,
  UpdateCheckResponse,
  CompleteTaskResponse,
  BatchResetChecksResponse,
} from '@shared/api.interface';
import { CreateInventoryTaskDto } from './dto/create-inventory-task.dto';
import { UpdateInventoryCheckDto } from './dto/update-inventory-check.dto';
import { ConfirmDiffDto } from './dto/confirm-diff.dto';
import { AuditAction } from '@server/common/interceptors/audit.interceptor';

@ApiTags('盘点任务')
@Controller('api/inventory-tasks')
@NeedLogin()
export class InventoryController {
  constructor(
    private readonly tasksService: InventoryTasksService,
    private readonly checksService: InventoryChecksService,
  ) {}

  @ApiOperation({ summary: '获取盘点任务列表（分页、筛选）' })
  @ApiQuery({ name: 'page', required: false, description: '页码' })
  @ApiQuery({ name: 'pageSize', required: false, description: '每页条数' })
  @ApiQuery({ name: 'status', required: false, description: '任务状态' })
  @ApiQuery({ name: 'checkMonth', required: false, description: '盘点月份' })
  @ApiQuery({ name: 'keyword', required: false, description: '关键词搜索' })
  @ApiResponse({ status: 200, description: '成功' })
  @Get()
  async listTasks(
    @Req() req: Request,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('status') status?: string,
    @Query('checkMonth') checkMonth?: string,
    @Query('keyword') keyword?: string,
  ): Promise<PagedResponse<InventoryTaskItem>> {
    const { userId } = (
      req as unknown as { userContext: { userId: string } }
    ).userContext;
    return this.tasksService.list({
      page: page ? parseInt(page, 10) : 1,
      pageSize: Math.min(100, pageSize ? parseInt(pageSize, 10) : 20),
      status,
      checkMonth,
      keyword,
      userId,
    });
  }

  @NeedLogin()
  @ApiOperation({ summary: '创建盘点任务' })
  @ApiResponse({ status: 200, description: '成功' })
  @ApiResponse({ status: 400, description: '参数验证失败' })
  @Post()
  @AuditAction('inventory', 'CREATE', 'inventory')
  async createTask(
    @Req() req: Request,
    @Body() dto: CreateInventoryTaskDto,
  ): Promise<CreateInventoryTaskResponse> {
    const { userId } = (
      req as unknown as { userContext: { userId: string } }
    ).userContext;
    const result = await this.tasksService.create({
      taskName: dto.taskName,
      checkYear: dto.checkYear,
      checkMonth: dto.checkMonth,
      checker: userId,
      scopeType: (dto.scopeType || 'all') as ScopeType,
      scopeValue: dto.scopeValue,
      assetType: dto.assetType,
      floor: dto.floor,
      department: dto.department,
      remark: dto.remark,
    });
    return result;
  }

  @NeedLogin()
  @ApiOperation({ summary: '删除盘点任务' })
  @ApiParam({ name: 'id', description: '任务ID' })
  @ApiResponse({ status: 200, description: '成功' })
  @ApiResponse({ status: 404, description: '资源不存在' })
  @Delete(':id')
  async removeTask(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<{ success: boolean }> {
    const { userId } = (
      req as unknown as { userContext: { userId: string } }
    ).userContext;
    return this.tasksService.remove(id, userId);
  }

  @ApiOperation({ summary: '获取任务检查项列表' })
  @ApiParam({ name: 'id', description: '任务ID' })
  @ApiResponse({ status: 200, description: '成功' })
  @Get(':id/checks')
  async getTaskChecks(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<{ items: InventoryCheckItem[]; total: number }> {
    const { userId } = (
      req as unknown as { userContext: { userId: string } }
    ).userContext;
    const items = await this.tasksService.getChecks(id, userId);
    return { items, total: items.length };
  }

  @ApiOperation({ summary: '获取盘点任务详情' })
  @ApiParam({ name: 'id', description: '任务ID' })
  @ApiResponse({ status: 200, description: '成功' })
  @ApiResponse({ status: 404, description: '资源不存在' })
  @Get(':id')
  async getTask(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<InventoryTaskDetail> {
    const { userId } = (
      req as unknown as { userContext: { userId: string } }
    ).userContext;
    return this.tasksService.getDetail(id, userId);
  }

  @NeedLogin()
  @ApiOperation({ summary: '重新生成检查项' })
  @ApiParam({ name: 'id', description: '任务ID' })
  @ApiResponse({ status: 200, description: '成功' })
  @Post(':id/regenerate-checks')
  async regenerateChecks(
    @Param('id') id: string,
  ): Promise<{ totalCount: number }> {
    return this.tasksService.regenerateChecks(id);
  }

  @NeedLogin()
  @ApiOperation({ summary: '完成盘点任务' })
  @ApiParam({ name: 'id', description: '任务ID' })
  @ApiResponse({ status: 200, description: '成功' })
  @Post(':id/complete')
  @AuditAction('inventory', 'UPDATE', 'inventory')
  async completeTask(
    @Param('id') id: string,
  ): Promise<CompleteTaskResponse> {
    return this.tasksService.completeTask(id);
  }

  @NeedLogin()
  @ApiOperation({ summary: '重置任务检查项' })
  @ApiParam({ name: 'id', description: '任务ID' })
  @ApiResponse({ status: 200, description: '成功' })
  @Post(':id/reset-checks')
  @AuditAction('inventory', 'DELETE', 'inventory')
  async resetChecks(
    @Param('id') id: string,
  ): Promise<BatchResetChecksResponse> {
    return this.tasksService.resetChecks(id);
  }
}

@ApiTags('盘点检查项')
@Controller('api/inventory-checks')
@NeedLogin()
export class InventoryChecksController {
  constructor(private readonly checksService: InventoryChecksService) {}

  @NeedLogin()
  @ApiOperation({ summary: '更新检查项' })
  @ApiParam({ name: 'id', description: '检查项ID' })
  @ApiResponse({ status: 200, description: '成功' })
  @Patch(':id')
  async updateCheck(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateInventoryCheckDto,
  ): Promise<UpdateCheckResponse> {
    const { userId } = (
      req as unknown as { userContext: { userId: string } }
    ).userContext;
    return this.checksService.updateCheck(id, {
      actualQuantity: dto.actualQuantity ?? 0,
      remark: dto.remark,
    }, userId);
  }

  @NeedLogin()
  @ApiOperation({ summary: '确认差异' })
  @ApiParam({ name: 'id', description: '检查项ID' })
  @ApiResponse({ status: 200, description: '成功' })
  @Post(':id/confirm-diff')
  async confirmDiff(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: ConfirmDiffDto,
  ): Promise<ConfirmDiffResponse> {
    const { userId } = (
      req as unknown as { userContext: { userId: string } }
    ).userContext;
    return this.checksService.confirmDiff(id, dto, userId);
  }
}
