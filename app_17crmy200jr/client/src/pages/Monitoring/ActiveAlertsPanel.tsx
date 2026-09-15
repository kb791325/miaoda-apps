import React from 'react';
import { Bell, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AlertEvent } from '@shared/api.interface';

interface ActiveAlertsPanelProps {
  data: AlertEvent[];
  loading: boolean;
  onAcknowledge: (id: string) => void;
  onResolve: (id: string) => void;
}

const ActiveAlertsPanel: React.FC<ActiveAlertsPanelProps> = ({
  data,
  loading,
  onAcknowledge,
  onResolve,
}) => {
  if (loading && data.length === 0) {
    return (
      <div className="rounded-sm border border-border bg-card p-4">
        <div className="h-4 bg-muted rounded-sm w-24 mb-4" />
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-16 bg-muted rounded-sm animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const severityConfig = {
    critical: {
      icon: AlertTriangle,
      borderColor: 'border-[hsl(0_70%_55%)]',
      bgColor: 'bg-[hsl(0_70%_95%)]',
      fgColor: 'text-[hsl(0_70%_40%)]',
      label: '严重',
    },
    warning: {
      icon: AlertTriangle,
      borderColor: 'border-[hsl(38_90%_50%)]',
      bgColor: 'bg-[hsl(38_90%_95%)]',
      fgColor: 'text-[hsl(38_90%_35%)]',
      label: '警告',
    },
  };

  const formatTime = (ts: string): string => {
    const d = new Date(ts);
    return d.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="rounded-sm border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Bell className="size-4 text-amber-600" />
          <h3 className="text-sm font-semibold text-foreground">
            活跃告警
          </h3>
          {data.length > 0 && (
            <span className="inline-flex items-center justify-center min-w-[20px] h-5 rounded-sm bg-red-600 text-white text-xs font-bold px-1">
              {data.length}
            </span>
          )}
        </div>
      </div>

      {data.length === 0 ? (
        <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
          <CheckCircle2 className="size-4 mr-2 text-emerald-600" />
          暂无活跃告警
        </div>
      ) : (
        <div className="space-y-2">
          {data.map((alert) => {
            const config = severityConfig[alert.severity];
            const Icon = config.icon;
            return (
              <div
                key={alert.id}
                className={`rounded-sm border ${config.borderColor} ${config.bgColor} p-3`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className={`size-3.5 ${config.fgColor} shrink-0`} />
                      <span className={`text-xs font-medium ${config.fgColor}`}>
                        {config.label}
                      </span>
                      <span className="text-sm font-semibold text-foreground truncate">
                        {alert.ruleName}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">
                      {alert.message}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="size-3" />
                        {formatTime(alert.triggeredAt)}
                      </span>
                      <span style={{ fontFamily: 'JetBrains Mono, SF Mono, monospace' }}>
                        当前: {alert.value} / 阈值: {alert.threshold}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {alert.status === 'active' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => onAcknowledge(alert.id)}
                      >
                        确认
                      </Button>
                    )}
                    {alert.status !== 'resolved' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-emerald-600"
                        onClick={() => onResolve(alert.id)}
                      >
                        解决
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ActiveAlertsPanel;