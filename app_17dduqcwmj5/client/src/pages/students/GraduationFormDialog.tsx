import React, { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import dayjs from 'dayjs';
import { useForm } from 'react-hook-form';
import { CalendarIcon } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@client/src/components/ui/button';
import { Calendar } from '@client/src/components/ui/calendar';
import { Checkbox } from '@client/src/components/ui/checkbox';
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@client/src/components/ui/popover';
import { Textarea } from '@client/src/components/ui/textarea';
import type { CreateGraduationRequest } from '@shared/graduation';
import { createGraduation } from './graduation.api';
import {
  fetchCourseOptions,
  isForbiddenError,
  type CourseOption,
} from './student.api';

const graduationFormSchema = z
  .object({
    courseIds: z.array(z.string()).min(1, '请至少选择一门结业课程'),
    trainingStartDate: z.string().min(1, '请选择培训开始日期'),
    trainingEndDate: z.string().min(1, '请选择培训结束日期'),
    totalClassHours: z
      .string()
      .min(1, '请输入总课时')
      .refine((value: string) => {
        const parsed: number = Number(value);
        return !Number.isNaN(parsed) && parsed > 0;
      }, '总课时必须为大于 0 的数字'),
    attendanceHours: z
      .string()
      .min(1, '请输入出勤课时')
      .refine((value: string) => {
        const parsed: number = Number(value);
        return !Number.isNaN(parsed) && parsed >= 0;
      }, '出勤课时必须为不小于 0 的数字'),
    practicalEvaluation: z.string().optional(),
    theoreticalEvaluation: z.string().optional(),
    graduationDate: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const total: number = Number(data.totalClassHours);
    const attended: number = Number(data.attendanceHours);
    if (
      !Number.isNaN(total) &&
      !Number.isNaN(attended) &&
      attended > total
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['attendanceHours'],
        message: '出勤课时不能大于总课时',
      });
    }
    if (data.trainingStartDate && data.trainingEndDate) {
      if (dayjs(data.trainingEndDate).isBefore(dayjs(data.trainingStartDate))) {
        ctx.addIssue({
          code: 'custom',
          path: ['trainingEndDate'],
          message: '培训结束日期不能早于开始日期',
        });
      }
    }
  });

type GraduationFormData = z.infer<typeof graduationFormSchema>;

const buildDefaultValues = (): GraduationFormData => ({
  courseIds: [],
  trainingStartDate: '',
  trainingEndDate: '',
  totalClassHours: '',
  attendanceHours: '',
  practicalEvaluation: '',
  theoreticalEvaluation: '',
  graduationDate: dayjs().format('YYYY-MM-DD'),
});

interface GraduationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  onSaved: () => void;
}

interface ApiErrorShape {
  response?: { status?: number; data?: { message?: string } };
}

const DateFieldPicker: React.FC<{
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}> = ({ value, placeholder, onChange }) => (
  <Popover>
    <PopoverTrigger asChild>
      <FormControl>
        <Button
          variant="outline"
          className="w-full justify-start font-normal"
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value || placeholder}
        </Button>
      </FormControl>
    </PopoverTrigger>
    <PopoverContent className="w-auto p-0" align="start">
      <Calendar
        mode="single"
        selected={value ? dayjs(value).toDate() : undefined}
        onSelect={(date?: Date) =>
          onChange(date ? dayjs(date).format('YYYY-MM-DD') : '')
        }
      />
    </PopoverContent>
  </Popover>
);

