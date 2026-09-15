import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import type { TopLevelFormatterParams } from 'echarts/types/dist/shared';
import {
  CHART_PRIMARY,
  CHART_SECONDARY,
  CHART_SUCCESS,
} from '@client/src/utils/chart-colors';
import type { DashboardAssetDepreciation } from '@shared/api.interface';

const BORDER = '#e2e8f0';
const MUTED = '#64748b';

interface DepreciationChartProps {
  data: DashboardAssetDepreciation;
}

export const DepreciationChart: React.FC<DepreciationChartProps> = ({ data }) => {
  const option: EChartsOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: TopLevelFormatterParams) => {
        const list = Array.isArray(params) ? params : [params];
        const lines: string[] = [];
        for (const p of list) {
          const val = Number(p.value);
          lines.push(
            `${p.marker}${p.seriesName}: ¥${val.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`
          );
        }
        return lines.join('<br/>');
      },
    },
    legend: {
      type: 'scroll',
      bottom: 0,
      data: ['原值', '累计折旧', '净值'],
    },
    grid: {
      containLabel: true,
      left: 10,
      right: 10,
      top: 20,
      bottom: '20%',
    },
    xAxis: {
      type: 'category',
      data: ['资产价值'],
      axisLine: { lineStyle: { color: BORDER } },
      axisLabel: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: BORDER, type: 'dashed' } },
      axisLabel: {
        color: MUTED,
        fontSize: 11,
        formatter: (value: number) => {
          if (value >= 10000) return `${(value / 10000).toFixed(0)}万`;
          return String(value);
        },
      },
    },
    series: [
      {
        name: '原值',
        type: 'bar',
        barWidth: '18%',
        itemStyle: { color: CHART_PRIMARY, borderRadius: [4, 4, 0, 0] },
        data: [data.originalValue],
      },
      {
        name: '累计折旧',
        type: 'bar',
        barWidth: '18%',
        itemStyle: { color: CHART_SECONDARY, borderRadius: [4, 4, 0, 0] },
        data: [data.accumulatedDepreciation],
      },
      {
        name: '净值',
        type: 'bar',
        barWidth: '18%',
        itemStyle: { color: CHART_SUCCESS, borderRadius: [4, 4, 0, 0] },
        data: [data.netValue],
      },
    ],
  };

  return (
    <ReactECharts
      option={option}
      theme="ud"
      style={{ height: 280, width: '100%' }}
      notMerge
    />
  );
};
