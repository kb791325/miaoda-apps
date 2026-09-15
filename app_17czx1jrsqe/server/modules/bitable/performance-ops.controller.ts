import { Body, Controller, Post, Get, Query, HttpCode, HttpStatus, BadRequestException, Logger } from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import { PerformanceLinkageService } from './performance-linkage.service';

@Controller('api/performance')
@NeedLogin()
export class PerformanceOpsController {
  private readonly logger = new Logger(PerformanceOpsController.name);

  constructor(private readonly perfLinkage: PerformanceLinkageService) {}

  @Post('recalc-payroll')
  @HttpCode(HttpStatus.OK)
  async recalcPayroll(@Body() body: { month?: string }) {
    const month = String(body?.month || '').trim();
    if (!/^\d{4}-\d{2}$/.test(month)) {
      throw new BadRequestException('month 格式须为 YYYY-MM');
    }
    this.logger.log(`收到绩效工资重算请求: ${month}`);
    const data = await this.perfLinkage.recalcPayroll(month);
    return { code: 0, data };
  }

  @Get('payroll-preview')
  async payrollPreview(
    @Query('employeeName') employeeName?: string,
    @Query('period') period?: string,
    @Query('totalScore') totalScore?: string,
  ) {
    const employee = String(employeeName || '').trim();
    const month = String(period || '').trim();
    if (!employee) throw new BadRequestException('employeeName 必填');
    if (!/^\d{4}-\d{2}$/.test(month)) throw new BadRequestException('period 格式须为 YYYY-MM');
    const score = Number(totalScore);
    const data = await this.perfLinkage.payrollPreview(
      employee,
      month,
      Number.isFinite(score) ? score : 0,
    );
    return { code: 0, data };
  }
}
