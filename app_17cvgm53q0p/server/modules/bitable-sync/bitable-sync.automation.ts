import { Logger } from '@nestjs/common';
import { Automation, BindTrigger } from '@lark-apaas/fullstack-nestjs-core';
import { SyncPullService } from './sync-pull.service';

/** 定时拉取：多维表格侧变更 → 应用数据库（触发器 bitable_pull_sync，每 30 分钟） */
@Automation()
export class BitableSyncAutomation {
  private readonly logger = new Logger(BitableSyncAutomation.name);

  constructor(private readonly pullService: SyncPullService) {}

  @BindTrigger('bitable_pull_sync')
  async run(): Promise<void> {
    try {
      const result = await this.pullService.pullAll();
      this.logger.log(`scheduled pull done: ${JSON.stringify(result)}`);
    } catch (error) {
      this.logger.error(
        `scheduled pull failed: ${(error as Error).stack ?? error}`,
      );
    }
  }
}
