import { Module } from '@nestjs/common';
import { LeadModule } from '../lead/lead.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [LeadModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
