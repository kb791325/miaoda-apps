import { useState, useEffect, useRef, useCallback } from 'react';
import { Skeleton } from '@client/src/components/ui/skeleton';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';
import { ExpensePanel } from './ExpensePanel';
import { AssetPanel } from './AssetPanel';
import * as dashboardApi from '@client/src/api/dashboard';
import type {
  DashboardExpenseOverview,
  DashboardTrendItem,
  DashboardCategoryItem,
  DashboardAssetOverview,
  DashboardBudgetExecutionItem,
  DashboardExpenseRanking,
  DashboardAssetStatusItem,
  DashboardAssetDepreciation,
  DashboardRepairAssetItem,
} from '@shared/api.interface';

type DashboardTab = 'expense' | 'asset';

const DashboardPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<DashboardTab>('expense');

  // Expense state
  const [overview, setOverview] = useState<DashboardExpenseOverview | null>(null);
  const [trend, setTrend] = useState<DashboardTrendItem[]>([]);
  const [categories, setCategories] = useState<DashboardCategoryItem[]>([]);
  const [budgetExecution, setBudgetExecution] = useState<DashboardBudgetExecutionItem[]>([]);
  const [expenseRanking, setExpenseRanking] = useState<DashboardExpenseRanking>({
    byDepartment: [],
    byCategory: [],
    byHandler: [],
  });

  // Asset state
  const [assets, setAssets] = useState<DashboardAssetOverview | null>(null);
  const [statusDistribution, setStatusDistribution] = useState<DashboardAssetStatusItem[]>([]);
  const [depreciation, setDepreciation] = useState<DashboardAssetDepreciation | null>(null);
  const [repairPending, setRepairPending] = useState<DashboardRepairAssetItem[]>([]);

  const [expenseLoading, setExpenseLoading] = useState(true);
  const [assetLoading, setAssetLoading] = useState(false);
  const [assetLoaded, setAssetLoaded] = useState(false);
  const isExpenseFetchingRef = useRef(false);
  const isAssetFetchingRef = useRef(false);
  const timerRef = useRef<number | undefined>(undefined);
  const activeTabRef = useRef<DashboardTab>('expense');
  const assetLoadedRef = useRef(false);

  // 支出看板数据加载
  const fetchExpenseData = useCallback(async () => {
    if (isExpenseFetchingRef.current) return;
    isExpenseFetchingRef.current = true;
    try {
      const results = await Promise.allSettled([
        dashboardApi.getExpenseOverview(),
        dashboardApi.getExpenseTrend(12),
        dashboardApi.getExpenseByCategory(),
        dashboardApi.getExpenseBudgetExecution(),
        dashboardApi.getExpenseRanking(),
      ]);

      const names = [
        'getExpenseOverview',
        'getExpenseTrend',
        'getExpenseByCategory',
        'getExpenseBudgetExecution',
        'getExpenseRanking',
      ] as const;
      const failedCount = results.filter((res) => res.status === 'rejected').length;
      results.forEach((res, i) => {
        if (res.status === 'rejected') {
          logger.error(`dashboard api ${names[i]} fail`, res.reason);
        }
      });
      if (failedCount > 0) {
        toast.error('部分数据加载失败，请刷新重试');
      }

      const [overviewRes, trendRes, categoryRes, budgetExecRes, rankingRes] = results;

      if (overviewRes.status === 'fulfilled') setOverview(overviewRes.value);
      setTrend(trendRes.status === 'fulfilled' ? trendRes.value || [] : []);
      setCategories(categoryRes.status === 'fulfilled' ? categoryRes.value || [] : []);
      setBudgetExecution(budgetExecRes.status === 'fulfilled' ? budgetExecRes.value || [] : []);
      setExpenseRanking(
        rankingRes.status === 'fulfilled'
          ? rankingRes.value || { byDepartment: [], byCategory: [], byHandler: [] }
          : { byDepartment: [], byCategory: [], byHandler: [] },
      );
    } finally {
      isExpenseFetchingRef.current = false;
      setExpenseLoading(false);
    }
  }, []);

  // 资产看板数据加载（仅在切换到资产 tab 时首次加载）
  const fetchAssetData = useCallback(async () => {
    if (isAssetFetchingRef.current) return;
    isAssetFetchingRef.current = true;
    setAssetLoading(true);
    try {
      const results = await Promise.allSettled([
        dashboardApi.getAssetOverview(),
        dashboardApi.getAssetStatusDistribution(),
        dashboardApi.getAssetDepreciation(),
        dashboardApi.getAssetRepairPending(),
      ]);

      const names = [
        'getAssetOverview',
        'getAssetStatusDistribution',
        'getAssetDepreciation',
        'getAssetRepairPending',
      ] as const;
      const failedCount = results.filter((res) => res.status === 'rejected').length;
      results.forEach((res, i) => {
        if (res.status === 'rejected') {
          logger.error(`dashboard api ${names[i]} fail`, res.reason);
        }
      });
      if (failedCount > 0) {
        toast.error('部分数据加载失败，请刷新重试');
      }

      const [assetRes, statusRes, deprecRes, repairRes] = results;

      if (assetRes.status === 'fulfilled') setAssets(assetRes.value);
      setStatusDistribution(statusRes.status === 'fulfilled' ? statusRes.value || [] : []);
      if (deprecRes.status === 'fulfilled') setDepreciation(deprecRes.value);
      setRepairPending(repairRes.status === 'fulfilled' ? repairRes.value || [] : []);

      setAssetLoaded(true);
    } finally {
      isAssetFetchingRef.current = false;
      setAssetLoading(false);
    }
  }, []);

  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  useEffect(() => {
    assetLoadedRef.current = assetLoaded;
  }, [assetLoaded]);

  // 初始加载支出数据并启动轮询
  useEffect(() => {
    if (activeTabRef.current === 'expense') {
      fetchExpenseData();
    }
    const fetchActive = () => {
      if (activeTabRef.current === 'expense') {
        fetchExpenseData();
      } else if (assetLoadedRef.current) {
        fetchAssetData();
      }
    };
    timerRef.current = window.setInterval(fetchActive, 60000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 切换到资产 tab 时按需加载
  useEffect(() => {
    if (activeTab === 'asset' && !assetLoaded) {
      fetchAssetData();
    }
  }, [activeTab, assetLoaded, fetchAssetData]);

  const tabs: Array<{ key: DashboardTab; label: string }> = [
    { key: 'expense', label: '支出看板' },
    { key: 'asset', label: '资产看板' },
  ];

  return (
    <div className="bg-background p-6 min-h-full">
      <h1 className="text-2xl font-bold text-foreground mb-6">
        综合数据看板
      </h1>

      {/* Tab navigation */}
      <div className="bg-card rounded-lg shadow-sm p-1 mb-5 inline-flex">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="relative px-5 py-2 text-sm font-medium transition-colors rounded-md"
          >
            <span
              className={
                activeTab === tab.key
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }
            >
              {tab.label}
            </span>
            {activeTab === tab.key && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
            )}
          </button>
        ))}
      </div>

      {(activeTab === 'expense' && expenseLoading) || (activeTab === 'asset' && assetLoading) ? (
        <DashboardSkeleton />
      ) : activeTab === 'expense' ? (
        <ExpensePanel
          overview={overview}
          trend={trend}
          categories={categories}
          budgetExecution={budgetExecution}
          expenseRanking={expenseRanking}
        />
      ) : (
        <AssetPanel
          assets={assets}
          statusData={statusDistribution}
          depreciation={depreciation}
          repairPending={repairPending}
        />
      )}
    </div>
  );
};

function DashboardSkeleton(): React.ReactElement {
  return (
    <div className="space-y-4">
      {/* stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i: number) => (
          <div key={i} className="bg-card rounded-lg shadow-sm p-5">
            <Skeleton className="h-4 w-20 mb-3" />
            <Skeleton className="h-8 w-28" />
          </div>
        ))}
      </div>
      {/* 2-column charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card rounded-lg shadow-sm p-5">
          <Skeleton className="h-5 w-32 mb-4" />
          <Skeleton className="h-64 w-full" />
        </div>
        <div className="bg-card rounded-lg shadow-sm p-5">
          <Skeleton className="h-5 w-28 mb-4" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
      {/* full-width chart */}
      <div className="bg-card rounded-lg shadow-sm p-5">
        <Skeleton className="h-5 w-24 mb-4" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  );
}

export default DashboardPage;
