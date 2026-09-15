import { Global, Module } from '@nestjs/common';
import { BitableIngestService } from './bitable-ingest.service';
import { BitableSyncMapper } from './bitable-sync.mapper';
import { BitableSyncService } from './bitable-sync.service';

@Global()
@Module({
  providers: [BitableSyncService, BitableSyncMapper, BitableIngestService],
  exports: [BitableSyncService, BitableSyncMapper, BitableIngestService],
})
export class BitableSyncModule {}
