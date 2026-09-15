import { useEffect, useState } from 'react';
import { CheckSquare, FileText, Megaphone, Users, Video, TrendingUp, Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { IBizRecord } from '@/data/mt-records';
import { loadModuleRecords } from '@/lib/data-service';
import { formatMoney, formatMoneyCompact } from '@/lib/format';
import { fetchPendingApprovals } from '@/lib/approval';
import KpiGridSection, { type KpiItem } from './sections/KpiGridSection';
import TrendChartSection from './sections/TrendChartSection';
import StatusPieSection from './sections/StatusPieSection';
import BarChartSection from './sections/BarChartSection';
import RankingSection from './sections/RankingSection';
import TodoTaskSection from './sections/TodoTaskSection';
import QuickEntrySection from './sections/QuickEntrySection';

interface WorkbenchData {
  customers: IBizRecord[];
  ads: IBizRecord[];
  videos: IBizRecord[];
  contracts: IBizRecord[];
  finance: IBizRecord[];
  tasks: IBizRecord[];
  hr: IBizRecord[];
  admin: IBizRecord[];
  expense: IBizRecord[];
}

export default function WorkbenchPage() {
  const [data, setData] = useState<WorkbenchData | null>(null);

  useEffect(() => {
    let alive = true;
    void Promise.all([
      loadModuleRecords('customer', true),
      loadModuleRecords('ad', true),
      loadModuleRecords('video', true),
      loadModuleRecords('contract', true),
      loadModuleRecords('finance', true),
      loadModuleRecords('task', true),
      loadModuleRecords('hr', true),
      loadModuleRecords('admin', true),
      loadModuleRecords('expense', true),
    ]).then(([customers, ads, videos, contracts, finance, tasks, hr, admin, expense]) => {
      if (alive) setData({ customers, ads, videos, contracts, finance, tasks, hr, admin, expense });
    });
    return () => {
      alive = false;
    };
  }, []);

  if (!data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-64" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Skeleton className="h-[380px] lg:col-span-2" />
          <Skeleton className="h-[380px]" />
        </div>
      </div>
    );
  }

  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const year = String(now.getFullYear());
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // ---- 合同统计 ----
  const monthContract = data.contracts
    .filter((c) => String(c.values.signDate ?? '').startsWith(month))
    .reduce((sum, c) => sum + Number(c.values.amount ?? 0), 0);
  const totalContractAmount = data.contracts.reduce((sum, c) => sum + Number(c.values.amount ?? 0), 0);

  // ---- 收入统计 (收款记录表: registerDate=登记日期, amount=收款金额) ----
  const monthIncome = data.finance
    .filter((f) => String(f.values.registerDate ?? '').startsWith(month))
    .reduce((sum, f) => sum + Number(f.values.amount ?? 0), 0);
  const recent30Income = data.finance
    .filter((f) => {
      const d = String(f.values.registerDate ?? '');
      return d && new Date(d) >= thirtyDaysAgo;
    })
    .reduce((sum, f) => sum + Number(f.values.amount ?? 0), 0);
  const yearIncome = data.finance
    .filter((f) => String(f.values.registerDate ?? '').startsWith(year))
    .reduce((sum, f) => sum + Number(f.values.amount ?? 0), 0);

  // ---- 支出统计 (支出记录表: f9=支出时间, f3=支出金额) ----
  const monthExpense = data.expense
    .filter((f) => String(f.values.f9 ?? '').startsWith(month))
    .reduce((sum, f) => sum + Number(f.values.f3 ?? 0), 0);
  const recent30Expense = data.expense
    .filter((f) => {
      const d = String(f.values.f9 ?? '');
      return d && new Date(d) >= thirtyDaysAgo;
    })
    .reduce((sum, f) => sum + Number(f.values.f3 ?? 0), 0);
  const yearExpense = data.expense
    .filter((f) => String(f.values.f9 ?? '').startsWith(year))
    .reduce((sum, f) => sum + Number(f.values.f3 ?? 0), 0);

  const displayIncome = monthIncome > 0 ? monthIncome : recent30Income;
  const displayExpense = monthExpense > 0 ? monthExpense : recent30Expense;
  const incomeLabel = monthIncome > 0 ? '本月收入' : '近30天收入';
  const expenseLabel = monthExpense > 0 ? '本月支出' : '近30天支出';

  // ---- 在职员工: 排除 已离职、待离职 (含 试用期/正式/待转正/调岗中/休假中) ----
  const activeEmployees = data.hr.filter((e) => {
    const s = String(e.values.status ?? '');
    return s !== '已离职' && s !== '待离职';
  }).length;

  const pendingApprovals = fetchPendingApprovals().length;
  const todoCount = data.tasks.filter((t) => String(t.values.status ?? '') !== '已完成' && String(t.values.status ?? '') !== '已取消').length + pendingApprovals;
  const totalAssets = data.admin.length;

  const kpis: KpiItem[] = [
    { key: 'customers', label: '客户总数', value: String(data.customers.length), icon: Users, iconClassName: 'text-primary' },
    {
      key: 'contract',
      label: '合同总额',
      value: formatMoneyCompact(totalContractAmount),
      icon: FileText,
      iconClassName: 'text-primary',
    },
    {
      key: 'monthIncome',
      label: incomeLabel,
      value: formatMoneyCompact(displayIncome),
      desc: `${expenseLabel} ${formatMoneyCompact(displayExpense)} · 本年累计 ${formatMoneyCompact(yearIncome)}`,
      icon: TrendingUp,
      iconClassName: 'text-success',
    },
    {
      key: 'ads',
      label: '正常广告账户',
      value: String(data.ads.filter((a) => String(a.values.status ?? '') === '正常').length),
      icon: Megaphone,
      iconClassName: 'text-primary',
    },
    {
      key: 'videos',
      label: '进行中视频项目',
      value: String(data.videos.filter((v) => String(v.values.status ?? '') !== '已完成').length),
      icon: Video,
      iconClassName: 'text-primary',
    },
    {
      key: 'employees',
      label: '在职员工',
      value: String(activeEmployees),
      icon: Users,
      iconClassName: 'text-primary',
    },
    {
      key: 'tasks',
      label: '待办事项',
      value: String(todoCount),
      desc: pendingApprovals > 0 ? `含 ${pendingApprovals} 条待审批` : undefined,
      icon: CheckSquare,
      iconClassName: 'text-warning',
    },
    {
      key: 'assets',
      label: '行政资产',
      value: String(totalAssets),
      icon: Clock,
      iconClassName: 'text-primary',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">经营工作台</h2>
        <p className="mt-1 text-sm text-muted-foreground">牧唐数智一体化 · 全公司经营态势一屏总览</p>
      </div>

      <KpiGridSection items={kpis} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <TrendChartSection contracts={data.contracts} />
        </div>
        <StatusPieSection ads={data.ads} videos={data.videos} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <BarChartSection ads={data.ads} contracts={data.contracts} />
        </div>
        <RankingSection contracts={data.contracts} customers={data.customers} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <TodoTaskSection tasks={data.tasks} />
        </div>
        <QuickEntrySection />
      </div>
    </div>
  );
}