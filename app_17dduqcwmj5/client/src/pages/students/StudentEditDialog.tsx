import React, { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import dayjs from 'dayjs';
import { useForm } from 'react-hook-form';
import { CalendarIcon } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@client/src/components/ui/button';
import { Calendar } from '@client/src/components/ui/calendar';
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
import { Textarea } from '@client/src/components/ui/textarea';
import type {
  StudentDetail,
  UpdateStudentRequest,
  UpdateStudentResponse,
} from '@shared/student';
import {
  isForbiddenError,
  SOURCE_CHANNEL_OPTIONS,
  STUDY_PROGRESS_OPTIONS,
  updateStudent,
} from './student.api';

const editStudentSchema = z.object({
  studentName: z.string().trim().min(1, '请输入学员姓名'),
  contactPhone: z
    .string()
    .trim()
    .regex(/^1[3-9]\d{9}$/, '请输入正确的 11 位手机号'),
  wechatId: z.string().trim().optional(),
  sourceChannel: z.string().min(1, '请选择来源渠道'),
  enrollmentDate: z.string().min(1, '请选择报名日期'),
  studyProgress: z.string().optional(),
  graduationDate: z.string().optional(),
  remark: z.string().optional(),
});

type EditStudentFormData = z.infer<typeof editStudentSchema>;

const buildDefaultValues = (): EditStudentFormData => ({
  studentName: '',
  contactPhone: '',
  wechatId: '',
  sourceChannel: '',
  enrollmentDate: '',
  studyProgress: '',
  graduationDate: '',
  remark: '',
});

const buildValuesFromStudent = (
  student: StudentDetail,
): EditStudentFormData => ({
  studentName: student.studentName ?? '',
  contactPhone: student.contactPhone ?? '',
  wechatId: student.wechatId ?? '',
  sourceChannel: student.sourceChannel ?? '',
  enrollmentDate: student.enrollmentDate ?? '',
  studyProgress: student.studyProgress ?? '',
  graduationDate: student.graduationDate ?? '',
  remark: student.remark ?? '',
});

interface StudentEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: StudentDetail | null;
  onSaved: () => void;
}

export const StudentEditDialog: React.FC<StudentEditDialogProps> = ({
  open,
  onOpenChange,
  student,
  onSaved,
}) => {
  const [submitting, setSubmitting] = useState<boolean>(false);

  const form = useForm<EditStudentFormData>({
    resolver: zodResolver(editStudentSchema),
    defaultValues: buildDefaultValues(),
  });

  useEffect(() => {
    if (!open) return;
    form.reset(student ? buildValuesFromStudent(student) : buildDefaultValues());
  }, [open, student, form]);

  const handleSubmit = form.handleSubmit(async (data: EditStudentFormData) => {
    if (!student) return;
    setSubmitting(true);
    try {
      const request: UpdateStudentRequest = {
        studentName: data.studentName,
        contactPhone: data.contactPhone,
        wechatId: data.wechatId?.trim() ? data.wechatId.trim() : undefined,
        sourceChannel: data.sourceChannel,
        enrollmentDate: data.enrollmentDate,
        studyProgress: data.studyProgress?.trim()
          ? data.studyProgress
          : undefined,
        graduationDate: data.graduationDate?.trim()
          ? data.graduationDate
          : undefined,
        remark: data.remark?.trim() ? data.remark : undefined,
      };
      const result: UpdateStudentResponse = await updateStudent(
        student.id,
        request,
      );
      toast.success('学员信息已更新');
      if (result.syncStatus === 'failed') {
        toast.warning(
          '学员已保存，但同步多维表格失败，可在列表中重新同步',
        );
      }
      onOpenChange(false);
      onSaved();
    } catch (error) {
      if (isForbiddenError(error)) {
        toast.error('无权限执行该操作');
      } else {
        toast.error('学员信息更新失败，请重试');
      }
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>编辑学员信息</DialogTitle>
          <DialogDescription>
            修改学员基本信息并保存，缴费信息请在缴费信息区录入
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
            <div className="flex flex-wrap gap-4">
              <FormField
                control={form.control}
                name="enrollmentDate"
                render={({ field }) => (
                  <FormItem className="min-w-40 flex-1">
                    <FormLabel>
                      报名日期 <span className="text-destructive">*</span>
                    </FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className="w-full justify-start font-normal"
                          >
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
                name="studyProgress"
                render={({ field }) => (
                  <FormItem className="min-w-40 flex-1">
                    <FormLabel>学习进度</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || undefined}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="请选择学习进度" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {STUDY_PROGRESS_OPTIONS.map((option: string) => (
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
              name="graduationDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>结业日期</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className="w-full justify-start font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value || '请选择结业日期'}
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
              name="remark"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>备注</FormLabel>
                  <FormControl>
                    <Textarea placeholder="选填" rows={3} {...field} />
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
              <Button data-ai-section-type="button" type="submit" disabled={submitting}>
                {submitting ? '保存中...' : '保存'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
