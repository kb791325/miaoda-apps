// EXPORTS: loadModuleRecords, createModuleRecord, updateModuleRecord, useModuleData
// 模块数据服务: 多维表格 feishu-bitable 插件为唯一数据源, 无 demo/mock 兜底
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit';
import type { IBizRecord, ModuleKey } from '@/data/mt-records';
import { deleteRecordsFromBitable, fetchRecordsFromBitable, isModuleBitableReady, saveRecordToBitable, updateRecordInBitable } from '@/lib/mt-client';
import { recordAuditLog } from '@/lib/audit-log';

const cache = new Map<ModuleKey, IBizRecord[]>();

export async function loadModuleRecords(moduleKey: ModuleKey, force = false): Promise<IBizRecord[]> {
  const cached = cache.get(moduleKey);
  if (cached && !force) return cached;

  if (isModuleBitableReady(moduleKey)) {
    const records = await fetchRecordsFromBitable(moduleKey);
    if (records.length > 0 || cached) {
      cache.set(moduleKey, records);
    }
    return records;
  }

  return [];
}

/** 强制从多维表格重新拉取全部已加载模块(写操作 / 跨端同步后调用) */
export async function refreshModules(keys?: ModuleKey[]): Promise<void> {
  const targets = keys ?? Array.from(cache.keys());
  await Promise.allSettled(targets.map((k) => loadModuleRecords(k, true)));
}

