import { z } from 'zod';

/** 报销人下拉选项（数据源 /api/auth/user-options） */
export interface UserOption {
  userId: string;
  name: string;
}

/** 费用表单校验：金额正数、必填项非空 */
export const expenseSchema = z.object({
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
  expenseDate: z.string().min(1, '请选择发生日期'),
  payerId: z.string(),
  account: z.string().min(1, '请选择支付账户'),
  remark: z.string(),
});

export type ExpenseFormData = z.infer<typeof expenseSchema>;
