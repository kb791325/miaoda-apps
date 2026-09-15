import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { History } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Spinner } from '@/components/ui/spinner';
import { fetchStockChanges } from '@client/src/api/product';
import type { Product, StockChangeRecord } from '@shared/product';
import { extractErrorMessage } from './inventory-utils';

const STOCK_CHANGE_PAGE_SIZE = 200;

export interface StockChangeListDialogProps {
  open: boolean;
  product: Product | null;
  onClose: () => void;
}

interface ChangeKindVisual {
  badgeClass: string;
  qtyClass: string;
  sign: '+' | '-';
}

/** 入库=绿 / 出库类（含其他出库、订单出库）=红 / 订单恢复=蓝 */
function resolveChangeKindVisual(changeType: string): ChangeKindVisual {
  if (changeType === '入库') {
    return {
      badgeClass: 'bg-[hsl(152_65%_95%)] text-[hsl(152_65%_30%)]',
      qtyClass: 'text-emerald-600',
      sign: '+',
    };
  }
  if (changeType === '订单恢复') {
    return {
      badgeClass: 'bg-[hsl(217_91%_95%)] text-[hsl(217_91%_40%)]',
      qtyClass: 'text-primary',
      sign: '+',
    };
  }
  return {
    badgeClass: 'bg-[hsl(4_85%_95%)] text-[hsl(4_85%_35%)]',
    qtyClass: 'text-destructive',
    sign: '-',
  };
}

/**
 * 库存变动流水侧边弹窗：展示单个商品全部变动记录
 * （时间/类型/数量/关联订单号/备注）。
 */
export const StockChangeListDialog: React.FC<StockChangeListDialogProps> = ({
  open,
  product,
  onClose,
}) => {
  const [items, setItems] = useState<StockChangeRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !product) return;
    let cancelled = false;
    const load = async (): Promise<void> => {
      setLoading(true);
      try {
        const result = await fetchStockChanges({
          productId: product.id,
          pageSize: STOCK_CHANGE_PAGE_SIZE,
        });
        if (!cancelled) {
          setItems(Array.isArray(result.items) ? result.items : []);
          setTotal(result.total);
        }
      } catch (error: unknown) {
        if (!cancelled) toast.error(extractErrorMessage(error));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [open, product]);

  return (
    <Sheet open={open} onOpenChange={(next: boolean) => !next && onClose()}>
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border px-6 py-4">
          <SheetTitle className="flex items-center gap-2">
            <History className="size-4 text-muted-foreground" />
            库存流水
          </SheetTitle>
          <SheetDescription>
            {product
              ? `${product.productName}（${product.productNo}）全部变动记录（${total} 条）`
              : ''}
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 space-y-2 overflow-y-auto px-4 py-4">
          {loading && (
            <div className="flex items-center justify-center py-10">
              <Spinner className="size-5 text-muted-foreground" />
            </div>
          )}
          {!loading && items.length === 0 && (
            <div className="py-10 text-center text-sm text-muted-foreground">
              暂无变动记录
            </div>
          )}
          {!loading &&
            items.map((record: StockChangeRecord): React.ReactNode => {
              const visual = resolveChangeKindVisual(record.changeType);
              return (
                <div
                  key={record.id}
                  className="rounded-lg border border-border px-3 py-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className={visual.badgeClass}>
                        {record.changeType}
                      </Badge>
                      <span
                        className={`text-sm font-semibold ${visual.qtyClass}`}
                      >
                        {visual.sign}
                        {record.quantity}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {record.changeTime
                        ? dayjs(record.changeTime).format('YYYY-MM-DD HH:mm')
                        : '-'}
                    </span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span>关联订单：{record.orderNo || '-'}</span>
                    {record.remark ? (
                      <span className="break-words">备注：{record.remark}</span>
                    ) : null}
                  </div>
                </div>
              );
            })}
        </div>
      </SheetContent>
    </Sheet>
  );
};
