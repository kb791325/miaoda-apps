import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { toast } from 'sonner';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import DateField from '@/components/date-field';
import { fundFlowApi } from '@client/src/api';
import { extractErrorMessage } from '@client/src/pages/Inventory/inventory-utils';
import type {
  CreateFundFlowRequest,
  FundAccount,
  FundFlowCategory,
} from '@shared/finance-contract';
import { FUND_ACCOUNTS } from '@shared/finance-contract';

const MANUAL_CATEGORIES: FundFlowCategory[] = ['其他收入', '其他支出'];

const fundFlowSchema = z.object({
  category: z.string().min(1, '请选择分类'),
  amount: z
    .string()
    .min(1, '请输入金额')
    .refine(
      (value: string): boolean => {
        const num: number = Number(value);
        return Number.isFinite(num) && num > 0;
      },
      { message: '金额必须为大于 0 的数字' },
    ),
  account: z.string().min(1, '请选择账户'),
  flowDate: z.string().min(1, '请选择发生日期'),
  partyName: z.string(),
  remark: z.string(),
});

type FundFlowFormData = z.infer<typeof fundFlowSchema>;

interface FundFlowManualDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

/** 手工录入资金流水：分类仅可选其他收入/其他支出，类型由后端按分类推断 */
const FundFlowManualDialog: React.FC<FundFlowManualDialogProps> = ({
  open,
  onOpenChange,
  onCreated,
}) => {
  const [saving, setSaving] = useState<boolean>(false);

  const form = useForm<FundFlowFormData>({
    resolver: zodResolver(fundFlowSchema),
    defaultValues: {
      category: '',
      amount: '',
      account: '',
      flowDate: dayjs().format('YYYY-MM-DD'),
      partyName: '',
      remark: '',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        category: '',
        amount: '',
        account: '',
        flowDate: dayjs().format('YYYY-MM-DD'),
        partyName: '',
        remark: '',
      });
    }
  }, [open, form]);

  const handleSubmit = form.handleSubmit(async (data: FundFlowFormData) => {
    const category: FundFlowCategory | undefined = MANUAL_CATEGORIES.find(
      (item: FundFlowCategory): boolean => item === data.category,
    );
    const account: FundAccount | undefined = FUND_ACCOUNTS.find(
      (item: FundAccount): boolean => item === data.account,
    );
    if (!category || !account) {
      toast.error('请选择有效的分类与账户');
      return;
    }
    const request: CreateFundFlowRequest = {
      category,
      amount: Number(data.amount),
      account,
      flowDate: data.flowDate,
      partyName: data.partyName.trim() || undefined,
      remark: data.remark.trim() || undefined,
    };
    setSaving(true);
    try {
      await fundFlowApi.createFundFlow(request);
      toast.success('资金流水录入成功');
      onOpenChange(false);
      onCreated();
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
          <DialogTitle>手工录入资金流水</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    分类 <span className="text-destructive">*</span>
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="请选择分类" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {MANUAL_CATEGORIES.map(
                        (item: FundFlowCategory): React.ReactNode => (
                          <SelectItem key={item} value={item}>
                            {item}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    收支类型由分类自动推断
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex flex-wrap gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem className="min-w-[160px] flex-1">
                    <FormLabel>
                      金额（元） <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="请输入金额"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="account"
                render={({ field }) => (
                  <FormItem className="min-w-[160px] flex-1">
                    <FormLabel>
                      账户 <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="请选择账户" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {FUND_ACCOUNTS.map(
                          (item: FundAccount): React.ReactNode => (
                            <SelectItem key={item} value={item}>
                              {item}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="flowDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    发生日期 <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <DateField
                      value={field.value}
                      placeholder="选择发生日期"
                      onSelect={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="partyName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>往来方（可选）</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="请输入往来方名称"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="remark"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>备注（可选）</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="请输入备注信息"
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
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

export default FundFlowManualDialog;
