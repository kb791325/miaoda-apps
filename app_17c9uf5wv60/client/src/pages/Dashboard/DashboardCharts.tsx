import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { useTheme } from '@client/src/hooks/useTheme';
import type {
  WarehouseDistribution,
  CategoryTurnover,
  DailyTrend,
  CategoryValue,
} from '@shared/api.interface';

interface ChartThemeColors {
  text: string;
  axisLine: string;
  splitLine: string;
  tooltipBg: string;
  tooltipBorder: string;
}

function getChartThemeColors(isDark: boolean): ChartThemeColors {
  if (isDark) {
    return {
      text: 'hsl(220, 10%, 62%)',
      axisLine: 'hsl(220, 15%, 24%)',
      splitLine: 'hsl(220, 15%, 24%)',
      tooltipBg: 'hsl(220, 18%, 15%)',
      tooltipBorder: 'hsl(220, 15%, 24%)',
    };
  }
  return {
    text: '#64748b',
    axisLine: '#e5e7eb',
    splitLine: '#e5e7eb',
    tooltipBg: '#ffffff',
    tooltipBorder: '#e5e7eb',
  };
}

/** 多色系列：蓝 / 橙 / 绿 / 红 / 紫，深色态提亮 */
const SERIES_COLORS_LIGHT = [
  '#3EA2E9',
  '#F5A623',
  '#3EBD93',
  '#E85D5D',
  '#9B7EF2',
];
const SERIES_COLORS_DARK = [
  '#4FB0F5',
  '#FFB84D',
  '#4ED0A6',
  '#F07777',
  '#B495F7',
];

function getSeriesColors(isDark: boolean): string[] {
  return isDark ? SERIES_COLORS_DARK : SERIES_COLORS_LIGHT;
}

/** 柱状图水平渐变（同色系由深到浅，保持 Grid 精密感） */
function barGradient(base: string) {
  return {
    type: 'linear' as const,
    x: 0,
    y: 0,
    x2: 1,
    y2: 0,
    colorStops: [
      { offset: 0, color: base },
      { offset: 1, color: `${base}66` },
    ],
  };
}

/** 折线/面积图垂直渐变（深色态透明度略降） */
function areaGradient(base: string, isDark: boolean) {
  const topAlpha = isDark ? 0.24 : 0.35;
  const r = parseInt(base.slice(1, 3), 16);
  const g = parseInt(base.slice(3, 5), 16);
  const b = parseInt(base.slice(5, 7), 16);
  return {
    type: 'linear' as const,
    x: 0,
    y: 0,
    x2: 0,
    y2: 1,
    colorStops: [
      { offset: 0, color: `rgba(${r},${g},${b},${topAlpha})` },
      { offset: 1, color: `rgba(${r},${g},${b},0.02)` },
    ],
  };
}

interface WarehouseChartProps {
  data: WarehouseDistribution[];
}

export const WarehouseDistributionChart = ({
  data,
}: WarehouseChartProps) => {
  const { isDark } = useTheme();
  const colors: ChartThemeColors = getChartThemeColors(isDark);
  const seriesColors = getSeriesColors(isDark);
  const option: EChartsOption = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: colors.tooltipBg,
      borderColor: colors.tooltipBorder,
      textStyle: { color: colors.text },
    },
    legend: {
      bottom: 0,
      icon: 'roundRect',
      itemWidth: 10,
      itemHeight: 4,
      textStyle: { color: colors.text },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '14%',
      top: '10%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: data.map((d) => d.warehouse),
      boundaryGap: true,
      axisLine: { lineStyle: { color: colors.axisLine } },
      axisLabel: { color: colors.text },
    },
    yAxis: {
      type: 'value',
      name: '库存量',
      nameTextStyle: { color: colors.text },
      axisLabel: { color: colors.text },
      splitLine: { lineStyle: { color: colors.splitLine } },
    },
    series: [
      {
        name: '库存量',
        type: 'bar',
        data: data.map((d) => d.quantity),
        itemStyle: { color: barGradient(seriesColors[0]) },
        barWidth: '40%',
        label: {
          show: true,
          position: 'top',
          fontSize: 10,
          color: colors.text,
        },
      },
    ],
  };

  return (
    <ReactECharts
      key={isDark ? 'dark' : 'light'}
      option={option}
      notMerge={true}
      theme="ud"
      className="h-64"
    />
  );
};

interface TurnoverChartProps {
  data: CategoryTurnover[];
}

