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
} from '@nestjs/common';
import { CanRole, NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import { UuidParamPipe } from '@server/src/common/pipes/uuid-param.pipe';
import { ALL_ROLES, APP_ROLES } from '@shared/roles';
import type {
  CategoryListResponse,
  CourseCategory,
  CourseDetail,
  CourseListResponse,
  CourseScheduleBrief,
  CourseWriteResponse,
  CreateCategoryRequest,
  CreateCourseRequest,
  CreateEquipmentRequest,
  CreateFormulaRequest,
  CreateProcessFlowRequest,
  EquipmentItem,
  FormulaItem,
  ProcessFlowItem,
  UpdateCourseRequest,
  UpdateEquipmentRequest,
  UpdateFormulaRequest,
  UpdateProcessFlowRequest,
} from '@shared/course';
import { CourseService } from './course.service';

@Controller('api/courses')
@NeedLogin()
export class CourseController {
  constructor(private readonly courseService: CourseService) {}

  @CanRole(ALL_ROLES)
  @Get()
  async listCourses(
    @Query('category') category?: string,
    @Query('difficulty') difficulty?: string,
    @Query('status') status?: string,
    @Query('keyword') keyword?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<CourseListResponse> {
    const parsedPage: number = Number.parseInt(page ?? '1', 10);
    const parsedPageSize: number = Number.parseInt(pageSize ?? '20', 10);
    return this.courseService.listCourses({
      category,
      difficulty,
      status,
      keyword,
      page: Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1,
      pageSize:
        Number.isFinite(parsedPageSize) && parsedPageSize > 0
          ? Math.min(parsedPageSize, 100)
          : 20,
    });
  }

  @CanRole(ALL_ROLES)
  @Get('categories')
  async listCategories(): Promise<CategoryListResponse> {
    const items: CourseCategory[] =
      await this.courseService.listCategories();
    return { items };
  }

  @CanRole([
    APP_ROLES.principal,
    APP_ROLES.recruitmentTeacher,
    APP_ROLES.teachingTeacher,
  ])
  @Post('categories')
  async createCategory(
    @Body() body: CreateCategoryRequest,
  ): Promise<CourseCategory> {
    if (!body || typeof body.name !== 'string' || !body.name.trim()) {
      throw new BadRequestException('类别名称不能为空');
    }
    return this.courseService.createCategory(body.name);
  }

  @CanRole([
    APP_ROLES.principal,
    APP_ROLES.recruitmentTeacher,
    APP_ROLES.teachingTeacher,
  ])
  @Delete('categories/:id')
  async deleteCategory(@Param('id', UuidParamPipe) id: string): Promise<{ id: string }> {
    await this.courseService.deleteCategory(id);
    return { id };
  }

  @CanRole(ALL_ROLES)
  @Get(':id')
  async getCourseDetail(@Param('id', UuidParamPipe) id: string): Promise<CourseDetail> {
    return this.courseService.getCourseDetail(id);
  }

  private requireCourseRef(courseName: string | undefined): void {
    if (!courseName || !courseName.trim()) {
      throw new BadRequestException('所属课程不能为空');
    }
  }

  private requireText(value: string | undefined, message: string): void {
    if (value === undefined || !value.trim()) {
      throw new BadRequestException(message);
    }
  }

  private validateNonNegativeNumber(
    value: number | undefined,
    message: string,
  ): void {
    if (
      value !== undefined &&
      (typeof value !== 'number' || Number.isNaN(value) || value < 0)
    ) {
      throw new BadRequestException(message);
    }
  }

  @CanRole([
    APP_ROLES.principal,
    APP_ROLES.recruitmentTeacher,
    APP_ROLES.teachingTeacher,
  ])
  @Post('equipments')
  async createEquipment(
    @Body() body: CreateEquipmentRequest,
  ): Promise<CourseWriteResponse> {
    this.requireCourseRef(body?.courseName);
    this.requireText(body?.equipmentToolName, '器材工具名称不能为空');
    this.validateNonNegativeNumber(body?.quantity, '数量必须为非负数字');
    return this.courseService.createEquipment(body);
  }

  @CanRole([
    APP_ROLES.principal,
    APP_ROLES.recruitmentTeacher,
    APP_ROLES.teachingTeacher,
  ])
  @Patch('equipments/:id')
  async updateEquipment(
    @Param('id', UuidParamPipe) id: string,
    @Body() body: UpdateEquipmentRequest,
  ): Promise<CourseWriteResponse> {
    if (body?.courseName !== undefined) {
      this.requireCourseRef(body.courseName);
    }
    if (body?.equipmentToolName !== undefined) {
      this.requireText(body.equipmentToolName, '器材工具名称不能为空');
    }
    this.validateNonNegativeNumber(body?.quantity, '数量必须为非负数字');
    return this.courseService.updateEquipment(id, body ?? {});
  }

  @CanRole([
    APP_ROLES.principal,
    APP_ROLES.recruitmentTeacher,
    APP_ROLES.teachingTeacher,
  ])
  @Delete('equipments/:id')
  async deleteEquipment(
    @Param('id', UuidParamPipe) id: string,
  ): Promise<CourseWriteResponse> {
    return this.courseService.deleteEquipment(id);
  }

  @CanRole([
    APP_ROLES.principal,
    APP_ROLES.recruitmentTeacher,
    APP_ROLES.teachingTeacher,
  ])
  @Post('process-flows')
  async createProcessFlow(
    @Body() body: CreateProcessFlowRequest,
  ): Promise<CourseWriteResponse> {
    this.requireCourseRef(body?.courseName);
    this.requireText(body?.stepName, '步骤名称不能为空');
    this.validateNonNegativeNumber(body?.stepNo, '步骤序号必须为非负数字');
    return this.courseService.createProcessFlow(body);
  }

  @CanRole([
    APP_ROLES.principal,
    APP_ROLES.recruitmentTeacher,
    APP_ROLES.teachingTeacher,
  ])
  @Patch('process-flows/:id')
  async updateProcessFlow(
    @Param('id', UuidParamPipe) id: string,
    @Body() body: UpdateProcessFlowRequest,
  ): Promise<CourseWriteResponse> {
    if (body?.courseName !== undefined) {
      this.requireCourseRef(body.courseName);
    }
    if (body?.stepName !== undefined) {
      this.requireText(body.stepName, '步骤名称不能为空');
    }
    this.validateNonNegativeNumber(body?.stepNo, '步骤序号必须为非负数字');
    return this.courseService.updateProcessFlow(id, body ?? {});
  }

  @CanRole([
    APP_ROLES.principal,
    APP_ROLES.recruitmentTeacher,
    APP_ROLES.teachingTeacher,
  ])
  @Delete('process-flows/:id')
  async deleteProcessFlow(
    @Param('id', UuidParamPipe) id: string,
  ): Promise<CourseWriteResponse> {
    return this.courseService.deleteProcessFlow(id);
  }

  @CanRole([
    APP_ROLES.principal,
    APP_ROLES.recruitmentTeacher,
    APP_ROLES.teachingTeacher,
  ])
  @Post('formulas')
  async createFormula(
    @Body() body: CreateFormulaRequest,
  ): Promise<CourseWriteResponse> {
    this.requireCourseRef(body?.courseName);
    this.requireText(body?.ingredientName, '食材名称不能为空');
    this.validateNonNegativeNumber(body?.quantity, '用量必须为非负数字');
    return this.courseService.createFormula(body);
  }

  @CanRole([
    APP_ROLES.principal,
    APP_ROLES.recruitmentTeacher,
    APP_ROLES.teachingTeacher,
  ])
  @Patch('formulas/:id')
  async updateFormula(
    @Param('id', UuidParamPipe) id: string,
    @Body() body: UpdateFormulaRequest,
  ): Promise<CourseWriteResponse> {
    if (body?.courseName !== undefined) {
      this.requireCourseRef(body.courseName);
    }
    if (body?.ingredientName !== undefined) {
      this.requireText(body.ingredientName, '食材名称不能为空');
    }
    this.validateNonNegativeNumber(body?.quantity, '用量必须为非负数字');
    return this.courseService.updateFormula(id, body ?? {});
  }

  @CanRole([
    APP_ROLES.principal,
    APP_ROLES.recruitmentTeacher,
    APP_ROLES.teachingTeacher,
  ])
  @Delete('formulas/:id')
  async deleteFormula(
    @Param('id', UuidParamPipe) id: string,
  ): Promise<CourseWriteResponse> {
    return this.courseService.deleteFormula(id);
  }

  private validatePayload(
    body: UpdateCourseRequest,
    nameRequired: boolean,
  ): void {
    if (nameRequired && (!body.courseName || !body.courseName.trim())) {
      throw new BadRequestException('课程名称不能为空');
    }
    if (body.courseName !== undefined && !body.courseName.trim()) {
      throw new BadRequestException('课程名称不能为空');
    }
    if (body.tuitionFee !== undefined && body.tuitionFee !== null) {
      if (
        typeof body.tuitionFee !== 'number' ||
        Number.isNaN(body.tuitionFee) ||
        body.tuitionFee < 0
      ) {
        throw new BadRequestException('学费必须为非负数字');
      }
    }
    if (body.productImage !== undefined && body.productImage.length > 1) {
      throw new BadRequestException('最多上传一张课程产品图');
    }
  }

  @CanRole([
    APP_ROLES.principal,
    APP_ROLES.recruitmentTeacher,
    APP_ROLES.teachingTeacher,
  ])
  @Post()
  async createCourse(
    @Body() body: CreateCourseRequest,
  ): Promise<CourseWriteResponse> {
    this.validatePayload(body, true);
    return this.courseService.createCourse(body);
  }

  @CanRole([
    APP_ROLES.principal,
    APP_ROLES.recruitmentTeacher,
    APP_ROLES.teachingTeacher,
  ])
  @Patch(':id')
  async updateCourse(
    @Param('id', UuidParamPipe) id: string,
    @Body() body: UpdateCourseRequest,
  ): Promise<CourseWriteResponse> {
    this.validatePayload(body, false);
    return this.courseService.updateCourse(id, body);
  }

  @CanRole([APP_ROLES.principal])
  @Delete(':id')
  async deleteCourse(
    @Param('id', UuidParamPipe) id: string,
  ): Promise<CourseWriteResponse> {
    await this.courseService.deleteCourse(id);
    return { id };
  }

  @CanRole([
    APP_ROLES.principal,
    APP_ROLES.recruitmentTeacher,
    APP_ROLES.teachingTeacher,
  ])
  @Get(':id/formulas')
  async listFormulas(
    @Param('id', UuidParamPipe) id: string,
    @Query('keyword') keyword?: string,
  ): Promise<FormulaItem[]> {
    return this.courseService.listFormulas(id, keyword);
  }

  @CanRole([
    APP_ROLES.principal,
    APP_ROLES.recruitmentTeacher,
    APP_ROLES.teachingTeacher,
  ])
  @Get(':id/process-flows')
  async listProcessFlows(
    @Param('id', UuidParamPipe) id: string,
  ): Promise<ProcessFlowItem[]> {
    return this.courseService.listProcessFlows(id);
  }

  @CanRole([
    APP_ROLES.principal,
    APP_ROLES.recruitmentTeacher,
    APP_ROLES.teachingTeacher,
  ])
  @Get(':id/equipments')
  async listEquipments(
    @Param('id', UuidParamPipe) id: string,
  ): Promise<EquipmentItem[]> {
    return this.courseService.listEquipments(id);
  }

  @CanRole(ALL_ROLES)
  @Get(':id/schedules')
  async listSchedules(
    @Param('id', UuidParamPipe) id: string,
  ): Promise<CourseScheduleBrief[]> {
    return this.courseService.listSchedules(id);
  }
}
