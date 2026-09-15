import { Badge } from '@client/src/components/ui/badge';
import { Button } from '@client/src/components/ui/button';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  PackageCheck,
  Pencil,
  Truck,
  Warehouse,
  XCircle,
} from 'lucide-react';
import { formatBeijingTime } from '@client/src/utils/date';
import type { SalesOrder, SalesOrderStatus } from '@shared/api.interface';

export const SALES_STATUS_STYLES: Record<
  SalesOrderStatus,
  { label: string; className: string }
> = {
  pending: {
    label: '待确认',
    className: 'rounded-full bg-warning/10 text-warning border-warning/20',
  },
  confirmed: {
    label: '已确认',
    className: 'rounded-full bg-primary/10 text-primary border-primary/20',
  },
  picking: {
    label: '备货中',
    className: 'rounded-full bg-primary/10 text-primary border-primary/20',
  },
  shipped: {
    label: '已出库',
    className: 'rounded-full bg-success/10 text-success border-success/20',
  },
  completed: {
    label: '已完成',
    className: 'rounded-full bg-success/15 text-success border-success/25',
  },
  cancelled: {
    label: '已取消',
    className: 'rounded-full bg-muted text-muted-foreground border-border',
  },
};

function canEdit(status: SalesOrderStatus): boolean {
  return status === 'pending';
}

function canCancel(status: SalesOrderStatus): boolean {
  return ['pending', 'confirmed', 'picking'].includes(status);
}

function nextActionLabel(status: SalesOrderStatus): string | null {
  switch (status) {
    case 'pending':
      return '确认';
    case 'confirmed':
      return '开始备货';
    case 'picking':
      return '出库';
    case 'shipped':
      return '完成';
    default:
      return null;
  }
}

function renderActionIcon(status: SalesOrderStatus) {
  switch (status) {
    case 'pending':
      return <CheckCircle2 className="size-3.5" />;
    case 'confirmed':
      return <Clock className="size-3.5" />;
    case 'picking':
      return <Truck className="size-3.5" />;
    case 'shipped':
      return <PackageCheck className="size-3.5" />;
    default:
      return null;
  }
}

interface SalesOrdersTableProps {
  items: SalesOrder[];
  total: number;
  page: number;
  totalPages: number;
  isLoading: boolean;
  actionLoadingId: string | null;
  onViewDetail: (id: string) => void;
  onEdit: (order: SalesOrder) => void;
  onNextAction: (order: SalesOrder) => void;
  onCancel: (order: SalesOrder) => void;
  onPageChange: (page: number) => void;
}

export function SalesOrdersTable({
  items,
  total,
  page,
  totalPages,
  isLoading,
  actionLoadingId,
  onViewDetail,
  onEdit,
  onNextAction,
  onCancel,
  onPageChange,
}: SalesOrdersTableProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
        加载中...
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
        暂无符合条件的订单数据
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm whitespace-nowrap">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground w-36">
                订单号
              </th>
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground min-w-[140px]">
                客户名称
              </th>
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground w-24">
                仓库
              </th>
              <th className="px-3 py-2.5 text-right font-medium text-muted-foreground w-28">
                总金额
              </th>
              <th className="px-3 py-2.5 text-center font-medium text-muted-foreground w-24">
                状态
              </th>
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground w-40">
                创建时间
              </th>
              <th className="px-3 py-2.5 text-right font-medium text-muted-foreground w-60">
                操作
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item: SalesOrder) => {
              const s =
                SALES_STATUS_STYLES[item.status] ?? {
                  label: item.status,
                  className: '',
                };
              const nextLabel = nextActionLabel(item.status);
              return (
                <tr
                  key={item.id}
                  className="border-b border-border/50 hover:bg-accent/50"
                >
                  <td className="px-3 py-2.5 font-mono text-xs">
                    {item.orderNo}
                  </td>
                  <td className="px-3 py-2.5 font-medium">
                    {item.customerName}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Warehouse className="size-3.5" />
                      {item.warehouse}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono font-medium">
                    ¥{item.totalAmount.toFixed(2)}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <Badge variant="secondary" className={s.className}>
                      {s.label}
                    </Badge>
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground font-mono text-xs">
                    {formatBeijingTime(item.createdAt)}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center justify-end gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => onViewDetail(item.id)}
                        className="text-primary hover:text-primary/80 text-sm px-1.5 py-0.5 inline-flex items-center gap-1"
                      >
                        <Eye className="size-3.5" />
                        查看
                      </button>
                      {canEdit(item.status) && (
                        <button
                          type="button"
                          onClick={() => onEdit(item)}
                          className="text-success hover:text-success/80 text-sm px-1.5 py-0.5 inline-flex items-center gap-1"
                        >
                          <Pencil className="size-3.5" />
                          编辑
                        </button>
                      )}
                      {nextLabel && (
                        <button
                          type="button"
                          disabled={actionLoadingId === item.id}
                          onClick={() => onNextAction(item)}
                          className="text-primary hover:text-primary/80 text-sm px-1.5 py-0.5 inline-flex items-center gap-1 disabled:opacity-50"
                        >
                          {renderActionIcon(item.status)}
                          {nextLabel}
                        </button>
                      )}
                      {canCancel(item.status) && (
                        <button
                          type="button"
                          disabled={actionLoadingId === item.id}
                          onClick={() => onCancel(item)}
                          className="text-destructive hover:text-destructive/80 text-sm px-1.5 py-0.5 inline-flex items-center gap-1 disabled:opacity-50"
                        >
                          <XCircle className="size-3.5" />
                          取消
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between pt-4 mt-2 border-t border-border">
        <span className="text-sm text-muted-foreground">
          共 {total} 条订单
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => onPageChange(Math.max(1, page - 1))}
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
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          >
            下一页
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </>
  );
}
