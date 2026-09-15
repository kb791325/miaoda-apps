import {
  Controller,
  Get,
  Param,
  Query,
  Req,
  Res,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import type { Request, Response } from 'express';
import { AuditLogService } from './audit-log.service';
import type { AuditLogQueryParams } from './audit-log.service';
import type {
  AuditLogItem,
  AuditLogDetail,
  AuditLogStats,
  AuditLogListResponse,
  AuditModuleStat,
  AuditDailySummaryResponse,
  AuditUserStat,
  AuditTrendItem,
  AuditTypeDistribution,
  AuditTopTarget,
} from '@shared/api.interface';

@Controller('api/audit-logs')
@NeedLogin()
export class AuditLogController {
  private readonly logger = new Logger(AuditLogController.name);

  constructor(private readonly auditLogService: AuditLogService) {}

  @Get('stats/overview')
  async getStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<AuditLogStats> {
    return this.auditLogService.getAuditStats({ startDate, endDate });
  }

  @Get('stats/daily')
  async getDailySummary(
    @Query('date') date?: string,
  ): Promise<AuditDailySummaryResponse> {
    const targetDate = date || new Date().toISOString().slice(0, 10);
    return this.auditLogService.getDailyAuditSummary(targetDate);
  }

  @Get('stats/module')
  async getModuleStats(
    @Query() query: AuditLogQueryParams,
  ): Promise<AuditModuleStat[]> {
    return this.auditLogService.getModuleStats(query);
  }

  @Get('stats/user')
  async getUserStats(
    @Query() query: AuditLogQueryParams,
  ): Promise<AuditUserStat[]> {
    return this.auditLogService.getUserStats(query);
  }

  @Get('trail/:targetType/:targetId')
  async getTrail(
    @Param('targetType') targetType: string,
    @Param('targetId') targetId: string,
  ): Promise<AuditLogItem[]> {
    return this.auditLogService.getAuditTrail(targetType, targetId);
  }

  @Get('stats/trend')
  async getTrend(
    @Query('days') days?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<AuditTrendItem[]> {
    return this.auditLogService.getAuditTrend({
      days: days ? parseInt(days, 10) : undefined,
      startDate,
      endDate,
    });
  }

  @Get('stats/operation-type')
  async getOperationTypeDistribution(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<AuditTypeDistribution[]> {
    return this.auditLogService.getOperationTypeDistribution({
      startDate,
      endDate,
    });
  }

  @Get('stats/top-targets')
  async getTopTargets(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
  ): Promise<AuditTopTarget[]> {
    return this.auditLogService.getTopTargets({
      startDate,
      endDate,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('export')
  async exportLogs(
    @Query() query: AuditLogQueryParams,
    @Res() res: Response,
  ): Promise<void> {
    const csv: string = await this.auditLogService.exportAuditLogsCSV(query);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="audit-logs-${new Date().toISOString().slice(0, 10)}.csv"`,
    );
    res.send(csv);
  }

  @Get('my/actions')
  async getMyActions(
    @Req() req: Request,
    @Query() query: AuditLogQueryParams,
  ): Promise<AuditLogListResponse> {
    const { userId } = req.userContext;
    return this.auditLogService.getUserActions(userId, query);
  }

  @Get(':id')
  async findById(@Param('id') id: string): Promise<AuditLogDetail> {
    const log = await this.auditLogService.getAuditLogById(id);
    if (!log) {
      throw new NotFoundException('审计日志不存在');
    }
    return log;
  }

  @Get()
  async findAll(
    @Query() query: AuditLogQueryParams,
  ): Promise<AuditLogListResponse> {
    return this.auditLogService.getAuditLogs(query);
  }
}