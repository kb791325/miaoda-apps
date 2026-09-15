import React, { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { z } from 'zod';
import { Button } from '@client/src/components/ui/button';
import {
  Dialog,
  DialogContent,
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
import type { EquipmentItem } from '@shared/course';
import { createEquipment, updateEquipment } from './course.api';
import { extractErrorMessage } from './course-form';

const equipmentSchema = z.object({
  equipmentToolName: z.string().trim().min(1, '器材工具名称不能为空'),
  specification: z.string(),
  quantity: z
    .string()
    .refine(
      (value: string) =>
        value === '' ||
        (!Number.isNaN(Number(value)) &&
          Number(value) >= 0 &&
          Number.isInteger(Number(value))),
      '数量需为非负整数',
    ),
  remark: z.string(),
});

type EquipmentFormData = z.infer<typeof equipmentSchema>;

const buildDefaults = (item: EquipmentItem | null): EquipmentFormData => ({
  equipmentToolName: item?.equipmentToolName ?? '',
  specification: item?.specification ?? '',
  quantity: item && item.quantity !== null ? String(item.quantity) : '',
  remark: item?.remark ?? '',
});

interface EquipmentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  initial: EquipmentItem | null;
  onSuccess: () => void;
}

export const EquipmentFormDialog: React.FC<EquipmentFormDialogProps> = ({
  open,
  onOpenChange,
  courseId,
  initial,
  onSuccess,
}) => {
  const isEdit: boolean = initial !== null;
  const [submitting, setSubmitting] = useState<boolean>(false);

  const form = useForm<EquipmentFormData>({
    resolver: zodResolver(equipmentSchema),
    defaultValues: buildDefaults(null),
  });

  useEffect(() => {
    if (open) form.reset(buildDefaults(initial));
  }, [open, initial, form]);

  const handleSubmit = form.handleSubmit(async (data: EquipmentFormData) => {
    setSubmitting(true);
    try {
      const quantity: number | undefined =
        data.quantity === '' ? undefined : Number(data.quantity);
      if (initial) {
        await updateEquipment(initial.id, {
          equipmentToolName: data.equipmentToolName,
          specification: data.specification,
          quantity,
          remark: data.remark,
        });
        toast.success('设备工具已更新');
      } else {
        await createEquipment({
          courseName: courseId,
          equipmentToolName: data.equipmentToolName,
          specification: data.specification,
          quantity,
          remark: data.remark,
        });
        toast.success('设备工具已新增');
      }
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      toast.error(extractErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? '编辑设备工具' : '新增设备工具'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="equipmentToolName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    器材名称 <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="请输入器材工具名称" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="specification"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>规格</FormLabel>
                    <FormControl>
                      <Input placeholder="如 30cm" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>数量</FormLabel>
                    <FormControl>
                      <Input placeholder="如 10" inputMode="numeric" {...field} />
                    </FormControl>
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
                  <FormLabel>备注</FormLabel>
                  <FormControl>
                    <Input placeholder="选填" {...field} />
                  </FormControl>
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
                {submitting && <Loader2 className="size-4 animate-spin" />}
                {isEdit ? '保存' : '新增'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
