import { Controller, Get, Delete, Param, NotFoundException } from '@nestjs/common';
import { CanRole } from '@lark-apaas/fullstack-nestjs-core';
import { DashboardService } from './dashboard.service';
import type { DashboardResponse } from '@shared/api.interface';
import { ROLE_OPERATIONS, ROLE_SUPERVISOR, ROLE_BOSS } from '@shared/roles';

@Controller('api/dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @CanRole([ROLE_OPERATIONS, ROLE_SUPERVISOR, ROLE_BOSS])
  @Get()
  async findAll(): Promise<DashboardResponse> {
    return this.dashboardService.findAll();
  }

  @CanRole([ROLE_OPERATIONS, ROLE_SUPERVISOR, ROLE_BOSS])
  @Delete('alerts/:id')
  async deleteAlert(@Param('id') id: string) {
    const deleted = await this.dashboardService.deleteAlert(id);
    if (deleted.length === 0) {
      throw new NotFoundException('提醒不存在');
    }
    return { success: true };
  }
}
