import { useEffect, useMemo, useState } from 'react';
import { CreditCard, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { loadModuleRecords } from '@/lib/data-service';
import type { IBizRecord } from '@/data/mt-records';
import { groupSum, monthly, num, recentMonths, sumField } from '@/lib/analytics';
import { formatMoneyCompact } from '@/lib/format';
import { BarChartCard, KpiStrip, LineChartCard, PieChartCard } from '@/components/analytics/Charts';
import GenericListPage from '@/components/generic/GenericListPage';

export default function CostAccountDashboardPage() {
  const [rows, setRows] = useState<IBizRecord[] | null>(null);
  useEffect(() => {
    let alive = true;
    loadModuleRecords('costAccount', true).then((records: IBizRecord[]) => {
      if (alive) setRows(records);
    });
    return () => {
      alive = false;
    };
  }, []);

  const months = useMemo(() => recentMonths(6), []);
  const fmt = (n: number) => formatMoneyCompact(n);

  if (!rows) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-24" />
        <Skeleton className="h-[340px]" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Skeleton className="h-[340px]" />
          <Skeleton className="h-[340px]" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  const totalRevenue = sumField(rows, 'costAccount', '收入金额');
  const totalCost = sumField(rows, 'costAccount', '总成本');
  const totalGross = sumField(rows, 'costAccount', '毛利');
  const grossMargins = rows
    .map((r: IBizRecord) => num(r, 'costAccount', '毛利率'))
    .filter((n: number) => n > 0);
  const avgGrossMargin =
    grossMargins.length > 0
      ? grossMargins.reduce((s: number, n: number) => s + n, 0) / grossMargins.length
      : 0;

  const revenueTrend = monthly(rows, 'costAccount', '核算月份', months, '收入金额');
  const costTrend = monthly(rows, 'costAccount', '核算月份', months, '总成本');
  const grossTrend = monthly(rows, 'costAccount', '核算月份', months, '毛利');

  const totalHr = sumField(rows, 'costAccount', '人力成本');
  const totalOutsource = sumField(rows, 'costAccount', '外包成本');
  const totalOther = sumField(rows, 'costAccount', '其他成本');
  const costBreakdown = [
    { name: '人力成本', value: totalHr },
    { name: '外包成本', value: totalOutsource },
    { name: '其他成本', value: totalOther },
  ];

  const statusDistribution = groupSum(rows, 'costAccount', '核算状态', '总成本');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">成本管理分析</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          成本核算表的经营分析视图（数据实时来自多维表格）
        </p>
      </div>

      <KpiStrip
        items={[
          { label: '总收入金额', value: fmt(totalRevenue), icon: TrendingUp, tone: 'text-success' },
          { label: '总成本', value: fmt(totalCost), icon: TrendingDown, tone: 'text-destructive' },
          { label: '总毛利', value: fmt(totalGross), icon: Wallet },
          { label: '平均毛利率', value: `${(avgGrossMargin * 100).toFixed(1)}%`, icon: CreditCard },
        ]}
      />

      <LineChartCard
        title="月度成本趋势"
        desc="按核算月份归月汇总收入金额、总成本与毛利"
        months={months.map((m: string) => m.slice(2))}
        money
        series={[
          { name: '收入金额', data: revenueTrend },
          { name: '总成本', data: costTrend },
          { name: '毛利', data: grossTrend },
        ]}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <PieChartCard title="成本构成" data={costBreakdown} />
        <BarChartCard horizontal title="核算状态分布" data={statusDistribution} valueLabel="总成本" />
      </div>

      <GenericListPage moduleKey="costAccount" />
    </div>
  );
}