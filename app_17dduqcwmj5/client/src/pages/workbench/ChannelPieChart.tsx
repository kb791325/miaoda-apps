import React from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import type { TopLevelFormatterParams } from 'echarts/types/dist/shared';
import { PieChart } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@client/src/components/ui/card';
import { Skeleton } from '@client/src/components/ui/skeleton';
import { formatPercent } from '@client/src/utils/format';
import {
  Empty,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from '@client/src/components/ui/empty';
import type { ChannelDistributionItem } from '@shared/dashboard';

interface ChannelPieChartProps {
  items: ChannelDistributionItem[] | null;
  loading: boolean;
}

const CHANNEL_PIE_MAX_CATEGORIES: number = 5;
const CHANNEL_PIE_COLORS: string[] = [
  '#f38525',
  '#eea62b',
  '#e85d4a',
  '#2eb85c',
  '#497bdf',
];

function toPieSlices(
  items: ChannelDistributionItem[],
): ChannelDistributionItem[] {
  if (items.length <= CHANNEL_PIE_MAX_CATEGORIES) {
    return items;
  }
  const topSlices: ChannelDistributionItem[] = items.slice(
    0,
    CHANNEL_PIE_MAX_CATEGORIES - 1,
  );
  const otherCount: number = items
    .slice(CHANNEL_PIE_MAX_CATEGORIES - 1)
    .reduce(
      (sum: number, item: ChannelDistributionItem) => sum + item.studentCount,
      0,
    );
  return [...topSlices, { channel: '其他', studentCount: otherCount }];
}

const ChannelPieChart: React.FC<ChannelPieChartProps> = ({ items, loading }) => {
  if (loading) {
    return (
      <Card className="rounded-lg p-6">
        <Skeleton className="mb-4 h-5 w-32" />
        <Skeleton className="h-[300px] w-full" />
      </Card>
    );
  }

  const channelItems: ChannelDistributionItem[] = items ?? [];

  if (channelItems.length === 0) {
    return (
      <Card className="rounded-lg p-6">
        <h2 className="text-base font-bold text-foreground">学员渠道分布</h2>
        <Empty className="mt-4 h-[300px] border">
          <EmptyMedia variant="icon">
            <PieChart />
          </EmptyMedia>
          <EmptyTitle>暂无渠道数据</EmptyTitle>
          <EmptyDescription>
            学员报名并登记来源渠道后，这里将展示各渠道占比
          </EmptyDescription>
        </Empty>
      </Card>
    );
  }

  const slices: ChannelDistributionItem[] = toPieSlices(channelItems);

  const option: EChartsOption = {
    color: CHANNEL_PIE_COLORS,
    tooltip: {
      trigger: 'item',
      formatter: (params: TopLevelFormatterParams) => {
        const point = Array.isArray(params) ? params[0] : params;
        const value: number = Number(point.value);
        const percent: string = formatPercent(point.percent);
        return `${point.marker}${point.name}: ${value} 人 (${percent})`;
      },
    },
    legend: { type: 'scroll', bottom: 0 },
    series: [
      {
        name: '招生渠道',
        type: 'pie',
        radius: ['40%', '62%'],
        center: ['50%', '44%'],
        data: slices.map((slice: ChannelDistributionItem) => ({
          name: slice.channel,
          value: slice.studentCount,
        })),
        label: { show: false },
        emphasis: { label: { show: false } },
      },
    ],
  };

  return (
    <Card className="rounded-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-bold">学员渠道分布</CardTitle>
      </CardHeader>
      <CardContent>
        <ReactECharts option={option} theme="ud" className="h-[320px]" />
      </CardContent>
    </Card>
  );
};

export default ChannelPieChart;
