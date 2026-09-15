import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ChartState from './ChartState';
import { CHART_COLORS } from './chart-palette';
import type { TrendPoint } from '@shared/dashboard';

interface TrendChartProps {
  items: TrendPoint[];
  loading: boolean;
  error?: boolean;
  onRetry?: () => void;
}

/** 近 30 天订单量与销售额双折线趋势图（双 Y 轴，均从 0 起） */
const TrendChart: React.FC<TrendChartProps> = ({
  items,
  loading,
  error = false,
  onRetry,
}) => {
  const option: EChartsOption = useMemo(() => {
    const dates: string[] = items.map((item: TrendPoint) =>
      item.date.slice(5).replace('-', '/'),
    );
    return {
      tooltip: { trigger: 'axis' },
      legend: { type: 'scroll', bottom: 0 },
      grid: { left: '3%', right: '4%', bottom: '20%', containLabel: true },
      xAxis: {
        type: 'category',
        boundaryGap: true,
        data: dates,
        axisLabel: { interval: 'auto' },
      },
      yAxis: [
        {
          type: 'value',
          name: '订单量',
          min: 0,
          minInterval: 1,
          axisLabel: { formatter: '{value}' },
        },
        {
          type: 'value',
          name: '销售额',
          min: 0,
          axisLabel: { formatter: '{value}' },
        },
      ],
      series: [
        {
          name: '订单量',
          type: 'line',
          yAxisIndex: 0,
          smooth: true,
          symbolSize: 6,
          itemStyle: { color: CHART_COLORS.primary },
          lineStyle: { color: CHART_COLORS.primary, width: 2 },
          data: items.map((item: TrendPoint) => item.orderCount),
        },
        {
          name: '销售额',
          type: 'line',
          yAxisIndex: 1,
          smooth: true,
          symbolSize: 6,
          itemStyle: { color: CHART_COLORS.success },
          lineStyle: { color: CHART_COLORS.success, width: 2 },
          data: items.map((item: TrendPoint) =>
            Number(item.salesAmount.toFixed(2)),
          ),
        },
      ],
    };
  }, [items]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">近 30 天订单趋势</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartState
          loading={loading}
          error={error}
          empty={items.length === 0}
          emptyText="暂无订单趋势数据"
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

export default TrendChart;
