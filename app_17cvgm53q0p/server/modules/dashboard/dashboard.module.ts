import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { BitableModule } from '@server/modules/bitable/bitable.module';
import { AuthModule } from '@server/modules/auth/auth.module';

@Module({
  imports: [BitableModule, AuthModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
