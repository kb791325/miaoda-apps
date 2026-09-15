import React, { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import dayjs from 'dayjs';
import { useForm } from 'react-hook-form';
import { CalendarIcon } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import { UserSelect } from '@client/src/components/business-ui/user-select';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import type { CreateStudentRequest } from '@shared/student';
import {
  createStudent,
  fetchCourseOptions,
  isForbiddenError,
  PAYMENT_STATUS_OPTIONS,
  SOURCE_CHANNEL_OPTIONS,
  type CourseOption,
} from './student.api';

const createStudentSchema = z
  .object({
    studentName: z.string().trim().min(1, '请输入学员姓名'),
    contactPhone: z
      .string()
      .trim()
      .regex(/^1[3-9]\d{9}$/, '请输入正确的 11 位手机号'),
    wechatId: z.string().trim().optional(),
    sourceChannel: z.string().min(1, '请选择来源渠道'),
    courseIds: z.array(z.string()).min(1, '请至少选择一门报名课程'),
    enrollmentDate: z.string().min(1, '请选择报名日期'),
    paymentStatus: z.string().min(1, '请选择缴费状态'),
    paymentAmount: z.string().optional(),
    managerProfile: z.string().nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.paymentStatus && data.paymentStatus !== '未缴费') {
      const raw: string = (data.paymentAmount ?? '').trim();
      const amount: number = Number(raw);
      if (raw === '' || Number.isNaN(amount) || amount < 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['paymentAmount'],
          message: '请填写正确的缴费金额',
        });
      }
    }
  });

type CreateStudentFormData = z.infer<typeof createStudentSchema>;

const buildDefaultValues = (): CreateStudentFormData => ({
  studentName: '',
  contactPhone: '',
  wechatId: '',
  sourceChannel: '',
  courseIds: [],
  enrollmentDate: dayjs().format('YYYY-MM-DD'),
  paymentStatus: '',
  paymentAmount: '',
  managerProfile: null,
});

interface StudentCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const StudentCreateDialog: React.FC<StudentCreateDialogProps> = ({
  open,
  onOpenChange,
  onSuccess,
}) => {
  const [courseOptions, setCourseOptions] = useState<CourseOption[]>([]);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const form = useForm<CreateStudentFormData>({
    resolver: zodResolver(createStudentSchema),
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

  const handleSubmit = form.handleSubmit(async (data: CreateStudentFormData) => {
    setSubmitting(true);
    try {
      const request: CreateStudentRequest = {
        studentName: data.studentName,
        contactPhone: data.contactPhone,
        wechatId: data.wechatId?.trim() ? data.wechatId.trim() : undefined,
        sourceChannel: data.sourceChannel,
        courseIds: data.courseIds,
        enrollmentDate: data.enrollmentDate,
        paymentStatus: data.paymentStatus,
        paymentAmount:
          data.paymentAmount && data.paymentAmount.trim() !== ''
            ? Number(data.paymentAmount)
            : undefined,
        managerProfile: data.managerProfile ?? undefined,
      };
      const result = await createStudent(request);
      toast.success(
        result.notified
          ? '报名登记成功，已提醒学管师跟进'
          : '报名登记成功',
      );
      if (result.syncStatus === 'failed') {
        toast.warning(
          '学员已保存，但同步多维表格失败，可在列表中重新同步',
        );
      }
      form.reset(buildDefaultValues());
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      if (isForbiddenError(error)) {
        toast.error('无权限执行该操作');
      } else {
        toast.error('报名登记失败，请重试');
      }
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>新增学员报名</DialogTitle>
          <DialogDescription>
            填写学员基本信息并完成报名登记，可指定学管师自动提醒跟进
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-wrap gap-4">
              <FormField
                control={form.control}
                name="studentName"
                render={({ field }) => (
                  <FormItem className="min-w-40 flex-1">
                    <FormLabel>
                      姓名 <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="请输入学员姓名" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="contactPhone"
                render={({ field }) => (
                  <FormItem className="min-w-40 flex-1">
                    <FormLabel>
                      联系电话 <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="请输入手机号" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="flex flex-wrap gap-4">
              <FormField
                control={form.control}
                name="wechatId"
                render={({ field }) => (
                  <FormItem className="min-w-40 flex-1">
                    <FormLabel>微信号</FormLabel>
                    <FormControl>
                      <Input placeholder="选填" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="sourceChannel"
                render={({ field }) => (
                  <FormItem className="min-w-40 flex-1">
                    <FormLabel>
                      来源渠道 <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || undefined}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="请选择来源渠道" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SOURCE_CHANNEL_OPTIONS.map((option: string) => (
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
            </div>
            <FormField
              control={form.control}
              name="enrollmentDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    报名日期 <span className="text-destructive">*</span>
                  </FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button variant="outline" className="w-full justify-start font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value || '请选择报名日期'}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={
                          field.value ? dayjs(field.value).toDate() : undefined
                        }
                        onSelect={(date?: Date) =>
                          field.onChange(
                            date ? dayjs(date).format('YYYY-MM-DD') : '',
                          )
                        }
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="courseIds"
              render={() => (
                <FormItem>
                  <FormLabel>
                    报名课程 <span className="text-destructive">*</span>
                  </FormLabel>
                  <div className="max-h-40 space-y-2 overflow-y-auto rounded-md border border-border p-3">
                    {courseOptions.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        暂无可选课程
                      </p>
                    ) : (
                      courseOptions.map((course: CourseOption) => (
                        <FormField
                          key={course.id}
                          control={form.control}
                          name="courseIds"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center gap-2">
                              <Checkbox
                                checked={field.value.includes(course.id)}
                                onCheckedChange={(
                                  checked: boolean | 'indeterminate',
                                ) => {
                                  const next: string[] = checked
                                    ? [...field.value, course.id]
                                    : field.value.filter(
                                        (id: string) => id !== course.id,
                                      );
                                  field.onChange(next);
                                }}
                              />
                              <FormLabel className="font-normal">
                                {course.courseName}
                              </FormLabel>
                            </FormItem>
                          )}
                        />
                      ))
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex flex-wrap gap-4">
              <FormField
                control={form.control}
                name="paymentStatus"
                render={({ field }) => (
                  <FormItem className="min-w-40 flex-1">
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
              <FormField
                control={form.control}
                name="paymentAmount"
                render={({ field }) => (
                  <FormItem className="min-w-40 flex-1">
                    <FormLabel>缴费金额（元）</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="部分缴费 / 已缴清时必填"
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
              name="managerProfile"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>学管师</FormLabel>
                  <FormControl>
                    <UserSelect
                      value={field.value ?? null}
                      onChange={(value: string | null) =>
                        field.onChange(value)
                      }
                      placeholder="请选择学管师（选填）"
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
                {submitting ? '提交中...' : '确认报名'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
