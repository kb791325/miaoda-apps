import { Module } from '@nestjs/common';
import { GeneController } from './gene.controller';
import { GeneService } from './gene.service';

@Module({
  controllers: [GeneController],
  providers: [GeneService],
  exports: [GeneService],
})
export class GeneModule {}
