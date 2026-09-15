import { useEffect, useState } from 'react';
import { Globe, Percent, TrendingUp, Wallet } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import GenericListPage from '@/components/generic/GenericListPage';
import { KpiStrip, BarChartCard, LineChartCard, PieChartCard } from '@/components/analytics/Charts';
import type { IBizRecord } from '@/data/mt-records';
import { loadModuleRecords } from '@/lib/data-service';
import { groupSum, sumField, monthly, recentMonths } from '@/lib/analytics';
import { formatMoneyCompact } from '@/lib/format';

const MK = 'industryMarket';

export default function IndustryMarketDashboardPage() {
  const [rows, setRows] = useState<IBizRecord[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadModuleRecords(MK, true).then((r) => {
      if (!cancelled) setRows(r);
    });
    return () => { cancelled = true; };
  }, []);

  if (!rows) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
        <Skeleton className="h-80" />
        <Skeleton className="h-80" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  const avgF1 = rows.length > 0 ? sumField(rows, MK, '流量成本') / rows.length : 0;
  const avgF9 = rows.length > 0 ? sumField(rows, MK, '行业总消耗') / rows.length : 0;
  const avgF5 = rows.length > 0 ? sumField(rows, MK, '点击率') / rows.length : 0;
  const avgF13 = rows.length > 0 ? sumField(rows, MK, '转化率') / rows.length : 0;

  const industryConsumption = groupSum(rows, MK, '行业', '行业总消耗');
  const industryPie = groupSum(rows, MK, '行业', '行业总消耗');
  const top5 = industryConsumption.slice(0, 5);

  const months = recentMonths(12);
  const f1Monthly = monthly(rows, MK, '周期月份', months, '流量成本');
  const f2Monthly = monthly(rows, MK, '周期月份', months, '环比增长');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold tracking-tight">行业大盘分析</h2>
        <p className="text-sm text-muted-foreground">行业流量成本、消耗与增长趋势总览</p>
      </div>

      <KpiStrip
        items={[
          { label: '平均流量成本', value: avgF1.toFixed(2), icon: Wallet },
          { label: '平均行业总消耗', value: formatMoneyCompact(avgF9), icon: TrendingUp },
          { label: '平均点击率', value: `${(avgF5 * 100).toFixed(1)}%`, icon: Percent },
          { label: '平均转化率', value: `${(avgF13 * 100).toFixed(1)}%`, icon: Globe },
        ]}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <BarChartCard
          horizontal
          title="各行业总消耗对比"
          desc="按行业分组的总消耗金额汇总"
          data={industryConsumption}
          valueLabel="消耗金额"
        />
        <PieChartCard
          title="行业消耗占比"
          desc="各行业总消耗在整体中的占比分布"
          data={industryPie}
        />
      </div>

      <LineChartCard
        title="流量成本与环比增长趋势"
        desc="近12个月流量成本与环比增长变化"
        months={months}
        series={[
          { name: '流量成本', data: f1Monthly },
          { name: '环比增长', data: f2Monthly },
        ]}
        money
      />

      <BarChartCard
        horizontal
        title="TOP5行业消耗排行"
        desc="行业总消耗降序前5名"
        data={top5}
        valueLabel="消耗金额"
      />

      <GenericListPage moduleKey={MK} />
    </div>
  );
}

