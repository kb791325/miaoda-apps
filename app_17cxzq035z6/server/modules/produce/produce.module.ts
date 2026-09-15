import { Module } from '@nestjs/common';
import { ProduceController } from './produce.controller';
import { ProduceService } from './produce.service';

@Module({
  controllers: [ProduceController],
  providers: [ProduceService],
  exports: [ProduceService],
})
export class ProduceModule {}
