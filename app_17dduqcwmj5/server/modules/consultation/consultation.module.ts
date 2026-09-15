import { Module } from '@nestjs/common';
import { CapabilityModule } from '@lark-apaas/fullstack-nestjs-core';
import { ConsultationController } from './consultation.controller';
import { ConsultationService } from './consultation.service';

@Module({
  imports: [CapabilityModule],
  controllers: [ConsultationController],
  providers: [ConsultationService],
})
export class ConsultationModule {}
