import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';

export interface AssetQRCodeResponse {
  qrDataURL: string;
}

export interface BatchQRCodeItem {
  assetId: string;
  qrDataURL: string;
}

export interface BatchQRCodeResponse {
  qrCodes: BatchQRCodeItem[];
}

export interface PrintLabel {
  assetId: string;
  assetName: string;
  assetCode: string;
  qrDataURL: string;
}

export interface PrintLabelConfig {
  labelSize: string;
  width: number;
  height: number;
  cols: number;
}

export interface GeneratePrintLabelsResponse {
  labels: PrintLabel[];
  config: PrintLabelConfig;
}

export interface ScanQRCodeResponse {
  valid: boolean;
  assetId?: string;
  assetName?: string;
  assetType?: string;
  assetStatus?: string;
  assetCode?: string;
}

const QR_CODE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  data: AssetQRCodeResponse;
  timestamp: number;
}

const qrCodeCache = new Map<string, CacheEntry>();

export async function getAssetQRCode(
  assetId: string,
): Promise<AssetQRCodeResponse> {
  const cached = qrCodeCache.get(assetId);
  if (cached && Date.now() - cached.timestamp < QR_CODE_CACHE_TTL) {
    return cached.data;
  }

  const response = await axiosForBackend({
    url: `/api/fixed-assets/${assetId}/qrcode`,
    method: 'GET',
  });

  qrCodeCache.set(assetId, {
    data: response.data,
    timestamp: Date.now(),
  });

  return response.data;
}

export async function getBatchQRCode(
  assetIds: string[],
): Promise<BatchQRCodeResponse> {
  const response = await axiosForBackend({
    url: '/api/fixed-assets/qrcode/batch',
    method: 'GET',
    params: { ids: assetIds.join(',') },
  });
  return response.data;
}

export async function generatePrintLabels(
  assetIds: string[],
  labelSize: 'small' | 'medium' | 'large' = 'medium',
): Promise<GeneratePrintLabelsResponse> {
  const response = await axiosForBackend({
    url: '/api/fixed-assets/qrcode/print',
    method: 'POST',
    data: { assetIds, labelSize },
  });
  return response.data;
}

export async function scanQRCode(
  qrData: string,
): Promise<ScanQRCodeResponse> {
  const response = await axiosForBackend({
    url: '/api/fixed-assets/scan',
    method: 'POST',
    data: { qrData },
  });
  return response.data;
}