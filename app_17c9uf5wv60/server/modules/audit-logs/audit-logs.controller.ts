import { Controller, Get, Param, Query } from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import { AuditLogsService } from './audit-logs.service';
import type {
  AuditLogListResponse,
  AuditLog,
  AuditLogListParams,
  AuditActionType,
} from '@shared/api.interface';

@Controller('api/audit-logs')
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  @NeedLogin()
  async getList(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('actionType') actionType?: string,
    @Query('targetType') targetType?: string,
    @Query('operator') operator?: string,
    @Query('keyword') keyword?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<AuditLogListResponse> {
    const params: AuditLogListParams = {
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : 20,
      actionType: actionType as AuditActionType | undefined,
      targetType,
      operator,
      keyword,
      startDate,
      endDate,
    };
    return this.auditLogsService.getList(params);
  }

  @Get('export')
  @NeedLogin()
  async exportList(
    @Query('actionType') actionType?: string,
    @Query('targetType') targetType?: string,
    @Query('operator') operator?: string,
    @Query('keyword') keyword?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<AuditLog[]> {
    const params: AuditLogListParams = {
      actionType: actionType as AuditActionType | undefined,
      targetType,
      operator,
      keyword,
      startDate,
      endDate,
    };
    return this.auditLogsService.exportList(params);
  }

  @Get(':id')
  @NeedLogin()
  async getDetail(@Param('id') id: string): Promise<AuditLog> {
    return this.auditLogsService.getDetail(id);
  }
}
