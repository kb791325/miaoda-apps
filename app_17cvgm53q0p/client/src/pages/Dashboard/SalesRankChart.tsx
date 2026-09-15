import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import type { CallbackDataParams } from 'echarts/types/dist/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ChartState from './ChartState';
import { CHART_COLORS } from './chart-palette';
import type { SalesRankItem } from '@shared/dashboard';

interface SalesRankChartProps {
  items: SalesRankItem[];
  loading: boolean;
  error?: boolean;
  onRetry?: () => void;
}

/** 商品销量排行横向柱状图（主色系渐变，TOP10） */
const SalesRankChart: React.FC<SalesRankChartProps> = ({
  items,
  loading,
  error = false,
  onRetry,
}) => {
  const option: EChartsOption = useMemo(() => {
    // 图表 y 轴自下而上渲染，反转使排行第一显示在顶部
    const reversed = [...items].reverse();
    return {
      tooltip: { trigger: 'axis' },
      grid: { left: '3%', right: '10%', bottom: '12%', containLabel: true },
      xAxis: {
        type: 'value',
        min: 0,
        minInterval: 1,
        axisLabel: { formatter: '{value}' },
      },
      yAxis: {
        type: 'category',
        boundaryGap: true,
        data: reversed.map((item: SalesRankItem) => item.productName),
      },
      series: [
        {
          name: '销量',
          type: 'bar',
          barMaxWidth: 22,
          itemStyle: {
            // 对象式线性渐变（主色 → 浅主色），无需注册 GraphicComponent
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 1,
              y2: 0,
              colorStops: [
                { offset: 0, color: CHART_COLORS.primaryLight },
                { offset: 1, color: CHART_COLORS.primary },
              ],
            },
            borderRadius: [0, 4, 4, 0],
          },
          label: {
            show: true,
            position: 'right',
            formatter: (p: CallbackDataParams) => String(p.value),
          },
          data: reversed.map((item: SalesRankItem) => item.salesCount),
        },
      ],
    };
  }, [items]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">商品销量排行 TOP 10</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartState
          loading={loading}
          error={error}
          empty={items.length === 0}
          emptyText="暂无商品销量数据"
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

export default SalesRankChart;
