import { useState, useEffect, useCallback } from 'react';
import { formatBeijingTime } from '@client/src/utils/date';
import { records, sync as syncApi } from '@client/src/api';
import { undoOperation } from '@client/src/api/undo';
import { Button } from '@client/src/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@client/src/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@client/src/components/ui/card';
import { Badge } from '@client/src/components/ui/badge';
import { ChevronLeft, ChevronRight, Download, ClipboardList, RefreshCw, Printer, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type { StockTransaction } from '@shared/api.interface';
import { DocumentPrinter } from '@client/src/components/DocumentPrinter';

const PAGE_SIZE = 10;
const UNDO_WINDOW_MS = 30 * 60 * 1000;

function getUndoErrorMessage(err: unknown): string {
  if (err && typeof err === 'object') {
    const e = err as {
      response?: { data?: { message?: string } };
      message?: string;
    };
    if (e.response?.data?.message) return e.response.data.message;
    if (e.message) return e.message;
  }
  return '撤销失败，请重试';
}

function canUndoOutbound(item: StockTransaction): boolean {
  if (item.type !== 'outbound') return false;
  const at: number = new Date(item.createdAt).getTime();
  return Number.isFinite(at) && Date.now() - at <= UNDO_WINDOW_MS;
}

export function RecordsTransactions() {
  const [items, setItems] = useState<StockTransaction[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [printItem, setPrintItem] = useState<StockTransaction | null>(null);
  const [undoingId, setUndoingId] = useState<string | null>(null);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await syncApi.pushSync('transactions');
      toast.success('出入库数据已同步到飞书');
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
      const params: { page: number; pageSize: number; type?: string } = {
        page,
        pageSize: PAGE_SIZE,
      };
      if (typeFilter && typeFilter !== 'all') {
        params.type = typeFilter;
      }
      const res = await records.getTransactions(params);
      setItems(res.items);
      setTotal(res.total);
    } catch (err: unknown) {
      logger.error('Failed to fetch transactions:', String(err));
      toast.error('获取记录失败');
    } finally {
      setIsLoading(false);
    }
  }, [page, typeFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handlePrint = (item: StockTransaction) => {
    setPrintItem(item);
    setPrintOpen(true);
  };

  const handleUndo = async (item: StockTransaction) => {
    if (undoingId) return;
    setUndoingId(item.id);
    try {
      const res = await undoOperation({ action: 'outbound', targetId: item.id });
      toast.success(res.message);
      await fetchData();
    } catch (err: unknown) {
      logger.error('Undo outbound failed:', String(err));
      toast.error(getUndoErrorMessage(err));
    } finally {
      setUndoingId(null);
    }
  };

  const handleExport = async () => {
    try {
      const params: { type?: string } = {};
      if (typeFilter && typeFilter !== 'all') params.type = typeFilter;
      const data: StockTransaction[] = await records.exportTransactions(params);
      const header = [
        '出入库单号', '类型', '商品名', '仓库', '数量', '金额',
        '类型细分', '操作时间', '操作人',
      ];
      const exportCounters: Record<string, number> = { inbound: 0, outbound: 0 };
      const rows = data.map((item: StockTransaction) => {
        exportCounters[item.type] = (exportCounters[item.type] || 0) + 1;
        return [
        item.orderNo,
        item.type,
        item.productName,
        item.warehouse,
        String(item.quantity),
        item.totalAmount.toFixed(2),
        item.subType,
        item.transactionDate,
        item.operator,
      ];
      });
      const csv = [header, ...rows]
        .map((row: string[]) => row.map((cell: string) => `"${cell}"`).join(','))
        .join('\n');
      const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `出入库记录_${formatBeijingTime(new Date(), 'YYYY-MM-DD')}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('导出成功');
    } catch (err: unknown) {
      logger.error('Export failed:', String(err));
      toast.error('导出失败');
    }
  };

  return (
    <>
    <Card className="rounded-sm shadow-none border border-border">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <ClipboardList className="size-4 text-primary" />
            出入库记录
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={typeFilter} onValueChange={(val: string) => { setTypeFilter(val); setPage(1); }}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="全部类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部类型</SelectItem>
                <SelectItem value="inbound">入库</SelectItem>
                <SelectItem value="outbound">出库</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="size-4" />
              导出
            </Button>
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
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
            加载中...
          </div>
        ) : items.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
            暂无记录
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">出入库单号</th>
                    <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">类型</th>
                    <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">商品名</th>
                    <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">仓库</th>
                    <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">数量</th>
                    <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">金额</th>
                    <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">类型细分</th>
                    <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">操作时间</th>
                     <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">操作人</th>
                     <th className="px-3 py-2.5 text-center font-medium text-muted-foreground w-[80px]">操作</th>
                  </tr>
                </thead>
                <tbody>
                   {(() => {
                     return items.map((item: StockTransaction) => {
                       return (
                      <tr key={item.id} className="border-b border-border/50 hover:bg-accent/50">
                       <td className="px-3 py-2.5 font-mono text-xs">{item.orderNo}</td>
                      <td className="px-3 py-2.5">
                        <Badge
                          variant="secondary"
                          className={
                            item.type === 'inbound'
                              ? 'rounded-full bg-success/10 text-success border-success/20'
                              : 'rounded-full bg-destructive/10 text-destructive border-destructive/20'
                          }
                        >
                          {item.type === 'inbound' ? '入库' : '出库'}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5">{item.productName}</td>
                      <td className="px-3 py-2.5">{item.warehouse}</td>
                      <td className="px-3 py-2.5 text-right font-mono">{item.quantity}</td>
                      <td className="px-3 py-2.5 text-right font-mono">¥{item.totalAmount.toFixed(2)}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{item.subType}</td>
                      <td className="px-3 py-2.5 text-muted-foreground font-mono text-xs">{formatBeijingTime(item.transactionDate)}</td>
                       <td className="px-3 py-2.5">{item.operator}</td>
                       <td className="px-3 py-2.5 text-center">
                         <div className="flex items-center justify-center gap-1">
                           {canUndoOutbound(item) && (
                             <Button
                               variant="ghost"
                               size="icon"
                               className="h-7 w-7"
                               disabled={undoingId === item.id}
                               onClick={() => handleUndo(item)}
                               title="撤销出库"
                             >
                               <RotateCcw className="size-4" />
                             </Button>
                           )}
                           <Button
                             variant="ghost"
                             size="icon"
                             className="h-7 w-7"
                             onClick={() => handlePrint(item)}
                             title="打印"
                           >
                             <Printer className="size-4" />
                           </Button>
                         </div>
                       </td>
                    </tr>
                      );
                    });
                  })()}
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
       type={printItem?.type === 'outbound' ? 'outbound' : 'inbound'}
       data={printItem}
       open={printOpen}
       onOpenChange={setPrintOpen}
     />
    </>
   );
}
