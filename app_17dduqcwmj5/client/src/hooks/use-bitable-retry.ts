import { useCallback, useState } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';
import { bitableRetry } from '@client/src/api';
import type {
  BitableRecordType,
  BitableSyncResult,
} from '@shared/bitable-sync';

interface UseBitableRetryResult {
  syncingIds: string[];
  retry: (recordId: string) => Promise<void>;
}

export const useBitableRetry = (
  recordType: BitableRecordType,
  onSuccess: () => void,
): UseBitableRetryResult => {
  const [syncingIds, setSyncingIds] = useState<string[]>([]);

  const retry = useCallback(
    async (recordId: string): Promise<void> => {
      setSyncingIds((prev: string[]) => [...prev, recordId]);
      try {
        const result: BitableSyncResult = await bitableRetry.retryBitableSync(
          recordType,
          recordId,
        );
        if (result.syncStatus === 'synced') {
          toast.success('同步成功');
          onSuccess();
        } else {
          toast.error(result.message || '同步失败');
        }
      } catch (error) {
        logger.error('多维表格同步重试失败', error);
        const message: string =
          error instanceof Error ? error.message : '';
        toast.error(message || '同步失败');
      } finally {
        setSyncingIds((prev: string[]) =>
          prev.filter((id: string) => id !== recordId),
        );
      }
    },
    [recordType, onSuccess],
  );

  return { syncingIds, retry };
};
