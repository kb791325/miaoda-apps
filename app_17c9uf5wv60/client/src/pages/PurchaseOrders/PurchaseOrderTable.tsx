import { Badge } from '@client/src/components/ui/badge';
import { Button } from '@client/src/components/ui/button';
import { Skeleton } from '@client/src/components/ui/skeleton';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  PackageCheck,
  PackageX,
  Warehouse,
  XCircle,
} from 'lucide-react';
import { formatBeijingTime } from '@client/src/utils/date';
import type { PurchaseOrder } from '@shared/api.interface';
import { STATUS_STYLES, canApprove, canReceive, canCancel } from './constants';

interface PurchaseOrderTableProps {
  items: PurchaseOrder[];
  total: number;
  page: number;
  pageSize: number;
  isLoading: boolean;
  actionLoadingId: string | null;
  onPageChange: (page: number, pageSize: number) => void;
  onApprove: (order: PurchaseOrder) => void;
  onReceive: (order: PurchaseOrder) => void;
  onCancel: (order: PurchaseOrder) => void;
  onViewDetail: (order: PurchaseOrder) => void;
}

const actionBtnBase =
  'text-sm px-1.5 py-0.5 inline-flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed';

const totalPages = (total: number, pageSize: number): number =>
  Math.max(1, Math.ceil(total / pageSize));

export const PurchaseOrderTable: React.FC<PurchaseOrderTableProps> = ({
  items,
  total,
  page,
  pageSize,
  isLoading,
  actionLoadingId,
  onPageChange,
  onApprove,
  onReceive,
  onCancel,
  onViewDetail,
}) => {
  if (isLoading && items.length === 0) {
    return (
      <div className="space-y-2.5 py-2">
        {Array.from({ length: 8 }, (_: unknown, idx: number) => (
          <Skeleton key={idx} className="h-10 w-full rounded-sm" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
        <PackageX className="size-8" />
        <span className="text-sm">暂无符合条件的采购订单</span>
      </div>
    );
  }

  const pages: number = totalPages(total, pageSize);

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm whitespace-nowrap">
          <thead>
            <tr className="border-b border-border">
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground w-36">
                订单号
              </th>
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground min-w-[140px]">
                供应商
              </th>
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground w-28">
                目标仓库
              </th>
              <th className="px-3 py-2.5 text-center font-medium text-muted-foreground w-24">
                状态
              </th>
              <th className="px-3 py-2.5 text-right font-medium text-muted-foreground w-28">
                总金额
              </th>
              <th className="px-3 py-2.5 text-right font-medium text-muted-foreground w-28">
                预计到货
              </th>
              <th className="px-3 py-2.5 text-right font-medium text-muted-foreground w-36">
                创建时间
              </th>
              <th className="px-3 py-2.5 text-right font-medium text-muted-foreground w-48">
                操作
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((record: PurchaseOrder) => {
              const busy: boolean = actionLoadingId === record.id;
              return (
                <tr
                  key={record.id}
                  className="border-b border-border/50 hover:bg-muted/30"
                >
                  <td className="px-3 py-2.5 font-mono text-xs">
                    {record.orderNo}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="font-medium">{record.supplierName ?? '-'}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Warehouse className="size-3.5" />
                      {record.warehouse}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <Badge variant="secondary" className={STATUS_STYLES[record.status]?.className ?? ''}>
                      {STATUS_STYLES[record.status]?.label ?? record.status}
                    </Badge>
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono font-medium">
                    ¥{record.totalAmount.toFixed(2)}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs text-muted-foreground">
                    {record.expectedDate ? record.expectedDate.slice(0, 10) : '-'}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs text-muted-foreground">
                    {formatBeijingTime(record.createdAt)}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center justify-end gap-1.5 flex-wrap">
                      {canApprove(record.status) && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => onApprove(record)}
                          className={`${actionBtnBase} text-primary hover:text-primary/80`}
                        >
                          <CheckCircle2 className="size-3.5" />
                          审批
                        </button>
                      )}
                      {canReceive(record.status) && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => onReceive(record)}
                          className={`${actionBtnBase} text-success hover:text-success/80`}
                        >
                          <PackageCheck className="size-3.5" />
                          入库
                        </button>
                      )}
                      {canCancel(record.status) && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => onCancel(record)}
                          className={`${actionBtnBase} text-destructive hover:text-destructive/80`}
                        >
                          <XCircle className="size-3.5" />
                          取消
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onViewDetail(record)}
                        className={`${actionBtnBase} text-primary hover:text-primary/80`}
                      >
                        <Eye className="size-3.5" />
                        详情
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between gap-2 pt-3">
        <span className="text-xs text-muted-foreground">共 {total} 条订单</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            第 {page} / {pages} 页
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1 || isLoading}
            onClick={() => onPageChange(page - 1, pageSize)}
          >
            <ChevronLeft className="size-4" />
            上一页
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pages || isLoading}
            onClick={() => onPageChange(page + 1, pageSize)}
          >
            下一页
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
