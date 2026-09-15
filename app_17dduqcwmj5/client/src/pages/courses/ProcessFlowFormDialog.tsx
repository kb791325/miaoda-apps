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
import { Textarea } from '@client/src/components/ui/textarea';
import type { ProcessFlowItem } from '@shared/course';
import { createProcessFlow, updateProcessFlow } from './course.api';
import { extractErrorMessage } from './course-form';

const processFlowSchema = z.object({
  stepName: z.string().trim().min(1, '步骤名称不能为空'),
  stepNo: z
    .string()
    .refine(
      (value: string) =>
        value === '' ||
        (!Number.isNaN(Number(value)) &&
          Number(value) >= 0 &&
          Number.isInteger(Number(value))),
      '步骤序号需为非负整数',
    ),
  operationDesc: z.string(),
  keyControlPoint: z.string(),
  estimatedDuration: z.string(),
});

type ProcessFlowFormData = z.infer<typeof processFlowSchema>;

const buildDefaults = (item: ProcessFlowItem | null): ProcessFlowFormData => ({
  stepName: item?.stepName ?? '',
  stepNo: item && item.stepNo !== null ? String(item.stepNo) : '',
  operationDesc: item?.operationDesc ?? '',
  keyControlPoint: item?.keyControlPoint ?? '',
  estimatedDuration: item?.estimatedDuration ?? '',
});

interface ProcessFlowFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  initial: ProcessFlowItem | null;
  onSuccess: () => void;
}

export const ProcessFlowFormDialog: React.FC<ProcessFlowFormDialogProps> = ({
  open,
  onOpenChange,
  courseId,
  initial,
  onSuccess,
}) => {
  const isEdit: boolean = initial !== null;
  const [submitting, setSubmitting] = useState<boolean>(false);

  const form = useForm<ProcessFlowFormData>({
    resolver: zodResolver(processFlowSchema),
    defaultValues: buildDefaults(null),
  });

  useEffect(() => {
    if (open) form.reset(buildDefaults(initial));
  }, [open, initial, form]);

  const handleSubmit = form.handleSubmit(
    async (data: ProcessFlowFormData) => {
      setSubmitting(true);
      try {
        const stepNo: number | undefined =
          data.stepNo === '' ? undefined : Number(data.stepNo);
        if (initial) {
          await updateProcessFlow(initial.id, {
            stepNo,
            stepName: data.stepName,
            operationDesc: data.operationDesc,
            keyControlPoint: data.keyControlPoint,
            estimatedDuration: data.estimatedDuration,
          });
          toast.success('工艺流程已更新');
        } else {
          await createProcessFlow({
            courseName: courseId,
            stepNo,
            stepName: data.stepName,
            operationDesc: data.operationDesc,
            keyControlPoint: data.keyControlPoint,
            estimatedDuration: data.estimatedDuration,
          });
          toast.success('工艺流程已新增');
        }
        onOpenChange(false);
        onSuccess();
      } catch (error) {
        toast.error(extractErrorMessage(error));
      } finally {
        setSubmitting(false);
      }
    },
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? '编辑工艺流程' : '新增工艺流程'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-[100px_1fr]">
              <FormField
                control={form.control}
                name="stepNo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>步骤序号</FormLabel>
                    <FormControl>
                      <Input placeholder="如 1" inputMode="numeric" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="stepName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      步骤名称 <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="请输入步骤名称" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="operationDesc"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>操作说明</FormLabel>
                  <FormControl>
                    <Textarea rows={3} placeholder="请输入操作说明" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="keyControlPoint"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>关键控制点</FormLabel>
                  <FormControl>
                    <Textarea rows={2} placeholder="选填" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="estimatedDuration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>预计时长</FormLabel>
                  <FormControl>
                    <Input placeholder="如 15 分钟" {...field} />
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