/** 跨表Tab专用：加载子模块记录 */
export async function loadModuleRecordsForCrossTable(moduleKey: ModuleKey): Promise<IBizRecord[]> {
  const cached = cache.get(moduleKey);
  if (cached) return cached;

  if (isModuleBitableReady(moduleKey)) {
    const delays = [500, 1000, 2000];
    let lastErr: unknown = null;
    for (let attempt = 0; attempt <= delays.length; attempt += 1) {
      try {
        const records = await fetchRecordsFromBitable(moduleKey);
        if (records.length > 0 || cached) {
          cache.set(moduleKey, records);
        }
        return records;
      } catch (err) {
        lastErr = err;
        if (attempt < delays.length) {
          await new Promise((r) => setTimeout(r, delays[attempt]));
        }
      }
    }
    throw lastErr;
  }

  return [];
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function createModuleRecord(
  moduleKey: ModuleKey,
  values: Record<string, string | number>,
): Promise<IBizRecord> {
  const list = await loadModuleRecords(moduleKey);
  let recordId = `local-${Date.now()}`;

  if (isModuleBitableReady(moduleKey)) {
    try {
      recordId = await saveRecordToBitable(moduleKey, values);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      logger.error('mt-bitable 新建记录失败', detail);
      toast.error('提交失败', { description: detail, duration: 10000 });
      throw error;
    }
  }

  const record: IBizRecord = { recordId, createdAt: today(), values: { ...values } };
  cache.set(moduleKey, [record, ...list]);
  // 审计日志异步写入, 不阻塞主流程但记录结果
  recordAuditLog({ action: '新增', module: moduleKey, description: `新建${moduleKey}记录`, targetId: recordId }).catch((e) => logger.error('审计日志新增写入失败', String(e)));
  return record;
}

export async function updateModuleRecord(
  moduleKey: ModuleKey,
  recordId: string,
  patch: Record<string, string | number>,
): Promise<IBizRecord> {
  const list = await loadModuleRecords(moduleKey);
  const target = list.find((r) => r.recordId === recordId);
  if (!target) {
    throw new Error(`record not found: ${recordId}`);
  }

  if (isModuleBitableReady(moduleKey)) {
    try {
      await updateRecordInBitable(moduleKey, recordId, patch);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      logger.error('mt-bitable 更新记录失败', detail);
      toast.error('提交失败', { description: detail, duration: 10000 });
      throw error;
    }
  }

  const updated: IBizRecord = {
    ...target,
    updatedAt: today(),
    values: { ...target.values, ...patch },
  };
  cache.set(
    moduleKey,
    list.map((r) => (r.recordId === recordId ? updated : r)),
  );
  const changes = Object.entries(patch).map(([k, v]) => `${k}: ${target.values[k] ?? '—'} → ${v}`).join('; ');
  recordAuditLog({ action: '修改', module: moduleKey, description: `更新${moduleKey}记录: ${changes}`, targetId: recordId, detail: JSON.stringify({ before: target.values, after: patch }) }).catch((e) => logger.error('审计日志修改写入失败', String(e)));
  return updated;
}

/** 删除一条或多条记录 (真实删除多维表格行 + 同步内存缓存) */
export async function deleteModuleRecords(moduleKey: ModuleKey, recordIds: string[]): Promise<void> {
  if (recordIds.length === 0) return;
  const idSet = new Set(recordIds);
  const list = await loadModuleRecords(moduleKey);

  if (isModuleBitableReady(moduleKey)) {
    // 仅真实存在于多维表格的记录(非本地占位 local-/bt-)才发起远端删除
    const remoteIds = recordIds.filter((id) => id && !id.startsWith('local-') && !id.startsWith('bt-'));
    if (remoteIds.length > 0) {
      try {
        await deleteRecordsFromBitable(moduleKey, remoteIds);
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        logger.error('mt-bitable 删除记录失败', detail);
        toast.error('删除失败', { description: detail, duration: 10000 });
        throw error;
      }
    }
  }

  cache.set(moduleKey, list.filter((r) => !idSet.has(r.recordId)));
  recordAuditLog({
    action: '删除',
    module: moduleKey,
    description: `删除${moduleKey}记录 ${recordIds.length} 条`,
    targetId: recordIds.join(','),
  }).catch((e) => logger.error('审计日志删除写入失败', String(e)));
}

export interface UseModuleDataResult {
  records: IBizRecord[];
  loading: boolean;
  error: boolean;
  reload: () => Promise<void>;
  create: (values: Record<string, string | number>) => Promise<IBizRecord>;
  update: (recordId: string, patch: Record<string, string | number>) => Promise<IBizRecord>;
  remove: (recordId: string) => Promise<void>;
  removeMany: (recordIds: string[]) => Promise<void>;
}

export function useModuleData(moduleKey: ModuleKey): UseModuleDataResult {
  const [records, setRecords] = useState<IBizRecord[]>(() => cache.get(moduleKey) ?? []);
  const [loading, setLoading] = useState(() => !cache.has(moduleKey));
  const [error, setError] = useState(false);
  const retryRef = useRef(false);

  const reload = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(false);
    const delays = [500, 1000, 2000];
    let lastErr: unknown = null;
    for (let attempt = 0; attempt <= delays.length; attempt += 1) {
      try {
        const list = await loadModuleRecords(moduleKey, true);
        if (list.length === 0 && isModuleBitableReady(moduleKey) && !retryRef.current) {
          retryRef.current = true;
          const retryList = await loadModuleRecords(moduleKey, true);
          setRecords(retryList);
          if (!silent) setLoading(false);
          return;
        }
        retryRef.current = false;
        setRecords(list);
        if (!silent) setLoading(false);
        return;
      } catch (err) {
        lastErr = err;
        if (attempt < delays.length) {
          await new Promise((r) => setTimeout(r, delays[attempt]));
        }
      }
    }
    logger.warn('模块数据加载失败(已重试3次)', String(lastErr));
    setError(true);
    if (!silent) setLoading(false);
  }, [moduleKey]);

  useEffect(() => {
    void reload();
  }, [reload]);

  // 页面重新可见 / 窗口重新聚焦时静默同步多维表格最新数据(多人协作实时一致)
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') void reload(true);
    };
    const onFocus = () => void reload(true);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onFocus);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onFocus);
    };
  }, [reload]);

  const create = useCallback(
    async (values: Record<string, string | number>) => {
      const record = await createModuleRecord(moduleKey, values);
      setRecords((prev) => [record, ...prev]);
      return record;
    },
    [moduleKey],
  );

  const update = useCallback(
    async (recordId: string, patch: Record<string, string | number>) => {
      const updated = await updateModuleRecord(moduleKey, recordId, patch);
      setRecords((prev) => prev.map((r) => (r.recordId === recordId ? updated : r)));
      return updated;
    },
    [moduleKey],
  );

  const removeMany = useCallback(
    async (recordIds: string[]) => {
      await deleteModuleRecords(moduleKey, recordIds);
      const idSet = new Set(recordIds);
      setRecords((prev) => prev.filter((r) => !idSet.has(r.recordId)));
    },
    [moduleKey],
  );

  const remove = useCallback(
    async (recordId: string) => {
      await removeMany([recordId]);
    },
    [removeMany],
  );

  return { records, loading, error, reload, create, update, remove, removeMany };
}