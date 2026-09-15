import { useEffect, useState } from 'react';
import type { FC } from 'react';
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

interface RejectDialogProps {
  open: boolean;
  title: string;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void;
}

export const RejectDialog: FC<RejectDialogProps> = ({
  open,
  title,
  submitting,
  onClose,
  onSubmit,
}) => {
  const [reason, setReason] = useState<string>('');

  useEffect(() => {
    if (open) setReason('');
  }, [open]);

  const trimmedReason: string = reason.trim();

  return (
    <Dialog open={open} onOpenChange={(next) => !submitting && !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>驳回内容</DialogTitle>
          <DialogDescription className="truncate">
            {title}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <p className="text-sm">
            驳回原因 <span className="text-destructive">*</span>
          </p>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="请填写驳回原因，便于创作者修改"
            rows={4}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            取消
          </Button>
          <Button
            variant="destructive"
            disabled={submitting || trimmedReason.length === 0}
            onClick={() => onSubmit(trimmedReason)}
          >
            {submitting ? '驳回中...' : '确认驳回'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
