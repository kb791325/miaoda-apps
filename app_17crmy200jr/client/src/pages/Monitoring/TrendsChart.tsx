import React from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { LineChart } from 'lucide-react';
import type { MetricTrend } from '@shared/api.interface';

interface TrendsChartProps {
  data: MetricTrend[];
  loading: boolean;
}

const TrendsChart: React.FC<TrendsChartProps> = ({ data, loading }) => {
  if (loading) {
    return (
      <div className="rounded-sm border border-border bg-card p-4">
        <div className="h-4 bg-muted rounded-sm w-32 mb-4" />
        <div className="h-[300px] bg-muted rounded-sm animate-pulse" />
      </div>
    );
  }

  const seriesMap = new Map<string, MetricTrend[]>();
  for (const d of data) {
    const list = seriesMap.get(d.label) ?? [];
    list.push(d);
    seriesMap.set(d.label, list);
  }

  const dates = Array.from(
    new Set(data.map((d) => d.date)),
  ).sort();

  const seriesColors = ['#435774', '#2ecc5e', '#f2a013'];
  const seriesList = Array.from(seriesMap.entries()).slice(0, 5);

  const option: EChartsOption = {
    tooltip: {
      trigger: 'axis',
    },
    legend: {
      bottom: 0,
      type: 'scroll',
      textStyle: { color: '#6b7280', fontSize: 12 },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '20%',
      top: '10%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: dates,
      axisLine: { lineStyle: { color: '#d1d5db' } },
      axisTick: { show: false },
      axisLabel: { color: '#6b7280', fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: '#e5e7eb', type: 'dashed' } },
      axisLabel: { color: '#6b7280', fontSize: 11 },
    },
    series: seriesList.map(([label, items], i) => {
      const dateValueMap = new Map(items.map((d) => [d.date, d.value]));
      return {
        name: label,
        type: 'line',
        data: dates.map((d) => dateValueMap.get(d) ?? null),
        smooth: true,
        lineStyle: {
          color: seriesColors[i % seriesColors.length],
          width: 2,
        },
        itemStyle: {
          color: seriesColors[i % seriesColors.length],
        },
        symbol: 'circle',
        symbolSize: 4,
      };
    }),
  };

  return (
    <div className="rounded-sm border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <LineChart className="size-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">
          业务指标趋势
        </h3>
      </div>
      {data.length === 0 ? (
        <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">
          暂无数据
        </div>
      ) : (
        <ReactECharts option={option} theme="ud" className="h-[300px]" />
      )}
    </div>
  );
};

export default TrendsChart;