import { useMemo, type ReactNode } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import type { CallbackDataParams } from 'echarts/types/dist/shared';
import type { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { CHART_COLORS } from '@/lib/chart-colors';
import type { NameValue } from '@/lib/analytics';

/* ---------------- KPI 指标条 ---------------- */
export interface Kpi {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  tone?: string;
}

export function KpiStrip({ items }: { items: Kpi[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
      {items.map((it) => {
        const Icon = it.icon;
        return (
          <Card key={it.label} className="py-4">
            <CardContent className="flex items-center gap-3 px-4">
              {Icon ? (
                <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
                  <Icon className={cn('size-4 text-primary', it.tone)} />
                </div>
              ) : null}
              <div className="min-w-0">
                <p className="truncate text-xs text-muted-foreground">{it.label}</p>
                <p className="truncate text-lg font-semibold tabular-nums">{it.value}</p>
                {it.hint ? <p className="truncate text-[11px] text-muted-foreground/70">{it.hint}</p> : null}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function ChartCard({
  title,
  desc,
  children,
  className,
  action,
}: {
  title: string;
  desc?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}) {
  return (
    <Card className={className}>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base">{title}</CardTitle>
          {desc ? <CardDescription>{desc}</CardDescription> : null}
        </div>
        {action}
      </CardHeader>
      <CardContent className="px-2 pb-2">{children}</CardContent>
    </Card>
  );
}

/* ---------------- 环形/饼图 ---------------- */
export function PieChartCard({
  title,
  desc,
  data,
  height = 300,
  donut = true,
}: {
  title: string;
  desc?: string;
  data: NameValue[];
  height?: number;
  donut?: boolean;
}) {
  const option = useMemo<EChartsOption>(
    () => ({
      color: [...CHART_COLORS],
      tooltip: { trigger: 'item' },
      legend: { type: 'scroll', bottom: 0, textStyle: { fontSize: 11 } },
      series: [
        {
          name: title,
          type: 'pie',
          radius: donut ? ['42%', '66%'] : '66%',
          center: ['50%', '44%'],
          data: data.length ? data : [{ name: '暂无数据', value: 1, itemStyle: { color: '#e5e7eb' } }],
          label: { show: false },
        },
      ],
    }),
    [data, title, donut],
  );
  return (
    <ChartCard title={title} desc={desc}>
      <ReactECharts option={option} theme="ud" style={{ height }} />
    </ChartCard>
  );
}

/* ---------------- 柱状图(分组计数/求和) ---------------- */
export function BarChartCard({
  title,
  desc,
  data,
  height = 300,
  horizontal = false,
  valueLabel = '数量',
}: {
  title: string;
  desc?: string;
  data: NameValue[];
  height?: number;
  horizontal?: boolean;
  valueLabel?: string;
}) {
  const option = useMemo<EChartsOption>(() => {
    const names = data.map((d) => d.name);
    const vals = data.map((d) => d.value);
    return horizontal
      ? {
          color: [CHART_COLORS[0]],
          tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
          grid: { left: 8, right: 24, top: 16, bottom: 8, containLabel: true },
          xAxis: { type: 'value' },
          yAxis: { type: 'category', data: names, inverse: true, axisLabel: { fontSize: 11 } },
          series: [{ name: valueLabel, type: 'bar', data: vals, barMaxWidth: 22, itemStyle: { borderRadius: 4 } }],
        }
      : {
          color: [CHART_COLORS[0]],
          tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
          grid: { left: 8, right: 16, top: 24, bottom: 8, containLabel: true },
          xAxis: { type: 'category', data: names, axisLabel: { fontSize: 11, interval: 0, rotate: names.length > 6 ? 30 : 0 } },
          yAxis: { type: 'value' },
          series: [{ name: valueLabel, type: 'bar', data: vals, barMaxWidth: 36, itemStyle: { borderRadius: [4, 4, 0, 0] } }],
        };
  }, [data, horizontal, valueLabel]);
  return (
    <ChartCard title={title} desc={desc}>
      <ReactECharts option={option} theme="ud" style={{ height }} />
    </ChartCard>
  );
}

/* ---------------- 多系列折线(月度趋势) ---------------- */
export function LineChartCard({
  title,
  desc,
  months,
  series,
  height = 300,
  money = false,
}: {
  title: string;
  desc?: string;
  months: string[];
  series: { name: string; data: number[] }[];
  height?: number;
  money?: boolean;
}) {
  const option = useMemo<EChartsOption>(
    () => ({
      color: [...CHART_COLORS],
      tooltip: { trigger: 'axis' },
      legend: { bottom: 0, textStyle: { fontSize: 11 } },
      grid: { left: 8, right: 16, top: 24, bottom: 36, containLabel: true },
      xAxis: { type: 'category', data: months, boundaryGap: false },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: (v: number) => (money && Math.abs(v) >= 10000 ? `${(v / 10000).toFixed(1)}万` : String(v)),
        },
      },
      series: series.map((s) => ({
        name: s.name,
        type: 'line',
        smooth: true,
        data: s.data,
        areaStyle: { opacity: 0.08 },
        symbolSize: 6,
      })),
    }),
    [months, series, money],
  );
  return (
    <ChartCard title={title} desc={desc}>
      <ReactECharts option={option} theme="ud" style={{ height }} />
    </ChartCard>
  );
}

/* ---------------- 漏斗图 ---------------- */
interface FunnelStage {
  name: string;
  value: number;
}

export function FunnelChartCard({ title, stages }: { title: string; stages: FunnelStage[] }) {
  const option = useMemo<EChartsOption>(() => {
    const data = stages.filter((s) => s.value > 0).map((s, i) => ({
      name: s.name,
      value: s.value,
      itemStyle: { color: CHART_COLORS[i % CHART_COLORS.length] },
    }));
    return {
      tooltip: { trigger: 'item', formatter: (p: CallbackDataParams) => `${p.name}: ${p.value}` },
      series: [{
        type: 'funnel',
        left: '10%',
        right: '10%',
        top: 20,
        bottom: 20,
        width: '80%',
        min: 0,
        max: stages[0]?.value ?? 100,
        sort: 'descending',
        gap: 2,
        label: { show: true, position: 'inside' },
        data,
      }],
    };
  }, [stages]);
  return (
    <ChartCard title={title}>
      <ReactECharts option={option} theme="ud" style={{ height: 320 }} />
    </ChartCard>
  );
}
