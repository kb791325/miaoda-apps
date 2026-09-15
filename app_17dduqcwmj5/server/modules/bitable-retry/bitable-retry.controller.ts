import { Body, Controller, Post } from '@nestjs/common';
import { CanRole, NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import { APP_ROLES } from '@shared/roles';
import { BitableIngestService } from '@server/src/common/bitable-sync/bitable-ingest.service';
import { BitableReconcileService } from '@server/src/common/bitable-sync/bitable-reconcile.service';
import { BitableSyncService } from '@server/src/common/bitable-sync/bitable-sync.service';
import type {
  BitableIngestSummary,
  BitableReconcileRequest,
  BitableReconcileResponse,
  BitableRecordType,
  BitableRepairSummary,
  BitableRetryRequest,
  BitableSyncResult,
} from '@shared/bitable-sync';

@NeedLogin()
@Controller('api/bitable-retry')
export class BitableRetryController {
  constructor(
    private readonly bitableSyncService: BitableSyncService,
    private readonly bitableReconcileService: BitableReconcileService,
    private readonly bitableIngestService: BitableIngestService,
  ) {}

  @CanRole([APP_ROLES.principal])
  @Post('retry')
  async retry(@Body() body: BitableRetryRequest): Promise<BitableSyncResult> {
    return this.bitableSyncService.syncRecord(body.recordType, body.recordId);
  }

  @CanRole([APP_ROLES.principal])
  @Post('repair-all')
  async repairAll(): Promise<BitableRepairSummary> {
    return this.bitableSyncService.repairAll();
  }

  @CanRole([APP_ROLES.principal])
  @Post('reconcile')
  async reconcile(
    @Body() body: BitableReconcileRequest | undefined,
  ): Promise<BitableReconcileResponse> {
    const recordTypes: BitableRecordType[] =
      body && Array.isArray(body.recordTypes) ? body.recordTypes : [];
    return this.bitableReconcileService.reconcile(recordTypes);
  }

  @CanRole([APP_ROLES.principal])
  @Post('pull-marketing-contents')
  async pullMarketingContents(): Promise<BitableIngestSummary> {
    return this.bitableIngestService.ingestMarketingContent();
  }
}
