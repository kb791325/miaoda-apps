import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { AppAuthGuard } from '@server/modules/auth/app-auth.guard';
import { RequirePermissions } from '@server/modules/auth/auth.decorator';
import { FinanceService } from './finance.service';
import type {
  FinanceDashboardResponse,
  FinanceReportCustomerResponse,
  FinanceReportProductResponse,
  FinanceReportTimelineResponse,
} from '@shared/finance';

@Controller('api/finance')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @UseGuards(AppAuthGuard)
  @RequirePermissions('report:finance')
  @Get('dashboard')
  async dashboard(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<FinanceDashboardResponse> {
    return this.financeService.getDashboard(startDate, endDate);
  }

  @UseGuards(AppAuthGuard)
  @RequirePermissions('report:finance')
  @Get('report/timeline')
  async reportTimeline(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('groupBy') groupBy?: string,
  ): Promise<FinanceReportTimelineResponse> {
    return this.financeService.getTimelineReport(startDate, endDate, groupBy);
  }

  @UseGuards(AppAuthGuard)
  @RequirePermissions('report:finance')
  @Get('report/product')
  async reportProduct(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<FinanceReportProductResponse> {
    return this.financeService.getProductReport(startDate, endDate);
  }

  @UseGuards(AppAuthGuard)
  @RequirePermissions('report:finance')
  @Get('report/customer')
  async reportCustomer(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<FinanceReportCustomerResponse> {
    return this.financeService.getCustomerReport(startDate, endDate);
  }

  @UseGuards(AppAuthGuard)
  @RequirePermissions('report:finance')
  @Get('export')
  async exportXlsx(
    @Res({ passthrough: false }) res: Response,
    @Query('type') type: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('groupBy') groupBy?: string,
  ): Promise<void> {
    const result: { buffer: Buffer; filename: string } =
      await this.financeService.exportXlsx(type, startDate, endDate, groupBy);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename=${result.filename}`);
    res.send(result.buffer);
  }
}
