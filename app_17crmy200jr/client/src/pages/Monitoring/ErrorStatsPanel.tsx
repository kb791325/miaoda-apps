import React from 'react';
import { AlertTriangle, CheckCircle2, XCircle, EyeOff } from 'lucide-react';
import type { ErrorStats } from '@shared/api.interface';

interface ErrorStatsPanelProps {
  data: ErrorStats | null;
  loading: boolean;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; icon: React.FC<{ className?: string }>; borderColor: string; bgColor: string; fgColor: string }
> = {
  total: {
    label: '总数',
    icon: AlertTriangle,
    borderColor: 'border-[hsl(215_25%_35%)]',
    bgColor: 'bg-[hsl(215_25%_95%)]',
    fgColor: 'text-[hsl(215_25%_30%)]',
  },
  new: {
    label: '未解决',
    icon: XCircle,
    borderColor: 'border-[hsl(0_70%_55%)]',
    bgColor: 'bg-[hsl(0_70%_95%)]',
    fgColor: 'text-[hsl(0_70%_40%)]',
  },
  resolved: {
    label: '已解决',
    icon: CheckCircle2,
    borderColor: 'border-[hsl(142_60%_45%)]',
    bgColor: 'bg-[hsl(142_60%_95%)]',
    fgColor: 'text-[hsl(142_60%_30%)]',
  },
  ignored: {
    label: '已忽略',
    icon: EyeOff,
    borderColor: 'border-[hsl(215_15%_50%)]',
    bgColor: 'bg-[hsl(216_20%_97%)]',
    fgColor: 'text-[hsl(215_15%_50%)]',
  },
};

const ErrorStatsPanel: React.FC<ErrorStatsPanelProps> = ({ data, loading }) => {
  if (loading && !data) {
    return (
      <div className="rounded-sm border border-border bg-card p-4">
        <div className="h-4 bg-muted rounded-sm w-24 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-muted rounded-sm animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const statusCards = [
    { key: 'total', value: data.total },
    { key: 'new', value: data.byStatus.new ?? 0 },
    { key: 'resolved', value: data.byStatus.resolved ?? 0 },
    { key: 'ignored', value: data.byStatus.ignored ?? 0 },
  ];

  return (
    <div className="rounded-sm border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="size-4 text-red-600" />
        <h3 className="text-sm font-semibold text-foreground">错误统计</h3>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-4">
        {statusCards.map(({ key, value }) => {
          const config = STATUS_CONFIG[key];
          const Icon = config.icon;
          return (
            <div
              key={key}
              className={`rounded-sm border ${config.borderColor} ${config.bgColor} p-2 text-center`}
            >
              <div className="flex justify-center mb-1">
                <Icon className={`size-4 ${config.fgColor}`} />
              </div>
              <div
                className="text-lg font-bold"
                style={{ fontFamily: 'JetBrains Mono, SF Mono, monospace' }}
              >
                {value}
              </div>
              <div className="text-xs text-muted-foreground">{config.label}</div>
            </div>
          );
        })}
      </div>

      <div className="space-y-2">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          最近 Top 5 错误
        </h4>
        {data.topErrors.length === 0 ? (
          <p className="text-sm text-muted-foreground">暂无错误记录</p>
        ) : (
          data.topErrors.slice(0, 5).map((err) => {
            const statusConfig = STATUS_CONFIG[err.status] ?? STATUS_CONFIG.new;
            return (
              <div
                key={err.id}
                className="flex items-center justify-between py-2 border-b border-border last:border-0"
              >
                <div className="flex-1 min-w-0 mr-3">
                  <p className="text-sm text-foreground truncate">
                    {err.message}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {err.context.method} {err.context.url}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className="text-xs font-mono text-right"
                    style={{ fontFamily: 'JetBrains Mono, SF Mono, monospace' }}
                  >
                    {err.count}×
                  </span>
                  <span
                    className={`inline-flex items-center rounded-sm border ${statusConfig.borderColor} ${statusConfig.bgColor} ${statusConfig.fgColor} px-1.5 py-0.5 text-xs font-medium`}
                  >
                    {statusConfig.label}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ErrorStatsPanel;