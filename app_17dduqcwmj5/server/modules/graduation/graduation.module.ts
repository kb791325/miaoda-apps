import { Module } from '@nestjs/common';
import { GraduationController } from './graduation.controller';
import { GraduationService } from './graduation.service';

@Module({
  controllers: [GraduationController],
  providers: [GraduationService],
})
export class GraduationModule {}
