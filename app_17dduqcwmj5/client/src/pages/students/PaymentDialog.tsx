import React, { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@client/src/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@client/src/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@client/src/components/ui/form';
import { Input } from '@client/src/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import type { UpdatePaymentResponse } from '@shared/student';
import {
  isForbiddenError,
  PAYMENT_STATUS_OPTIONS,
  updateStudentPayment,
} from './student.api';

const paymentSchema = z.object({
  paymentAmount: z
    .string()
    .trim()
    .min(1, '请输入缴费金额')
    .refine(
      (value: string) => {
        const amount: number = Number(value);
        return !Number.isNaN(amount) && amount >= 0;
      },
      { message: '请输入正确的金额' },
    ),
  paymentStatus: z.string().min(1, '请选择缴费状态'),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  defaultStatus?: string;
  defaultAmount?: number;
  onSaved: () => void;
}

export const PaymentDialog: React.FC<PaymentDialogProps> = ({
  open,
  onOpenChange,
  studentId,
  defaultStatus,
  defaultAmount,
  onSaved,
}) => {
  const [submitting, setSubmitting] = useState<boolean>(false);

  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      paymentAmount:
        defaultAmount !== undefined && defaultAmount > 0
          ? String(defaultAmount)
          : '',
      paymentStatus: defaultStatus ?? '',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        paymentAmount:
          defaultAmount !== undefined && defaultAmount > 0
            ? String(defaultAmount)
            : '',
        paymentStatus: defaultStatus ?? '',
      });
    }
  }, [open, defaultAmount, defaultStatus, form]);

  const handleSubmit = form.handleSubmit(async (data: PaymentFormData) => {
    setSubmitting(true);
    try {
      const result: UpdatePaymentResponse = await updateStudentPayment(
        studentId,
        {
          paymentAmount: Number(data.paymentAmount),
          paymentStatus: data.paymentStatus,
        },
      );
      toast.success('缴费信息已更新');
      if (result.syncStatus === 'failed') {
        toast.warning(
          '学员已保存，但同步多维表格失败，可在列表中重新同步',
        );
      }
      onOpenChange(false);
      onSaved();
    } catch (error) {
      if (isForbiddenError(error)) {
        toast.error('无权限执行该操作');
      } else {
        toast.error('缴费信息更新失败，请重试');
      }
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>录入缴费</DialogTitle>
          <DialogDescription>更新该学员的缴费金额与缴费状态</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="paymentAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    缴费金额（元） <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="请输入缴费金额" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="paymentStatus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    缴费状态 <span className="text-destructive">*</span>
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || undefined}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="请选择缴费状态" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PAYMENT_STATUS_OPTIONS.map((option: string) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                取消
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? '保存中...' : '保存'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
