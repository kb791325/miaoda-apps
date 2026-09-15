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
import { Textarea } from '@client/src/components/ui/textarea';
import type { CourseListItem } from '@shared/course';
import type {
  CreateLeadRequest,
  LeadCourseRef,
  LeadDetail,
  UpdateLeadRequest,
} from '@shared/lead';
import { fetchCourseList } from '../courses/course.api';
import {
  CLUE_STATUS_OPTIONS,
  createLead,
  INTENTION_DEGREE_OPTIONS,
  isForbiddenError,
  SOURCE_CHANNEL_OPTIONS,
  updateLead,
} from './leads.api';

const leadFormSchema = z.object({
  clueName: z.string().trim().min(1, '请输入线索姓名'),
  phoneNumber: z
    .string()
    .trim()
    .regex(/^1[3-9]\d{9}$/, '请输入正确的 11 位手机号'),
  sourceChannel: z.string().min(1, '请选择来源渠道'),
  intentionDegree: z.string().optional(),
  intendedCourseIds: z.array(z.string()),
  personInCharge: z.string().nullable().optional(),
  firstConsultTime: z.string().optional(),
  nextFollowTime: z.string().optional(),
  remark: z.string().optional(),
  clueStatus: z.string().optional(),
});

type LeadFormData = z.infer<typeof leadFormSchema>;

const buildDefaultValues = (): LeadFormData => ({
  clueName: '',
  phoneNumber: '',
  sourceChannel: '',
  intentionDegree: '',
  intendedCourseIds: [],
  personInCharge: null,
  firstConsultTime: '',
  nextFollowTime: '',
  remark: '',
  clueStatus: '',
});

const toDayValue = (iso: string | null): string =>
  iso ? dayjs(iso).format('YYYY-MM-DD') : '';

const toShanghaiIso = (day: string): string | undefined =>
  day ? `${day}T10:00:00+08:00` : undefined;

export interface LeadEditingSource {
  lead: LeadDetail;
  courses: LeadCourseRef[];
}

interface LeadFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editing: LeadEditingSource | null;
}

