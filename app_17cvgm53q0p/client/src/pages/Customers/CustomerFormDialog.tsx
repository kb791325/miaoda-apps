import { useEffect, type FC } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { UserSelect } from '@/components/business-ui/user-select';
import DateField from '@/components/date-field';
import {
  CUSTOMER_GRADES,
  CUSTOMER_SOURCES,
  SALES_STAGES,
  type Customer,
  type CustomerFormRequest,
} from '@shared/customer';
import { createCustomer, updateCustomer } from '@/api/customer';
import { extractErrorMessage, formatDate } from './customer-utils';

const customerFormSchema = z.object({
  customerName: z.string().min(1, '客户姓名不能为空'),
  phone: z.string().regex(/^1\d{10}$/, '请输入正确的 11 位手机号'),
  address: z.string(),
  grade: z.string(),
  source: z.string(),
  salesStage: z.string(),
  ownerId: z.string().nullable(),
  firstContactAt: z.string(),
  expectedDealAt: z.string(),
  nextFollowUpAt: z.string(),
});

type CustomerFormData = z.infer<typeof customerFormSchema>;

const DEFAULT_VALUES: CustomerFormData = {
  customerName: '',
  phone: '',
  address: '',
  grade: 'B类普通',
  source: '其他',
  salesStage: '线索',
  ownerId: null,
  firstContactAt: '',
  expectedDealAt: '',
  nextFollowUpAt: '',
};

interface CustomerFormDialogProps {
  open: boolean;
  /** 编辑的客户；null 表示新建 */
  customer: Customer | null;
  onClose: () => void;
  onSuccess: () => void;
}

const CustomerFormDialog: FC<CustomerFormDialogProps> = ({
  open,
  customer,
  onClose,
  onSuccess,
}) => {
  const isEdit = customer !== null;
  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: DEFAULT_VALUES,
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      customerName: customer?.customerName ?? '',
      phone: customer?.phone ?? '',
      address: customer?.address ?? '',
      grade: customer?.crm.grade || 'B类普通',
      source: customer?.crm.source || '其他',
      salesStage: customer?.crm.salesStage || '线索',
      ownerId: customer?.crm.ownerId || null,
      firstContactAt: customer?.crm.firstContactAt
        ? formatDate(customer.crm.firstContactAt)
        : '',
      expectedDealAt: customer?.crm.expectedDealAt
        ? formatDate(customer.crm.expectedDealAt)
        : '',
      nextFollowUpAt: customer?.crm.nextFollowUpAt
        ? formatDate(customer.crm.nextFollowUpAt)
        : '',
    });
  }, [open, customer, form]);

  const submitting = form.formState.isSubmitting;

  const handleSubmit = form.handleSubmit(async (data) => {
    const payload: CustomerFormRequest = {
      customerName: data.customerName,
      phone: data.phone,
      address: data.address,
      grade: data.grade,
      source: data.source,
      salesStage: data.salesStage,
      ownerId: data.ownerId,
      firstContactAt: data.firstContactAt,
      expectedDealAt: data.expectedDealAt,
      nextFollowUpAt: data.nextFollowUpAt,
    };
    try {
      if (isEdit && customer) {
        await updateCustomer(customer.id, payload);
        toast.success('客户档案已更新');
      } else {
        await createCustomer(payload);
        toast.success('客户创建成功');
      }
      onClose();
      onSuccess();
    } catch (error: unknown) {
      toast.error(extractErrorMessage(error));
    }
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next: boolean) => {
        if (!next) onClose();
      }}
    >
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? '编辑客户档案' : '新建客户'}</DialogTitle>
          <DialogDescription>
            维护客户基本信息与销售跟进档案
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={handleSubmit}
            className="max-h-[65vh] space-y-5 overflow-y-auto pr-1"
          >
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="customerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      姓名 <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="请输入客户姓名" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      手机号 <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="11 位手机号" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>收货地址</FormLabel>
                  <FormControl>
                    <Input placeholder="选填" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="grade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>客户等级</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="请选择" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CUSTOMER_GRADES.map((grade: string) => (
                          <SelectItem key={grade} value={grade}>
                            {grade}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="source"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>客户来源</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="请选择" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CUSTOMER_SOURCES.map((source: string) => (
                          <SelectItem key={source} value={source}>
                            {source}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="salesStage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>销售阶段</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="请选择" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SALES_STAGES.map((stage: string) => (
                          <SelectItem key={stage} value={stage}>
                            {stage}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="ownerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>负责销售</FormLabel>
                    <FormControl>
                      <UserSelect
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="请选择负责销售"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="firstContactAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>首次接触时间</FormLabel>
                    <FormControl>
                      <DateField
                        value={field.value}
                        placeholder="选择日期"
                        onSelect={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="expectedDealAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>预计成交时间</FormLabel>
                    <FormControl>
                      <DateField
                        value={field.value}
                        placeholder="选择日期"
                        onSelect={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="nextFollowUpAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>下次跟进时间</FormLabel>
                    <FormControl>
                      <DateField
                        value={field.value}
                        placeholder="选择日期"
                        onSelect={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                disabled={submitting}
                onClick={onClose}
              >
                取消
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? '保存中...' : isEdit ? '保存修改' : '创建客户'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default CustomerFormDialog;
