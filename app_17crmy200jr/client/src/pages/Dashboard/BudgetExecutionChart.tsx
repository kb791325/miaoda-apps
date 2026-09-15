import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import type { TopLevelFormatterParams } from 'echarts/types/dist/shared';
import { CHART_PRIMARY } from '@client/src/utils/chart-colors';
import type { DashboardBudgetExecutionItem } from '@shared/api.interface';

const BORDER = '#e2e8f0';
const MUTED = '#718096';
const SEGMENTS = 5;
const BAR_BUDGET = '#dbeafe';
const BAR_ACTUAL = CHART_PRIMARY;

interface BudgetExecutionChartProps {
  data: DashboardBudgetExecutionItem[];
}

function getAmountAxisConfig(maxVal: number): { max: number; interval: number } {
  const target = Math.max(maxVal * 1.1, 1);
  const order = Math.pow(10, Math.floor(Math.log10(target / SEGMENTS)));
  const rawStep = target / SEGMENTS / order;
  let niceStep: number;
  if (rawStep <= 1) niceStep = 1;
  else if (rawStep <= 2) niceStep = 2;
  else if (rawStep <= 2.5 && order >= 10) niceStep = 2.5;
  else if (rawStep <= 5) niceStep = 5;
  else niceStep = 10;
  const interval = niceStep * order;
  return { max: interval * SEGMENTS, interval };
}

export const BudgetExecutionChart: React.FC<BudgetExecutionChartProps> = ({ data }) => {
  const months = data.map((item: DashboardBudgetExecutionItem) => {
    const parts = item.month.split('-');
    return `${parts[1]}月`;
  });

  const budgetValues = data.map((item: DashboardBudgetExecutionItem) => item.budget);
  const actualValues = data.map((item: DashboardBudgetExecutionItem) => item.actual);

  const maxAmount = Math.max(...budgetValues, ...actualValues, 1);
  const axis = getAmountAxisConfig(maxAmount);

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
          const val = Number(p.value);
          lines.push(
            `${p.marker}${p.seriesName}: ¥${val.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`,
          );
        }
        return lines.join('<br/>');
      },
    },
    legend: {
      type: 'scroll',
      bottom: 0,
      data: ['预算', '实际支出'],
    },
    grid: {
      containLabel: true,
      left: 60,
      right: 20,
      top: 20,
      bottom: 40,
    },
    xAxis: {
      type: 'category',
      boundaryGap: true,
      data: months,
      axisLine: { lineStyle: { color: BORDER } },
      axisTick: { show: false },
      axisLabel: { color: MUTED, fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      name: '金额(元)',
      nameLocation: 'middle',
      nameGap: 48,
      nameTextStyle: { color: MUTED, fontSize: 11 },
      min: 0,
      max: axis.max,
      interval: axis.interval,
      minInterval: 1,
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: BORDER, type: 'dashed' } },
      axisLabel: {
        color: MUTED,
        fontSize: 11,
        formatter: (value: number) => {
          if (value >= 10000) return `${(value / 10000).toFixed(0)}万`;
          return String(Math.round(value));
        },
      },
    },
    series: [
      {
        name: '预算',
        type: 'bar',
        barWidth: '28%',
        itemStyle: { color: BAR_BUDGET },
        data: budgetValues,
      },
      {
        name: '实际支出',
        type: 'bar',
        barWidth: '28%',
        itemStyle: { color: BAR_ACTUAL },
        data: actualValues,
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
