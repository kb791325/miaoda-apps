import axiosForBackend from './apiClient';
import type {
  InboundRequest,
  InboundResponse,
  OutboundRequest,
  OutboundResponse,
  TransferRequest,
  TransferResponse,
} from '@shared/api.interface';

export async function inbound(
  data: InboundRequest,
): Promise<InboundResponse> {
  const response = await axiosForBackend.post<InboundResponse>(
    '/api/stock-operations/inbound',
    data,
  );
  return response.data;
}

export async function outbound(
  data: OutboundRequest,
): Promise<OutboundResponse> {
  const response = await axiosForBackend.post<OutboundResponse>(
    '/api/stock-operations/outbound',
    data,
  );
  return response.data;
}

export async function transfer(
  data: TransferRequest,
): Promise<TransferResponse> {
  const response = await axiosForBackend.post<TransferResponse>(
    '/api/stock-operations/transfer',
    data,
  );
  return response.data;
}
