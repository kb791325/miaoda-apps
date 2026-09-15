import { useEffect, useMemo, useState } from 'react';
import { Briefcase, CalendarClock, UserPlus, Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { loadModuleRecords } from '@/lib/data-service';
import type { IBizRecord } from '@/data/mt-records';
import { groupCount, monthly, recentMonths, val } from '@/lib/analytics';
import { BarChartCard, KpiStrip, LineChartCard, PieChartCard } from '@/components/analytics/Charts';

interface D {
  hr: IBizRecord[];
  attendance: IBizRecord[];
  resume: IBizRecord[];
}

/** 人资管理 · 人资看板(人员结构 / 招聘 / 考勤) */
export default function HrDashboardPage() {
  const [d, setD] = useState<D | null>(null);
  useEffect(() => {
    let alive = true;
    void Promise.all([loadModuleRecords('hr', true), loadModuleRecords('attendance', true), loadModuleRecords('resume', true)]).then(
      ([hr, attendance, resume]) => {
        if (alive) setD({ hr, attendance, resume });
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

  const empStatus = groupCount(d.hr, 'hr', '员工状态');
  const empDept = groupCount(d.hr, 'hr', '部门');
  const empPos = groupCount(d.hr, 'hr', '岗位');
  const resumeStatus = groupCount(d.resume, 'resume', '简历状态');
  const attendStatus = groupCount(d.attendance, 'attendance', '考勤状态');
  const activeCount = d.hr.filter((r) => {
    const s = val(r, 'hr', '员工状态');
    return s && s !== '已离职' && s !== '待离职';
  }).length;
  const departments = new Set(d.hr.map((r) => val(r, 'hr', '部门')).filter(Boolean)).size;
  const probation = empStatus.find((x) => x.name === '试用期')?.value ?? 0;
  const abnormal = attendStatus
    .filter((x) => ['迟到', '早退', '缺勤'].includes(x.name))
    .reduce((s, x) => s + x.value, 0);
  const interviewing = resumeStatus.filter((x) => ['面试中', '已通过筛选', '待筛选', '新简历'].includes(x.name)).reduce((s, x) => s + x.value, 0);
  const hireTrend = monthly(d.hr, 'hr', '入职日期', months);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">人资看板</h2>
        <p className="mt-1 text-sm text-muted-foreground">人员结构、招聘进展与考勤异常的综合视图</p>
      </div>

      <KpiStrip
        items={[
          { label: '在职员工', value: activeCount, icon: Users },
          { label: '覆盖部门', value: departments, icon: Briefcase },
          { label: '试用期员工', value: probation, icon: UserPlus },
          { label: '招聘在途简历', value: interviewing, icon: UserPlus },
          { label: '考勤异常记录', value: abnormal, icon: CalendarClock, tone: 'text-destructive' },
          { label: '员工总数', value: d.hr.length, icon: Users },
        ]}
      />

      <LineChartCard title="近 6 个月入职趋势" desc="按入职日期归月" months={months.map((m) => m.slice(2))} series={[{ name: '新入职', data: hireTrend }]} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <PieChartCard title="员工状态分布" data={empStatus} />
        <PieChartCard title="部门人员分布" data={empDept} />
        <BarChartCard title="岗位编制分布" data={empPos} horizontal />
        <BarChartCard title="招聘漏斗（简历状态）" data={resumeStatus} />
        <PieChartCard title="考勤状态分布" data={attendStatus} />
      </div>
    </div>
  );
}
