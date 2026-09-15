import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ChartState from './ChartState';
import { STATUS_PIE_COLORS } from './chart-palette';
import type { StatusDistributionItem } from '@shared/dashboard';

interface StatusPieChartProps {
  items: StatusDistributionItem[];
  loading: boolean;
  error?: boolean;
  onRetry?: () => void;
}

/** 订单状态分布环形图，中心展示总订单数 */
const StatusPieChart: React.FC<StatusPieChartProps> = ({
  items,
  loading,
  error = false,
  onRetry,
}) => {
  const totalCount: number = useMemo(
    () =>
      items.reduce(
        (sum: number, item: StatusDistributionItem): number =>
          sum + item.count,
        0,
      ),
    [items],
  );

  const option: EChartsOption = useMemo(
    () => ({
      tooltip: { trigger: 'item' },
      legend: { type: 'scroll', bottom: 0 },
      title: {
        text: String(totalCount),
        subtext: '总订单数',
        left: 'center',
        top: '36%',
        textStyle: { fontSize: 26, fontWeight: 'bold', color: '#111C33' },
        subtextStyle: { fontSize: 12, color: '#6B7480' },
      },
      series: [
        {
          name: '订单状态',
          type: 'pie',
          radius: ['45%', '68%'],
          center: ['50%', '44%'],
          label: { show: false },
          emphasis: { label: { show: false } },
          data: items.map((item: StatusDistributionItem) => ({
            name: item.status,
            value: item.count,
            itemStyle: {
              color: STATUS_PIE_COLORS[item.status] ?? '#8F9599',
            },
          })),
        },
      ],
    }),
    [items, totalCount],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">订单状态分布</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartState
          loading={loading}
          error={error}
          empty={items.length === 0 || totalCount === 0}
          emptyText="暂无订单状态数据"
          onRetry={onRetry ?? (() => {})}
        >
          <ReactECharts
            option={option}
            theme="ud"
            className="h-[300px] w-full"
          />
        </ChartState>
      </CardContent>
    </Card>
  );
};

export default StatusPieChart;
