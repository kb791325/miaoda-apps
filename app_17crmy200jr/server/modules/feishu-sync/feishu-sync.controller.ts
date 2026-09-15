import {
  Body,
  Controller,
  Get,
  Param,
  Put,
  Query,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';

import { FeishuSyncService } from './feishu-sync.service';
import type {
  FeishuSyncConfig,
  FeishuSyncLog,
  SyncDirection,
  SyncDomain,
  UpdateSyncConfigDto,
} from './feishu-sync.types';
import { SYNC_DOMAINS } from './feishu-sync.constants';

/**
 * 飞书同步 Controller
 *
 * 接口列表：
 * - GET  /api/feishu-sync/configs       获取所有同步配置
 * - PUT  /api/feishu-sync/configs/:domain  更新同步配置
 * - GET  /api/feishu-sync/logs          查询同步日志（分页）
 * - POST /api/feishu-sync/:domain/sync  手动触发同步
 */
@ApiTags('飞书同步')
@Controller('api/feishu-sync')
@NeedLogin()
export class FeishuSyncController {
  constructor(private readonly feishuSyncService: FeishuSyncService) {}

  // ============================================================
  // 配置管理
  // ============================================================

  /** 获取所有同步配置 */
  @ApiOperation({ summary: '获取所有同步配置' })
  @ApiResponse({ status: 200, description: '成功' })
  @Get('configs')
  async getConfigs(): Promise<{ items: FeishuSyncConfig[] }> {
    const items = await this.feishuSyncService.getAllConfigs();
    return { items };
  }

  /** 更新指定 domain 的同步配置 */
  @NeedLogin()
  @ApiOperation({ summary: '更新同步配置' })
  @ApiParam({ name: 'domain', description: '业务域标识' })
  @ApiResponse({ status: 200, description: '成功' })
  @Put('configs/:domain')
  async updateConfig(
    @Param('domain') domain: string,
    @Body() body: UpdateSyncConfigDto,
  ): Promise<FeishuSyncConfig> {
    if (!SYNC_DOMAINS.includes(domain as SyncDomain)) {
      throw new Error(`不支持的业务域：${domain}`);
    }
    return this.feishuSyncService.updateConfig(
      domain as SyncDomain,
      body,
    );
  }

  // ============================================================
  // 同步日志
  // ============================================================

  /** 查询同步日志（分页） */
  @ApiOperation({ summary: '查询同步日志（分页）' })
  @ApiQuery({ name: 'domain', required: false, description: '业务域' })
  @ApiQuery({ name: 'direction', required: false, description: '同步方向' })
  @ApiQuery({ name: 'status', required: false, description: '状态' })
  @ApiQuery({ name: 'page', required: false, description: '页码' })
  @ApiQuery({ name: 'pageSize', required: false, description: '每页数量' })
  @ApiResponse({ status: 200, description: '成功' })
  @Get('logs')
  async getLogs(
    @Query('domain') domain?: string,
    @Query('direction') direction?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<{
    items: FeishuSyncLog[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const result = await this.feishuSyncService.getLogs({
      domain: domain as SyncDomain | undefined,
      direction: direction as SyncDirection | undefined,
      status: status as 'success' | 'failed' | 'syncing' | undefined,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    });

    return {
      items: result.items,
      total: result.total,
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : 20,
    };
  }

  // ============================================================
  // 调试
  // ============================================================

  /** 探测飞书多维表格实际字段名（调试用） */
  @NeedLogin()
  @ApiOperation({ summary: '探测飞书多维表格字段' })
  @ApiParam({ name: 'domain', description: '业务域标识' })
  @ApiResponse({ status: 200, description: '成功' })
  @Get(':domain/probe-fields')
  async probeFeishuFields(
    @Param('domain') domain: string,
  ): Promise<{ fields: string[]; sample: Record<string, unknown> }> {
    if (!SYNC_DOMAINS.includes(domain as SyncDomain)) {
      throw new Error(`不支持的业务域：${domain}`);
    }
    return this.feishuSyncService.probeFeishuFields(domain as SyncDomain);
  }

  // ============================================================
  // 同步操作
  // ============================================================

  /** 手动触发同步 */
  @NeedLogin()
  @ApiOperation({ summary: '手动触发同步' })
  @ApiParam({ name: 'domain', description: '业务域标识' })
  @ApiResponse({ status: 200, description: '成功' })
  @Post(':domain/sync')
  async triggerSync(
    @Param('domain') domain: string,
    @Body() body: { direction: SyncDirection },
    @Req() req: Request,
  ): Promise<{
    domain: string;
    direction: SyncDirection;
    status: 'success' | 'failed' | 'syncing';
    recordCount: number;
    errorMessage?: string;
    durationMs: number;
  }> {
    if (!body.direction) {
      throw new Error('缺少 direction 参数');
    }

    const userId = (req as unknown as { userContext?: { userId?: string } })
      .userContext?.userId;

    const result = await this.feishuSyncService.runSync(
      domain,
      body.direction,
      userId,
    );

    return {
      domain: result.domain,
      direction: result.direction,
      status: result.status,
      recordCount: result.recordCount,
      errorMessage: result.errorMessage,
      durationMs: result.durationMs,
    };
  }
}
