import { useEffect, useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@client/src/components/ui/dialog';
import { Button } from '@client/src/components/ui/button';
import { Badge } from '@client/src/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@client/src/components/ui/card';
import {
  FileText,
  CheckCircle2,
  Clock,
  Truck,
  PackageCheck,
  XCircle,
  CheckCircle,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { formatBeijingTime, formatBeijingDate } from '@client/src/utils/date';
import { salesOrders } from '@client/src/api';
import { SALES_STATUS_STYLES } from './SalesOrdersTable';
import type {
  SalesOrder,
  SalesOrderStatus,
  SalesOrderStatusLog,
} from '@shared/api.interface';

const STATUS_FLOW: SalesOrderStatus[] = [
  'pending',
  'confirmed',
  'picking',
  'shipped',
  'completed',
];

const STATUS_ICONS: Record<SalesOrderStatus, typeof CheckCircle2> = {
  pending: Clock,
  confirmed: CheckCircle2,
  picking: PackageCheck,
  shipped: Truck,
  completed: CheckCircle,
  cancelled: XCircle,
};

function nextActionLabel(status: SalesOrderStatus): string | null {
  switch (status) {
    case 'pending':
      return '确认订单';
    case 'confirmed':
      return '开始备货';
    case 'picking':
      return '出库发货';
    case 'shipped':
      return '确认完成';
    default:
      return null;
  }
}

function canCancel(status: SalesOrderStatus): boolean {
  return ['pending', 'confirmed', 'picking'].includes(status);
}

interface OrderDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string | null;
  onStatusChanged: () => void;
}

export function OrderDetailDialog({
  open,
  onOpenChange,
  orderId,
  onStatusChanged,
}: OrderDetailDialogProps) {
  const [order, setOrder] = useState<SalesOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadOrder = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    try {
      const data = await salesOrders.getOrder(orderId);
      setOrder(data);
    } catch (err: unknown) {
      logger.error('获取订单详情失败:', String(err));
      toast.error('获取订单详情失败');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    if (!open || !orderId) {
      setOrder(null);
      return;
    }
    loadOrder();
  }, [open, orderId, loadOrder]);

  const handleStatusAction = async (action: string) => {
    if (!order || actionLoading) return;
    setActionLoading(action);
    try {
      switch (action) {
        case 'confirm':
          await salesOrders.confirmOrder(order.id);
          toast.success('订单已确认');
          break;
        case 'start-picking':
          await salesOrders.startPicking(order.id);
          toast.success('已开始备货');
          break;
        case 'ship':
          await salesOrders.shipOrder(order.id);
          toast.success('订单已出库');
          break;
        case 'complete':
          await salesOrders.completeOrder(order.id);
          toast.success('订单已完成');
          break;
        case 'cancel':
          await salesOrders.cancelOrder(order.id);
          toast.success('订单已取消');
          break;
        default:
          break;
      }
      await loadOrder();
      onStatusChanged();
    } catch (err: unknown) {
      logger.error(`订单操作 ${action} 失败:`, String(err));
      toast.error('操作失败，请重试');
    } finally {
      setActionLoading(null);
    }
  };

  if (!order && !loading) return null;

  const statusInfo = order
    ? SALES_STATUS_STYLES[order.status] ?? { label: order.status, className: '' }
    : null;

  const getStatusTime = (status: SalesOrderStatus): string | null => {
    if (!order?.statusHistory) return null;
    const found = order.statusHistory.find(
      (h: SalesOrderStatusLog) => h.status === status,
    );
    return found?.at ?? null;
  };

  const currentIndex = order
    ? STATUS_FLOW.indexOf(order.status)
    : -1;
  const isCancelled = order?.status === 'cancelled';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[760px] max-h-[85vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="px-6 py-5 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-8 h-8 rounded-sm bg-primary/10">
                <FileText className="size-4 text-primary" />
              </div>
              <DialogTitle className="text-base font-semibold tracking-tight">
                订单详情
                <span className="ml-2 text-xs font-mono text-muted-foreground font-normal">
                  {order?.orderNo}
                </span>
              </DialogTitle>
            </div>
            {statusInfo && (
              <Badge variant="secondary" className={statusInfo.className}>
                {statusInfo.label}
              </Badge>
            )}
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
            加载中...
          </div>
        ) : order ? (
          <div className="px-6 py-5 space-y-5">
            <Card className="rounded-sm shadow-none border border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">
                  基本信息
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  <div>
                    <div className="text-muted-foreground text-xs mb-1">
                      客户名称
                    </div>
                    <div className="font-medium">{order.customerName}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs mb-1">
                      发货仓库
                    </div>
                    <div>{order.warehouse}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs mb-1">
                      联系人
                    </div>
                    <div>{order.customerContact || '-'}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs mb-1">
                      联系电话
                    </div>
                    <div>{order.customerPhone || '-'}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs mb-1">
                      预计发货日
                    </div>
                    <div>{formatBeijingDate(order.expectedShipDate)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs mb-1">
                      创建时间
                    </div>
                    <div>{formatBeijingTime(order.createdAt)}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-muted-foreground text-xs mb-1">
                      备注
                    </div>
                    <div>{order.remark || '-'}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-sm shadow-none border border-border">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium">
                  商品明细
                </CardTitle>
                <div className="text-sm">
                  <span className="text-muted-foreground text-xs mr-2">
                    合计
                  </span>
                  <span className="font-mono text-lg font-semibold">
                    ¥{order.totalAmount.toFixed(2)}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                          商品名称
                        </th>
                        <th className="px-4 py-2 text-left font-medium text-muted-foreground w-28">
                          SKU编码
                        </th>
                        <th className="px-4 py-2 text-left font-medium text-muted-foreground w-20">
                          规格
                        </th>
                        <th className="px-4 py-2 text-right font-medium text-muted-foreground w-20">
                          数量
                        </th>
                        <th className="px-4 py-2 text-right font-medium text-muted-foreground w-28">
                          单价（元）
                        </th>
                        <th className="px-4 py-2 text-right font-medium text-muted-foreground w-28">
                          小计（元）
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {(order.items ?? []).map((item) => (
                        <tr
                          key={item.id}
                          className="border-b border-border/50"
                        >
                          <td className="px-4 py-2 font-medium">
                            {item.productName}
                          </td>
                          <td className="px-4 py-2 font-mono text-xs text-muted-foreground">
                            {item.productCode}
                          </td>
                          <td className="px-4 py-2 text-muted-foreground">
                            {item.productSpec || '-'}
                          </td>
                          <td className="px-4 py-2 text-right font-mono">
                            {item.quantity}
                          </td>
                          <td className="px-4 py-2 text-right font-mono">
                            ¥{item.unitPrice.toFixed(2)}
                          </td>
                          <td className="px-4 py-2 text-right font-mono font-medium">
                            ¥{item.totalPrice.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-sm shadow-none border border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">
                  状态流转
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  {isCancelled && (
                    <div className="mb-4 flex items-start gap-3">
                      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-muted flex items-center justify-center">
                        <XCircle className="size-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 pt-0.5">
                        <div className="text-sm font-medium text-muted-foreground">
                          已取消
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 font-mono">
                          {getStatusTime('cancelled')
                            ? formatBeijingTime(getStatusTime('cancelled'))
                            : '-'}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-0">
                    {STATUS_FLOW.map((s, index) => {
                      const Icon = STATUS_ICONS[s];
                      const done =
                        currentIndex >= 0 && index <= currentIndex;
                      const current = order.status === s;
                      const time = getStatusTime(s);
                      return (
                        <div key={s} className="relative flex">
                          {index < STATUS_FLOW.length - 1 && (
                            <div
                              className={`absolute left-3.5 top-7 bottom-0 w-px ${
                                done && currentIndex > index
                                  ? 'bg-primary'
                                  : 'bg-border'
                              }`}
                            />
                          )}
                          <div className="flex-shrink-0 w-7 h-7 relative z-10">
                            <div
                              className={`w-7 h-7 rounded-full flex items-center justify-center ${
                                done
                                  ? current
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-primary/10 text-primary'
                                    : 'bg-muted text-muted-foreground'
                              }`}
                            >
                              <Icon className="size-4" />
                            </div>
                          </div>
                          <div className="flex-1 pl-3 pb-5">
                            <div
                              className={`text-sm font-medium ${
                                done
                                  ? 'text-foreground'
                                  : 'text-muted-foreground'
                              }`}
                            >
                              {SALES_STATUS_STYLES[s].label}
                              {current && (
                                <span className="ml-2 text-xs font-normal text-primary">
                                  （当前）
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5 font-mono">
                              {time ? formatBeijingTime(time) : '未到达'}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}

        <DialogFooter className="px-6 py-4 border-t border-border">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            关闭
          </Button>
          {order && canCancel(order.status) && (
            <Button
              variant="outline"
              className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
              onClick={() => handleStatusAction('cancel')}
              disabled={!!actionLoading}
            >
              {actionLoading === 'cancel' && (
                <Loader2 className="size-4 mr-2 animate-spin" />
              )}
              <XCircle className="size-4 mr-1.5" />
              取消订单
            </Button>
          )}
          {order && nextActionLabel(order.status) && (
            <Button
              onClick={() => {
                const action =
                  order.status === 'pending'
                    ? 'confirm'
                    : order.status === 'confirmed'
                    ? 'start-picking'
                    : order.status === 'picking'
                    ? 'ship'
                    : 'complete';
                handleStatusAction(action);
              }}
              disabled={!!actionLoading}
            >
              {actionLoading && actionLoading !== 'cancel' && (
                <Loader2 className="size-4 mr-2 animate-spin" />
              )}
              {nextActionLabel(order.status)}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
