import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getDashboard } from '@client/src/api/finance';
import type { FinanceDashboardResponse } from '@shared/finance';
import FinanceDateRangeFilter from './FinanceDateRangeFilter';
import FinanceSummaryCards from './FinanceSummaryCards';
import FinanceTrendCharts from './FinanceTrendCharts';
import FinanceRankTables from './FinanceRankTables';
import type { DateRangePreset, FinanceDateRange } from './finance-utils';
import { getDefaultRange } from './finance-utils';

/** 财务仪表盘（/finance）：区间筛选 + 7 项汇总 + 趋势图 + 商品/客户利润排行 */
const FinanceDashboardPage: React.FC = () => {
  const [preset, setPreset] = useState<DateRangePreset>('month');
  const [range, setRange] = useState<FinanceDateRange>(getDefaultRange());
  const [data, setData] = useState<FinanceDashboardResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);
  const [reloadFlag, setReloadFlag] = useState<number>(0);

  useEffect(() => {
    let mounted: boolean = true;
    setLoading(true);
    setError(false);
    getDashboard(range)
      .then((result: FinanceDashboardResponse) => {
        if (mounted) {
          setData(result);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (mounted) {
          setLoading(false);
          setError(true);
        }
        const message: string = err instanceof Error ? err.message : '请求失败';
        toast.error(`财务数据加载失败：${message}`);
      });
    return () => {
      mounted = false;
    };
  }, [range, reloadFlag]);

  const handlePresetChange = (
    nextPreset: DateRangePreset,
    nextRange: FinanceDateRange,
  ): void => {
    setPreset(nextPreset);
    setRange(nextRange);
  };

  const handleRetry = useCallback((): void => {
    setReloadFlag((n: number) => n + 1);
  }, []);

  if (error && !loading && data === null) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">财务仪表盘</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            收入、成本与利润经营总览
          </p>
        </div>
        <FinanceDateRangeFilter
          preset={preset}
          range={range}
          onPresetChange={handlePresetChange}
        />
        <div className="flex h-[300px] flex-col items-center justify-center gap-3 rounded-lg border border-border bg-card text-sm text-muted-foreground shadow-sm">
          <p>财务数据加载失败，请稍后重试</p>
          <Button variant="outline" size="sm" onClick={handleRetry}>
            <RefreshCw className="mr-1 h-4 w-4" />
            重新加载
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">财务仪表盘</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          收入、成本与利润经营总览（统计区间内已完成订单）
        </p>
      </div>

      <FinanceDateRangeFilter
        preset={preset}
        range={range}
        onPresetChange={handlePresetChange}
      />

      <FinanceSummaryCards summary={data?.summary ?? null} loading={loading} />

      <FinanceTrendCharts
        trend={data?.trend ?? []}
        loading={loading}
        error={error}
        onRetry={handleRetry}
      />

      <FinanceRankTables
        productRank={data?.productRank ?? []}
        customerRank={data?.customerRank ?? []}
        loading={loading}
        error={error}
        onRetry={handleRetry}
      />
    </div>
  );
};

export default FinanceDashboardPage;
