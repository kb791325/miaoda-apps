import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { CanRole, NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import { APP_ROLES } from '@shared/roles';
import type {
  CreateGraduationRequest,
  CreateGraduationResponse,
  GraduationListResponse,
  IssueCertificateResponse,
  UpdateGraduationRequest,
  UpdateGraduationResponse,
} from '@shared/graduation';
import {
  parseUuidQuery,
  UuidParamPipe,
} from '@server/src/common/pipes/uuid-param.pipe';
import { GraduationService } from './graduation.service';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

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
@Controller('api/graduation')
export class GraduationController {
  constructor(private readonly graduationService: GraduationService) {}

  @CanRole(READ_ROLES)
  @Get()
  async listGraduations(
    @Query('studentId') studentId?: string,
    @Query('keyword') keyword?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<GraduationListResponse> {
    const parsedStudentId: string | undefined = parseUuidQuery(
      studentId,
      '学员',
    );
    const parsedPage: number = Number.parseInt(page ?? '1', 10);
    const parsedPageSize: number = Number.parseInt(pageSize ?? '20', 10);
    return this.graduationService.listGraduations({
      studentId: parsedStudentId,
      keyword,
      page: Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1,
      pageSize:
        Number.isFinite(parsedPageSize) && parsedPageSize > 0
          ? Math.min(parsedPageSize, 100)
          : 20,
    });
  }

  @CanRole(WRITE_ROLES)
  @Post()
  async createGraduation(
    @Req() req: Request,
    @Body() body: CreateGraduationRequest,
  ): Promise<CreateGraduationResponse> {
    if (!body.studentId || !body.studentId.trim()) {
      throw new BadRequestException('学员不能为空');
    }
    if (!UUID_PATTERN.test(body.studentId.trim())) {
      throw new BadRequestException('无效的学员 ID 格式');
    }
    if (!Array.isArray(body.courseIds) || body.courseIds.length === 0) {
      throw new BadRequestException('请至少选择一门结业课程');
    }
    if (
      body.courseIds.some((courseId: string) => !UUID_PATTERN.test(courseId))
    ) {
      throw new BadRequestException('无效的课程 ID 格式');
    }
    if (!body.trainingStartDate) {
      throw new BadRequestException('培训开始日期不能为空');
    }
    if (!body.trainingEndDate) {
      throw new BadRequestException('培训结束日期不能为空');
    }
    if (
      typeof body.totalClassHours !== 'number' ||
      Number.isNaN(body.totalClassHours) ||
      body.totalClassHours <= 0
    ) {
      throw new BadRequestException('总课时必须为大于 0 的数字');
    }
    if (
      typeof body.attendanceHours !== 'number' ||
      Number.isNaN(body.attendanceHours) ||
      body.attendanceHours < 0 ||
      body.attendanceHours > body.totalClassHours
    ) {
      throw new BadRequestException('出勤课时须为 0 到总课时之间的数字');
    }
    const { userId } = req.userContext;
    return this.graduationService.createGraduation(
      {
        studentId: body.studentId.trim(),
        courseIds: body.courseIds,
        trainingStartDate: body.trainingStartDate,
        trainingEndDate: body.trainingEndDate,
        totalClassHours: body.totalClassHours,
        attendanceHours: body.attendanceHours,
        practicalEvaluation: body.practicalEvaluation?.trim() || undefined,
        theoreticalEvaluation: body.theoreticalEvaluation?.trim() || undefined,
        graduationDate: body.graduationDate || undefined,
      },
      userId,
    );
  }

  @CanRole(WRITE_ROLES)
  @Patch(':id/issue')
  async issueCertificate(
    @Req() req: Request,
    @Param('id', UuidParamPipe) id: string,
  ): Promise<IssueCertificateResponse> {
    const { userId } = req.userContext;
    return this.graduationService.issueCertificate(id, userId);
  }

  @CanRole(WRITE_ROLES)
  @Patch(':id')
  async updateGraduation(
    @Req() req: Request,
    @Param('id', UuidParamPipe) id: string,
    @Body() body: UpdateGraduationRequest,
  ): Promise<UpdateGraduationResponse> {
    const { userId } = req.userContext;
    return this.graduationService.updateGraduation(
      id,
      {
        practicalEvaluation: body.practicalEvaluation,
        theoreticalEvaluation: body.theoreticalEvaluation,
      },
      userId,
    );
  }
}
