import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { Users } from 'lucide-react';
import { CHART_COLORS_5 } from '@client/src/utils/chart-colors';
import type { StockOverview, StockTrendItem } from '@shared/api.interface';

const CHART_COLORS = CHART_COLORS_5;

function formatNumber(n: number): string {
  return n.toLocaleString('zh-CN');
}

function formatCurrency(n: number): string {
  return `¥${n.toLocaleString('zh-CN')}`;
}

interface StockPanelProps {
  stock: StockOverview | null;
  stockTrend: StockTrendItem[];
  loadingStock: boolean;
  loadingTrend: boolean;
}

export function StockPanel({
  stock,
  stockTrend,
  loadingStock,
  loadingTrend,
}: StockPanelProps) {
  const stockTrendOption = useMemo((): EChartsOption => {
    const months = stockTrend.map((item) => item.month);
    const allTypes =
      stockTrend.length > 0
        ? stockTrend[0].byType.map((t) => t.assetType)
        : [];
    const topTypes = allTypes.slice(0, 5);

    const series = topTypes.map((type, idx) => ({
      name: type,
      type: 'line' as const,
      data: stockTrend.map((m) => {
        const found = m.byType.find((t) => t.assetType === type);
        return found ? found.count : 0;
      }),
      smooth: false,
      symbol: 'circle',
      symbolSize: 4,
      lineStyle: { width: 1.5 },
      itemStyle: { color: CHART_COLORS[idx % CHART_COLORS.length] },
    }));

    return {
      tooltip: { trigger: 'axis' },
      legend: {
        bottom: 0,
        type: 'scroll',
        textStyle: { fontSize: 10, color: '#718096' },
        itemWidth: 12,
        itemHeight: 8,
      },
      grid: {
        left: 40,
        right: 10,
        top: 10,
        bottom: 30,
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: months,
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisLabel: { fontSize: 10, color: '#718096' },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { fontSize: 10, color: '#718096' },
        splitLine: { lineStyle: { color: '#edf2f7' } },
      },
      series,
    };
  }, [stockTrend]);

  return (
    <div className="space-y-4">
      {/* Stock overview */}
      <div
        className="bg-card border border-border rounded-sm p-3"
        data-ai-section-type="card-list"
      >
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-sm font-semibold text-foreground">剩余库存</h3>
          {stock && (
            <span className="ml-auto text-right">
              <div className="text-xs text-muted-foreground">总库存价值</div>
              <div className="text-lg font-semibold font-mono text-primary">
                {formatCurrency(stock.totalValue)}
              </div>
            </span>
          )}
        </div>

        <div className="space-y-2 max-h-[180px] overflow-y-auto">
          {loadingStock && (
            <div className="text-center text-sm text-muted-foreground py-4">
              加载中...
            </div>
          )}
          {!loadingStock &&
            stock?.byType.map((item) => (
              <div
                key={item.assetType}
                className="flex items-center justify-between p-2 rounded-sm border border-border bg-accent/20"
              >
                <div>
                  <div className="text-sm font-medium text-foreground">
                    {item.assetType}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-mono font-semibold text-foreground">
                    {formatNumber(item.count)}
                  </div>
                  <div className="text-xs text-muted-foreground font-mono">
                    {formatCurrency(item.value)}
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Stock trend chart */}
      <div className="bg-card border border-border rounded-sm p-3">
        <h3 className="text-sm font-semibold text-foreground mb-2">
          近6个月库存趋势
        </h3>
        <div className="h-[180px]">
          {!loadingTrend && stockTrend.length > 0 ? (
            <ReactECharts
              option={stockTrendOption}
              theme="ud"
              style={{ height: '100%', width: '100%' }}
              notMerge={true}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
              {loadingTrend ? '加载中...' : '暂无数据'}
            </div>
          )}
        </div>
      </div>

      {/* Top owners bar */}
      <div className="bg-card border border-border rounded-sm p-3">
        <div className="flex items-center gap-2 mb-3">
          <Users className="size-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">
            持有排行 TOP10
          </h3>
        </div>
        <div className="space-y-1.5">
          {loadingStock && (
            <div className="text-center text-sm text-muted-foreground py-2">
              加载中...
            </div>
          )}
          {!loadingStock &&
            stock?.topOwners?.slice(0, 10).map((owner, idx) => {
              const maxCount = stock.topOwners[0]?.count || 1;
              const pct = (owner.count / maxCount) * 100;
              return (
                <div key={owner.ownerId} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-4 text-center font-mono">
                    {idx + 1}
                  </span>
                  <span className="text-xs text-foreground w-20 truncate flex-shrink-0">
                    {owner.ownerName}
                  </span>
                  <div className="flex-1 h-3 bg-accent/50 rounded-sm overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-sm"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono text-foreground w-8 text-right">
                    {owner.count}
                  </span>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
