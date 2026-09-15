import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  extractErrorMessage,
  formatMoney,
} from '@client/src/pages/Inventory/inventory-utils';
import { receiptPaymentApi } from '@client/src/api';
import type { ReceiptDetail } from '@shared/finance-contract';
import { LedgerStatusTag } from './finance-contract-ui';

interface ReceiptDetailDialogProps {
  id: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ReceiptDetailDialog = ({
  id,
  open,
  onOpenChange,
}: ReceiptDetailDialogProps) => {
  const [detail, setDetail] = useState<ReceiptDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!open || !id) {
      setDetail(null);
      return;
    }
    let mounted = true;
    setLoading(true);
    receiptPaymentApi
      .getReceiptPaymentDetail(id)
      .then((res) => {
        if (mounted) setDetail(res);
      })
      .catch((error: unknown) => {
        if (mounted) toast.error(extractErrorMessage(error));
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [open, id]);

  const ledgerLabel =
    detail?.type === '收款' ? '关联应收' : '关联应付';
  const receivedLabel =
    detail?.type === '收款' ? '已收金额' : '已付金额';
  const unpaidLabel =
    detail?.type === '收款' ? '未收金额' : '未付金额';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            收付款详情{detail ? `：${detail.type}记录` : ''}
          </DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="py-10 text-center text-muted-foreground">
            加载中…
          </div>
        ) : detail ? (
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-base">
              <div>
                <p className="text-sm text-muted-foreground">类型</p>
                <p>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      detail.type === '收款'
                        ? 'bg-[hsl(152_65%_95%)] text-[hsl(152_65%_30%)]'
                        : 'bg-[hsl(38_90%_95%)] text-[hsl(38_90%_35%)]'
                    }`}
                  >
                    {detail.type}
                  </span>
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">金额</p>
                <p
                  className={`text-lg font-semibold tabular-nums ${
                    detail.type === '收款'
                      ? 'text-[hsl(152_65%_30%)]'
                      : 'text-[hsl(4_85%_35%)]'
                  }`}
                >
                  {formatMoney(detail.amount)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">对方</p>
                <p className="font-medium">{detail.partyName || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">支付方式</p>
                <p>{detail.paymentMethod}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">收付款日期</p>
                <p>{detail.paymentDate || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">经手人</p>
                <p>{detail.operatorName || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">批次号</p>
                <p className="font-mono text-sm">
                  {detail.batchNo || '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">关联订单</p>
                <p className="font-mono text-sm">
                  {detail.orderNo || '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">创建时间</p>
                <p>
                  {dayjs(detail.createdAt).format('YYYY-MM-DD HH:mm')}
                </p>
              </div>
              {detail.remark ? (
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">备注</p>
                  <p>{detail.remark}</p>
                </div>
              ) : null}
            </div>

            <div className="rounded-lg border border-border bg-[hsl(220_20%_97%)] p-4">
              <p className="mb-3 text-base font-semibold">
                {ledgerLabel}信息
              </p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <div>
                  <p className="text-muted-foreground">单据编号</p>
                  <p className="font-mono font-medium">
                    {detail.relatedNo || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">状态</p>
                  <p>
                    {detail.relatedStatus ? (
                      <LedgerStatusTag status={detail.relatedStatus} />
                    ) : (
                      '-'
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">单据总额</p>
                  <p className="font-medium">
                    {detail.relatedTotalAmount !== null
                      ? formatMoney(detail.relatedTotalAmount)
                      : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">{receivedLabel}</p>
                  <p className="font-medium text-[hsl(152_65%_30%)]">
                    {detail.relatedReceivedAmount !== null
                      ? formatMoney(detail.relatedReceivedAmount)
                      : '-'}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground">{unpaidLabel}</p>
                  <p className="font-medium text-[hsl(4_85%_35%)]">
                    {detail.relatedUnpaidAmount !== null
                      ? formatMoney(detail.relatedUnpaidAmount)
                      : '-'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-10 text-center text-muted-foreground">
            暂无数据
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ReceiptDetailDialog;
