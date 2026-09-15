import { useMemo, useState } from 'react';
import type { FC, ReactElement } from 'react';
import type { EChartsOption } from 'echarts';
import type { CallbackDataParams, TopLevelFormatterParams } from 'echarts/types/dist/shared';
import { t } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ReactECharts from 'echarts-for-react';
import { CHART_COLORS } from '@/lib/chart-colors';
import PageHeader from '@/components/PageHeader';
import { useIndustryOverview } from './use-industry-overview';
import type { CostItem, PieItem, TimeDim, TrendSeries } from './industry-overview-data';

const TIME_OPTS: TimeDim[] = ['day', 'week', 'month', 'year'];

const TIME_LABELS: Record<TimeDim, string> = {
  day: '今日',
  week: '本周',
  month: '本月',
  year: '本年',
};

const SOURCE_CONSUME = '来源：财务-消耗 · 客户管理（行业映射）';
const SOURCE_ROI = '来源：业务-行业ROI · 财务-消耗';

const ChartState: FC<{ text: string }> = ({ text }) => (
  <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
    {text}
  </div>
);

const SourceNote: FC<{ text: string }> = ({ text }) => (
  <div className="text-[11px] text-muted-foreground">{text}</div>
);

export default function IndustryOverviewPage() {
  const [timeDim, setTimeDim] = useState<TimeDim>('month');
  const { loading, error, data, consumeEmpty, roiEmpty } = useIndustryOverview(timeDim);

  const trend = data?.trend ?? { labels: [], series: [] };
  const pieData = data?.pieData ?? [];
  const costItems = data?.costItems ?? [];

  const lineOption = useMemo<EChartsOption>(
    () => ({
      color: CHART_COLORS,
      tooltip: { trigger: 'axis' },
      legend: { type: 'scroll', bottom: 0, textStyle: { fontSize: 11 } },
      grid: { left: 16, right: 24, top: 20, bottom: '20%', containLabel: true },
      xAxis: {
        type: 'category',
        data: trend.labels,
        axisLabel: { fontSize: 11 },
        boundaryGap: false,
      },
      yAxis: {
        type: 'value',
        axisLabel: { fontSize: 10 },
        splitLine: { lineStyle: { type: 'dashed', color: '#E5E6EB' } },
      },
      series: trend.series.map((s: TrendSeries) => ({
        name: s.name,
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 5,
        data: s.data,
        lineStyle: { width: 2 },
        areaStyle: { opacity: 0.06 },
      })),
    }),
    [trend],
  );

  const barOption = useMemo<EChartsOption>(() => {
    const fmtVal = (v: unknown): string => {
      const n = Number(v);
      return Number.isFinite(n) && n > 0 ? `${Math.round(n).toLocaleString()} 元` : '暂无数据';
    };
    return {
      color: [CHART_COLORS[1], CHART_COLORS[0]],
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: TopLevelFormatterParams) => {
          const list = Array.isArray(params) ? params : [params];
          const first: CallbackDataParams | undefined = list[0];
          const idx = first?.dataIndex ?? -1;
          const roiItem: CostItem | undefined = idx >= 0 ? costItems[idx] : undefined;
          const roiBase: number | null = roiItem ? roiItem.roiBase : null;
          const lines = list.map(
            (p: CallbackDataParams) => `${p.marker}${p.seriesName}: ${fmtVal(p.value)}`,
          );
          return [`ROI基准: ${roiBase && roiBase > 0 ? roiBase : '暂无数据'}`, ...lines].join(
            '<br/>',
          );
        },
      },
      legend: { type: 'scroll', bottom: 0, textStyle: { fontSize: 11 } },
      grid: { left: 16, right: 20, top: 20, bottom: '20%', containLabel: true },
      xAxis: {
        type: 'category',
        boundaryGap: true,
        data: costItems.map((c: CostItem) => c.name),
        axisLabel: { fontSize: 11 },
      },
      yAxis: {
        type: 'value',
        axisLabel: { fontSize: 10 },
        splitLine: { lineStyle: { type: 'dashed', color: '#E5E6EB' } },
      },
      series: [
        {
          name: '平均CPC（基准）',
          type: 'bar',
          barWidth: 18,
          data: costItems.map((c: CostItem) => c.avgCpc),
        },
        {
          name: '实际消耗（所选周期）',
          type: 'bar',
          barWidth: 18,
          data: costItems.map((c: CostItem) => c.actualConsume),
        },
      ],
    };
  }, [costItems]);

  const pieOption = useMemo<EChartsOption>(
    () => ({
      color: CHART_COLORS,
      tooltip: { trigger: 'item' },
      legend: { type: 'scroll', bottom: 0, itemWidth: 8, itemHeight: 8, textStyle: { fontSize: 11 } },
      series: [
        {
          type: 'pie',
          radius: ['40%', '65%'],
          center: ['50%', '42%'],
          label: { show: false },
          emphasis: { label: { show: false } },
          data: pieData.map((p: PieItem) => ({ name: p.name, value: p.value })),
        },
      ],
    }),
    [pieData],
  );

  const renderChart = (empty: boolean, emptyText: string, node: ReactElement): ReactElement => {
    if (error) return <ChartState text={`加载失败：${error}`} />;
    if (loading) return <ChartState text="加载中..." />;
    if (empty) return <ChartState text={emptyText} />;
    return node;
  };

  return (
    <div className="space-y-4">
      <PageHeader title={t('行业大盘')} description={t('各行业投放趋势与流量成本分析')} />
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-base font-semibold">行业数据概览</CardTitle>
            <div className="mt-1 text-xs text-muted-foreground">
              所选周期总消耗（元）
              <span className="ml-1 font-medium tabular-nums text-primary">
                {Math.round(data?.total ?? 0).toLocaleString()}
              </span>
            </div>
            <SourceNote text={SOURCE_CONSUME} />
          </div>
          <Tabs value={timeDim} onValueChange={(v) => setTimeDim(v as TimeDim)}>
            <TabsList className="h-8 bg-muted/50">
              {TIME_OPTS.map((opt) => (
                <TabsTrigger
                  key={opt}
                  value={opt}
                  className="h-7 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  {TIME_LABELS[opt]}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Card className="border-border/60 shadow-none xl:col-span-2">
            <CardHeader className="pb-0">
              <CardTitle className="text-sm font-medium">各行业消耗趋势</CardTitle>
              <SourceNote text={SOURCE_CONSUME} />
            </CardHeader>
            <CardContent className="pt-0">
              {renderChart(
                trend.series.length === 0,
                '暂无真实数据（来源表：财务-消耗，行业经「客户管理」映射）',
                <ReactECharts option={lineOption} theme="ud" className="h-[300px] w-full" notMerge />,
              )}
            </CardContent>
          </Card>
          <Card className="border-border/60 shadow-none">
            <CardHeader className="pb-0">
              <CardTitle className="text-sm font-medium">流量成本（CPC基准 × 实际消耗）</CardTitle>
              <SourceNote text={SOURCE_ROI} />
            </CardHeader>
            <CardContent className="pt-0">
              {renderChart(
                roiEmpty,
                '暂无真实数据（来源表：业务-行业ROI）',
                <ReactECharts option={barOption} theme="ud" className="h-[300px] w-full" notMerge />,
              )}
            </CardContent>
          </Card>
          <Card className="border-border/60 shadow-none">
            <CardHeader className="pb-0">
              <CardTitle className="text-sm font-medium">行业消耗占比</CardTitle>
              <SourceNote text={SOURCE_CONSUME} />
            </CardHeader>
            <CardContent className="pt-0">
              {renderChart(
                consumeEmpty,
                '暂无真实数据（来源表：财务-消耗，行业经「客户管理」映射）',
                <ReactECharts option={pieOption} theme="ud" className="h-[300px] w-full" notMerge />,
              )}
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}
