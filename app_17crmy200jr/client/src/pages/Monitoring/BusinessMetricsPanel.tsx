import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { BusinessMetricsOverview } from '@shared/api.interface';

interface BusinessMetricsPanelProps {
  data: BusinessMetricsOverview | null;
  loading: boolean;
}

interface MetricCardDef {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  change: number | null;
  changeLabel: string;
  isPercentage?: boolean;
}

const BusinessMetricsPanel: React.FC<BusinessMetricsPanelProps> = ({
  data,
  loading,
}) => {
  if (loading && !data) {
    return (
      <div className="rounded-sm border border-border bg-card p-4">
        <div className="h-4 bg-muted rounded-sm w-32 mb-4" />
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-20 bg-muted rounded-sm animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const metrics: MetricCardDef[] = [
    {
      label: '今日支出',
      value: data.expenses.todayAmount,
      prefix: '¥',
      change: null,
      changeLabel: '较昨日',
    },
    {
      label: '本月支出',
      value: data.expenses.monthAmount,
      prefix: '¥',
      change: null,
      changeLabel: '较上月',
    },
    {
      label: '资产总数',
      value: data.assets.total,
      change: null,
      changeLabel: '',
    },
    {
      label: '盘点完成率',
      value: data.inventory.completionRate,
      suffix: '%',
      change: null,
      changeLabel: '',
      isPercentage: true,
    },
    {
      label: '预算执行率',
      value: data.budget.executionRate,
      suffix: '%',
      change: null,
      changeLabel: '',
      isPercentage: true,
    },
    {
      label: '成功率',
      value: data.system.successRate,
      suffix: '%',
      change: null,
      changeLabel: '',
      isPercentage: true,
    },
  ];

  const renderChange = (change: number | null) => {
    if (change === null) return null;
    if (change > 0) {
      return (
        <span className="inline-flex items-center gap-0.5 text-xs text-emerald-600">
          <TrendingUp className="size-3" />
          {change.toFixed(1)}%
        </span>
      );
    }
    if (change < 0) {
      return (
        <span className="inline-flex items-center gap-0.5 text-xs text-red-600">
          <TrendingDown className="size-3" />
          {Math.abs(change).toFixed(1)}%
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
        <Minus className="size-3" />
        持平
      </span>
    );
  };

  const formatValue = (m: MetricCardDef): string => {
    if (m.isPercentage) {
      return `${m.value.toFixed(1)}${m.suffix ?? ''}`;
    }
    if (m.prefix === '¥') {
      return `${m.prefix}${m.value.toLocaleString('zh-CN')}`;
    }
    return `${m.prefix ?? ''}${m.value.toLocaleString('zh-CN')}${m.suffix ?? ''}`;
  };

  return (
    <div className="rounded-sm border border-border bg-card p-4">
      <h3 className="text-sm font-semibold text-foreground mb-3">
        业务指标概览
      </h3>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="rounded-sm border border-border p-3"
          >
            <p className="text-xs text-muted-foreground mb-1">{m.label}</p>
            <p
              className="text-lg font-bold text-foreground text-right"
              style={{ fontFamily: 'JetBrains Mono, SF Mono, monospace' }}
            >
              {formatValue(m)}
            </p>
            {m.change !== null && (
              <div className="flex items-center justify-end gap-1 mt-1">
                <span className="text-xs text-muted-foreground">
                  {m.changeLabel}
                </span>
                {renderChange(m.change)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default BusinessMetricsPanel;