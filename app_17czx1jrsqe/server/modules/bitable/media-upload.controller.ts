import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  OnModuleInit,
  Param,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { NeedLogin, FileService, DRIZZLE_DATABASE } from '@lark-apaas/fullstack-nestjs-core';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import { BitableService } from '../../common/feishu/bitable.service';
import { AuditService, type RequestWithUser } from '../audit/audit.service';
import { TABLE_MAP } from '../../config/feishu.config';
import { fileStorageMapping } from '../../database/schema';
import type { Request, Response } from 'express';

export interface UploadFile {
  buffer: Buffer;
  originalname: string;
  size: number;
  mimetype: string;
}

const MAX_SINGLE_UPLOAD = 25 * 1024 * 1024;
export const BLOCK_SIZE = 4 * 1024 * 1024;

interface FieldSpec {
  tableKey: string;
  field: string;
  type: number;
  uiType?: string;
}

const ATTACH_FIELDS: FieldSpec[] = [
  { tableKey: '业务-素材资料', field: '素材文件', type: 17, uiType: 'Attachment' },
  { tableKey: '业务-素材资料', field: '视频封面', type: 17, uiType: 'Attachment' },
  { tableKey: '任务-导入任务', field: '原文档', type: 17, uiType: 'Attachment' },
  { tableKey: '人资-简历库', field: '简历附件', type: 17, uiType: 'Attachment' },
  { tableKey: '任务-导入任务', field: '失败明细', type: 1 },
  { tableKey: '任务-导出任务', field: '导出行数', type: 2 },
  { tableKey: '任务-导出任务', field: '失败原因', type: 1 },
];

@Injectable()
export class AttachmentFieldService {
  private readonly logger = new Logger(AttachmentFieldService.name);

  constructor(private readonly bitable: BitableService) {}

  async ensureOne(spec: FieldSpec) {
    const tableId = TABLE_MAP[spec.tableKey];
    if (!tableId) {
      throw new Error(`未配置逻辑表 ${spec.tableKey} 的 tableId`);
    }
    await this.bitable.ensureField(tableId, spec.field, spec.type, spec.uiType);
  }

  async ensureAll() {
    for (const spec of ATTACH_FIELDS) {
      try {
        await this.ensureOne(spec);
      } catch (e) {
        this.logger.error(`确保字段存在失败 ${spec.tableKey}.${spec.field}: ${e instanceof Error ? e.message : String(e)}`);
        throw e;
      }
    }
  }
}

@Controller('api/upload')
export class MediaUploadController {
  private readonly logger = new Logger(MediaUploadController.name);

