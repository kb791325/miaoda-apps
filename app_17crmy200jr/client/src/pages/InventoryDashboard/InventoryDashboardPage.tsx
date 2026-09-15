import { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle,
  FileDown,
  PlayCircle,
  LayoutGrid,
  Users,
  TrendingUp,
  Building2,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@client/src/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@client/src/components/ui/table';
import PaginationFooter from '@client/src/components/ui/pagination-footer';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { OverviewCards } from './OverviewCards';
import { CompletionRateTrendChart } from './CompletionTrendChart';
import { DeptCompletionRanking } from './DeptCompletionRanking';
import { InventoryMatrix } from './InventoryMatrix';
import { InventoryTimeline } from './InventoryTimeline';
import { StockPanel } from './StockPanel';
import {
  getOverview,
  getOwnerMatrix,
  getTimeline,
  getStock,
  getStockTrend,
  getAbnormalList,
  resolveAbnormal,
  getCompletionRateTrend,
  getDepartmentCompletionRanking,
  batchCleanAbnormal,
} from '@client/src/api/inventory-dashboard';
import type {
  InventoryOverview,
  OwnerMatrixRow,
  TimelineOwner,
  StockOverview,
  StockTrendItem,
  AbnormalCheckItem,
  PagedResponse,
  InventoryCompletionRateTrendItem,
  InventoryDeptCompletionItem,
} from '@shared/api.interface';
import { showConfirm } from '@lark-apaas/client-toolkit';

function fmt(n: number): string {
  return n.toLocaleString('zh-CN');
}

function fmtDate(d: string): string {
  return d ? d.split('T')[0] : '-';
}

const InventoryDashboardPage = () => {
  const [overview, setOverview] = useState<InventoryOverview | null>(null);
  const [matrix, setMatrix] = useState<OwnerMatrixRow[]>([]);
  const [timeline, setTimeline] = useState<TimelineOwner[]>([]);
  const [stock, setStock] = useState<StockOverview | null>(null);
  const [stockTrend, setStockTrend] = useState<StockTrendItem[]>([]);
  const [abnormal, setAbnormal] =
    useState<PagedResponse<AbnormalCheckItem> | null>(null);
  const [abnormalPage, setAbnormalPage] = useState(1);
  const [completionTrend, setCompletionTrend] = useState<InventoryCompletionRateTrendItem[]>([]);
  const [deptRanking, setDeptRanking] = useState<InventoryDeptCompletionItem[]>([]);

  const [loading, setLoading] = useState({
    overview: true,
    matrix: true,
    timeline: true,
    stock: true,
    stockTrend: true,
    abnormal: true,
    completionTrend: true,
    deptRanking: true,
  });

  const [matrixParams, setMatrixParams] = useState<{
    department?: string;
    search?: string;
  }>({});
  const [refreshKey, setRefreshKey] = useState(0);

  const loadMainData = useCallback(() => {
    setLoading((p) => ({
      ...p,
      overview: true,
      timeline: true,
      stock: true,
      stockTrend: true,
      completionTrend: true,
      deptRanking: true,
    }));
    Promise.allSettled([
      getOverview(),
      getTimeline('days_desc'),
      getStock(),
      getStockTrend(6),
      getCompletionRateTrend(6),
      getDepartmentCompletionRanking(),
    ]).then((results) => {
      const [overviewRes, timelineRes, stockRes, stockTrendRes, completionRes, deptRes] = results;

      if (overviewRes.status === 'fulfilled') setOverview(overviewRes.value);
      else logger.error('load overview fail', overviewRes.reason);

      if (timelineRes.status === 'fulfilled') setTimeline(timelineRes.value);
      else logger.error('load timeline fail', timelineRes.reason);

      if (stockRes.status === 'fulfilled') setStock(stockRes.value);
      else logger.error('load stock fail', stockRes.reason);

      if (stockTrendRes.status === 'fulfilled') setStockTrend(stockTrendRes.value);
      else logger.error('load stockTrend fail', stockTrendRes.reason);

      if (completionRes.status === 'fulfilled') setCompletionTrend(completionRes.value);
      else logger.error('load completionTrend fail', completionRes.reason);

      if (deptRes.status === 'fulfilled') setDeptRanking(deptRes.value);
      else logger.error('load deptRanking fail', deptRes.reason);

      setLoading((p) => ({
        ...p,
        overview: false,
        timeline: false,
        stock: false,
        stockTrend: false,
        completionTrend: false,
        deptRanking: false,
      }));
    });
  }, []);

  const handleRefresh = useCallback(() => {
    loadMainData();
    setRefreshKey((k) => k + 1);
    setAbnormalPage((p) => (p > 0 ? p : 1));
  }, [loadMainData]);

  useEffect(() => {
    loadMainData();
  }, [loadMainData]);

  useEffect(() => {
    const timer = setInterval(() => {
      loadMainData();
    }, 30000);
    return () => clearInterval(timer);
  }, [loadMainData]);

  // 负责人矩阵（依赖筛选参数，独立加载）
  useEffect(() => {
    setLoading((p) => ({ ...p, matrix: true }));
    getOwnerMatrix(matrixParams)
      .then(setMatrix)
      .catch((e) => logger.error('load matrix fail', e))
      .finally(() => setLoading((p) => ({ ...p, matrix: false })));
  }, [matrixParams, refreshKey]);

  // 异常列表（依赖分页，独立加载）
  useEffect(() => {
    setLoading((p) => ({ ...p, abnormal: true }));
    getAbnormalList({ page: abnormalPage, pageSize: 10 })
      .then(setAbnormal)
      .catch((e) => logger.error('load abnormal fail', e))
      .finally(() => setLoading((p) => ({ ...p, abnormal: false })));
  }, [abnormalPage]);

  const handleResolve = async (item: AbnormalCheckItem) => {
    try {
      await resolveAbnormal(item.id, '已处理');
      toast.success(`已标记 ${item.assetName} 为已处理`);
      const data = await getAbnormalList({ page: abnormalPage, pageSize: 10 });
      setAbnormal(data);
    } catch (e) {
      logger.error('resolve abnormal fail', e);
      toast.error('操作失败，请重试');
    }
  };

  const handleBatchClean = async () => {
    if (!await showConfirm('确定要清理所有实盘数量为0的异常盘点记录吗？此操作不可撤销。')) return;
    try {
      const res = await batchCleanAbnormal();
      toast.success(`已清理 ${res.deletedCount} 条异常记录`);
      setAbnormalPage(1);
      const data = await getAbnormalList({ page: 1, pageSize: 10 });
      setAbnormal(data);
      const [overviewData, trendData] = await Promise.all([
        getOverview(),
        getCompletionRateTrend(6),
      ]);
      setOverview(overviewData);
      setCompletionTrend(trendData);
    } catch (e) {
      logger.error('batch clean abnormal fail', e);
      toast.error('清理失败，请重试');
    }
  };

  const totalAbnormalPages = abnormal ? Math.ceil(abnormal.total / 10) : 0;

  return (
    <div className="space-y-4 p-6 bg-background min-h-screen">
       {/* Header */}
       <div className="flex items-center gap-3 mb-6">
         <LayoutGrid className="size-5 text-primary" />
         <h1 className="text-xl font-semibold text-foreground">资产盘点看板</h1>
         <span className="text-xs text-muted-foreground ml-2">
           Inventory Dashboard
         </span>
         <div className="ml-auto flex items-center gap-2">
           <Button
             size="sm"
             variant="outline"
             className="h-8 px-3 text-xs gap-1"
             onClick={handleRefresh}
             disabled={loading.overview}
           >
             <RefreshCw className={`size-3.5 ${loading.overview ? 'animate-spin' : ''}`} />
             刷新数据
           </Button>
         </div>
       </div>

      {/* 1. Overview Cards */}
      <OverviewCards overview={overview} loading={loading.overview} />

      {/* 2. 盘点数量趋势 + 部门排行 */}
      <div className="grid grid-cols-5 gap-4">
         <div className="col-span-3 bg-card border border-border rounded-sm p-4">
           <div className="flex items-center gap-2 mb-3">
             <TrendingUp className="size-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">盘点数量趋势</h3>
             <span className="text-xs text-muted-foreground">近6个月</span>
           </div>
          {loading.completionTrend ? (
            <div className="text-xs py-16 text-center text-muted-foreground">
              加载中...
            </div>
          ) : (
            <CompletionRateTrendChart data={completionTrend} />
          )}
        </div>
         <div className="col-span-2 bg-card border border-border rounded-sm p-4">
           <div className="flex items-center gap-2 mb-3">
             <Building2 className="size-4 text-primary" />
             <h3 className="text-sm font-semibold text-foreground">部门完成率排行</h3>
           </div>
          {loading.deptRanking ? (
            <div className="text-xs py-16 text-center text-muted-foreground">
              加载中...
            </div>
          ) : (
            <DeptCompletionRanking data={deptRanking} />
          )}
        </div>
      </div>

      {/* 3. Owner Matrix */}
      <InventoryMatrix
        data={matrix}
        loading={loading.matrix}
        onSearch={setMatrixParams}
        searchParams={matrixParams}
      />

      {/* 4. Timeline + Stock */}
      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-3">
          <InventoryTimeline data={timeline} loading={loading.timeline} />
        </div>
        <div className="col-span-2">
          <StockPanel
            stock={stock}
            stockTrend={stockTrend}
            loadingStock={loading.stock}
            loadingTrend={loading.stockTrend}
          />
        </div>
      </div>

      {/* 5. Abnormal List */}
      <div className="bg-card border border-border rounded-sm">
         <div className="flex items-center gap-2 p-4 border-b border-border mb-0">
           <AlertTriangle className="size-4 text-destructive" />
           <h3 className="text-sm font-semibold text-foreground">盘点异常</h3>
          {abnormal && (
            <span className="text-xs text-muted-foreground">
              共 {abnormal.total} 条
            </span>
          )}
          <div className="ml-auto">
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs text-destructive hover:text-destructive"
              onClick={handleBatchClean}
            >
              清理测试数据
            </Button>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>归属人</TableHead>
              <TableHead>资产名称</TableHead>
              <TableHead>资产类型</TableHead>
              <TableHead className="text-right font-mono">账面数量</TableHead>
              <TableHead className="text-right font-mono">实盘数量</TableHead>
              <TableHead className="text-right font-mono">差异</TableHead>
              <TableHead>盘点日期</TableHead>
              <TableHead>状态</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading.abnormal && (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="text-center py-6 text-muted-foreground"
                >
                  加载中...
                </TableCell>
              </TableRow>
            )}
            {!loading.abnormal && abnormal?.items.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="text-center py-6 text-muted-foreground"
                >
                  暂无异常数据
                </TableCell>
              </TableRow>
            )}
            {!loading.abnormal &&
              abnormal?.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.ownerName}</TableCell>
                  <TableCell className="font-medium">{item.assetName}</TableCell>
                  <TableCell>{item.assetType}</TableCell>
                  <TableCell className="text-right font-mono">
                    {fmt(item.bookQuantity)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {fmt(item.actualQuantity)}
                  </TableCell>
                  <TableCell
                    className={`text-right font-mono font-semibold ${
                      item.difference > 0
                        ? 'text-success'
                        : item.difference < 0
                        ? 'text-destructive'
                        : 'text-foreground'
                    }`}
                  >
                    {item.difference > 0 ? '+' : ''}
                    {fmt(item.difference)}
                  </TableCell>
                  <TableCell className="font-mono">
                    {fmtDate(item.checkDate)}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-1.5 py-0.5 rounded-sm text-xs font-medium border ${
                        item.status === 'abnormal'
                          ? 'bg-destructive/10 text-destructive border-destructive/30'
                          : item.status === 'resolved'
                          ? 'bg-success/10 text-success border-success/30'
                          : 'bg-muted text-muted-foreground border-border'
                      }`}
                    >
                      {item.status === 'abnormal'
                        ? '异常'
                        : item.status === 'resolved'
                        ? '已处理'
                        : item.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-xs"
                        onClick={() => toast.info('功能开发中')}
                      >
                        查看详情
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-xs"
                        onClick={() => toast.info('功能开发中')}
                      >
                        发起补盘
                      </Button>
                      <Button
                        size="sm"
                        variant="default"
                        className="h-7 px-2 text-xs"
                        onClick={() => handleResolve(item)}
                      >
                        标记已处理
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>

        {abnormal && abnormal.total > 10 && (
          <PaginationFooter
            total={abnormal.total}
            page={abnormalPage}
            totalPages={totalAbnormalPages}
            onPageChange={setAbnormalPage}
          />
        )}
      </div>

      {/* 6. Floating Action Buttons */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-40">
        <Button
          size="icon"
          variant="default"
          className="w-12 h-12 rounded-full shadow-md"
          title="发起月度盘点"
          onClick={() => {
            logger.info('发起月度盘点');
            toast.info('发起月度盘点功能开发中');
          }}
        >
          <PlayCircle className="size-5" />
        </Button>
        <Button
          size="icon"
          variant="secondary"
          className="w-12 h-12 rounded-full shadow-md border border-border"
          title="批量分配任务"
          onClick={() => {
            logger.info('批量分配任务');
            toast.info('批量分配任务功能开发中');
          }}
        >
          <Users className="size-5" />
        </Button>
        <Button
          size="icon"
          variant="secondary"
          className="w-12 h-12 rounded-full shadow-md border border-border"
          title="导出报告"
          onClick={() => {
            logger.info('导出报告');
            toast.info('导出报告功能开发中');
          }}
        >
          <FileDown className="size-5" />
        </Button>
      </div>
    </div>
  );
};

export default InventoryDashboardPage;
