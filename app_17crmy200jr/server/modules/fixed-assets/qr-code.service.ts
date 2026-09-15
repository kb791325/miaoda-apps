import { Injectable, Logger } from '@nestjs/common';
import * as QRCode from 'qrcode';

export interface AssetQRData {
  type: 'asset';
  assetId: string;
  assetName: string;
  assetCode: string;
  assetType: string;
  timestamp: number;
  viewUrl: string;
}

export interface LabelConfig {
  width: string;
  height: string;
  cols: number;
  rows: number;
  perPage: number;
}

@Injectable()
export class QRCodeService {
  private readonly logger = new Logger(QRCodeService.name);

  async generateQRCodeDataURL(
    assetId: string,
    assetName: string,
    assetCode: string,
    assetType: string,
  ): Promise<string> {
    const data: AssetQRData = {
      type: 'asset',
      assetId,
      assetName,
      assetCode,
      assetType,
      timestamp: Date.now(),
      viewUrl: `/fixed-assets/${assetId}`,
    };
    const jsonStr: string = JSON.stringify(data);
    this.logger.log(`生成 QR 码: ${assetId}`);
    return QRCode.toDataURL(jsonStr, {
      width: 300,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    });
  }

  async generateBatchQRCodeDataURLs(
    assets: Array<{
      assetId: string;
      assetName: string;
      assetCode: string;
      assetType: string;
    }>,
  ): Promise<
    Array<{
      assetId: string;
      assetName: string;
      assetCode: string;
      qrDataURL: string;
    }>
  > {
    this.logger.log(`批量生成 QR 码: ${assets.length} 个资产`);
    const results = await Promise.all(
      assets.map(async (asset) => {
        const qrDataURL: string = await this.generateQRCodeDataURL(
          asset.assetId,
          asset.assetName,
          asset.assetCode,
          asset.assetType,
        );
        return { ...asset, qrDataURL };
      }),
    );
    return results;
  }

  async generatePrintableLabels(
    assets: Array<{
      assetId: string;
      assetName: string;
      assetCode: string;
      assetType: string;
    }>,
    labelSize: 'small' | 'medium' | 'large' = 'medium',
  ): Promise<{
    labels: Array<{
      assetId: string;
      assetName: string;
      assetCode: string;
      qrDataURL: string;
    }>;
    config: LabelConfig;
  }> {
    this.logger.log(
      `生成可打印标签: ${assets.length} 个, 尺寸 ${labelSize}`,
    );
    const labels = await this.generateBatchQRCodeDataURLs(assets);
    return { labels, config: this.getLabelConfig(labelSize) };
  }

  parseQRData(qrData: string): AssetQRData | null {
    try {
      const parsed: unknown = JSON.parse(qrData);
      const data = parsed as Record<string, unknown>;
      if (data.type === 'asset' && typeof data.assetId === 'string') {
        return parsed as AssetQRData;
      }
      return null;
    } catch {
      return null;
    }
  }

  private getLabelConfig(
    size: 'small' | 'medium' | 'large',
  ): LabelConfig {
    const configs: Record<string, LabelConfig> = {
      small: {
        width: '40mm',
        height: '30mm',
        cols: 5,
        rows: 8,
        perPage: 40,
      },
      medium: {
        width: '60mm',
        height: '40mm',
        cols: 4,
        rows: 6,
        perPage: 24,
      },
      large: {
        width: '80mm',
        height: '50mm',
        cols: 3,
        rows: 4,
        perPage: 12,
      },
    };
    return configs[size];
  }
}