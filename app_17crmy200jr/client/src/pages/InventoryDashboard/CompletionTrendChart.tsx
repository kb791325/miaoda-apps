import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import type { TopLevelFormatterParams } from 'echarts/types/dist/shared';
import { CHART_PRIMARY } from '@client/src/utils/chart-colors';
import type { InventoryCompletionRateTrendItem } from '@shared/api.interface';

const BORDER = '#e2e8f0';
const MUTED = '#718096';
const SEGMENTS = 5;
const BAR_TOTAL = '#dbeafe';
const BAR_CHECKED = CHART_PRIMARY;

interface CompletionRateTrendChartProps {
  data: InventoryCompletionRateTrendItem[];
}

function getAxisConfig(maxVal: number): { max: number; interval: number } {
  const target = Math.max(maxVal * 1.1, 10);
  const axisMax = Math.ceil(target / 10) * 10;
  const interval = Math.max(1, Math.round(axisMax / SEGMENTS));
  const alignedMax = interval * SEGMENTS;
  return { max: alignedMax, interval };
}

export const CompletionRateTrendChart: React.FC<CompletionRateTrendChartProps> = ({ data }) => {
  const months = data.map((item: InventoryCompletionRateTrendItem) => {
    const parts = item.month.split('-');
    return `${parts[1]}月`;
  });

  const totalValues = data.map((item: InventoryCompletionRateTrendItem) => item.total);
  const checkedValues = data.map((item: InventoryCompletionRateTrendItem) => item.checked);

  const maxCount = Math.max(...totalValues, ...checkedValues, 1);
  const axis = getAxisConfig(maxCount);

  const hasData = data.length > 0 && data.some((item: InventoryCompletionRateTrendItem) => item.total > 0 || item.checked > 0);

  if (!hasData) {
    return (
      <div className="h-[320px] flex flex-col items-center justify-center text-muted-foreground">
        <div className="text-4xl mb-2">📊</div>
        <div className="text-sm">暂无盘点数据</div>
        <div className="text-xs mt-1 opacity-70">开始盘点后将显示趋势图表</div>
      </div>
    );
  }

  const option: EChartsOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' },
      appendToBody: true,
      formatter: (params: TopLevelFormatterParams) => {
        const list = Array.isArray(params) ? params : [params];
        const title = list[0]?.name ?? '';
        const lines: string[] = [`<div style="font-weight:500;margin-bottom:4px">${title}</div>`];
        for (const p of list) {
          lines.push(`${p.marker}${p.seriesName}: ${Number(p.value).toLocaleString('zh-CN')} 件`);
        }
        return lines.join('<br/>');
      },
    },
    legend: {
      type: 'scroll',
      bottom: 0,
      data: ['总数量', '已盘点'],
    },
    grid: {
      containLabel: true,
      left: 50,
      right: 10,
      top: 20,
      bottom: 40,
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: months,
      axisLine: { lineStyle: { color: BORDER } },
      axisTick: { show: false },
      axisLabel: { color: MUTED, fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      name: '数量(件)',
      nameLocation: 'middle',
      nameGap: 32,
      nameTextStyle: { color: MUTED, fontSize: 11 },
      min: 0,
      max: axis.max,
      interval: axis.interval,
      minInterval: 1,
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: {
        color: MUTED,
        fontSize: 11,
        formatter: (value: number) => {
          if (Number.isInteger(value)) return String(value);
          return value.toFixed(0);
        },
      },
    },
    series: [
      {
        name: '总数量',
        type: 'bar',
        barWidth: '25%',
        itemStyle: { color: BAR_TOTAL },
        data: totalValues,
      },
      {
        name: '已盘点',
        type: 'bar',
        barWidth: '25%',
        itemStyle: { color: BAR_CHECKED },
        data: checkedValues,
      },
    ],
  };

  return (
    <ReactECharts
      option={option}
      theme="ud"
      style={{ height: 320, width: '100%' }}
      notMerge
    />
  );
};
