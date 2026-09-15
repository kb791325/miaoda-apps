import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { CanRole } from '@lark-apaas/fullstack-nestjs-core';
import type { Request } from 'express';
import { APP_ROLES, ALL_ROLES } from '@shared/roles';
import type {
  AttendanceListResponse,
  BatchAttendanceRequest,
  ScheduleAttendanceSummary,
  StudentAttendanceSummary,
} from '@shared/schedule';
import { UuidParamPipe } from '@server/src/common/pipes/uuid-param.pipe';
import { ScheduleService } from './schedule.service';

/** 考勤录入为写操作：校长 + 授课老师 */
const ATTENDANCE_WRITE_ROLES: string[] = [
  APP_ROLES.principal,
  APP_ROLES.teachingTeacher,
];

@Controller('api/attendance')
export class AttendanceController {
  constructor(private readonly scheduleService: ScheduleService) {}

  @CanRole(ATTENDANCE_WRITE_ROLES)
  @Post('batch')
  async batchSave(
    @Body() body: BatchAttendanceRequest,
  ): Promise<AttendanceListResponse> {
    return this.scheduleService.batchSaveAttendance(body);
  }

  @CanRole(ATTENDANCE_WRITE_ROLES)
  @Get('schedule-summary/:scheduleId')
  async scheduleSummary(
    @Param('scheduleId', UuidParamPipe) scheduleId: string,
  ): Promise<ScheduleAttendanceSummary> {
    return this.scheduleService.getScheduleSummary(scheduleId);
  }

  /** 个人考勤汇总仅员工可查真实数据；学员/匿名无身份关联，返回空摘要 */
  @CanRole(ALL_ROLES)
  @Get('student-summary/:studentId')
  async studentSummary(
    @Param('studentId', UuidParamPipe) studentId: string,
    @Req() req: Request,
  ): Promise<StudentAttendanceSummary> {
    const roles: string[] = req.userContext?.roles ?? [];
    const isStaff: boolean = roles.some((role: string) =>
      ATTENDANCE_WRITE_ROLES.includes(role),
    );
    if (!isStaff) {
      return {
        total: 0,
        present: 0,
        late: 0,
        earlyLeave: 0,
        absent: 0,
        leave: 0,
        attendanceRate: 0,
      };
    }
    return this.scheduleService.getStudentSummary(studentId);
  }
}