export const CategoryTurnoverChart = ({
  data,
}: TurnoverChartProps) => {
  const { isDark } = useTheme();
  const colors: ChartThemeColors = getChartThemeColors(isDark);
  const seriesColors = getSeriesColors(isDark);
  const option: EChartsOption = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: colors.tooltipBg,
      borderColor: colors.tooltipBorder,
      textStyle: { color: colors.text },
    },
    legend: {
      bottom: 0,
      icon: 'roundRect',
      itemWidth: 10,
      itemHeight: 4,
      textStyle: { color: colors.text },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '14%',
      top: '10%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: data.map((d) => d.category),
      boundaryGap: true,
      axisLine: { lineStyle: { color: colors.axisLine } },
      axisLabel: { color: colors.text },
    },
    yAxis: {
      type: 'value',
      name: '周转天数',
      nameTextStyle: { color: colors.text },
      axisLabel: { color: colors.text },
      splitLine: { lineStyle: { color: colors.splitLine } },
    },
    series: [
      {
        name: '周转天数',
        type: 'bar',
        data: data.map((d) => d.turnoverDays),
        itemStyle: { color: barGradient(seriesColors[1]) },
        barWidth: '40%',
        label: {
          show: true,
          position: 'top',
          fontSize: 10,
          color: colors.text,
        },
      },
    ],
  };

  return (
    <ReactECharts
      key={isDark ? 'dark' : 'light'}
      option={option}
      notMerge={true}
      theme="ud"
      className="h-64"
    />
  );
};

interface DailyTrendChartProps {
  data: DailyTrend[];
}

export const DailyTrendChart = ({ data }: DailyTrendChartProps) => {
  const { isDark } = useTheme();
  const colors: ChartThemeColors = getChartThemeColors(isDark);
  const seriesColors = getSeriesColors(isDark);
  const option: EChartsOption = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: colors.tooltipBg,
      borderColor: colors.tooltipBorder,
      textStyle: { color: colors.text },
    },
    legend: {
      bottom: 0,
      icon: 'roundRect',
      itemWidth: 10,
      itemHeight: 4,
      data: ['入库量', '出库量'],
      textStyle: { color: colors.text },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '14%',
      top: '10%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: data.map((d) => d.date),
      boundaryGap: true,
      axisLine: { lineStyle: { color: colors.axisLine } },
      axisLabel: { color: colors.text },
    },
    yAxis: {
      type: 'value',
      name: '数量',
      nameTextStyle: { color: colors.text },
      axisLabel: { color: colors.text },
      splitLine: { lineStyle: { color: colors.splitLine } },
    },
    series: [
      {
        name: '入库量',
        type: 'line',
        data: data.map((d) => d.inbound),
        itemStyle: { color: seriesColors[0] },
        lineStyle: { width: 2 },
        symbolSize: 6,
        areaStyle: { color: areaGradient(seriesColors[0], isDark) },
      },
      {
        name: '出库量',
        type: 'line',
        data: data.map((d) => d.outbound),
        itemStyle: { color: seriesColors[1] },
        lineStyle: { width: 2 },
        symbolSize: 6,
        areaStyle: { color: areaGradient(seriesColors[1], isDark) },
      },
    ],
  };

  return (
    <ReactECharts
      key={isDark ? 'dark' : 'light'}
      option={option}
      notMerge={true}
      theme="ud"
      className="h-64"
    />
  );
};

interface CategoryValueChartProps {
  data: CategoryValue[];
}

export const CategoryValueChart = ({
  data,
}: CategoryValueChartProps) => {
  const { isDark } = useTheme();
  const colors: ChartThemeColors = getChartThemeColors(isDark);
  const seriesColors = getSeriesColors(isDark);
  const sorted = [...data].sort((a, b) => b.value - a.value);
  let chartData: { name: string; value: number }[];

  if (sorted.length > 5) {
    const top4 = sorted.slice(0, 4);
    const otherValue = sorted
      .slice(4)
      .reduce((sum, item) => sum + item.value, 0);
    chartData = [
      ...top4.map((d) => ({ name: d.category, value: d.value })),
      { name: '其他', value: otherValue },
    ];
  } else {
    chartData = sorted.map((d) => ({
      name: d.category,
      value: d.value,
    }));
  }

  const option: EChartsOption = {
    tooltip: {
      trigger: 'item',
      backgroundColor: colors.tooltipBg,
      borderColor: colors.tooltipBorder,
      textStyle: { color: colors.text },
      formatter: (params) => {
        const p = Array.isArray(params)
          ? params[0]
          : params;
        return `${p.name}: ¥${Number(p.value).toLocaleString()}`;
      },
    },
    legend: {
      type: 'scroll',
      bottom: 0,
      icon: 'roundRect',
      itemWidth: 10,
      itemHeight: 4,
      textStyle: { color: colors.text },
    },
    series: [
      {
        type: 'pie',
        radius: '58%',
        center: ['50%', '42%'],
        data: chartData,
        color: seriesColors,
        label: {
          show: true,
          formatter: '{b}\n{d}%',
          fontSize: 11,
          color: isDark ? 'hsl(220, 10%, 62%)' : 'hsl(220, 25%, 15%)',
        },
        labelLine: { show: true, length: 10, length2: 8 },
      },
    ],
  };

  return (
    <ReactECharts
      key={isDark ? 'dark' : 'light'}
      option={option}
      notMerge={true}
      theme="ud"
      className="h-72"
    />
  );
};
