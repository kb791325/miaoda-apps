import { useEffect, useMemo, useState } from 'react';
import { Filter, Target, UserCheck, Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { loadModuleRecords } from '@/lib/data-service';
import type { IBizRecord } from '@/data/mt-records';
import { groupCount, monthly, recentMonths } from '@/lib/analytics';
import { BarChartCard, FunnelChartCard, KpiStrip, LineChartCard, PieChartCard } from '@/components/analytics/Charts';

interface D {
  pool: IBizRecord[];
  clue: IBizRecord[];
  customer: IBizRecord[];
}

/** 客户管理 · 转化分析(公海 / 线索 / 客户全漏斗) */
export default function CustomerAnalyticsPage() {
  const [d, setD] = useState<D | null>(null);
  useEffect(() => {
    let alive = true;
    void Promise.all([loadModuleRecords('pool', true), loadModuleRecords('clue', true), loadModuleRecords('customer', true)]).then(
      ([pool, clue, customer]) => {
        if (alive) setD({ pool, clue, customer });
      },
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

  const poolStatus = groupCount(d.pool, 'pool', '分配状态');
  const clueStatus = groupCount(d.clue, 'clue', '线索状态');
  const clueLevel = groupCount(d.clue, 'clue', '线索等级');
  const customerLevel = groupCount(d.customer, 'customer', '客户等级');
  const customerStatus = groupCount(d.customer, 'customer', '客户状态');
  const poolSource = groupCount(d.pool, 'pool', '来源渠道');
  const clueTrend = monthly(d.clue, 'clue', '首次接触时间', months);
  const customerTrend = monthly(d.customer, 'customer', '签约日期', months);
  const clueConverted = clueStatus.find((x) => x.name === '已转化')?.value ?? 0;
  const waitAssign = poolStatus.find((x) => x.name === '待分配')?.value ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">客户转化分析</h2>
        <p className="mt-1 text-sm text-muted-foreground">公海客资 → 线索 → 成交客户的全链路转化与来源结构</p>
      </div>

      <KpiStrip
        items={[
          { label: '公海客资', value: d.pool.length, icon: Users },
          { label: '待分配客资', value: waitAssign, icon: Filter, tone: 'text-warning' },
          { label: '线索总数', value: d.clue.length, icon: Target },
          { label: '已转化线索', value: clueConverted, icon: UserCheck, tone: 'text-success' },
          { label: '成交客户', value: d.customer.length, icon: Users },
          {
            label: '线索转化率',
            value: d.clue.length ? `${((clueConverted / d.clue.length) * 100).toFixed(1)}%` : '—',
            icon: UserCheck,
          },
        ]}
      />

      <LineChartCard
        title="近 6 个月线索 / 客户新增趋势"
        desc="按首次接触时间与签约日期归月统计"
        months={months.map((m) => m.slice(2))}
        series={[
          { name: '新增线索', data: clueTrend },
          { name: '新增客户', data: customerTrend },
        ]}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <PieChartCard title="公海客资分配状态" data={poolStatus} />
        <FunnelChartCard
          title="客资转化漏斗"
          stages={[
            { name: '公海客资', value: d.pool.length },
            { name: '已分配', value: poolStatus.find((x) => x.name === '已分配')?.value ?? 0 },
            { name: '线索', value: d.clue.length },
            { name: '已转化线索', value: clueConverted },
            { name: '成交客户', value: d.customer.length },
          ]}
        />
        <PieChartCard title="线索状态分布" data={clueStatus} />
        <PieChartCard title="客户等级结构" data={customerLevel} />
        <PieChartCard title="客户状态分布" data={customerStatus} />
        <BarChartCard title="线索等级分布" data={clueLevel} />
        <BarChartCard title="公海客资来源渠道" data={poolSource} horizontal />
      </div>
    </div>
  );
}
