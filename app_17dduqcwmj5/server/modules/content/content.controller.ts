import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { CanRole, NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import type { Request } from 'express';
import { ALL_ROLES, APP_ROLES } from '@shared/roles';
import type {
  AuditMarketingContentRequest,
  CreateMarketingContentRequest,
  CreateMaterialRequest,
  DeleteContentResponse,
  DeleteMaterialResponse,
  MarketingContentCalendarResponse,
  MarketingContentDetail,
  MarketingContentEffectRequest,
  MarketingContentListResponse,
  MarketingContentStatusResponse,
  MaterialListResponse,
  MaterialOptionsResponse,
  UpdateMarketingContentMediaRequest,
  UpdateMaterialRequest,
} from '@shared/content';
import { UuidParamPipe } from '@server/src/common/pipes/uuid-param.pipe';
import { ContentService } from './content.service';

/** 内容中心写操作角色：校长 + 招生老师 */
const CONTENT_WRITE_ROLES: string[] = [
  APP_ROLES.principal,
  APP_ROLES.recruitmentTeacher,
];

@Controller('api')
@NeedLogin()
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @CanRole(ALL_ROLES)
  @Get('marketing-contents')
  listContents(
    @Req() req: Request,
    @Query('status') status: string | undefined,
    @Query('keyword') keyword: string | undefined,
    @Query('page') page: string | undefined,
    @Query('pageSize') pageSize: string | undefined,
  ): Promise<MarketingContentListResponse> {
    const roles: string[] = req.userContext?.roles ?? [];
    const isStaff: boolean = roles.some((role: string) =>
      CONTENT_WRITE_ROLES.includes(role),
    );
    return this.contentService.listContents({
      status,
      keyword,
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : 20,
      publicOnly: !isStaff,
    });
  }

  @CanRole(CONTENT_WRITE_ROLES)
  @Get('marketing-contents/calendar')
  getCalendar(
    @Query('month') month: string,
  ): Promise<MarketingContentCalendarResponse> {
    return this.contentService.getCalendar(month);
  }

  @CanRole(ALL_ROLES)
  @Get('marketing-contents/:id')
  getContentDetail(
    @Req() req: Request,
    @Param('id', UuidParamPipe) id: string,
  ): Promise<MarketingContentDetail> {
    const roles: string[] = req.userContext?.roles ?? [];
    const isStaff: boolean = roles.some((role: string) =>
      CONTENT_WRITE_ROLES.includes(role),
    );
    return this.contentService.getContentDetail(id, !isStaff);
  }

  @CanRole(CONTENT_WRITE_ROLES)
  @Post('marketing-contents')
  createContent(
    @Body() body: CreateMarketingContentRequest,
  ): Promise<{ id: string }> {
    return this.contentService.createContent(body);
  }

  @CanRole([APP_ROLES.principal])
  @Patch('marketing-contents/:id/audit')
  auditContent(
    @Param('id', UuidParamPipe) id: string,
    @Body() body: AuditMarketingContentRequest,
  ): Promise<MarketingContentStatusResponse> {
    return this.contentService.auditContent(id, body);
  }

  @CanRole(CONTENT_WRITE_ROLES)
  @Patch('marketing-contents/:id/use')
  useContent(
    @Param('id', UuidParamPipe) id: string,
  ): Promise<MarketingContentStatusResponse> {
    return this.contentService.useContent(id);
  }

  @CanRole(CONTENT_WRITE_ROLES)
  @Patch('marketing-contents/:id/media')
  updateMedia(
    @Param('id', UuidParamPipe) id: string,
    @Body() body: UpdateMarketingContentMediaRequest,
  ): Promise<MarketingContentDetail> {
    return this.contentService.updateMedia(id, body);
  }

  @CanRole(CONTENT_WRITE_ROLES)
  @Patch('marketing-contents/:id/effect')
  saveEffect(
    @Param('id', UuidParamPipe) id: string,
    @Body() body: MarketingContentEffectRequest,
  ): Promise<{ id: string }> {
    return this.contentService.saveEffect(id, body);
  }

  @CanRole([APP_ROLES.principal])
  @Delete('marketing-contents/:id')
  deleteContent(
    @Param('id', UuidParamPipe) id: string,
  ): Promise<DeleteContentResponse> {
    return this.contentService.deleteContent(id);
  }

  @CanRole(CONTENT_WRITE_ROLES)
  @Get('materials/options')
  getMaterialOptions(): Promise<MaterialOptionsResponse> {
    return this.contentService.getMaterialOptions();
  }

  @CanRole(CONTENT_WRITE_ROLES)
  @Get('materials')
  listMaterials(
    @Query('materialType') materialType: string | undefined,
    @Query('platform') platform: string | undefined,
    @Query('tag') tag: string | undefined,
    @Query('keyword') keyword: string | undefined,
    @Query('page') page: string | undefined,
    @Query('pageSize') pageSize: string | undefined,
  ): Promise<MaterialListResponse> {
    return this.contentService.listMaterials({
      materialType,
      platform,
      tag,
      keyword,
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : 20,
    });
  }

  @CanRole(CONTENT_WRITE_ROLES)
  @Post('materials')
  createMaterial(
    @Body() body: CreateMaterialRequest,
  ): Promise<{ id: string }> {
    if (!body || typeof body.materialTitle !== 'string' || !body.materialTitle.trim()) {
      throw new BadRequestException('素材标题不能为空');
    }
    return this.contentService.createMaterial(body);
  }

  @CanRole(CONTENT_WRITE_ROLES)
  @Patch('materials/:id')
  updateMaterial(
    @Param('id', UuidParamPipe) id: string,
    @Body() body: UpdateMaterialRequest,
  ): Promise<{ id: string }> {
    if (body && typeof body.materialTitle === 'string' && !body.materialTitle.trim()) {
      throw new BadRequestException('素材标题不能为空');
    }
    return this.contentService.updateMaterial(id, body ?? {});
  }

  @CanRole(CONTENT_WRITE_ROLES)
  @Delete('materials/:id')
  deleteMaterial(
    @Param('id', UuidParamPipe) id: string,
  ): Promise<DeleteMaterialResponse> {
    return this.contentService.deleteMaterial(id);
  }
}
