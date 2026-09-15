import { useEffect, useState, useMemo } from 'react';
import { BarChart3, Radio, Wallet, TrendingUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { loadModuleRecords } from '@/lib/data-service';
import type { IBizRecord } from '@/data/mt-records';
import { groupCount, groupSum, sumField, val, recentMonths, monthly } from '@/lib/analytics';
import { BarChartCard, KpiStrip, PieChartCard, LineChartCard } from '@/components/analytics/Charts';
import { formatMoneyCompact } from '@/lib/format';
import GenericListPage from '@/components/generic/GenericListPage';

export default function CompetitorDashboardPage() {
  const [rows, setRows] = useState<IBizRecord[] | null>(null);
  useEffect(() => {
    let alive = true;
    void loadModuleRecords('competitor', true).then((r) => alive && setRows(r));
    return () => {
      alive = false;
    };
  }, []);

  const { platformCost, materialCount, total, platformSetSize, avg, top5, months, trendData } = useMemo(() => {
    if (!rows) {
      return {
        platformCost: [],
        materialCount: [],
        total: 0,
        platformSetSize: 0,
        avg: 0,
        top5: [],
        months: [] as string[],
        trendData: [] as number[],
      };
    }
    const platformCost = groupSum(rows, 'competitor', '监控平台', '消耗估算');
    const materialCount = groupCount(rows, 'competitor', '素材类型');
    const total = sumField(rows, 'competitor', '消耗估算');
    const platformSet = new Set(rows.map((r: IBizRecord) => val(r, 'competitor', '监控平台')).filter(Boolean));
    const platformSetSize = platformSet.size;
    const avg = rows.length ? total / rows.length : 0;
    const allByName = groupSum(rows, 'competitor', '竞品名称', '消耗估算');
    const top5 = allByName.slice(0, 5);
    const months = recentMonths(6);
    const trendData = monthly(rows, 'competitor', '监控日期', months, '消耗估算');
    return { platformCost, materialCount, total, platformSetSize, avg, top5, months, trendData };
  }, [rows]);

  if (!rows) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-24" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Skeleton className="h-[340px]" />
          <Skeleton className="h-[340px]" />
        </div>
        <Skeleton className="h-[340px]" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Skeleton className="h-[340px]" />
          <Skeleton className="h-[340px]" />
        </div>
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  const nameCost = groupSum(rows, 'competitor', '竞品名称', '消耗估算');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">竞品监控分析</h2>
        <p className="mt-1 text-sm text-muted-foreground">竞品投放消耗趋势、平台分布与素材结构全景分析</p>
      </div>

      <KpiStrip
        items={[
          { label: '监控样本数', value: rows.length, icon: BarChart3 },
          { label: '覆盖平台', value: platformSetSize, icon: Radio },
          { label: '消耗估算合计', value: formatMoneyCompact(total), icon: Wallet },
          { label: '单样本均消耗', value: formatMoneyCompact(avg), icon: TrendingUp },
        ]}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <BarChartCard title="竞品消耗估算对比" data={nameCost} horizontal valueLabel="消耗估算" />
        <PieChartCard title="投放平台分布" data={platformCost} />
      </div>

      <LineChartCard
        title="竞品投放趋势"
        desc="近6个月消耗估算月度汇总"
        months={months}
        series={[{ name: '消耗估算', data: trendData }]}
        money
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <BarChartCard title="素材类型分布" data={materialCount} horizontal valueLabel="数量" />
        <BarChartCard title="TOP5竞品消耗排行" data={top5} horizontal valueLabel="消耗估算" />
      </div>

      <GenericListPage moduleKey="competitor" />
    </div>
  );
}