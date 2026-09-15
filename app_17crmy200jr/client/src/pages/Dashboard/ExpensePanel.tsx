import React from 'react';
import { DollarSign, FileText, TrendingUp, Calendar } from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { BudgetExecutionChart } from './BudgetExecutionChart';
import {
  CHART_PRIMARY,
  CHART_SECONDARY,
  CHART_SUCCESS,
  CHART_ERROR,
  CHART_COLORS_6,
} from '@client/src/utils/chart-colors';
import type {
  DashboardExpenseOverview,
  DashboardTrendItem,
  DashboardCategoryItem,
  DashboardBudgetExecutionItem,
  DashboardExpenseRanking,
  DashboardRankingItem,
} from '@shared/api.interface';

const BORDER = '#e2e8f0';
const MUTED = '#64748b';

function getCssVar(name: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return value || fallback;
}

function formatAmount(value: number): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatGrowth(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

function buildPieData(items: DashboardCategoryItem[]): Array<{ name: string; value: number }> {
  const top5 = items.slice(0, 5);
  const rest = items.slice(5);
  const result = top5.map((item: DashboardCategoryItem) => ({
    name: item.category,
    value: item.amount,
  }));
  if (rest.length > 0) {
    const otherSum = rest.reduce((sum: number, item: DashboardCategoryItem) => sum + item.amount, 0);
    result.push({ name: '其他', value: otherSum });
  }
  return result;
}

function buildBarOption(
  data: DashboardRankingItem[],
  title: string,
): EChartsOption {
  const reversed = [...data].reverse();
  const maxVal = data.length > 0
    ? Math.max(...data.map((d: DashboardRankingItem) => d.amount))
    : 0;

  const xMax = maxVal > 0 ? Math.ceil(maxVal * 1.1) : 10;
  const rawStep = xMax / 4;
  const order = Math.pow(10, Math.floor(Math.log10(rawStep)) || 0);
  const ratio = rawStep / order;
  let niceStep: number;
  if (ratio <= 1) niceStep = 1;
  else if (ratio <= 2) niceStep = 2;
  else if (ratio <= 2.5 && order >= 10) niceStep = 2.5;
  else if (ratio <= 5) niceStep = 5;
  else niceStep = 10;
  const interval = Math.max(1, niceStep * order);
  const alignedMax = interval * 5;

  const textColor = getCssVar('--foreground', '#0f172a');
  const mutedColor = getCssVar('--muted-foreground', '#64748b');
  const borderColor = getCssVar('--border', '#e2e8f0');

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: unknown) => {
        const list = Array.isArray(params) ? params : [params];
        const p = list[0] as { name?: string; value?: number };
        if (!p) return '';
        const val = Number(p.value);
        return `${p.name}<br/>支出金额: ¥${val.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`;
      },
    },
    grid: {
      containLabel: true,
      left: 10,
      right: 20,
      top: 10,
      bottom: 10,
    },
    xAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: borderColor, type: 'dashed' } },
      axisLabel: {
        color: mutedColor,
        fontSize: 11,
        formatter: (value: number) => {
          if (value >= 10000) return `${(value / 10000).toFixed(0)}万`;
          return String(value);
        },
      },
      max: alignedMax,
      interval: interval,
    },
    yAxis: {
      type: 'category',
      data: reversed.map((item: DashboardRankingItem) => item.name),
      axisLine: { lineStyle: { color: borderColor } },
      axisTick: { show: false },
      axisLabel: { color: textColor, fontSize: 12, fontWeight: 500 },
    },
    series: [
      {
        name: title,
        type: 'bar',
        barWidth: '55%',
        itemStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 1,
            y2: 0,
            colorStops: [
              { offset: 0, color: CHART_SECONDARY },
              { offset: 1, color: CHART_PRIMARY },
            ],
          },
          borderRadius: [0, 4, 4, 0],
        },
        data: reversed.map((item: DashboardRankingItem) => item.amount),
        label: {
          show: true,
          position: 'right',
          fontSize: 12,
          color: textColor,
          fontWeight: 500,
          fontFamily: 'JetBrains Mono, SF Mono, monospace',
          formatter: (params: unknown) => {
            const p = params as { value?: number };
            const val = Number(p.value);
            return `¥${val.toLocaleString('en-US', {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            })}`;
          },
        },
      },
    ],
  };
}

interface ExpensePanelProps {
  overview: DashboardExpenseOverview | null;
  trend: DashboardTrendItem[];
  categories: DashboardCategoryItem[];
  budgetExecution: DashboardBudgetExecutionItem[];
  expenseRanking: DashboardExpenseRanking;
}

