import { useCallback } from 'react';
import { useModuleData, type UseModuleDataResult } from '@/lib/data-service';
import { fetchRecordsFromBitable } from '@/lib/mt-client';
import type { IBizRecord, ModuleKey } from '@/data/mt-records';
import { isModuleBitableReady } from '@/lib/mt-client';

export interface UseBitableDataResult extends UseModuleDataResult {
  getRecord: (recordId: string) => Promise<IBizRecord | null>;
}

export function useBitableData(moduleKey: ModuleKey): UseBitableDataResult {
  const moduleData = useModuleData(moduleKey);

  const getRecord = useCallback(
    async (recordId: string): Promise<IBizRecord | null> => {
      const found = moduleData.records.find((r) => r.recordId === recordId);
      if (found) return found;

      if (isModuleBitableReady(moduleKey)) {
        try {
          const records = await fetchRecordsFromBitable(moduleKey);
          const remote = records.find((r) => r.recordId === recordId);
          return remote ?? null;
        } catch {
          return null;
        }
      }

      return null;
    },
    [moduleKey, moduleData.records],
  );

  return { ...moduleData, getRecord };
}