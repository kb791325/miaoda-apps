import React from 'react';
import { toast } from 'sonner';

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

import type {
  OrderDetail,
  OrderFee,
  OrderStatus,
  StockChangeRecord,
} from '@shared/order';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { fetchOrderDetail, updateOrderPayStatus } from '@client/src/api/order';
import { useAuth } from '@client/src/hooks/use-auth';
import OrderOpLogSection from './OrderOpLogSection';

import {
  ORDER_STATUS_PILL_CLASS,
  extractErrorMessage,
  formatAmount,
  formatDateTime,
  type OrderWithAddress,
} from './order-utils';

export interface OrderDetailSheetProps {
  open: boolean;
  orderId: string | null;
  onClose: () => void;
}

const STOCK_KIND_PILL_CLASS: Record<string, string> = {
  入库:
    'border-[hsl(152_65%_45%)] bg-[hsl(152_65%_95%)] text-[hsl(152_65%_30%)]',
  订单恢复:
    'border-[hsl(217_91%_60%)] bg-[hsl(217_91%_95%)] text-[hsl(217_91%_40%)]',
  出库: 'border-[hsl(4_85%_50%)] bg-[hsl(4_85%_95%)] text-[hsl(4_85%_35%)]',
  其他出库:
    'border-[hsl(38_90%_50%)] bg-[hsl(38_90%_95%)] text-[hsl(38_90%_35%)]',
  订单出库:
    'border-[hsl(4_85%_50%)] bg-[hsl(4_85%_95%)] text-[hsl(4_85%_35%)]',
};

const NEUTRAL_PILL_CLASS =
  'border-[hsl(220_10%_70%)] bg-[hsl(220_10%_96%)] text-[hsl(220_10%_50%)]';

const CHARGE_FEE_PILL_CLASS =
  'border-[hsl(217_91%_60%)] bg-[hsl(217_91%_95%)] text-[hsl(217_91%_40%)]';

const OUT_KINDS = ['出库', '其他出库', '订单出库'];

const PAY_STATUS_OPTIONS = ['未支付', '部分支付', '已支付'];


interface DetailRowProps {
  label: string;
  children: React.ReactNode;
}

const DetailRow: React.FC<DetailRowProps> = ({ label, children }) => (
  <div className="flex items-start gap-3 py-2">
    <span className="w-20 shrink-0 text-sm text-muted-foreground">{label}</span>
    <span className="min-w-0 flex-1 text-sm break-words">{children}</span>
  </div>
);

interface StockChangeItemProps {
  record: StockChangeRecord;
}

const StockChangeItem: React.FC<StockChangeItemProps> = ({ record }) => {
  const isOut = OUT_KINDS.includes(record.changeType);
  return (
    <li className="flex items-center gap-3 border-b py-2.5 last:border-b-0">
      <span
        className={cn(
          'inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
          STOCK_KIND_PILL_CLASS[record.changeType] ?? NEUTRAL_PILL_CLASS,
        )}
      >
        {record.changeType || '-'}
      </span>
      <span
        className={cn(
          'w-12 shrink-0 text-sm font-medium',
          isOut ? 'text-destructive' : 'text-[hsl(152_65%_30%)]',
        )}
      >
        {isOut ? '-' : '+'}
        {record.quantity}
      </span>
      <span className="w-[130px] shrink-0 text-xs text-muted-foreground">
        {formatDateTime(record.changeTime)}
      </span>
      <span className="min-w-0 flex-1 truncate text-xs">
        {record.orderNo || '-'}
      </span>
      <span className="max-w-[35%] truncate text-xs text-muted-foreground">
        {record.remark || '-'}
      </span>
    </li>
  );
};

