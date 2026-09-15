import { memo, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { IBizRecord } from '@/data/mt-records';
import { CHART_COLORS } from '@/lib/chart-colors';

interface BarChartSectionProps {
  ads: IBizRecord[];
  contracts: IBizRecord[];
}

/** 广告投放渠道分布 + 各月合同金额柱状图 */
export default memo(function BarChartSection({ ads, contracts }: BarChartSectionProps) {
  const option = useMemo<EChartsOption>(() => {
    const channels = ['信息流', '开屏', '搜索', '视频', '其他'];
    const channelCounts = channels.map((ch) =>
      ads.filter((a) => String(a.values.adType ?? a.values.f2 ?? '').includes(ch)).length,
    );

    const months: { key: string; label: string }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months.push({ key, label: `${d.getMonth() + 1}月` });
    }
    const contractSums = months.map((m) =>
      contracts
        .filter((c) => String(c.values.signDate ?? '').startsWith(m.key))
        .reduce((total, c) => total + Number(c.values.amount ?? 0), 0) / 10000,
    );

    return {
      tooltip: { trigger: 'axis' },
      legend: { type: 'scroll', bottom: 0, data: ['广告数量', '合同金额(万)'] },
      grid: { left: '3%', right: '4%', bottom: '20%', top: '8%', containLabel: true },
      xAxis: [
        { type: 'category', data: channels, boundaryGap: true },
      ],
      yAxis: [
        { type: 'value', name: '数量' },
        { type: 'value', name: '万元' },
      ],
      series: [
        {
          name: '广告数量',
          type: 'bar',
          data: channelCounts,
          itemStyle: { color: CHART_COLORS[0], borderRadius: [4, 4, 0, 0] },
          barWidth: '50%',
          label: { show: false },
        },
        {
          name: '合同金额(万)',
          type: 'bar',
          yAxisIndex: 1,
          data: contractSums,
          itemStyle: { color: CHART_COLORS[1], borderRadius: [4, 4, 0, 0] },
          barWidth: '50%',
          label: { show: false },
        },
      ],
    };
  }, [ads, contracts]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">业务对比分析</CardTitle>
        <CardDescription>广告投放渠道分布 + 近 6 月合同金额（万元）</CardDescription>
      </CardHeader>
      <CardContent className="px-2 pb-2">
        <ReactECharts option={option} theme="ud" className="h-[300px] w-full" />
      </CardContent>
    </Card>
  );
});