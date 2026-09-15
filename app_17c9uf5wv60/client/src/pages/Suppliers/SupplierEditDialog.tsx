import { useEffect } from 'react';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import { Textarea } from '@client/src/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
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
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Supplier } from '@shared/api.interface';
import {
  SUPPLIER_FORM_STATUS_OPTIONS,
  supplierFormSchema,
  type SupplierFormValues,
} from './supplier-utils';

export interface SupplierEditDialogProps {
  open: boolean;
  supplier: Supplier | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: SupplierFormValues) => Promise<void>;
}

export default function SupplierEditDialog({
  open,
  supplier,
  onOpenChange,
  onSubmit,
}: SupplierEditDialogProps) {
  const form = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierFormSchema),
    defaultValues: {
      code: '',
      name: '',
      contactPerson: '',
      phone: '',
      email: '',
      address: '',
      mainCategory: '',
      status: 'active',
      remark: '',
    },
  });

  useEffect(() => {
    if (open) {
      if (supplier) {
        form.reset({
          code: supplier.code,
          name: supplier.name,
          contactPerson: supplier.contactPerson ?? '',
          phone: supplier.phone ?? '',
          email: supplier.email ?? '',
          address: supplier.address ?? '',
          mainCategory: supplier.mainCategory ?? '',
          status: supplier.status,
          remark: supplier.remark ?? '',
        });
      } else {
        form.reset({
          code: '',
          name: '',
          contactPerson: '',
          phone: '',
          email: '',
          address: '',
          mainCategory: '',
          status: 'active',
          remark: '',
        });
      }
    }
  }, [open, supplier, form]);

  const handleSubmit = async (values: SupplierFormValues) => {
    await onSubmit(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-sm max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{supplier ? '编辑供应商' : '新增供应商'}</DialogTitle>
          <DialogDescription>
            {supplier ? '修改供应商信息' : '填写供应商基本信息'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="flex-1 overflow-y-auto pr-1"
          >
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">
                        供应商编号 <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="请输入供应商编号"
                          className="rounded-sm"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">
                        供应商名称 <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="请输入供应商名称"
                          className="rounded-sm"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="contactPerson"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">联系人</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="请输入联系人姓名"
                          className="rounded-sm"
                          value={field.value ?? ''}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                        />
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
                      <FormLabel className="text-sm">电话</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="请输入联系电话"
                          className="rounded-sm"
                          value={field.value ?? ''}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">邮箱</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="请输入邮箱地址"
                          className="rounded-sm"
                          value={field.value ?? ''}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="mainCategory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">主营品类</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="请输入主营品类"
                          className="rounded-sm"
                          value={field.value ?? ''}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                        />
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
                    <FormLabel className="text-sm">地址</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="请输入详细地址"
                        className="rounded-sm"
                        value={field.value ?? ''}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">状态</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="rounded-sm">
                            <SelectValue placeholder="请选择状态" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="rounded-sm">
                          {SUPPLIER_FORM_STATUS_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
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
                control={form.control}
                name="remark"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">备注</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="请输入备注信息"
                        className="rounded-sm min-h-[80px] resize-none"
                        value={field.value ?? ''}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="rounded-sm"
              >
                取消
              </Button>
              <Button
                type="submit"
                disabled={form.formState.isSubmitting}
                className="rounded-sm"
              >
                {form.formState.isSubmitting
                  ? '保存中...'
                  : supplier
                    ? '保存修改'
                    : '创建供应商'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
