import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { expenseApi } from '@client/src/api';
import { extractErrorMessage } from '@client/src/pages/Inventory/inventory-utils';
import { formatMoney } from '@client/src/pages/Finance/finance-utils';
import type { ExpenseItem } from '@shared/finance-contract';

type ApproveDecision = 'approve' | 'reject';

interface ExpenseApproveDialogProps {
  item: ExpenseItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}

/** 费用审批：通过/驳回二选一，驳回必须填写理由 */
const ExpenseApproveDialog: React.FC<ExpenseApproveDialogProps> = ({
  item,
  open,
  onOpenChange,
  onDone,
}) => {
  const [decision, setDecision] = useState<ApproveDecision>('approve');
  const [remark, setRemark] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    if (open) {
      setDecision('approve');
      setRemark('');
    }
  }, [open]);

  const handleSubmit = async (): Promise<void> => {
    if (!item) return;
    if (decision === 'reject' && !remark.trim()) {
      toast.error('驳回时必须填写理由');
      return;
    }
    setSaving(true);
    try {
      await expenseApi.approveExpense(item.id, {
        approve: decision === 'approve',
        remark: remark.trim() || undefined,
      });
      toast.success(decision === 'approve' ? '费用已审批通过' : '费用已驳回');
      onOpenChange(false);
      onDone();
    } catch (error: unknown) {
      toast.error(extractErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>审批费用</DialogTitle>
        </DialogHeader>
        {item ? (
          <div className="flex flex-col gap-4">
            <div className="rounded-md border border-border bg-background p-3 text-base">
              <span className="font-mono">{item.expenseNo}</span>
              <span className="mx-2 text-muted-foreground">|</span>
              {item.category}
              <span className="mx-2 text-muted-foreground">|</span>
              <span className="font-semibold tabular-nums">
                {formatMoney(item.amount)}
              </span>
            </div>
            <RadioGroup
              value={decision}
              onValueChange={(value: string) =>
                setDecision(value === 'reject' ? 'reject' : 'approve')
              }
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="approve" id="expense-approve" />
                <Label htmlFor="expense-approve">通过</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="reject" id="expense-reject" />
                <Label htmlFor="expense-reject">驳回</Label>
              </div>
            </RadioGroup>
            <div className="flex flex-col gap-2">
              <label className="text-base font-semibold">
                审批意见
                {decision === 'reject' ? (
                  <span className="text-destructive"> *（驳回必填）</span>
                ) : (
                  '（可选）'
                )}
              </label>
              <Textarea
                value={remark}
                onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setRemark(event.target.value)
                }
                placeholder={
                  decision === 'reject' ? '请填写驳回理由' : '选填审批意见'
                }
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                取消
              </Button>
              <Button onClick={() => void handleSubmit()} disabled={saving}>
                {saving ? '提交中…' : '确认提交'}
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};

export default ExpenseApproveDialog;
