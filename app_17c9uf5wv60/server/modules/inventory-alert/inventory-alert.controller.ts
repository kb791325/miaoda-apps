import { Controller, Get, Post, Req } from '@nestjs/common';
import { InventoryAlertService } from './inventory-alert.service';

@Controller('api/inventory-alert')
export class InventoryAlertController {
  constructor(private readonly inventoryAlertService: InventoryAlertService) {}

  @Post('check')
  async triggerCheck(@Req() req: { userContext: { userId: string } }) {
    const result = await this.inventoryAlertService.manuallyTriggerCheck();
    return {
      success: true,
      lowStockCount: result.lowStockCount,
      notificationCount: result.notificationCount,
      triggeredBy: req.userContext.userId,
    };
  }

  @Get('history')
  async getHistory(@Req() req: Request & { query: { page?: string; pageSize?: string } }) {
    const page = req.query.page ? parseInt(req.query.page, 10) : 1;
    const pageSize = req.query.pageSize ? parseInt(req.query.pageSize, 10) : 20;
    return this.inventoryAlertService.getAlertHistory({ page, pageSize });
  }
}
