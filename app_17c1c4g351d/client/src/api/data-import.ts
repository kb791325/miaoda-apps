import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type { PushEntity, PushBitableResult } from '@shared/api.interface';

export type ImportEntityType =
  | 'products'
  | 'inventory'
  | 'customers'
  | 'after-sale'
  | 'channels'
  | 'keywords';

export interface ImportResult {
  imported: number;
  errors: string[];
}

export interface BitableConfig {
  id: string;
  entity: string;
  appToken: string;
  tableId: string;
  label: string;
}

export async function importData(
  entity: ImportEntityType,
  data: Array<Record<string, unknown>>,
): Promise<ImportResult> {
  const res = await axiosForBackend.post<ImportResult>('/api/data-import', {
    entity,
    data,
  });
  return res.data;
}

export async function syncFromBitable(
  entity: ImportEntityType,
): Promise<ImportResult> {
  const res = await axiosForBackend.post<ImportResult>(
    '/api/data-import/sync-bitable',
    { entity },
  );
  return res.data;
}

export async function importExternal(
  entity: ImportEntityType,
  data: Array<Record<string, unknown>>,
): Promise<ImportResult> {
  const res = await axiosForBackend.post<ImportResult>(
    '/api/data-import/external',
    { entity, data },
  );
  return res.data;
}

export async function listBitableConfigs(): Promise<BitableConfig[]> {
  const res = await axiosForBackend.get<BitableConfig[]>(
    '/api/data-import/bitable-config',
  );
  return res.data;
}

export async function saveBitableConfig(
  config: { entity: ImportEntityType; appToken: string; tableId: string; label: string },
): Promise<BitableConfig> {
  const res = await axiosForBackend.post<BitableConfig>(
    '/api/data-import/bitable-config',
    config,
  );
  return res.data;
}

export async function deleteBitableConfig(id: string): Promise<void> {
  await axiosForBackend.delete(`/api/data-import/bitable-config/${id}`);
}

export async function pushToBitable(entity: PushEntity): Promise<PushBitableResult> {
  const res = await axiosForBackend.post<PushBitableResult>(
    '/api/data-import/push-bitable',
    { entity },
  );
  return res.data;
}

export function parseBitableUrl(url: string): { appToken: string; tableId: string } | null {
  try {
    const match = url.match(/\/base\/([A-Za-z0-9]+)(?:\?table=([A-Za-z0-9]+))?/);
    if (!match) return null;
    return {
      appToken: match[1],
      tableId: match[2] || '',
    };
  } catch {
    return null;
  }
}