const ExpensePanel = React.memo<ExpensePanelProps>(function ExpensePanel(props) {
  const { overview, trend, categories, budgetExecution, expenseRanking } = props;
  const growth = overview?.monthOnMonthGrowth ?? 0;
  const growthUp = growth >= 0;

  const statCards = [
    {
      label: '本月支出',
      value: `¥${formatAmount(overview?.monthlyTotal ?? 0)}`,
      icon: DollarSign,
      sub: '当月已产生支出',
      color: 'blue',
    },
    {
      label: '本月笔数',
      value: `${overview?.monthlyCount?.toLocaleString() ?? 0}`,
      icon: FileText,
      sub: '笔报销单',
      color: 'blue',
    },
    {
      label: '本年累计',
      value: `¥${formatAmount(overview?.yearlyTotal ?? 0)}`,
      icon: Calendar,
      sub: '全年累计支出',
      color: 'blue',
    },
    {
      label: '环比增长率',
      value: formatGrowth(growth),
      icon: TrendingUp,
      sub: growthUp ? '较上月增长' : '较上月下降',
      color: growthUp ? 'red' : 'green',
    },
  ];

  const trendOption: EChartsOption = {
    tooltip: { trigger: 'axis' },
    legend: { type: 'scroll', bottom: 0, data: ['支出金额'] },
    grid: { containLabel: true, left: 10, right: 10, top: 20, bottom: '18%' },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: trend.map((item: DashboardTrendItem) => {
        const parts = item.month.split('-');
        return `${parts[1]}月`;
      }),
      axisLine: { lineStyle: { color: BORDER } },
      axisLabel: { color: MUTED, fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: BORDER, type: 'dashed' } },
      axisLabel: { color: MUTED, fontSize: 11 },
    },
    series: [
      {
        name: '支出金额',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { color: CHART_PRIMARY, width: 2 },
        itemStyle: { color: CHART_PRIMARY },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: CHART_PRIMARY },
              { offset: 1, color: '#ffffff' },
            ],
          },
          opacity: 0.15,
        },
        data: trend.map((item: DashboardTrendItem) => item.amount),
      },
    ],
  };

  const pieOption: EChartsOption = {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: ¥{c} ({d}%)',
    },
    legend: { type: 'scroll', bottom: 0 },
    color: CHART_COLORS_6,
    series: [
      {
        name: '类目支出',
        type: 'pie',
        radius: ['45%', '70%'],
        center: ['50%', '45%'],
        avoidLabelOverlap: false,
        label: { show: false },
        emphasis: { label: { show: false } },
        labelLine: { show: false },
        data: buildPieData(categories),
      },
    ],
  };

  const deptRankingData = (expenseRanking.byDepartment ?? []).slice(0, 5);
  const catRankingData = (expenseRanking.byCategory ?? []).slice(0, 5);

  const deptBarOption = buildBarOption(deptRankingData, '部门支出');
  const catBarOption = buildBarOption(catRankingData, '类目支出');

  function iconColorClass(color: string): string {
    switch (color) {
      case 'green': return 'bg-emerald-100 text-emerald-500';
      case 'red': return 'bg-red-100 text-red-500';
      case 'amber': return 'bg-amber-100 text-amber-500';
      default: return 'bg-blue-100 text-primary';
    }
  }

  return (
    <div className="space-y-4">
      {/* 顶部总览卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4" data-ai-section-type="card-stat">
        {statCards.map((card) => {
          const Icon = card.icon;
          const isGrowth = card.color === 'red' || card.color === 'green';
          return (
            <div
              key={card.label}
              className="bg-card rounded-lg shadow-sm p-5 hover:shadow-md transition-shadow border border-border"
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${iconColorClass(card.color)}`}
                >
                  <Icon size={22} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-muted-foreground mb-1">{card.label}</div>
                  <div
                    className={`text-3xl font-bold font-mono text-right ${
                      card.color === 'red'
                        ? 'text-red-500'
                        : card.color === 'green'
                          ? 'text-emerald-500'
                          : 'text-foreground'
                    }`}
                  >
                    {card.value}
                  </div>
                </div>
              </div>
              <div className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                {isGrowth && (
                  <span className={card.color === 'red' ? 'text-red-500' : 'text-emerald-500'}>
                    {card.color === 'red' ? '↑' : '↓'}
                  </span>
                )}
                {card.sub}
              </div>
            </div>
          );
        })}
      </div>

      {/* 预算执行图 + 类目分布饼图 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 bg-card rounded-lg shadow-sm p-5 border border-border hover:shadow-md transition-shadow">
          <h3 className="text-base font-semibold text-foreground mb-4">
            预算执行（近6个月）
          </h3>
          <BudgetExecutionChart data={budgetExecution} />
        </div>
        <div className="bg-card rounded-lg shadow-sm p-5 border border-border hover:shadow-md transition-shadow">
          <h3 className="text-base font-semibold text-foreground mb-4">
            类目支出分布
          </h3>
          <ReactECharts
            option={pieOption}
            theme="ud"
            style={{ height: 280, width: '100%' }}
            notMerge
          />
        </div>
      </div>

      {/* 支出趋势图（全宽） */}
      <div className="bg-card rounded-lg shadow-sm p-5 border border-border hover:shadow-md transition-shadow">
        <h3 className="text-base font-semibold text-foreground mb-4">
          支出趋势
        </h3>
        <ReactECharts
          option={trendOption}
          theme="ud"
          style={{ height: 300, width: '100%' }}
          notMerge
        />
      </div>

      {/* 支出排行榜 TOP5：部门 + 类目 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card rounded-lg shadow-sm p-5 border border-border hover:shadow-md transition-shadow">
          <h3 className="text-base font-semibold text-foreground mb-4">
            部门支出排行榜 TOP5
          </h3>
          {deptRankingData.length === 0 ? (
            <div className="text-sm text-muted-foreground py-12 text-center">暂无数据</div>
          ) : (
            <ReactECharts
              option={deptBarOption}
              theme="ud"
              style={{ height: 260, width: '100%' }}
              notMerge
            />
          )}
        </div>
        <div className="bg-card rounded-lg shadow-sm p-5 border border-border hover:shadow-md transition-shadow">
          <h3 className="text-base font-semibold text-foreground mb-4">
            类目支出排行榜 TOP5
          </h3>
          {catRankingData.length === 0 ? (
            <div className="text-sm text-muted-foreground py-12 text-center">暂无数据</div>
          ) : (
            <ReactECharts
              option={catBarOption}
              theme="ud"
              style={{ height: 260, width: '100%' }}
              notMerge
            />
          )}
        </div>
      </div>
    </div>
  );
});

export { ExpensePanel };
