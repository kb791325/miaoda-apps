import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Zap,
  Database,
  Monitor,
  Activity,
} from 'lucide-react';

// ---- Types ----

interface PerformanceBenchmarkPanelProps {
  data: PerformanceBenchmarkData | null;
  loading: boolean;
}

interface PerformanceBenchmarkData {
  api: {
    avgResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    throughput: number;
    errorRate: number;
  };
  database: {
    avgQueryTime: number;
    p95QueryTime: number;
    insertsPerSecond: number;
  };
  frontend: {
    avgFCP: number;
    avgLCP: number;
    avgLoadTime: number;
  };
  baseline: BaselineData;
  degradationAlerts: DegradationAlert[];
}

interface BaselineData {
  api: { avgResponseTime: number; p95: number; p99: number; throughput: number };
  database: { avgQueryTime: number; p95: number };
  frontend: { fcp: number; lcp: number; loadTime: number };
}

interface DegradationAlert {
  metric: string;
  currentValue: number;
  baselineValue: number;
  degradationPercent: number;
  severity: 'warning' | 'critical';
}

interface MetricCard {
  label: string;
  current: number;
  baseline: number;
  unit: string;
  threshold: number;
}

// ---- Helpers ----

/** 计算相对于基准的变化百分比 */
function calcDelta(current: number, baseline: number): number {
  if (baseline === 0) return 0;
  return ((current - baseline) / baseline) * 100;
}

/**
 * 获取退化状态的颜色与图标
 * inverse=true 表示值越大越差（响应时间、加载时间）
 */
function getDegradationStatus(
  delta: number,
  inverse: boolean,
): { color: string; bg: string; Icon: typeof TrendingUp } {
  const effective: number = inverse ? delta : -delta;
  if (effective <= -5) {
    return { color: 'text-emerald-600', bg: 'bg-emerald-50', Icon: TrendingDown };
  }
  if (effective >= 10) {
    return { color: 'text-red-600', bg: 'bg-red-50', Icon: TrendingUp };
  }
  return { color: 'text-amber-600', bg: 'bg-amber-50', Icon: TrendingUp };
}

function formatDelta(delta: number): string {
  const sign: string = delta > 0 ? '+' : '';
  return `${sign}${delta.toFixed(1)}%`;
}

function formatValue(value: number, unit: string): string {
  return `${value.toFixed(unit === '%' ? 1 : 0)}${unit}`;
}

// ---- Comparison Row ----

interface ComparisonRowProps {
  label: string;
  current: number;
  baseline: number;
  unit: string;
  inverse: boolean;
}

const ComparisonRow: React.FC<ComparisonRowProps> = ({
  label,
  current,
  baseline,
  unit,
  inverse,
}) => {
  const delta: number = calcDelta(current, baseline);
  const { color, bg, Icon } = getDegradationStatus(delta, inverse);

  return (
    <div className="flex items-center justify-between py-2.5 px-3 border-b border-border last:border-b-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-4">
        <span
          className="text-sm font-medium text-foreground text-right"
          style={{ fontFamily: 'JetBrains Mono, SF Mono, monospace', minWidth: '5ch' }}
        >
          {formatValue(current, unit)}
        </span>
        <span
          className="text-xs text-muted-foreground text-right"
          style={{ fontFamily: 'JetBrains Mono, SF Mono, monospace', minWidth: '5ch' }}
        >
          {formatValue(baseline, unit)}
        </span>
        <span
          className={`inline-flex items-center gap-1 text-xs font-medium rounded-sm px-1.5 py-0.5 ${bg} ${color}`}
        >
          <Icon className="size-3" />
          {formatDelta(delta)}
        </span>
      </div>
    </div>
  );
};

// ---- Section Header ----

