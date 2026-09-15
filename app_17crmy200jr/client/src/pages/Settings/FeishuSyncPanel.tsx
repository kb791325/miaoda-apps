import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { Button } from '@client/src/components/ui/button';
import * as feishuSyncApi from '@client/src/api/feishu-sync';
import type {
  FeishuSyncConfigItem,
  FeishuSyncLogItem,
  SyncDomain,
} from '@shared/api.interface';

const DOMAIN_LABELS: Record<string, string> = {
  expenses: '支出同步',
  fixed_assets: '资产同步',
  inventory_checks: '盘点同步',
  categories: '类目同步',
  data: '数据同步',
};

const DIRECTION_LABELS: Record<string, string> = {
  bidirectional: '双向',
  push: '推',
  pull: '拉',
};

interface FeishuSyncPanelProps {
  onFieldMapping: (config: FeishuSyncConfigItem) => void;
  onViewLogs: (domain: string, logs: FeishuSyncLogItem[]) => void;
}

const StatusDot = ({ status }: { status?: string }) => {
  const colorClass =
    status === 'success'
      ? 'bg-success'
      : status === 'failed'
      ? 'bg-destructive'
      : status === 'syncing'
      ? 'bg-warning'
      : 'bg-muted-foreground/40';
  const label =
    status === 'success'
      ? '成功'
      : status === 'failed'
      ? '失败'
      : status === 'syncing'
      ? '同步中'
      : '未同步';
  return (
    <span className="inline-flex items-center gap-1.5 text-xs">
      <span className={`inline-block h-2 w-2 rounded-full ${colorClass}`} />
      <span className="text-muted-foreground">{label}</span>
    </span>
  );
};

const FeishuSyncPanel = ({ onFieldMapping, onViewLogs }: FeishuSyncPanelProps) => {
  const [configs, setConfigs] = useState<FeishuSyncConfigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingDomain, setSyncingDomain] = useState<string | null>(null);

  const fetchConfigs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await feishuSyncApi.getSyncConfigs();
      setConfigs(data.items ?? data ?? []);
    } catch (err: unknown) {
      logger.error('加载同步配置失败', err);
      toast.error('加载同步配置失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  const handleSync = useCallback(
    async (domain: string) => {
      setSyncingDomain(domain);
      try {
        await feishuSyncApi.triggerSync(domain, { direction: 'push' });
        await fetchConfigs();
      } catch (err: unknown) {
        logger.error('手动同步失败', err);
        toast.error('手动同步失败');
      } finally {
        setSyncingDomain(null);
      }
    },
    [fetchConfigs],
  );

  const handleViewLogs = useCallback(
    async (domain: string) => {
      try {
        const data = await feishuSyncApi.getSyncLogs({
          domain,
          page: 1,
          pageSize: 10,
        });
        const logs: FeishuSyncLogItem[] = data.items ?? data ?? [];
        onViewLogs(domain, logs);
      } catch (err: unknown) {
        logger.error('加载同步日志失败', err);
        toast.error('加载同步日志失败');
        onViewLogs(domain, []);
      }
    },
    [onViewLogs],
  );

  if (loading) {
    return (
      <div className="flex h-[300px] items-center justify-center rounded-sm border border-border bg-card text-sm text-muted-foreground">
        加载中...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-sm border border-border bg-card p-3">
        <h2 className="text-sm font-medium text-foreground">飞书同步配置</h2>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {configs.map((config) => (
          <div
            key={config.domain}
            className="rounded-sm border border-border bg-card p-4"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  {DOMAIN_LABELS[config.domain] ?? config.domain}
                </h3>
                <div className="mt-1">
                  <StatusDot status={config.lastSyncStatus} />
                </div>
              </div>
              <span
                className="rounded-sm border border-border px-2 py-0.5 text-xs text-primary"
              >
                {DIRECTION_LABELS[config.lastSyncDirection ?? ''] ??
                  DIRECTION_LABELS.bidirectional}
              </span>
            </div>

            <div className="mt-3 text-xs text-muted-foreground">
              上次同步: {config.lastSyncTime ?? '—'}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              本地表: {config.localTableName}
            </div>

            <div className="mt-4 flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 rounded-sm"
                onClick={() => onFieldMapping(config)}
              >
                字段映射
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 rounded-sm"
                onClick={() => handleViewLogs(config.domain)}
              >
                同步日志
              </Button>
              <Button
                variant="default"
                size="sm"
                className="flex-1 rounded-sm"
                onClick={() => handleSync(config.domain)}
                disabled={syncingDomain === config.domain}
              >
                {syncingDomain === config.domain ? '同步中...' : '手动同步'}
              </Button>
            </div>
          </div>
        ))}
        {configs.length === 0 && (
          <div className="col-span-2 rounded-sm border bg-card p-8 text-center text-sm text-muted-foreground">
            暂无同步配置
          </div>
        )}
      </div>
    </div>
  );
};

export default FeishuSyncPanel;