export const LeadFormDialog: React.FC<LeadFormDialogProps> = ({
  open,
  onOpenChange,
  onSuccess,
  editing,
}) => {
  const [courseOptions, setCourseOptions] = useState<CourseListItem[]>([]);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const form = useForm<LeadFormData>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: buildDefaultValues(),
  });

  useEffect(() => {
    if (!open) return;
    if (editing) {
      form.reset({
        clueName: editing.lead.clueName,
        phoneNumber: editing.lead.phoneNumber,
        sourceChannel: editing.lead.sourceChannel ?? '',
        intentionDegree: editing.lead.intentionDegree ?? '',
        intendedCourseIds: editing.courses.map(
          (course: LeadCourseRef) => course.id,
        ),
        personInCharge: editing.lead.personInCharge,
        firstConsultTime: toDayValue(editing.lead.firstConsultTime),
        nextFollowTime: toDayValue(editing.lead.nextFollowTime),
        remark: editing.lead.remark ?? '',
        clueStatus: editing.lead.clueStatus ?? '',
      });
    } else {
      form.reset(buildDefaultValues());
    }
  }, [open, editing, form]);

  useEffect(() => {
    if (!open) return;
    let cancelled: boolean = false;
    fetchCourseList({ pageSize: 100 })
      .then((result) => {
        if (!cancelled) setCourseOptions(result.items);
      })
      .catch(() => {
        if (!cancelled) setCourseOptions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const handleSubmit = form.handleSubmit(async (data: LeadFormData) => {
    setSubmitting(true);
    try {
      if (editing) {
        const request: UpdateLeadRequest = {
          clueName: data.clueName,
          phoneNumber: data.phoneNumber,
          sourceChannel: data.sourceChannel,
          intentionDegree: data.intentionDegree || null,
          intendedCourseIds: data.intendedCourseIds,
          personInCharge: data.personInCharge ?? null,
          firstConsultTime: toShanghaiIso(data.firstConsultTime ?? '') ?? null,
          nextFollowTime: toShanghaiIso(data.nextFollowTime ?? '') ?? null,
          remark: data.remark?.trim() ?? null,
        };
        if (data.clueStatus) {
          request.clueStatus = data.clueStatus;
        }
        const result = await updateLead(editing.lead.id, request);
        toast.success('线索已更新');
        if (result.syncStatus === 'failed') {
          toast.warning('线索已保存，但同步多维表格失败，可在列表中重新同步');
        }
      } else {
        const request: CreateLeadRequest = {
          clueName: data.clueName,
          phoneNumber: data.phoneNumber,
          sourceChannel: data.sourceChannel,
          intendedCourseIds: data.intendedCourseIds,
          intentionDegree: data.intentionDegree || undefined,
          personInCharge: data.personInCharge ?? undefined,
          firstConsultTime: toShanghaiIso(data.firstConsultTime ?? ''),
          nextFollowTime: toShanghaiIso(data.nextFollowTime ?? ''),
          remark: data.remark?.trim() || undefined,
        };
        const result = await createLead(request);
        toast.success('线索创建成功');
        if (result.syncStatus === 'failed') {
          toast.warning('线索已保存，但同步多维表格失败，可在列表中重新同步');
        }
      }
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      if (isForbiddenError(error)) {
        toast.error('无权限执行该操作');
      } else {
        toast.error(editing ? '线索更新失败，请重试' : '线索创建失败，请重试');
      }
    } finally {
      setSubmitting(false);
    }
  });

  const toggleCourse = (courseId: string, checked: boolean): void => {
    const current: string[] = form.getValues('intendedCourseIds');
    const next: string[] = checked
      ? [...current, courseId]
      : current.filter((id: string) => id !== courseId);
    form.setValue('intendedCourseIds', next);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? '编辑线索' : '新增线索'}</DialogTitle>
          <DialogDescription>
            {editing
              ? '更新招生线索信息，保存后自动回写多维表格'
              : '录入招生线索基本信息，创建后自动回写多维表格'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-wrap gap-4">
              <FormField
                control={form.control}
                name="clueName"
                render={({ field }) => (
                  <FormItem className="min-w-40 flex-1">
                    <FormLabel>
                      姓名 <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="请输入线索姓名" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phoneNumber"
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
              <FormField
                control={form.control}
                name="intentionDegree"
                render={({ field }) => (
                  <FormItem className="min-w-40 flex-1">
                    <FormLabel>意向度</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || undefined}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="请选择意向度" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {INTENTION_DEGREE_OPTIONS.map((option: string) => (
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
              name="intendedCourseIds"
              render={() => (
                <FormItem>
                  <FormLabel>意向课程</FormLabel>
                  <div className="max-h-40 space-y-2 overflow-y-auto rounded-md border border-border p-3">
                    {courseOptions.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        暂无可选课程
                      </p>
                    ) : (
                      courseOptions.map((course: CourseListItem) => (
                        <label
                          key={course.id}
                          className="flex cursor-pointer items-center gap-2 text-sm"
                        >
                          <Checkbox
                            checked={form
                              .getValues('intendedCourseIds')
                              .includes(course.id)}
                            onCheckedChange={(checked: boolean) =>
                              toggleCourse(course.id, checked)
                            }
                          />
                          {course.courseName}
                        </label>
                      ))
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="personInCharge"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>负责人</FormLabel>
                  <FormControl>
                    <UserSelect
                      value={field.value ?? null}
                      onChange={(value: string | null) =>
                        field.onChange(value)
                      }
                      placeholder="请选择负责人"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex flex-wrap gap-4">
              <FormField
                control={form.control}
                name="firstConsultTime"
                render={({ field }) => (
                  <FormItem className="min-w-40 flex-1">
                    <FormLabel>首次咨询时间</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className="w-full justify-start font-normal"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value || '请选择日期'}
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
                name="nextFollowTime"
                render={({ field }) => (
                  <FormItem className="min-w-40 flex-1">
                    <FormLabel>下次跟进时间</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className="w-full justify-start font-normal"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value || '请选择日期'}
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
            </div>
            {editing && (
              <FormField
                control={form.control}
                name="clueStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>线索状态</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || undefined}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="请选择线索状态" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CLUE_STATUS_OPTIONS.map((option: string) => (
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
            )}
            <FormField
              control={form.control}
              name="remark"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>备注</FormLabel>
                  <FormControl>
                    <Textarea placeholder="选填" {...field} />
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
                {submitting ? '保存中...' : editing ? '保存修改' : '创建线索'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
