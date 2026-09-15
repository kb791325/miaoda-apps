import { useState, useEffect, useCallback, useRef } from 'react';
import { formatBeijingTime } from '@client/src/utils/date';
import { products as productsApi } from '@client/src/api';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import { Badge } from '@client/src/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@client/src/components/ui/card';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@client/src/components/ui/alert-dialog';
import { Loader2, ChevronDown, ChevronRight, Archive } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type { ArchivedProduct, ArchivedProductDetail } from '@shared/api.interface';
import { RecordsArchivedDetail } from './RecordsArchivedDetail';

const PAGE_SIZE = 10;

export function RecordsArchivedProducts() {
  const [items, setItems] = useState<ArchivedProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [purgeTarget, setPurgeTarget] = useState<ArchivedProduct | null>(null);

  const handleSearchChange = (val: string) => {
    setSearchInput(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setKeyword(val);
      setPage(1);
    }, 300);
  };

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await productsApi.getArchivedProducts({
        page,
        pageSize: PAGE_SIZE,
        keyword: keyword || undefined,
      });
      setItems(res.items);
      setTotal(res.total);
    } catch (err: unknown) {
      logger.error('Failed to fetch archived products:', String(err));
      toast.error('获取已删除商品失败');
    } finally {
      setIsLoading(false);
    }
  }, [page, keyword]);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshKey]);

  const handleExpand = (id: string) => {
    setExpandedId((prev: string | null) => (prev === id ? null : id));
  };

  const handleRestore = async (id: string) => {
    try {
      await productsApi.restoreArchivedProduct(id);
      toast.success('商品已恢复');
      if (expandedId === id) setExpandedId(null);
      setRefreshKey((k: number) => k + 1);
    } catch (err: unknown) {
      logger.error('Restore failed:', String(err));
      toast.error('恢复商品失败');
    }
  };

  const handlePurge = async () => {
    if (!purgeTarget) return;
    try {
      await productsApi.purgeArchivedProduct(purgeTarget.id);
      toast.success('商品已永久删除');
      setPurgeTarget(null);
      if (expandedId === purgeTarget.id) setExpandedId(null);
      setRefreshKey((k: number) => k + 1);
    } catch (err: unknown) {
      logger.error('Purge failed:', String(err));
      toast.error('永久删除失败');
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <Card className="rounded-sm shadow-none border border-border">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Archive className="size-4 text-primary" />
              已删除商品
            </CardTitle>
            <Input
              placeholder="搜索名称/编码..."
              value={searchInput}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleSearchChange(e.target.value)}
              className="w-[200px]"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
              加载中...
            </div>
          ) : items.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
              暂无已删除商品
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="px-2 py-2.5 w-8" />
                      <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">商品编码</th>
                      <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">商品名称</th>
                      <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">品类</th>
                      <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">单位</th>
                      <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">单价</th>
                      <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">总库存</th>
                      <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">总价值</th>
                      <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">删除时间</th>
                      <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">操作人</th>
                      <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">删除前记录数</th>
                      <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item: ArchivedProduct) => (
                      <TableRow
                        key={item.id}
                        item={item}
                        isExpanded={expandedId === item.id}
                        onExpand={handleExpand}
                        onRestore={handleRestore}
                        onPurgeClick={setPurgeTarget}
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between pt-4 mt-2 border-t border-border">
                <span className="text-sm text-muted-foreground">
                  共 {total} 条记录
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p: number) => Math.max(1, p - 1))}
                  >
                    上一页
                  </Button>
                  <span className="text-sm font-mono px-2">
                    {page} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p: number) => Math.min(totalPages, p + 1))}
                  >
                    下一页
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!purgeTarget} onOpenChange={(open: boolean) => { if (!open) setPurgeTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认永久删除</AlertDialogTitle>
            <AlertDialogDescription>
              即将永久删除商品「{purgeTarget?.name}」（{purgeTarget?.code}），此操作不可撤销，所有关联数据也将被清除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handlePurge}
            >
              永久删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

interface TableRowProps {
  item: ArchivedProduct;
  isExpanded: boolean;
  onExpand: (id: string) => void;
  onRestore: (id: string) => void;
  onPurgeClick: (item: ArchivedProduct) => void;
}

function TableRow({ item, isExpanded, onExpand, onRestore, onPurgeClick }: TableRowProps) {
  const [detailData, setDetailData] = useState<ArchivedProductDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const prevExpandedRef = useRef(false);

  useEffect(() => {
    if (isExpanded && !prevExpandedRef.current) {
      setDetailLoading(true);
      setDetailData(null);
      productsApi.getArchivedProduct(item.id).then((d: ArchivedProductDetail) => {
        setDetailData(d);
      }).catch((err: unknown) => {
        logger.error('Failed to fetch archived product detail:', String(err));
        toast.error('获取商品详情失败');
      }).finally(() => {
        setDetailLoading(false);
      });
    }
    if (!isExpanded) {
      setDetailData(null);
    }
    prevExpandedRef.current = isExpanded;
  }, [isExpanded, item.id]);

  return (
    <>
      <tr className="border-b border-border/50 hover:bg-accent/50">
        <td className="px-2 py-2.5">
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => onExpand(item.id)}
          >
            {isExpanded
              ? <ChevronDown className="size-4" />
              : <ChevronRight className="size-4" />}
          </button>
        </td>
        <td className="px-3 py-2.5 font-mono text-xs">{item.code}</td>
        <td className="px-3 py-2.5">{item.name}</td>
        <td className="px-3 py-2.5 text-muted-foreground">{item.category || '-'}</td>
        <td className="px-3 py-2.5">{item.unit}</td>
        <td className="px-3 py-2.5 text-right font-mono">¥{item.unitPrice.toFixed(2)}</td>
        <td className="px-3 py-2.5 text-right font-mono">{item.totalQuantity}</td>
        <td className="px-3 py-2.5 text-right font-mono">¥{item.totalValue.toFixed(2)}</td>
        <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">
          {formatBeijingTime(item.deletedAt)}
        </td>
        <td className="px-3 py-2.5">{item.deletedBy}</td>
        <td className="px-3 py-2.5">
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className="rounded-sm text-xs px-1.5 py-0">
              出入库 {item.transactionCount}
            </Badge>
            <Badge variant="outline" className="rounded-sm text-xs px-1.5 py-0">
              调拨 {item.transferCount}
            </Badge>
            <Badge variant="outline" className="rounded-sm text-xs px-1.5 py-0">
              盘点 {item.inventoryCheckCount}
            </Badge>
          </div>
        </td>
        <td className="px-3 py-2.5">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-7"
              onClick={() => onRestore(item.id)}
            >
              恢复
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="text-xs h-7"
              onClick={() => onPurgeClick(item)}
            >
              永久删除
            </Button>
          </div>
        </td>
      </tr>
      {isExpanded && (
        <tr>
          <td colSpan={12} className="px-4 py-4 bg-muted/20 border-b border-border">
            {detailLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="size-5 animate-spin text-primary" />
                <span className="ml-2 text-sm text-muted-foreground">加载中...</span>
              </div>
            ) : detailData ? (
              <RecordsArchivedDetail detail={detailData} />
            ) : null}
          </td>
        </tr>
      )}
    </>
  );
}
