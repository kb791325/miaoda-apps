import { Module } from '@nestjs/common';
import { FixedAssetsController } from './fixed-assets.controller';
import { FixedAssetsService } from './fixed-assets.service';
import { QRCodeController } from './qr-code.controller';
import { QRCodeService } from './qr-code.service';
import { FeishuBitableModule } from '../feishu-bitable/feishu-bitable.module';

@Module({
  imports: [FeishuBitableModule],
  controllers: [FixedAssetsController, QRCodeController],
  providers: [FixedAssetsService, QRCodeService],
  exports: [FixedAssetsService],
})
export class FixedAssetsModule {}
