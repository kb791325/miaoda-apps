import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import dayjs from 'dayjs';
import { getDashboardData } from '@/api/dashboard';
import type {
  DashboardSummary,
  DailyStat,
  ChannelGmv,
  Alert,
} from '@shared/api.interface';
import { CHART_COLORS, CHART_SERIES } from '@/lib/chart-colors';
import {
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  DollarSign,
  Percent,
  Package,
  BarChart3,
  Users,
  Headphones,
  Warehouse,
  AlertTriangle,
  AlertCircle,
  Zap,
  RefreshCw,
} from 'lucide-react';

const kpiItems = [
  {
    key: 'gmv',
    label: 'GMV',
    valueKey: 'gmv',
    changeKey: 'gmvChange',
    prefix: '¥',
    icon: DollarSign,
    format: (v: number) => v.toLocaleString(),
  },
  {
    key: 'orders',
    label: '订单量',
    valueKey: 'orders',
    changeKey: 'ordersChange',
    suffix: '单',
    icon: ShoppingCart,
    format: (v: number) => v.toLocaleString(),
  },
  {
    key: 'avgOrderValue',
    label: '客单价',
    valueKey: 'avgOrderValue',
    changeKey: 'avgOrderValueChange',
    prefix: '¥',
    icon: Zap,
    format: (v: number) => v.toFixed(1),
  },
  {
    key: 'conversionRate',
    label: '转化率',
    valueKey: 'conversionRate',
    changeKey: 'conversionRateChange',
    suffix: '%',
    icon: Percent,
    format: (v: number) => v.toFixed(1),
    invertGood: false,
  },
  {
    key: 'refundRate',
    label: '退款率',
    valueKey: 'refundRate',
    changeKey: 'refundRateChange',
    suffix: '%',
    icon: AlertTriangle,
    format: (v: number) => v.toFixed(1),
    invertGood: true, // 退款率下降是好事
  },
  {
    key: 'grossMargin',
    label: '毛利率',
    valueKey: 'grossMargin',
    changeKey: 'grossMarginChange',
    suffix: '%',
    icon: TrendingUp,
    format: (v: number) => v.toFixed(1),
  },
];

function KpiCard({
  label,
  value,
  change,
  prefix = '',
  suffix = '',
  Icon,
  invertGood = false,
  format = (v: number) => v.toLocaleString(),
}: {
  label: string;
  value: number;
  change: number;
  prefix?: string;
  suffix?: string;
  Icon: typeof DollarSign;
  invertGood?: boolean;
  format?: (v: number) => string;
}) {
  const isUp = change >= 0;
  const isGood = invertGood ? !isUp : isUp;
  const changeColor = isGood ? 'text-emerald-600' : 'text-red-500';
  const bgColor = isGood ? 'bg-emerald-50' : 'bg-red-50';

  return (
    <Card className="border-border/60 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary to-cyan-400" />
      <CardContent className="p-5 pl-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1.5">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl md:text-3xl font-bold text-foreground tracking-tight tabular-nums">
              {prefix}
              {format(value)}
              {suffix}
            </p>
          </div>
          <div className={`size-10 rounded-xl ${bgColor} flex items-center justify-center shrink-0`}>
            <Icon className={`size-5 ${isGood ? 'text-emerald-600' : 'text-red-500'}`} />
          </div>
        </div>
        <div className="flex items-center gap-1 mt-3">
          {isUp ? (
            <TrendingUp className={`size-3.5 ${changeColor}`} />
          ) : (
            <TrendingDown className={`size-3.5 ${changeColor}`} />
          )}
          <span className={`text-xs font-medium tabular-nums ${changeColor}`}>
            {isUp ? '+' : ''}
            {change.toFixed(1)}%
          </span>
          <span className="text-xs text-muted-foreground">环比昨日</span>
        </div>
      </CardContent>
    </Card>
  );
}

