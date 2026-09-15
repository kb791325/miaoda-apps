import { logger } from '@lark-apaas/client-toolkit/logger';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  BitableReconcileRequest,
  BitableRecordType,
  BitableRetryRequest,
  BitableSyncResult,
} from '@shared/bitable-sync';

export const retryBitableSync = async (
  recordType: BitableRecordType,
  recordId: string,
): Promise<BitableSyncResult> => {
  try {
    const payload: BitableRetryRequest = { recordType, recordId };
    const response = await axiosForBackend.post<BitableSyncResult>(
      '/api/bitable-retry/retry',
      payload,
    );
    return response.data;
  } catch (error) {
    logger.error('多维表格同步重试请求失败', error);
    throw error;
  }
};

export const reconcileBitable = async (
  recordTypes: BitableRecordType[],
): Promise<void> => {
  try {
    const payload: BitableReconcileRequest = { recordTypes };
    await axiosForBackend.post('/api/bitable-retry/reconcile', payload);
  } catch (error) {
    logger.error('多维表格对账清理请求失败', error);
  }
};
