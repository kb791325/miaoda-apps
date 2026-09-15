import { useState, type FormEvent } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ApprovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'approve' | 'reject';
  title?: string;
  description?: string;
  loading?: boolean;
  onSubmit: (comment: string) => Promise<void> | void;
}

export default function ApprovalDialog({
  open, onOpenChange, type, title, description, loading, onSubmit,
}: ApprovalDialogProps) {
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (type === 'reject' && !comment.trim()) {
      setError('请填写驳回原因');
      return;
    }
    setError('');
    await onSubmit(comment);
    setComment('');
  };

  const handleOpenChange = (o: boolean) => {
    if (!loading) {
      if (!o) {
        setComment('');
        setError('');
      }
      onOpenChange(o);
    }
  };

  const isApprove = type === 'approve';

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isApprove ? (
              <CheckCircle2 className="size-5 text-emerald-500" />
            ) : (
              <XCircle className="size-5 text-red-500" />
            )}
            {title || (isApprove ? '审批通过' : '审批驳回')}
          </DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="approval-comment">
              审批意见
              {type === 'reject' && <span className="text-red-500"> *</span>}
            </Label>
            <Textarea
              id="approval-comment"
              value={comment}
              onChange={(e) => {
                setComment(e.target.value);
                if (error) setError('');
              }}
              placeholder={isApprove ? '请输入审批意见（选填）' : '请输入驳回原因（必填）'}
              rows={4}
              className={cn(error && 'border-red-500 focus-visible:ring-red-500')}
            />
            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => handleOpenChange(false)} disabled={loading}>
              取消
            </Button>
            <Button
              type="submit"
              variant={isApprove ? 'default' : 'destructive'}
              disabled={loading}
            >
              {loading ? '提交中...' : (isApprove ? '确认通过' : '确认驳回')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
