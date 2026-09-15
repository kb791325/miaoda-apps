import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Package,
  Users,
  TrendingUp,
  Headphones,
  Warehouse,
  FileSpreadsheet,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Settings2,
  Trash2,
  Link,
  CloudUpload,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  syncFromBitable,
  pushToBitable,
  listBitableConfigs,
  saveBitableConfig,
  deleteBitableConfig,
  parseBitableUrl,
  type ImportEntityType,
  type ImportResult,
  type BitableConfig,
} from '@/api/data-import';
import type { PushEntity, PushBitableResult } from '@shared/api.interface';

const BITABLE_ENTITIES: {
  entity: ImportEntityType | PushEntity;
  label: string;
  description: string;
  icon: React.ElementType;
  syncable: boolean;
  pushable: boolean;
}[] = [
  { entity: 'products', label: '商品分析', description: '同步商品销量、利润、转化率数据', icon: Package, syncable: true, pushable: false },
  { entity: 'inventory', label: '库存管理', description: '同步库存数据，并可推送到商品库存表', icon: Warehouse, syncable: true, pushable: true },
  { entity: 'customers', label: '客户分析', description: '同步客户消费行为与 RFM 分层', icon: Users, syncable: true, pushable: false },
  { entity: 'after-sale', label: '售后管理', description: '同步售后工单，并可推送到售后工单表', icon: Headphones, syncable: true, pushable: true },
  { entity: 'channels', label: '渠道数据', description: '同步各渠道投放效果数据', icon: TrendingUp, syncable: true, pushable: false },
  { entity: 'keywords', label: '流量关键词', description: '同步关键词与素材效果数据', icon: FileSpreadsheet, syncable: true, pushable: false },
  { entity: 'review', label: '数据复盘', description: '将售后统计按天汇总推送到数据复盘表', icon: TrendingUp, syncable: false, pushable: true },
];

type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

interface SyncState {
  status: SyncStatus;
  result: ImportResult | null;
  errorMsg: string;
}

interface PushState {
  status: 'idle' | 'syncing' | 'success' | 'error';
  result: PushBitableResult | null;
  errorMsg: string;
}

interface ConfigDialogState {
  open: boolean;
  entity: ImportEntityType | PushEntity | null;
  entityLabel: string;
  url: string;
  appToken: string;
  tableId: string;
  label: string;
  saving: boolean;
}

