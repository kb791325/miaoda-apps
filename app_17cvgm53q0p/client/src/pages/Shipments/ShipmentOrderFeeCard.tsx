import React from 'react';

import { Skeleton } from '@/components/ui/skeleton';

import type { OrderFee } from '@shared/fee';

import { fetchOrderFees } from '@client/src/api/fee';

export interface ShipmentOrderFeeCardProps {
  orderId: string;
}

const formatFeeAmount = (value: number): string =>
  `¥${value.toLocaleString('zh-CN')}`;

const ShipmentOrderFeeCard: React.FC<ShipmentOrderFeeCardProps> = ({
  orderId,
}) => {
  const [loading, setLoading] = React.useState<boolean>(true);
  const [fees, setFees] = React.useState<OrderFee[]>([]);

  React.useEffect(() => {
    let cancelled: boolean = false;
    setLoading(true);
    fetchOrderFees(orderId)
      .then((res) => {
        if (!cancelled) setFees(res.items);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  const totalCharge: number = fees
    .filter((fee: OrderFee) => fee.isChargeCustomer)
    .reduce((sum: number, fee: OrderFee) => sum + fee.amount, 0);

  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <h2 className="mb-4 text-base font-semibold">关联订单费用</h2>
      {loading ? (
        <div className="space-y-2">
          {[1, 2].map((n: number) => (
            <Skeleton key={n} className="h-8 w-full" />
          ))}
        </div>
      ) : fees.length === 0 ? (
        <p className="text-sm text-muted-foreground">暂无费用明细</p>
      ) : (
        <div className="space-y-2">
          {fees.map((fee: OrderFee) => (
            <div key={fee.id} className="flex items-center gap-3 text-sm">
              <span className="w-32 shrink-0 truncate">
                {fee.feeTypeName || '-'}
              </span>
              <span className="w-24 shrink-0 font-medium">
                {formatFeeAmount(fee.amount)}
              </span>
              <span
                className={
                  fee.isChargeCustomer
                    ? 'shrink-0 text-[hsl(217_91%_40%)]'
                    : 'shrink-0 text-muted-foreground'
                }
              >
                {fee.isChargeCustomer ? '计入订单' : '仅计成本'}
              </span>
              <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                {fee.remark || '-'}
              </span>
            </div>
          ))}
          <div className="flex items-center justify-end gap-2 border-t pt-3 text-sm">
            <span className="text-muted-foreground">收取费用合计</span>
            <span className="font-semibold">{formatFeeAmount(totalCharge)}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShipmentOrderFeeCard;
