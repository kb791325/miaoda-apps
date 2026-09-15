import React, { useState, useEffect, useMemo, useCallback } from 'react';
import ReactECharts from 'echarts-for-react';
import { ErrorBoundary } from 'react-error-boundary';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Trophy,
  Medal,
  Award,
  Target,
  Users,
  Wallet,
  Gift,
  FileText,
} from 'lucide-react';
import { CHART_COLORS } from '@/lib/chart-colors';
import RoleWorkbench from '@/pages/Dashboard/RoleWorkbench';
import { useApp } from '@/context/AppContext';
import { t, useLang } from '@/lib/i18n';
import { formatAmount, formatDateTime } from '@/lib/format';
import { dashboardApi } from '@/api';
import { useFieldPermission } from '@/hooks/useFieldPermission';
import { Lock } from 'lucide-react';
import type {
  DashboardSummary,
  DashboardRealtime,
  DashboardCharts,
  DashboardRankings,
  TargetItem,
  DashboardPerformance,
} from '@/api/types';

const TIME_DIMENSIONS = ['today', 'week', 'month', 'year'] as const;
type TimeDim = typeof TIME_DIMENSIONS[number];

const TIME_LABELS: Record<TimeDim, string> = {
  today: '今日',
  week: '本周',
  month: '本月',
  year: '本年',
};

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <Trophy className="size-5 text-amber-500" />;
  if (rank === 2) return <Medal className="size-5 text-slate-400" />;
  if (rank === 3) return <Award className="size-5 text-amber-700" />;
  return <span className="flex size-5 items-center justify-center text-xs font-medium text-muted-foreground">{rank}</span>;
}

export default function DashboardPage() {
  const { user } = useApp();
  // 角色差异化面板：管理员/部门经理看管理看板，其他角色看各自业务工作台
  if (user && user.role !== 'admin' && user.role !== 'manager') {
    return <RoleWorkbench role={user.role} />;
  }
  return (
    <ErrorBoundary
      fallback={
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="text-4xl">⚠️</div>
          <h2 className="mt-4 text-lg font-semibold">工作台数据加载失败</h2>
          <p className="mt-2 text-sm text-muted-foreground">请稍后刷新页面重试，或联系管理员</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-6"
            onClick={() => window.location.reload()}
          >
            刷新重试
          </Button>
        </div>
      }
    >
      <AdminDashboard />
    </ErrorBoundary>
  );
}