export const GraduationFormDialog: React.FC<GraduationFormDialogProps> = ({
  open,
  onOpenChange,
  studentId,
  onSaved,
}) => {
  const [courseOptions, setCourseOptions] = useState<CourseOption[]>([]);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const form = useForm<GraduationFormData>({
    resolver: zodResolver(graduationFormSchema),
    defaultValues: buildDefaultValues(),
  });

  useEffect(() => {
    if (!open) return;
    let cancelled: boolean = false;
    fetchCourseOptions()
      .then((options: CourseOption[]) => {
        if (!cancelled) setCourseOptions(options);
      })
      .catch(() => {
        if (!cancelled) setCourseOptions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const handleSubmit = form.handleSubmit(
    async (data: GraduationFormData) => {
      setSubmitting(true);
      try {
        const request: CreateGraduationRequest = {
          studentId,
          courseIds: data.courseIds,
          trainingStartDate: data.trainingStartDate,
          trainingEndDate: data.trainingEndDate,
          totalClassHours: Number(data.totalClassHours),
          attendanceHours: Number(data.attendanceHours),
          practicalEvaluation: data.practicalEvaluation?.trim() || undefined,
          theoreticalEvaluation:
            data.theoreticalEvaluation?.trim() || undefined,
          graduationDate: data.graduationDate || undefined,
        };
        const result = await createGraduation(request);
        toast.success(`结业登记成功，证书编号 ${result.graduationCertNo}`);
        if (result.syncStatus === 'failed') {
          toast.warning('档案已保存，但同步多维表格失败，可在列表中重试');
        }
        form.reset(buildDefaultValues());
        onOpenChange(false);
        onSaved();
      } catch (error) {
        const apiError: ApiErrorShape = error as ApiErrorShape;
        if (isForbiddenError(error)) {
          toast.error('无权限执行该操作');
        } else if (apiError.response?.status === 409) {
          toast.error(
            apiError.response.data?.message ?? '该学员在此课程下已有结业档案',
          );
        } else {
          toast.error('结业登记失败，请重试');
        }
      } finally {
        setSubmitting(false);
      }
    },
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>结业登记</DialogTitle>
          <DialogDescription>
            填写培训与考核信息，系统将自动生成结业证书编号
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="courseIds"
              render={() => (
                <FormItem>
                  <FormLabel>
                    结业课程 <span className="text-destructive">*</span>
                  </FormLabel>
                  <div className="max-h-40 space-y-2 overflow-y-auto rounded-md border border-border p-3">
                    {courseOptions.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        暂无可选课程
                      </p>
                    ) : (
                      courseOptions.map((option: CourseOption) => {
                        const selected: boolean = form
                          .watch('courseIds')
                          .includes(option.id);
                        return (
                          <label
                            key={option.id}
                            className="flex cursor-pointer items-center gap-2"
                          >
                            <Checkbox
                              checked={selected}
                              onCheckedChange={(checked: boolean) => {
                                const current: string[] =
                                  form.getValues('courseIds');
                                form.setValue(
                                  'courseIds',
                                  checked
                                    ? [...current, option.id]
                                    : current.filter(
                                        (id: string) => id !== option.id,
                                      ),
                                  { shouldValidate: true },
                                );
                              }}
                            />
                            <span className="text-sm">
                              {option.courseName}
                            </span>
                          </label>
                        );
                      })
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex flex-wrap gap-4">
              <FormField
                control={form.control}
                name="trainingStartDate"
                render={({ field }) => (
                  <FormItem className="min-w-40 flex-1">
                    <FormLabel>
                      培训开始日期 <span className="text-destructive">*</span>
                    </FormLabel>
                    <DateFieldPicker
                      value={field.value}
                      placeholder="请选择开始日期"
                      onChange={field.onChange}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="trainingEndDate"
                render={({ field }) => (
                  <FormItem className="min-w-40 flex-1">
                    <FormLabel>
                      培训结束日期 <span className="text-destructive">*</span>
                    </FormLabel>
                    <DateFieldPicker
                      value={field.value}
                      placeholder="请选择结束日期"
                      onChange={field.onChange}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="flex flex-wrap gap-4">
              <FormField
                control={form.control}
                name="totalClassHours"
                render={({ field }) => (
                  <FormItem className="min-w-40 flex-1">
                    <FormLabel>
                      总课时 <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        placeholder="如 120"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="attendanceHours"
                render={({ field }) => (
                  <FormItem className="min-w-40 flex-1">
                    <FormLabel>
                      出勤课时 <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        placeholder="如 110"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="graduationDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>结业日期</FormLabel>
                  <DateFieldPicker
                    value={field.value ?? ''}
                    placeholder="默认今天"
                    onChange={field.onChange}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="practicalEvaluation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>实操评价</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="选填，如实记录实操考核表现"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="theoreticalEvaluation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>理论评价</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="选填，如实记录理论考核表现"
                      rows={3}
                      {...field}
                    />
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
                {submitting ? '提交中...' : '确认登记'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
