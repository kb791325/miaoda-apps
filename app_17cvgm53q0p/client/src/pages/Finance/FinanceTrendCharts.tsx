import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { FinanceTrendPoint } from '@shared/finance';
import { formatPeriodLabel } from './finance-utils';

/** 财务趋势图配色（仅 hex）：收入=品牌蓝、商品成本=警告黄、费用成本=中性灰、利润=成功绿 */
const TREND_COLORS = {
  revenue: '#3C83F6',
  goodsCost: '#F4A825',
  feeCost: '#8F959E',
  profit: '#28BD78',
} as const;

interface ChartBoxProps {
  loading: boolean;
  error: boolean;
  empty: boolean;
  emptyText: string;
  onRetry: () => void;
  children: React.ReactNode;
}

/** 图表容器统一状态：加载骨架 / 错误重试 / 空态 */
const ChartBox: React.FC<ChartBoxProps> = ({
  loading,
  error,
  empty,
  emptyText,
  onRetry,
  children,
}) => {
  if (loading) {
    return <div className="h-[300px] w-full animate-pulse rounded-md bg-muted" />;
  }
  if (error) {
    return (
      <div className="flex h-[300px] flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
        <p>图表数据加载失败</p>
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="mr-1 h-4 w-4" />
          重新加载
        </Button>
      </div>
    );
  }
  if (empty) {
    return (
      <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
        {emptyText}
      </div>
    );
  }
  return <>{children}</>;
};

export interface FinanceTrendChartsProps {
  trend: FinanceTrendPoint[];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}

/** 收入/成本/利润趋势 + 利润率趋势（仪表盘固定按日返回） */
const FinanceTrendCharts: React.FC<FinanceTrendChartsProps> = ({
  trend,
  loading,
  error,
  onRetry,
}) => {
  const labels: string[] = useMemo(
    () => trend.map((point: FinanceTrendPoint) => formatPeriodLabel(point.period)),
    [trend],
  );

  const amountOption: EChartsOption = useMemo(
    () => ({
      tooltip: { trigger: 'axis' },
      legend: { type: 'scroll', bottom: 0 },
      grid: { left: '3%', right: '4%', bottom: '20%', containLabel: true },
      xAxis: { type: 'category', data: labels, axisLabel: { interval: 'auto' } },
      yAxis: { type: 'value', axisLabel: { formatter: '{value}' } },
      series: [
        {
          name: '收入',
          type: 'line',
          smooth: true,
          symbolSize: 6,
          itemStyle: { color: TREND_COLORS.revenue },
          lineStyle: { color: TREND_COLORS.revenue, width: 2 },
          data: trend.map((p: FinanceTrendPoint) => Number(p.revenue.toFixed(2))),
        },
        {
          name: '商品成本',
          type: 'line',
          smooth: true,
          symbolSize: 6,
          itemStyle: { color: TREND_COLORS.goodsCost },
          lineStyle: { color: TREND_COLORS.goodsCost, width: 2 },
          data: trend.map((p: FinanceTrendPoint) => Number(p.goodsCost.toFixed(2))),
        },
        {
          name: '费用成本',
          type: 'line',
          smooth: true,
          symbolSize: 6,
          itemStyle: { color: TREND_COLORS.feeCost },
          lineStyle: { color: TREND_COLORS.feeCost, width: 2 },
          data: trend.map((p: FinanceTrendPoint) => Number(p.feeCost.toFixed(2))),
        },
        {
          name: '利润',
          type: 'line',
          smooth: true,
          symbolSize: 6,
          itemStyle: { color: TREND_COLORS.profit },
          lineStyle: { color: TREND_COLORS.profit, width: 2 },
          data: trend.map((p: FinanceTrendPoint) => Number(p.profit.toFixed(2))),
        },
      ],
    }),
    [labels, trend],
  );

  const rateOption: EChartsOption = useMemo(
    () => ({
      tooltip: { trigger: 'axis' },
      legend: { type: 'scroll', bottom: 0 },
      grid: { left: '3%', right: '4%', bottom: '20%', containLabel: true },
      xAxis: { type: 'category', data: labels, axisLabel: { interval: 'auto' } },
      yAxis: { type: 'value', name: '利润率', axisLabel: { formatter: '{value}%' } },
      series: [
        {
          name: '利润率',
          type: 'line',
          smooth: true,
          symbolSize: 6,
          itemStyle: { color: TREND_COLORS.profit },
          lineStyle: { color: TREND_COLORS.profit, width: 2 },
          data: trend.map((p: FinanceTrendPoint) =>
            Number(p.profitRate.toFixed(1)),
          ),
        },
      ],
    }),
    [labels, trend],
  );

  const empty: boolean = trend.length === 0;

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">收入 / 成本 / 利润趋势</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartBox
            loading={loading}
            error={error}
            empty={empty}
            emptyText="区间内暂无财务数据"
            onRetry={onRetry}
          >
            <ReactECharts
              option={amountOption}
              theme="ud"
              className="h-[300px] w-full"
            />
          </ChartBox>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">利润率趋势</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartBox
            loading={loading}
            error={error}
            empty={empty}
            emptyText="区间内暂无利润率数据"
            onRetry={onRetry}
          >
            <ReactECharts
              option={rateOption}
              theme="ud"
              className="h-[300px] w-full"
            />
          </ChartBox>
        </CardContent>
      </Card>
    </div>
  );
};

export default FinanceTrendCharts;
