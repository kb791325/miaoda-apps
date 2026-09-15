import type { EChartsOption } from 'echarts';
import type { CallbackDataParams, TopLevelFormatterParams } from 'echarts/types/dist/shared';
import type {
  AuditTrendItem,
  AuditTypeDistribution,
  AuditModuleDistribution,
} from '@shared/api.interface';

export const CHART_COLORS = [
  'hsl(215, 40%, 45%)',
  'hsl(215, 50%, 55%)',
  'hsl(215, 30%, 35%)',
  'hsl(215, 60%, 60%)',
  'hsl(215, 20%, 50%)',
  'hsl(215, 35%, 40%)',
  'hsl(215, 55%, 50%)',
  'hsl(215, 25%, 42%)',
];

export function formatDateLabel(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(d.getMonth() + 1)}/${pad(d.getDate())}`;
}

export function buildTrendOption(
  trend: AuditTrendItem[],
): EChartsOption {
  return {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'hsl(0 0% 100%)',
      borderColor: 'hsl(216 15% 88%)',
      textStyle: { color: 'hsl(215 30% 12%)', fontSize: 12 },
      formatter: (params: TopLevelFormatterParams) => {
        const list = Array.isArray(params) ? params : [params];
        const date = (list[0] as CallbackDataParams & { axisValue?: string })?.axisValue ?? '';
        const lines = list.map(
          (p: CallbackDataParams) =>
            `<span style="display:inline-block;margin-right:4px;border-radius:50%;width:8px;height:8px;background-color:${(p as { color?: string }).color ?? '#999'};"></span>${p.seriesName}: <strong>${p.value?.toLocaleString() ?? 0}</strong>`,
        );
        return `<div style="font-weight:600;margin-bottom:4px">${date}</div>${lines.join('<br/>')}`;
      },
    },
    legend: {
      bottom: 0,
      type: 'scroll',
      textStyle: { color: '#5f6d7e' },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '20%',
      top: '3%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: trend.map((t: AuditTrendItem) => formatDateLabel(t.date)),
      axisLabel: { color: 'hsl(215 15% 50%)', fontSize: 11 },
      axisLine: { lineStyle: { color: 'hsl(216 15% 88%)' } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: 'hsl(215 15% 50%)', fontSize: 11 },
      splitLine: { lineStyle: { color: 'hsl(216 15% 88%)', type: 'dashed', opacity: 0.5 } },
    },
    series: [
      {
        name: '成功',
        type: 'line',
        data: trend.map((t: AuditTrendItem) => t.successCount),
        itemStyle: { color: 'hsl(142 60% 45%)' },
        smooth: true,
        symbol: 'circle',
        symbolSize: 4,
      },
      {
        name: '失败',
        type: 'line',
        data: trend.map((t: AuditTrendItem) => t.failureCount),
        itemStyle: { color: 'hsl(0 70% 55%)' },
        smooth: true,
        symbol: 'circle',
        symbolSize: 4,
      },
      {
        name: '总计',
        type: 'line',
        data: trend.map((t: AuditTrendItem) => t.total),
        itemStyle: { color: 'hsl(215 25% 35%)' },
        smooth: true,
        symbol: 'circle',
        symbolSize: 4,
      },
    ],
  };
}

export function buildModulePieOption(
  moduleDistribution: AuditModuleDistribution[],
): EChartsOption {
  return {
    tooltip: {
      trigger: 'item',
      backgroundColor: 'hsl(0 0% 100%)',
      borderColor: 'hsl(216 15% 88%)',
      textStyle: { color: 'hsl(215 30% 12%)', fontSize: 12 },
      formatter: (params: TopLevelFormatterParams) => {
        const p = Array.isArray(params) ? params[0] : params;
        return `${p.name}: ${(p as CallbackDataParams).value?.toLocaleString() ?? 0} (${(p as CallbackDataParams).percent}%)`;
      },
    },
    legend: {
      bottom: 0,
      type: 'scroll',
      textStyle: { color: 'hsl(215 15% 50%)' },
    },
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['50%', '45%'],
        label: { show: false },
        emphasis: { label: { show: false } },
        data: moduleDistribution
          .slice(0, 5)
          .map((m: AuditModuleDistribution, i: number) => ({
            name: m.module,
            value: m.count,
            itemStyle: { color: CHART_COLORS[i % CHART_COLORS.length] },
          })),
      },
    ],
  };
}

export function buildTypeBarOption(
  typeDistribution: AuditTypeDistribution[],
): EChartsOption {
  return {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'hsl(0 0% 100%)',
      borderColor: 'hsl(216 15% 88%)',
      textStyle: { color: 'hsl(215 30% 12%)', fontSize: 12 },
      formatter: (params: TopLevelFormatterParams) => {
        const list = Array.isArray(params) ? params : [params];
        return list
          .map(
            (p: CallbackDataParams) =>
              `<span style="display:inline-block;margin-right:4px;border-radius:2px;width:10px;height:10px;background-color:${(p as { color?: string }).color ?? '#999'};"></span>${p.name}: <strong>${p.value?.toLocaleString() ?? 0}</strong>`,
          )
          .join('<br/>');
      },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '3%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: typeDistribution.map(
        (t: AuditTypeDistribution) => t.operationType,
      ),
      axisLabel: { color: 'hsl(215 15% 50%)', fontSize: 11 },
      axisLine: { lineStyle: { color: 'hsl(216 15% 88%)' } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: 'hsl(215 15% 50%)', fontSize: 11 },
      splitLine: { lineStyle: { color: 'hsl(216 15% 88%)', type: 'dashed', opacity: 0.5 } },
    },
    series: [
      {
        type: 'bar',
        data: typeDistribution.map(
          (t: AuditTypeDistribution, i: number) => ({
            value: t.count,
            itemStyle: { color: CHART_COLORS[i % CHART_COLORS.length] },
          }),
        ),
        barWidth: '60%',
      },
    ],
  };
}