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
import { Label } from '@client/src/components/ui/label';
import { Textarea } from '@client/src/components/ui/textarea';
import { FileText, Calendar, Package, RotateCcw } from 'lucide-react';
import { formatDate } from '@client/src/utils/format';
import type { AssetReservationItem } from '@shared/api.interface';

interface ReturnDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reservation: AssetReservationItem | null;
  onConfirm: (remark: string) => void;
}

const ReturnDialog: React.FC<ReturnDialogProps> = ({
  open,
  onOpenChange,
  reservation,
  onConfirm,
}) => {
  const [remark, setRemark] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await onConfirm(remark.trim());
    } finally {
      setSubmitting(false);
      setRemark('');
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setRemark('');
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md rounded-sm">
        <DialogHeader>
          <DialogTitle>确认归还</DialogTitle>
          <DialogDescription>
            确认该资产已归还？请核对资产信息，如需备注可填写归还说明。
          </DialogDescription>
        </DialogHeader>

        {reservation && (
          <div className="space-y-4">
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
              </div>
              {reservation.actualBorrowDate && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="size-3.5" />
                  实际借出日期：{formatDate(reservation.actualBorrowDate)}
                </div>
              )}
            </div>

            <div className="rounded-sm border border-green-200 bg-green-50 p-3">
              <div className="flex items-center gap-2 text-xs text-green-700">
                <RotateCcw className="size-4" />
                <span className="font-medium">确认归还操作</span>
              </div>
              <p className="mt-1 text-xs text-green-600">
                确认后该资产将恢复为在库状态，可被其他用户预约
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">归还备注（可选）</Label>
              <Textarea
                placeholder="可选填写归还备注信息，如资产状况等"
                value={remark}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setRemark(e.target.value)
                }
                className="rounded-sm min-h-[80px]"
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            className="rounded-sm border-border"
          >
            取消
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={submitting}
            className="rounded-sm bg-success hover:bg-success/90 text-white"
          >
            {submitting ? '处理中...' : '确认归还'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReturnDialog;