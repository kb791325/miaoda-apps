import { useCallback, useEffect, useState } from 'react';
import type { FC } from 'react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { AlertCircle, Download, Loader2, RefreshCw } from 'lucide-react';
import {
  Table,
  type TableColumnsType,
} from '@lark-apaas/client-toolkit/antd-table';
import * as XLSX from 'xlsx';
import { formatPercent } from '@client/src/utils/format';
import { Button } from '@client/src/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@client/src/components/ui/card';
import type {
  AttendanceOverviewResponse,
  ChannelConversionItem,
  CoursePopularityItem,
  CoursePopularityResponse,
  LeadConversionResponse,
  PaymentStatusDistributionItem,
  RevenueResponse,
} from '@shared/report';
import {
  fetchAttendanceOverview,
  fetchCoursePopularity,
  fetchLeadConversion,
  fetchRevenue,
} from '@client/src/pages/reports/report.api';
import {
  AttendanceStatusPie,
  ChannelRevenuePie,
  CourseRevenueBar,
  LeadStatusChart,
  MonthlyRevenueChart,
  PopularityBar,
  WeeklyAttendanceLine,
} from '@client/src/pages/reports/ReportsCharts';

const moneyFormatter: Intl.NumberFormat = new Intl.NumberFormat('zh-CN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const intFormatter: Intl.NumberFormat = new Intl.NumberFormat('zh-CN');

function formatMoney(value: number): string {
  return `¥${moneyFormatter.format(value)}`;
}

function formatInt(value: number): string {
  return intFormatter.format(value);
}

function formatDate(date: Date): string {
  const y: string = String(date.getFullYear());
  const m: string = String(date.getMonth() + 1).padStart(2, '0');
  const d: string = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function findStatusItem(
  items: PaymentStatusDistributionItem[],
  status: string,
): PaymentStatusDistributionItem | undefined {
  return items.find((item: PaymentStatusDistributionItem) => item.status === status);
}

interface KpiCardProps {
  label: string;
  value: string;
  sub?: string;
}

const KpiCard: FC<KpiCardProps> = ({ label, value, sub }) => (
  <div className="relative overflow-hidden rounded-lg border bg-card p-6 shadow-sm">
    <span className="absolute left-0 top-0 h-full w-1 bg-primary" />
    <p className="text-sm text-muted-foreground">{label}</p>
    <p className="mt-2 truncate text-2xl font-bold" title={value}>
      {value}
    </p>
    {sub ? <p className="mt-1 text-xs text-muted-foreground">{sub}</p> : null}
  </div>
);

const channelColumns: TableColumnsType<ChannelConversionItem> = [
  { title: '渠道', dataIndex: 'channel', width: 160 },
  {
    title: '线索数',
    dataIndex: 'total',
    width: 120,
    render: (value: number): string => formatInt(value),
  },
  {
    title: '已报名',
    dataIndex: 'enrolled',
    width: 120,
    render: (value: number): string => formatInt(value),
  },
  {
    title: '转化率',
    dataIndex: 'conversionRate',
    width: 120,
    render: (value: number): string => formatPercent(value, 2),
  },
];

const courseColumns: TableColumnsType<CoursePopularityItem> = [
  { title: '课程', dataIndex: 'courseName', width: 200 },
  {
    title: '学费',
    dataIndex: 'tuitionFee',
    width: 140,
    render: (value: number | null): string =>
      value === null ? '—' : formatMoney(value),
  },
  {
    title: '报名人数',
    dataIndex: 'studentCount',
    width: 120,
    render: (value: number): string => formatInt(value),
  },
  {
    title: '开班排期数',
    dataIndex: 'scheduleCount',
    width: 120,
    render: (value: number): string => formatInt(value),
  },
];

const ReportsPage: FC = () => {
  const [leadConversion, setLeadConversion] =
    useState<LeadConversionResponse | null>(null);
  const [revenue, setRevenue] = useState<RevenueResponse | null>(null);
  const [coursePopularity, setCoursePopularity] =
    useState<CoursePopularityResponse | null>(null);
  const [attendance, setAttendance] =
    useState<AttendanceOverviewResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState<number>(0);

  useEffect(() => {
    let cancelled: boolean = false;
    setLoading(true);
    setError(null);
    Promise.all([
      fetchLeadConversion(),
      fetchRevenue(),
      fetchCoursePopularity(),
      fetchAttendanceOverview(),
    ])
      .then(
        ([
          leadRes,
          revenueRes,
          popularityRes,
          attendanceRes,
        ]: [
          LeadConversionResponse,
          RevenueResponse,
          CoursePopularityResponse,
          AttendanceOverviewResponse,
        ]) => {
          if (cancelled) return;
          setLeadConversion({
            ...leadRes,
            statusCounts: leadRes.statusCounts ?? [],
            channelDetails: leadRes.channelDetails ?? [],
          });
          setRevenue({
            ...revenueRes,
            statusDistribution: revenueRes.statusDistribution ?? [],
            monthlyTrend: revenueRes.monthlyTrend ?? [],
            channelRevenue: revenueRes.channelRevenue ?? [],
            courseRevenueTop5: revenueRes.courseRevenueTop5 ?? [],
          });
          setCoursePopularity({
            ...popularityRes,
            items: popularityRes.items ?? [],
          });
          setAttendance({
            ...attendanceRes,
            statusCounts: attendanceRes.statusCounts ?? [],
            weeklyTrend: attendanceRes.weeklyTrend ?? [],
          });
          setLoading(false);
        },
      )
      .catch((err: unknown) => {
        if (cancelled) return;
        logger.error('经营报表数据加载失败', err);
        setError('报表数据加载失败，请稍后重试');
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const handleReload = useCallback((): void => {
    setReloadKey((k: number) => k + 1);
  }, []);

  const handleExport = useCallback((): void => {
    if (!leadConversion || !revenue || !coursePopularity || !attendance) {
      toast.error('数据尚未就绪，请等待加载完成后再导出');
      return;
    }
    try {
      const wb: XLSX.WorkBook = XLSX.utils.book_new();

      const leadRows: Array<Array<string | number>> = [
        ['总线索数', leadConversion.totalLeads],
        ['已报名数', leadConversion.enrolledCount],
        ['整体转化率(%)', leadConversion.conversionRate],
        [],
        ['渠道', '线索数', '已报名', '转化率(%)'],
        ...leadConversion.channelDetails.map(
          (item: ChannelConversionItem): Array<string | number> => [
            item.channel,
            item.total,
            item.enrolled,
            item.conversionRate,
          ],
        ),
      ];
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.aoa_to_sheet(leadRows),
        '转化分析',
      );

      const revenueRows: Array<Array<string | number>> = [
        ['总收入(元)', revenue.totalRevenue],
        ['参与统计学员数', revenue.studentCount],
        ...revenue.statusDistribution.map(
          (item: PaymentStatusDistributionItem): Array<string | number> => [
            `${item.status}人数`,
            item.count,
            `${item.status}金额(元)`,
            item.amount,
          ],
        ),
        [],
        ['月份', '收入(元)'],
        ...revenue.monthlyTrend.map(
          (item): Array<string | number> => [item.month, item.revenue],
        ),
      ];
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.aoa_to_sheet(revenueRows),
        '收入分析',
      );

      const courseRows: Array<Array<string | number>> = [
        ['课程总数', coursePopularity.items.length],
        ['报名总人次', coursePopularity.items.reduce(
          (sum: number, item: CoursePopularityItem): number =>
            sum + item.studentCount,
          0,
        )],
        [],
        ['课程', '学费(元)', '报名人数', '开班排期数'],
        ...coursePopularity.items.map(
          (item: CoursePopularityItem): Array<string | number> => [
            item.courseName,
            item.tuitionFee ?? '—',
            item.studentCount,
            item.scheduleCount,
          ],
        ),
      ];
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.aoa_to_sheet(courseRows),
        '课程热度',
      );

      const attendanceRows: Array<Array<string | number>> = [
        ['总体出勤率(%)', attendance.attendanceRate],
        ['出勤次数', attendance.presentCount],
        ['有效考勤记录数', attendance.totalRecords],
        [],
        ['周起始日', '出勤次数', '总记录数', '出勤率(%)'],
        ...attendance.weeklyTrend.map(
          (item): Array<string | number> => [
            item.weekStart,
            item.presentCount,
            item.totalCount,
            item.attendanceRate,
          ],
        ),
      ];
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.aoa_to_sheet(attendanceRows),
        '考勤总览',
      );

      XLSX.writeFile(wb, `飘飘香经营报表_${formatDate(new Date())}.xlsx`);
      toast.success('报表导出成功');
    } catch (err) {
      logger.error('报表导出失败', err);
      toast.error('报表导出失败，请重试');
    }
  }, [leadConversion, revenue, coursePopularity, attendance]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="ml-2 text-sm text-muted-foreground">
          正在加载报表数据...
        </span>
      </div>
    );
  }

  if (error || !leadConversion || !revenue || !coursePopularity || !attendance) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-sm text-muted-foreground">
          {error ?? '报表数据不完整，请重新加载'}
        </p>
        <Button variant="outline" onClick={handleReload}>
          <RefreshCw className="mr-2 h-4 w-4" />
          重新加载
        </Button>
      </div>
    );
  }

  const paidFull: PaymentStatusDistributionItem | undefined = findStatusItem(
    revenue.statusDistribution,
    '已缴清',
  );
  const partialPaid: PaymentStatusDistributionItem | undefined = findStatusItem(
    revenue.statusDistribution,
    '部分缴费',
  );
  const unpaid: PaymentStatusDistributionItem | undefined = findStatusItem(
    revenue.statusDistribution,
    '未缴费',
  );

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">经营报表与分析看板</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            口径说明：线索与收入为全量数据统计 · 月度收入趋势取近 6 个月 ·
            考勤趋势取近 4 个自然周 · 出席率仅按「出勤」状态计入
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleReload}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            刷新
          </Button>
          <Button data-ai-section-type="button" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            导出报表
          </Button>
        </div>
      </div>

      <Card className="rounded-lg shadow-sm">
        <CardHeader>
          <CardTitle>招生转化分析</CardTitle>
          <CardDescription>
            线索总量 {formatInt(leadConversion.totalLeads)} · 已报名{' '}
            {formatInt(leadConversion.enrolledCount)} · 整体转化率{' '}
            {formatPercent(leadConversion.conversionRate, 2)}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <LeadStatusChart statusCounts={leadConversion.statusCounts} />
          <Table<ChannelConversionItem>
            columns={channelColumns}
            dataSource={leadConversion.channelDetails}
            rowKey="channel"
            pagination={false}
            scroll={{ x: 520 }}
          />
        </CardContent>
      </Card>

      <Card className="rounded-lg shadow-sm">
        <CardHeader>
          <CardTitle>收入分析</CardTitle>
          <CardDescription>
            参与统计学员 {formatInt(revenue.studentCount)} 人 ·
            按缴费状态与渠道、课程维度拆解
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div
            className="grid grid-cols-2 gap-4 lg:grid-cols-4"
            data-ai-section-type="card-stat"
          >
            <KpiCard label="总收入" value={formatMoney(revenue.totalRevenue)} />
            <KpiCard
              label="已缴清"
              value={formatMoney(paidFull?.amount ?? 0)}
              sub={`${formatInt(paidFull?.count ?? 0)} 人`}
            />
            <KpiCard
              label="部分缴费"
              value={formatMoney(partialPaid?.amount ?? 0)}
              sub={`${formatInt(partialPaid?.count ?? 0)} 人`}
            />
            <KpiCard
              label="未缴费"
              value={formatMoney(unpaid?.amount ?? 0)}
              sub={`${formatInt(unpaid?.count ?? 0)} 人`}
            />
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <h3 className="mb-2 text-sm font-medium">月度收入趋势（近 6 个月）</h3>
              <MonthlyRevenueChart monthlyTrend={revenue.monthlyTrend} />
            </div>
            <div>
              <h3 className="mb-2 text-sm font-medium">渠道收入占比</h3>
              <ChannelRevenuePie channelRevenue={revenue.channelRevenue} />
            </div>
            <div className="lg:col-span-2">
              <h3 className="mb-2 text-sm font-medium">课程收入 TOP5</h3>
              <CourseRevenueBar items={revenue.courseRevenueTop5} />
              <p className="mt-1 text-xs text-muted-foreground">
                口径：学员报多门课程时，缴费金额全额计入每门关联课程
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-lg shadow-sm">
        <CardHeader>
          <CardTitle>课程热度</CardTitle>
          <CardDescription>
            共 {formatInt(coursePopularity.items.length)} 门课程参与统计
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-2">
          <Table<CoursePopularityItem>
            columns={courseColumns}
            dataSource={coursePopularity.items}
            rowKey="courseId"
            pagination={false}
            scroll={{ x: 580 }}
          />
          <div>
            <h3 className="mb-2 text-sm font-medium">报名人数 TOP10</h3>
            <PopularityBar items={coursePopularity.items} />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-lg shadow-sm">
        <CardHeader>
          <CardTitle>考勤总览</CardTitle>
          <CardDescription>
            近 4 个自然周考勤表现，仅「出勤」状态计入出席
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-3">
          <div className="flex flex-col justify-center rounded-lg border bg-card p-6">
            <p className="text-sm text-muted-foreground">总体出勤率</p>
            <p className="mt-2 text-4xl font-bold text-primary">
              {formatPercent(attendance.attendanceRate)}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              出勤 {formatInt(attendance.presentCount)} 次 / 有效记录{' '}
              {formatInt(attendance.totalRecords)} 条
            </p>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-medium">考勤状态分布</h3>
            <AttendanceStatusPie statusCounts={attendance.statusCounts} />
          </div>
          <div>
            <h3 className="mb-2 text-sm font-medium">周度出勤趋势</h3>
            <WeeklyAttendanceLine weeklyTrend={attendance.weeklyTrend} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportsPage;
