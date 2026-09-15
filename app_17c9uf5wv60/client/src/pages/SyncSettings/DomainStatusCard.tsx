import {
  AlertCircle,
  CheckCircle,
  Loader2,
  Settings,
} from 'lucide-react';
import { Badge } from '@client/src/components/ui/badge';
import type { SyncConfig, SyncDomain, SyncStatus } from '@shared/api.interface';

interface DomainStatusCardProps {
  domain: SyncDomain;
  label: string;
  config: SyncConfig | null;
  stats?: {
    lastSyncedAt: string | null;
    successCount: number;
    failCount: number;
    status: string;
  };
  onClick: () => void;
}

const STATUS_CONFIG: Record<
  SyncStatus,
  { label: string; className: string; icon: React.ElementType }
> = {
  unconfigured: {
    label: '待配置',
    className:
      'bg-warning/10 text-warning border-warning/20',
    icon: Settings,
  },
  pending: {
    label: '待配置',
    className:
      'bg-warning/10 text-warning border-warning/20',
    icon: Settings,
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

export function DomainStatusCard({
  label,
  config,
  stats,
  onClick,
}: DomainStatusCardProps) {
  const status: SyncStatus = config?.status ?? 'unconfigured';
  const info = STATUS_CONFIG[status];
  const Icon = info.icon;

  const lastSync = stats?.lastSyncedAt ?? config?.lastSyncedAt ?? null;
  const successCount = stats?.successCount ?? 0;
  const failCount = stats?.failCount ?? 0;
  const total = successCount + failCount;
  const successRate = total > 0 ? ((successCount / total) * 100).toFixed(1) : '--';

  return (
    <button
      type="button"
      onClick={onClick}
      className="relative text-left p-4 border border-border rounded-sm bg-card hover:border-primary/50 hover:bg-accent/30 transition-colors group"
    >
      <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-primary" />
      <div className="flex items-start justify-between mb-2">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <Badge variant="secondary" className={info.className}>
          <Icon
            className={`size-3 mr-1 ${status === 'syncing' ? 'animate-spin' : ''}`}
          />
          {info.label}
        </Badge>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">最后同步</span>
          <span className="font-mono text-foreground/80">
            {lastSync ? lastSync.slice(0, 16).replace('T', ' ') : '未同步'}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">近7天成功率</span>
          <span
            className={`font-mono font-medium ${
              total === 0
                ? 'text-muted-foreground'
                : Number(successRate) >= 95
                  ? 'text-success'
                  : Number(successRate) >= 80
                    ? 'text-warning'
                    : 'text-destructive'
            }`}
          >
            {successRate}%
          </span>
        </div>
      </div>
    </button>
  );
}
