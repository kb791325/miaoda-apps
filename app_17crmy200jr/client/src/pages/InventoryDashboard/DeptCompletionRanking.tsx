import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import type { CallbackDataParams, TopLevelFormatterParams } from 'echarts/types/dist/shared';
import { CHART_PRIMARY } from '@client/src/utils/chart-colors';
import type { InventoryDeptCompletionItem } from '@shared/api.interface';

const BORDER = '#e2e8f0';
const MUTED = '#718096';
const TEXT = '#1a202c';
const SUCCESS = 'hsl(142, 60%, 45%)';

interface DeptCompletionRankingProps {
  data: InventoryDeptCompletionItem[];
}

export const DeptCompletionRanking: React.FC<DeptCompletionRankingProps> = ({ data }) => {
  const sorted = [...data].sort(
    (a: InventoryDeptCompletionItem, b: InventoryDeptCompletionItem) => b.rate - a.rate
  );
  const reversed = [...sorted].reverse();

  const option: EChartsOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: TopLevelFormatterParams) => {
        const list = Array.isArray(params) ? params : [params];
        const p = list[0];
        if (!p) return '';
        const item = sorted[p.dataIndex];
        if (!item) return '';
        return `<div style="font-weight:500">${item.department}</div>
          完成率: ${item.rate.toFixed(1)}%<br/>
          已盘点: ${item.checked.toLocaleString('zh-CN')} / ${item.total.toLocaleString('zh-CN')} 件`;
      },
    },
    grid: {
      containLabel: true,
      left: 10,
       right: 65,
      top: 10,
      bottom: 10,
    },
    xAxis: {
      type: 'value',
      min: 0,
      max: 100,
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: BORDER, type: 'dashed' } },
      axisLabel: {
        color: MUTED,
        fontSize: 11,
        formatter: (value: number) => `${value}%`,
      },
    },
    yAxis: {
      type: 'category',
      data: reversed.map((item: InventoryDeptCompletionItem) => item.department),
      axisLine: { lineStyle: { color: BORDER } },
      axisTick: { show: false },
      axisLabel: { color: TEXT, fontSize: 11 },
    },
    series: [
      {
        name: '完成率',
        type: 'bar',
        barWidth: '55%',
        itemStyle: {
          color: (p: CallbackDataParams) => {
            const val = Number(p.value);
            if (val >= 90) return SUCCESS;
            if (val >= 70) return CHART_PRIMARY;
            return '#d69e2e';
          },
          borderRadius: [0, 2, 2, 0],
        },
        data: reversed.map((item: InventoryDeptCompletionItem) => item.rate),
        label: {
          show: true,
          position: 'right',
          fontSize: 10,
          formatter: (p: CallbackDataParams) => `${Number(p.value).toFixed(1)}%`,
        },
      },
    ],
  };

   if (data.length === 0) {
     return (
       <div className="text-xs py-16 text-center text-muted-foreground">
         暂无数据
       </div>
     );
   }

   return (
     <ReactECharts
       option={option}
       theme="ud"
       style={{ height: 300, width: '100%' }}
       notMerge
     />
   );
 };