const OrderDetailSheet: React.FC<OrderDetailSheetProps> = ({
  open,
  orderId,
  onClose,
}) => {
  const [detail, setDetail] = React.useState<OrderDetail | null>(null);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [paySaving, setPaySaving] = React.useState<boolean>(false);
  const { hasPerm } = useAuth();

  const loadDetail = React.useCallback((targetId: string) => {
    setLoading(true);
    setDetail(null);
    fetchOrderDetail(targetId)
      .then((res: OrderDetail) => setDetail(res))
      .catch((error: unknown) => toast.error(extractErrorMessage(error)))
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    if (!open || !orderId) return;
    loadDetail(orderId);
  }, [open, orderId, loadDetail]);

  const handlePayStatusChange = async (value: string) => {
    if (!orderId || !detail) return;
    setPaySaving(true);
    try {
      await updateOrderPayStatus(orderId, value);
      toast.success('支付状态已更新');
      loadDetail(orderId);
    } catch (error) {
      toast.error(extractErrorMessage(error));
    } finally {
      setPaySaving(false);
    }
  };

  const order: OrderWithAddress | null = detail?.order ?? null;

  return (
    <Sheet
      open={open}
      onOpenChange={(nextOpen: boolean) => {
        if (!nextOpen) onClose();
      }}
    >
      <SheetContent
        side="right"
        className="flex w-[440px] flex-col gap-0 overflow-y-auto p-0 sm:max-w-[440px]"
      >
        <SheetHeader className="border-b p-5">
          <SheetTitle className="flex items-center gap-2">
            订单详情
            {order && (
              <span
                className={cn(
                  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
                  ORDER_STATUS_PILL_CLASS[order.status as OrderStatus] ??
                    NEUTRAL_PILL_CLASS,
                )}
              >
                {order.status}
              </span>
            )}
          </SheetTitle>
          <SheetDescription>订单完整信息与关联库存变动记录</SheetDescription>
          {order ? (
            <div className="mt-3 flex items-center justify-between gap-3 rounded-md border px-3 py-2">
              <span className="text-sm text-muted-foreground">支付状态</span>
              {hasPerm('order:pay') ? (
                <Select
                  value={order.payStatus || undefined}
                  onValueChange={handlePayStatusChange}
                  disabled={paySaving}
                >
                  <SelectTrigger className="h-8 w-32">
                    <SelectValue placeholder="请选择" />
                  </SelectTrigger>
                  <SelectContent>
                    {(
                      order.payStatus &&
                      !PAY_STATUS_OPTIONS.includes(order.payStatus)
                        ? [...PAY_STATUS_OPTIONS, order.payStatus]
                        : PAY_STATUS_OPTIONS
                    ).map((option: string) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <span className="text-sm font-medium">
                  {order.payStatus || '未支付'}
                </span>
              )}
            </div>
          ) : null}
        </SheetHeader>

        {loading && (
          <div className="space-y-3 p-5">
            {[1, 2, 3, 4, 5, 6].map((n: number) => (
              <Skeleton key={n} className="h-6 w-full" />
            ))}
          </div>
        )}

        {!loading && order && (
          <div className="flex flex-col gap-5 p-5">
            <section className="rounded-lg border bg-card p-4 shadow-sm">
              <DetailRow label="订单号">{order.orderNo || '-'}</DetailRow>
              <DetailRow label="客户">{order.customerName || '-'}</DetailRow>
              <DetailRow label="商品">{order.productName || '-'}</DetailRow>
              <DetailRow label="数量">{order.quantity ?? '-'}</DetailRow>
              <DetailRow label="单价">
                {order.unitPrice != null ? formatAmount(order.unitPrice) : '-'}
              </DetailRow>
              <DetailRow label="商品金额">
                {order.amount != null ? formatAmount(order.amount) : '-'}
              </DetailRow>
              <DetailRow label="下单时间">
                {formatDateTime(order.orderTime)}
              </DetailRow>
              <DetailRow label="发货时间">
                {formatDateTime(order.shipTime)}
              </DetailRow>
              <DetailRow label="收货地址">
                {order.address || '-'}
              </DetailRow>
              <DetailRow label="备注">{order.remark || '-'}</DetailRow>
            </section>

            <section>
              <h3 className="mb-2 text-sm font-medium">费用明细</h3>
              {detail != null && detail.fees.length > 0 ? (
                <div className="rounded-lg border bg-card px-4 shadow-sm">
                  <ul>
                    {detail.fees.map((fee: OrderFee) => (
                      <li
                        key={fee.id}
                        className="flex items-center gap-2 border-b py-2.5 last:border-b-0"
                      >
                        <span className="shrink-0 text-sm">
                          {fee.feeTypeName || '-'}
                        </span>
                        <span
                          className={cn(
                            'inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-xs font-medium',
                            fee.isChargeCustomer
                              ? CHARGE_FEE_PILL_CLASS
                              : NEUTRAL_PILL_CLASS,
                          )}
                        >
                          {fee.isChargeCustomer ? '计入订单' : '仅计成本'}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                          {fee.remark || '-'}
                        </span>
                        <span className="shrink-0 text-sm font-medium">
                          {formatAmount(fee.amount)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div className="space-y-1 border-t py-3 text-right text-xs text-muted-foreground">
                    <p>商品金额 {formatAmount(order.amount ?? 0)}</p>
                    <p>收取费用 {formatAmount(order.totalFee ?? 0)}</p>
                    <p className="text-sm font-semibold text-foreground">
                      订单总金额{' '}
                      {formatAmount(
                        (order.amount ?? 0) + (order.totalFee ?? 0),
                      )}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground shadow-sm">
                  暂无费用明细
                </p>
              )}
            </section>

            <section>
              <h3 className="mb-2 text-sm font-medium">库存变动记录</h3>
              {detail != null && detail.stockChanges.length > 0 ? (
                <ul className="rounded-lg border bg-card px-4 shadow-sm">
                  {detail.stockChanges.map((record: StockChangeRecord) => (
                    <StockChangeItem key={record.id} record={record} />
                  ))}
                </ul>
              ) : (
                <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground shadow-sm">
                  暂无库存变动记录
                </p>
              )}
            </section>

            <section>
              <h3 className="mb-2 text-sm font-medium">操作日志</h3>
              <OrderOpLogSection open={open} orderId={orderId} />
            </section>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default OrderDetailSheet;
