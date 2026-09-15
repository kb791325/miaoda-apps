import type { Control } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import DateField from '@/components/date-field';
import type { ExpenseCategory, FundAccount } from '@shared/finance-contract';
import { EXPENSE_CATEGORIES, FUND_ACCOUNTS } from '@shared/finance-contract';
import type { ExpenseFormData, UserOption } from './expense-form-schema';

interface ExpenseFormFieldsProps {
  control: Control<ExpenseFormData>;
  userOptions: UserOption[];
}

/** 费用表单字段：分类/金额/日期/账户/报销人/备注 */
const ExpenseFormFields: React.FC<ExpenseFormFieldsProps> = ({
  control,
  userOptions,
}) => (
  <>
    <div className="flex flex-wrap gap-4">
      <FormField
        control={control}
        name="category"
        render={({ field }) => (
          <FormItem className="min-w-[160px] flex-1">
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
                {EXPENSE_CATEGORIES.map(
                  (item: ExpenseCategory): React.ReactNode => (
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
      <FormField
        control={control}
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
    </div>
    <div className="flex flex-wrap gap-4">
      <FormField
        control={control}
        name="expenseDate"
        render={({ field }) => (
          <FormItem className="min-w-[160px] flex-1">
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
        control={control}
        name="account"
        render={({ field }) => (
          <FormItem className="min-w-[160px] flex-1">
            <FormLabel>
              支付账户 <span className="text-destructive">*</span>
            </FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="请选择账户" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {FUND_ACCOUNTS.map((item: FundAccount): React.ReactNode => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
    <FormField
      control={control}
      name="payerId"
      render={({ field }) => (
        <FormItem>
          <FormLabel>报销人（可选）</FormLabel>
          <Select
            onValueChange={field.onChange}
            value={field.value || undefined}
          >
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder="请选择报销人" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {userOptions.map((item: UserOption): React.ReactNode => (
                <SelectItem key={item.userId} value={item.userId}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
    <FormField
      control={control}
      name="remark"
      render={({ field }) => (
        <FormItem>
          <FormLabel>备注（可选）</FormLabel>
          <FormControl>
            <Textarea placeholder="请输入备注信息" rows={2} {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  </>
);

export default ExpenseFormFields;
