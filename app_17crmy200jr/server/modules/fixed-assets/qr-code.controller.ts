import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  Logger,
} from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import { QRCodeService } from './qr-code.service';
import { FixedAssetsService } from './fixed-assets.service';

@Controller('api/fixed-assets')
@NeedLogin()
export class QRCodeController {
  private readonly logger = new Logger(QRCodeController.name);

  constructor(
    private readonly qrCodeService: QRCodeService,
    private readonly fixedAssetsService: FixedAssetsService,
  ) {}

  @Get(':id/qrcode')
  async getAssetQRCode(@Param('id') id: string) {
    this.logger.log(`获取资产 QR 码: ${id}`);
    const asset = await this.fixedAssetsService.getDetail(id);
    const assetCode: string = `FA-${id.slice(-6)}`;
    const qrDataURL: string =
      await this.qrCodeService.generateQRCodeDataURL(
        id,
        asset.assetName || '未知资产',
        assetCode,
        asset.assetType || '通用',
      );
    return { qrDataURL };
  }

  @Get('qrcode/batch')
  async getBatchQRCode(@Query('ids') ids: string) {
    const idList: string[] = ids.split(',').filter(Boolean);
    this.logger.log(`批量获取 QR 码: ${idList.length} 个资产`);
    const qrCodes = await Promise.all(
      idList.map(async (id: string) => {
        const asset = await this.fixedAssetsService.getDetail(id);
        const assetCode: string = `FA-${id.slice(-6)}`;
        const qrDataURL: string =
          await this.qrCodeService.generateQRCodeDataURL(
            id,
            asset.assetName || '未知资产',
            assetCode,
            asset.assetType || '通用',
          );
        return { assetId: id, qrDataURL };
      }),
    );
    return { qrCodes };
  }

  @Post('qrcode/print')
  async generatePrintLabels(
    @Body()
    body: {
      assetIds: string[];
      labelSize?: 'small' | 'medium' | 'large';
    },
  ) {
    const { assetIds, labelSize = 'medium' } = body;
    this.logger.log(
      `生成可打印标签: ${assetIds.length} 个, 尺寸 ${labelSize}`,
    );
    const assets = await Promise.all(
      assetIds.map(async (id: string) => {
        const asset = await this.fixedAssetsService.getDetail(id);
        return {
          assetId: id,
          assetName: asset.assetName || '未知资产',
          assetCode: `FA-${id.slice(-6)}`,
          assetType: asset.assetType || '通用',
        };
      }),
    );
    const result = await this.qrCodeService.generatePrintableLabels(
      assets,
      labelSize,
    );
    return result;
  }

  @Post('scan')
  async scanQRCode(@Body() body: { qrData: string }) {
    this.logger.log(`扫描 QR 码解析`);
    const decoded: string = decodeURIComponent(body.qrData);
    const parsed = this.qrCodeService.parseQRData(decoded);
    if (!parsed) {
      return { valid: false, message: '无效的QR码' };
    }
    return {
      valid: true,
      assetId: parsed.assetId,
      assetName: parsed.assetName,
      assetCode: parsed.assetCode,
      assetType: parsed.assetType,
      viewUrl: parsed.viewUrl,
    };
  }
}