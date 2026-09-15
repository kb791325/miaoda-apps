import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@client/src/components/ui/dialog';
import { Button } from '@client/src/components/ui/button';
import { FileText, Calendar, Package, ArrowRightLeft } from 'lucide-react';
import { formatDate } from '@client/src/utils/format';
import type { AssetReservationItem } from '@shared/api.interface';

interface BorrowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reservation: AssetReservationItem | null;
  onConfirm: () => void;
}

const BorrowDialog: React.FC<BorrowDialogProps> = ({
  open,
  onOpenChange,
  reservation,
  onConfirm,
}) => {
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await onConfirm();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-sm">
        <DialogHeader>
          <DialogTitle>确认借出</DialogTitle>
          <DialogDescription>
            确认将以下资产借出给申请人？请核对资产信息与预计归还日期。
          </DialogDescription>
        </DialogHeader>

        {reservation && (
          <div className="space-y-3">
            <div className="rounded-sm border border-border bg-muted/30 p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <FileText className="size-4 text-muted-foreground" />
                <span className="font-mono text-xs tabular-nums">
                  {reservation.reservationNo}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Package className="size-4 text-muted-foreground" />
                <span className="font-medium">{reservation.assetName}</span>
                <span className="text-xs text-muted-foreground">
                  {reservation.assetCode}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                用途：{reservation.purpose}
              </p>
            </div>

            <div className="rounded-sm border border-blue-200 bg-blue-50 p-3">
              <div className="flex items-center gap-2 text-xs text-blue-700">
                <ArrowRightLeft className="size-4" />
                <span className="font-medium">预计归还日期</span>
              </div>
              <p className="mt-1 text-sm font-semibold text-blue-800">
                {formatDate(reservation.expectedReturnDate)}
              </p>
              <p className="mt-0.5 text-xs text-blue-600">
                请确保在此日期前归还资产
              </p>
            </div>

            <div className="flex gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="size-3.5" />
                借出：{formatDate(reservation.expectedBorrowDate)}
              </span>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-sm border-border"
          >
            取消
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={submitting}
            className="rounded-sm bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {submitting ? '处理中...' : '确认借出'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BorrowDialog;