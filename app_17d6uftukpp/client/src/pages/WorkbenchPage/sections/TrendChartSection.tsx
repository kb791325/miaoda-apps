import { memo, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { IBizRecord } from '@/data/mt-records';
import { CHART_COLORS } from '@/lib/chart-colors';

interface TrendChartSectionProps {
  contracts: IBizRecord[];
}

/** 近 6 个月合同金额趋势 (按签订日期月份聚合) */
export default memo(function TrendChartSection({ contracts }: TrendChartSectionProps) {
  const option = useMemo<EChartsOption>(() => {
    const months: { key: string; label: string }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months.push({ key, label: `${d.getMonth() + 1}月` });
    }
    const sums = months.map((m) =>
      contracts
        .filter((c) => String(c.values.signDate ?? '').startsWith(m.key))
        .reduce((total, c) => total + Number(c.values.amount ?? 0), 0),
    );

    return {
      tooltip: {
        trigger: 'axis',
        valueFormatter: (value) => `¥${Number(value).toLocaleString('zh-CN')}`,
      },
      legend: { bottom: 0, data: ['合同金额'] },
      grid: { left: '3%', right: '4%', bottom: '20%', containLabel: true },
      xAxis: { type: 'category', boundaryGap: true, data: months.map((m) => m.label) },
      yAxis: { type: 'value' },
      series: [
        {
          name: '合同金额',
          type: 'line',
          smooth: true,
          symbolSize: 6,
          data: sums,
          itemStyle: { color: CHART_COLORS[0] },
          lineStyle: { color: CHART_COLORS[0], width: 2 },
          areaStyle: { color: `${CHART_COLORS[0]}1A` },
        },
      ],
    };
  }, [contracts]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">合同金额趋势</CardTitle>
        <CardDescription>近 6 个月签订合同的金额汇总</CardDescription>
      </CardHeader>
      <CardContent className="px-2 pb-2">
        <ReactECharts option={option} theme="ud" className="h-[300px] w-full" />
      </CardContent>
    </Card>
  );
});
