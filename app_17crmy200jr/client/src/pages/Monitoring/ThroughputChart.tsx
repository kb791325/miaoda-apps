import React from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { BarChart3 } from 'lucide-react';

interface ThroughputChartProps {
  data: { time: string; qps: number }[];
  loading: boolean;
}

const ThroughputChart: React.FC<ThroughputChartProps> = ({
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
      boundaryGap: true,
    },
    yAxis: {
      type: 'value',
      name: 'QPS',
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: '#e5e7eb', type: 'dashed' } },
      axisLabel: { color: '#6b7280', fontSize: 11 },
    },
    series: [
      {
        name: 'QPS',
        type: 'bar',
        data: data.map((d) => d.qps),
        itemStyle: {
          color: '#435774',
          borderRadius: [2, 2, 0, 0],
        },
        barWidth: '60%',
      },
    ],
  };

  return (
    <div className="rounded-sm border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 className="size-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">
          吞吐量趋势（24h）
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

export default ThroughputChart;