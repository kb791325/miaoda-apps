import { Controller, Get, Post, Patch, Body, Req, Param, NotFoundException, BadRequestException } from '@nestjs/common';
import { NeedLogin, CanRole } from '@lark-apaas/fullstack-nestjs-core';
import { AfterSaleService } from './after-sale.service';
import type {
  AfterSaleResponse,
  AfterSaleCreateRequest,
  AfterSaleUpdateStatusRequest,
  AfterSaleOrder,
} from '@shared/api.interface';
import { ROLE_OPERATIONS, ROLE_SUPERVISOR, ROLE_BOSS } from '@shared/roles';

@Controller('api/after-sale')
export class AfterSaleController {
  constructor(private readonly afterSaleService: AfterSaleService) {}

  @CanRole([ROLE_OPERATIONS, ROLE_SUPERVISOR, ROLE_BOSS])
  @Get()
  async findAll(): Promise<AfterSaleResponse> {
    return this.afterSaleService.findAll();
  }

  @CanRole([ROLE_OPERATIONS, ROLE_SUPERVISOR])
  @NeedLogin()
  @Post()
  async create(
    @Req() req,
    @Body() body: AfterSaleCreateRequest,
  ): Promise<AfterSaleOrder> {
    const userId: string = req.userContext?.userId ?? '';
    return this.afterSaleService.create(body, userId);
  }

  @CanRole([ROLE_OPERATIONS, ROLE_SUPERVISOR])
  @NeedLogin()
  @Patch(':id/status')
  async updateStatus(
    @Req() req,
    @Param('id') id: string,
    @Body() body: AfterSaleUpdateStatusRequest,
  ): Promise<AfterSaleOrder> {
    const userId: string = req.userContext?.userId ?? '';
    const validStatuses = ['处理中', '已完成', '已拒绝'];
    if (!validStatuses.includes(body.status)) {
      throw new BadRequestException('无效的状态值');
    }
    try {
      return await this.afterSaleService.updateStatus(id, body.status, userId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '操作失败';
      if (msg === '工单不存在') {
        throw new NotFoundException(msg);
      }
      throw new BadRequestException(msg);
    }
  }
}
