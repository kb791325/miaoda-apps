import { useEffect, useState } from 'react';
import { purchaseOrders } from '@client/src/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@client/src/components/ui/dialog';
import { Badge } from '@client/src/components/ui/badge';
import { Skeleton } from '@client/src/components/ui/skeleton';
import { FileText } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { formatBeijingTime } from '@client/src/utils/date';
import type { PurchaseOrder, PurchaseOrderItem } from '@shared/api.interface';
import { STATUS_STYLES, extractErrorMessage } from './constants';

interface PurchaseOrderDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string | null;
}

const INFO_CELL_LABEL = 'text-xs text-muted-foreground mb-1';

export const PurchaseOrderDetailDialog: React.FC<
  PurchaseOrderDetailDialogProps
> = ({ open, onOpenChange, orderId }) => {
  const [order, setOrder] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !orderId) {
      setOrder(null);
      return;
    }
    const fetchDetail = async (): Promise<void> => {
      setLoading(true);
      try {
        const detail: PurchaseOrder = await purchaseOrders.getOrder(orderId);
        setOrder(detail);
      } catch (err: unknown) {
        logger.error('获取采购订单详情失败:', String(err));
        toast.error(extractErrorMessage(err, '获取订单详情失败'));
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [open, orderId]);

  const statusStyle = order ? STATUS_STYLES[order.status] : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="size-4 text-primary" />
            采购订单详情
            {order && (
              <span className="font-mono text-sm font-normal text-muted-foreground">
                {order.orderNo}
              </span>
            )}
            {statusStyle && (
              <Badge
                variant="secondary"
                className={`rounded-full ${statusStyle.className}`}
              >
                {statusStyle.label}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {loading || !order ? (
          <div className="space-y-3 py-2">
            <Skeleton className="h-16 w-full rounded-sm" />
            <Skeleton className="h-40 w-full rounded-sm" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 rounded-sm border border-border p-4">
              <div>
                <div className={INFO_CELL_LABEL}>供应商</div>
                <div className="text-sm font-medium">
                  {order.supplierName ?? '-'}
                </div>
              </div>
              <div>
                <div className={INFO_CELL_LABEL}>目标仓库</div>
                <div className="text-sm font-medium">{order.warehouse}</div>
              </div>
              <div>
                <div className={INFO_CELL_LABEL}>预计到货日期</div>
                <div className="text-sm font-mono">
                  {order.expectedDate
                    ? order.expectedDate.slice(0, 10)
                    : '-'}
                </div>
              </div>
              <div>
                <div className={INFO_CELL_LABEL}>创建时间</div>
                <div className="text-sm font-mono">
                  {formatBeijingTime(order.createdAt)}
                </div>
              </div>
              {order.inboundNo && (
                <div>
                  <div className={INFO_CELL_LABEL}>入库单号</div>
                  <div className="text-sm font-mono">{order.inboundNo}</div>
                </div>
              )}
              {order.remark && (
                <div className="col-span-2 md:col-span-4">
                  <div className={INFO_CELL_LABEL}>备注</div>
                  <div className="text-sm">{order.remark}</div>
                </div>
              )}
            </div>

            <div className="rounded-sm border border-border overflow-x-auto">
              <table className="w-full border-collapse text-sm whitespace-nowrap">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                      商品
                    </th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                      单价
                    </th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                      收货进度
                    </th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                      小计
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(order.items ?? []).map((item: PurchaseOrderItem) => (
                    <tr key={item.id} className="border-b border-border/50">
                      <td className="px-3 py-2">
                        <div className="font-medium">
                          {item.productName ?? item.productId}
                        </div>
                        {item.productCode && (
                          <div className="font-mono text-xs text-muted-foreground">
                            {item.productCode}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right font-mono">
                        ¥{item.unitPrice.toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono">
                        {item.receivedQuantity}/{item.quantity}
                        {item.productUnit ? ` ${item.productUnit}` : ''}
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-medium">
                        ¥{item.totalPrice.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                  {(order.items ?? []).length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-3 py-6 text-center text-muted-foreground"
                      >
                        暂无明细数据
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-end gap-2 text-sm text-muted-foreground">
              总金额：
              <span className="font-mono font-semibold text-base text-foreground">
                ¥{order.totalAmount.toFixed(2)}
              </span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
