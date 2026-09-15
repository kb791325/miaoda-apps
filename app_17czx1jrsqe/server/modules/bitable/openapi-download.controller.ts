import {
  BadRequestException,
  Controller,
  Get,
  Inject,
  Logger,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { DRIZZLE_DATABASE, FileService } from '@lark-apaas/fullstack-nestjs-core';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import { BitableService } from '../../common/feishu/bitable.service';
import { fileStorageMapping } from '../../database/schema';
import type { Request, Response } from 'express';

@Controller('openapi/upload')
export class OpenApiDownloadController {
  private readonly logger = new Logger(OpenApiDownloadController.name);

  constructor(
    private readonly bitable: BitableService,
    private readonly fileService: FileService,
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  @Get('download')
  async downloadProxy(
    @Query('fileToken') fileToken?: string,
    @Query('extra') extra?: string,
    @Req() req?: Request,
    @Res() res?: Response,
  ) {
    if (!fileToken) throw new BadRequestException('fileToken 不能为空');

    const rawUrl = req?.originalUrl || req?.url || '';
    const match = rawUrl.match(/[?&]extra=([^&]*)/);
    const rawExtra = match ? match[1] : extra;

    this.logger.log(`downloadProxy: fileToken=${fileToken}, rawExtra=${rawExtra}`);

    try {
      const rows = await this.db.select({ filePath: fileStorageMapping.filePath })
        .from(fileStorageMapping)
        .where(eq(fileStorageMapping.fileToken, fileToken))
        .limit(1);
      if (rows.length > 0 && rows[0].filePath) {
        const { content } = await this.fileService.download(rows[0].filePath);
        const buffer = Buffer.from(await (content as any).arrayBuffer?.() ?? content);
        if (buffer && buffer.length > 0) {
          this.logger.log(`dataloom 持久化下载成功: filePath=${rows[0].filePath}, size=${buffer.length}`);
          res.setHeader('Content-Type', 'application/octet-stream');
          res.setHeader('Content-Length', String(buffer.length));
          res.setHeader('Cache-Control', 'public, max-age=3600');
          res.send(buffer);
          return;
        }
      }
    } catch (e: any) {
      this.logger.warn(`dataloom 下载失败，尝试飞书回源: ${e?.message}`);
    }

    try {
      const { buffer, contentType } = await this.bitable.downloadMedia(fileToken, rawExtra);
      this.logger.log(`飞书下载成功: content-type=${contentType}, size=${buffer.length}`);
      try {
        await this.fileService.upload(buffer, {
          fileName: fileToken,
          contentType,
          upsert: true,
        });
        this.logger.log(`飞书回源成功，已补写 dataloom: ${fileToken}`);
      } catch (e2: any) {
        this.logger.warn(`飞书回源补写 dataloom 失败: ${e2?.message}`);
      }
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Length', String(buffer.length));
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.send(buffer);
    } catch (e: any) {
      this.logger.error(`代理下载失败: ${e?.message || String(e)}`);
      throw new BadRequestException(`下载失败: ${e?.message || '网络错误'}`);
    }
  }
}