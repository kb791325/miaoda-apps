import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { FeishuBitableModule } from '../feishu-bitable/feishu-bitable.module';

@Module({
  imports: [FeishuBitableModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
