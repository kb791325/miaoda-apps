import {
  Upload,
  Download,
  Zap,
  CheckCircle,
  AlertCircle,
  Loader2,
  Settings2,
  Link2,
  Eye,
  EyeOff,
  Info,
} from 'lucide-react';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import { Switch } from '@client/src/components/ui/switch';
import { Badge } from '@client/src/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@client/src/components/ui/card';
import type { SyncConfig, SyncDomain, SyncStatus } from '@shared/api.interface';
import { useSyncDomainCard } from './useSyncDomainCard';
import { FieldMappingTable } from './FieldMappingTable';
import { SyncProgressBar } from './SyncProgressBar';

const DOMAIN_LABELS: Record<string, string> = {
  products: '商品',
  transactions: '出入库',
  transfers: '调拨',
  inventory_checks: '盘点',
  warehouse_inventory: '库存',
};

const STATUS_CONFIG: Record<
  SyncStatus,
  { label: string; className: string; icon: React.ElementType }
> = {
  unconfigured: {
    label: '待配置',
    className:
      'bg-warning/10 text-warning border-warning/20',
    icon: Settings2,
  },
  pending: {
    label: '待配置',
    className:
      'bg-warning/10 text-warning border-warning/20',
    icon: Settings2,
  },
  configured: {
    label: '已配置',
    className:
      'bg-success/10 text-success border-success/20',
    icon: CheckCircle,
  },
  normal: {
    label: '正常',
    className:
      'bg-success/10 text-success border-success/20',
    icon: CheckCircle,
  },
  syncing: {
    label: '同步中',
    className:
      'bg-primary/10 text-primary border-primary/20',
    icon: Loader2,
  },
  error: {
    label: '异常',
    className:
      'bg-destructive/10 text-destructive border-destructive/20',
    icon: AlertCircle,
  },
};

interface SyncDomainCardProps {
  config: SyncConfig | null;
  domain: SyncDomain;
  onRefresh: () => void;
}