function AdminDashboard() {
  const [timeDim, setTimeDim] = useState<TimeDim>('month');
  const [rankPort, setRankPort] = useState('all');
  const [rankTime, setRankTime] = useState<'week' | 'month' | 'year'>('month');
  const [rankTab, setRankTab] = useState('business');
  useLang();
  const { isVisible } = useFieldPermission();

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [realtime, setRealtime] = useState<DashboardRealtime | null>(null);
  const [charts, setCharts] = useState<DashboardCharts | null>(null);
  const [rankings, setRankings] = useState<DashboardRankings | null>(null);
  const [targets, setTargets] = useState<TargetItem[]>([]);
  const [perf, setPerf] = useState<DashboardPerformance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAll = async (dim: TimeDim, port: string, rt: string) => {
    setLoading(true);
    try {
      const [sumRes, realRes, chartRes, rankRes, tgtRes, perfRes] = await Promise.all([
        dashboardApi.getSummary(dim),
        dashboardApi.getRealtime(),
        dashboardApi.getCharts(dim),
        dashboardApi.getRankings(port, rt),
        dashboardApi.getTargets(),
        dashboardApi.getPerformance(),
      ]);
      if (sumRes.code === 0) setSummary(sumRes.data);
      if (realRes.code === 0) setRealtime(realRes.data);
      if (chartRes.code === 0) setCharts(chartRes.data);
      if (rankRes.code === 0) setRankings(rankRes.data);
      if (tgtRes.code === 0) setTargets(tgtRes.data || []);
      if (perfRes.code === 0) setPerf(perfRes.data);
      setError(null);
    } catch (e: any) {
      setError(e?.message || '数据加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll(timeDim, rankPort, rankTime);
  }, [timeDim, rankPort, rankTime]);

  const pieOption = (data: { name: string; value: number }[] | undefined | null, title: string) => {
    const safeData = Array.isArray(data) ? data : [];
    return {
    color: CHART_COLORS,
    tooltip: { trigger: 'item', formatter: '{b}: ¥{c} ({d}%)' },
    legend: {
      bottom: 0,
      left: 'center',
      itemWidth: 8,
      itemHeight: 8,
      textStyle: { fontSize: 11, color: '#86909C' },
    },
    series: [
      {
        name: title,
        type: 'pie',
        radius: ['45%', '68%'],
        center: ['50%', '42%'],
        avoidLabelOverlap: true,
        itemStyle: { borderRadius: 4, borderColor: '#fff', borderWidth: 2 },
        label: { show: false },
        emphasis: {
          label: { show: true, fontSize: 14, fontWeight: 'bold' },
        },
        data: safeData,
      },
    ],
  };
};

  const barOption = useMemo(() => {
    const data = charts?.salesBar || [];
    return {
      color: [CHART_COLORS[0]],
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: 60, right: 20, top: 10, bottom: 30 },
      xAxis: {
        type: 'value',
        axisLabel: {
          formatter: (v: number) => (v >= 10000 ? `${(v / 10000).toFixed(0)}万` : v),
          fontSize: 10,
        },
        splitLine: { lineStyle: { type: 'dashed', color: '#eee' } },
      },
      yAxis: {
        type: 'category',
        data: data.map((d) => d.name),
        axisLabel: { fontSize: 11 },
      },
      series: [
        {
          type: 'bar',
          data: data.map((d) => d.value),
          barWidth: 14,
          itemStyle: {
            borderRadius: [0, 4, 4, 0],
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 1, y2: 0,
              colorStops: [
                { offset: 0, color: CHART_COLORS[3] },
                { offset: 1, color: CHART_COLORS[0] },
              ],
            },
          },
        },
      ],
    };
  }, [charts]);

  const handleRefresh = () => {
    loadAll(timeDim, rankPort, rankTime);
  };

  const kpiCards = [
    { title: '昨日消耗', value: summary?.yesterdayConsume ?? 0, trend: summary?.dayGrowth ?? 0, icon: Wallet, color: '#1677FF', unit: '¥' },
    { title: '昨日赠款', value: summary?.yesterdayBonus ?? 0, trend: (summary?.dayGrowth ?? 0) + 2, icon: Gift, color: '#0D9488', unit: '赠' },
    { title: '本周消耗', value: summary?.weekConsume ?? 0, trend: summary?.weekGrowth ?? 0, icon: FileText, color: '#0E42D2', unit: '¥' },
    { title: '本月消耗', value: summary?.monthConsume ?? 0, trend: summary?.monthGrowth ?? 0, icon: Wallet, color: '#722ED1', unit: '¥' },
    { title: '本月新开单', value: summary?.newOpenThisMonth ?? 0, trend: summary?.newOpenGrowth ?? 0, icon: Target, color: '#F5222D', unit: '个' },
  ];

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{t('工作台')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('欢迎回来，查看今日数据概览')}</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
          <RefreshCw className={`mr-1 size-3.5 ${loading ? 'animate-spin' : ''}`} /> {t('刷新')}
        </Button>
      </div>

      {/* KPI 卡片 */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        {kpiCards.map((card, idx) => {
          const Icon = card.icon;
          const isUp = card.trend >= 0;
          return (
            <Card key={idx} className="shadow-sm transition-all hover:shadow-md">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <span className="text-xs text-muted-foreground">{t(card.title)}</span>
                  <div
                    className="flex size-8 items-center justify-center rounded-lg"
                    style={{ backgroundColor: card.color + '15', color: card.color }}
                  >
                    <Icon className="size-4" />
                  </div>
                </div>
                <div className="mt-2 text-2xl font-bold tracking-tight tabular-nums">
                  {loading ? <Skeleton className="h-7 w-24" /> :
                    card.unit === '个' ? card.value : formatAmount(card.value)
                  }
                </div>
                <div className="mt-2 flex items-center gap-1 text-xs">
                  {loading ? <Skeleton className="h-3 w-16" /> : (
                    <>
                      {isUp ? (
                        <TrendingUp className="size-3.5 text-emerald-500" />
                      ) : (
                        <TrendingDown className="size-3.5 text-red-500" />
                      )}
                      <span className={isUp ? 'text-emerald-600' : 'text-red-500'}>
                        {isUp ? '+' : ''}{Number(card.trend).toFixed(1)}%
                      </span>
                      <span className="text-muted-foreground">{t('较上期')}</span>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 今日实时消耗 */}
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-base font-semibold">{t('今日实时消耗')}</CardTitle>
            <CardDescription className="text-xs">
              {t('数据更新于')} {realtime?.updateTime || summary?.updateTime || '--'}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-3 gap-6 py-2">
            {[
              { label: '内部端口', value: realtime?.categories?.['内部端口'] || 0, color: '#1677FF' },
              { label: '外部端口', value: realtime?.categories?.['外部端口'] || 0, color: '#0D9488' },
              { label: '集团', value: realtime?.categories?.['集团'] || 0, color: '#0E42D2' },
            ].map((item) => (
              <div key={item.label} className="text-center">
                <div className="text-xs text-muted-foreground">{t(item.label)}</div>
                <div className="mt-1 text-2xl font-bold tabular-nums" style={{ color: item.color }}>
                  {loading ? <Skeleton className="mx-auto h-7 w-28" /> : formatAmount(item.value)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 图表区 */}
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base font-semibold">{t('数据分析')}</CardTitle>
          <Tabs defaultValue="month" value={timeDim} onValueChange={(v) => setTimeDim(v as TimeDim)}>
            <TabsList className="h-8 bg-muted/50">
              {TIME_DIMENSIONS.map((d) => (
                <TabsTrigger key={d} value={d} className="h-7 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  {t(TIME_LABELS[d])}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
            <Card className="border-border/60 shadow-none xl:col-span-2">
              <CardHeader className="pb-0">
                <CardTitle className="text-sm font-medium">{t('集团消耗分布')}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {loading ? (
                  <Skeleton className="h-[260px] w-full" />
                ) : (
                  <ReactECharts option={pieOption(charts?.groupPie, t('集团消耗'))} style={{ height: 260 }} />
                )}
              </CardContent>
            </Card>
            <Card className="border-border/60 shadow-none xl:col-span-3">
              <CardHeader className="pb-0">
                <CardTitle className="text-sm font-medium">{t('Top 商务消耗排行')}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {loading ? (
                  <Skeleton className="h-[260px] w-full" />
                ) : (
                  <ReactECharts option={barOption} style={{ height: 260 }} />
                )}
              </CardContent>
            </Card>
            <Card className="border-border/60 shadow-none">
              <CardHeader className="pb-0">
                <CardTitle className="text-sm font-medium">{t('端口利润占比')}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {isVisible('finance.profit') ? (
                  loading ? (
                    <Skeleton className="h-[220px] w-full" />
                  ) : (
                    <ReactECharts option={pieOption(charts?.portProfit, t('端口利润'))} style={{ height: 220 }} />
                  )
                ) : (
                  <div className="flex h-[220px] w-full flex-col items-center justify-center gap-2 text-muted-foreground">
                    <Lock className="size-5" />
                    <p className="text-sm">无权限查看</p>
                  </div>
                )}
              </CardContent>
            </Card>
            <Card className="border-border/60 shadow-none">
              <CardHeader className="pb-0">
                <CardTitle className="text-sm font-medium">{t('部门消耗占比')}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {loading ? (
                  <Skeleton className="h-[220px] w-full" />
                ) : (
                  <ReactECharts option={pieOption(charts?.deptPie, t('部门消耗'))} style={{ height: 220 }} />
                )}
              </CardContent>
            </Card>
            <Card className="border-border/60 shadow-none">
              <CardHeader className="pb-0">
                <CardTitle className="text-sm font-medium">{t('端口消耗分布')}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {loading ? (
                  <Skeleton className="h-[220px] w-full" />
                ) : (
                  <ReactECharts option={pieOption(charts?.portPie, t('端口消耗'))} style={{ height: 220 }} />
                )}
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* 目标详情 */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Target className="size-4 text-primary" />
            {t('目标详情')}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="w-full overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="whitespace-nowrap">{t('部门')}</TableHead>
                  <TableHead className="whitespace-nowrap text-right">{t('年度目标')}</TableHead>
                  <TableHead className="whitespace-nowrap text-right">{t('年度完成')}</TableHead>
                  <TableHead className="whitespace-nowrap w-52">{t('完成率')}</TableHead>
                  <TableHead className="whitespace-nowrap text-right">{t('月度目标')}</TableHead>
                  <TableHead className="whitespace-nowrap text-right">{t('月度完成')}</TableHead>
                  <TableHead className="whitespace-nowrap w-52">{t('完成率')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={7}><Skeleton className="h-10 w-full" /></TableCell>
                    </TableRow>
                  ))
                ) : targets.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">{t('暂无数据')}</TableCell></TableRow>
                ) : (
                  targets.map((t) => (
                    <TableRow key={t.department}>
                      <TableCell className="font-medium">{t.department}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatAmount(t.yearTarget)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatAmount(t.yearDone)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={Math.min(t.yearRate, 100)} className="h-2 flex-1" />
                          <span className="w-12 shrink-0 text-xs tabular-nums text-muted-foreground text-right">
                            {(Number(t.yearRate) || 0).toFixed(1)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{formatAmount(t.monthTarget)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatAmount(t.monthDone)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={Math.min(t.monthRate, 100)} className="h-2 flex-1" />
                          <span className="w-12 shrink-0 text-xs tabular-nums text-muted-foreground text-right">
                            {(Number(t.monthRate) || 0).toFixed(1)}%
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* 排行榜 + 绩效任务 */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* 排行榜 */}
        <Card className="shadow-sm xl:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Trophy className="size-4 text-amber-500" />
                {t('排行榜')}
              </CardTitle>
              <div className="flex items-center gap-2">
                <select
                  className="h-7 rounded-md border border-border bg-background px-2 text-xs"
                  value={rankPort}
                  onChange={(e) => setRankPort(e.target.value)}
                >
                  <option value="all">{t('全部端口')}</option>
                  <option value="内部端口">{t('内部端口')}</option>
                  <option value="外部端口">{t('外部端口')}</option>
                </select>
                <select
                  className="h-7 rounded-md border border-border bg-background px-2 text-xs"
                  value={rankTime}
                  onChange={(e) => setRankTime(e.target.value as 'week' | 'month' | 'year')}
                >
                  <option value="week">{t('本周')}</option>
                  <option value="month">{t('本月')}</option>
                  <option value="year">{t('本年')}</option>
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Tabs defaultValue="business" value={rankTab} onValueChange={setRankTab}>
              <TabsList className="mx-4 mt-1 h-8 w-[calc(100%-2rem)] bg-muted/50">
                {[
                  { v: 'business', l: '商务排行' },
                  { v: 'group', l: '集团排行' },
                  { v: 'port', l: '端口排行' },
                  { v: 'industry', l: '行业排行' },
                  { v: 'newAccount', l: '新开排行' },
                ].map((tab) => (
                  <TabsTrigger key={tab.v} value={tab.v} className="h-7 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm">
                    {t(tab.l)}
                  </TabsTrigger>
                ))}
              </TabsList>
              <div className="p-4">
                {rankTab === 'business' && (
                  <div className="space-y-2">
                    {loading
                      ? Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="rounded-lg border border-border/60 p-3">
                          <Skeleton className="h-6 w-full" />
                        </div>
                      ))
                      : (rankings?.salesRank ?? []).length === 0 ? (
                        <div className="py-8 text-center text-sm text-muted-foreground">{t('暂无数据')}</div>
                      ) : (
                        rankings.salesRank.map((item) => (
                          <div key={item.rank} className="flex items-center gap-3 rounded-lg border border-border/60 p-3">
                            <RankBadge rank={item.rank} />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium">{item.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {t('内部')} {formatAmount(item.inner_consume || 0, '')} · {t('外部')} {formatAmount(item.outer_consume || 0, '')}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-semibold tabular-nums">{formatAmount(item.total_consume || 0)}</div>
                            </div>
                          </div>
                        ))
                      )}
                  </div>
                )}
                {rankTab === 'group' && (
                  <div className="space-y-2">
                    {loading
                      ? Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="rounded-lg border border-border/60 p-3">
                          <Skeleton className="h-6 w-full" />
                        </div>
                      ))
                      : (rankings?.groupRank ?? []).length === 0 ? (
                        <div className="py-8 text-center text-sm text-muted-foreground">{t('暂无数据')}</div>
                      ) : (
                        rankings.groupRank.map((item) => (
                          <div key={item.rank} className="flex items-center gap-3 rounded-lg border border-border/60 p-3">
                            <RankBadge rank={item.rank} />
                            <div className="flex-1 font-medium truncate">{item.name}</div>
                            <div className="text-sm font-semibold tabular-nums">{formatAmount(item.total_consume || 0)}</div>
                          </div>
                        ))
                      )}
                  </div>
                )}
                {rankTab === 'port' && (
                  <div className="space-y-2">
                    {loading
                      ? Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="rounded-lg border border-border/60 p-3">
                          <Skeleton className="h-6 w-full" />
                        </div>
                      ))
                      : (rankings?.portRank ?? []).length === 0 ? (
                        <div className="py-8 text-center text-sm text-muted-foreground">{t('暂无数据')}</div>
                      ) : (
                        rankings.portRank.map((item) => (
                          <div key={item.rank} className="flex items-center gap-3 rounded-lg border border-border/60 p-3">
                            <RankBadge rank={item.rank} />
                            <div className="flex-1 font-medium">{item.name}</div>
                            <div className="text-sm font-semibold tabular-nums">{formatAmount(item.total_consume || 0)}</div>
                          </div>
                        ))
                      )}
                  </div>
                )}
                {rankTab === 'industry' && (
                  <div className="space-y-2">
                    {loading
                      ? Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="rounded-lg border border-border/60 p-3">
                          <Skeleton className="h-6 w-full" />
                        </div>
                      ))
                      : (rankings?.industryRank ?? []).length === 0 ? (
                        <div className="py-8 text-center text-sm text-muted-foreground">{t('暂无数据')}</div>
                      ) : (
                        rankings.industryRank.map((item) => (
                          <div key={item.rank} className="flex items-center gap-3 rounded-lg border border-border/60 p-3">
                            <RankBadge rank={item.rank} />
                            <div className="flex-1 font-medium">{item.name}</div>
                            <div className="text-sm font-semibold tabular-nums">{formatAmount(item.total_consume || 0)}</div>
                          </div>
                        ))
                      )}
                  </div>
                )}
                {rankTab === 'newAccount' && (
                  <div className="space-y-2">
                    {loading
                      ? Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="rounded-lg border border-border/60 p-3">
                          <Skeleton className="h-6 w-full" />
                        </div>
                      ))
                      : (rankings?.newOpenRank ?? []).length === 0 ? (
                        <div className="py-8 text-center text-sm text-muted-foreground">{t('暂无数据')}</div>
                      ) : (
                        rankings.newOpenRank.map((item) => (
                          <div key={item.rank} className="flex items-center gap-3 rounded-lg border border-border/60 p-3">
                            <RankBadge rank={item.rank} />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium">{item.dept || item.name || '--'}</div>
                              <div className="text-xs text-muted-foreground">{t('新开账户')} {item.count || 0}</div>
                            </div>
                            <div className="text-sm font-semibold tabular-nums">{item.count || 0}</div>
                          </div>
                        ))
                      )}
                  </div>
                )}
              </div>
            </Tabs>
          </CardContent>
        </Card>

        {/* 绩效任务 */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Users className="size-4 text-primary" />
              {t('绩效任务')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
              <div className="text-center">
                <div className="text-xs text-muted-foreground">{t('部门平均分值')}</div>
                <div className="mt-1 text-3xl font-bold text-primary tabular-nums">
                  {loading ? <Skeleton className="mx-auto h-9 w-20" /> : perf ? Number(perf.avgScore).toFixed(1) : '--'}
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {t('共')} {perf?.totalEmployees ?? 0} {t('人参与')}
                </div>
              </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-blue-50 p-3 text-center">
                <div className="text-xl font-bold text-primary tabular-nums">{loading ? <Skeleton className="mx-auto h-6 w-12" /> : perf?.totalTasks ?? 0}</div>
                <div className="text-xs text-muted-foreground">{t('总任务')}</div>
              </div>
              <div className="rounded-lg bg-emerald-50 p-3 text-center">
                <div className="text-xl font-bold text-emerald-600 tabular-nums">{loading ? <Skeleton className="mx-auto h-6 w-12" /> : perf?.totalConfirmed ?? 0}</div>
                <div className="text-xs text-muted-foreground">{t('已确认')}</div>
              </div>
              <div className="rounded-lg bg-amber-50 p-3 text-center">
                <div className="text-xl font-bold text-amber-600 tabular-nums">{loading ? <Skeleton className="mx-auto h-6 w-12" /> : perf?.pendingCount ?? 0}</div>
                <div className="text-xs text-muted-foreground">{t('待确认')}</div>
              </div>
            </div>

            <div>
              <div className="mb-2 text-sm font-medium">{t('员工绩效')}</div>
              <div className="space-y-1.5">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <Skeleton className="h-3 w-14" />
                      <Skeleton className="h-1.5 flex-1" />
                      <Skeleton className="h-3 w-10" />
                    </div>
                  ))
                ) : (perf?.perfList ?? []).length === 0 ? (
                  <div className="py-4 text-center text-xs text-muted-foreground">{t('暂无数据')}</div>
                ) : (
                  perf.perfList.slice(0, 6).map((emp) => (
                    <div key={emp.id} className="flex items-center gap-2 text-xs">
                      <span className="w-14 shrink-0 truncate text-muted-foreground">{emp.name}</span>
                      <Progress value={Math.min(Number(emp.score) || 0, 100)} className="h-1.5 flex-1" />
                      <span className="w-10 shrink-0 text-right tabular-nums font-medium">{Number(emp.score) || 0}</span>
                      <Badge
                        variant="outline"
                        className={`h-4 shrink-0 px-1 text-[10px] font-normal ${
                          emp.level === 'S' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          emp.level === 'A' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          emp.level === 'B' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          'bg-gray-50 text-gray-600 border-gray-200'
                        }`}
                      >
                        {emp.level || '--'}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
