import { useEffect, useMemo, useState } from 'react';
import { CreditCard, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { loadModuleRecords } from '@/lib/data-service';
import type { IBizRecord } from '@/data/mt-records';
import { groupCount, groupSum, monthly, recentMonths, sumField } from '@/lib/analytics';
import { formatMoneyCompact } from '@/lib/format';
import { BarChartCard, KpiStrip, LineChartCard, PieChartCard } from '@/components/analytics/Charts';

interface D {
  income: IBizRecord[];
  expense: IBizRecord[];
  finance: IBizRecord[];
  recharge: IBizRecord[];
  refund: IBizRecord[];
}

/** 财务管理 · 经营仪表盘(收入 / 支出 / 收退款 / 充值) */
export default function FinanceDashboardPage() {
  const [d, setD] = useState<D | null>(null);
  useEffect(() => {
    let alive = true;
    void Promise.all([
      loadModuleRecords('income', true),
      loadModuleRecords('expense', true),
      loadModuleRecords('finance', true),
      loadModuleRecords('recharge', true),
      loadModuleRecords('refund', true),
    ]).then(([income, expense, finance, recharge, refund]) => {
      if (alive) setD({ income, expense, finance, recharge, refund });
    });
    return () => {
      alive = false;
    };
  }, []);

  const months = useMemo(() => recentMonths(6), []);
  const fmt = (n: number) => formatMoneyCompact(n);

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

  const totalIncome = sumField(d.income, 'income', '收入金额');
  const totalExpense = sumField(d.expense, 'expense', '支出金额');
  const totalReceipt = sumField(d.finance, 'finance', '收款金额');
  const totalRecharge = sumField(d.recharge, 'recharge', '充值金额');
  const totalRefund = sumField(d.refund, 'refund', '退款金额');
  const incomeTrend = monthly(d.income, 'income', '收入时间', months, '收入金额');
  const expenseTrend = monthly(d.expense, 'expense', '支出时间', months, '支出金额');
  const incomeType = groupSum(d.income, 'income', '收入类型', '收入金额');
  const expenseType = groupSum(d.expense, 'expense', '支出类型', '支出金额');
  const receiptStatus = groupCount(d.finance, 'finance', '收款状态');
  const rechargeStatus = groupCount(d.recharge, 'recharge', '充值状态');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">财务经营仪表盘</h2>
        <p className="mt-1 text-sm text-muted-foreground">收入、支出、收退款与账户充值的全局经营视图（数据实时来自多维表格）</p>
      </div>

      <KpiStrip
        items={[
          { label: '累计收入', value: fmt(totalIncome), icon: TrendingUp, tone: 'text-success' },
          { label: '累计支出', value: fmt(totalExpense), icon: TrendingDown, tone: 'text-destructive' },
          { label: '收支净额', value: fmt(totalIncome - totalExpense), icon: Wallet },
          { label: '累计收款', value: fmt(totalReceipt), icon: CreditCard },
          { label: '累计充值', value: fmt(totalRecharge), icon: CreditCard },
          { label: '累计退款', value: fmt(totalRefund), icon: TrendingDown },
        ]}
      />

      <LineChartCard
        title="近 6 个月收入 / 支出趋势"
        desc="按收入时间、支出时间归月汇总金额"
        months={months.map((m) => m.slice(2))}
        money
        series={[
          { name: '收入', data: incomeTrend },
          { name: '支出', data: expenseTrend },
        ]}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <PieChartCard title="收入结构（按收入类型金额）" data={incomeType} />
        <PieChartCard title="支出结构（按支出类型金额）" data={expenseType} />
        <BarChartCard title="各类型支出金额" data={expenseType} horizontal valueLabel="金额" />
        <PieChartCard title="收款记录状态分布" data={receiptStatus} />
        <PieChartCard title="充值状态分布" data={rechargeStatus} />
      </div>
    </div>
  );
}