  constructor(
    private readonly bitable: BitableService,
    private readonly fields: AttachmentFieldService,
    private readonly audit: AuditService,
    private readonly http: HttpService,
    private readonly fileService: FileService,
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  @Post('from-url')
  @NeedLogin()
  @HttpCode(HttpStatus.OK)
  async uploadFromUrl(@Body() body: { url?: string; fileName?: string; name?: string; size?: number; type?: string }) {
    const url = String(body?.url || '');
    const fileName = String(body?.name || body?.fileName || 'file');
    const size = Number(body?.size);
    const mimeType = String(body?.type || '');
    if (!url) throw new BadRequestException('url 不能为空');
    if (!size || size <= 0) throw new BadRequestException('文件大小非法');
    if (size > MAX_SINGLE_UPLOAD) throw new BadRequestException('单次上传不能超过 25MB');

    this.logger.log(`从 URL 下载文件: ${fileName}, size=${size}, mimeType=${mimeType}`);
    let downloadRes;
    try {
      downloadRes = await firstValueFrom(
        this.http.get(url, { responseType: 'arraybuffer', timeout: 30000 }),
      );
    } catch (e: any) {
      this.logger.error(`下载文件失败: ${e?.message || String(e)}`);
      throw new BadRequestException(`下载文件失败: ${e?.message || '网络错误'}`);
    }
    const buffer = Buffer.from(downloadRes.data);
    if (buffer.length === 0) {
      throw new BadRequestException('下载的文件内容为空');
    }

    await this.fields.ensureAll();
    this.logger.log(`从 URL 下载完成: fileName=${fileName}, size=${size}`);
    const fileToken = await this.bitable.uploadMediaAll(buffer, fileName, size, mimeType);

    this.logger.log(`文件上传成功: ${fileToken}`);
    try {
      const meta = await this.fileService.upload(buffer, {
        fileName: fileToken,
        contentType: mimeType || 'application/octet-stream',
        upsert: true,
      });
      this.logger.log(`dataloom 持久化存储成功: ${meta.filePath}`);
      try {
        await this.db.insert(fileStorageMapping).values({
          fileToken,
          filePath: meta.filePath,
        }).onConflictDoUpdate({
          target: fileStorageMapping.fileToken,
          set: { filePath: meta.filePath },
        });
        this.logger.log(`映射已写入 DB: ${fileToken} → ${meta.filePath}`);
      } catch (e2: any) {
        this.logger.error(`映射写入 DB 失败: ${e2?.message}`);
      }
    } catch (e: any) {
      this.logger.error(`dataloom 持久化存储失败: ${e?.message}, 飞书下载将不可用`);
    }
    return {
      code: 0,
      data: { file_token: fileToken, name: fileName, size, type: mimeType },
    };
  }

  @Post()
  @NeedLogin()
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_SINGLE_UPLOAD } }),
  )
  async uploadAll(@UploadedFile() file?: UploadFile, @Req() req?: Request) {
    if (!file || !file.buffer?.length) {
      throw new BadRequestException('未收到上传文件');
    }
    if (file.size > MAX_SINGLE_UPLOAD) {
      throw new BadRequestException('单次上传不能超过 25MB，请使用分片上传接口');
    }
    await this.fields.ensureAll();
    const fileToken = await this.bitable.uploadMediaAll(
      file.buffer,
      file.originalname,
      file.size,
      file.mimetype,
    );
    await this.audit.writeOperationLog({
      req: (req || {}) as RequestWithUser,
      module: '素材库',
      opType: '上传',
      objectType: '文件',
      objectNo: fileToken,
      summary: `上传文件「${file.originalname}」，大小 ${file.size} 字节，类型 ${file.mimetype || '未知'}`,
    });
    try {
      const meta = await this.fileService.upload(file.buffer, {
        fileName: fileToken,
        contentType: file.mimetype || 'application/octet-stream',
        upsert: true,
      });
      this.logger.log(`dataloom 持久化存储成功: ${meta.filePath}`);
      try {
        await this.db.insert(fileStorageMapping).values({
          fileToken,
          filePath: meta.filePath,
        }).onConflictDoUpdate({
          target: fileStorageMapping.fileToken,
          set: { filePath: meta.filePath },
        });
        this.logger.log(`映射已写入 DB: ${fileToken} → ${meta.filePath}`);
      } catch (e2: any) {
        this.logger.error(`映射写入 DB 失败: ${e2?.message}`);
      }
    } catch (e: any) {
      this.logger.error(`dataloom 持久化存储失败: ${e?.message}, 飞书下载将不可用`);
    }
    return {
      code: 0,
      data: { file_token: fileToken, name: file.originalname, size: file.size, type: file.mimetype },
    };
  }

  @Get('tmp-url')
  @NeedLogin()
  async tmpUrls(@Query('tokens') tokens?: string, @Query('extra') extra?: string) {
    const list = String(tokens || '')
      .split(',')
      .map((t: string) => t.trim())
      .filter((t: string) => !!t);
    if (list.length === 0) {
      throw new BadRequestException('tokens 不能为空');
    }
    const urls = await this.bitable.getMediaTmpUrls(list, extra);
    return { code: 0, data: urls };
  }

  @Post('prepare')
  @NeedLogin()
  @HttpCode(HttpStatus.OK)
  async prepare(@Body() body: { file_name?: string; size?: number }) {
    const fileName = String(body?.file_name || 'file');
    const size = Number(body?.size);
    if (!size || size <= 0) {
      throw new BadRequestException('文件大小非法');
    }
    await this.fields.ensureAll();
    const data = await this.bitable.prepareMediaUpload(fileName, size, BLOCK_SIZE);
    return { code: 0, data };
  }

  @Post('part')
  @NeedLogin()
  @UseInterceptors(
    FileInterceptor('block', { limits: { fileSize: BLOCK_SIZE + 1024 * 1024 } }),
  )
  async uploadPart(
    @UploadedFile() file?: UploadFile,
    @Body() body?: { upload_id?: string; block_num?: string },
  ) {
    if (!file || !file.buffer?.length) {
      throw new BadRequestException('未收到分片内容');
    }
    const uploadId = String(body?.upload_id || '');
    const blockNum = Number(body?.block_num);
    if (!uploadId || Number.isNaN(blockNum)) {
      throw new BadRequestException('upload_id 或 block_num 缺失');
    }
    const data = await this.bitable.uploadMediaPart(
      uploadId,
      blockNum,
      file.buffer,
      file.originalname,
    );
    return { code: 0, data };
  }

  @Post('finish')
  @NeedLogin()
  @HttpCode(HttpStatus.OK)
  async finish(@Body() body: { upload_id?: string; block_num?: number }) {
    const uploadId = String(body?.upload_id || '');
    const blockNum = Number(body?.block_num);
    if (!uploadId || Number.isNaN(blockNum)) {
      throw new BadRequestException('upload_id 或 block_num 缺失');
    }
    const data = await this.bitable.finishMediaUpload(uploadId, blockNum);
    return { code: 0, data };
  }

  @Get('download')
  async downloadProxy(
    @Query('fileToken') fileToken?: string,
    @Query('extra') extra?: string,
    @Req() req?: Request,
    @Res() res?: Response,
  ) {
    if (!fileToken) throw new BadRequestException('fileToken 不能为空');
    // extra 改为可选 — 某些文件可能不需要 bitablePerm

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

  @Delete(':fileToken')
  @NeedLogin()
  async remove(@Param('fileToken') fileToken: string) {
    await this.bitable.deleteMedia(fileToken);
    return { code: 0, data: true };
  }
}
