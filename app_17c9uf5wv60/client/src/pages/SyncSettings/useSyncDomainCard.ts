import { useState, useEffect, useRef } from 'react';
import { sync as syncApi } from '@client/src/api';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type {
  SyncConfig,
  SyncDomain,
  SyncTaskStatus,
  FeishuFieldInfo,
  SmartMatchResult,
} from '@shared/api.interface';

export const LOCAL_FIELDS: Record<string, string[]> = {
  products: ['code', 'name', 'category', 'brand', 'spec', 'unit', 'safetyStock', 'unitPrice', 'status'],
  transactions: ['productCode', 'productName', 'warehouse', 'type', 'quantity', 'unitPrice', 'orderNo', 'transactionDate'],
  transfers: ['transferNo', 'productCode', 'productName', 'sourceWarehouse', 'targetWarehouse', 'quantity', 'transferDate'],
  inventory_checks: ['checkNo', 'warehouse', 'status', 'checkDate', 'itemCount'],
  warehouse_inventory: ['warehouse', 'productCode', 'productName', 'quantity', 'stockValue'],
};

export function useSyncDomainCard(domain: SyncDomain, config: SyncConfig | null, onRefresh: () => void) {
  const [feishuAppToken, setFeishuAppToken] = useState(config?.feishuAppToken ?? '');
  const [tableName, setTableName] = useState(config?.tableName ?? '');
  const [tableId, setTableId] = useState(config?.tableId ?? '');
  const [feishuAppId, setFeishuAppId] = useState(config?.extra?.feishuAppId ?? '');
  const [feishuAppSecret, setFeishuAppSecret] = useState(config?.extra?.feishuAppSecret ?? '');
  const [showAppSecret, setShowAppSecret] = useState(false);
  const [enabled, setEnabled] = useState(config?.enabled ?? false);
  const [autoRealtime, setAutoRealtime] = useState(config?.autoRealtime ?? false);
  const [bidirectional, setBidirectional] = useState(config?.bidirectional ?? false);
  const [pollIntervalMin, setPollIntervalMin] = useState<number>(
    config?.pollIntervalMin ?? 5,
  );
  const [fieldMap, setFieldMap] = useState<Record<string, string>>(
    config?.extra?.fieldMap ?? {},
  );
  const [feishuFields, setFeishuFields] = useState<FeishuFieldInfo[]>([]);

  const [saving, setSaving] = useState(false);
  const [testingConn, setTestingConn] = useState(false);
  const [loadingFields, setLoadingFields] = useState(false);
  const [matching, setMatching] = useState(false);
  const [pushTask, setPushTask] = useState<SyncTaskStatus | null>(null);
  const [pullTask, setPullTask] = useState<SyncTaskStatus | null>(null);
  const pushTimerRef = useRef<number | null>(null);
  const pullTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setFeishuAppToken(config?.feishuAppToken ?? '');
    setTableName(config?.tableName ?? '');
    setTableId(config?.tableId ?? '');
    setFeishuAppId(config?.extra?.feishuAppId ?? '');
    setFeishuAppSecret(config?.extra?.feishuAppSecret ?? '');
    setEnabled(config?.enabled ?? false);
    setAutoRealtime(config?.autoRealtime ?? false);
    setBidirectional(config?.bidirectional ?? false);
    setPollIntervalMin(config?.pollIntervalMin ?? 5);
    setFieldMap(config?.extra?.fieldMap ?? {});
  }, [config]);

  useEffect(() => {
    return () => {
      if (pushTimerRef.current) window.clearInterval(pushTimerRef.current);
      if (pullTimerRef.current) window.clearInterval(pullTimerRef.current);
    };
  }, []);

  const startPolling = (taskId: string, direction: 'push' | 'pull'): void => {
    const setTask = direction === 'push' ? setPushTask : setPullTask;
    const timerRef = direction === 'push' ? pushTimerRef : pullTimerRef;
    if (timerRef.current) window.clearInterval(timerRef.current);

    const poll = async (): Promise<void> => {
      try {
        const t = await syncApi.getTaskStatus(taskId);
        setTask(t);
        if (t.status === 'success' || t.status === 'error' || t.status === 'failed') {
          if (timerRef.current) {
            window.clearInterval(timerRef.current);
            timerRef.current = null;
          }
          if (t.status === 'success') {
            toast.success(
              `${direction === 'push' ? '推送' : '拉取'}完成：成功 ${t.insertCount + t.updateCount} 条，跳过 ${t.skipCount} 条`,
            );
            onRefresh();
          } else {
            toast.error(t.errorMessage || '同步失败');
          }
        }
      } catch (err: unknown) {
        logger.error('查询任务状态失败:', String(err));
      }
    };

    poll();
    timerRef.current = window.setInterval(poll, 2000);
  };

  const handleSave = async (): Promise<void> => {
    if (!feishuAppToken.trim()) {
      toast.error('请填写飞书多维表格 appToken');
      return;
    }
    if (!tableName.trim()) {
      toast.error('请填写表名');
      return;
    }
    setSaving(true);
    try {
      await syncApi.saveConfig(domain, {
        feishuAppToken: feishuAppToken.trim(),
        tableId: tableId.trim(),
        tableName: tableName.trim(),
        enabled,
        autoRealtime,
        bidirectional,
        pollIntervalMin,
        extra: {
          fieldMap,
          feishuAppId: feishuAppId.trim() || undefined,
          feishuAppSecret: feishuAppSecret.trim() || undefined,
        },
      });
      toast.success('配置已保存');
      onRefresh();
    } catch (err: unknown) {
      logger.error('保存同步配置失败:', String(err));
      toast.error('保存配置失败');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async (): Promise<void> => {
    if (!feishuAppToken.trim()) {
      toast.error('请先填写 appToken');
      return;
    }
    setTestingConn(true);
    try {
      const fields = await syncApi.listFeishuFields(domain);
      setFeishuFields(fields);
      toast.success(`连接成功，共 ${fields.length} 个字段`);
    } catch (err: unknown) {
      logger.error('连接测试失败:', String(err));
      const msg = err instanceof Error ? err.message : '连接失败';
      toast.error(`连接失败：${msg}`);
    } finally {
      setTestingConn(false);
    }
  };

  const handleLoadFields = async (): Promise<void> => {
    setLoadingFields(true);
    try {
      const fields = await syncApi.listFeishuFields(domain);
      setFeishuFields(fields);
    } catch (err: unknown) {
      logger.error('读取飞书字段失败:', String(err));
      toast.error('读取飞书字段失败');
    } finally {
      setLoadingFields(false);
    }
  };

  const handleSmartMatch = async (): Promise<SmartMatchResult[]> => {
    setMatching(true);
    try {
      return await syncApi.smartMatchFields(domain, feishuFields);
    } catch (err: unknown) {
      logger.error('智能匹配失败:', String(err));
      toast.error('智能匹配失败');
      return [];
    } finally {
      setMatching(false);
    }
  };

  const handlePush = async (): Promise<void> => {
    try {
      const { taskId } = await syncApi.asyncPush(domain);
      setPushTask({ taskId, status: 'pending', progress: 0, insertCount: 0, updateCount: 0, skipCount: 0 });
      startPolling(taskId, 'push');
    } catch (err: unknown) {
      logger.error('推送失败:', String(err));
      toast.error('数据推送失败');
    }
  };

  const handlePull = async (): Promise<void> => {
    try {
      const { taskId } = await syncApi.asyncPull(domain);
      setPullTask({ taskId, status: 'pending', progress: 0, insertCount: 0, updateCount: 0, skipCount: 0 });
      startPolling(taskId, 'pull');
    } catch (err: unknown) {
      logger.error('拉取失败:', String(err));
      toast.error('数据拉取失败');
    }
  };

  const pollIntervalValue = Math.max(1, Math.min(60, pollIntervalMin || 5));
  const localFields = LOCAL_FIELDS[domain] ?? [];
  const isPushRunning = pushTask !== null && (pushTask.status === 'running' || pushTask.status === 'pending');
  const isPullRunning = pullTask !== null && (pullTask.status === 'running' || pullTask.status === 'pending');

  return {
    // values
    feishuAppToken, tableId, tableName, enabled, autoRealtime, bidirectional,
    feishuAppId, feishuAppSecret, showAppSecret,
    pollIntervalMin: pollIntervalValue, fieldMap, feishuFields,
    saving, testingConn, loadingFields, matching, pushTask, pullTask,
    localFields, isPushRunning, isPullRunning,
    // setters
    setFeishuAppToken, setTableId, setTableName, setEnabled, setAutoRealtime,
    setBidirectional, setFeishuAppId, setFeishuAppSecret, setShowAppSecret,
    setPollIntervalMin, setFieldMap,
    // actions
    handleSave, handleTestConnection, handleLoadFields,
    handleSmartMatch, handlePush, handlePull,
  };
}
