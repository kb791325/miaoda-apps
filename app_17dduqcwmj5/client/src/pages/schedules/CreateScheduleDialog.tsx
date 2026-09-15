import React, { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import dayjs from 'dayjs';
import { toast } from 'sonner';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@client/src/components/ui/button';
import { Calendar } from '@client/src/components/ui/calendar';
import { Checkbox } from '@client/src/components/ui/checkbox';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@client/src/components/ui/popover';
import { ScrollArea } from '@client/src/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import { UserSelect } from '@client/src/components/business-ui/user-select';
import type { CourseListItem } from '@shared/course';
import type { StudentListItem } from '@shared/student';
import type {
  CreateScheduleRequest,
  CreateScheduleResponse,
} from '@shared/schedule';
import {
  buildTimeOptions,
  createSchedule,
  fetchStudentOptions,
  getErrorMessage,
} from './schedule.api';

const scheduleFormSchema = z
  .object({
    scheduleName: z.string().min(1, '排期名称不能为空'),
    courseId: z.string().min(1, '请选择课程'),
    lecturer: z.string().min(1, '请选择讲师'),
    classroom: z.string().min(1, '教室不能为空'),
    classDate: z.string().min(1, '请选择上课日期'),
    startTime: z.string().min(1, '请选择开始时间'),
    endTime: z.string().min(1, '请选择结束时间'),
    enrollmentCapacity: z.coerce.number().int('容量必须为整数').min(1, '容量至少为 1'),
    studentIds: z.array(z.string()),
  })
  .refine(
    (data) =>
      data.startTime.length === 0 ||
      data.endTime.length === 0 ||
      data.startTime < data.endTime,
    { message: '结束时间必须晚于开始时间', path: ['endTime'] },
  );

type ScheduleFormData = z.infer<typeof scheduleFormSchema>;

const FORM_DEFAULT_VALUES: ScheduleFormData = {
  scheduleName: '',
  courseId: '',
  lecturer: '',
  classroom: '',
  classDate: '',
  startTime: '',
  endTime: '',
  enrollmentCapacity: 10,
  studentIds: [],
};

const TIME_OPTIONS: string[] = buildTimeOptions();

interface CreateScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courses: CourseListItem[];
  onCreated: () => void;
}

