import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@client/src/components/ui/dialog';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import type { Budget } from '@shared/api.interface';
import * as budgetApi from '@client/src/api/budget';

interface BudgetFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editBudget: Budget | null;
  year: number;
  month: string;
  onSaved: () => void;
}

const BudgetFormDialog = ({
  open,
  onOpenChange,
  editBudget,
  year,
  month,
  onSaved,
}: BudgetFormDialogProps) => {
  const [formDept, setFormDept] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formRemark, setFormRemark] = useState('');
  const [formReason, setFormReason] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editBudget) {
      setFormDept(editBudget.department);
      setFormAmount(String(editBudget.budgetAmount));
      setFormRemark(editBudget.remark ?? '');
      setFormReason('');
    } else {
      setFormDept('');
      setFormAmount('');
      setFormRemark('');
      setFormReason('');
    }
  }, [open, editBudget]);

  const handleSubmit = async () => {
    if (!formDept.trim()) {
      toast.error('请输入部门');
      return;
    }
    const amountNum = Number(formAmount);
    if (Number.isNaN(amountNum) || amountNum < 0) {
      toast.error('请输入有效的预算金额');
      return;
    }

    setFormSubmitting(true);
    try {
      if (editBudget) {
        await budgetApi.updateBudget(editBudget.id, {
          budgetAmount: amountNum,
          remark: formRemark,
          adjustReason: formReason || undefined,
        });
        toast.success('更新成功');
      } else {
        await budgetApi.createBudget({
          year,
          month,
          department: formDept.trim(),
          budgetAmount: amountNum,
          remark: formRemark || undefined,
        });
        toast.success('创建成功');
      }
      onOpenChange(false);
      onSaved();
    } catch (err) {
      logger.error('提交预算失败', err);
      toast.error('提交失败');
    } finally {
      setFormSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-sm sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editBudget ? '编辑预算' : '新增预算'}</DialogTitle>
          <DialogDescription>
            {editBudget
              ? '修改部门预算金额和备注'
              : `为 ${year}年${month}月 添加部门预算`}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              部门
            </label>
            <Input
              value={formDept}
              onChange={(e) => setFormDept(e.target.value)}
              placeholder="请输入部门名称"
              disabled={!!editBudget}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              预算金额
            </label>
            <Input
              type="number"
              value={formAmount}
              onChange={(e) => setFormAmount(e.target.value)}
              placeholder="请输入预算金额"
              className="font-mono text-right"
            />
          </div>
          {editBudget && (
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                调整原因
              </label>
              <Input
                value={formReason}
                onChange={(e) => setFormReason(e.target.value)}
                placeholder="请输入调整原因（可选）"
              />
            </div>
          )}
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              备注
            </label>
            <Input
              value={formRemark}
              onChange={(e) => setFormRemark(e.target.value)}
              placeholder="请输入备注（可选）"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={formSubmitting}
          >
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={formSubmitting}>
            {formSubmitting ? '提交中...' : '确认'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BudgetFormDialog;
