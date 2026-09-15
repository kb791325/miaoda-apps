import { Controller, Get, Query } from '@nestjs/common';
import { CanRole, NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import { APP_ROLES, type AppRole } from '@shared/roles';
import type {
  AttendanceOverviewResponse,
  CoursePopularityResponse,
  LeadConversionResponse,
  RevenueResponse,
} from '@shared/report';
import { ReportService } from './report.service';

/** 报表含缴费金额等敏感数据，仅管理侧角色可读，禁止 student */
const REPORT_READ_ROLES: AppRole[] = [
  APP_ROLES.principal,
  APP_ROLES.recruitmentTeacher,
  APP_ROLES.teachingTeacher,
];

@NeedLogin()
@Controller('api/report')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Get('lead-conversion')
  @CanRole(REPORT_READ_ROLES)
  getLeadConversion(): Promise<LeadConversionResponse> {
    return this.reportService.getLeadConversion();
  }

  @Get('revenue')
  @CanRole(REPORT_READ_ROLES)
  getRevenue(
    @Query('monthStart') monthStart?: string,
    @Query('monthEnd') monthEnd?: string,
  ): Promise<RevenueResponse> {
    return this.reportService.getRevenue(monthStart, monthEnd);
  }

  @Get('course-popularity')
  @CanRole(REPORT_READ_ROLES)
  getCoursePopularity(): Promise<CoursePopularityResponse> {
    return this.reportService.getCoursePopularity();
  }

  @Get('attendance-overview')
  @CanRole(REPORT_READ_ROLES)
  getAttendanceOverview(): Promise<AttendanceOverviewResponse> {
    return this.reportService.getAttendanceOverview();
  }
}
