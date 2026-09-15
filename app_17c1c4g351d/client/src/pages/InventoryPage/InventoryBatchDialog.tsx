import { useState, useMemo, type ReactNode } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Minus, Plus, ArrowDown } from 'lucide-react';
import type { InventoryItem } from '@shared/api.interface';
import { batchChangeInventory } from '@/api/inventory';

type Direction = 'in' | 'out';

interface RowDraft {
  productId: string;
  productName: string;
  currentStock: number;
  direction: Direction;
  quantity: string;
}

export interface InventoryBatchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedItems: InventoryItem[];
  onClearSelection: () => void;
  onSuccess: () => Promise<void> | void;
  trigger?: ReactNode;
}

export default function InventoryBatchDialog({
  open,
  onOpenChange,
  selectedItems,
  onClearSelection,
  onSuccess,
}: InventoryBatchDialogProps) {
  const [direction, setDirection] = useState<Direction>('in');
  const [rows, setRows] = useState<RowDraft[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const resetRows = (items: InventoryItem[], dir: Direction) => {
    setRows(
      items.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        currentStock: item.currentStock,
        direction: dir,
        quantity: '',
      })),
    );
  };

  const initRows = (dir: Direction) => resetRows(selectedItems, dir);

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      initRows(direction);
    } else {
      setRows([]);
    }
    onOpenChange(nextOpen);
  };

  const updateRow = (productId: string, patch: Partial<RowDraft>) => {
    setRows((prev) =>
      prev.map((r) => (r.productId === productId ? { ...r, ...patch } : r)),
    );
  };

  const validRows = useMemo(() => {
    const out: { productId: string; quantity: number; direction: Direction }[] = [];
    for (const r of rows) {
      const q = Math.round(parseFloat(r.quantity) || 0);
      if (q > 0) out.push({ productId: r.productId, quantity: q, direction: r.direction });
    }
    return out;
  }, [rows]);

  const handleSubmit = async () => {
    if (validRows.length === 0) {
      toast.error('请至少填写一条有效的调整数量');
      return;
    }
    try {
      setSubmitting(true);
      const res = await batchChangeInventory({ items: validRows });
      const { successCount, failedCount } = res;
      if (failedCount === 0) {
        toast.success(`批量调整成功，共 ${successCount} 条`);
      } else if (successCount === 0) {
        toast.error(`批量调整失败，共 ${failedCount} 条未成功`);
      } else {
        toast.warning(`部分成功：成功 ${successCount} 条，失败 ${failedCount} 条`);
      }
      for (const r of res.results) {
        if (!r.success) {
          toast.error(`${r.productName}：${r.message}`);
        }
      }
      await onSuccess();
      onClearSelection();
      onOpenChange(false);
    } catch (err: unknown) {
      let msg = '批量调整失败';
      if (err && typeof err === 'object') {
        const axErr = err as {
          response?: { data?: { error?: { message?: string }; message?: string } };
          message?: string;
        };
        const serverMsg =
          axErr.response?.data?.error?.message || axErr.response?.data?.message;
        if (serverMsg) msg = serverMsg;
        else if (typeof axErr.message === 'string' && axErr.message) msg = axErr.message;
      }
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSwitchDirection = (dir: Direction) => {
    setDirection(dir);
    setRows((prev) => prev.map((r) => ({ ...r, direction: dir })));
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>批量库存调整</DialogTitle>
          <DialogDescription>
            已选择 {selectedItems.length} 个商品，填写调整数量后统一提交
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleSwitchDirection('in')}
              className={`flex-1 h-9 rounded-md text-sm font-medium transition-colors border ${
                direction === 'in'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-muted-foreground border-border hover:bg-accent'
              }`}
            >
              批量入库
            </button>
            <button
              type="button"
              onClick={() => handleSwitchDirection('out')}
              className={`flex-1 h-9 rounded-md text-sm font-medium transition-colors border ${
                direction === 'out'
                  ? 'bg-red-500 text-white border-red-500'
                  : 'bg-background text-muted-foreground border-border hover:bg-accent'
              }`}
            >
              批量出库
            </button>
          </div>

          <div className="rounded-md border border-border max-h-[360px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[45%]">商品</TableHead>
                  <TableHead className="text-right">当前库存</TableHead>
                  <TableHead className="text-right">调整数量</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-6 text-muted-foreground">
                      暂无选中商品
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => (
                    <TableRow key={row.productId}>
                      <TableCell>
                        <p className="font-medium text-sm truncate">{row.productName}</p>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.currentStock.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          min="1"
                          value={row.quantity}
                          onChange={(e) =>
                            updateRow(row.productId, { quantity: e.target.value })
                          }
                          placeholder="数量"
                          className="h-8 w-24 ml-auto text-right"
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              已填数量：<Badge variant="secondary">{validRows.length}</Badge>
            </span>
            <span>
              模式：
              <Badge variant={direction === 'in' ? 'default' : 'destructive'}>
                {direction === 'in' ? '入库' : '出库'}
              </Badge>
            </span>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            取消
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={submitting}>
            {direction === 'in' ? (
              <>
                <Plus className="size-4 mr-1.5" />
                确认入库 ({validRows.length})
              </>
            ) : (
              <>
                <ArrowDown className="size-4 mr-1.5" />
                确认出库 ({validRows.length})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
