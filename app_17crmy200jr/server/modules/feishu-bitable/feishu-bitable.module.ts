import { Module } from '@nestjs/common';
import { FeishuBitableService } from './feishu-bitable.service';

@Module({
  providers: [FeishuBitableService],
  exports: [FeishuBitableService],
})
export class FeishuBitableModule {}
