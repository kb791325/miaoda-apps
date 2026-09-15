import { Controller, Get, Post, Delete, Body, Param, Req } from '@nestjs/common';
import { NeedLogin, CanRole } from '@lark-apaas/fullstack-nestjs-core';
import { InventoryService } from './inventory.service';
import type {
  InventoryListResponse,
  InventoryChangeRequest,
  InventoryChangeResponse,
  InventoryBatchChangeRequest,
  InventoryBatchChangeResponse,
} from '@shared/api.interface';
import { ROLE_PROCUREMENT, ROLE_OPERATIONS, ROLE_SUPERVISOR, ROLE_BOSS } from '@shared/roles';

@Controller('api/inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @CanRole([ROLE_PROCUREMENT, ROLE_OPERATIONS, ROLE_SUPERVISOR, ROLE_BOSS])
  @Get()
  async findAll(): Promise<InventoryListResponse> {
    const items = await this.inventoryService.findAll();
    return { items };
  }

  @CanRole([ROLE_PROCUREMENT, ROLE_SUPERVISOR])
  @NeedLogin()
  @Post('change')
  async change(
    @Req() req,
    @Body() body: InventoryChangeRequest,
  ): Promise<InventoryChangeResponse> {
    const userId: string = req.userContext?.userId ?? '';
    return this.inventoryService.change(body, userId);
  }

  @CanRole([ROLE_PROCUREMENT, ROLE_SUPERVISOR])
  @NeedLogin()
  @Post('batch-change')
  async batchChange(
    @Req() req,
    @Body() body: InventoryBatchChangeRequest,
  ): Promise<InventoryBatchChangeResponse> {
    const userId: string = req.userContext?.userId ?? '';
    return this.inventoryService.batchChange(body.items, userId);
  }

  @CanRole([ROLE_PROCUREMENT, ROLE_SUPERVISOR])
  @NeedLogin()
  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.inventoryService.remove(id);
    return { success: true };
  }
}
