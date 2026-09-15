import axiosForBackend from './apiClient';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type {
  AuditLog,
  AuditLogListParams,
  AuditLogListResponse,
} from '@shared/api.interface';

export async function getAuditLogs(
  params: AuditLogListParams,
): Promise<AuditLogListResponse> {
  logger.info('Fetching audit logs', JSON.stringify(params));
  const response = await axiosForBackend.get<AuditLogListResponse>(
    '/api/audit-logs',
    { params },
  );
  return response.data;
}

export async function getAuditLogDetail(id: string): Promise<AuditLog> {
  logger.info('Fetching audit log detail', id);
  const response = await axiosForBackend.get<AuditLog>(
    `/api/audit-logs/${id}`,
  );
  return response.data;
}

export async function exportAuditLogs(
  params: Omit<AuditLogListParams, 'page' | 'pageSize'>,
): Promise<AuditLog[]> {
  const response = await axiosForBackend.get<AuditLog[]>(
    '/api/audit-logs/export',
    { params },
  );
  return response.data;
}
