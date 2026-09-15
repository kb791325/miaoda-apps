import { Controller, Get, Post, Body, Req } from '@nestjs/common';
import { NeedLogin, CanRole } from '@lark-apaas/fullstack-nestjs-core';
import type { Request } from 'express';
import { BackupService } from './backup.service';
import type {
  BackupExportResponse,
  BackupRecord,
  RestoreRequest,
  RestoreResponse,
} from '@shared/api.interface';

@Controller('api/backup')
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  @NeedLogin()
  @CanRole(['boss', 'supervisor'])
  @Get('export')
  async exportData(@Req() req: Request): Promise<BackupExportResponse> {
    const { userId, userName } = req.userContext;
    return this.backupService.exportAll(userId, userName);
  }

  @NeedLogin()
  @CanRole(['boss', 'supervisor'])
  @Post('restore')
  async restore(
    @Body() dto: RestoreRequest,
    @Req() req: Request,
  ): Promise<RestoreResponse> {
    const { userId, userName } = req.userContext;
    return this.backupService.restore(
      dto.payload,
      dto.fileName,
      userId,
      userName,
    );
  }

  @NeedLogin()
  @CanRole(['boss', 'supervisor'])
  @Get('records')
  async records(): Promise<{ items: BackupRecord[] }> {
    return this.backupService.listRecords();
  }
}
