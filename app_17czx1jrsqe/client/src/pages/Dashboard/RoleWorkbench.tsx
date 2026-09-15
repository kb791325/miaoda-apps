import { useEffect, useMemo, useState, type ComponentType } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ReactECharts from 'echarts-for-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Users,
  Target,
  ClipboardList,
  Wallet,
  Receipt,
  FileText,
  Briefcase,
  CalendarClock,
  UserCheck,
  AlarmClock,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import {
  customersApi,
  leadsApi,
  paymentsApi,
  approvalsApi,
  refundsApi,
  invoicesApi,
  employeesApi,
  resumesApi,
  attendancesApi,
} from '@/api';
import { useApp } from '@/context/AppContext';
import { ROLE_LABELS, ROLE_DESCRIPTIONS } from '@/config/permissions';
import { formatAmount } from '@/lib/format';
import { CHART_COLORS } from '@/lib/chart-colors';
import { t, useLang } from '@/lib/i18n';

import type { Customer, Lead, Payment, TodoItem } from '@/api/types';

interface ListResult<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

/* ---------------- 共享小组件 ---------------- */

function RoleBanner({ icon: Icon, accent }: { icon: ComponentType<{ className?: string }>; accent: string }) {
  const { user } = useApp();
  const now = new Date();
  const dateStr = `${now.getMonth() + 1}月${now.getDate()}日 ${['周日', '周一', '周二', '周三', '周四', '周五', '周六'][now.getDay()]}`;
  const roleLabel = user?.role ? ROLE_LABELS[user.role] || user.role : '';
  const roleDesc = user?.role ? ROLE_DESCRIPTIONS[user.role] || '' : '';

  return (
    <div className="relative overflow-hidden rounded-xl border border-border/60 bg-card p-5">
      <div className={`absolute inset-y-0 left-0 w-1 ${accent}`} />
      <div className="flex flex-wrap items-center gap-4">
        <div className={`flex size-12 shrink-0 items-center justify-center rounded-xl ${accent} text-white`}>
          <Icon className="size-6" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-semibold text-foreground">
              {user?.name || ''}，{now.getHours() < 12 ? '上午好' : now.getHours() < 18 ? '下午好' : '晚上好'}
            </h1>
            <Badge variant="secondary" className="font-normal">{t(roleLabel)}{t('工作台')}</Badge>
          </div>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="size-3.5 shrink-0" />
            {t(roleDesc)} · {dateStr}
          </p>
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
  loading,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: ComponentType<{ className?: string }>;
  accent: string;
  loading?: boolean;
}) {
  return (
    <Card className="relative overflow-hidden">
      <div className={`absolute inset-y-0 left-0 w-1 ${accent}`} />
      <CardContent className="flex items-center gap-3 p-4 pl-5">
        <div className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${accent}/10`}>
          <Icon className={`size-5 ${accent.replace('bg-', 'text-')}`} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs text-muted-foreground">{label}</div>
          {loading ? (
            <Skeleton className="mt-1 h-6 w-20" />
          ) : (
            <div className="mt-0.5 truncate text-xl font-bold tabular-nums text-foreground">{value}</div>
          )}
          {sub && <div className="mt-0.5 text-[11px] text-muted-foreground">{sub}</div>}
        </div>
      </CardContent>
    </Card>
  );
}

function MoreLink({ to, label }: { to: string; label: string }) {
  return (
    <Link to={to} className="flex items-center gap-0.5 text-xs text-primary hover:underline">
      {label}
      <ChevronRight className="size-3" />
    </Link>
  );
}

const CUSTOMER_STATUS_LABELS: Record<string, string> = {
  active: '活跃',
  inactive: '停用',
  pending: '待激活',
  frozen: '冻结',
  lost: '流失',
};

const LEAD_STATUS_LABELS: Record<string, string> = {
  following: '跟进中',
  converted: '已转化',
  pending: '待跟进',
  lost: '已流失',
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: '待确认',
  confirmed: '已确认',
  reconciled: '已核销',
};

const TYPE_LABELS: Record<string, string> = {
  account_open: '开户审批',
  filing: '报备审批',
  transfer: '转户审批',
  refund: '退款审批',
  expense: '支出审批',
  purchase_requisition: '采购审批',
  purchase: '采购审批',
  contract: '合同审批',
};

/* ---------------- 商务工作台 ---------------- */

function SalesWorkbench() {
  useLang();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerTotal, setCustomerTotal] = useState(0);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadTotal, setLeadTotal] = useState(0);
  const [todoCount, setTodoCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [custRes, leadRes, todoRes] = await Promise.all([
          customersApi.list({ page: 1, pageSize: 6 }),
          leadsApi.list({ page: 1, pageSize: 6 }),
          approvalsApi.todo({}),
        ]);
        if (custRes.code === 0 && custRes.data) {
          const d = custRes.data as ListResult<Customer>;
          setCustomers(d.list || []);
          setCustomerTotal(d.total || 0);
        }
        if (leadRes.code === 0 && leadRes.data) {
          const d = leadRes.data as ListResult<Lead>;
          setLeads(d.list || []);
          setLeadTotal(d.total || 0);
        }
        if (todoRes.code === 0 && todoRes.data) {
          const d = todoRes.data as ListResult<TodoItem>;
          setTodoCount((d.list || []).length);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const trendDays = useMemo(() => {
    const days: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(`${d.getMonth() + 1}/${d.getDate()}`);
    }
    return days;
  }, []);
  const trendValues = useMemo(() => [8.2, 9.6, 7.4, 11.3, 10.1, 12.8, 9.4], []);

  const trendOption = useMemo(
    () => ({
      color: [CHART_COLORS[0]],
      grid: { left: 40, right: 16, top: 24, bottom: 28 },
      tooltip: { trigger: 'axis', valueFormatter: (v: number) => `${v} 万元` },
      xAxis: {
        type: 'category',
        data: trendDays,
        axisLine: { lineStyle: { color: '#E5E6EB' } },
        axisLabel: { color: '#86909C', fontSize: 11 },
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: '#86909C', fontSize: 11 },
        splitLine: { lineStyle: { color: '#F2F3F5' } },
      },
      series: [
        {
          name: '我的客户消耗',
          type: 'line',
          smooth: true,
          data: trendValues,
          areaStyle: { color: 'rgba(22,119,255,0.08)' },
          lineStyle: { width: 2 },
        },
      ],
    }),
    [trendDays, trendValues],
  );

  return (
    <div className="space-y-4">
      <RoleBanner icon={Briefcase} accent="bg-primary" />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="我的客户" value={String(customerTotal)} sub="较上月 +3" icon={Users} accent="bg-primary" loading={loading} />
        <KpiCard label="跟进线索" value={String(leadTotal)} sub="3 条今日需跟进" icon={Target} accent="bg-[#0D9488]" loading={loading} />
        <KpiCard label="待我审批" value={String(todoCount)} sub="审批平均时长 0.6 天" icon={ClipboardList} accent="bg-[#F59E0B]" loading={loading} />
        <KpiCard label="本月业绩达成" value="68%" sub="目标 120 万元" icon={Wallet} accent="bg-[#0E42D2]" loading={loading} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t('近 7 天我的客户消耗（万元）')}</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <ReactECharts option={trendOption} style={{ height: 220 }} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">{t('最近录入客户')}</CardTitle>
            <MoreLink to="/customer/customers" label={t('查看全部')} />
          </CardHeader>
          <CardContent className="p-0">
            <div className="w-full overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">{t('客户名称')}</TableHead>
                    <TableHead className="whitespace-nowrap">{t('行业')}</TableHead>
                    <TableHead className="whitespace-nowrap">{t('等级')}</TableHead>
                    <TableHead className="whitespace-nowrap">{t('状态')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading &&
                    [1, 2, 3].map((i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={4}>
                          <Skeleton className="h-5 w-full" />
                        </TableCell>
                      </TableRow>
                    ))}
                  {!loading &&
                    customers.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell>
                          <Link to={`/customer/customers/${c.id}`} className="block max-w-[200px] truncate font-medium text-primary hover:underline">
                            {c.customer_name}
                          </Link>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">{c.primary_industry}</TableCell>
                        <TableCell><Badge variant="outline" className="font-normal">{c.level}</Badge></TableCell>
                        <TableCell><Badge variant="secondary" className="font-normal">{CUSTOMER_STATUS_LABELS[c.status] || c.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm">{t('线索跟进提醒')}</CardTitle>
          <MoreLink to="/customer/clues" label={t('线索管理')} />
        </CardHeader>
        <CardContent className="space-y-2 p-4 pt-2">
          {loading && [1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
          {!loading &&
            leads.map((l) => (
              <Link
                key={l.id}
                to={`/customer/clues/${l.id}`}
                className="flex items-center gap-3 rounded-lg border border-border/60 px-3 py-2.5 transition-colors hover:bg-muted/50"
              >
                <Target className="size-4 shrink-0 text-primary" />
                <span className="flex-1 truncate text-sm font-medium">{l.lead_name}</span>
                {l.company_name && <span className="hidden max-w-[180px] truncate text-xs text-muted-foreground md:block">{l.company_name}</span>}
                <Badge variant="outline" className="shrink-0 font-normal">{LEAD_STATUS_LABELS[l.status] || l.status}</Badge>
                {l.last_follow_at && (
                  <span className="hidden shrink-0 text-xs text-muted-foreground sm:block">
                    {t('上次跟进')} {String(l.last_follow_at).slice(0, 10)}
                  </span>
                )}
              </Link>
            ))}
        </CardContent>
      </Card>
    </div>
  );
}

/* ---------------- 财务工作台 ---------------- */

function FinanceWorkbench() {
  useLang();
  const navigate = useNavigate();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [monthTotal, setMonthTotal] = useState(0);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [pendingRefunds, setPendingRefunds] = useState(0);
  const [pendingInvoices, setPendingInvoices] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [payRes, todoRes, refundRes, invoiceRes] = await Promise.all([
          paymentsApi.list({ page: 1, pageSize: 50 }),
          approvalsApi.todo({}),
          refundsApi.list({ page: 1, pageSize: 100 }),
          invoicesApi.list({ page: 1, pageSize: 100 }),
        ]);
        if (payRes.code === 0 && payRes.data) {
          const d = payRes.data as ListResult<Payment>;
          const list = d.list || [];
          setPayments(list.slice(0, 6));
          setMonthTotal(list.reduce((s, p) => s + (p.receipt_amount || 0), 0));
        }
        if (todoRes.code === 0 && todoRes.data) {
          const d = todoRes.data as ListResult<TodoItem>;
          setTodos((d.list || []).slice(0, 5));
        }
        if (refundRes.code === 0 && refundRes.data) {
          const d = refundRes.data as ListResult<{ status: string }>;
          setPendingRefunds((d.list || []).filter((r) => r.status === 'pending_approval' || r.status === 'approving').length);
        }
        if (invoiceRes.code === 0 && invoiceRes.data) {
          const d = invoiceRes.data as ListResult<{ status: string }>;
          setPendingInvoices((d.list || []).filter((v) => v.status === '待开').length);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const barOption = useMemo(() => {
    const days: string[] = [];
    const values: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(`${d.getMonth() + 1}/${d.getDate()}`);
      values.push(Math.round(180 + Math.sin(i * 1.7) * 90 + i * 12));
    }
    return {
      color: [CHART_COLORS[0]],
      grid: { left: 48, right: 16, top: 24, bottom: 28 },
      tooltip: { trigger: 'axis', valueFormatter: (v: number) => `${v} 万元` },
      xAxis: {
        type: 'category',
        data: days,
        axisLine: { lineStyle: { color: '#E5E6EB' } },
        axisLabel: { color: '#86909C', fontSize: 11 },
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: '#86909C', fontSize: 11 },
        splitLine: { lineStyle: { color: '#F2F3F5' } },
      },
      series: [{ name: '收款金额', type: 'bar', data: values, barWidth: 18, itemStyle: { borderRadius: [4, 4, 0, 0] } }],
    };
  }, []);

  return (
    <div className="space-y-4">
      <RoleBanner icon={Wallet} accent="bg-[#0D9488]" />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="本月收款总额" value={formatAmount(monthTotal)} sub="较上月 +12.6%" icon={Receipt} accent="bg-[#0D9488]" loading={loading} />
        <KpiCard label="待审批退款" value={String(pendingRefunds)} sub="涉及金额需财务复核" icon={FileText} accent="bg-[#EF4444]" loading={loading} />
        <KpiCard label="待开发票" value={String(pendingInvoices)} sub="含专票 8 张" icon={Target} accent="bg-[#F59E0B]" loading={loading} />
        <KpiCard label="待我审批" value={String(todos.length)} sub="点击前往任务中心处理" icon={ClipboardList} accent="bg-primary" loading={loading} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t('近 7 天收款金额（万元）')}</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <ReactECharts option={barOption} style={{ height: 220 }} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">{t('待办审批')}</CardTitle>
            <MoreLink to="/task/my-todo" label={t('任务中心')} />
          </CardHeader>
          <CardContent className="space-y-2 p-4 pt-2">
            {loading && [1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
            {!loading && todos.length === 0 && (
              <div className="py-6 text-center text-sm text-muted-foreground">{t('暂无待办审批，全部处理完成')}</div>
            )}
            {!loading &&
              todos.map((todo) => (
                <button
                  key={todo.id}
                  type="button"
                  onClick={() => navigate('/task/my-todo')}
                  className="flex w-full items-center gap-3 rounded-lg border border-border/60 px-3 py-2.5 text-left transition-colors hover:bg-muted/50"
                >
                  <Badge variant="outline" className="shrink-0 font-normal">{TYPE_LABELS[todo.business_type] || todo.business_type}</Badge>
                  <span className="flex-1 truncate text-sm font-medium">{todo.title}</span>
                  <span className="hidden text-xs text-muted-foreground sm:block">{t('申请人')}：{todo.applicant_name}</span>
                  {todo.amount != null && (
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">{formatAmount(todo.amount)}</span>
                  )}
                </button>
              ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm">{t('最近收款记录')}</CardTitle>
          <MoreLink to="/finance/receipts" label={t('收款管理')} />
        </CardHeader>
        <CardContent className="p-0">
          <div className="w-full overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">{t('收款单号')}</TableHead>
                  <TableHead className="whitespace-nowrap">{t('客户名称')}</TableHead>
                  <TableHead className="whitespace-nowrap text-right">{t('金额')}</TableHead>
                  <TableHead className="whitespace-nowrap">{t('状态')}</TableHead>
                  <TableHead className="whitespace-nowrap">{t('时间')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading &&
                  [1, 2, 3].map((i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={5}>
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    </TableRow>
                  ))}
                {!loading &&
                  payments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs text-muted-foreground">{p.receipt_no}</TableCell>
                      <TableCell><span className="block max-w-[180px] truncate font-medium">{p.customer_name}</span></TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">{formatAmount(p.receipt_amount)}</TableCell>
                      <TableCell><Badge variant="secondary" className="font-normal">{PAYMENT_STATUS_LABELS[p.status] || p.status}</Badge></TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{String(p.created_at || '').slice(0, 10)}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ---------------- 人事工作台 ---------------- */

interface HrEmployeeRow { id: number; name: string; status: string }
interface HrResumeRow { id: number; name: string; position: string; source: string; status: string; created_at?: string }
interface HrAttendanceRow { id: number; employee_name: string; department: string; attend_month: string; late_count: number; early_count: number }

const HR_RESUME_STATUS_MAP: Record<string, string> = {
  pending_review: '待筛选',
  invited: '已邀约',
  interviewing: '面试中',
  hired: '已录用',
  rejected: '已拒绝',
};

function HrWorkbench() {
  useLang();

  const [employees, setEmployees] = useState<HrEmployeeRow[]>([]);
  const [resumes, setResumes] = useState<HrResumeRow[]>([]);
  const [attendance, setAttendance] = useState<HrAttendanceRow[]>([]);
  const [hrLoading, setHrLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setHrLoading(true);
      try {
        const [empRes, resumeRes, attRes] = await Promise.all([
          employeesApi.list({ page: 1, pageSize: 100 }),
          resumesApi.list({ page: 1, pageSize: 50 }),
          attendancesApi.list({ page: 1, pageSize: 100 }),
        ]);
        if (empRes.code === 0 && empRes.data) setEmployees(((empRes.data as ListResult<HrEmployeeRow>).list || []));
        if (resumeRes.code === 0 && resumeRes.data) setResumes(((resumeRes.data as ListResult<HrResumeRow>).list || []));
        if (attRes.code === 0 && attRes.data) setAttendance(((attRes.data as ListResult<HrAttendanceRow>).list || []));
      } finally {
        setHrLoading(false);
      }
    }
    load();
  }, []);

  const stats = useMemo(() => {
    const active = employees.filter((e) => e.status === 'active').length;
    const pendingResumes = resumes.filter((r) => r.status === 'pending_review').length;
    const interviewing = resumes.filter((r) => r.status === 'interviewing').length;
    const abnormal = attendance.filter((a) => (a.late_count || 0) > 0 || (a.early_count || 0) > 0).length;
    return { active, pendingResumes, interviewing, abnormal };
  }, [employees, resumes, attendance]);

  const funnelOption = useMemo(() => {
    const total = resumes.length;
    const screened = resumes.filter((r) => r.status !== 'pending_review').length;
    const invited = resumes.filter((r) => r.status === 'interviewing' || r.status === 'hired').length;
    const offered = resumes.filter((r) => r.status === 'hired').length;
    return {
      color: [CHART_COLORS[0]],
      grid: { left: 80, right: 32, top: 16, bottom: 28 },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      xAxis: {
        type: 'value',
        axisLabel: { color: '#86909C', fontSize: 11 },
        splitLine: { lineStyle: { color: '#F2F3F5' } },
      },
      yAxis: {
        type: 'category',
        data: ['收到简历', '筛选通过', '已邀约面试', '已发 Offer'],
        axisLine: { lineStyle: { color: '#E5E6EB' } },
        axisLabel: { color: '#4E5969', fontSize: 11 },
      },
      series: [
        {
          name: '人数',
          type: 'bar',
          data: [total, screened, invited, offered],
          barWidth: 16,
          itemStyle: { borderRadius: [0, 4, 4, 0] },
        },
      ],
    };
  }, [resumes]);

  const abnormalList = useMemo(
    () => attendance.filter((a) => (a.late_count || 0) > 0 || (a.early_count || 0) > 0).slice(0, 6),
    [attendance],
  );

  return (
    <div className="space-y-4">
      <RoleBanner icon={UserCheck} accent="bg-[#0E42D2]" />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="在职员工" value={String(stats.active)} sub="本月入职 3 人" icon={Users} accent="bg-[#0E42D2]" loading={hrLoading} />
        <KpiCard label="待筛选简历" value={String(stats.pendingResumes)} sub="平均停留 1.8 天" icon={FileText} accent="bg-primary" loading={hrLoading} />
        <KpiCard label="面试进行中" value={String(stats.interviewing)} sub="本周安排 5 场" icon={CalendarClock} accent="bg-[#0D9488]" loading={hrLoading} />
        <KpiCard label="考勤异常" value={String(stats.abnormal)} sub="迟到/早退人次" icon={AlarmClock} accent="bg-[#F59E0B]" loading={hrLoading} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t('本月招聘漏斗')}</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <ReactECharts option={funnelOption} style={{ height: 220 }} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">{t('最新投递简历')}</CardTitle>
            <MoreLink to="/hr/resumes" label={t('简历管理')} />
          </CardHeader>
          <CardContent className="p-0">
            <div className="w-full overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">{t('候选人')}</TableHead>
                    <TableHead className="whitespace-nowrap">{t('应聘岗位')}</TableHead>
                    <TableHead className="whitespace-nowrap">{t('来源')}</TableHead>
                    <TableHead className="whitespace-nowrap">{t('状态')}</TableHead>
                    <TableHead className="whitespace-nowrap">{t('投递时间')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {hrLoading &&
                    [1, 2, 3].map((i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={5}>
                          <Skeleton className="h-5 w-full" />
                        </TableCell>
                      </TableRow>
                    ))}
                  {!hrLoading &&
                    resumes.slice(0, 6).map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.name}</TableCell>
                        <TableCell className="whitespace-nowrap">{r.position}</TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">{r.source}</TableCell>
                        <TableCell><Badge variant="secondary" className="font-normal">{HR_RESUME_STATUS_MAP[r.status] || r.status}</Badge></TableCell>
                        <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{String(r.created_at || '').slice(0, 10)}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm">{t('考勤异常关注')}</CardTitle>
          <MoreLink to="/hr/attendance" label={t('考勤管理')} />
        </CardHeader>
        <CardContent className="space-y-2 p-4 pt-2">
          {hrLoading && [1, 2].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
          {!hrLoading && abnormalList.length === 0 && (
            <div className="py-4 text-center text-sm text-muted-foreground">本月暂无考勤异常记录</div>
          )}
          {!hrLoading &&
            abnormalList.map((a) => (
              <div key={a.id} className="flex items-center gap-3 rounded-lg border border-border/60 px-3 py-2.5">
                <AlarmClock className="size-4 shrink-0 text-[#F59E0B]" />
                <span className="flex-1 truncate text-sm font-medium">{a.employee_name}</span>
                <span className="hidden text-xs text-muted-foreground md:block">{a.department} · {a.attend_month}</span>
                {(a.late_count || 0) > 0 && <Badge variant="outline" className="shrink-0 font-normal">{t('迟到')} {a.late_count} {t('次')}</Badge>}
                {(a.early_count || 0) > 0 && <Badge variant="outline" className="shrink-0 font-normal">{t('早退')} {a.early_count} {t('次')}</Badge>}
              </div>
            ))}
        </CardContent>
      </Card>
    </div>
  );
}

/* ---------------- 分发 ---------------- */

export default function RoleWorkbench({ role }: { role: string }) {
  if (role === 'sales') return <SalesWorkbench />;
  if (role === 'finance') return <FinanceWorkbench />;
  if (role === 'hr') return <HrWorkbench />;
  return <SalesWorkbench />;
}
