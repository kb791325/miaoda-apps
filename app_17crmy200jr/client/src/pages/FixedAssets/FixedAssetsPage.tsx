import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { usePagination } from '@client/src/hooks/usePagination';
import { Plus, Search, Package, DollarSign, Warehouse, Briefcase, Scan } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';

import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@client/src/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@client/src/components/ui/dialog';
import { Card, CardContent } from '@client/src/components/ui/card';
import { Label } from '@client/src/components/ui/label';

import { getAssets, getAssetsSummary, getAsset, deleteAsset } from '@client/src/api/fixed-assets';
import { getAssetQRCode, type AssetQRCodeResponse } from '@client/src/api/fixed-assets-qrcode';
import * as categoriesApi from '@client/src/api/categories';
import type {
   FixedAssetItem,
   FixedAssetDetail,
   AssetSummary,
   AssetStatus,
   CategoryItem,
 } from '@shared/api.interface';

import AssetFormDialog from './AssetFormDialog';
import AssetDetailPanel from './AssetDetailPanel';
import AssetTable from './AssetTable';
import AssetBatchToolbar from './AssetBatchToolbar';
import AssetQRCode from '@client/src/components/AssetQRCode';
import { formatAmount, formatNumber } from '@client/src/utils/format';
import {
   ASSET_STATUS_OPTIONS,
 } from '@client/src/utils/constants';

// 本页面专用楼层选项（与表单配置中的楼层命名体系不同）
const FLOOR_OPTIONS = ['全部楼层', '1F', '2F', '3F', '4F', '5F'];

interface SummaryCardProps {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  iconBg: string;
}

