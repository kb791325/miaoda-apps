import React from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { UserDisplay } from '@/components/business-ui/user-display';
import { fetchOpLogs } from '@client/src/api/op-log';
import type { OpLogItem } from '@shared/op-log';
import { extractErrorMessage, formatDateTime } from './order-utils';

const PAGE_SIZE = 10;

const ACTION_PILL_CLASS =
  'border-[hsl(217_91%_60%)] bg-[hsl(217_91%_95%)] text-[hsl(217_91%_40%)]';

export interface OrderOpLogSectionProps {
  open: boolean;
  orderId: string | null;
}

interface OpLogRowProps {
  item: OpLogItem;
}

const OpLogRow: React.FC<OpLogRowProps> = ({ item }) => {
  const hasValueChange: boolean = Boolean(item.beforeValue || item.afterValue);
  return (
    <li className="border-b py-2.5 last:border-b-0">
      <div className="flex items-center gap-2">
        <span
          className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${ACTION_PILL_CLASS}`}
        >
          {item.action}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm">
          {item.detail || '-'}
        </span>
        {item.operatorName !== '' ? (
          <span className="shrink-0 text-xs text-muted-foreground">
            {item.operatorName}
          </span>
        ) : item.operatorId !== '' ? (
          <UserDisplay value={[item.operatorId]} size="small" />
        ) : null}
      </div>
      <div className="mt-1 flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          {hasValueChange
            ? `${item.beforeValue || '-'} → ${item.afterValue || '-'}`
            : ''}
        </span>
        <span className="shrink-0">{formatDateTime(item.createdAt)}</span>
      </div>
    </li>
  );
};

/**
 * 订单操作日志区块：展示该订单的创建/修改/取消/删除等操作记录，分页加载。
 */
const OrderOpLogSection: React.FC<OrderOpLogSectionProps> = ({
  open,
  orderId,
}) => {
  const [items, setItems] = React.useState<OpLogItem[]>([]);
  const [total, setTotal] = React.useState<number>(0);
  const [page, setPage] = React.useState<number>(1);
  const [loading, setLoading] = React.useState<boolean>(false);

  React.useEffect(() => {
    if (open && orderId) {
      setPage(1);
    }
  }, [open, orderId]);

  React.useEffect(() => {
    if (!open || !orderId) return;
    let cancelled: boolean = false;
    setLoading(true);
    fetchOpLogs('order', orderId, page, PAGE_SIZE)
      .then((res) => {
        if (cancelled) return;
        setItems(Array.isArray(res.items) ? res.items : []);
        setTotal(res.total);
      })
      .catch((error: unknown) => {
        if (!cancelled) toast.error(extractErrorMessage(error));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, orderId, page]);

  const totalPages: number = Math.max(Math.ceil(total / PAGE_SIZE), 1);

  return (
    <div className="rounded-lg border bg-card px-4 shadow-sm">
      {loading ? (
        <div className="space-y-2 py-3">
          {[1, 2, 3].map((n: number) => (
            <Skeleton key={n} className="h-5 w-full" />
          ))}
        </div>
      ) : items.length > 0 ? (
        <>
          <ul>
            {items.map((item: OpLogItem) => (
              <OpLogRow key={item.id} item={item} />
            ))}
          </ul>
          {total > PAGE_SIZE ? (
            <div className="flex items-center justify-between border-t py-2 text-xs text-muted-foreground">
              <span>共 {total} 条</span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  上一页
                </Button>
                <span>
                  {page}/{totalPages}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  下一页
                </Button>
              </div>
            </div>
          ) : null}
        </>
      ) : (
        <p className="py-3 text-sm text-muted-foreground">暂无操作日志</p>
      )}
    </div>
  );
};

export default OrderOpLogSection;
