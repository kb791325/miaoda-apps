import { useState, useEffect, useMemo } from 'react';
import { t } from '@/lib/i18n';
import ReactECharts from 'echarts-for-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, UserPlus, UserMinus, Briefcase, TrendingUp, PieChart, BadgeCheck, CalendarClock } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import StatusBadge from '@/components/StatusBadge';
import { employeesApi, resumesApi, recruitPlansApi, attendancesApi } from '@/api';

interface EmployeeRow {
  id: number;
  employee_no: string;
  name: string;
  department: string;
  position: string;
  join_date: string;
  leave_date?: string;
  status: string;
}

interface AttendanceRow {
  id: number;
  attend_month: string;
  work_days: number;
  overtime_hours: number;
  leave_days: number;
}

interface ResumeRow {
  id: number;
  name: string;
  position: string;
  status: string;
}

interface JobRow {
  id: number;
  plan_no: string;
  position: string;
  status: string;
}

const EMP_STATUS_MAP: Record<string, string> = {
  active: '在职',
  probation: '试用',
  resigned: '离职',
};

const RESUME_STATUS_MAP: Record<string, string> = {
  pending_review: '待筛选',
  invited: '已邀约',
  interviewing: '面试中',
  hired: '已录用',
  rejected: '已拒绝',
};

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function HRDashboardPage() {
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [attendances, setAttendances] = useState<AttendanceRow[]>([]);
  const [resumes, setResumes] = useState<ResumeRow[]>([]);
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [empRes, attRes, resumeRes, jobRes] = await Promise.all([
        employeesApi.list({ page: 1, pageSize: 500 }),
        attendancesApi.list({ page: 1, pageSize: 1000 }),
        resumesApi.list({ page: 1, pageSize: 500 }),
        recruitPlansApi.list({ page: 1, pageSize: 100 }),
      ]);
      if (empRes.code === 0 && empRes.data) setEmployees(empRes.data.list || []);
      if (attRes.code === 0 && attRes.data) setAttendances(attRes.data.list || []);
      if (resumeRes.code === 0 && resumeRes.data) setResumes(resumeRes.data.list || []);
      if (jobRes.code === 0 && jobRes.data) setJobs(jobRes.data.list || []);
    }
    setLoading(true);
    load()
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const currentMonth = monthKey(new Date());

  const stats = useMemo(() => {
    const activeList = employees.filter((e) => e.status !== 'resigned');
    const joinedThisMonth = employees.filter((e) => e.join_date?.startsWith(currentMonth));
    const leftThisMonth = employees.filter((e) => e.leave_date?.startsWith(currentMonth));
    const openJobs = jobs.filter((j) => j.status === 'recruiting');
    const awaiting = resumes.filter((r) => r.status === 'pending_review');

    // 平均司龄（月）
    const now = new Date();
    const tenures = activeList
      .filter((e) => e.join_date)
      .map((e) => {
        const jd = new Date(e.join_date);
        return Math.max(0, (now.getFullYear() - jd.getFullYear()) * 12 + now.getMonth() - jd.getMonth());
      });
    const avgTenure = tenures.length ? (tenures.reduce((a, b) => a + b, 0) / tenures.length).toFixed(1) : '0';

    // 当月考勤
    const monthAtt = attendances.filter((a) => a.attend_month === currentMonth);
    const avgAttend = monthAtt.length
      ? (monthAtt.reduce((s, a) => s + (a.work_days || 0), 0) / monthAtt.length).toFixed(1)
      : '—';
    const totalOvertime = monthAtt.reduce((s, a) => s + (a.overtime_hours || 0), 0);

    return {
      activeCount: activeList.length,
      joinedThisMonth: joinedThisMonth.length,
      leftThisMonth: leftThisMonth.length,
      openJobCount: openJobs.length,
      awaitingCount: awaiting.length,
      avgTenure,
      avgAttend,
      totalOvertime,
      recentJoined: [...joinedThisMonth].sort((a, b) => b.join_date.localeCompare(a.join_date)).slice(0, 5),
      recentLeft: [...leftThisMonth].sort((a, b) => (b.leave_date || '').localeCompare(a.leave_date || '')).slice(0, 5),
    };
  }, [employees, attendances, resumes, jobs, currentMonth]);

  // 近 6 个月入离职趋势（由员工入离职日期聚合）
  const trendOption = useMemo(() => {
    const months: string[] = [];
    const d = new Date();
    for (let i = 5; i >= 0; i--) {
      const md = new Date(d.getFullYear(), d.getMonth() - i, 1);
      months.push(monthKey(md));
    }
    const joins = months.map((m) => employees.filter((e) => e.join_date?.startsWith(m)).length);
    const leaves = months.map((m) => employees.filter((e) => e.leave_date?.startsWith(m)).length);
    return {
      color: ['#1677FF', '#F5222D'],
      tooltip: { trigger: 'axis' as const },
      legend: { bottom: 0, textStyle: { fontSize: 11 }, itemWidth: 12, itemHeight: 8 },
      grid: { top: 20, left: 30, right: 20, bottom: 40 },
      xAxis: {
        type: 'category' as const,
        data: months.map((m) => m.slice(5) + '月'),
        axisLine: { lineStyle: { color: '#E5E6EB' } },
        axisLabel: { color: '#4E5969' },
      },
      yAxis: {
        type: 'value' as const,
        minInterval: 1,
        splitLine: { lineStyle: { color: '#F2F3F5' } },
        axisLabel: { color: '#4E5969' },
      },
      series: [
        { name: '入职', type: 'line' as const, smooth: true, data: joins, symbolSize: 6, areaStyle: { opacity: 0.08 } },
        { name: '离职', type: 'line' as const, smooth: true, data: leaves, symbolSize: 6, areaStyle: { opacity: 0.08 } },
      ],
    };
  }, [employees]);

  const deptOption = useMemo(() => {
    const byDept = new Map<string, number>();
    employees
      .filter((e) => e.status !== 'resigned')
      .forEach((e) => byDept.set(e.department, (byDept.get(e.department) || 0) + 1));
    const data = Array.from(byDept.entries()).map(([name, value]) => ({ name, value }));
    return {
      color: ['#1677FF', '#0D9488', '#36B37E', '#FAAD14', '#1890FF', '#722ED1', '#13C2C2'],
      tooltip: { trigger: 'item' as const, formatter: '{b}: {c}人 ({d}%)' },
      legend: { bottom: 0, itemWidth: 8, itemHeight: 8, textStyle: { fontSize: 11 } },
      series: [{
        type: 'pie' as const,
        radius: ['40%', '65%'],
        center: ['50%', '45%'],
        itemStyle: { borderRadius: 4, borderColor: '#fff', borderWidth: 2 },
        label: { show: false },
        data,
      }],
    };
  }, [employees]);

  const mainStats = [
    { label: '在职人数', value: stats.activeCount, icon: Users, bg: 'bg-[#E8F4FF]', color: 'text-[#1677FF]', change: '实时更新' },
    { label: '本月入职', value: stats.joinedThisMonth, icon: UserPlus, bg: 'bg-[#E6F7F4]', color: 'text-[#0D9488]', change: `${currentMonth} 入职` },
    { label: '本月离职', value: stats.leftThisMonth, icon: UserMinus, bg: 'bg-[#FFF1F0]', color: 'text-[#F5222D]', change: `${currentMonth} 离职` },
    { label: '招聘中岗位', value: stats.openJobCount, icon: Briefcase, bg: 'bg-[#F0F5FF]', color: 'text-[#1890FF]', change: `${stats.awaitingCount} 份简历待筛选` },
  ];

  return (
    <div className="space-y-4">
      <PageHeader title={t('人资看板')} description={t('人力资源数据总览（数据来自员工、考勤、招聘模块实时统计）')} />

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {loading
          ? [1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28 w-full" />)
          : mainStats.map((s) => {
            const Icon = s.icon;
            return (
              <Card key={s.label} className="shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-xs text-muted-foreground">{s.label}</div>
                      <div className="mt-2 text-2xl font-bold tabular-nums">{s.value}</div>
                    </div>
                    <div className={`flex size-10 items-center justify-center rounded-lg ${s.bg}`}>
                      <Icon className={`size-5 ${s.color}`} />
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">{s.change}</div>
                </CardContent>
              </Card>
            );
          })}
      </div>

      {/* 次要指标 */}
      {!loading && (
        <div className="grid grid-cols-3 gap-3">
          <Card className="shadow-sm">
            <CardContent className="flex items-center gap-3 p-4">
              <CalendarClock className="size-5 text-primary" />
              <div>
                <div className="text-xs text-muted-foreground">平均司龄</div>
                <div className="text-lg font-semibold tabular-nums">{stats.avgTenure} <span className="text-xs font-normal text-muted-foreground">个月</span></div>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="flex items-center gap-3 p-4">
              <BadgeCheck className="size-5 text-[#0D9488]" />
              <div>
                <div className="text-xs text-muted-foreground">本月人均出勤</div>
                <div className="text-lg font-semibold tabular-nums">{stats.avgAttend} <span className="text-xs font-normal text-muted-foreground">天</span></div>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="flex items-center gap-3 p-4">
              <TrendingUp className="size-5 text-[#FAAD14]" />
              <div>
                <div className="text-xs text-muted-foreground">本月加班合计</div>
                <div className="text-lg font-semibold tabular-nums">{stats.totalOvertime} <span className="text-xs font-normal text-muted-foreground">小时</span></div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 图表区 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="shadow-sm lg:col-span-2">
          <CardHeader className="pb-0">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <TrendingUp className="size-4 text-primary" />
              入离职趋势（近 6 个月）
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {loading ? <Skeleton className="h-[300px] w-full" /> : <ReactECharts option={trendOption} style={{ height: 300 }} />}
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="pb-0">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <PieChart className="size-4 text-primary" />
              部门人数分布
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {loading ? <Skeleton className="h-[300px] w-full" /> : <ReactECharts option={deptOption} style={{ height: 300 }} />}
          </CardContent>
        </Card>
      </div>

      {/* 入离职名单 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <UserPlus className="size-4 text-[#0D9488]" />
              本月入职名单
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading && <Skeleton className="h-24 w-full" />}
            {!loading && stats.recentJoined.length === 0 && (
              <div className="py-6 text-center text-sm text-muted-foreground">本月暂无新入职员工</div>
            )}
            {!loading && stats.recentJoined.map((e) => (
              <div key={e.id} className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{e.name}</span>
                  <span className="text-xs text-muted-foreground">{e.department} · {e.position}</span>
                </div>
                <span className="text-xs tabular-nums text-muted-foreground">{e.join_date}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <UserMinus className="size-4 text-[#F5222D]" />
              本月离职名单
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading && <Skeleton className="h-24 w-full" />}
            {!loading && stats.recentLeft.length === 0 && (
              <div className="py-6 text-center text-sm text-muted-foreground">本月暂无离职员工</div>
            )}
            {!loading && stats.recentLeft.map((e) => (
              <div key={e.id} className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{e.name}</span>
                  <span className="text-xs text-muted-foreground">{e.department} · {e.position}</span>
                  <StatusBadge status={EMP_STATUS_MAP[e.status] || e.status} />
                </div>
                <span className="text-xs tabular-nums text-muted-foreground">{e.leave_date || '—'}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* 招聘进展速览 */}
      {!loading && (
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">招聘进展速览（简历库状态分布）</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            {Object.entries(RESUME_STATUS_MAP).map(([code, label]) => {
              const count = resumes.filter((r) => r.status === code).length;
              return (
                <div key={code} className="flex items-center gap-2 rounded-lg border border-border/60 px-4 py-2">
                  <span className="text-xs text-muted-foreground">{label}</span>
                  <span className="text-base font-semibold tabular-nums">{count}</span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