const SummaryCard = ({ label, value, icon: Icon, iconColor, iconBg }: SummaryCardProps) => (
  <Card className="rounded-lg shadow-sm border-border bg-card">
    <CardContent className="p-5">
      <div className="flex items-center gap-4">
        <div className={`size-11 rounded-full flex items-center justify-center ${iconBg}`}>
          <Icon className={`size-5 ${iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-muted-foreground mb-0.5">{label}</p>
          <p className="font-mono text-2xl font-semibold text-foreground tabular-nums truncate">
            {value}
          </p>
        </div>
      </div>
    </CardContent>
  </Card>
);

const FixedAssetsPage = () => {
  const [keyword, setKeyword] = useState('');
  const [assetType, setAssetType] = useState<string>('all');
  const [floor, setFloor] = useState<string>('全部楼层');
  const [assetStatus, setAssetStatus] = useState<string>('all');
  const [filterVersion, setFilterVersion] = useState(0);
  const [categoryL2Options, setCategoryL2Options] = useState<CategoryItem[]>([]);
   const pagination = usePagination({ initialPage: 1, initialPageSize: 10 });
  const { page, pageSize, totalPages, resetPage } = pagination;

  const [items, setItems] = useState<FixedAssetItem[]>([]);
  const [summary, setSummary] = useState<AssetSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const refreshTimerRef = useRef<number | null>(null);
  const fetchDataRef = useRef<(() => Promise<void>)>(() => Promise.resolve());
  const abortControllerRef = useRef<AbortController | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<FixedAssetDetail | null>(null);

  const [detailOpen, setDetailOpen] = useState(false);
    const [detailAssetId, setDetailAssetId] = useState<string | null>(null);

  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<AssetQRCodeResponse | null>(null);
  const [qrAssetName, setQrAssetName] = useState('');
  const [qrAssetId, setQrAssetId] = useState('');
  const [qrLoading, setQrLoading] = useState(false);

  const navigate = useNavigate();
  const { id: routeAssetId } = useParams<{ id: string }>();

   useEffect(() => {
     categoriesApi.getCategoriesL2({ categoryL1: '固定资产', pageSize: 200 })
        .then((res) => setCategoryL2Options(res.items))
       .catch((err: unknown) => {
         logger.error('加载类目选项失败', err);
         toast.error('加载类目选项失败');
       });
   }, []);

   useEffect(() => {
     if (routeAssetId) {
       setDetailAssetId(routeAssetId);
       setDetailOpen(true);
     }
   }, [routeAssetId]);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const debounceTimerRef = useRef<number | undefined>(undefined);

  const buildParams = () => ({
    keyword: keyword || undefined,
    assetType: assetType === 'all' ? undefined : assetType,
    floor: floor === '全部楼层' ? undefined : floor,
    assetStatus: assetStatus === 'all' ? undefined : assetStatus,
  });

  const { setTotal } = pagination;

  const fetchData = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setLoading(true);
    try {
      const filterParams = buildParams();
       const [listData, summaryData] = await Promise.all([
         getAssets({ ...filterParams, page, pageSize }, controller.signal),
         getAssetsSummary(filterParams, controller.signal),
       ]);
       setItems(listData.items);
       setTotal(listData.total);
       setSummary(summaryData);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      logger.error('加载资产列表失败', err);
      toast.error('加载失败，请重试');
    } finally {
      setLoading(false);
    }
   }, [page, pageSize, keyword, assetType, floor, assetStatus, setTotal]);

  // 保持 ref 为最新的 fetchData，避免 setInterval 依赖闭包导致定时被重置
  fetchDataRef.current = fetchData;

  useEffect(() => {
     if (debounceTimerRef.current) {
       clearTimeout(debounceTimerRef.current);
     }
     debounceTimerRef.current = window.setTimeout(() => {
       resetPage();
       setFilterVersion((v) => v + 1);
     }, 300);
     return () => {
       if (debounceTimerRef.current) {
         clearTimeout(debounceTimerRef.current);
       }
     };
     // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [keyword, assetType, floor, assetStatus]);

  useEffect(() => {
    fetchData();
  }, [page, pageSize, filterVersion]);

  useEffect(() => {
     const handleVisible = () => {
       if (document.visibilityState === 'visible') {
         fetchData();
       }
     };
     document.addEventListener('visibilitychange', handleVisible);
     return () => {
       document.removeEventListener('visibilitychange', handleVisible);
     };
   }, [fetchData]);

   useEffect(() => {
     refreshTimerRef.current = window.setInterval(() => {
       fetchDataRef.current();
     }, 60000);
     return () => {
       if (refreshTimerRef.current) {
         clearInterval(refreshTimerRef.current);
         refreshTimerRef.current = null;
       }
     };
   }, []);

   useEffect(() => {
     return () => {
       if (abortControllerRef.current) {
         abortControllerRef.current.abort();
       }
     };
   }, []);

   const handleSearch = () => {
     if (debounceTimerRef.current) {
       clearTimeout(debounceTimerRef.current);
     }
     resetPage();
     fetchData();
   };

   const handleReset = () => {
     setKeyword('');
     setAssetType('all');
     setFloor('全部楼层');
     setAssetStatus('all');
     resetPage();
     fetchData();
   };

  const handleCreate = () => {
    setEditingAsset(null);
    setFormOpen(true);
  };

  const handleEdit = async (asset: FixedAssetItem) => {
    try {
      const detail = await getAsset(asset.id);
      setEditingAsset(detail);
      setFormOpen(true);
    } catch {
      toast.error('加载资产详情失败');
    }
  };

  const handleFormSuccess = () => {
    setFormOpen(false);
    setEditingAsset(null);
    toast.success(editingAsset ? '资产已更新' : '资产已新增');
    fetchData();
  };

  const handleView = (id: string) => {
    setDetailAssetId(id);
    setDetailOpen(true);
  };

  const handleQRCode = async (id: string) => {
    const asset: FixedAssetItem | undefined = items.find(
      (it: FixedAssetItem) => it.id === id,
    );
    setQrAssetId(id);
    setQrAssetName(asset?.assetName ?? '');
    setQrLoading(true);
    setQrDialogOpen(true);
    try {
      const data: AssetQRCodeResponse = await getAssetQRCode(id);
      setQrCodeData(data);
    } catch (err: unknown) {
      logger.error('获取QR码失败', err);
      toast.error('获取QR码失败，请重试');
      setQrDialogOpen(false);
    } finally {
      setQrLoading(false);
    }
  };

  const handleDeleteClick = (id: string) => {
    setDeletingId(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingId) return;
    try {
      await deleteAsset(deletingId);
      toast.success('资产已删除');
      setDeleteDialogOpen(false);
      setDeletingId(null);
      fetchData();
    } catch (err) {
      logger.error('删除资产失败', err);
      toast.error('删除失败，请重试');
    }
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
  };

  const floorList = FLOOR_OPTIONS.filter((f) => f !== '全部楼层');

  return (
    <div className="space-y-4">
      {/* 顶部标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground mb-6">固定资产管理</h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            资产台账全生命周期管理
          </p>
        </div>
      </div>

      {/* 筛选栏 */}
      <Card className="rounded-lg shadow-sm border-border bg-card">
        <CardContent className="p-5">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground whitespace-nowrap">
                关键词
              </Label>
              <Input
                placeholder="资产名称 / 类目"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="w-48"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground whitespace-nowrap">
                资产类型
              </Label>
              <Select value={assetType} onValueChange={setAssetType}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="all">全部类型</SelectItem>
                   {categoryL2Options.map((opt) => (
                     <SelectItem key={opt.id} value={opt.categoryL2}>
                       {opt.categoryL2}
                     </SelectItem>
                   ))}
                 </SelectContent>
              </Select>
            </div>
             <div className="flex items-center gap-2">
               <Label className="text-xs text-muted-foreground whitespace-nowrap">
                 使用楼层
               </Label>
               <Select value={floor} onValueChange={setFloor}>
                 <SelectTrigger className="w-32">
                   <SelectValue />
                 </SelectTrigger>
                 <SelectContent>
                   {FLOOR_OPTIONS.map((f) => (
                     <SelectItem key={f} value={f}>
                       {f}
                     </SelectItem>
                   ))}
                 </SelectContent>
               </Select>
             </div>
             <div className="flex items-center gap-2">
               <Label className="text-xs text-muted-foreground whitespace-nowrap">
                 资产状态
               </Label>
               <Select value={assetStatus} onValueChange={setAssetStatus}>
                 <SelectTrigger className="w-28">
                   <SelectValue />
                 </SelectTrigger>
                 <SelectContent>
                    {ASSET_STATUS_OPTIONS.map((opt) => (
                     <SelectItem key={opt.value} value={opt.value}>
                       {opt.label}
                     </SelectItem>
                   ))}
                 </SelectContent>
               </Select>
             </div>
            <div className="flex items-center gap-2 ml-auto">
              <Button
                variant="outline"
                size="sm"
                 onClick={handleReset}
                 className="rounded-md border-border text-foreground hover:bg-accent/50 hover:text-foreground"
              >
                重置
              </Button>
               <Button size="sm" onClick={handleSearch} className="rounded-md bg-primary hover:bg-primary/90 text-primary-foreground">
                <Search className="size-4 mr-1" />
                搜索
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 汇总统计条 */}
      <div
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
        data-ai-section-type="card-stat"
      >
        <SummaryCard
          label="资产总数"
          value={summary ? formatNumber(summary.totalCount) : '-'}
          icon={Package}
           iconColor="text-primary"
           iconBg="bg-primary/10"
        />
        <SummaryCard
          label="资产总价值"
          value={summary ? `¥${formatAmount(summary.totalValue)}` : '-'}
          icon={DollarSign}
           iconColor="text-warning"
           iconBg="bg-warning/10"
        />
        <SummaryCard
          label="在库数量"
          value={summary ? formatNumber(summary.inStockCount) : '-'}
          icon={Warehouse}
           iconColor="text-success"
           iconBg="bg-success/10"
        />
        <SummaryCard
          label="在用数量"
          value={summary ? formatNumber(summary.inUseCount) : '-'}
          icon={Briefcase}
           iconColor="text-primary"
           iconBg="bg-primary/10"
        />
      </div>

      {/* 表格区 */}
       <Card className="rounded-lg shadow-sm border-border bg-card">
         <div className="flex items-center justify-between px-5 py-4 border-b border-border">
           <h2 className="text-base font-semibold text-foreground">资产列表</h2>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/asset-scan')}
              className="rounded-md border-border text-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/30"
              data-ai-section-type="button"
            >
              <Scan className="size-4 mr-1" />
              扫码
            </Button>
            <Button
              size="sm"
              onClick={handleCreate}
              className="rounded-md bg-primary hover:bg-primary/90 text-primary-foreground"
              data-ai-section-type="button"
            >
              <Plus className="size-4 mr-1" />
              新增资产
            </Button>
          </div>
        </div>
        <div className="p-0">
          <AssetBatchToolbar
            selectedIds={selectedIds}
            floorOptions={floorList}
            onRefresh={fetchData}
            onClearSelection={handleClearSelection}
          />
          <AssetTable
            items={items}
            loading={loading}
            page={page}
             total={pagination.total}
            pageSize={pageSize}
            selectedIds={selectedIds}
            onSelectedChange={setSelectedIds}
            onView={handleView}
            onEdit={handleEdit}
            onDelete={handleDeleteClick}
            onQRCode={handleQRCode}
             onPageChange={pagination.setPage}
          />
        </div>
      </Card>

      {/* 新增/编辑弹窗 */}
      <AssetFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        asset={editingAsset}
        onSuccess={handleFormSuccess}
      />

      {/* 详情侧滑面板 */}
      <AssetDetailPanel
        open={detailOpen}
        onOpenChange={setDetailOpen}
        assetId={detailAssetId}
        onRefresh={fetchData}
      />

      {/* QR码弹窗 */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="max-w-sm rounded-lg">
          <DialogHeader>
            <DialogTitle>资产 QR 码</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center py-4">
            {qrLoading ? (
              <p className="text-sm text-muted-foreground">加载中...</p>
            ) : qrCodeData ? (
              <AssetQRCode
                qrDataURL={qrCodeData.qrDataURL}
                assetName={qrAssetName}
                assetCode={qrAssetId}
                assetId={qrAssetId}
              />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      {/* 删除确认 */}
      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
      >
        <AlertDialogContent className="max-w-md rounded-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              删除后数据无法恢复，确定要删除该资产吗？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-md">取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
               className="bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-md"
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default FixedAssetsPage;
