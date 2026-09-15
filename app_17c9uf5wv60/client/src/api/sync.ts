import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  SyncConfig,
  SaveSyncConfigRequest,
  SyncLogListResponse,
  SyncDomain,
  SyncTaskStatus,
  FeishuFieldInfo,
  SmartMatchResult,
  SyncStats,
} from '@shared/api.interface';

export async function getConfigs(): Promise<SyncConfig[]> {
  const res = await axiosForBackend.get<SyncConfig[]>('/api/sync/configs');
  return res.data;
}

export async function saveConfig(
  domain: SyncDomain,
  data: SaveSyncConfigRequest,
): Promise<SyncConfig> {
  const res = await axiosForBackend.post<SyncConfig>(
    `/api/sync/configs/${domain}`,
    data,
  );
  return res.data;
}

export async function initializeSync(domain: SyncDomain): Promise<void> {
  await axiosForBackend.post(`/api/sync/${domain}/initialize`);
}

export async function pushSync(domain: SyncDomain): Promise<void> {
  await axiosForBackend.post(`/api/sync/${domain}/push`);
}

export async function pullSync(domain: SyncDomain): Promise<void> {
  await axiosForBackend.post(`/api/sync/${domain}/pull`);
}

export async function asyncPush(domain: SyncDomain): Promise<{ taskId: string }> {
  const res = await axiosForBackend.post<{ taskId: string }>(
    `/api/sync/${domain}/async-push`,
  );
  return res.data;
}

export async function asyncPull(domain: SyncDomain): Promise<{ taskId: string }> {
  const res = await axiosForBackend.post<{ taskId: string }>(
    `/api/sync/${domain}/async-pull`,
  );
  return res.data;
}

export async function getTaskStatus(taskId: string): Promise<SyncTaskStatus> {
  const res = await axiosForBackend.get<SyncTaskStatus>(
    `/api/sync/tasks/${taskId}`,
  );
  return res.data;
}

export async function listFeishuFields(
  domain: SyncDomain,
): Promise<FeishuFieldInfo[]> {
  const res = await axiosForBackend.get<FeishuFieldInfo[]>(
    `/api/sync/${domain}/fields`,
  );
  return res.data;
}

export async function smartMatchFields(
  domain: SyncDomain,
  fields: FeishuFieldInfo[],
): Promise<SmartMatchResult[]> {
  const res = await axiosForBackend.post<SmartMatchResult[]>(
    `/api/sync/${domain}/smart-match`,
    { fields },
  );
  return res.data;
}

export async function cleanupRecordMap(
  domain: SyncDomain,
): Promise<{ cleaned: number; remaining: number }> {
  const res = await axiosForBackend.post<{ cleaned: number; remaining: number }>(
    `/api/sync/${domain}/cleanup-recordmap`,
  );
  return res.data;
}

export async function getSyncStats(): Promise<SyncStats> {
  const res = await axiosForBackend.get<SyncStats>('/api/sync/stats');
  return res.data;
}

export async function getSyncLogs(
  page: number,
  pageSize: number,
  domain?: string,
  status?: string,
): Promise<SyncLogListResponse> {
  const res = await axiosForBackend.get<SyncLogListResponse>('/api/sync/logs', {
    params: { page, pageSize, domain, status },
  });
  return res.data;
}
