import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  FixedAssetItem,
  FixedAssetDetail,
  AssetSummary,
  AssetUserOption,
  CreateFixedAssetDto,
  CheckHistoryItem,
  PagedResponse,
  AssetOperationRecord,
  BatchOperationResult,
} from '@shared/api.interface';

export interface AssetListParams {
  keyword?: string;
  assetType?: string;
  floor?: string;
  assetStatus?: string;
  page?: number;
  pageSize?: number;
}

export async function getAssetUserOptions(): Promise<AssetUserOption[]> {
  const response = await axiosForBackend({
    url: '/api/fixed-assets/user-options',
    method: 'GET',
  });
  return response.data;
}

export async function getAssets(
  params: AssetListParams = {},
  signal?: AbortSignal,
): Promise<PagedResponse<FixedAssetItem>> {
  const response = await axiosForBackend({
    url: '/api/fixed-assets',
    method: 'GET',
    params,
    signal,
  });
  return response.data;
}

export async function getAssetsSummary(
  params: Omit<AssetListParams, 'page' | 'pageSize'> = {},
  signal?: AbortSignal,
): Promise<AssetSummary> {
  const response = await axiosForBackend({
    url: '/api/fixed-assets/summary',
    method: 'GET',
    params,
    signal,
  });
  return response.data;
}

export async function getAsset(id: string): Promise<FixedAssetDetail> {
  const response = await axiosForBackend({
    url: `/api/fixed-assets/${id}`,
    method: 'GET',
  });
  return response.data;
}

export async function createAsset(
  data: CreateFixedAssetDto,
): Promise<FixedAssetItem> {
  const response = await axiosForBackend({
    url: '/api/fixed-assets',
    method: 'POST',
    data,
  });
  return response.data;
}

export async function updateAsset(
  id: string,
  data: Partial<CreateFixedAssetDto>,
): Promise<FixedAssetItem> {
  const response = await axiosForBackend({
    url: `/api/fixed-assets/${id}`,
    method: 'PUT',
    data,
  });
  return response.data;
}

export async function deleteAsset(id: string): Promise<void> {
  const response = await axiosForBackend({
    url: `/api/fixed-assets/${id}`,
    method: 'DELETE',
  });
  return response.data;
}

export async function getAssetCheckHistory(
  id: string,
  params: { page?: number; pageSize?: number } = {},
): Promise<CheckHistoryItem[]> {
  const response = await axiosForBackend({
    url: `/api/fixed-assets/${id}/check-history`,
    method: 'GET',
    params,
  });
  return response.data.items ?? response.data ?? [];
}

export async function borrowAsset(
  id: string,
  data: {
    targetUserId: string;
    expectedReturnDate?: string;
    reason?: string;
    remark?: string;
  },
): Promise<FixedAssetDetail> {
  const response = await axiosForBackend({
    url: `/api/fixed-assets/${id}/borrow`,
    method: 'POST',
    data,
  });
  return response.data;
}

export async function returnAsset(
  id: string,
  data: { remark?: string } = {},
): Promise<FixedAssetDetail> {
  const response = await axiosForBackend({
    url: `/api/fixed-assets/${id}/return`,
    method: 'POST',
    data,
  });
  return response.data;
}

export async function startRepair(
  id: string,
  data: {
    reason: string;
    expectedDate?: string;
    cost?: number;
    vendor?: string;
    remark?: string;
  },
): Promise<FixedAssetDetail> {
  const response = await axiosForBackend({
    url: `/api/fixed-assets/${id}/repair/start`,
    method: 'POST',
    data,
  });
  return response.data;
}

export async function completeRepair(
  id: string,
  data: { actualCost?: number; remark?: string } = {},
): Promise<FixedAssetDetail> {
  const response = await axiosForBackend({
    url: `/api/fixed-assets/${id}/repair/complete`,
    method: 'POST',
    data,
  });
  return response.data;
}

export async function startTransfer(
  id: string,
  data: {
    targetDepartment?: string;
    targetFloor?: string;
    targetUserId?: string;
    reason?: string;
    remark?: string;
  },
): Promise<FixedAssetDetail> {
  const response = await axiosForBackend({
    url: `/api/fixed-assets/${id}/transfer/start`,
    method: 'POST',
    data,
  });
  return response.data;
}

export async function completeTransfer(
  id: string,
  data: { remark?: string } = {},
): Promise<FixedAssetDetail> {
  const response = await axiosForBackend({
    url: `/api/fixed-assets/${id}/transfer/complete`,
    method: 'POST',
    data,
  });
  return response.data;
}

export async function scrapAsset(
  id: string,
  data: { reason: string; remark?: string },
): Promise<FixedAssetDetail> {
  const response = await axiosForBackend({
    url: `/api/fixed-assets/${id}/scrap`,
    method: 'POST',
    data,
  });
  return response.data;
}

export async function getAssetOperationHistory(
  id: string,
  page = 1,
  pageSize = 20,
): Promise<PagedResponse<AssetOperationRecord>> {
  const response = await axiosForBackend({
    url: `/api/fixed-assets/${id}/operation-history`,
    method: 'GET',
    params: { page, pageSize },
  });
  return response.data;
}

export async function batchUpdateAssetCategory(
  ids: string[],
  assetCategory: string,
): Promise<BatchOperationResult> {
  const response = await axiosForBackend({
    url: '/api/fixed-assets/batch-update-category',
    method: 'POST',
    data: { ids, assetCategory },
  });
  return response.data;
}

export async function batchUpdateAssetFloor(
  ids: string[],
  floor: string,
): Promise<BatchOperationResult> {
  const response = await axiosForBackend({
    url: '/api/fixed-assets/batch-update-floor',
    method: 'POST',
    data: { ids, floor },
  });
  return response.data;
}

export async function batchTransferAssets(
  ids: string[],
  data: {
    targetDepartment?: string;
    targetFloor?: string;
    targetUserId?: string;
    reason?: string;
  },
): Promise<BatchOperationResult> {
  const response = await axiosForBackend({
    url: '/api/fixed-assets/batch-transfer',
    method: 'POST',
    data: { ids, ...data },
  });
  return response.data;
}

export async function batchScrapAssets(
  ids: string[],
  reason: string,
): Promise<BatchOperationResult> {
  const response = await axiosForBackend({
    url: '/api/fixed-assets/batch-scrap',
    method: 'POST',
    data: { ids, reason },
  });
  return response.data;
}
