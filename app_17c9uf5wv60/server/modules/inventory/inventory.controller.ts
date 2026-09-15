import { Controller, Get, Param, Query } from '@nestjs/common';
import { NeedLogin, CanRole } from '@lark-apaas/fullstack-nestjs-core';
import { InventoryService } from './inventory.service';
import type { DashboardStats, WarehouseInventoryItem } from '@shared/api.interface';

@Controller('api/inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @NeedLogin()
  @CanRole(['boss', 'supervisor', 'warehouse_admin', 'purchaser', 'sales', 'finance'])
  @Get('dashboard')
  async getDashboard(
    @Query('category') category?: string,
    @Query('status') status?: string,
    @Query('keyword') keyword?: string,
  ): Promise<DashboardStats> {
    const params: Record<string, string> = {};
    if (category) params.category = category;
    if (status) params.status = status;
    if (keyword) params.keyword = keyword;
    return this.inventoryService.getDashboardStats(params);
  }

  @NeedLogin()
  @CanRole(['boss', 'supervisor', 'warehouse_admin', 'purchaser', 'sales', 'finance'])
  @Get('warehouse-stock/:productId')
  async getWarehouseStock(
    @Param('productId') productId: string,
  ): Promise<WarehouseInventoryItem[]> {
    return this.inventoryService.getWarehouseStock(productId);
  }
}
