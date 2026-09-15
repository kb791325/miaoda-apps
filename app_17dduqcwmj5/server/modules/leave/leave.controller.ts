import {
  Body,
  Controller,
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
  ApproveLeaveRequest,
  ApproveLeaveResponse,
  CreateLeaveRequest,
  CreateLeaveResponse,
  LeaveListQuery,
  LeaveListResponse,
} from '@shared/leave';
import {
  LEAVE_APPROVAL_STATUSES,
  LEAVE_TYPES,
} from '@shared/leave';
import {
  BadRequestException,
} from '@nestjs/common';
import {
  assertUuid,
  parseUuidQuery,
  UuidParamPipe,
} from '@server/src/common/pipes/uuid-param.pipe';
import { assertTextLimit } from '@server/src/common/utils/input-limit';
import { parsePagination } from '@server/src/common/utils/pagination';
import { LeaveService } from './leave.service';

@Controller('api/leave')
@NeedLogin()
export class LeaveController {
  constructor(private readonly leaveService: LeaveService) {}

  /** 提交请假：四个角色均可（学员本人提交），需登录 */
  @NeedLogin()
  @CanRole(ALL_ROLES)
  @Post()
  async createLeave(
    @Body() body: CreateLeaveRequest,
  ): Promise<CreateLeaveResponse> {
    assertUuid(body?.studentId, '学员');
    assertUuid(body?.scheduleId, '排课');
    if (!LEAVE_TYPES.includes(body?.leaveType)) {
      throw new BadRequestException(
        `请假类型仅支持：${LEAVE_TYPES.join('、')}`,
      );
    }
    assertTextLimit(body?.leaveReason, 500, '请假事由');
    return this.leaveService.createLeave(body);
  }

  @CanRole(ALL_ROLES)
  @Get()
  async listLeaves(
    @Req() req: Request,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('approvalStatus') approvalStatus?: string,
    @Query('scheduleId') scheduleId?: string,
  ): Promise<LeaveListResponse> {
    const parsedScheduleId: string | undefined = parseUuidQuery(
      scheduleId,
      '排课',
    );
    const pagination: { page: number; pageSize: number; offset: number } =
      parsePagination({ page, pageSize });
    const query: LeaveListQuery = {
      page: pagination.page,
      pageSize: pagination.pageSize,
      approvalStatus,
      scheduleId: parsedScheduleId,
    };
    const caller: { userId?: string; roles: string[] } = {
      userId: req.userContext?.userId,
      roles: req.userContext?.roles ?? [],
    };
    return this.leaveService.listLeaves(query, caller);
  }

  /** 请假审批仅校长可操作 */
  @CanRole([APP_ROLES.principal])
  @Patch(':id/approve')
  async approveLeave(
    @Param('id', UuidParamPipe) id: string,
    @Body() body: ApproveLeaveRequest,
    @Req() req: Request,
  ): Promise<ApproveLeaveResponse> {
    if (!LEAVE_APPROVAL_STATUSES.includes(body?.approvalStatus)) {
      throw new BadRequestException(
        `审批状态仅支持：${LEAVE_APPROVAL_STATUSES.join('、')}`,
      );
    }
    assertTextLimit(body?.approvalRemark, 500, '审批备注');
    const userId: string = req.userContext?.userId ?? '';
    return this.leaveService.approveLeave(id, body, userId);
  }
}
