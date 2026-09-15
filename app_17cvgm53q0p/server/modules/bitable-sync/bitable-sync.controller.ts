import { Controller, Post, UseGuards } from '@nestjs/common';
import { SyncPullService } from './sync-pull.service';
import { SyncPushService } from './sync-push.service';
import { SyncRepairService } from './sync-repair.service';
import { AppAuthGuard } from '@server/modules/auth/app-auth.guard';
import { RequirePermissions } from '@server/modules/auth/auth.decorator';

@Controller('api/bitable-sync')
export class BitableSyncController {
  constructor(
    private readonly pullService: SyncPullService,
    private readonly pushService: SyncPushService,
    private readonly repairService: SyncRepairService,
  ) {}

  /** 手动触发：多维表格 → 应用数据库 */
  @UseGuards(AppAuthGuard)
  @RequirePermissions('sync:manage')
  @Post('pull')
  pull() {
    return this.pullService.pullAll();
  }

  /** 手动触发：应用数据库 → 多维表格（全量重推对账） */
  @UseGuards(AppAuthGuard)
  @RequirePermissions('sync:manage')
  @Post('push')
  push() {
    return this.pushService.pushAll();
  }

  /** 手动触发：修复跟进编号/明细编号（UUID 乱码 → 业务编号） */
  @UseGuards(AppAuthGuard)
  @RequirePermissions('sync:manage')
  @Post('repair-numbers')
  repairNumbers() {
    return this.pullService.repairNumbers();
  }

  /** 手动触发：应用库 ↔ 多维表格全量一致性检查与修复（孤儿映射清理/编号重建/缺失补推 + 全量拉取收敛） */
  @UseGuards(AppAuthGuard)
  @RequirePermissions('sync:manage')
  @Post('repair')
  repair() {
    return this.repairService.repairAll();
  }

  /** 历史状态迁移：旧快递模式状态 → 上门安装模式状态（幂等） */
  @UseGuards(AppAuthGuard)
  @RequirePermissions('sync:manage')
  @Post('migrate-legacy-status')
  migrateLegacyStatus() {
    return this.repairService.migrateLegacyStatuses();
  }
}
