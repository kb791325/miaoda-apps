import { useState, useEffect, useCallback } from 'react';
import { sync as syncApi } from '@client/src/api';
import { Button } from '@client/src/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@client/src/components/ui/tabs';
import { FileText, Loader2, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type { SyncConfig, SyncDomain, SyncStats } from '@shared/api.interface';
import { SyncDomainCard } from './SyncDomainCard';
import { SyncLogsDialog } from './SyncLogsDialog';
import { DomainStatusCard } from './DomainStatusCard';

const DOMAINS: { key: SyncDomain; label: string }[] = [
  { key: 'products', label: '商品' },
  { key: 'transactions', label: '出入库' },
  { key: 'transfers', label: '调拨' },
  { key: 'inventory_checks', label: '盘点' },
  { key: 'warehouse_inventory', label: '库存' },
];

export default function SyncSettingsPage() {
  const [configs, setConfigs] = useState<SyncConfig[]>([]);
  const [stats, setStats] = useState<SyncStats>({});
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('products');

  const fetchConfigs = useCallback(async () => {
    setIsLoading(true);
    try {
      const [configsData, statsData] = await Promise.all([
        syncApi.getConfigs(),
        syncApi.getSyncStats().catch((err: unknown) => {
          logger.error('获取同步统计失败:', String(err));
          return {} as SyncStats;
        }),
      ]);
      setConfigs(configsData);
      setStats(statsData);
    } catch (err: unknown) {
      logger.error('获取同步配置失败:', String(err));
      toast.error('获取同步配置失败');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  const getConfigForDomain = (domain: string): SyncConfig | null => {
    return configs.find((c: SyncConfig) => c.domain === domain) ?? null;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-5 w-1 rounded-sm bg-primary" />
          <div>
            <h1 className="text-lg font-semibold tracking-tight">
              飞书同步设置
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              配置多维表格后，数据可双向同步
            </p>
          </div>
        </div>
        <SyncLogsDialog>
          <Button variant="outline" size="sm">
            <FileText className="size-4 mr-1.5" />
            同步日志
          </Button>
        </SyncLogsDialog>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
          <Loader2 className="size-4 animate-spin mr-2" />
          加载中...
        </div>
      ) : (
        <>
          {/* 状态总览 */}
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <BarChart3 className="size-3" />
              同步总览
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {DOMAINS.map((d) => (
                <DomainStatusCard
                  key={d.key}
                  domain={d.key}
                  label={d.label}
                  config={getConfigForDomain(d.key)}
                  stats={stats[d.key]}
                  onClick={() => setActiveTab(d.key)}
                />
              ))}
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5 bg-transparent border border-border rounded-sm p-0 h-10">
              {DOMAINS.map((d) => (
                <TabsTrigger
                  key={d.key}
                  value={d.key}
                  className="rounded-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none"
                >
                  {d.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {DOMAINS.map((d) => (
              <TabsContent key={d.key} value={d.key} className="mt-4">
                <SyncDomainCard
                  domain={d.key}
                  config={getConfigForDomain(d.key)}
                  onRefresh={fetchConfigs}
                />
              </TabsContent>
            ))}
          </Tabs>
        </>
      )}
    </div>
  );
}
