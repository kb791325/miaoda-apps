import { Logger } from '@nestjs/common';
import { Automation, BindTrigger } from '@lark-apaas/fullstack-nestjs-core';
import { BitableIngestService } from '@server/src/common/bitable-sync/bitable-ingest.service';

@Automation()
export class MarketingContentIngestAutomation {
  private readonly logger = new Logger(MarketingContentIngestAutomation.name);

  constructor(private readonly bitableIngestService: BitableIngestService) {}

  @BindTrigger('marketing_content_ingest')
  async ingest(): Promise<void> {
    this.logger.log('招生内容入站消费定时任务开始');
    try {
      const summary: {
        inserted: number;
        updated: number;
        skipped: number;
      } = await this.bitableIngestService.ingestMarketingContent();
      this.logger.log(`招生内容入站结果: ${JSON.stringify(summary)}`);
    } catch (error) {
      this.logger.error(
        `招生内容入站失败: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
