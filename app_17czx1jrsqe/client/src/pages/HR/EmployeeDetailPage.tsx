import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, UserRound, FileText, Wallet, CalendarClock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import StatusBadge from '@/components/StatusBadge';
import { ProtectedText } from '@/components/ProtectedField';
import { formatAmount } from '@/lib/format';
import { employeesApi } from '@/api';
import type { Employee } from '@/api/types';

const EMP_STATUS_MAP: Record<string, string> = { active: '在职', probation: '试用', resigned: '离职' };

/** 基于员工 id 的确定性伪随机（保证每次进入同一员工数据稳定） */
function seededRand(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 100000;
  return () => {
    h = (h * 9301 + 49297) % 233280;
    return h / 233280;
  };
}

function InfoItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm font-medium">{value}</div>
    </div>
  );
}

export default function EmployeeDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    employeesApi.list({ pageSize: 100 })
      .then((res) => {
        if (cancelled) return;
        if (res.code === 0) setEmployees((res.data?.list || []) as Employee[]);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
    return () => { cancelled = true; };
  }, []);

  const employee = useMemo(() => employees.find((e) => String(e.id) === id), [employees, id]);

  const [showSalary, setShowSalary] = useState(false);

  // 合同信息（基于入职日期推导）
  const contract = useMemo(() => {
    if (!employee) return null;
    const rnd = seededRand(String(employee.id) + 'contract');
    const start = employee.join_date || '';
    const end = employee.contract_expire_date
      || (start ? `${Number(start.slice(0, 4)) + 3}${start.slice(4)}` : '-');
    const renew = Math.floor(rnd() * 3);
    return {
      type: '固定期限劳动合同',
      start: start || '-',
      end,
      renewCount: renew,
      status: employee.status === 'resigned' ? '已终止' : renew > 0 ? '已续签' : '履行中',
      signCompany: '牧唐数智科技有限公司',
    };
  }, [employee]);

  // 最近 6 个月薪资
  const salaryRows = useMemo(() => {
    if (!employee) return [];
    const rnd = seededRand(String(employee.id) + 'salary');
    const base = 8000 + Math.floor(rnd() * 12000);
    return Array.from({ length: 6 }, (_, i) => {
      const perf = Math.floor(rnd() * 8000);
      const subsidy = Math.floor(rnd() * 800);
      const deduction = Math.floor(rnd() * 2000);
      return {
        month: `2026-${String(3 + i).padStart(2, '0')}`,
        baseSalary: base,
        perfSalary: perf,
        subsidy,
        deduction,
        actual: base + perf + subsidy - deduction,
        status: i < 5 ? '已发放' : '待发放',
      };
    }).reverse();
  }, [employee]);

  // 最近 6 个月考勤
  const attendanceRows = useMemo(() => {
    if (!employee) return [];
    const rnd = seededRand(String(employee.id) + 'attendance');
    return Array.from({ length: 6 }, (_, i) => ({
      month: `2026-${String(3 + i).padStart(2, '0')}`,
      workDays: 20 + Math.floor(rnd() * 3),
      lateCount: Math.floor(rnd() * 4),
      earlyLeaveCount: Math.floor(rnd() * 2),
      leaveDays: Math.floor(rnd() * 3),
      overtimeHours: Math.floor(rnd() * 30),
    })).reverse();
  }, [employee]);

  if (loaded && !employee) return <Navigate to="/hr/employees" replace />;
  if (!loaded || !employee) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">加载中…</div>
    );
  }

  const maskCls = showSalary ? '' : 'select-none';
  const renderAmount = (v: number) =>
    showSalary ? (
      <span className="tabular-nums">{formatAmount(v)}</span>
    ) : (
      <span className={`tabular-nums text-muted-foreground ${maskCls}`}>¥****.**</span>
    );

  return (
    <div className="space-y-4">
      {/* 顶部关键信息条 */}
      <Card className="shadow-sm">
        <CardContent className="flex flex-wrap items-center gap-4 p-5">
          <Button variant="ghost" size="sm" onClick={() => navigate('/hr/employees')}>
            <ArrowLeft className="size-4" /> 返回
          </Button>
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
            {employee.name.slice(0, 1)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold">{employee.name}</span>
              <Badge variant="outline" className="text-xs font-normal">{employee.employee_no}</Badge>
              <StatusBadge status={EMP_STATUS_MAP[employee.status] || employee.status} />
            </div>
            <div className="mt-0.5 text-sm text-muted-foreground">
              {employee.department} · {employee.position} · 入职日期 {employee.join_date}
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="basic">
        <TabsList>
          <TabsTrigger value="basic"><UserRound className="mr-1.5 size-3.5" />基本信息</TabsTrigger>
          <TabsTrigger value="contract"><FileText className="mr-1.5 size-3.5" />合同信息</TabsTrigger>
          <TabsTrigger value="salary"><Wallet className="mr-1.5 size-3.5" />薪资信息</TabsTrigger>
          <TabsTrigger value="attendance"><CalendarClock className="mr-1.5 size-3.5" />考勤记录</TabsTrigger>
        </TabsList>

        {/* 基本信息 */}
        <TabsContent value="basic" className="mt-4">
          <Card className="shadow-sm">
            <CardHeader><CardTitle className="text-base">基本信息</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-3">
                <InfoItem label="工号" value={employee.employee_no} />
                <InfoItem label="姓名" value={employee.name} />
                <InfoItem label="性别" value={employee.gender || '-'} />
                <InfoItem label="部门" value={employee.department} />
                <InfoItem label="岗位" value={employee.position} />
                <InfoItem label="手机号" value={<ProtectedText fieldKey="employee_phone" value={employee.phone} />} />
                <InfoItem label="邮箱" value={<ProtectedText fieldKey="employee_email" value={employee.email} />} />
                <InfoItem label="入职日期" value={employee.join_date || '-'} />
                <InfoItem label="居住地址" value={employee.address || '-'} />
                <InfoItem label="员工状态" value={<StatusBadge status={EMP_STATUS_MAP[employee.status] || employee.status} />} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 合同信息 */}
        <TabsContent value="contract" className="mt-4">
          {contract && (
            <Card className="shadow-sm">
              <CardHeader><CardTitle className="text-base">合同信息</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-3">
                  <InfoItem label="合同类型" value={contract.type} />
                  <InfoItem label="签订公司" value={contract.signCompany} />
                  <InfoItem label="合同状态" value={<StatusBadge status={contract.status} />} />
                  <InfoItem label="合同开始日期" value={contract.start} />
                  <InfoItem label="合同结束日期" value={contract.end} />
                  <InfoItem label="续签次数" value={`${contract.renewCount} 次`} />
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* 薪资信息 */}
        <TabsContent value="salary" className="mt-4">
          <Card className="shadow-sm">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">薪资信息（最近 6 个月）</CardTitle>
              <Button variant="outline" size="sm" onClick={() => setShowSalary((v) => !v)}>
                {showSalary ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                {showSalary ? '隐藏敏感数据' : '显示敏感数据'}
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="w-full overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">薪资月份</TableHead>
                      <TableHead className="whitespace-nowrap text-right">基本工资</TableHead>
                      <TableHead className="whitespace-nowrap text-right">绩效工资</TableHead>
                      <TableHead className="whitespace-nowrap text-right">补贴</TableHead>
                      <TableHead className="whitespace-nowrap text-right">扣款</TableHead>
                      <TableHead className="whitespace-nowrap text-right">实发工资</TableHead>
                      <TableHead className="whitespace-nowrap">状态</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salaryRows.map((row) => (
                      <TableRow key={row.month}>
                        <TableCell>{row.month}</TableCell>
                        <TableCell className="text-right">{renderAmount(row.baseSalary)}</TableCell>
                        <TableCell className="text-right">{renderAmount(row.perfSalary)}</TableCell>
                        <TableCell className="text-right">{renderAmount(row.subsidy)}</TableCell>
                        <TableCell className="text-right">{renderAmount(-row.deduction)}</TableCell>
                        <TableCell className="text-right font-semibold">{renderAmount(row.actual)}</TableCell>
                        <TableCell><StatusBadge status={row.status} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 考勤记录 */}
        <TabsContent value="attendance" className="mt-4">
          <Card className="shadow-sm">
            <CardHeader><CardTitle className="text-base">考勤记录（最近 6 个月）</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="w-full overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">考勤月份</TableHead>
                      <TableHead className="whitespace-nowrap text-right">出勤天数</TableHead>
                      <TableHead className="whitespace-nowrap text-right">迟到次数</TableHead>
                      <TableHead className="whitespace-nowrap text-right">早退次数</TableHead>
                      <TableHead className="whitespace-nowrap text-right">请假天数</TableHead>
                      <TableHead className="whitespace-nowrap text-right">加班时长(h)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendanceRows.map((row) => (
                      <TableRow key={row.month}>
                        <TableCell>{row.month}</TableCell>
                        <TableCell className="text-right tabular-nums">{row.workDays}</TableCell>
                        <TableCell className={`text-right tabular-nums ${row.lateCount > 0 ? 'text-destructive' : ''}`}>{row.lateCount}</TableCell>
                        <TableCell className="text-right tabular-nums">{row.earlyLeaveCount}</TableCell>
                        <TableCell className="text-right tabular-nums">{row.leaveDays}</TableCell>
                        <TableCell className="text-right tabular-nums">{row.overtimeHours}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
