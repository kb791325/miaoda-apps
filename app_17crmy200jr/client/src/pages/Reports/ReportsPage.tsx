import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import type { TopLevelFormatterParams } from 'echarts/types/dist/shared';
import { RefreshCw } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import { Button } from '@client/src/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@client/src/components/ui/table';
import * as reportsApi from '@client/src/api/reports';
import type {
  ExpenseAnalysisResponse,
  AssetAnalysisResponse,
  InventoryAnalysisResponse,
} from '@shared/api.interface';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';

type TabKey = 'expense' | 'asset' | 'inventory';

import {
  CHART_PRIMARY,
  CHART_COLORS_5,
  CHART_ERROR,
} from '@client/src/utils/chart-colors';

const PRIMARY = CHART_PRIMARY;
const STEEL_BLUE = '#4a5568';
const STEEL_BLUE_LIGHT = '#718096';
const STEEL_BLUE_600 = '#4a5568';
const STEEL_BLUE_500 = '#5a6b83';
const STEEL_BLUE_400 = '#6b7d94';
const STEEL_BLUE_300 = '#8a97ab';
const STEEL_BLUE_200 = '#b0bccb';
const MUTED = '#a0aec0';
const BORDER = '#e2e8f0';

const formatNumber = (value: number): string => {
  return value.toLocaleString('en-US');
};

const ChartCard = ({ title, children, rightSlot }: { title: string; children: React.ReactNode; rightSlot?: React.ReactNode }) => (
  <div className="rounded-sm border bg-card" style={{ borderColor: BORDER }}>
    <div className="flex items-center justify-between border-b px-4 py-2.5" style={{ borderColor: BORDER }}>
      <h3 className="text-sm font-medium text-foreground">{title}</h3>
      {rightSlot}
    </div>
    <div className="p-3">{children}</div>
  </div>
);