export function SyncDomainCard({ config, domain, onRefresh }: SyncDomainCardProps) {
  const s = useSyncDomainCard(domain, config, onRefresh);
  const status: SyncStatus = config?.status ?? 'unconfigured';
  const statusInfo = STATUS_CONFIG[status];
  const StatusIcon = statusInfo.icon;
  const domainLabel = DOMAIN_LABELS[domain] ?? domain;

  return (
    <Card className="rounded-sm shadow-none border border-border">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Zap className="size-4 text-primary" />
            {domainLabel}同步
          </CardTitle>
          <Badge variant="secondary" className={statusInfo.className}>
            <StatusIcon
              className={`size-3 mr-1 ${status === 'syncing' ? 'animate-spin' : ''}`}
            />
            {statusInfo.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {status === 'error' && config?.errorMessage && (
          <div className="flex items-start gap-2 rounded-sm border border-destructive/30 bg-destructive/5 px-3 py-2">
            <AlertCircle className="size-4 text-destructive mt-0.5 shrink-0" />
            <span className="text-sm text-destructive">
              {config.errorMessage}
            </span>
          </div>
        )}

        {/* 基础配置 */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="h-4 w-1 rounded-sm bg-primary" />
            <span className="text-sm font-medium text-foreground">基础配置</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                飞书多维表格 appToken
              </label>
              <div className="flex gap-2">
                <Input
                  placeholder="请输入 appToken"
                  value={s.feishuAppToken}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    s.setFeishuAppToken(e.target.value)
                  }
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={s.handleTestConnection}
                  disabled={s.testingConn || !s.feishuAppToken.trim()}
                  className="shrink-0"
                  title="测试连接"
                >
                  {s.testingConn ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Link2 className="size-3.5" />
                  )}
                </Button>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                表 ID (table_id)
              </label>
              <Input
                placeholder="请输入 table_id"
                value={s.tableId}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  s.setTableId(e.target.value)
                }
              />
            </div>
            <div className="space-y-1.5 col-span-2">
              <label className="text-sm font-medium text-foreground">
                表名（仅用于显示）
              </label>
              <Input
                placeholder="请输入表名"
                value={s.tableName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  s.setTableName(e.target.value)
                }
              />
            </div>
          </div>
        </div>

        {/* 飞书应用凭证 */}
        <div className="space-y-2 border-t border-border pt-4">
          <div className="flex items-center gap-2">
            <span className="h-4 w-1 rounded-sm bg-primary" />
            <span className="text-sm font-medium text-foreground">
              飞书应用凭证（备用）
            </span>
          </div>
          <div className="flex items-start gap-2 rounded-sm border border-primary/30 bg-accent/50 px-3 py-2">
            <Info className="size-4 text-primary mt-0.5 shrink-0" />
            <span className="text-xs text-accent-foreground">
              未检测到平台插件实例时，会自动降级使用此处配置的飞书应用凭证调用 OpenAPI。
              凭证使用 base64 编码后存储，建议使用仅具多维表格权限的应用。
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                App ID
              </label>
              <Input
                placeholder="cli_xxxxxxxxxx"
                value={s.feishuAppId}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  s.setFeishuAppId(e.target.value)
                }
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                App Secret
              </label>
              <div className="flex gap-2">
                <Input
                  type={s.showAppSecret ? 'text' : 'password'}
                  placeholder="请输入 app_secret"
                  value={s.feishuAppSecret}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    s.setFeishuAppSecret(e.target.value)
                  }
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => s.setShowAppSecret(!s.showAppSecret)}
                  className="shrink-0"
                  title={s.showAppSecret ? '隐藏' : '显示'}
                  type="button"
                >
                  {s.showAppSecret ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                </Button>
              </div>
            </div>
          </div>
          {s.feishuAppId && s.feishuAppSecret && (
            <div className="text-xs text-success flex items-center gap-1">
              <CheckCircle className="size-3" />
              凭证已配置
            </div>
          )}
        </div>

        {/* 同步开关 */}
        <div className="space-y-2 border-t border-border pt-4">
          <div className="flex items-center gap-2">
            <span className="h-4 w-1 rounded-sm bg-primary" />
            <span className="text-sm font-medium text-foreground">同步配置</span>
          </div>
          <div className="flex items-start gap-8 flex-wrap">
            <div className="flex items-center gap-2 pt-0.5">
              <Switch checked={s.enabled} onCheckedChange={s.setEnabled} />
              <span className="text-sm">启用同步</span>
            </div>
            <div className="flex items-center gap-2 pt-0.5">
              <Switch
                checked={s.autoRealtime}
                onCheckedChange={s.setAutoRealtime}
                disabled={!s.enabled}
              />
              <span className={`text-sm ${!s.enabled ? 'text-muted-foreground' : ''}`}>
                自动实时同步
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <Switch
                  checked={s.bidirectional}
                  onCheckedChange={s.setBidirectional}
                  disabled={!s.enabled}
                />
                <span className={`text-sm ${!s.enabled ? 'text-muted-foreground' : ''}`}>
                  双向同步
                </span>
              </div>
              {s.bidirectional && s.enabled && (
                <span className="text-xs text-muted-foreground pl-10">
                  开启后每 <span className="font-mono text-foreground">{s.pollIntervalMin}</span> 分钟自动从飞书拉取变更
                </span>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">同步频率（分钟）</label>
              <Input
                type="number"
                min={1}
                max={60}
                value={s.pollIntervalMin}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  s.setPollIntervalMin(Number(e.target.value))
                }
                disabled={!s.enabled || !s.bidirectional}
                className="w-24 h-8 font-mono"
              />
            </div>
          </div>
        </div>

        {/* 字段映射 */}
        <div className="border-t border-border pt-4">
          <FieldMappingTable
            localFields={s.localFields}
            feishuFields={s.feishuFields}
            fieldMap={s.fieldMap}
            onFieldMapChange={s.setFieldMap}
            onLoadFeishuFields={s.handleLoadFields}
            onSmartMatch={s.handleSmartMatch}
            loadingFields={s.loadingFields}
            matching={s.matching}
          />
        </div>

        {/* 操作 + 进度 */}
        <div className="space-y-3 pt-2 border-t border-border">
          <div className="flex items-center justify-end gap-2">
            <Button size="sm" onClick={s.handleSave} disabled={s.saving}>
              {s.saving && <Loader2 className="size-3.5 animate-spin mr-1" />}
              保存配置
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={s.handlePush}
              disabled={s.isPushRunning}
            >
              <Upload className="size-3.5 mr-1" />
              全量推送
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={s.handlePull}
              disabled={s.isPullRunning}
            >
              <Download className="size-3.5 mr-1" />
              全量拉取
            </Button>
          </div>
          {s.pushTask && <SyncProgressBar task={s.pushTask} direction="push" onRetry={s.handlePush} />}
          {s.pullTask && <SyncProgressBar task={s.pullTask} direction="pull" onRetry={s.handlePull} />}
        </div>

        {config?.lastSyncedAt && (
          <div className="text-xs text-muted-foreground font-mono">
            最后同步: {config.lastSyncedAt}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
