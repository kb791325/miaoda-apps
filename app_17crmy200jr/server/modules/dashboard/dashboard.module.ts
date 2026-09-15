import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { FeishuBitableModule } from '../feishu-bitable/feishu-bitable.module';

@Module({
  imports: [FeishuBitableModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
