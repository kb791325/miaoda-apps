import { useState } from 'react';
import type { Order } from '@shared/order';
import { Button } from '@client/src/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@client/src/components/ui/dialog';
import { Textarea } from '@client/src/components/ui/textarea';

interface OrderCancelDialogProps {
  order: Order | null;
  onClose: () => void;
  onConfirm: (order: Order, cancelReason: string) => Promise<void>;
}

const OrderCancelDialog: React.FC<OrderCancelDialogProps> = ({
  order,
  onClose,
  onConfirm,
}) => {
  const [reason, setReason] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const handleSubmit = async (): Promise<void> => {
    const trimmed = reason.trim();
    if (!trimmed) {
      setError('请填写取消原因');
      return;
    }
    if (!order) return;
    setSubmitting(true);
    try {
      await onConfirm(order, trimmed);
      setReason('');
      setError('');
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={order !== null}
      onOpenChange={(open: boolean) => {
        if (!open) {
          setReason('');
          setError('');
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>取消订单</DialogTitle>
          <DialogDescription>
            订单「{order?.orderNo}」
            {order && order.status !== '待出库'
              ? '已出库，取消后将自动回补库存'
              : '尚未出库，取消后关联配送单将同步取消'}
            ，请填写取消原因。
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Textarea
            value={reason}
            placeholder="请输入取消原因（必填）"
            rows={3}
            onChange={(e) => {
              setReason(e.target.value);
              if (error) setError('');
            }}
          />
          {error ? (
            <p className="text-sm font-medium text-destructive">{error}</p>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            再想想
          </Button>
          <Button
            variant="destructive"
            onClick={() => void handleSubmit()}
            disabled={submitting}
          >
            {submitting ? '取消中...' : '确认取消订单'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default OrderCancelDialog;