const quickEntries = [
  { key: 'products', label: '商品分析', desc: '查看爆款与滞销品', icon: Package, route: '/products', color: 'bg-sky-50 text-sky-600' },
  { key: 'traffic', label: '流量与投放', desc: '评估渠道 ROI', icon: BarChart3, route: '/traffic', color: 'bg-emerald-50 text-emerald-600' },
  { key: 'customers', label: '客户分析', desc: '洞察客户分层', icon: Users, route: '/customers', color: 'bg-violet-50 text-violet-600' },
  { key: 'aftersale', label: '售后管理', desc: '处理退款工单', icon: Headphones, route: '/aftersale', color: 'bg-amber-50 text-amber-600' },
  { key: 'inventory', label: '库存管理', desc: '预警缺货与滞销', icon: Warehouse, route: '/inventory', color: 'bg-rose-50 text-rose-600' },
];

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [dailyStats, setDailyStats] = useState<DailyStat[]>([]);
  const [channelGmvData, setChannelGmvData] = useState<ChannelGmv[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback((isManual = false) => {
    if (isManual) setRefreshing(true);
    getDashboardData()
      .then((data) => {
        setSummary(data.summary);
        setDailyStats(data.dailyStats);
        setChannelGmvData(data.channelGmv);
        setAlerts(data.alerts);
        setLastUpdated(new Date());
      })
      .finally(() => {
        setLoading(false);
        if (isManual) setRefreshing(false);
      });
  }, []);

  useEffect(() => {
    fetchData();
    const timer = setInterval(() => fetchData(), 30000);
    return () => clearInterval(timer);
  }, [fetchData]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchData();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [fetchData]);

  const handleManualRefresh = useCallback(() => {
    if (!refreshing) fetchData(true);
  }, [fetchData, refreshing]);

  const gmvOrderOption: EChartsOption = useMemo(() => {
    const dates = dailyStats.map((d) => d.statDate);
    const gmvData = dailyStats.map((d) => d.gmv);
    const ordersData = dailyStats.map((d) => d.orders);

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
      },
      legend: {
        data: ['GMV', '订单量'],
        bottom: 0,
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        top: '10%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: dates,
        boundaryGap: false,
        axisLine: { lineStyle: { color: '#E2E8F0' } },
        axisLabel: { color: '#64748B', fontSize: 11 },
      },
      yAxis: [
        {
          type: 'value',
          name: 'GMV (元)',
          nameTextStyle: { color: '#64748B', fontSize: 11 },
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: { color: '#64748B', fontSize: 11 },
          splitLine: { lineStyle: { color: '#F1F5F9' } },
        },
        {
          type: 'value',
          name: '订单量',
          nameTextStyle: { color: '#64748B', fontSize: 11 },
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: { color: '#64748B', fontSize: 11 },
          splitLine: { show: false },
        },
      ],
      series: [
        {
          name: 'GMV',
          type: 'line',
          yAxisIndex: 0,
          data: gmvData,
          smooth: true,
          lineStyle: { width: 2.5, color: CHART_COLORS.primary },
          itemStyle: { color: CHART_COLORS.primary },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(14, 165, 233, 0.25)' },
                { offset: 1, color: 'rgba(14, 165, 233, 0.02)' },
              ],
            },
          },
          symbol: 'circle',
          symbolSize: 0,
          emphasis: { focus: 'series' },
        },
        {
          name: '订单量',
          type: 'line',
          yAxisIndex: 1,
          data: ordersData,
          smooth: true,
          lineStyle: { width: 2, color: CHART_COLORS.secondary },
          itemStyle: { color: CHART_COLORS.secondary },
          symbol: 'circle',
          symbolSize: 0,
          emphasis: { focus: 'series' },
        },
      ],
    };
  }, [dailyStats]);

  const channelPieOption: EChartsOption = useMemo(() => {
    const data = channelGmvData.map((c) => ({
      name: c.name,
      value: c.value,
    }));

    return {
      tooltip: {
        trigger: 'item',
        formatter: (params: any) =>
          `${params.name}<br/>GMV: ¥${params.value.toLocaleString()}<br/>占比: ${params.percent}%`,
      },
      legend: {
        orient: 'vertical',
        right: '5%',
        top: 'center',
        itemGap: 12,
        textStyle: { fontSize: 12, color: '#475569' },
      },
      color: CHART_SERIES.slice(0, 4),
      series: [
        {
          name: '渠道GMV',
          type: 'pie',
          radius: ['55%', '78%'],
          center: ['35%', '50%'],
          avoidLabelOverlap: false,
          label: { show: false },
          emphasis: {
            label: { show: false },
            scale: true,
            scaleSize: 6,
          },
          labelLine: { show: false },
          data,
        },
      ],
    };
  }, [channelGmvData]);

  const navigate = useNavigate();

  const alertIconMap: Record<string, typeof AlertTriangle> = {
    aftersale: AlertTriangle,
    inventory: Package,
    product: Package,
    traffic: TrendingDown,
  };

  const alertRouteMap: Record<string, string> = {
    aftersale: '/aftersale',
    inventory: '/inventory',
    product: '/products',
    traffic: '/traffic',
  };

  if (loading || !summary) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">加载经营数据中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      {/* 页面标题 */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-foreground">经营总览</h1>
          <p className="text-sm text-muted-foreground mt-1">
            实时监控核心经营指标，快速洞察业务健康度
          </p>
        </div>
        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span className="text-xs text-muted-foreground">
              {dayjs(lastUpdated).format('HH:mm:ss')} 更新
            </span>
          )}
          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`size-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            刷新
          </button>
          <Badge variant="secondary" className="text-xs h-7 px-3">
            今日 · {dayjs().format('M月D日')}
          </Badge>
        </div>
      </div>

      {/* KPI 卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpiItems.map((item) => (
            <KpiCard
              key={item.key}
              label={item.label}
              value={summary[item.valueKey as keyof typeof summary] as number}
              change={summary[item.changeKey as keyof typeof summary] as number}
              prefix={item.prefix}
              suffix={item.suffix}
              Icon={item.icon}
              invertGood={(item as { invertGood?: boolean }).invertGood}
              format={item.format}
            />
        ))}
      </div>

      <Card className="border-border/60 shadow-sm overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">快捷入口</CardTitle>
          <p className="text-xs text-muted-foreground">一键进入常用模块</p>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {quickEntries.map((entry) => {
              const Icon = entry.icon;
              return (
                <button
                  type="button"
                  key={entry.key}
                  onClick={() => navigate(entry.route)}
                  className="group flex flex-col items-start gap-2 rounded-lg border border-border p-4 text-left hover:border-primary/40 hover:bg-accent/50 transition-all cursor-pointer"
                >
                  <div className={`size-9 rounded-lg flex items-center justify-center ${entry.color}`}>
                    <Icon className="size-4.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                      {entry.label}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {entry.desc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 图表区 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* GMV & 订单趋势 - 占2列 */}
        <Card className="lg:col-span-2 border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">
              GMV 与订单量趋势
            </CardTitle>
            <p className="text-xs text-muted-foreground">近 30 天</p>
          </CardHeader>
          <CardContent className="pt-0">
            <ReactECharts
              option={gmvOrderOption}
             
              style={{ height: '340px', width: '100%' }}
            />
          </CardContent>
        </Card>

        {/* 渠道 GMV 占比 - 占1列 */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">
              各渠道 GMV 占比
            </CardTitle>
            <p className="text-xs text-muted-foreground">今日渠道分布</p>
          </CardHeader>
          <CardContent className="pt-0">
            <ReactECharts
              option={channelPieOption}
             
              style={{ height: '340px', width: '100%' }}
            />
          </CardContent>
        </Card>
      </div>

      {/* 异常指标提醒 */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <AlertCircle className="size-5 text-amber-500" />
                异常指标提醒
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                系统检测到 {alerts.length} 项需要关注的指标
              </p>
            </div>
            <Badge variant="destructive" className="text-xs">
              {alerts.filter((a) => a.level === 'danger').length} 项严重
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {alerts.map((alertItem) => {
              const Icon = alertIconMap[alertItem.category] ?? AlertCircle;
              const isDanger = alertItem.level === 'danger';
              return (
                <button
                  type="button"
                  key={alertItem.id}
                  onClick={() => navigate(alertRouteMap[alertItem.category] || '/')}
                  className={`flex items-start gap-3 p-4 rounded-lg border text-left cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all ${
                    isDanger
                      ? 'border-red-200 bg-red-50/50'
                      : 'border-amber-200 bg-amber-50/50'
                  }`}
                >
                  <div
                    className={`size-9 rounded-lg flex items-center justify-center shrink-0 ${
                      isDanger ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
                    }`}
                  >
                    <Icon className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">
                        {alertItem.title}
                      </span>
                      <Badge
                        variant={isDanger ? 'destructive' : 'secondary'}
                        className="text-[10px] h-5 px-1.5"
                      >
                        {isDanger ? '严重' : '警告'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                      {alertItem.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
