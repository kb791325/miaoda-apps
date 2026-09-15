import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';

export async function getSyncConfigs() {
  const response = await axiosForBackend({
    url: '/api/feishu-sync/configs',
    method: 'GET',
  });
  return response.data;
}

export async function updateSyncConfig(domain: string, data: Record<string, unknown>) {
  const response = await axiosForBackend({
    url: `/api/feishu-sync/configs/${domain}`,
    method: 'PUT',
    data,
  });
  return response.data;
}

export async function getSyncLogs(params: Record<string, unknown>) {
  const response = await axiosForBackend({
    url: '/api/feishu-sync/logs',
    method: 'GET',
    params,
  });
  return response.data;
}

export async function triggerSync(domain: string, data: Record<string, unknown>) {
  const response = await axiosForBackend({
    url: `/api/feishu-sync/${domain}/sync`,
    method: 'POST',
    data,
  });
  return response.data;
}
