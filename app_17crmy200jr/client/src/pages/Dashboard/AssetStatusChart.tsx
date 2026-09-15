import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import type { TopLevelFormatterParams } from 'echarts/types/dist/shared';
import { CHART_COLORS_6 } from '@client/src/utils/chart-colors';
import type { DashboardAssetStatusItem } from '@shared/api.interface';

const STATUS_LABELS: Record<string, string> = {
  in_stock: '在库',
  in_use: '在用',
  idle: '闲置',
  repairing: '维修',
  transferring: '调拨中',
  scrapped: '报废',
};

interface AssetStatusChartProps {
  data: DashboardAssetStatusItem[];
}

export const AssetStatusChart: React.FC<AssetStatusChartProps> = ({ data }) => {
  const pieData = data.map((item: DashboardAssetStatusItem) => ({
    name: STATUS_LABELS[item.status] ?? item.status,
    value: item.count,
  }));

  const option: EChartsOption = {
    tooltip: {
      trigger: 'item',
      formatter: (params: TopLevelFormatterParams) => {
        const p = Array.isArray(params) ? params[0] : params;
        if (!p) return '';
        return `${p.name}: ${p.value} 件 (${p.percent ?? 0}%)`;
      },
    },
    legend: { type: 'scroll', bottom: 0 },
    color: CHART_COLORS_6,
    series: [
      {
        name: '资产状态',
        type: 'pie',
        radius: ['45%', '70%'],
        center: ['50%', '42%'],
        avoidLabelOverlap: false,
        label: { show: false },
        emphasis: { label: { show: false } },
        labelLine: { show: false },
        data: pieData,
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
