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
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import type { Request } from 'express';
import { AttachmentsService } from './attachments.service';
import type {
  AttachmentListParams,
  UpdateAttachmentData,
} from './attachments.service';
import type {
  AttachmentItem,
  AttachmentListResponse,
  AttachmentStats,
  CreateAttachmentDto,
  UpdateAttachmentDto,
} from '@shared/api.interface';

@Controller('api/attachments')
@NeedLogin()
export class AttachmentsController {
  private readonly logger = new Logger(AttachmentsController.name);

  constructor(
    private readonly attachmentsService: AttachmentsService,
  ) {}

  @Get('stats')
  async getStats(): Promise<AttachmentStats> {
    return this.attachmentsService.getAttachmentStats();
  }

  @Get('by-related')
  async getByRelated(
    @Query('relatedType') relatedType: string,
    @Query('relatedId') relatedId: string,
    @Query('page') pageRaw?: string,
    @Query('pageSize') pageSizeRaw?: string,
  ): Promise<AttachmentListResponse> {
    const page: number = pageRaw ? parseInt(pageRaw, 10) : 1;
    const pageSize: number = pageSizeRaw
      ? Math.min(100, parseInt(pageSizeRaw, 10))
      : 20;
    return this.attachmentsService.getAttachmentsByRelated(
      relatedType,
      relatedId,
      page,
      pageSize,
    );
  }

  @Get(':id')
  async findById(
    @Param('id') id: string,
  ): Promise<AttachmentItem> {
    const item = await this.attachmentsService.getAttachmentById(id);
    if (!item) {
      throw new NotFoundException('附件不存在');
    }
    return item;
  }

  @Get()
  async findAll(
    @Query() query: AttachmentListParams,
  ): Promise<AttachmentListResponse> {
    const cappedQuery: AttachmentListParams = {
      ...query,
      pageSize: query.pageSize
        ? Math.min(100, Number(query.pageSize))
        : undefined,
    };
    return this.attachmentsService.getAttachments(cappedQuery);
  }

  @Post()
  async create(
    @Req() req: Request,
    @Body() dto: CreateAttachmentDto,
  ): Promise<AttachmentItem> {
    const { userId, userName } = req.userContext;
    return this.attachmentsService.createAttachment({
      ...dto,
      uploaderId: userId,
      uploaderName: userName,
    });
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateAttachmentDto,
  ): Promise<AttachmentItem> {
    const updateData: UpdateAttachmentData = {};
    if (dto.description !== undefined) {
      updateData.description = dto.description;
    }
    if (dto.fileCategory !== undefined) {
      updateData.fileCategory = dto.fileCategory;
    }
    const item = await this.attachmentsService.updateAttachment(
      id,
      updateData,
    );
    if (!item) {
      throw new NotFoundException('附件不存在');
    }
    return item;
  }

  @Delete()
  async batchDelete(
    @Body() dto: { ids: string[] },
  ): Promise<{ success: boolean }> {
    await this.attachmentsService.deleteAttachments(dto.ids);
    return { success: true };
  }

  @Delete(':id')
  async delete(
    @Param('id') id: string,
  ): Promise<{ success: boolean }> {
    await this.attachmentsService.deleteAttachment(id);
    return { success: true };
  }
}