export default function BitableSyncSection() {
  const [configs, setConfigs] = useState<Record<string, BitableConfig>>({});
  const [syncStates, setSyncStates] = useState<Record<string, SyncState>>({});
  const [pushStates, setPushStates] = useState<Record<string, PushState>>({});
  const [dialog, setDialog] = useState<ConfigDialogState>({
    open: false,
    entity: null,
    entityLabel: '',
    url: '',
    appToken: '',
    tableId: '',
    label: '',
    saving: false,
  });

  const loadConfigs = useCallback(async () => {
    try {
      const list = await listBitableConfigs();
      const map: Record<string, BitableConfig> = {};
      for (const c of list) {
        map[c.entity] = c;
      }
      setConfigs(map);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    loadConfigs();
  }, [loadConfigs]);

  const getSyncState = (entity: string): SyncState =>
    syncStates[entity] || { status: 'idle', result: null, errorMsg: '' };

  const handlePush = async (entity: PushEntity, label: string) => {
    setPushStates((prev) => ({ ...prev, [entity]: { status: 'syncing', result: null, errorMsg: '' } }));
    try {
      const result: PushBitableResult = await pushToBitable(entity);
      setPushStates((prev) => ({ ...prev, [entity]: { status: 'success', result, errorMsg: '' } }));
      if (result.errors.length > 0) {
        result.errors.forEach((e) => toast.error(e));
      } else if (result.pushed === 0 && result.updated === 0) {
        toast.info(`${label}：多维表格已是最新，无需推送`);
      } else {
        toast.success(`${label}：已推送 ${result.pushed} 条${result.updated > 0 ? `，更新 ${result.updated} 条` : ''}到多维表格`);
      }
    } catch {
      setPushStates((prev) => ({ ...prev, [entity]: { status: 'error', result: null, errorMsg: '推送失败' } }));
      toast.error(`推送到多维表格失败，请稍后重试`);
    }
  };

  const openConfigDialog = (entity: ImportEntityType | PushEntity, entityLabel: string) => {
    const existing = configs[entity];
    setDialog({
      open: true,
      entity,
      entityLabel,
      url: '',
      appToken: existing?.appToken || '',
      tableId: existing?.tableId || '',
      label: existing?.label || entityLabel,
      saving: false,
    });
  };

  const handleUrlChange = (url: string) => {
    const parsed = parseBitableUrl(url);
    setDialog((prev) => ({
      ...prev,
      url,
      appToken: parsed?.appToken || prev.appToken,
      tableId: parsed?.tableId || prev.tableId,
    }));
  };

  const handleSaveConfig = async () => {
    if (!dialog.entity || !dialog.appToken || !dialog.tableId) {
      toast.error('请填写 AppToken 和 TableID');
      return;
    }
    setDialog((prev) => ({ ...prev, saving: true }));
    try {
      await saveBitableConfig({
        entity: dialog.entity as ImportEntityType,
        appToken: dialog.appToken,
        tableId: dialog.tableId,
        label: dialog.label,
      });
      toast.success('多维表格配置已保存');
      setDialog((prev) => ({ ...prev, open: false, saving: false }));
      loadConfigs();
    } catch {
      toast.error('保存配置失败');
      setDialog((prev) => ({ ...prev, saving: false }));
    }
  };

  const handleDeleteConfig = async (entity: string) => {
    const config = configs[entity];
    if (!config) return;
    try {
      await deleteBitableConfig(config.id);
      toast.success('配置已删除');
      setConfigs((prev) => {
        const next = { ...prev };
        delete next[entity];
        return next;
      });
    } catch {
      toast.error('删除失败');
    }
  };

  const handleSync = async (entity: ImportEntityType) => {
    if (!configs[entity]) {
      toast.error('请先配置对应的多维表格');
      return;
    }
    setSyncStates((prev) => ({
      ...prev,
      [entity]: { status: 'syncing', result: null, errorMsg: '' },
    }));
    try {
      const result = await syncFromBitable(entity);
      setSyncStates((prev) => ({
        ...prev,
        [entity]: { status: 'success', result, errorMsg: '' },
      }));
      if (result.imported > 0) {
        toast.success(`成功同步 ${result.imported} 条数据`);
      }
      if (result.errors.length > 0) {
        toast.warning(`${result.errors.length} 条数据同步失败`);
      }
      if (result.imported === 0 && result.errors.length === 0) {
        toast.info('多维表格中暂无数据');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '同步失败，请检查多维表格配置';
      setSyncStates((prev) => ({
        ...prev,
        [entity]: { status: 'error', result: null, errorMsg: msg },
      }));
      toast.error(msg);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <RefreshCw className="size-4 text-primary" />
            飞书多维表格同步
          </CardTitle>
          <CardDescription>
            选择飞书多维表格作为数据源，批量同步业务数据到应用数据库。粘贴多维表格链接即可自动解析配置。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {BITABLE_ENTITIES.map((item) => {
              const Icon = item.icon;
              const state = getSyncState(item.entity);
              const pushState = pushStates[item.entity];
              const config = configs[item.entity];
              const isConfigured = !!config;
              return (
                <div
                  key={item.entity}
                  className="flex items-start gap-3 p-4 rounded-lg border border-border hover:border-primary/40 hover:bg-accent/30 transition-colors"
                >
                  <div className="size-9 shrink-0 rounded-md bg-sky-50 flex items-center justify-center">
                    <Icon className="size-4 text-sky-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{item.label}</span>
                      {isConfigured && (
                        <CheckCircle2 className="size-3.5 text-green-600 shrink-0" />
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">{item.description}</div>
                    {isConfigured && (
                      <div className="text-xs text-muted-foreground/70 mt-1 font-mono truncate">
                        {config.appToken} / {config.tableId}
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2.5 text-xs"
                        onClick={() => openConfigDialog(item.entity, item.label)}
                      >
                        <Settings2 className="size-3 mr-1" />
                        {isConfigured ? '修改配置' : '选取表格'}
                      </Button>
                      {item.syncable && isConfigured && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2.5 text-xs"
                          disabled={state.status === 'syncing'}
                          onClick={() => handleSync(item.entity as ImportEntityType)}
                        >
                          <RefreshCw className={`size-3 mr-1 ${state.status === 'syncing' ? 'animate-spin' : ''}`} />
                          {state.status === 'syncing' ? '同步中...' : '同步'}
                        </Button>
                      )}
                      {item.pushable && isConfigured && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2.5 text-xs"
                          disabled={pushStates[item.entity]?.status === 'syncing'}
                          onClick={() => handlePush(item.entity as PushEntity, item.label)}
                        >
                          <CloudUpload className={`size-3 mr-1 ${pushStates[item.entity]?.status === 'syncing' ? 'animate-spin' : ''}`} />
                          {pushStates[item.entity]?.status === 'syncing' ? '推送中...' : '推送'}
                        </Button>
                      )}
                      {isConfigured && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-1.5 text-xs text-muted-foreground hover:text-red-600"
                          onClick={() => handleDeleteConfig(item.entity)}
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      )}
                    </div>
                    {state.status === 'success' && state.result && (
                      <Badge variant="outline" className="text-xs border-green-200 text-green-700 bg-green-50 mt-2">
                        <CheckCircle2 className="size-3 mr-1" />
                        同步 {state.result.imported} 条
                      </Badge>
                    )}
                    {state.status === 'error' && (
                      <Badge variant="outline" className="text-xs border-red-200 text-red-700 bg-red-50 mt-2">
                        <AlertCircle className="size-3 mr-1" />
                        {state.errorMsg || '同步失败'}
                      </Badge>
                    )}
                    {pushState?.status === 'success' && pushState.result && pushState.result.pushed === 0 && pushState.result.updated === 0 && pushState.result.errors.length === 0 && (
                      <Badge variant="outline" className="text-xs border-muted-foreground/20 text-muted-foreground mt-2">
                        多维表格已是最新，无需推送。
                      </Badge>
                    )}
                    {pushState?.status === 'success' && pushState.result && (pushState.result.pushed > 0 || pushState.result.updated > 0) && (
                      <Badge variant="outline" className="text-xs border-primary/20 text-primary bg-primary/10 mt-2">
                        <CheckCircle2 className="size-3 mr-1" />
                        已推送 {pushState.result.pushed} 条{pushState.result.updated > 0 ? `，更新 ${pushState.result.updated} 条` : ''}
                      </Badge>
                    )}
                    {pushState?.status === 'error' && (
                      <Badge variant="outline" className="text-xs border-red-200 text-red-700 bg-red-50 mt-2">
                        <AlertCircle className="size-3 mr-1" />
                        {pushState.errorMsg || '推送失败'}
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialog.open} onOpenChange={(open) => setDialog((prev) => ({ ...prev, open }))}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>选取多维表格 - {dialog.entityLabel}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="bitable-url" className="text-sm">多维表格链接</Label>
              <div className="flex gap-2">
                <Link className="size-4 text-muted-foreground mt-2 shrink-0" />
                <Input
                  id="bitable-url"
                  placeholder="粘贴飞书多维表格链接，如 https://xxx.feishu.cn/base/xxx?table=tblxxx"
                  value={dialog.url}
                  onChange={(e) => handleUrlChange(e.target.value)}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                打开多维表格，复制浏览器地址栏中的链接粘贴到上方，系统将自动解析 AppToken 和 TableID。
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="app-token" className="text-sm">AppToken</Label>
                <Input
                  id="app-token"
                  placeholder="多维表格 AppToken"
                  value={dialog.appToken}
                  onChange={(e) => setDialog((prev) => ({ ...prev, appToken: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="table-id" className="text-sm">TableID</Label>
                <Input
                  id="table-id"
                  placeholder="数据表 TableID"
                  value={dialog.tableId}
                  onChange={(e) => setDialog((prev) => ({ ...prev, tableId: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="config-label" className="text-sm">备注名称</Label>
              <Input
                id="config-label"
                placeholder="便于识别的名称"
                value={dialog.label}
                onChange={(e) => setDialog((prev) => ({ ...prev, label: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog((prev) => ({ ...prev, open: false }))}>
              取消
            </Button>
            <Button onClick={handleSaveConfig} disabled={dialog.saving || !dialog.appToken || !dialog.tableId}>
              {dialog.saving ? '保存中...' : '保存配置'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
