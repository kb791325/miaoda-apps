import React, { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import { Textarea } from '@client/src/components/ui/textarea';
import {
  COURSE_DIFFICULTY_OPTIONS,
  COURSE_STATUS_OPTIONS,
} from '@shared/course';
import type {
  CourseCategory,
  CourseDetail,
  CourseFormPayload,
  UpdateCourseRequest,
} from '@shared/course';
import { CourseImageField } from './CourseImageField';
import {
  createCourse,
  fetchCourseCategories,
  updateCourse,
} from './course.api';
import {
  buildCourseFormDefaults,
  courseFormSchema,
  extractErrorMessage,
  type CourseFormData,
} from './course-form';

interface CourseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: CourseDetail | null;
  onSuccess: () => void;
}

export const CourseFormDialog: React.FC<CourseFormDialogProps> = ({
  open,
  onOpenChange,
  initial,
  onSuccess,
}) => {
  const isEdit: boolean = initial !== null;
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);

  const form = useForm<CourseFormData>({
    resolver: zodResolver(courseFormSchema),
    defaultValues: buildCourseFormDefaults(null),
  });

  useEffect(() => {
    if (open) form.reset(buildCourseFormDefaults(initial));
  }, [open, initial, form]);

  useEffect(() => {
    if (!open) return;
    let cancelled: boolean = false;
    fetchCourseCategories()
      .then((result) => {
        if (cancelled) return;
        const names: string[] = result.items.map(
          (item: CourseCategory) => item.name,
        );
        const current: string | null = initial?.courseCategory ?? null;
        if (current && !names.includes(current)) {
          names.push(current);
        }
        setCategoryOptions(names);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [open, initial]);

  const handleSubmit = form.handleSubmit(async (data: CourseFormData) => {
    const payload: CourseFormPayload = {
      courseName: data.courseName,
      courseCategory: data.courseCategory || null,
      difficultyLevel: data.difficultyLevel || null,
      studyDuration: data.studyDuration || null,
      tuitionFee: data.tuitionFee === '' ? null : Number(data.tuitionFee),
      status: data.status || null,
      productImage: data.productImageUrl ? [data.productImageUrl] : [],
      courseIntro: data.courseIntro || null,
    };
    setSubmitting(true);
    try {
      if (initial) {
        const request: UpdateCourseRequest = payload;
        await updateCourse(initial.id, request);
        toast.success('课程已更新');
      } else {
        await createCourse(payload);
        toast.success('课程创建成功');
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
          <DialogTitle>{isEdit ? '编辑课程' : '新增课程'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="courseName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    课程名称 <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="请输入课程名称" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex flex-wrap gap-4">
              <FormField
                control={form.control}
                name="courseCategory"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>课程类别</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="请选择类别" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categoryOptions.map((option: string) => (
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
                name="difficultyLevel"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>难度等级</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="请选择难度" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {COURSE_DIFFICULTY_OPTIONS.map((option: string) => (
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
                name="studyDuration"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>学习时长</FormLabel>
                    <FormControl>
                      <Input placeholder="如：3天" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tuitionFee"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>学费（元）</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        placeholder="请输入学费"
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
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>招生状态</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="请选择状态" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {COURSE_STATUS_OPTIONS.map((option: string) => (
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
              name="productImageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>课程产品图</FormLabel>
                  <CourseImageField
                    value={field.value}
                    onChange={field.onChange}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="courseIntro"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>课程简介</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="请输入课程简介"
                      rows={4}
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
                disabled={submitting}
              >
                取消
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : null}
                {isEdit ? '保存修改' : '创建课程'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
