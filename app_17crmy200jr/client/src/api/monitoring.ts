import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  PerformanceOverview,
  ResponseTimeStats,
  ThroughputStats,
  SlowRequestItem,
  CacheStats,
  ErrorEntry,
  ErrorStats,
  BusinessMetricsOverview,
  MetricTrend,
  AlertEvent,
  AlertStats,
  HealthStatus,
  LogEntry,
  LogQueryParams,
  LogStats,
  ErrorStatus,
} from '@shared/api.interface';

export async function getPerformanceOverview(): Promise<PerformanceOverview> {
  const response = await axiosForBackend({
    url: '/api/monitoring/performance/overview',
    method: 'GET',
  });
  return response.data;
}

export async function getResponseTimeStats(): Promise<ResponseTimeStats> {
  const response = await axiosForBackend({
    url: '/api/monitoring/performance/response-time',
    method: 'GET',
  });
  return response.data;
}

export async function getThroughputStats(): Promise<ThroughputStats> {
  const response = await axiosForBackend({
    url: '/api/monitoring/performance/throughput',
    method: 'GET',
  });
  return response.data;
}

export async function getSlowRequests(
  limit?: number,
): Promise<SlowRequestItem[]> {
  const response = await axiosForBackend({
    url: '/api/monitoring/performance/slow-requests',
    method: 'GET',
    params: limit !== undefined ? { limit } : undefined,
  });
  return response.data;
}

export async function getCacheStats(): Promise<CacheStats> {
  const response = await axiosForBackend({
    url: '/api/monitoring/performance/cache',
    method: 'GET',
  });
  return response.data;
}

export async function getErrors(
  params?: { status?: string; page?: number; pageSize?: number },
): Promise<{ items: ErrorEntry[]; total: number }> {
  const response = await axiosForBackend({
    url: '/api/monitoring/errors',
    method: 'GET',
    params,
  });
  return response.data;
}

export async function getErrorStats(): Promise<ErrorStats> {
  const response = await axiosForBackend({
    url: '/api/monitoring/errors/stats',
    method: 'GET',
  });
  return response.data;
}

export async function updateErrorStatus(
  id: string,
  status: ErrorStatus,
): Promise<void> {
  await axiosForBackend({
    url: `/api/monitoring/errors/${id}/status`,
    method: 'PUT',
    data: { status },
  });
}

export async function getBusinessOverview(): Promise<BusinessMetricsOverview> {
  const response = await axiosForBackend({
    url: '/api/monitoring/business/overview',
    method: 'GET',
  });
  return response.data;
}

export async function getBusinessTrends(
  type: string,
  days?: number,
): Promise<MetricTrend[]> {
  const response = await axiosForBackend({
    url: '/api/monitoring/business/trends',
    method: 'GET',
    params: { type, ...(days !== undefined ? { days } : {}) },
  });
  return response.data;
}

export async function getAlerts(
  params?: { status?: string; severity?: string; page?: number; pageSize?: number },
): Promise<{ items: AlertEvent[]; total: number }> {
  const response = await axiosForBackend({
    url: '/api/monitoring/alerts',
    method: 'GET',
    params,
  });
  return response.data;
}

export async function getActiveAlerts(): Promise<AlertEvent[]> {
  const response = await axiosForBackend({
    url: '/api/monitoring/alerts/active',
    method: 'GET',
  });
  return response.data;
}

export async function getAlertStats(): Promise<AlertStats> {
  const response = await axiosForBackend({
    url: '/api/monitoring/alerts/stats',
    method: 'GET',
  });
  return response.data;
}

export async function acknowledgeAlert(id: string): Promise<void> {
  await axiosForBackend({
    url: `/api/monitoring/alerts/${id}/acknowledge`,
    method: 'PUT',
  });
}

export async function resolveAlert(id: string): Promise<void> {
  await axiosForBackend({
    url: `/api/monitoring/alerts/${id}/resolve`,
    method: 'PUT',
  });
}

export async function getHealthDetails(): Promise<HealthStatus> {
  const response = await axiosForBackend({
    url: '/api/health/details',
    method: 'GET',
  });
  return response.data;
}

export async function getLogs(
  params?: LogQueryParams,
): Promise<{ items: LogEntry[]; total: number; stats: LogStats }> {
  const response = await axiosForBackend({
    url: '/api/monitoring/logs',
    method: 'GET',
    params,
  });
  return response.data;
}