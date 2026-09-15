import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CanRole, NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import { APP_ROLES } from '@shared/roles';
import type {
  ConvertFaqMissRequest,
  ConvertFaqMissResponse,
  CreateFaqRequest,
  CreateFaqResponse,
  FaqListResponse,
  FaqMatchRequest,
  FaqMatchResponse,
  FaqMissListResponse,
  UpdateFaqRequest,
  UpdateFaqResponse,
} from '@shared/consultation';
import { parsePagination } from '@server/src/common/utils/pagination';
import { ConsultationService } from './consultation.service';

const FAQ_ADMIN_ROLES = [
  APP_ROLES.principal,
  APP_ROLES.recruitmentTeacher,
  APP_ROLES.teachingTeacher,
] as const;

@Controller('api')
export class ConsultationController {
  constructor(private readonly consultationService: ConsultationService) {}

  @Post('faqs/match')
  async matchFaq(@Body() body: FaqMatchRequest): Promise<FaqMatchResponse> {
    const question: string | undefined = body?.question;
    if (typeof question !== 'string') {
      throw new BadRequestException('question 必须为字符串');
    }
    return this.consultationService.matchFaq(question);
  }

  @NeedLogin()
  @CanRole([...FAQ_ADMIN_ROLES])
  @Get('faqs')
  async listFaqs(
    @Query('category') category?: string,
    @Query('status') status?: string,
    @Query('keyword') keyword?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<FaqListResponse> {
    const pagination: { page: number; pageSize: number; offset: number } =
      parsePagination({ page, pageSize });
    return this.consultationService.listFaqs({
      category,
      status,
      keyword,
      page: pagination.page,
      pageSize: pagination.pageSize,
    });
  }

  @NeedLogin()
  @CanRole([...FAQ_ADMIN_ROLES])
  @Post('faqs')
  async createFaq(@Body() body: CreateFaqRequest): Promise<CreateFaqResponse> {
    return this.consultationService.createFaq({
      question: body?.question ?? '',
      answer: body?.answer ?? '',
      category: body?.category ?? '',
      keywords: Array.isArray(body?.keywords) ? body.keywords : [],
      similarQuestion: body?.similarQuestion,
    });
  }

  @NeedLogin()
  @CanRole([...FAQ_ADMIN_ROLES])
  @Patch('faqs/:id')
  async updateFaq(
    @Param('id') id: string,
    @Body() body: UpdateFaqRequest,
  ): Promise<UpdateFaqResponse> {
    return this.consultationService.updateFaq(id, {
      question: body?.question,
      answer: body?.answer,
      category: body?.category,
      keywords:
        body?.keywords !== undefined
          ? Array.isArray(body.keywords)
            ? body.keywords
            : undefined
          : undefined,
      similarQuestion: body?.similarQuestion,
      status: body?.status,
    });
  }

  @NeedLogin()
  @CanRole([...FAQ_ADMIN_ROLES])
  @Get('faq-misses')
  async listFaqMisses(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<FaqMissListResponse> {
    const pagination: { page: number; pageSize: number; offset: number } =
      parsePagination({ page, pageSize });
    return this.consultationService.listFaqMisses({
      status,
      page: pagination.page,
      pageSize: pagination.pageSize,
    });
  }

  @NeedLogin()
  @CanRole([...FAQ_ADMIN_ROLES])
  @Post('faq-misses/:id/convert')
  async convertFaqMiss(
    @Param('id') id: string,
    @Body() body: ConvertFaqMissRequest,
  ): Promise<ConvertFaqMissResponse> {
    return this.consultationService.convertFaqMiss(id, {
      answer: body?.answer ?? '',
      category: body?.category ?? '',
      keywords: Array.isArray(body?.keywords) ? body.keywords : undefined,
    });
  }
}
