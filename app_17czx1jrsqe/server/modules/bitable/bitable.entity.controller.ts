import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  Req,
  HttpCode,
  HttpStatus,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import { BitableEntityService } from './bitable.entity.service';
import { FinanceLinkageService } from './finance-linkage.service';
import { AdminLinkageService } from './admin-linkage.service';
import { PerformanceLinkageService } from './performance-linkage.service';
import { RoleAccessService } from './role-access.service';
import { AuditService, buildFieldDiff, type RequestWithUser as AuditRequest } from '../audit/audit.service';
import { TABLE_MAP, getTableWriteRoles } from '../../config/feishu.config';
import type { Request } from 'express';

interface RequestWithUser {
  userContext: {
    userId: string;
    tenantId: string;
    appId: string;
    roles: string[];
    userName: string;
    userNameEn: string;
    userNameI18n: Record<string, string>;
    env: string;
  };
}

@Controller('api')
export class HealthController {
  @Get('health')
  health() {
    return {
      code: 0,
      data: {
        status: 'ok',
        tables_mapped: Object.keys(TABLE_MAP).length,
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Get('bitable/health')
  bitableHealth() {
    return {
      code: 0,
      data: {
        total_mapped_tables: Object.keys(TABLE_MAP).length,
        tables: Object.keys(TABLE_MAP),
      },
    };
  }
}

@Controller('api/entity')
@NeedLogin()
export class BitableEntityController {
  constructor(
    private readonly entityService: BitableEntityService,
    private readonly financeLinkage: FinanceLinkageService,
    private readonly adminLinkage: AdminLinkageService,
    private readonly perfLinkage: PerformanceLinkageService,
    private readonly audit: AuditService,
    private readonly roleAccess: RoleAccessService,
  ) {}

  private readonly logger = new Logger(BitableEntityController.name);

  private errMessage(e: unknown): string {
    return e instanceof Error ? e.message : String(e);
  }

  private pickBizNo(record: Record<string, unknown> | null | undefined): string {
    if (!record) return '';
    const keys = ['流水号', '客户名称', '客户编号', '单号', '发票号', '资产名称', '任务编号', '日志编号', '名称', '设置键'];
    for (const key of keys) {
      const value = record[key];
      if (value !== null && value !== undefined && String(value).length > 0) return String(value);
    }
    return '';
  }

  private async writeAudit(
    tableKey: string,
    opType: string,
    summary: string,
    req: RequestWithUser,
    objectNo?: string,
    result: '成功' | '失败' = '成功',
    failReason?: string,
  ): Promise<void> {
    await this.audit.writeOperationLog({
      req: req as AuditRequest,
      module: tableKey,
      opType,
      objectType: '业务实体',
      objectNo,
      summary,
      result,
      failReason,
    });
  }

  private async checkWriteAccess(tableKey: string, req: RequestWithUser): Promise<void> {
    const userRoles: string[] = req.userContext?.roles || [];
    // 优先：角色表 menu_ids 配置驱动（admin / 未配置返回 null，回退原有链路）
    const byRoleConfig = await this.roleAccess.checkModuleWriteAccess(tableKey, userRoles);
    if (byRoleConfig === false) {
      throw new ForbiddenException(`当前角色的菜单权限未包含 ${tableKey} 所属模块，无写操作权限`);
    }
    if (byRoleConfig === true) return;
    const requiredRoles = getTableWriteRoles(tableKey);
    if (requiredRoles.length === 0) return;
    if (userRoles.length === 0) return;
    const hasRole = requiredRoles.some((r: string) => userRoles.includes(r));
    if (!hasRole) {
      throw new ForbiddenException(`无 ${tableKey} 模块的写操作权限`);
    }
  }

  private applyLogReadScope(tableKey: string, filters: Record<string, string>, req: RequestWithUser): void {
    const isLogTable = tableKey === '系统-操作日志' || tableKey === '系统-登录日志';
    if (!isLogTable) return;
    const roles: string[] = req.userContext?.roles || [];
    if (roles.length === 0 || roles.includes('admin') || roles.includes('manager')) return;
    filters[tableKey === '系统-操作日志' ? '操作人标识' : '用户标识'] = String(req.userContext?.userId || '');
  }

  @Get(':tableKey')
  async list(
    @Param('tableKey') tableKey: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('pageToken') pageToken?: string,
    @Query('keyword') keyword?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
    @Query() query?: any,
    @Req() req?: RequestWithUser,
  ) {
    const reserved = new Set([
      'page', 'pageSize', 'pageToken', 'keyword', 'sortBy', 'sortOrder', 'date_range',
    ]);
    const filters: Record<string, string> = {};
    for (const [k, v] of Object.entries(query || {})) {
      if (reserved.has(k) || typeof v !== 'string' || !v) continue;
      filters[k] = v;
    }
    if (req) {
      this.applyLogReadScope(tableKey, filters, req);
      try {
        const scope = await this.roleAccess.resolveDataScope(req.userContext?.roles || []);
        const scopeFilters = await this.roleAccess.buildScopeFilter(tableKey, scope, req.userContext);
        Object.assign(filters, scopeFilters);
      } catch (e) {
        this.logger.warn(`数据范围过滤失败，按全量返回: ${this.errMessage(e)}`);
      }
    }

    const pageNum = parseInt(page ?? '', 10);
    const pageSizeNum = parseInt(pageSize ?? '', 10);
    const result = await this.entityService.list(tableKey, {
      page: Number.isFinite(pageNum) && pageNum >= 1 ? pageNum : 1,
      pageSize: Number.isFinite(pageSizeNum) ? Math.min(Math.max(pageSizeNum, 1), 200) : 20,
      pageToken: pageToken || undefined,
      keyword,
      sortBy,
      sortOrder,
      filters: Object.keys(filters).length > 0 ? filters : undefined,
    });

    if (!result) {
      return { code: 0, data: { list: [], total: 0, page: pageNum || 1, page_size: pageSizeNum || 20, has_more: false } };
    }

    return {
      code: 0,
      data: {
        list: result.items,
        total: result.total,
        page: result.page,
        page_size: result.pageSize,
        has_more: result.hasMore,
        next_page_token: result.nextPageToken,
      },
    };
  }

  @Get(':tableKey/:id')
  async get(@Param('tableKey') tableKey: string, @Param('id') id: string) {
    const data = await this.entityService.get(tableKey, id);
    return { code: 0, data };
  }

  @Post(':tableKey')
  @HttpCode(HttpStatus.OK)
  async create(
    @Param('tableKey') tableKey: string,
    @Body() body: any,
    @Req() req: RequestWithUser,
  ) {
    await this.checkWriteAccess(tableKey, req);
    let data: Record<string, unknown> | null;
    try {
      data = await this.entityService.create(tableKey, body.fields || body);
    } catch (e) {
      const msg = this.errMessage(e);
      await this.writeAudit(tableKey, '新增', `创建失败: ${msg}`, req, undefined, '失败', msg);
      throw e;
    }
    if (this.financeLinkage.isFinanceTable(tableKey)) {
      await this.financeLinkage.afterCreate(tableKey, data);
    }
    if (this.adminLinkage.isLinkageTable(tableKey)) {
      await this.adminLinkage.afterCreate(tableKey, data);
    }
    if (this.perfLinkage.isLinkageTable(tableKey)) {
      await this.perfLinkage.afterCreate(tableKey, data);
    }
    if (tableKey === '系统-角色') this.roleAccess.invalidate();
    const newId = String(data?._id || data?.record_id || '');
    this.writeAudit(tableKey, '新增', `新增记录 ${this.pickBizNo(data) || newId}`, req, newId);
    return { code: 0, data };
  }

  @Put(':tableKey/:id')
  async update(
    @Param('tableKey') tableKey: string,
    @Param('id') id: string,
    @Body() body: any,
    @Req() req: RequestWithUser,
  ) {
    await this.checkWriteAccess(tableKey, req);
    const fields = body.fields || body;
    let oldRecord: Record<string, unknown> | null = null;
    if (this.financeLinkage.isFinanceTable(tableKey)) {
      oldRecord = await this.entityService.get(tableKey, id);
      this.financeLinkage.normalizeIncomingStatus(tableKey, fields);
    }
    if (this.adminLinkage.isLinkageTable(tableKey)) {
      if (!oldRecord) oldRecord = await this.entityService.get(tableKey, id);
      await this.adminLinkage.beforeUpdate(tableKey, oldRecord, fields);
    }
    if (this.perfLinkage.isLinkageTable(tableKey) && !oldRecord) {
      oldRecord = await this.entityService.get(tableKey, id);
    }
    if (!oldRecord) {
      try {
        oldRecord = await this.entityService.get(tableKey, id);
      } catch {
        oldRecord = null;
      }
    }
    let data: Record<string, unknown> | null;
    try {
      data = await this.entityService.update(tableKey, id, fields);
    } catch (e) {
      const msg = this.errMessage(e);
      await this.writeAudit(tableKey, '修改', `更新失败: ${msg}`, req, id, '失败', msg);
      throw e;
    }
    if (this.financeLinkage.isFinanceTable(tableKey)) {
      await this.financeLinkage.afterUpdate(tableKey, oldRecord, fields);
    }
    if (this.adminLinkage.isLinkageTable(tableKey)) {
      await this.adminLinkage.afterUpdate(tableKey, oldRecord, fields);
    }
    if (this.perfLinkage.isLinkageTable(tableKey)) {
      await this.perfLinkage.afterUpdate(tableKey, oldRecord, fields);
    }
    if (tableKey === '系统-角色') this.roleAccess.invalidate();
    this.writeAudit(tableKey, '修改', buildFieldDiff(oldRecord, fields), req, id);
    return { code: 0, data };
  }

  @Delete(':tableKey/:id')
  async delete(
    @Param('tableKey') tableKey: string,
    @Param('id') id: string,
    @Req() req: RequestWithUser,
  ) {
    await this.checkWriteAccess(tableKey, req);
    let record: Record<string, unknown> | null = null;
    try {
      record = await this.entityService.get(tableKey, id);
    } catch {
      record = null;
    }
    try {
      await this.entityService.delete(tableKey, id);
    } catch (e) {
      const msg = this.errMessage(e);
      await this.writeAudit(tableKey, '删除', `删除失败: ${msg}`, req, id, '失败', msg);
      throw e;
    }
    if (this.perfLinkage.isLinkageTable(tableKey) && record) {
      await this.perfLinkage.afterRemove(tableKey, record);
    } else if (this.financeLinkage.isFinanceTable(tableKey) && record) {
      await this.financeLinkage.afterRemove(tableKey, record);
    }
    if (tableKey === '系统-角色') this.roleAccess.invalidate();
    this.writeAudit(tableKey, '删除', `删除记录 ${this.pickBizNo(record) || id}`, req, id);
    return { code: 0, data: true };
  }

  @Post(':tableKey/batch-create')
  @HttpCode(HttpStatus.OK)
  async batchCreate(
    @Param('tableKey') tableKey: string,
    @Body() body: { rows?: Array<Record<string, unknown>> },
    @Req() req: RequestWithUser,
  ) {
    await this.checkWriteAccess(tableKey, req);
    const rows = body.rows || [];
    if (rows.length === 0) {
      throw new BadRequestException('未提供可创建的数据行');
    }
    if (rows.length > 5000) {
      throw new BadRequestException('单次导入不能超过 5000 行');
    }
    let results: unknown;
    try {
      results = await this.entityService.batchCreate(tableKey, rows);
    } catch (e) {
      const msg = this.errMessage(e);
      await this.writeAudit(tableKey, '批量新增', `批量新增失败: ${msg}`, req, undefined, '失败', msg);
      throw e;
    }
    this.writeAudit(tableKey, '批量新增', `批量新增 ${rows.length} 行`, req);
    return { code: 0, data: results };
  }

  @Post(':tableKey/batch-delete')
  @HttpCode(HttpStatus.OK)
  async batchDelete(
    @Param('tableKey') tableKey: string,
    @Body() body: { ids: string[] },
    @Req() req: RequestWithUser,
  ) {
    await this.checkWriteAccess(tableKey, req);
    const ids = body.ids || [];
    let records: any[] = [];
    if (this.financeLinkage.isFinanceTable(tableKey) || this.perfLinkage.isLinkageTable(tableKey)) {
      for (const rid of ids) {
        try {
          records.push(await this.entityService.get(tableKey, rid));
        } catch {
          // 单条读取失败不阻断批量删除
        }
      }
    }
    await this.entityService.batchDelete(tableKey, ids);
    if (this.perfLinkage.isLinkageTable(tableKey)) {
      for (const record of records) {
        await this.perfLinkage.afterRemove(tableKey, record);
      }
    } else {
      for (const record of records) {
        await this.financeLinkage.afterRemove(tableKey, record);
      }
    }
    if (tableKey === '系统-角色') this.roleAccess.invalidate();
    this.writeAudit(tableKey, '批量删除', `批量删除 ${ids.length} 行`, req, ids.slice(0, 5).join(','));
    return { code: 0, data: true };
  }
}