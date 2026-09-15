import { useMemo } from 'react';
import PageHeader from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ReactECharts from 'echarts-for-react';
import { Users, UserCheck, TrendingUp, Clock } from 'lucide-react';
import { CHART_COLORS } from '@/lib/chart-colors';
import { t, useLang } from '@/lib/i18n';
import { publicLeadsApi } from '@/api';
import { useServerList } from '@/hooks/useServerList';
import { Skeleton } from '@/components/ui/skeleton';

function StatCard({
  title,
  value,
  suffix,
  icon: Icon,
  trend,
  loading,
}: {
  title: string;
  value: string | number;
  suffix?: string;
  icon: typeof Users;
  trend?: { value: number; up: boolean };
  loading?: boolean;
}) {
  return (
    <Card className="shadow-sm">
      <CardContent className="flex items-start justify-between p-5">
        <div className="space-y-1.5">
          <div className="text-sm text-muted-foreground">{title}</div>
          {loading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <div className="text-2xl font-semibold tabular-nums tracking-tight">
              {value}
              {suffix && <span className="ml-1 text-sm font-normal text-muted-foreground">{suffix}</span>}
            </div>
          )}
          {trend && (
            <div className={`text-xs ${trend.up ? 'text-emerald-600' : 'text-red-500'}`}>
              {trend.up ? '↑' : '↓'} {trend.value}% 较上周
            </div>
          )}
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-5" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function ConversionAnalysisPage() {
  useLang();
  const table = useServerList({
    fetchFn: publicLeadsApi.list,
    defaultPageSize: 1,
  });

  // 基于 mock 数据动态计算统计
  const stats = useMemo(() => {
    const list = (table.data as any[]) || [];
    const total = table.total;
    const claimed = list.filter((l) => l.assign_status === 'assigned').length;
    const converted = Math.floor(claimed * 0.38); // 模拟转化率 38%
    const avgCycle = 7.5; // 平均转化周期 7.5 天
    return { total, claimed, converted, avgCycle };
  }, [table.data, table.total]);

  // 漏斗图配置
  const funnelOption = useMemo(
    () => ({
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      series: [
        {
          type: 'funnel',
          left: '10%',
          top: 20,
          bottom: 20,
          width: '80%',
          min: 0,
          max: stats.total,
          minSize: '0%',
          maxSize: '100%',
          sort: 'descending',
          gap: 2,
          label: { show: true, position: 'inside', fontSize: 13 },
          itemStyle: { borderColor: '#fff', borderWidth: 2 },
          data: [
            { value: stats.total, name: '公海客资', itemStyle: { color: CHART_COLORS[0] } },
            { value: stats.claimed, name: '已领取', itemStyle: { color: CHART_COLORS[1] } },
            { value: Math.floor(stats.claimed * 0.65), name: '跟进中', itemStyle: { color: CHART_COLORS[2] } },
            { value: stats.converted, name: '已转化', itemStyle: { color: CHART_COLORS[3] } },
          ],
        },
      ],
    }),
    [stats.total, stats.claimed, stats.converted],
  );

  // 分层饼图
  const tierOption = useMemo(() => {
    const list = (table.data as any[]) || [];
    const counts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 };
    list.forEach((l) => {
      counts[l.lead_level] = (counts[l.lead_level] || 0) + 1;
    });
    const data = ['A', 'B', 'C', 'D'].map((k, i) => ({
      name: `${k}级`,
      value: counts[k] || Math.round((stats.total || 20) * [0.2, 0.35, 0.3, 0.15][i]),
    }));
    return {
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      legend: { orient: 'vertical', right: '5%', top: 'center', itemWidth: 10, itemHeight: 10 },
      series: [
        {
          type: 'pie',
          radius: ['55%', '75%'],
          center: ['40%', '50%'],
          avoidLabelOverlap: false,
          itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
          label: { show: false, position: 'center' },
          emphasis: {
            label: { show: true, fontSize: 16, fontWeight: 600, formatter: '{b}\n{d}%' },
          },
          labelLine: { show: false },
          data: data.map((d, i) => ({ ...d, itemStyle: { color: CHART_COLORS[i] } })),
        },
      ],
    };
  }, [table.data, stats.total]);

  // 各商务领取柱状图
  const salesOption = useMemo(() => ({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 60, right: 20, top: 20, bottom: 40 },
    xAxis: {
      type: 'category',
      data: ['张伟', '李娜', '王强', '刘洋', '陈婷'],
      axisLabel: { fontSize: 12 },
    },
    yAxis: { type: 'value', axisLabel: { fontSize: 12 } },
    series: [
      {
        type: 'bar',
        barWidth: '45%',
        itemStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: CHART_COLORS[0] },
              { offset: 1, color: CHART_COLORS[0] + '66' },
            ],
          },
          borderRadius: [4, 4, 0, 0],
        },
        data: [28, 42, 33, 22, 18],
      },
    ],
  }), []);

  // 近 30 天趋势折线图
  const trendOption = useMemo(() => {
    const days = Array.from({ length: 30 }, (_, i) => `${i + 1}日`);
    const inflow = days.map(() => 8 + Math.floor(Math.random() * 12));
    const convert = inflow.map((v) => Math.floor(v * (0.25 + Math.random() * 0.2)));
    return {
      tooltip: { trigger: 'axis' },
      legend: { data: ['客资调入', '转化数'], right: 10, top: 0 },
      grid: { left: 40, right: 20, top: 40, bottom: 30 },
      xAxis: { type: 'category', data: days, axisLabel: { fontSize: 11, interval: 4 } },
      yAxis: { type: 'value', axisLabel: { fontSize: 12 } },
      series: [
        {
          name: '客资调入',
          type: 'line',
          smooth: true,
          symbol: 'none',
          lineStyle: { width: 2, color: CHART_COLORS[0] },
          areaStyle: { color: CHART_COLORS[0] + '22' },
          data: inflow,
        },
        {
          name: '转化数',
          type: 'line',
          smooth: true,
          symbol: 'none',
          lineStyle: { width: 2, color: CHART_COLORS[3] },
          areaStyle: { color: CHART_COLORS[3] + '22' },
          data: convert,
        },
      ],
    };
  }, []);

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('转化分析')}
        description={t('公海客资领取率、转化率及转化周期数据看板')}
      />

      {/* 统计卡 */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          title={t('公海客资总数')}
          value={stats.total}
          suffix="条"
          icon={Users}
          loading={table.loading}
          trend={{ value: 12.5, up: true }}
        />
        <StatCard
          title={t('已领取数')}
          value={stats.claimed}
          suffix="条"
          icon={UserCheck}
          loading={table.loading}
          trend={{ value: 8.3, up: true }}
        />
        <StatCard
          title={t('已转化数')}
          value={stats.converted}
          suffix="条"
          icon={TrendingUp}
          loading={table.loading}
          trend={{ value: 5.2, up: true }}
        />
        <StatCard
          title={t('平均转化周期')}
          value={stats.avgCycle}
          suffix="天"
          icon={Clock}
          loading={table.loading}
          trend={{ value: 3.1, up: false }}
        />
      </div>

      {/* 漏斗图 + 分层饼图 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="shadow-sm lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">转化漏斗</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ReactECharts option={funnelOption} style={{ height: 320 }} />
          </CardContent>
        </Card>
        <Card className="shadow-sm lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">客资分层占比</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ReactECharts option={tierOption} style={{ height: 320 }} />
          </CardContent>
        </Card>
      </div>

      {/* 商务领取柱状图 */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">各商务领取客资数量</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <ReactECharts option={salesOption} style={{ height: 300 }} />
        </CardContent>
      </Card>

      {/* 趋势折线图 */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">近 30 天客资调入/转化趋势</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <ReactECharts option={trendOption} style={{ height: 300 }} />
        </CardContent>
      </Card>
    </div>
  );
}
