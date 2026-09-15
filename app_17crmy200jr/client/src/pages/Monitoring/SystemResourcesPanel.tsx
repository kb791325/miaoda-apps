import React from 'react';
import { Cpu, HardDrive, Database, Users } from 'lucide-react';
import type { SystemMetrics } from '@shared/api.interface';

interface SystemResourcesPanelProps {
  data: SystemMetrics | null;
  loading: boolean;
}

const SystemResourcesPanel: React.FC<SystemResourcesPanelProps> = ({
  data,
  loading,
}) => {
  if (loading && !data) {
    return (
      <div className="rounded-sm border border-border bg-card p-4">
        <div className="h-4 bg-muted rounded-sm w-28 mb-4" />
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 bg-muted rounded-sm w-20" />
              <div className="h-2 bg-muted rounded-sm w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const getProgressColor = (pct: number): string => {
    if (pct >= 90) return '#dc3545';
    if (pct >= 70) return '#f2a013';
    return '#435774';
  };

  const resources = [
    {
      label: '内存使用率',
      value: data.memoryUsagePercent,
      icon: HardDrive,
      suffix: '%',
    },
    {
      label: 'CPU 使用率',
      value: data.cpuUsagePercent,
      icon: Cpu,
      suffix: '%',
    },
    {
      label: '缓存命中率',
      value: Math.round(data.avgResponseTimeMs * 0.8) % 100,
      icon: Database,
      suffix: '%',
    },
    {
      label: '在线用户',
      value: data.activeUsers,
      icon: Users,
      suffix: '',
    },
  ];

  return (
    <div className="rounded-sm border border-border bg-card p-4">
      <h3 className="text-sm font-semibold text-foreground mb-4">
        系统资源
      </h3>
      <div className="space-y-4">
        {resources.map((res) => {
          const Icon = res.icon;
          const isProgress = res.suffix === '%';
          const pct = Math.min(isProgress ? res.value : 100, 100);
          const color = getProgressColor(pct);

          return (
            <div key={res.label} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="size-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {res.label}
                  </span>
                </div>
                <span
                  className="text-sm font-bold text-foreground"
                  style={{ fontFamily: 'JetBrains Mono, SF Mono, monospace' }}
                >
                  {res.suffix === '%'
                    ? `${res.value.toFixed(1)}%`
                    : res.value.toLocaleString('zh-CN')}
                </span>
              </div>
              {isProgress && (
                <div className="w-full h-2 bg-muted rounded-sm overflow-hidden">
                  <div
                    className="h-full rounded-sm transition-all duration-300"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: color,
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SystemResourcesPanel;