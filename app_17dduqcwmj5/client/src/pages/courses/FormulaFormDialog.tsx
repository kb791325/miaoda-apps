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
import type { FormulaItem } from '@shared/course';
import { createFormula, updateFormula } from './course.api';
import { extractErrorMessage } from './course-form';

const formulaSchema = z.object({
  ingredientName: z.string().trim().min(1, '食材名称不能为空'),
  quantity: z
    .string()
    .refine(
      (value: string) =>
        value === '' || (!Number.isNaN(Number(value)) && Number(value) >= 0),
      '用量需为非负数字',
    ),
  unit: z.string(),
  ingredientCategory: z.string(),
  remark: z.string(),
});

type FormulaFormData = z.infer<typeof formulaSchema>;

const buildDefaults = (item: FormulaItem | null): FormulaFormData => ({
  ingredientName: item?.ingredientName ?? '',
  quantity: item && item.quantity !== null ? String(item.quantity) : '',
  unit: item?.unit ?? '',
  ingredientCategory: item?.ingredientCategory ?? '',
  remark: item?.remark ?? '',
});

interface FormulaFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  initial: FormulaItem | null;
  onSuccess: () => void;
}

export const FormulaFormDialog: React.FC<FormulaFormDialogProps> = ({
  open,
  onOpenChange,
  courseId,
  initial,
  onSuccess,
}) => {
  const isEdit: boolean = initial !== null;
  const [submitting, setSubmitting] = useState<boolean>(false);

  const form = useForm<FormulaFormData>({
    resolver: zodResolver(formulaSchema),
    defaultValues: buildDefaults(null),
  });

  useEffect(() => {
    if (open) form.reset(buildDefaults(initial));
  }, [open, initial, form]);

  const handleSubmit = form.handleSubmit(async (data: FormulaFormData) => {
    setSubmitting(true);
    try {
      const quantity: number | undefined =
        data.quantity === '' ? undefined : Number(data.quantity);
      if (initial) {
        await updateFormula(initial.id, {
          ingredientName: data.ingredientName,
          quantity,
          unit: data.unit,
          ingredientCategory: data.ingredientCategory,
          remark: data.remark,
        });
        toast.success('配方明细已更新');
      } else {
        await createFormula({
          courseName: courseId,
          ingredientName: data.ingredientName,
          quantity,
          unit: data.unit,
          ingredientCategory: data.ingredientCategory,
          remark: data.remark,
        });
        toast.success('配方明细已新增');
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
          <DialogTitle>{isEdit ? '编辑配方明细' : '新增配方明细'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="ingredientName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    食材名称 <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="请输入食材名称" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>用量</FormLabel>
                    <FormControl>
                      <Input placeholder="如 500" inputMode="decimal" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>单位</FormLabel>
                    <FormControl>
                      <Input placeholder="如 克 / 毫升" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="ingredientCategory"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>食材分类</FormLabel>
                  <FormControl>
                    <Input placeholder="如 主料 / 辅料 / 调料" {...field} />
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
