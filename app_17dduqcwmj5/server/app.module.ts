import { APP_FILTER } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { PlatformModule } from '@lark-apaas/fullstack-nestjs-core';

import { BitableSyncModule } from '@server/src/common/bitable-sync/bitable-sync.module';
import { FeishuMessageModule } from '@server/src/common/feishu-message/feishu-message.module';
import { GlobalExceptionFilter } from './common/filters/exception.filter';
import { ConsultationModule } from './modules/consultation/consultation.module';
import { ContentModule } from './modules/content/content.module';
import { CourseModule } from './modules/course/course.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { AuthModule } from './modules/auth/auth.module';
import { GraduationModule } from './modules/graduation/graduation.module';
import { LeadModule } from './modules/lead/lead.module';
import { LeaveModule } from './modules/leave/leave.module';
import { ReportModule } from './modules/report/report.module';
import { BitableRetryModule } from './modules/bitable-retry/bitable-retry.module';
import { RoleManagerModule } from './modules/role-manager/role-manager.module';
import { ScheduleModule } from './modules/schedule/schedule.module';
import { StudentModule } from './modules/student/student.module';
import { ViewModule } from './modules/view/view.module';

@Module({
  imports: [
    // 平台 Module，提供平台能力
    PlatformModule.forRoot(),
    // ====== @route-section: business-modules START ======
    // Place all business modules here.Do NOT add fallback modules here.
    BitableSyncModule,
    FeishuMessageModule,
    DashboardModule,
    AuthModule,
    BitableRetryModule,
    ContentModule,
    ConsultationModule,
    CourseModule,
    StudentModule,
    ScheduleModule,
    LeadModule,
    LeaveModule,
    GraduationModule,
    ReportModule,
    RoleManagerModule,
    // ====== @route-section: business-modules END ======

    // ⚠️ @route-order: last
    // ViewModule is the fallback route module, must be registered last.
    ViewModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule {}
