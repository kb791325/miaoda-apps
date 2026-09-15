import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';

import type {
  ShipmentDetail,
  ShipmentListParams,
  ShipmentListResponse,
  ShipmentMutationResponse,
  UpdateShipmentInfoRequest,
  UpdateShipmentStatusRequest,
} from '@shared/shipment';

export async function listShipments(
  params: ShipmentListParams,
): Promise<ShipmentListResponse> {
  const res = await axiosForBackend.get<ShipmentListResponse>(
    '/api/shipments',
    { params },
  );
  return res.data;
}

export async function getShipmentDetail(id: string): Promise<ShipmentDetail> {
  const res = await axiosForBackend.get<ShipmentDetail>(
    `/api/shipments/${id}`,
  );
  return res.data;
}

export async function updateShipmentInfo(
  id: string,
  dto: UpdateShipmentInfoRequest,
): Promise<ShipmentMutationResponse> {
  const res = await axiosForBackend.patch<ShipmentMutationResponse>(
    `/api/shipments/${id}`,
    dto,
  );
  return res.data;
}

export async function updateShipmentStatus(
  id: string,
  dto: UpdateShipmentStatusRequest,
): Promise<ShipmentMutationResponse> {
  const res = await axiosForBackend.patch<ShipmentMutationResponse>(
    `/api/shipments/${id}/status`,
    dto,
  );
  return res.data;
}

export async function cancelShipment(
  id: string,
): Promise<ShipmentMutationResponse> {
  const res = await axiosForBackend.delete<ShipmentMutationResponse>(
    `/api/shipments/${id}`,
  );
  return res.data;
}
