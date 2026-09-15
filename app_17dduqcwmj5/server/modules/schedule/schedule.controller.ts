import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { CanRole, NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import { ALL_ROLES, APP_ROLES } from '@shared/roles';
import type {
  AttendanceListResponse,
  CreateScheduleRequest,
  CreateScheduleResponse,
  DeleteScheduleResponse,
  SaveAttendanceRequest,
  ScheduleBitableSyncResponse,
  ScheduleListResponse,
} from '@shared/schedule';
import {
  assertUuid,
  assertUuidArray,
  parseUuidQuery,
  UuidParamPipe,
} from '@server/src/common/pipes/uuid-param.pipe';
import { ScheduleService } from './schedule.service';

const WRITE_ROLES: string[] = [
  APP_ROLES.principal,
  APP_ROLES.recruitmentTeacher,
  APP_ROLES.teachingTeacher,
];

@Controller('api/schedules')
@NeedLogin()
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  @CanRole(ALL_ROLES)
  @Get()
  async listSchedules(
    @Query('courseId') courseId?: string,
    @Query('status') status?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<ScheduleListResponse> {
    const parsedCourseId: string | undefined = parseUuidQuery(
      courseId,
      '课程',
    );
    const parsedPage: number = Number.parseInt(page ?? '1', 10);
    const parsedPageSize: number = Number.parseInt(pageSize ?? '20', 10);
    return this.scheduleService.listSchedules({
      courseId: parsedCourseId,
      status,
      dateFrom,
      dateTo,
      page: Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1,
      pageSize:
        Number.isFinite(parsedPageSize) && parsedPageSize > 0
          ? Math.min(parsedPageSize, 100)
          : 20,
    });
  }

  @CanRole(WRITE_ROLES)
  @Post()
  async createSchedule(
    @Body() body: CreateScheduleRequest,
  ): Promise<CreateScheduleResponse> {
    assertUuid(body?.courseId, '课程');
    assertUuidArray(body?.studentIds ?? [], '学员');
    return this.scheduleService.createSchedule(body);
  }

  @CanRole(WRITE_ROLES)
  @Get(':id/attendances')
  async listAttendances(
    @Param('id', UuidParamPipe) id: string,
  ): Promise<AttendanceListResponse> {
    return this.scheduleService.listAttendances(id);
  }

  @CanRole(WRITE_ROLES)
  @Put(':id/attendances')
  async saveAttendances(
    @Param('id', UuidParamPipe) id: string,
    @Body() body: SaveAttendanceRequest,
  ): Promise<AttendanceListResponse> {
    return this.scheduleService.saveAttendances(id, body);
  }

  @CanRole(WRITE_ROLES)
  @Post(':id/bitable-sync')
  async retryBitableSync(
    @Param('id', UuidParamPipe) id: string,
  ): Promise<ScheduleBitableSyncResponse> {
    return this.scheduleService.retryBitableSync(id);
  }

  @CanRole([APP_ROLES.principal])
  @Delete(':id')
  async deleteSchedule(
    @Param('id', UuidParamPipe) id: string,
  ): Promise<DeleteScheduleResponse> {
    return this.scheduleService.deleteSchedule(id);
  }
}
