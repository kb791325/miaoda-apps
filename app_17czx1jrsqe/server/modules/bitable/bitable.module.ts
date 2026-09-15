import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { BitableService } from '../../common/feishu/bitable.service';
import { BitableEntityService } from './bitable.entity.service';
import { BitableEntityController, HealthController } from './bitable.entity.controller';
import { BitableDashboardService } from './bitable.dashboard.service';
import { FinanceLinkageService } from './finance-linkage.service';
import { AdminLinkageService } from './admin-linkage.service';
import { BitableDashboardController } from './bitable.dashboard.controller';
import { FinanceOpsController } from './finance-ops.controller';
import { PerformanceLinkageService } from './performance-linkage.service';
import { PerformanceOpsController } from './performance-ops.controller';
import {
  AttachmentFieldService,
  MediaUploadController,
} from './media-upload.controller';
import { RoleAccessService } from './role-access.service';
import { CommissionRuleFieldsService } from './commission-rule-fields.service';
import { DatabaseMigrationService } from './database-migration.service';

@Module({
  imports: [HttpModule],
  controllers: [HealthController, BitableEntityController, BitableDashboardController, FinanceOpsController, PerformanceOpsController, MediaUploadController],
  providers: [BitableService, BitableEntityService, BitableDashboardService, FinanceLinkageService, AdminLinkageService, PerformanceLinkageService, AttachmentFieldService, RoleAccessService, CommissionRuleFieldsService, DatabaseMigrationService],
  exports: [BitableService, BitableEntityService, BitableDashboardService],
})
export class BitableModule implements OnModuleInit {
  private readonly logger = new Logger(BitableModule.name);

  onModuleInit() {
    this.logger.log('BitableModule 初始化完成，4 个控制器已注册');
  }
}
