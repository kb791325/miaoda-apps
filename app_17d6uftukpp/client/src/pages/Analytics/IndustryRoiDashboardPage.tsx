import { useEffect, useMemo, useState } from 'react';
import { Award, Percent, TrendingUp, Wallet } from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { loadModuleRecords } from '@/lib/data-service';
import type { IBizRecord } from '@/data/mt-records';
import { monthly, num, recentMonths, val, type NameValue } from '@/lib/analytics';
import { KpiStrip, LineChartCard } from '@/components/analytics/Charts';
import { CHART_COLORS } from '@/lib/chart-colors';
import { formatMoneyCompact, formatPercent } from '@/lib/format';
import GenericListPage from '@/components/generic/GenericListPage';

export default function IndustryRoiDashboardPage() {
  const [rows, setRows] = useState<IBizRecord[] | null>(null);
  useEffect(() => {
    let alive = true;
    void loadModuleRecords('industryRoi', true).then((r: IBizRecord[]) => alive && setRows(r));
    return () => {
      alive = false;
    };
  }, []);

  const months = useMemo(() => recentMonths(6), []);

  const derived = useMemo(() => {
    if (!rows) {
      return {
        avgRoi: 0, avgConv: 0, avgCost: 0,
        bestIndustry: '暂无数据', bestRoi: 0,
        industryRoiData: [] as NameValue[],
        roiTrend: [] as number[], convTrend: [] as number[],
      };
    }
    const avgRoi = rows.length > 0
      ? rows.reduce((s: number, r: IBizRecord) => s + num(r, 'industryRoi', '平均ROI'), 0) / rows.length : 0;
    const avgConv = rows.length > 0
      ? rows.reduce((s: number, r: IBizRecord) => s + num(r, 'industryRoi', '转化率'), 0) / rows.length : 0;
    const avgCost = rows.length > 0
      ? rows.reduce((s: number, r: IBizRecord) => s + num(r, 'industryRoi', '平均消耗'), 0) / rows.length : 0;
    const roiByIndustry = new Map<string, { sum: number; n: number }>();
    for (const r of rows) {
      const industry: string = val(r, 'industryRoi', '一级行业') || '未填写';
      const cur = roiByIndustry.get(industry) ?? { sum: 0, n: 0 };
      cur.sum += num(r, 'industryRoi', '平均ROI');
      cur.n += 1;
      roiByIndustry.set(industry, cur);
    }
    let bestIndustry = '暂无数据';
    let bestRoi = 0;
    for (const [name, v] of roiByIndustry) {
      const a = v.n ? v.sum / v.n : 0;
      if (a > bestRoi) { bestRoi = a; bestIndustry = name; }
    }
    const industryRoiData: NameValue[] = [...roiByIndustry.entries()]
      .map(([name, v]) => ({ name, value: v.n ? Math.round((v.sum / v.n) * 100) / 100 : 0 }))
      .sort((a, b) => b.value - a.value);
    const roiTrend = monthly(rows, 'industryRoi', '周期月份', months, '平均ROI');
    const convTrend = monthly(rows, 'industryRoi', '周期月份', months, '转化率');
    return { avgRoi, avgConv, avgCost, bestIndustry, bestRoi, industryRoiData, roiTrend, convTrend };
  }, [rows, months]);

  const roiBarOption = useMemo<EChartsOption>(() => {
    const names = derived.industryRoiData.map((d: NameValue) => d.name);
    const vals = derived.industryRoiData.map((d: NameValue) => d.value);
    return {
      color: [CHART_COLORS[0]],
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: 8, right: 16, top: 24, bottom: 8, containLabel: true },
      xAxis: {
        type: 'category',
        data: names,
        axisLabel: { fontSize: 11, interval: 0, rotate: names.length > 6 ? 30 : 0 },
      },
      yAxis: { type: 'value' },
      series: [
        {
          name: '平均ROI',
          type: 'bar',
          data: vals,
          barMaxWidth: 36,
          itemStyle: { borderRadius: [4, 4, 0, 0] },
          markLine: {
            silent: true,
            symbol: 'none',
            lineStyle: { type: 'dashed', color: '#E02960' },
            data: [{ yAxis: 2.5, label: { formatter: 'ROI基准2.5', fontSize: 11 } }],
            label: { fontSize: 11 },
          },
        },
      ],
    };
  }, [derived.industryRoiData]);

  if (!rows) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-20" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Skeleton className="h-[340px]" />
          <Skeleton className="h-[340px]" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">行业ROI分析</h2>
        <p className="mt-1 text-sm text-muted-foreground">各行业ROI、转化率与消耗指标总览</p>
      </div>

      <KpiStrip
        items={[
          { label: '平均ROI', value: derived.avgRoi.toFixed(2), icon: TrendingUp },
          { label: '平均转化率', value: formatPercent(derived.avgConv), icon: Percent },
          { label: '平均消耗', value: formatMoneyCompact(derived.avgCost), icon: Wallet },
          { label: '最高ROI行业', value: derived.bestIndustry, icon: Award, hint: `平均ROI ${derived.bestRoi.toFixed(2)}` },
        ]}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">各一级行业平均ROI对比</CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-2">
            <ReactECharts option={roiBarOption} theme="ud" style={{ height: 300 }} />
          </CardContent>
        </Card>

        <LineChartCard
          title="ROI与转化率趋势"
          desc="按周期月份归月"
          months={months.map((m: string) => m.slice(2))}
          series={[
            { name: '平均ROI', data: derived.roiTrend },
            { name: '转化率', data: derived.convTrend },
          ]}
        />
      </div>

      <GenericListPage moduleKey="industryRoi" />
    </div>
  );
}