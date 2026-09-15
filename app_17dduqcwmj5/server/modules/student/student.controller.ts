import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CanRole, NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import { APP_ROLES } from '@shared/roles';
import type {
  CreateStudentRequest,
  CreateStudentResponse,
  StudentBitableSyncResponse,
  StudentDetailResponse,
  StudentListResponse,
  UpdatePaymentRequest,
  UpdatePaymentResponse,
  UpdateStudentRequest,
  UpdateStudentResponse,
} from '@shared/student';
import {
  assertUuidArray,
  UuidParamPipe,
} from '@server/src/common/pipes/uuid-param.pipe';
import { isValidDay } from '@server/src/common/utils/date';
import {
  assertArrayLimit,
  assertTextLimit,
} from '@server/src/common/utils/input-limit';
import {
  assertPaymentStatus,
  assertStudyProgress,
} from '@server/src/common/utils/student-status';
import { StudentService } from './student.service';

const MAX_PAYMENT_AMOUNT: number = 10_000_000;

@NeedLogin()
@Controller('api/students')
export class StudentController {
  constructor(private readonly studentService: StudentService) {}

  private validatePaymentAmount(amount: number | undefined): void {
    if (amount === undefined || amount === null) {
      return;
    }
    if (
      typeof amount !== 'number' ||
      Number.isNaN(amount) ||
      !Number.isFinite(amount) ||
      amount < 0 ||
      amount > MAX_PAYMENT_AMOUNT
    ) {
      throw new BadRequestException('缴费金额必须为 0 至 1000 万之间的数字');
    }
  }

