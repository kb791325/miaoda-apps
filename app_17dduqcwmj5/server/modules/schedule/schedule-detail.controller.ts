import { Controller, Get, Param } from '@nestjs/common';
import { CanRole, NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import { APP_ROLES } from '@shared/roles';
import type {
  AttendanceListResponse,
  EnrolledStudentsResponse,
} from '@shared/schedule';
import { UuidParamPipe } from '@server/src/common/pipes/uuid-param.pipe';
import { ScheduleService } from './schedule.service';

const TEACHER_ROLES: string[] = [
  APP_ROLES.principal,
  APP_ROLES.recruitmentTeacher,
  APP_ROLES.teachingTeacher,
];

@NeedLogin()
@Controller('api/schedules')
export class ScheduleDetailController {
  constructor(private readonly scheduleService: ScheduleService) {}

  @CanRole(TEACHER_ROLES)
  @Get(':id/enrolled-students')
  async getEnrolledStudents(
    @Param('id', UuidParamPipe) id: string,
  ): Promise<EnrolledStudentsResponse> {
    return this.scheduleService.getEnrolledStudents(id);
  }

  @CanRole(TEACHER_ROLES)
  @Get(':id/roll-call')
  async getRollCall(
    @Param('id', UuidParamPipe) id: string,
  ): Promise<AttendanceListResponse> {
    return this.scheduleService.listAttendances(id);
  }
}
