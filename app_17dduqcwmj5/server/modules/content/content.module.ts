import { Module } from '@nestjs/common';
import { ContentController } from './content.controller';
import { ContentService } from './content.service';
import { MarketingContentIngestAutomation } from './marketing-content-ingest.automation';

@Module({
  controllers: [ContentController],
  providers: [ContentService, MarketingContentIngestAutomation],
})
export class ContentModule {}
