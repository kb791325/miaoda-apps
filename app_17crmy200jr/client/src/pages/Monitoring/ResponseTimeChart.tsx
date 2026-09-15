import React from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { TrendingUp } from 'lucide-react';

interface ResponseTimeChartProps {
  data: { time: string; p50: number; p95: number; p99: number }[];
  loading: boolean;
}

const ResponseTimeChart: React.FC<ResponseTimeChartProps> = ({
  data,
  loading,
}) => {
  if (loading) {
    return (
      <div className="rounded-sm border border-border bg-card p-4">
        <div className="h-4 bg-muted rounded-sm w-40 mb-4" />
        <div className="h-[300px] bg-muted rounded-sm animate-pulse" />
      </div>
    );
  }

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
      data: data.map((d) => d.time),
      axisLine: { lineStyle: { color: '#d1d5db' } },
      axisTick: { show: false },
      axisLabel: { color: '#6b7280', fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      name: 'ms',
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: '#e5e7eb', type: 'dashed' } },
      axisLabel: { color: '#6b7280', fontSize: 11 },
    },
    series: [
      {
        name: 'P50',
        type: 'line',
        data: data.map((d) => d.p50),
        smooth: true,
        lineStyle: { color: '#435774', width: 2 },
        itemStyle: { color: '#435774' },
        symbol: 'circle',
        symbolSize: 4,
      },
      {
        name: 'P95',
        type: 'line',
        data: data.map((d) => d.p95),
        smooth: true,
        lineStyle: { color: '#f2a013', width: 2 },
        itemStyle: { color: '#f2a013' },
        symbol: 'circle',
        symbolSize: 4,
      },
      {
        name: 'P99',
        type: 'line',
        data: data.map((d) => d.p99),
        smooth: true,
        lineStyle: { color: '#dc3545', width: 2 },
        itemStyle: { color: '#dc3545' },
        symbol: 'circle',
        symbolSize: 4,
      },
    ],
  };

  return (
    <div className="rounded-sm border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="size-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">
          响应时间趋势（24h）
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

export default ResponseTimeChart;