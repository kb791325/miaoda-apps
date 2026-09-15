import { Global, Module } from '@nestjs/common';
import { FeishuMessageService } from './feishu-message.service';

@Global()
@Module({
  providers: [FeishuMessageService],
  exports: [FeishuMessageService],
})
export class FeishuMessageModule {}
