import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  AssetReservationItem,
  ReservationDetail,
  CreateReservationRequest,
  ReservationListParams,
  ReservationStats,
  PagedResponse,
} from '@shared/api.interface';

export async function createReservation(
  data: CreateReservationRequest,
): Promise<AssetReservationItem> {
  const response = await axiosForBackend({
    url: '/api/asset-reservations',
    method: 'POST',
    data,
  });
  return response.data;
}

export async function getReservations(
  params: ReservationListParams = {},
  signal?: AbortSignal,
): Promise<PagedResponse<AssetReservationItem>> {
  const response = await axiosForBackend({
    url: '/api/asset-reservations',
    method: 'GET',
    params,
    signal,
  });
  return response.data;
}

export async function getReservationById(
  id: string,
): Promise<ReservationDetail> {
  const response = await axiosForBackend({
    url: `/api/asset-reservations/${id}`,
    method: 'GET',
  });
  return response.data;
}

export async function approveReservation(
  id: string,
  remark?: string,
): Promise<AssetReservationItem> {
  const response = await axiosForBackend({
    url: `/api/asset-reservations/${id}/approve`,
    method: 'PUT',
    data: { remark },
  });
  return response.data;
}

export async function rejectReservation(
  id: string,
  reason: string,
): Promise<AssetReservationItem> {
  const response = await axiosForBackend({
    url: `/api/asset-reservations/${id}/reject`,
    method: 'PUT',
    data: { reason },
  });
  return response.data;
}

export async function borrowAsset(
  id: string,
): Promise<AssetReservationItem> {
  const response = await axiosForBackend({
    url: `/api/asset-reservations/${id}/borrow`,
    method: 'PUT',
  });
  return response.data;
}

export async function returnAsset(
  id: string,
  remark?: string,
): Promise<AssetReservationItem> {
  const response = await axiosForBackend({
    url: `/api/asset-reservations/${id}/return`,
    method: 'PUT',
    data: { remark },
  });
  return response.data;
}

export async function cancelReservation(
  id: string,
): Promise<AssetReservationItem> {
  const response = await axiosForBackend({
    url: `/api/asset-reservations/${id}/cancel`,
    method: 'PUT',
  });
  return response.data;
}

export async function getMyReservations(
  params: ReservationListParams = {},
): Promise<PagedResponse<AssetReservationItem>> {
  const response = await axiosForBackend({
    url: '/api/asset-reservations/my/list',
    method: 'GET',
    params,
  });
  return response.data;
}

export async function getPendingApprovals(
  params: ReservationListParams = {},
): Promise<PagedResponse<AssetReservationItem>> {
  const response = await axiosForBackend({
    url: '/api/asset-reservations/pending/list',
    method: 'GET',
    params,
  });
  return response.data;
}

export async function getReservationStats(
  signal?: AbortSignal,
): Promise<ReservationStats> {
  const response = await axiosForBackend({
    url: '/api/asset-reservations/stats/overview',
    method: 'GET',
    signal,
  });
  return response.data;
}