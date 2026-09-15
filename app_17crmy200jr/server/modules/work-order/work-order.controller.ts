import {
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
} from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import { WorkOrderService } from './work-order.service';
import type {
  WorkOrderItem,
  WorkOrderDetail,
  WorkOrderListResponse,
  CreateWorkOrderDto,
  UpdateWorkOrderDto,
  UpdateWorkOrderStatusDto,
} from '@shared/api.interface';

@Controller('api/work-orders')
export class WorkOrderController {
  constructor(private readonly service: WorkOrderService) {}

  @Get()
  async list(
    @Query() query: Record<string, string>,
  ): Promise<WorkOrderListResponse> {
    return this.service.list({
      status: query.status,
      urgency: query.urgency,
      problemType: query.problem_type,
      keyword: query.keyword,
      page: query.page ? parseInt(query.page, 10) : undefined,
      pageSize: query.pageSize
        ? Math.min(100, parseInt(query.pageSize, 10))
        : undefined,
    });
  }

  @NeedLogin()
  @Post()
  async create(
    @Req() req: Request,
    @Body() body: CreateWorkOrderDto,
  ): Promise<WorkOrderItem> {
    const { userId } = (
      req as unknown as { userContext: { userId: string } }
    ).userContext;
    return this.service.create(body, userId);
  }

  @Get(':id')
  async getById(@Param('id') id: string): Promise<WorkOrderDetail> {
    return this.service.getById(id);
  }

  @NeedLogin()
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() body: UpdateWorkOrderDto,
  ): Promise<WorkOrderItem> {
    return this.service.update(id, body);
  }

  @NeedLogin()
  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() body: UpdateWorkOrderStatusDto,
  ): Promise<WorkOrderItem> {
    return this.service.updateStatus(id, body);
  }

  @NeedLogin()
  @Delete(':id')
  async delete(@Param('id') id: string): Promise<void> {
    return this.service.delete(id);
  }
}