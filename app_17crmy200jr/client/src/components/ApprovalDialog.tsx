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
import { FileText, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@client/src/lib/utils';
import { formatDate } from '@client/src/utils/format';
import type { AssetReservationItem } from '@shared/api.interface';

interface ApprovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'approve' | 'reject';
  reservation: AssetReservationItem | null;
  onConfirm: (mode: 'approve' | 'reject', remark: string) => void;
}

const ApprovalDialog: React.FC<ApprovalDialogProps> = ({
  open,
  onOpenChange,
  mode,
  reservation,
  onConfirm,
}) => {
  const [remark, setRemark] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [currentMode, setCurrentMode] = useState<'approve' | 'reject'>(mode);

  const isReject = currentMode === 'reject';
  const title = '审批预约';
  const description = isReject
    ? '请填写拒绝原因（必填）'
    : '确认批准该预约申请？';

  const handleConfirm = async () => {
    if (isReject && !remark.trim()) return;
    setSubmitting(true);
    try {
      await onConfirm(currentMode, remark.trim());
    } finally {
      setSubmitting(false);
      setRemark('');
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setRemark('');
      setCurrentMode(mode);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md rounded-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {reservation && (
          <div className="space-y-4">
            {/* 审批模式切换 */}
            <div className="flex rounded-sm border border-border overflow-hidden">
              <button
                type="button"
                onClick={() => setCurrentMode('approve')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors duration-150',
                  !isReject
                    ? 'bg-green-600 text-white'
                    : 'bg-transparent text-muted-foreground hover:bg-accent',
                )}
              >
                <CheckCircle2 className="size-3.5" />
                批准
              </button>
              <button
                type="button"
                onClick={() => setCurrentMode('reject')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors duration-150',
                  isReject
                    ? 'bg-red-600 text-white'
                    : 'bg-transparent text-muted-foreground hover:bg-accent',
                )}
              >
                <XCircle className="size-3.5" />
                拒绝
              </button>
            </div>

            <div className="rounded-sm border border-border bg-muted/30 p-3 space-y-1.5">
              <div className="flex items-center gap-2 text-sm">
                <FileText className="size-4 text-muted-foreground" />
                <span className="font-mono text-xs tabular-nums">
                  {reservation.reservationNo}
                </span>
              </div>
              <p className="text-sm font-medium">{reservation.assetName}</p>
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span>借出：{formatDate(reservation.expectedBorrowDate)}</span>
                <span>归还：{formatDate(reservation.expectedReturnDate)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">
                {isReject ? (
                  <>
                    拒绝原因 <span className="text-destructive">*</span>
                  </>
                ) : (
                  '审批备注（可选）'
                )}
              </Label>
              <Textarea
                placeholder={
                  isReject ? '请填写拒绝原因' : '可选填写审批备注'
                }
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
            disabled={isReject && !remark.trim()}
            className={cn(
              'rounded-sm text-white',
              isReject
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-green-600 hover:bg-green-700',
            )}
          >
            {submitting
              ? '处理中...'
              : isReject
                ? '确认拒绝'
                : '确认批准'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ApprovalDialog;