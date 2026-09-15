import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  Req,
} from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import { SyncService } from './sync.service';
import type {
  SyncConfig,
  SaveSyncConfigRequest,
  SyncResult,
  PushOneRequest,
  SyncLogListResponse,
  SyncTaskStatus,
  FeishuFieldInfo,
  SmartMatchResult,
  SyncStats,
} from '@shared/api.interface';

@Controller('api/sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @NeedLogin()
  @Get('configs')
  async getConfigs(): Promise<SyncConfig[]> {
    return this.syncService.getConfigs();
  }

  @NeedLogin()
  @Post('configs/:domain')
  async saveConfig(
    @Param('domain') domain: string,
    @Body() dto: SaveSyncConfigRequest,
    @Req() req: Request,
  ): Promise<SyncConfig> {
    const { userId } = (req as unknown as { userContext: { userId: string } }).userContext;
    return this.syncService.saveConfig(domain, dto, userId);
  }

  @NeedLogin()
  @Post(':domain/initialize')
  async initialize(
    @Req() req: Request,
    @Param('domain') domain: string,
  ): Promise<SyncResult> {
    const { userId } = (req as unknown as { userContext: { userId: string } }).userContext;
    return this.syncService.initialize(domain, userId);
  }

  @NeedLogin()
  @Post(':domain/push')
  async pushAll(
    @Param('domain') domain: string,
    @Req() req: Request,
  ): Promise<SyncResult> {
    const { userId } = (req as unknown as { userContext: { userId: string } }).userContext;
    return this.syncService.pushAll(domain, userId);
  }

  @NeedLogin()
  @Post(':domain/pull')
  async pullAll(
    @Param('domain') domain: string,
  ): Promise<SyncResult> {
    return this.syncService.pullAll(domain);
  }

  @NeedLogin()
  @Post(':domain/push-one')
  async pushOne(
    @Param('domain') domain: string,
    @Body() dto: PushOneRequest,
  ): Promise<SyncResult> {
    return this.syncService.pushOne(domain, dto.recordId, dto.action);
  }

  @NeedLogin()
  @Get('logs')
  async getLogs(
    @Query('page') pageStr?: string,
    @Query('pageSize') pageSizeStr?: string,
    @Query('domain') domain?: string,
  ): Promise<SyncLogListResponse> {
    const page = Math.max(1, parseInt(pageStr ?? '1', 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(pageSizeStr ?? '20', 10) || 20));
    return this.syncService.getLogs(page, pageSize, domain);
  }

  @NeedLogin()
  @Post(':domain/async-push')
  async asyncPush(
    @Param('domain') domain: string,
  ): Promise<{ taskId: string }> {
    const taskId = this.syncService.startAsyncTask(domain, 'push_all');
    return { taskId };
  }

  @NeedLogin()
  @Post(':domain/async-pull')
  async asyncPull(
    @Param('domain') domain: string,
  ): Promise<{ taskId: string }> {
    const taskId = this.syncService.startAsyncTask(domain, 'pull_all');
    return { taskId };
  }

  @NeedLogin()
  @Get('tasks/:taskId')
  async getTaskStatus(
    @Param('taskId') taskId: string,
  ): Promise<SyncTaskStatus> {
    return this.syncService.getTaskStatus(taskId);
  }

  @NeedLogin()
  @Get(':domain/fields')
  async getFeishuFields(
    @Param('domain') domain: string,
  ): Promise<FeishuFieldInfo[]> {
    return this.syncService.listFeishuFields(domain);
  }

  @NeedLogin()
  @Post(':domain/smart-match')
  async smartMatch(
    @Param('domain') domain: string,
    @Body() body: { fields: Array<{ fieldName: string }> },
  ): Promise<SmartMatchResult[]> {
    return this.syncService.smartMatchFields(domain, body.fields);
  }

  @NeedLogin()
  @Post(':domain/cleanup-recordmap')
  async cleanupRecordMap(
    @Param('domain') domain: string,
  ): Promise<{ cleaned: number; remaining: number }> {
    return this.syncService.cleanupInvalidRecordMap(domain);
  }

  @NeedLogin()
  @Post(':domain/cleanup-duplicates')
  async cleanupDuplicates(
    @Param('domain') domain: string,
  ): Promise<{ deletedCount: number; remainingCount: number }> {
    return this.syncService.cleanupDuplicates(domain);
  }

  @NeedLogin()
  @Post(':domain/clear-feishu')
  async clearFeishuRecords(
    @Param('domain') domain: string,
  ): Promise<{ taskId: string }> {
    const taskId = await this.syncService.clearFeishuRecordsAsync(domain);
    return { taskId };
  }

  @NeedLogin()
  @Get('stats')
  async getStats(): Promise<SyncStats> {
    return this.syncService.getSyncStats();
  }
}