const ReportsPage = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('expense');

  // Expense state
  const [timeDim, setTimeDim] = useState<'month' | 'quarter'>('month');
  const [dimType, setDimType] = useState<'category' | 'entity' | 'floor' | 'department'>('category');
  const [expenseData, setExpenseData] = useState<ExpenseAnalysisResponse | null>(null);
  const [expenseLoading, setExpenseLoading] = useState(false);

  // Asset state
  const [assetData, setAssetData] = useState<AssetAnalysisResponse | null>(null);
  const [assetLoading, setAssetLoading] = useState(false);

  // Inventory state
  const [invData, setInvData] = useState<InventoryAnalysisResponse | null>(null);
  const [invLoading, setInvLoading] = useState(false);

  const [refreshing, setRefreshing] = useState(false);
  const timerRef = useRef<number | undefined>(undefined);

  const fetchExpense = useCallback(async () => {
    setExpenseLoading(true);
    try {
      const data: ExpenseAnalysisResponse = await reportsApi.getExpenseAnalysis({
        timeDimension: timeDim,
        dimension: dimType,
      });
      setExpenseData(data);
    } catch (err: unknown) {
      logger.error('获取支出分析失败', err);
      toast.error('获取支出分析失败');
    } finally {
      setExpenseLoading(false);
    }
  }, [timeDim, dimType]);

  const fetchAsset = useCallback(async () => {
    setAssetLoading(true);
    try {
      const data: AssetAnalysisResponse = await reportsApi.getAssetAnalysis();
      setAssetData(data);
    } catch (err: unknown) {
      logger.error('获取资产分析失败', err);
      toast.error('获取资产分析失败');
    } finally {
      setAssetLoading(false);
    }
  }, []);

  const fetchInventory = useCallback(async () => {
    setInvLoading(true);
    try {
      const data: InventoryAnalysisResponse = await reportsApi.getInventoryAnalysis(
        new Date().getFullYear(),
      );
      setInvData(data);
    } catch (err: unknown) {
      logger.error('获取盘点分析失败', err);
      toast.error('获取盘点分析失败');
    } finally {
      setInvLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'expense' && !expenseData) {
      fetchExpense();
    }
  }, [activeTab, expenseData, fetchExpense]);

  useEffect(() => {
    if (activeTab === 'asset' && !assetData) {
      fetchAsset();
    }
  }, [activeTab, assetData, fetchAsset]);

  useEffect(() => {
    if (activeTab === 'inventory' && !invData) {
      fetchInventory();
    }
  }, [activeTab, invData, fetchInventory]);

  useEffect(() => {
    const fetchActive = () => {
      if (activeTab === 'expense' && expenseData) fetchExpense();
      else if (activeTab === 'asset' && assetData) fetchAsset();
      else if (activeTab === 'inventory' && invData) fetchInventory();
    };
    timerRef.current = window.setInterval(fetchActive, 60000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeTab, expenseData, assetData, invData, fetchExpense, fetchAsset, fetchInventory]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      if (activeTab === 'expense') {
        await fetchExpense();
      } else if (activeTab === 'asset') {
        await fetchAsset();
      } else {
        await fetchInventory();
      }
    } finally {
      setRefreshing(false);
    }
  };

  const expenseTrendOption = useMemo<EChartsOption>(() => {
    const trend = expenseData?.trend ?? [];
    return {
      tooltip: { trigger: 'axis' },
      legend: { type: 'scroll', bottom: 0 },
      grid: { left: '3%', right: '4%', bottom: '20%', containLabel: true },
      xAxis: {
        type: 'category',
        data: trend.map((item) => item.period),
        boundaryGap: false,
      },
      yAxis: { type: 'value' },
      series: [
        {
          name: '支出金额',
          type: 'line',
          data: trend.map((item) => item.amount),
          smooth: false,
          symbol: 'circle',
          symbolSize: 6,
          lineStyle: { color: PRIMARY, width: 2 },
          itemStyle: { color: PRIMARY },
        },
      ],
    };
  }, [expenseData]);

  const expensePieOption = useMemo<EChartsOption>(() => {
    const breakdown = expenseData?.dimensionBreakdown ?? [];
    const top5 = breakdown.slice(0, 5);
    return {
      tooltip: {
        trigger: 'item',
        formatter: (params: TopLevelFormatterParams) => {
          const p = Array.isArray(params) ? params[0] : params;
          const val = typeof p.value === 'number' ? p.value : 0;
          const percent = (p as { percent?: number }).percent ?? 0;
          return `${p.name}: ${formatNumber(val)} (${percent}%)`;
        },
      },
      legend: { type: 'scroll', bottom: 0 },
      series: [
        {
          name: '维度分布',
          type: 'pie',
          radius: ['45%', '70%'],
          center: ['50%', '45%'],
          data: top5.map((item, index) => ({
            name: item.name,
            value: item.amount,
            itemStyle: {
              color: CHART_COLORS_5[index % 5],
            },
          })),
          label: { show: false },
          emphasis: { label: { show: false } },
        },
      ],
    };
  }, [expenseData]);

  const topRankingOption = useMemo<EChartsOption>(() => {
    const ranking = expenseData?.topRanking ?? [];
    return {
      tooltip: { trigger: 'axis' },
      legend: { type: 'scroll', bottom: 0 },
      grid: { left: '3%', right: '4%', bottom: '20%', containLabel: true },
      xAxis: {
        type: 'category',
        data: ranking.map((item) => item.name),
        boundaryGap: true,
        axisLabel: { interval: 0, rotate: ranking.length > 8 ? 30 : 0 },
      },
      yAxis: { type: 'value' },
      series: [
        {
          name: '金额',
          type: 'bar',
          data: ranking.map((item) => item.amount),
          barMaxWidth: 40,
          itemStyle: { color: PRIMARY },
        },
      ],
    };
  }, [expenseData]);

  const assetTypePieOption = useMemo<EChartsOption>(() => {
    const items = assetData?.typeDistribution ?? [];
    const top5 = items.slice(0, 5);
    return {
      tooltip: {
        trigger: 'item',
        formatter: (params: TopLevelFormatterParams) => {
          const p = Array.isArray(params) ? params[0] : params;
          const val = typeof p.value === 'number' ? p.value : 0;
          const percent = (p as { percent?: number }).percent ?? 0;
          return `${p.name}: ${formatNumber(val)} (${percent}%)`;
        },
      },
      legend: { type: 'scroll', bottom: 0 },
      series: [
        {
          name: '类型分布',
          type: 'pie',
          radius: ['45%', '70%'],
          center: ['50%', '45%'],
          data: top5.map((item, index) => ({
            name: item.type,
            value: item.value,
            itemStyle: {
              color: CHART_COLORS_5[index % 5],
            },
          })),
          label: { show: false },
          emphasis: { label: { show: false } },
        },
      ],
    };
  }, [assetData]);

  const assetValueBarOption = useMemo<EChartsOption>(() => {
    const items = assetData?.valueDistribution ?? [];
    return {
      tooltip: { trigger: 'axis' },
      legend: { type: 'scroll', bottom: 0 },
      grid: { left: '3%', right: '4%', bottom: '20%', containLabel: true },
      xAxis: {
        type: 'category',
        data: items.map((item) => item.range),
        boundaryGap: true,
      },
      yAxis: { type: 'value' },
      series: [
        {
          name: '价值',
          type: 'bar',
          data: items.map((item) => item.value),
          barMaxWidth: 40,
          itemStyle: { color: PRIMARY },
        },
      ],
    };
  }, [assetData]);

  const floorBarOption = useMemo<EChartsOption>(() => {
    const items = assetData?.floorDistribution ?? [];
    return {
      tooltip: { trigger: 'axis' },
      legend: { type: 'scroll', bottom: 0 },
      grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
      xAxis: { type: 'value' },
      yAxis: {
        type: 'category',
        data: items.map((item) => item.floor),
      },
      series: [
        {
          name: '价值',
          type: 'bar',
          data: items.map((item) => item.value),
          barMaxWidth: 20,
          itemStyle: { color: PRIMARY },
        },
      ],
    };
  }, [assetData]);

  const inventoryTrendOption = useMemo<EChartsOption>(() => {
    const items = invData?.completionTrend ?? [];
    return {
      tooltip: { trigger: 'axis' },
      legend: { type: 'scroll', bottom: 0 },
      grid: { left: '3%', right: '4%', bottom: '20%', containLabel: true },
      xAxis: {
        type: 'category',
        data: items.map((item) => item.month),
        boundaryGap: false,
      },
      yAxis: { type: 'value', max: 100, axisLabel: { formatter: '{value}%' } },
      series: [
        {
          name: '完成率',
          type: 'line',
          data: items.map((item) => item.rate),
          smooth: false,
          symbol: 'circle',
          symbolSize: 6,
          lineStyle: { color: PRIMARY, width: 2 },
          itemStyle: { color: PRIMARY },
        },
      ],
    };
  }, [invData]);

  const abnormalRateOption = useMemo<EChartsOption>(() => {
    const items = invData?.abnormalRate ?? [];
    return {
      tooltip: { trigger: 'axis' },
      legend: { type: 'scroll', bottom: 0 },
      grid: { left: '3%', right: '4%', bottom: '20%', containLabel: true },
      xAxis: {
        type: 'category',
        data: items.map((item) => item.month),
        boundaryGap: true,
      },
      yAxis: { type: 'value', axisLabel: { formatter: '{value}%' } },
      series: [
        {
          name: '异常率',
          type: 'bar',
          data: items.map((item) => item.rate),
          barMaxWidth: 40,
          itemStyle: { color: CHART_ERROR },
        },
      ],
    };
  }, [invData]);

  const deptRankingOption = useMemo<EChartsOption>(() => {
    const items = invData?.departmentRanking ?? [];
    const sorted = [...items].sort((a, b) => a.completionRate - b.completionRate);
    return {
      tooltip: {
        trigger: 'axis',
        formatter: (params: TopLevelFormatterParams) => {
          const list = Array.isArray(params) ? params : [params];
          const p = list[0];
          const val = typeof p.value === 'number' ? p.value : 0;
          return `${p.name}: ${val}%`;
        },
      },
      legend: { type: 'scroll', bottom: 0 },
      grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
      xAxis: { type: 'value', max: 100, axisLabel: { formatter: '{value}%' } },
      yAxis: {
        type: 'category',
        data: sorted.map((item) => item.department),
      },
      series: [
        {
          name: '完成率',
          type: 'bar',
          data: sorted.map((item) => item.completionRate),
          barMaxWidth: 20,
          itemStyle: { color: PRIMARY },
        },
      ],
    };
  }, [invData]);

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'expense', label: '支出分析' },
    { key: 'asset', label: '资产分析' },
    { key: 'inventory', label: '盘点分析' },
  ];

  return (
    <div className="mx-auto max-w-[1400px] p-6">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground mb-1">数据统计与报表</h1>
          <p className="text-sm text-muted-foreground">多维度数据分析</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1 rounded-sm"
          onClick={handleRefresh}
          disabled={refreshing || expenseLoading || assetLoading || invLoading}
        >
          <RefreshCw className={`size-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          刷新数据
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex items-center border-b" style={{ borderColor: BORDER }}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`relative px-5 py-3 text-sm font-medium transition-colors ${
              activeTab === tab.key ? 'text-foreground' : 'text-muted-foreground hover:text-foreground/80'
            }`}
          >
            {tab.label}
            {activeTab === tab.key && (
              <span
                className="absolute bottom-0 left-0 right-0 h-0.5"
                style={{ backgroundColor: PRIMARY }}
              />
            )}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {/* Expense Tab */}
        {activeTab === 'expense' && (
          <div className="space-y-4">
            {/* Filter */}
            <div
              className="flex items-center justify-between rounded-sm border bg-card p-3"
              style={{ borderColor: BORDER }}
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">时间维度</span>
                  <Select value={timeDim} onValueChange={(v) => setTimeDim(v as 'month' | 'quarter')}>
                    <SelectTrigger className="w-[120px] rounded-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="month">按月</SelectItem>
                      <SelectItem value="quarter">按季度</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">分析维度</span>
                  <Select
                    value={dimType}
                    onValueChange={(v) =>
                      setDimType(v as 'category' | 'entity' | 'floor' | 'department')
                    }
                  >
                    <SelectTrigger className="w-[120px] rounded-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="category">类目</SelectItem>
                      <SelectItem value="entity">主体</SelectItem>
                      <SelectItem value="floor">楼层</SelectItem>
                      <SelectItem value="department">部门</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant="default"
                  size="sm"
                  className="rounded-sm"
                  onClick={fetchExpense}
                  disabled={expenseLoading}
                >
                  查询
                </Button>
              </div>
            </div>

            {/* Charts row 1 */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <ChartCard title="支出趋势">
                {expenseLoading ? (
                  <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
                    加载中...
                  </div>
                ) : (
                  <ReactECharts
                    option={expenseTrendOption}
                    theme="ud"
                    className="h-[300px] w-full"
                  />
                )}
              </ChartCard>
              <ChartCard title="维度分布">
                {expenseLoading ? (
                  <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
                    加载中...
                  </div>
                ) : (
                  <ReactECharts option={expensePieOption} theme="ud" className="h-[300px] w-full" />
                )}
              </ChartCard>
            </div>

            {/* TOP ranking */}
            <ChartCard title="TOP排行">
              {expenseLoading ? (
                <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
                  加载中...
                </div>
              ) : (
                <ReactECharts option={topRankingOption} theme="ud" className="h-[320px] w-full" />
              )}
            </ChartCard>

            {/* Detail table */}
            <ChartCard title="数据明细">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="h-10 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      名称
                    </TableHead>
                    <TableHead className="h-10 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      金额
                    </TableHead>
                    <TableHead className="h-10 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      占比
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenseData?.dimensionBreakdown
                    .slice()
                    .sort((a, b) => b.amount - a.amount)
                    .map((item, index) => (
                      <TableRow key={item.name}>
                        <TableCell className="h-10 text-sm">
                          <span className="inline-flex w-5 text-muted-foreground">{index + 1}</span>
                          {item.name}
                        </TableCell>
                        <TableCell
                          className="h-10 text-right font-mono text-sm text-foreground"
                          style={{ fontVariantNumeric: 'tabular-nums' }}
                        >
                          ¥{formatNumber(item.amount)}
                        </TableCell>
                        <TableCell
                          className="h-10 text-right font-mono text-sm text-muted-foreground"
                          style={{ fontVariantNumeric: 'tabular-nums' }}
                        >
                          {(item.percentage ?? 0).toFixed(2)}%
                        </TableCell>
                      </TableRow>
                    ))}
                  {!expenseData?.dimensionBreakdown.length && !expenseLoading && (
                    <TableRow>
                      <TableCell colSpan={3} className="h-16 text-center text-sm text-muted-foreground">
                        暂无数据
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ChartCard>
          </div>
        )}

        {/* Asset Tab */}
        {activeTab === 'asset' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <ChartCard title="类型分布">
                {assetLoading ? (
                  <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
                    加载中...
                  </div>
                ) : (
                  <ReactECharts option={assetTypePieOption} theme="ud" className="h-[300px] w-full" />
                )}
              </ChartCard>
              <ChartCard title="价值分布">
                {assetLoading ? (
                  <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
                    加载中...
                  </div>
                ) : (
                  <ReactECharts
                    option={assetValueBarOption}
                    theme="ud"
                    className="h-[300px] w-full"
                  />
                )}
              </ChartCard>
            </div>

            <ChartCard title="楼层分布">
              {assetLoading ? (
                <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
                  加载中...
                </div>
              ) : (
                <ReactECharts option={floorBarOption} theme="ud" className="h-[340px] w-full" />
              )}
            </ChartCard>

            <ChartCard title="资产明细">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="h-10 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      类型
                    </TableHead>
                    <TableHead className="h-10 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      数量
                    </TableHead>
                    <TableHead className="h-10 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      价值
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assetData?.typeDistribution.map((item) => (
                    <TableRow key={item.type}>
                      <TableCell className="h-10 text-sm">{item.type}</TableCell>
                      <TableCell
                        className="h-10 text-right font-mono text-sm"
                        style={{ fontVariantNumeric: 'tabular-nums' }}
                      >
                        {formatNumber(item.count)}
                      </TableCell>
                      <TableCell
                        className="h-10 text-right font-mono text-sm text-foreground"
                        style={{ fontVariantNumeric: 'tabular-nums' }}
                      >
                        ¥{formatNumber(item.value)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!assetData?.typeDistribution.length && !assetLoading && (
                    <TableRow>
                      <TableCell colSpan={3} className="h-16 text-center text-sm text-muted-foreground">
                        暂无数据
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ChartCard>
          </div>
        )}

        {/* Inventory Tab */}
        {activeTab === 'inventory' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <ChartCard title="完成率趋势">
                {invLoading ? (
                  <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
                    加载中...
                  </div>
                ) : (
                  <ReactECharts
                    option={inventoryTrendOption}
                    theme="ud"
                    className="h-[300px] w-full"
                  />
                )}
              </ChartCard>
              <ChartCard title="异常率">
                {invLoading ? (
                  <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
                    加载中...
                  </div>
                ) : (
                  <ReactECharts option={abnormalRateOption} theme="ud" className="h-[300px] w-full" />
                )}
              </ChartCard>
            </div>

            <ChartCard title="部门完成率排行">
              {invLoading ? (
                <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
                  加载中...
                </div>
              ) : (
                <ReactECharts option={deptRankingOption} theme="ud" className="h-[340px] w-full" />
              )}
            </ChartCard>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportsPage;
