import React, { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  fetchSalesRank,
  fetchStatusDistribution,
  fetchSummary,
  fetchTrend,
} from '@client/src/api/dashboard';
import { fetchCustomers } from '@client/src/api/customer';
import type {
  DashboardSummary,
  SalesRankResponse,
  StatusDistributionResponse,
  TrendResponse,
} from '@shared/dashboard';
import type { CustomerListResponse } from '@shared/customer';
import SummaryCards from '@client/src/pages/Dashboard/SummaryCards';
import TrendChart from '@client/src/pages/Dashboard/TrendChart';
import StatusPieChart from '@client/src/pages/Dashboard/StatusPieChart';
import SalesRankChart from '@client/src/pages/Dashboard/SalesRankChart';
import QuickActions from '@client/src/pages/Dashboard/QuickActions';
import WarningProductsCard from '@client/src/pages/Dashboard/WarningProductsCard';
import SalesFunnelChart from '@client/src/pages/Dashboard/SalesFunnelChart';

interface QueryState<T> {
  data: T | null;
  loading: boolean;
  error: boolean;
  reload: () => void;
}

/** 仪表盘通用查询 hook：独立 loading，失败置 error 态供图表展示重试入口 */
const useDashboardQuery = <T,>(fetcher: () => Promise<T>): QueryState<T> => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadFlag, setReloadFlag] = useState(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(false);
    fetcherRef
      .current()
      .then((result: T) => {
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
        const message = err instanceof Error ? err.message : '请求失败';
        toast.error(`数据加载失败：${message}`);
      });
    return () => {
      mounted = false;
    };
  }, [reloadFlag]);

  const reload = useCallback(() => setReloadFlag((n: number) => n + 1), []);

  return { data, loading, error, reload };
};

/** 工作台内嵌数据总览区块：统计卡片 + 快捷操作 + 趋势 / 状态分布 / 销量排行 / 库存预警 */
const HomeDashboard: React.FC = () => {
  const summaryQuery = useDashboardQuery<DashboardSummary>(fetchSummary);
  const trendQuery = useDashboardQuery<TrendResponse>(() => fetchTrend(30));
  const statusQuery =
    useDashboardQuery<StatusDistributionResponse>(fetchStatusDistribution);
  const rankQuery = useDashboardQuery<SalesRankResponse>(() =>
    fetchSalesRank(10),
  );
  const funnelQuery = useDashboardQuery<CustomerListResponse>(fetchCustomers);
  const [warningRefreshKey, setWarningRefreshKey] = useState(0);

  const handleStockChanged = useCallback(() => {
    summaryQuery.reload();
    rankQuery.reload();
    setWarningRefreshKey((n: number) => n + 1);
  }, [summaryQuery, rankQuery]);

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">数据总览</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          经营总览驾驶舱：订单、销售额与库存预警一览
        </p>
      </div>

      <SummaryCards summary={summaryQuery.data} loading={summaryQuery.loading} />

      <QuickActions onStockChanged={handleStockChanged} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <TrendChart
          items={trendQuery.data?.items ?? []}
          loading={trendQuery.loading}
          error={trendQuery.error}
          onRetry={trendQuery.reload}
        />
        <StatusPieChart
          items={statusQuery.data?.items ?? []}
          loading={statusQuery.loading}
          error={statusQuery.error}
          onRetry={statusQuery.reload}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SalesRankChart
          items={rankQuery.data?.items ?? []}
          loading={rankQuery.loading}
          error={rankQuery.error}
          onRetry={rankQuery.reload}
        />
        <WarningProductsCard refreshKey={warningRefreshKey} />
      </div>

      <SalesFunnelChart
        customers={funnelQuery.data?.items ?? []}
        loading={funnelQuery.loading}
        error={funnelQuery.error}
        onRetry={funnelQuery.reload}
      />
    </section>
  );
};

export default HomeDashboard;
