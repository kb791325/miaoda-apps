import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  BackupExportResponse,
  BackupRecord,
  RestoreRequest,
  RestoreResponse,
} from '@shared/api.interface';

export async function exportBackup(): Promise<BackupExportResponse> {
  const res = await axiosForBackend.get<BackupExportResponse>(
    '/api/backup/export',
  );
  return res.data;
}

export async function restoreBackup(
  dto: RestoreRequest,
): Promise<RestoreResponse> {
  const res = await axiosForBackend.post<RestoreResponse>(
    '/api/backup/restore',
    dto,
  );
  return res.data;
}

export async function getBackupRecords(): Promise<{ items: BackupRecord[] }> {
  const res = await axiosForBackend.get<{ items: BackupRecord[] }>(
    '/api/backup/records',
  );
  return res.data;
}
