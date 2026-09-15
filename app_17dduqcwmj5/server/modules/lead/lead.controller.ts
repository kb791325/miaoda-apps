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
import { APP_ROLES } from '@shared/roles';
import type {
  ConvertLeadResponse,
  CreateFollowUpRequest,
  CreateFollowUpResponse,
  CreateLeadRequest,
  CreateLeadResponse,
  DeleteLeadResponse,
  LeadDetailResponse,
  LeadListResponse,
  LeadStatsResponse,
  LeadTodoResponse,
  UpdateLeadRequest,
  UpdateLeadResponse,
} from '@shared/lead';
import { LEAD_CLUE_STATUSES, LEAD_FOLLOW_UP_METHODS } from '@shared/lead';
import {
  parseUuidQuery,
  UuidParamPipe,
} from '@server/src/common/pipes/uuid-param.pipe';
import { parsePagination } from '@server/src/common/utils/pagination';
import { LeadService } from './lead.service';

const WRITE_ROLES: string[] = [
  APP_ROLES.principal,
  APP_ROLES.recruitmentTeacher,
];

const READ_ROLES: string[] = [
  APP_ROLES.principal,
  APP_ROLES.recruitmentTeacher,
  APP_ROLES.teachingTeacher,
];

@NeedLogin()
@Controller('api/lead')
export class LeadController {
  constructor(private readonly leadService: LeadService) {}

  @CanRole(READ_ROLES)
  @Get()
  async listLeads(
    @Query('clueStatus') clueStatus?: string,
    @Query('intentionDegree') intentionDegree?: string,
    @Query('sourceChannel') sourceChannel?: string,
    @Query('personInCharge') personInCharge?: string,
    @Query('keyword') keyword?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<LeadListResponse> {
    const parsedPersonInCharge: string | undefined = parseUuidQuery(
      personInCharge,
      '负责人',
    );
    const pagination: { page: number; pageSize: number; offset: number } =
      parsePagination({ page, pageSize });
    return this.leadService.listLeads({
      clueStatus,
      intentionDegree,
      sourceChannel,
      personInCharge: parsedPersonInCharge,
      keyword,
      page: pagination.page,
      pageSize: pagination.pageSize,
    });
  }

  @CanRole(READ_ROLES)
  @Get('stats')
  async getLeadStats(): Promise<LeadStatsResponse> {
    return this.leadService.getLeadStats();
  }

  @CanRole(READ_ROLES)
  @Get('todos')
  async getLeadTodos(): Promise<LeadTodoResponse> {
    return this.leadService.getLeadTodos();
  }

  @CanRole(READ_ROLES)
  @Get(':id')
  async getLeadDetail(
    @Param('id', UuidParamPipe) id: string,
  ): Promise<LeadDetailResponse> {
    return this.leadService.getLeadDetail(id);
  }

  @CanRole(WRITE_ROLES)
  @Post()
  async createLead(
    @Req() req: Request,
    @Body() body: CreateLeadRequest,
  ): Promise<CreateLeadResponse> {
    if (!body.clueName || !body.clueName.trim()) {
      throw new BadRequestException('线索姓名不能为空');
    }
    if (!body.phoneNumber || !body.phoneNumber.trim()) {
      throw new BadRequestException('联系电话不能为空');
    }
    if (!body.sourceChannel) {
      throw new BadRequestException('来源渠道不能为空');
    }
    const userId: string = req.userContext.userId;
    return this.leadService.createLead(
      {
        clueName: body.clueName.trim(),
        phoneNumber: body.phoneNumber.trim(),
        sourceChannel: body.sourceChannel,
        intendedCourseIds: Array.isArray(body.intendedCourseIds)
          ? body.intendedCourseIds
          : [],
        intentionDegree: body.intentionDegree,
        personInCharge: body.personInCharge || undefined,
        firstConsultTime: body.firstConsultTime,
        nextFollowTime: body.nextFollowTime,
        remark: body.remark?.trim() || undefined,
      },
      userId,
    );
  }

  @CanRole(WRITE_ROLES)
  @Patch(':id')
  async updateLead(
    @Req() req: Request,
    @Param('id', UuidParamPipe) id: string,
    @Body() body: UpdateLeadRequest,
  ): Promise<UpdateLeadResponse> {
    if (body.clueStatus && !LEAD_CLUE_STATUSES.includes(body.clueStatus)) {
      throw new BadRequestException('线索状态不合法');
    }
    const userId: string = req.userContext.userId;
    return this.leadService.updateLead(id, body, userId);
  }

  @CanRole(WRITE_ROLES)
  @Delete(':id')
  async deleteLead(
    @Param('id', UuidParamPipe) id: string,
  ): Promise<DeleteLeadResponse> {
    return this.leadService.deleteLead(id);
  }

  @CanRole(WRITE_ROLES)
  @Post(':id/follow-ups')
  async createFollowUp(
    @Req() req: Request,
    @Param('id', UuidParamPipe) id: string,
    @Body() body: CreateFollowUpRequest,
  ): Promise<CreateFollowUpResponse> {
    if (!body.followUpContent || !body.followUpContent.trim()) {
      throw new BadRequestException('跟进内容不能为空');
    }
    if (!body.followUpMethod) {
      throw new BadRequestException('跟进方式不能为空');
    }
    if (!LEAD_FOLLOW_UP_METHODS.includes(body.followUpMethod)) {
      throw new BadRequestException('跟进方式不合法');
    }
    const userId: string = req.userContext.userId;
    return this.leadService.createFollowUp(
      id,
      {
        followUpContent: body.followUpContent.trim(),
        followUpMethod: body.followUpMethod,
        followUpTime: body.followUpTime,
        nextFollowUpPlan: body.nextFollowUpPlan?.trim() || undefined,
      },
      userId,
    );
  }

  @CanRole(WRITE_ROLES)
  @Post(':id/convert')
  async convertLead(
    @Req() req: Request,
    @Param('id', UuidParamPipe) id: string,
  ): Promise<ConvertLeadResponse> {
    const userId: string = req.userContext.userId;
    return this.leadService.convertLead(id, userId);
  }
}