  @CanRole([
    APP_ROLES.principal,
    APP_ROLES.recruitmentTeacher,
    APP_ROLES.teachingTeacher,
  ])
  @Get()
  async listStudents(
    @Query('paymentStatus') paymentStatus?: string,
    @Query('channel') channel?: string,
    @Query('progress') progress?: string,
    @Query('graduationStatus') graduationStatus?: string,
    @Query('keyword') keyword?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<StudentListResponse> {
    const parsedPage: number = Number.parseInt(page ?? '1', 10);
    const parsedPageSize: number = Number.parseInt(pageSize ?? '20', 10);
    return this.studentService.listStudents({
      paymentStatus,
      channel,
      progress,
      graduationStatus,
      keyword,
      page: Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1,
      pageSize:
        Number.isFinite(parsedPageSize) && parsedPageSize > 0
          ? Math.min(parsedPageSize, 100)
          : 20,
    });
  }

  @CanRole([
    APP_ROLES.principal,
    APP_ROLES.recruitmentTeacher,
    APP_ROLES.teachingTeacher,
  ])
  @Get(':id')
  async getStudentDetail(
    @Param('id', UuidParamPipe) id: string,
  ): Promise<StudentDetailResponse> {
    return this.studentService.getStudentDetail(id);
  }

  @CanRole([
    APP_ROLES.principal,
    APP_ROLES.recruitmentTeacher,
    APP_ROLES.teachingTeacher,
  ])
  @Post()
  async createStudent(
    @Body() body: CreateStudentRequest,
  ): Promise<CreateStudentResponse> {
    if (!body.studentName || !body.studentName.trim()) {
      throw new BadRequestException('学员姓名不能为空');
    }
    assertTextLimit(body.studentName, 50, '学员姓名');
    if (!body.contactPhone || !body.contactPhone.trim()) {
      throw new BadRequestException('联系电话不能为空');
    }
    assertTextLimit(body.contactPhone, 20, '联系电话');
    assertTextLimit(body.wechatId, 50, '微信号');
    if (!body.sourceChannel) {
      throw new BadRequestException('来源渠道不能为空');
    }
    if (!Array.isArray(body.courseIds)) {
      throw new BadRequestException('报名课程必须为数组');
    }
    assertArrayLimit(body.courseIds, 20, '报名课程');
    assertUuidArray(body.courseIds, '报名课程');
    if (!body.enrollmentDate) {
      throw new BadRequestException('报名日期不能为空');
    }
    if (!isValidDay(body.enrollmentDate)) {
      throw new BadRequestException('报名日期格式不正确，应为 YYYY-MM-DD');
    }
    this.validatePaymentAmount(body.paymentAmount);
    if (!body.paymentStatus) {
      throw new BadRequestException('缴费状态不能为空');
    }
    assertPaymentStatus(body.paymentStatus);
    return this.studentService.createStudent({
      studentName: body.studentName.trim(),
      contactPhone: body.contactPhone.trim(),
      wechatId: body.wechatId?.trim() || undefined,
      sourceChannel: body.sourceChannel,
      courseIds: body.courseIds,
      enrollmentDate: body.enrollmentDate,
      paymentStatus: body.paymentStatus,
      paymentAmount: body.paymentAmount,
      managerProfile: body.managerProfile || undefined,
    });
  }

  @CanRole([
    APP_ROLES.principal,
    APP_ROLES.recruitmentTeacher,
    APP_ROLES.teachingTeacher,
  ])
  @Patch(':id')
  async updateStudent(
    @Param('id', UuidParamPipe) id: string,
    @Body() body: UpdateStudentRequest,
  ): Promise<UpdateStudentResponse> {
    if (!body.studentName || !body.studentName.trim()) {
      throw new BadRequestException('学员姓名不能为空');
    }
    assertTextLimit(body.studentName, 50, '学员姓名');
    if (!body.contactPhone || !body.contactPhone.trim()) {
      throw new BadRequestException('联系电话不能为空');
    }
    assertTextLimit(body.contactPhone, 20, '联系电话');
    assertTextLimit(body.wechatId, 50, '微信号');
    assertTextLimit(body.remark, 500, '备注');
    if (body.studyProgress !== undefined && body.studyProgress !== null) {
      assertStudyProgress(body.studyProgress);
    }
    if (!body.sourceChannel) {
      throw new BadRequestException('来源渠道不能为空');
    }
    if (body.enrollmentDate !== undefined && !isValidDay(body.enrollmentDate)) {
      throw new BadRequestException('报名日期格式不正确，应为 YYYY-MM-DD');
    }
    if (body.graduationDate !== undefined && body.graduationDate !== null && !isValidDay(body.graduationDate)) {
      throw new BadRequestException('结业日期格式不正确，应为 YYYY-MM-DD');
    }
    if (!body.enrollmentDate) {
      throw new BadRequestException('报名日期不能为空');
    }
    return this.studentService.updateStudent(id, {
      studentName: body.studentName.trim(),
      contactPhone: body.contactPhone.trim(),
      wechatId: body.wechatId?.trim() || undefined,
      sourceChannel: body.sourceChannel,
      enrollmentDate: body.enrollmentDate,
      studyProgress: body.studyProgress || undefined,
      graduationDate: body.graduationDate || undefined,
      remark: body.remark || undefined,
    });
  }

  @CanRole([
    APP_ROLES.principal,
    APP_ROLES.recruitmentTeacher,
    APP_ROLES.teachingTeacher,
  ])
  @Patch(':id/payment')
  async updatePayment(
    @Param('id', UuidParamPipe) id: string,
    @Body() body: UpdatePaymentRequest,
  ): Promise<UpdatePaymentResponse> {
    if (typeof body.paymentAmount !== 'number' || Number.isNaN(body.paymentAmount) || !Number.isFinite(body.paymentAmount) || body.paymentAmount < 0 || body.paymentAmount > MAX_PAYMENT_AMOUNT) {
      throw new BadRequestException('缴费金额必须为 0 至 1000 万之间的数字');
    }
    if (!body.paymentStatus || !body.paymentStatus.trim()) {
      throw new BadRequestException('缴费状态不能为空');
    }
    assertPaymentStatus(body.paymentStatus.trim());
    return this.studentService.updatePayment(id, {
      paymentAmount: body.paymentAmount,
      paymentStatus: body.paymentStatus.trim(),
    });
  }

  @CanRole([
    APP_ROLES.principal,
    APP_ROLES.recruitmentTeacher,
    APP_ROLES.teachingTeacher,
  ])
  @Post(':id/bitable-sync')
  async retryBitableSync(
    @Param('id', UuidParamPipe) id: string,
  ): Promise<StudentBitableSyncResponse> {
    return this.studentService.retryBitableSync(id);
  }

  @CanRole([APP_ROLES.principal])
  @Delete(':id')
  async deleteStudent(
    @Param('id', UuidParamPipe) id: string,
  ): Promise<void> {
    return this.studentService.deleteStudent(id);
  }
}
