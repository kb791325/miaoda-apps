import type { FC } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { formatPercent } from '@client/src/utils/format';
import type {
  CallbackDataParams,
  TopLevelFormatterParams,
} from 'echarts/types/dist/shared';
import type {
  AttendanceStatusCount,
  ChannelRevenueItem,
  CoursePopularityItem,
  CourseRevenueItem,
  LeadStatusCount,
  MonthlyRevenueItem,
  WeeklyAttendanceItem,
} from '@shared/report';

const PRIMARY_HEX: string = '#f48525';
const WARM_PALETTE: string[] = [
  '#f48525',
  '#f6a821',
  '#d97706',
  '#92400e',
  '#78716c',
];
const ATTENDANCE_STATUS_ORDER: string[] = [
  '出勤',
  '迟到',
  '早退',
  '旷课',
  '请假',
];
const ATTENDANCE_STATUS_COLORS: string[] = [
  '#2fa260',
  '#f6a821',
  '#f2c14e',
  '#e04b3a',
  '#4d7fe8',
];

function formatYuan(value: number): string {
  return `¥${value.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

interface ChartEmptyProps {
  text?: string;
}

const ChartEmpty: FC<ChartEmptyProps> = ({ text }) => (
  <div className="flex h-[300px] w-full items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
    {text ?? '暂无数据'}
  </div>
);

interface LeadStatusChartProps {
  statusCounts: LeadStatusCount[];
}

export const LeadStatusChart: FC<LeadStatusChartProps> = ({ statusCounts }) => {
  if (statusCounts.length === 0) {
    return <ChartEmpty />;
  }
  const option: EChartsOption = {
    color: [PRIMARY_HEX],
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { bottom: 0 },
    grid: {
      left: '3%',
      right: '4%',
      top: '12%',
      bottom: '20%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: statusCounts.map((r: LeadStatusCount) => r.status),
      boundaryGap: true,
    },
    yAxis: { type: 'value', minInterval: 1 },
    series: [
      {
        name: '线索数',
        type: 'bar',
        data: statusCounts.map((r: LeadStatusCount) => r.count),
        barMaxWidth: 40,
        itemStyle: { borderRadius: [6, 6, 0, 0] },
        label: { show: true, position: 'top' },
      },
    ],
  };
  return <ReactECharts option={option} theme="ud" className="h-[300px] w-full" />;
};

interface MonthlyRevenueChartProps {
  monthlyTrend: MonthlyRevenueItem[];
}

export const MonthlyRevenueChart: FC<MonthlyRevenueChartProps> = ({
  monthlyTrend,
}) => {
  if (monthlyTrend.length === 0) {
    return <ChartEmpty />;
  }
  const option: EChartsOption = {
    color: [PRIMARY_HEX],
    tooltip: {
      trigger: 'axis',
      formatter: (params: TopLevelFormatterParams): string => {
        const list: CallbackDataParams[] = Array.isArray(params)
          ? params
          : [params];
        const first: CallbackDataParams | undefined = list[0];
        return `${first?.name ?? ''}<br/>收入：${formatYuan(Number(first?.value ?? 0))}`;
      },
    },
    legend: { bottom: 0 },
    grid: {
      left: '3%',
      right: '4%',
      top: '10%',
      bottom: '20%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: monthlyTrend.map((r: MonthlyRevenueItem) => r.month),
      boundaryGap: false,
    },
    yAxis: { type: 'value' },
    series: [
      {
        name: '收入',
        type: 'line',
        smooth: true,
        data: monthlyTrend.map((r: MonthlyRevenueItem) => r.revenue),
        areaStyle: { opacity: 0.12 },
      },
    ],
  };
  return <ReactECharts option={option} theme="ud" className="h-[300px] w-full" />;
};

interface ChannelRevenuePieProps {
  channelRevenue: ChannelRevenueItem[];
}

export const ChannelRevenuePie: FC<ChannelRevenuePieProps> = ({
  channelRevenue,
}) => {
  const valid: ChannelRevenueItem[] = channelRevenue.filter(
    (r: ChannelRevenueItem) => r.revenue > 0,
  );
  if (valid.length === 0) {
    return <ChartEmpty text="暂无渠道收入数据" />;
  }
  const sorted: ChannelRevenueItem[] = [...valid].sort(
    (a: ChannelRevenueItem, b: ChannelRevenueItem) => b.revenue - a.revenue,
  );
  const top: ChannelRevenueItem[] = sorted.slice(0, 4);
  const rest: ChannelRevenueItem[] = sorted.slice(4);
  const data: Array<{ name: string; value: number }> = top.map(
    (r: ChannelRevenueItem): { name: string; value: number } => ({
      name: r.channel,
      value: r.revenue,
    }),
  );
  if (rest.length > 0) {
    data.push({
      name: '其他渠道',
      value: rest.reduce(
        (sum: number, r: ChannelRevenueItem): number => sum + r.revenue,
        0,
      ),
    });
  }
  const option: EChartsOption = {
    color: WARM_PALETTE,
    tooltip: {
      trigger: 'item',
      formatter: (params: CallbackDataParams): string =>
        `${String(params.name)}<br/>${formatYuan(Number(params.value))}（${params.percent ?? 0}%）`,
    },
    legend: { type: 'scroll', bottom: 0 },
    series: [
      {
        name: '渠道收入',
        type: 'pie',
        radius: ['38%', '62%'],
        center: ['50%', '42%'],
        data,
        label: { show: false },
        emphasis: { label: { show: false } },
      },
    ],
  };
  return <ReactECharts option={option} theme="ud" className="h-[300px] w-full" />;
};

interface CourseRevenueBarProps {
  items: CourseRevenueItem[];
}

export const CourseRevenueBar: FC<CourseRevenueBarProps> = ({ items }) => {
  if (items.length === 0) {
    return <ChartEmpty text="暂无课程收入数据" />;
  }
  const option: EChartsOption = {
    color: [PRIMARY_HEX],
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: TopLevelFormatterParams): string => {
        const list: CallbackDataParams[] = Array.isArray(params)
          ? params
          : [params];
        const first: CallbackDataParams | undefined = list[0];
        return `${first?.name ?? ''}<br/>收入：${formatYuan(Number(first?.value ?? 0))}`;
      },
    },
    legend: { bottom: 0 },
    grid: {
      left: '3%',
      right: '8%',
      top: '6%',
      bottom: '20%',
      containLabel: true,
    },
    xAxis: { type: 'value' },
    yAxis: {
      type: 'category',
      data: items.map((r: CourseRevenueItem) => r.courseName),
      inverse: true,
      boundaryGap: true,
    },
    series: [
      {
        name: '收入',
        type: 'bar',
        data: items.map((r: CourseRevenueItem) => r.revenue),
        barMaxWidth: 22,
      },
    ],
  };
  return <ReactECharts option={option} theme="ud" className="h-[300px] w-full" />;
};

interface PopularityBarProps {
  items: CoursePopularityItem[];
}

export const PopularityBar: FC<PopularityBarProps> = ({ items }) => {
  const data: CoursePopularityItem[] = [...items]
    .sort(
      (a: CoursePopularityItem, b: CoursePopularityItem) =>
        b.studentCount - a.studentCount,
    )
    .slice(0, 10);
  if (data.length === 0) {
    return <ChartEmpty />;
  }
  const option: EChartsOption = {
    color: ['#d97706'],
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { bottom: 0 },
    grid: {
      left: '3%',
      right: '4%',
      top: '12%',
      bottom: '20%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: data.map((r: CoursePopularityItem) => r.courseName),
      boundaryGap: true,
      axisLabel: { interval: 0, rotate: data.length > 5 ? 18 : 0 },
    },
    yAxis: { type: 'value', minInterval: 1 },
    series: [
      {
        name: '报名人数',
        type: 'bar',
        data: data.map((r: CoursePopularityItem) => r.studentCount),
        barMaxWidth: 34,
        itemStyle: { borderRadius: [6, 6, 0, 0] },
      },
    ],
  };
  return <ReactECharts option={option} theme="ud" className="h-[300px] w-full" />;
};

interface AttendanceStatusPieProps {
  statusCounts: AttendanceStatusCount[];
}

export const AttendanceStatusPie: FC<AttendanceStatusPieProps> = ({
  statusCounts,
}) => {
  const data: Array<{ name: string; value: number }> = [];
  const colors: string[] = [];
  for (const item of statusCounts) {
    if (item.count <= 0) {
      continue;
    }
    const index: number = ATTENDANCE_STATUS_ORDER.indexOf(item.status);
    data.push({ name: item.status, value: item.count });
    colors.push(index >= 0 ? ATTENDANCE_STATUS_COLORS[index] : '#78716c');
  }
  if (data.length === 0) {
    return <ChartEmpty text="暂无考勤数据" />;
  }
  const option: EChartsOption = {
    color: colors,
    tooltip: { trigger: 'item' },
    legend: { type: 'scroll', bottom: 0 },
    series: [
      {
        name: '考勤状态',
        type: 'pie',
        radius: ['38%', '62%'],
        center: ['50%', '42%'],
        data,
        label: { show: false },
        emphasis: { label: { show: false } },
      },
    ],
  };
  return <ReactECharts option={option} theme="ud" className="h-[300px] w-full" />;
};

interface WeeklyAttendanceLineProps {
  weeklyTrend: WeeklyAttendanceItem[];
}

export const WeeklyAttendanceLine: FC<WeeklyAttendanceLineProps> = ({
  weeklyTrend,
}) => {
  const hasData: boolean = weeklyTrend.some(
    (r: WeeklyAttendanceItem) => r.totalCount > 0,
  );
  if (weeklyTrend.length === 0 || !hasData) {
    return <ChartEmpty text="近 4 周暂无考勤数据" />;
  }
  const option: EChartsOption = {
    color: [PRIMARY_HEX],
    tooltip: {
      trigger: 'axis',
      formatter: (params: TopLevelFormatterParams): string => {
        const list: CallbackDataParams[] = Array.isArray(params)
          ? params
          : [params];
        const first: CallbackDataParams | undefined = list[0];
        return `${first?.name ?? ''} 周起始<br/>出勤率：${formatPercent(Number(first?.value))}`;
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
      data: weeklyTrend.map((r: WeeklyAttendanceItem) => r.weekStart),
      boundaryGap: false,
    },
    yAxis: {
      type: 'value',
      max: 100,
      axisLabel: {
        formatter: (value: number): string => formatPercent(value),
      },
    },
    series: [
      {
        name: '出勤率',
        type: 'line',
        smooth: true,
        data: weeklyTrend.map((r: WeeklyAttendanceItem) => r.attendanceRate),
        label: {
          show: true,
          formatter: (p: CallbackDataParams): string =>
            formatPercent(Number(p.value)),
        },
      },
    ],
  };
  return <ReactECharts option={option} theme="ud" className="h-[300px] w-full" />;
};
