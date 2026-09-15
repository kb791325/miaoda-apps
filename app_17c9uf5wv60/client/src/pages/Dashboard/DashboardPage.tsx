import { useState, useEffect, useCallback, useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { Button } from '@/components/ui/button';

import {
  WarehouseDistributionChart,
  CategoryTurnoverChart,
  DailyTrendChart,
  CategoryValueChart,
} from './DashboardCharts';
import { ProductTable } from './DashboardProductTable';
import { WarningTable, TopValueTable } from './DashboardTables';
import { products, inventory, records } from '@/api';
import { ProductDetailDialog } from '@/pages/Products/ProductDetailDialog';
import { calculateHealthScores } from '@/pages/AiTools/healthScoreEngine';
import type {
  DashboardStats,
  ProductListResponse,
  ProductWithInventory,
  WarningItem,
  HealthScore,
  StockTransaction,
} from '@shared/api.interface';

function formatCurrency(value: number): string {
  if (value >= 10000) {
    return `¥${(value / 10000).toFixed(1)}万`;
  }
  return `¥${value.toLocaleString()}`;
}

const DashboardPage = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [productData, setProductData] =
    useState<ProductListResponse | null>(null);
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [keyword, setKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statsRefreshing, setStatsRefreshing] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [allProducts, setAllProducts] = useState<ProductWithInventory[]>([]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await inventory.getDashboardStats();
      setStats(res);
    } catch (err) {
      logger.error('获取看板统计数据失败', err);
      toast.error('获取看板统计数据失败');
    }
  }, []);

  const fetchTransactions = useCallback(async () => {
    try {
      const res = await records.exportTransactions();
      setTransactions(Array.isArray(res) ? res : []);
    } catch (err) {
      logger.error('获取交易流水失败', err);
    }
  }, []);

  const fetchAllProducts = useCallback(async () => {
    try {
      const res = await products.getAllProducts();
      setAllProducts(Array.isArray(res) ? res : []);
    } catch (err) {
      logger.error('获取全量商品失败', err);
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await products.getProducts({
        page,
        pageSize: 10,
        category: category || undefined,
        status: status || undefined,
        keyword: debouncedKeyword || undefined,
      });
      setProductData(res);
    } catch (err) {
      logger.error('获取商品列表失败', err);
      toast.error('获取商品列表失败');
    }
  }, [page, category, status, debouncedKeyword]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedKeyword(keyword);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [keyword]);

  useEffect(() => {
    fetchStats();
    fetchTransactions();
    fetchAllProducts();
    const interval = setInterval(fetchStats, 10000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        fetchStats();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [fetchStats, fetchTransactions, fetchAllProducts]);

  const handleRefreshWarnings = useCallback(async () => {
    setStatsRefreshing(true);
    try {
      await fetchStats();
    } finally {
      setStatsRefreshing(false);
    }
  }, [fetchStats]);

  useEffect(() => {
    const fetchProductList = async () => {
      setLoading(true);
      await fetchProducts();
      setLoading(false);
    };
    fetchProductList();
  }, [fetchProducts]);

  const healthScoreMap = useMemo(() => {
    if (!allProducts.length) return new Map<string, HealthScore>();
    const scores = calculateHealthScores({
      products: allProducts,
      transactions,
      categoryTurnover: Array.isArray(stats?.categoryTurnover)
        ? stats!.categoryTurnover
        : [],
    });
    const map = new Map<string, HealthScore>();
    for (const s of scores) {
      map.set(s.productId, s);
    }
    return map;
  }, [allProducts, transactions, stats?.categoryTurnover]);

  if (loading && !stats) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_: unknown, i: number) => (
          <div
            key={i}
            className="h-24 bg-card border border-border rounded-sm animate-pulse"
          />
        ))}
      </div>
    );
  }

  const kpi = stats?.kpi;
  const warningItems = stats?.warningList ?? [];
  const topValueItems = stats?.topValue ?? [];
  const totalPages = productData
    ? Math.ceil(productData.total / productData.pageSize)
    : 0;

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-5 w-1 rounded-sm bg-primary" />
          <div>
            <h1 className="text-lg font-semibold text-foreground">
              库存看板
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              实时监控库存水位、仓储分布与出入库趋势
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshWarnings}
            disabled={statsRefreshing}
          >
            <RefreshCw
              className={`size-3.5 ${statsRefreshing ? 'animate-spin' : ''}`}
            />
            刷新数据
          </Button>
        </div>
      </div>

      {/* Warning Banner */}
      {kpi && kpi.warningCount > 0 && (
        <div className="flex items-center justify-between px-4 py-3 bg-primary/5 border border-primary/20 rounded-sm">
          <div className="flex items-center gap-2 text-sm text-primary">
            <AlertTriangle className="size-4 shrink-0" />
            <span>
              当前有{' '}
              <span className="font-semibold">
                {kpi.warningCount}
              </span>{' '}
              件商品库存低于安全线
            </span>
          </div>
          <div className="flex items-center gap-2">
            <NavLink to="/products">
              <Button variant="outline" size="sm">
                查看预警
              </Button>
            </NavLink>
            <NavLink to="/ai-tools">
              <Button size="sm">
                AI补货建议
              </Button>
            </NavLink>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      {kpi && (
        <div
          className="grid grid-cols-2 md:grid-cols-4 gap-3"
          data-ai-section-type="card-stat"
        >
          <div className="relative bg-card border border-border rounded-sm shadow-none p-4">
            <div className="absolute top-0 left-0 w-[3px] h-[3px] bg-primary" />
            <p className="text-xs text-muted-foreground">
              总SKU数
            </p>
            <p className="font-mono text-3xl font-light mt-1 text-foreground">
              {kpi.totalSku}
            </p>
          </div>
          <div className="relative bg-card border border-border rounded-sm shadow-none p-4">
            <div className="absolute top-0 left-0 w-[3px] h-[3px] bg-success" />
            <p className="text-xs text-muted-foreground">
              总库存量(件)
            </p>
            <p className="font-mono text-3xl font-light mt-1 text-foreground">
              {kpi.totalStock.toLocaleString()}
            </p>
          </div>
          <div className="relative bg-card border border-border rounded-sm shadow-none p-4">
            <div className="absolute top-0 left-0 w-[3px] h-[3px] bg-primary" />
            <p className="text-xs text-muted-foreground">
              总库存金额(¥)
            </p>
            <p className="font-mono text-3xl font-light mt-1 text-foreground">
              {formatCurrency(kpi.totalValue)}
            </p>
          </div>
          <div className="relative bg-card border border-border rounded-sm shadow-none p-4">
            <div className="absolute top-0 left-0 w-[3px] h-[3px] bg-warning" />
            <p className="text-xs text-muted-foreground">
              预警商品数
            </p>
            <p className="font-mono text-3xl font-light mt-1 text-foreground">
              {kpi.warningCount}
            </p>
          </div>
        </div>
      )}

      {/* Charts Grid */}
      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="bg-card border border-border rounded-sm shadow-none p-4">
            <h3 className="text-sm font-medium text-foreground mb-2">
              仓库库存分布
            </h3>
            <WarehouseDistributionChart
              data={stats.warehouseDistribution}
            />
          </div>
           <div className="bg-card border border-border rounded-sm shadow-none p-4">
             <h3 className="text-sm font-medium text-foreground mb-2">
               品类库存周转率
             </h3>
            <CategoryTurnoverChart
              data={stats.categoryTurnover}
            />
          </div>
           <div className="bg-card border border-border rounded-sm shadow-none p-4">
             <div className="mb-2 flex items-center justify-between">
               <div>
                 <h3 className="text-sm font-medium text-foreground">
                   库存健康预警
                 </h3>
                 <p className="text-xs text-muted-foreground mt-0.5">
                   基于健康评分引擎
                 </p>
               </div>
               <div className="flex items-center gap-2">
                 {warningItems.length > 0 && (
                   <div className="flex items-center gap-1.5">
                     {(() => {
                       const unhealthy = warningItems.filter((w: WarningItem) => w.level === '不健康').length;
                       const warning = warningItems.filter((w: WarningItem) => w.level === '预警').length;
                       const attention = warningItems.filter((w: WarningItem) => w.level === '需关注').length;
                       return (
                         <>
                            {unhealthy > 0 && (
                               <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded-sm bg-destructive/10 text-destructive">
                                 不健康 {unhealthy}
                               </span>
                            )}
                            {warning > 0 && (
                               <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded-sm bg-warning/10 text-warning">
                                 预警 {warning}
                               </span>
                            )}
                            {attention > 0 && (
                               <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded-sm bg-primary/10 text-primary">
                                 关注 {attention}
                               </span>
                            )}
                         </>
                       );
                     })()}
                   </div>
                 )}
                 <Button
                   variant="ghost"
                   size="sm"
                   className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                   onClick={handleRefreshWarnings}
                   disabled={statsRefreshing}
                   aria-label="刷新预警数据"
                 >
                   <RefreshCw className={`size-3.5 ${statsRefreshing ? 'animate-spin' : ''}`} />
                 </Button>
               </div>
            </div>
            <WarningTable data={warningItems} />
          </div>
           <div className="bg-card border border-border rounded-sm shadow-none p-4">
             <h3 className="text-sm font-medium text-foreground mb-2">
               近7天出入库趋势
             </h3>
            <DailyTrendChart data={stats.dailyTrend} />
          </div>
           <div className="bg-card border border-border rounded-sm shadow-none p-4">
             <h3 className="text-sm font-medium text-foreground mb-2">
               库存金额分布
             </h3>
            <CategoryValueChart
              data={stats.categoryValue}
            />
          </div>
           <div className="bg-card border border-border rounded-sm shadow-none p-4">
             <h3 className="text-sm font-medium text-foreground mb-2">
               库存金额TOP10
             </h3>
            <TopValueTable data={topValueItems} />
          </div>
        </div>
      )}

      {/* Product Table */}
      <div className="bg-card border border-border rounded-sm shadow-none p-4">
        <h3 className="text-sm font-medium text-foreground mb-3">
          商品库存数据
        </h3>
        <ProductTable
          items={productData?.items ?? []}
          page={page}
          totalPages={totalPages}
          total={productData?.total ?? 0}
          onPageChange={setPage}
          healthScoreMap={healthScoreMap}
          onViewDetail={(id: string) => {
            setSelectedProductId(id);
            setDetailOpen(true);
          }}
        />
      </div>
      <ProductDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        productId={selectedProductId}
      />
    </div>
  );
};

export default DashboardPage;
