import React from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import type { TopLevelFormatterParams } from 'echarts/types/dist/shared';
import { BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@client/src/components/ui/card';
import { Skeleton } from '@client/src/components/ui/skeleton';
import {
  Empty,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from '@client/src/components/ui/empty';
import type { EnrollmentTrendItem } from '@shared/dashboard';

interface EnrollmentTrendChartProps {
  items: EnrollmentTrendItem[] | null;
  loading: boolean;
}

const TREND_STUDENT_COLOR: string = '#f38525';
const TREND_PAYMENT_COLOR: string = '#f5b971';

const EnrollmentTrendChart: React.FC<EnrollmentTrendChartProps> = ({
  items,
  loading,
}) => {
  if (loading) {
    return (
      <Card className="rounded-lg p-6 lg:col-span-2">
        <Skeleton className="mb-4 h-5 w-32" />
        <Skeleton className="h-[300px] w-full" />
      </Card>
    );
  }

  const trendItems: EnrollmentTrendItem[] = items ?? [];
  const hasData: boolean = trendItems.some(
    (item: EnrollmentTrendItem) =>
      item.newStudentCount > 0 || item.paymentAmount > 0,
  );

  if (!hasData) {
    return (
      <Card className="rounded-lg p-6 lg:col-span-2">
        <h2 className="text-base font-bold text-foreground">
          近 30 天招生趋势
        </h2>
        <Empty className="mt-4 h-[300px] border">
          <EmptyMedia variant="icon">
            <BarChart3 />
          </EmptyMedia>
          <EmptyTitle>暂无招生数据</EmptyTitle>
          <EmptyDescription>
            近 30 天还没有新学员报名，招生数据产生后将在这里展示
          </EmptyDescription>
        </Empty>
      </Card>
    );
  }

  const option: EChartsOption = {
    tooltip: {
      trigger: 'axis',
      formatter: (params: TopLevelFormatterParams) => {
        const list = Array.isArray(params) ? params : [params];
        const title: string = String(list[0]?.name ?? '');
        const lines: string[] = list.map((point) => {
          const value: number = Number(point.value);
          if (point.seriesName === '缴费金额') {
            return `${point.marker}${point.seriesName}: ¥ ${value.toLocaleString('zh-CN')}`;
          }
          return `${point.marker}${point.seriesName}: ${value} 人`;
        });
        return [title, ...lines].join('<br/>');
      },
    },
    legend: { bottom: 0 },
    grid: {
      left: '3%',
      right: '4%',
      top: '14%',
      bottom: '20%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      boundaryGap: true,
      data: trendItems.map((item: EnrollmentTrendItem) => item.date),
      axisLabel: {
        formatter: (value: string) => value.slice(5),
      },
    },
    yAxis: [
      { type: 'value', name: '新增学员(人)', min: 0 },
      { type: 'value', name: '缴费金额(元)', min: 0 },
    ],
    series: [
      {
        name: '新增学员',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        color: TREND_STUDENT_COLOR,
        yAxisIndex: 0,
        data: trendItems.map(
          (item: EnrollmentTrendItem) => item.newStudentCount,
        ),
      },
      {
        name: '缴费金额',
        type: 'bar',
        color: TREND_PAYMENT_COLOR,
        yAxisIndex: 1,
        barMaxWidth: 16,
        data: trendItems.map(
          (item: EnrollmentTrendItem) => item.paymentAmount,
        ),
      },
    ],
  };

  return (
    <Card className="rounded-lg lg:col-span-2">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-bold">
          近 30 天招生趋势
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ReactECharts option={option} theme="ud" className="h-[320px]" />
      </CardContent>
    </Card>
  );
};

export default EnrollmentTrendChart;
