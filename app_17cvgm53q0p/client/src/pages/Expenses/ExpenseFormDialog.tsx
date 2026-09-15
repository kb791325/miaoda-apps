import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { toast } from 'sonner';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Form } from '@/components/ui/form';
import { expenseApi } from '@client/src/api';
import { getWithRetry } from '@client/src/api/finance';
import { extractErrorMessage } from '@client/src/pages/Inventory/inventory-utils';
import type {
  CreateExpenseRequest,
  ExpenseCategory,
  ExpenseItem,
  FundAccount,
  UpdateExpenseRequest,
} from '@shared/finance-contract';
import { EXPENSE_CATEGORIES, FUND_ACCOUNTS } from '@shared/finance-contract';
import ExpenseAttachmentField from './ExpenseAttachmentField';
import ExpenseFormFields from './ExpenseFormFields';
import {
  expenseSchema,
  type ExpenseFormData,
  type UserOption,
} from './expense-form-schema';

interface ExpenseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  initial: ExpenseItem | null;
  onSaved: () => void;
}

/** 新增/编辑费用单 */
const ExpenseFormDialog: React.FC<ExpenseFormDialogProps> = ({
  open,
  onOpenChange,
  mode,
  initial,
  onSaved,
}) => {
  const [saving, setSaving] = useState<boolean>(false);
  const [userOptions, setUserOptions] = useState<UserOption[]>([]);
  const [attachmentUrl, setAttachmentUrl] = useState<string>('');

  const form = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      category: '',
      amount: '',
      expenseDate: dayjs().format('YYYY-MM-DD'),
      payerId: '',
      account: '',
      remark: '',
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      category: initial?.category ?? '',
      amount: initial ? String(initial.amount) : '',
      expenseDate: initial?.expenseDate ?? dayjs().format('YYYY-MM-DD'),
      payerId: initial?.payerId ?? '',
      account: initial?.account ?? '',
      remark: initial?.remark ?? '',
    });
    setAttachmentUrl(initial?.attachmentUrl ?? '');
  }, [open, initial, form]);

  useEffect(() => {
    if (!open) return;
    let mounted: boolean = true;
    getWithRetry<{ items: UserOption[] }>('/api/auth/user-options')
      .then((res) => {
        if (mounted) {
          setUserOptions(Array.isArray(res.data.items) ? res.data.items : []);
        }
      })
      .catch(() => {
        if (mounted) setUserOptions([]);
      });
    return () => {
      mounted = false;
    };
  }, [open]);

  const handleSubmit = form.handleSubmit(async (data: ExpenseFormData) => {
    const category: ExpenseCategory | undefined = EXPENSE_CATEGORIES.find(
      (item: ExpenseCategory): boolean => item === data.category,
    );
    const account: FundAccount | undefined = FUND_ACCOUNTS.find(
      (item: FundAccount): boolean => item === data.account,
    );
    if (!category || !account) {
      toast.error('请选择有效的分类与支付账户');
      return;
    }
    const payerId: string | undefined = data.payerId || undefined;
    const remark: string | undefined = data.remark.trim() || undefined;
    const url: string | undefined = attachmentUrl || undefined;
    setSaving(true);
    try {
      if (mode === 'edit' && initial) {
        const request: UpdateExpenseRequest = {
          category,
          amount: Number(data.amount),
          expenseDate: data.expenseDate,
          payerId,
          account,
          remark,
          attachmentUrl: url,
        };
        await expenseApi.updateExpense(initial.id, request);
        toast.success('费用已更新');
      } else {
        const request: CreateExpenseRequest = {
          category,
          amount: Number(data.amount),
          expenseDate: data.expenseDate,
          payerId,
          account,
          remark,
          attachmentUrl: url,
        };
        await expenseApi.createExpense(request);
        toast.success('费用创建成功');
      }
      onOpenChange(false);
      onSaved();
    } catch (error: unknown) {
      toast.error(extractErrorMessage(error));
    } finally {
      setSaving(false);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === 'edit' ? '编辑费用' : '新增费用'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <ExpenseFormFields
              control={form.control}
              userOptions={userOptions}
            />
            <ExpenseAttachmentField
              value={attachmentUrl}
              onChange={setAttachmentUrl}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                取消
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? '保存中…' : '保存'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default ExpenseFormDialog;
