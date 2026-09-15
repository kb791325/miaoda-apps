import { useState, useEffect, useCallback } from 'react';
import { formatBeijingTime } from '@client/src/utils/date';
import { records, sync as syncApi } from '@client/src/api';
import { Button } from '@client/src/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@client/src/components/ui/card';
import { ChevronLeft, ChevronRight, ArrowLeftRight, RefreshCw, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type { Transfer } from '@shared/api.interface';
import { DocumentPrinter } from '@client/src/components/DocumentPrinter';

const PAGE_SIZE = 10;

export function RecordsTransfers() {
  const [items, setItems] = useState<Transfer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [printItem, setPrintItem] = useState<Transfer | null>(null);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await syncApi.pushSync('transfers');
      toast.success('调拨数据已同步到飞书');
    } catch (err: unknown) {
      logger.error('同步到飞书失败:', String(err));
      toast.error('同步到飞书失败');
    } finally {
      setSyncing(false);
    }
  };

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await records.getTransfers({ page, pageSize: PAGE_SIZE });
      setItems(res.items);
      setTotal(res.total);
    } catch (err: unknown) {
      logger.error('Failed to fetch transfers:', String(err));
      toast.error('获取调拨记录失败');
    } finally {
      setIsLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handlePrint = (item: Transfer) => {
    setPrintItem(item);
    setPrintOpen(true);
  };

  return (
    <>
    <Card className="rounded-sm shadow-none border border-border">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <ArrowLeftRight className="size-4 text-primary" />
            调拨记录
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSync}
            disabled={syncing}
          >
            <RefreshCw className={`size-4 ${syncing ? 'animate-spin' : ''}`} />
            同步到飞书
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
            加载中...
          </div>
        ) : items.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
            暂无调拨记录
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">调拨单号</th>
                    <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">商品名</th>
                    <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">源仓库</th>
                    <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">目标仓库</th>
                    <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">数量</th>
                    <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">调拨时间</th>
                    <th className="px-3 py-2.5 text-center font-medium text-muted-foreground w-[80px]">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item: Transfer, index: number) => (
                    <tr key={item.id} className="border-b border-border/50 hover:bg-accent/50">
                      <td className="px-3 py-2.5 font-mono text-xs">{item.transferNo}</td>
                      <td className="px-3 py-2.5">{item.productName}</td>
                      <td className="px-3 py-2.5">{item.sourceWarehouse}</td>
                      <td className="px-3 py-2.5">{item.targetWarehouse}</td>
                      <td className="px-3 py-2.5 text-right font-mono">{item.quantity}</td>
                      <td className="px-3 py-2.5 text-muted-foreground font-mono text-xs">{formatBeijingTime(item.transferDate)}</td>
                      <td className="px-3 py-2.5 text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handlePrint(item)}
                          title="打印"
                        >
                          <Printer className="size-4" />
                        </Button>
                      </td>
                    </tr>
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
                  <ChevronLeft className="size-4" />
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
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>

    <DocumentPrinter
      type="transfer"
      data={printItem}
      open={printOpen}
      onOpenChange={setPrintOpen}
    />
    </>
  );
}
