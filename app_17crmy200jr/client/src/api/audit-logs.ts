import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  AuditLogItem,
  AuditLogDetail,
  AuditLogStats,
  AuditLogListResponse,
  AuditDailySummaryResponse,
  AuditModuleStat,
  AuditUserStat,
  AuditTrendItem,
  AuditTypeDistribution,
  AuditModuleDistribution,
  AuditTopTarget,
  AuditLogListParams,
} from '@shared/api.interface';

export async function getAuditLogs(
  params: AuditLogListParams,
): Promise<AuditLogListResponse> {
  const res = await axiosForBackend({
    url: '/api/audit-logs',
    method: 'GET',
    params,
  });
  return res.data;
}

export async function getAuditLogById(id: string): Promise<AuditLogDetail> {
  const res = await axiosForBackend({
    url: `/api/audit-logs/${id}`,
    method: 'GET',
  });
  return res.data;
}

export async function getAuditStats(
  params?: { startDate?: string; endDate?: string },
): Promise<AuditLogStats> {
  const res = await axiosForBackend({
    url: '/api/audit-logs/stats/overview',
    method: 'GET',
    params,
  });
  return res.data;
}

export async function getDailySummary(
  date: string,
): Promise<AuditDailySummaryResponse> {
  const res = await axiosForBackend({
    url: '/api/audit-logs/stats/daily',
    method: 'GET',
    params: { date },
  });
  return res.data;
}

export async function getModuleStats(
  params?: { startDate?: string; endDate?: string },
): Promise<AuditModuleStat[]> {
  const res = await axiosForBackend({
    url: '/api/audit-logs/stats/module',
    method: 'GET',
    params,
  });
  return res.data;
}

export async function getUserStats(
  params?: { startDate?: string; endDate?: string; limit?: number },
): Promise<AuditUserStat[]> {
  const res = await axiosForBackend({
    url: '/api/audit-logs/stats/user',
    method: 'GET',
    params,
  });
  return res.data;
}

export async function getAuditTrail(
  targetType: string,
  targetId: string,
): Promise<AuditLogItem[]> {
  const res = await axiosForBackend({
    url: `/api/audit-logs/trail/${targetType}/${targetId}`,
    method: 'GET',
  });
  return res.data;
}

export async function exportAuditLogs(
  params: AuditLogListParams,
): Promise<Blob> {
  const res = await axiosForBackend({
    url: '/api/audit-logs/export',
    method: 'GET',
    params,
    responseType: 'blob',
  });
  return res.data;
}

export async function getMyActions(
  params: AuditLogListParams,
): Promise<AuditLogListResponse> {
  const res = await axiosForBackend({
    url: '/api/audit-logs/my/actions',
    method: 'GET',
    params,
  });
  return res.data;
}

export async function getAuditTrend(
  params: { days?: number; startDate?: string; endDate?: string },
): Promise<AuditTrendItem[]> {
  const res = await axiosForBackend({
    url: '/api/audit-logs/stats/trend',
    method: 'GET',
    params,
  });
  return res.data;
}

export async function getOperationTypeDistribution(
  params?: { startDate?: string; endDate?: string },
): Promise<AuditTypeDistribution[]> {
  const res = await axiosForBackend({
    url: '/api/audit-logs/stats/operation-type',
    method: 'GET',
    params,
  });
  return res.data;
}

export async function getModuleDistribution(
  params?: { startDate?: string; endDate?: string },
): Promise<AuditModuleDistribution[]> {
  const res = await axiosForBackend({
    url: '/api/audit-logs/stats/module',
    method: 'GET',
    params,
  });
  return res.data;
}

export async function getTopTargets(
  params?: { startDate?: string; endDate?: string; limit?: number },
): Promise<AuditTopTarget[]> {
  const res = await axiosForBackend({
    url: '/api/audit-logs/stats/top-targets',
    method: 'GET',
    params,
  });
  return res.data;
}