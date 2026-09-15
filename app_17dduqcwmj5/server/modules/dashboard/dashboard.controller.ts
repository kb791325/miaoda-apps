import { Controller, Get } from '@nestjs/common';
import { CanRole, NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import { APP_ROLES } from '@shared/roles';
import type {
  ChannelDistributionResponse,
  DashboardOverview,
  EnrollmentTrendResponse,
} from '@shared/dashboard';
import type { LeadTodoResponse } from '@shared/lead';
import { DashboardService } from './dashboard.service';

const READ_ROLES: string[] = [
  APP_ROLES.principal,
  APP_ROLES.recruitmentTeacher,
  APP_ROLES.teachingTeacher,
];

@NeedLogin()
@Controller('api/dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @CanRole(READ_ROLES)
  @Get('overview')
  getOverview(): Promise<DashboardOverview> {
    return this.dashboardService.getOverview();
  }

  @CanRole(READ_ROLES)
  @Get('enrollment-trend')
  getEnrollmentTrend(): Promise<EnrollmentTrendResponse> {
    return this.dashboardService.getEnrollmentTrend();
  }

  @CanRole(READ_ROLES)
  @Get('channel-distribution')
  getChannelDistribution(): Promise<ChannelDistributionResponse> {
    return this.dashboardService.getChannelDistribution();
  }

  @CanRole(READ_ROLES)
  @Get('lead-todos')
  getLeadTodos(): Promise<LeadTodoResponse> {
    return this.dashboardService.getLeadTodos();
  }
}