export const CreateScheduleDialog: React.FC<CreateScheduleDialogProps> = ({
  open,
  onOpenChange,
  courses,
  onCreated,
}) => {
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [studentKeyword, setStudentKeyword] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string>('');

  useEffect(() => {
    if (!open) {
      setSubmitError('');
    }
  }, [open]);

  const form = useForm<ScheduleFormData>({
    resolver: zodResolver(scheduleFormSchema),
    defaultValues: FORM_DEFAULT_VALUES,
  });

  useEffect(() => {
    if (!open) {
      return;
    }
    let cancelled: boolean = false;
    fetchStudentOptions()
      .then((items: StudentListItem[]) => {
        if (!cancelled) {
          setStudents(items);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStudents([]);
          toast.error('加载学员列表失败');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const keyword: string = studentKeyword.trim().toLowerCase();
  const filteredStudents: StudentListItem[] =
    keyword.length === 0
      ? students
      : students.filter(
          (student: StudentListItem) =>
            student.studentName.toLowerCase().includes(keyword) ||
            student.contactPhone.toLowerCase().includes(keyword),
        );

  const onSubmit = async (data: ScheduleFormData): Promise<void> => {
    setSubmitting(true);
    try {
      const payload: CreateScheduleRequest = {
        scheduleName: data.scheduleName,
        courseId: data.courseId,
        lecturer: data.lecturer,
        classroom: data.classroom,
        classDate: data.classDate,
        startTime: data.startTime,
        endTime: data.endTime,
        enrollmentCapacity: data.enrollmentCapacity,
        studentIds: data.studentIds,
      };
      const created: CreateScheduleResponse = await createSchedule(payload);
      toast.success('排期创建成功');
      if (created.syncStatus === 'failed') {
        toast.warning('排期已保存，但同步多维表格失败，可在列表中重新同步');
      }
      form.reset(FORM_DEFAULT_VALUES);
      setStudentKeyword('');
      setSubmitError('');
      onOpenChange(false);
      onCreated();
    } catch (error) {
      const message: string = getErrorMessage(error, '新增排期失败');
      setSubmitError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>新增排期</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="scheduleName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    排期名称 <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="请输入排期名称" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex flex-wrap gap-4">
              <FormField
                control={form.control}
                name="courseId"
                render={({ field }) => (
                  <FormItem className="min-w-[200px] flex-1">
                    <FormLabel>
                      课程 <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value === '' ? undefined : field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="请选择课程" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {courses.map((course: CourseListItem) => (
                          <SelectItem key={course.id} value={course.id}>
                            {course.courseName}
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
                name="classroom"
                render={({ field }) => (
                  <FormItem className="min-w-[200px] flex-1">
                    <FormLabel>
                      教室 <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="请输入教室" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex flex-wrap gap-4">
              <FormField
                control={form.control}
                name="lecturer"
                render={({ field }) => (
                  <FormItem className="min-w-[200px] flex-1">
                    <FormLabel>
                      讲师 <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <UserSelect
                        value={field.value === '' ? null : field.value}
                        onChange={(value: string | null) =>
                          field.onChange(value ?? '')
                        }
                        placeholder="请选择讲师"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="enrollmentCapacity"
                render={({ field }) => (
                  <FormItem className="min-w-[200px] flex-1">
                    <FormLabel>
                      招生容量 <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input type="number" min={1} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="classDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    上课日期 <span className="text-destructive">*</span>
                  </FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className="w-full justify-start gap-2 text-left font-normal"
                        >
                          <CalendarIcon className="size-4 text-muted-foreground" />
                          {field.value === '' ? '请选择上课日期' : field.value}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={
                          field.value === ''
                            ? undefined
                            : dayjs(field.value).toDate()
                        }
                        onSelect={(date: Date | undefined) =>
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

            <div className="flex flex-wrap gap-4">
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem className="min-w-[160px] flex-1">
                    <FormLabel>
                      开始时间 <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value === '' ? undefined : field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="请选择开始时间" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TIME_OPTIONS.map((time: string) => (
                          <SelectItem key={time} value={time}>
                            {time}
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
                name="endTime"
                render={({ field }) => (
                  <FormItem className="min-w-[160px] flex-1">
                    <FormLabel>
                      结束时间 <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value === '' ? undefined : field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="请选择结束时间" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TIME_OPTIONS.map((time: string) => (
                          <SelectItem key={time} value={time}>
                            {time}
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
              name="studentIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>报名学员</FormLabel>
                  <FormControl>
                    <div className="rounded-md border border-border">
                      <div className="border-b border-border p-2">
                        <Input
                          placeholder="搜索学员姓名 / 电话"
                          value={studentKeyword}
                          onChange={(
                            event: React.ChangeEvent<HTMLInputElement>,
                          ) => setStudentKeyword(event.target.value)}
                        />
                      </div>
                      <ScrollArea className="h-44">
                        <div className="space-y-1 p-2">
                          {filteredStudents.map((student: StudentListItem) => {
                            const checked: boolean = field.value.includes(
                              student.id,
                            );
                            return (
                              <div
                                key={student.id}
                                className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-muted/50"
                              >
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={(next) => {
                                    const nextValue: string[] =
                                      next === true
                                        ? [...field.value, student.id]
                                        : field.value.filter(
                                            (id: string) => id !== student.id,
                                          );
                                    field.onChange(nextValue);
                                  }}
                                />
                                <span className="text-sm text-foreground">
                                  {student.studentName}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {student.contactPhone}
                                </span>
                              </div>
                            );
                          })}
                          {filteredStudents.length === 0 ? (
                            <p className="px-2 py-4 text-center text-sm text-muted-foreground">
                              暂无可选学员
                            </p>
                          ) : null}
                        </div>
                      </ScrollArea>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {submitError !== '' ? (
              <div className="whitespace-pre-wrap break-words rounded-md border border-[hsl(5_75%_55%/0.3)] bg-[hsl(5_75%_55%/0.08)] px-3 py-2 text-sm text-[hsl(5_75%_40%)]">
                {submitError}
              </div>
            ) : null}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                取消
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? '提交中...' : '创建排期'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
