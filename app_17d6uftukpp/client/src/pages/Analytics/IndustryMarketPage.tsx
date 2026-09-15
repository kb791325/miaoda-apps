import { useEffect, useMemo, useState } from 'react';
import { Globe, Percent, TrendingUp, Wallet } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { loadModuleRecords } from '@/lib/data-service';
import type { IBizRecord } from '@/data/mt-records';
import { groupCount, groupSum, monthly, num, recentMonths, val, type NameValue } from '@/lib/analytics';
import { BarChartCard, KpiStrip, LineChartCard, PieChartCard } from '@/components/analytics/Charts';
import { formatMoneyCompact } from '@/lib/format';

interface D {
  market: IBizRecord[];
  roi: IBizRecord[];
}

/** 业务支持 · 行业大盘 */
export default function IndustryMarketPage() {
  const [d, setD] = useState<D | null>(null);
  useEffect(() => {
    let alive = true;
    void Promise.all([loadModuleRecords('industryMarket', true), loadModuleRecords('industryRoi', true)]).then(
      ([market, roi]) => alive && setD({ market, roi }),
    );
    return () => {
      alive = false;
    };
  }, []);
  const months = useMemo(() => recentMonths(6), []);

  if (!d) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-24" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Skeleton className="h-[340px]" />
          <Skeleton className="h-[340px]" />
        </div>
      </div>
    );
  }

  const industryCost = groupSum(d.market, 'industryMarket', '行业', '行业总消耗');
  const periodDist = groupCount(d.market, 'industryMarket', '统计周期');
  const costTrend = monthly(d.market, 'industryMarket', '周期月份', months, '行业总消耗');
  // 各一级行业平均 ROI
  const roiBucket = new Map<string, { sum: number; n: number }>();
  for (const r of d.roi) {
    const g = val(r, 'industryRoi', '一级行业') || '未填写';
    const cur = roiBucket.get(g) ?? { sum: 0, n: 0 };
    cur.sum += num(r, 'industryRoi', '平均ROI');
    cur.n += 1;
    roiBucket.set(g, cur);
  }
  const industryRoi: NameValue[] = [...roiBucket.entries()]
    .map(([name, v]) => ({ name, value: v.n ? Math.round((v.sum / v.n) * 100) / 100 : 0 }))
    .sort((a, b) => b.value - a.value);

  const totalCost = industryCost.reduce((s, x) => s + x.value, 0);
  const avgCost = d.market.length ? totalCost / d.market.length : 0;
  const avgTrafficCost =
    d.market.reduce((s, r) => s + num(r, 'industryMarket', '流量成本'), 0) / (d.market.length || 1);
  const avgRoi = d.roi.reduce((s, r) => s + num(r, 'industryRoi', '平均ROI'), 0) / (d.roi.length || 1);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">行业大盘</h2>
        <p className="mt-1 text-sm text-muted-foreground">各行业消耗、流量成本与 ROI 基准趋势</p>
      </div>

      <KpiStrip
        items={[
          { label: '覆盖行业', value: industryCost.length, icon: Globe },
          { label: '行业总消耗', value: formatMoneyCompact(totalCost), icon: Wallet },
          { label: '周期均消耗', value: formatMoneyCompact(avgCost), icon: TrendingUp },
          { label: '平均流量成本', value: avgTrafficCost.toFixed(2), icon: Wallet },
          { label: '行业平均 ROI', value: avgRoi.toFixed(2), icon: Percent },
        ]}
      />

      <LineChartCard
        title="近 6 期行业总消耗趋势"
        desc="按周期月份汇总"
        months={months.map((m) => m.slice(2))}
        money
        series={[{ name: '行业总消耗', data: costTrend }]}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <BarChartCard title="各行业总消耗" data={industryCost} horizontal valueLabel="总消耗" />
        <BarChartCard title="各行业平均 ROI" data={industryRoi} valueLabel="平均ROI" />
        <PieChartCard title="统计周期分布" data={periodDist} />
      </div>
    </div>
  );
}
