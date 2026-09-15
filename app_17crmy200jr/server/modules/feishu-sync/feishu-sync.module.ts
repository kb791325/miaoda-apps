import { Module } from '@nestjs/common';

import { FeishuSyncController } from './feishu-sync.controller';
import { FeishuSyncService } from './feishu-sync.service';

/**
 * 飞书同步模块
 *
 * 依赖说明：
 * - DRIZZLE_DATABASE 由 PlatformModule 全局提供，无需额外 import
 * - CapabilityService 由 @lark-apaas/fullstack-nestjs-core 提供，
 *   通过构造函数注入即可使用
 *
 * 架构变更说明（2026-08）：业务数据已改为直连飞书多维表格，
 * 不再需要双向同步。FeishuSyncAutomationService 已停用，
 * 模块保留用于历史配置查询和手动同步调试。
 */
@Module({
  controllers: [FeishuSyncController],
  providers: [FeishuSyncService],
  exports: [FeishuSyncService],
})
export class FeishuSyncModule {}
