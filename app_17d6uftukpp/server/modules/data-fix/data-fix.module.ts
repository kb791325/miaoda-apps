import { Module } from '@nestjs/common';
import { DataFixController } from './data-fix.controller';
import { DataFixService } from './data-fix.service';

@Module({
  controllers: [DataFixController],
  providers: [DataFixService],
})
export class DataFixModule {}