import { Module } from '@nestjs/common';
import { DataImportController } from './data-import.controller';
import { DataImportService } from './data-import.service';
import { PushBitableService } from './push-bitable.service';

@Module({
  controllers: [DataImportController],
  providers: [DataImportService, PushBitableService],
})
export class DataImportModule {}