interface SectionHeaderProps {
  icon: React.FC<{ className?: string }>;
  title: string;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({
  icon: Icon,
  title,
}) => (
  <div className="flex items-center gap-2 mb-2">
    <div className="flex items-center justify-center size-7 rounded-sm bg-primary/5">
      <Icon className="size-3.5 text-primary" />
    </div>
    <span className="text-sm font-medium text-foreground">{title}</span>
  </div>
);

// ---- Alert Item ----

interface AlertItemProps {
  alert: DegradationAlert;
}

const AlertItem: React.FC<AlertItemProps> = ({ alert }) => {
  const isCritical: boolean = alert.severity === 'critical';
  const color: string = isCritical ? 'text-red-600' : 'text-amber-600';
  const bg: string = isCritical ? 'bg-red-50' : 'bg-amber-50';
  const borderColor: string = isCritical
    ? 'border-red-200'
    : 'border-amber-200';

  return (
    <div
      className={`flex items-start gap-2.5 rounded-sm border ${borderColor} ${bg} p-3`}
    >
      {isCritical ? (
        <AlertTriangle className="size-4 text-red-600 shrink-0 mt-0.5" />
      ) : (
        <AlertTriangle className="size-4 text-amber-600 shrink-0 mt-0.5" />
      )}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${color}`}>{alert.metric}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          当前{' '}
          <span
            className="font-medium text-foreground"
            style={{ fontFamily: 'JetBrains Mono, SF Mono, monospace' }}
          >
            {alert.currentValue}
          </span>
          {' vs '}基准{' '}
          <span
            className="font-medium text-foreground"
            style={{ fontFamily: 'JetBrains Mono, SF Mono, monospace' }}
          >
            {alert.baselineValue}
          </span>
          ，退化{' '}
          <span className={`font-medium ${color}`}>
            +{alert.degradationPercent}%
          </span>
        </p>
      </div>
    </div>
  );
};

// ---- Loading Skeleton ----

const SkeletonPanel: React.FC = () => (
  <div className="space-y-4">
    <div className="h-5 bg-muted rounded-sm w-40 animate-pulse" />
    {[1, 2, 3].map((i: number) => (
      <div
        key={i}
        className="rounded-sm border border-border bg-card p-4 animate-pulse"
      >
        <div className="h-4 bg-muted rounded-sm w-24 mb-3" />
        {[1, 2, 3].map((j: number) => (
          <div key={j} className="h-4 bg-muted rounded-sm w-full mb-2 last:mb-0" />
        ))}
      </div>
    ))}
  </div>
);

// ---- Main Component ----

const PerformanceBenchmarkPanel: React.FC<PerformanceBenchmarkPanelProps> = ({
  data,
  loading,
}) => {
  if (loading && !data) {
    return <SkeletonPanel />;
  }

  if (!data) {
    return (
      <div className="rounded-sm border border-border bg-card p-4">
        <p className="text-sm text-muted-foreground text-center py-6">
          暂无性能基准数据
        </p>
      </div>
    );
  }

  const apiMetrics: MetricCard[] = [
    { label: '平均响应时间', current: data.api.avgResponseTime, baseline: data.baseline.api.avgResponseTime, unit: 'ms', threshold: 10 },
    { label: 'P95 响应时间', current: data.api.p95ResponseTime, baseline: data.baseline.api.p95, unit: 'ms', threshold: 10 },
    { label: 'P99 响应时间', current: data.api.p99ResponseTime, baseline: data.baseline.api.p99, unit: 'ms', threshold: 10 },
    { label: '吞吐量', current: data.api.throughput, baseline: data.baseline.api.throughput, unit: ' req/s', threshold: 10 },
  ];

  const dbMetrics: MetricCard[] = [
    { label: '平均查询耗时', current: data.database.avgQueryTime, baseline: data.baseline.database.avgQueryTime, unit: 'ms', threshold: 10 },
    { label: 'P95 查询耗时', current: data.database.p95QueryTime, baseline: data.baseline.database.p95, unit: 'ms', threshold: 10 },
  ];

  const frontendMetrics: MetricCard[] = [
    { label: 'FCP', current: data.frontend.avgFCP, baseline: data.baseline.frontend.fcp, unit: 'ms', threshold: 10 },
    { label: 'LCP', current: data.frontend.avgLCP, baseline: data.baseline.frontend.lcp, unit: 'ms', threshold: 10 },
    { label: '页面加载时间', current: data.frontend.avgLoadTime, baseline: data.baseline.frontend.loadTime, unit: 'ms', threshold: 10 },
  ];

  const hasAlerts: boolean = data.degradationAlerts.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">
          性能基准对比
        </h2>
        {!hasAlerts && (
          <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
            <CheckCircle className="size-3.5" />
            全部指标正常
          </span>
        )}
      </div>

      {/* API 响应时间 */}
      <div className="rounded-sm border border-border bg-card p-4">
        <SectionHeader icon={Zap} title="API 响应时间" />
        <div className="mt-1">
          {apiMetrics.map((m: MetricCard) => (
            <ComparisonRow
              key={m.label}
              label={m.label}
              current={m.current}
              baseline={m.baseline}
              unit={m.unit}
              inverse={m.label !== '吞吐量'}
            />
          ))}
        </div>
      </div>

      {/* 数据库查询 */}
      <div className="rounded-sm border border-border bg-card p-4">
        <SectionHeader icon={Database} title="数据库查询性能" />
        <div className="mt-1">
          {dbMetrics.map((m: MetricCard) => (
            <ComparisonRow
              key={m.label}
              label={m.label}
              current={m.current}
              baseline={m.baseline}
              unit={m.unit}
              inverse
            />
          ))}
        </div>
      </div>

      {/* 前端加载 */}
      <div className="rounded-sm border border-border bg-card p-4">
        <SectionHeader icon={Monitor} title="前端加载时间" />
        <div className="mt-1">
          {frontendMetrics.map((m: MetricCard) => (
            <ComparisonRow
              key={m.label}
              label={m.label}
              current={m.current}
              baseline={m.baseline}
              unit={m.unit}
              inverse
            />
          ))}
        </div>
      </div>

      {/* 吞吐量 */}
      <div className="rounded-sm border border-border bg-card p-4">
        <SectionHeader icon={Activity} title="吞吐量对比" />
        <div className="mt-1">
          <ComparisonRow
            label="API 吞吐量"
            current={data.api.throughput}
            baseline={data.baseline.api.throughput}
            unit=" req/s"
            inverse={false}
          />
          <ComparisonRow
            label="数据库写入速率"
            current={data.database.insertsPerSecond}
            baseline={0}
            unit=" rows/s"
            inverse={false}
          />
        </div>
      </div>

      {/* 性能退化告警 */}
      {hasAlerts && (
        <div className="rounded-sm border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="size-4 text-amber-600" />
            <span className="text-sm font-medium text-foreground">
              性能退化告警
            </span>
            <span className="text-xs text-muted-foreground">
              ({data.degradationAlerts.length})
            </span>
          </div>
          <div className="space-y-2">
            {data.degradationAlerts.map((alert: DegradationAlert) => (
              <AlertItem key={alert.metric} alert={alert} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PerformanceBenchmarkPanel;