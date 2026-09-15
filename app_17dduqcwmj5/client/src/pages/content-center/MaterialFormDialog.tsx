import React, { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { z } from 'zod';
import { Button } from '@client/src/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@client/src/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@client/src/components/ui/form';
import { Input } from '@client/src/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@client/src/components/ui/select';
import { Textarea } from '@client/src/components/ui/textarea';
import type { CourseListItem, CourseListResponse } from '@shared/course';
import type {
  CreateMaterialRequest,
  MaterialListItem,
  MaterialOptionsResponse,
} from '@shared/content';
import { fetchCourseList } from '@client/src/pages/courses/course.api';
import {
  createMaterial,
  extractErrorMessage,
  updateMaterial,
} from './content.api';

const NO_COURSE_VALUE: string = '__no_course__';

const materialSchema = z.object({
  materialTitle: z.string().trim().min(1, '素材标题不能为空'),
  materialType: z.string(),
  relatedCourseId: z.string(),
  coreContent: z.string(),
  applicablePlatform: z.string(),
  tag: z.string(),
  status: z.string(),
});

type MaterialFormData = z.infer<typeof materialSchema>;

const splitCsv = (value: string): string[] =>
  value
    .split(/[,，]/u)
    .map((part: string) => part.trim())
    .filter((part: string) => part.length > 0);

const buildDefaults = (item: MaterialListItem | null): MaterialFormData => ({
  materialTitle: item?.title ?? '',
  materialType: item?.materialType ?? '',
  relatedCourseId: item?.relatedCourseId ?? NO_COURSE_VALUE,
  coreContent: item?.coreContent ?? '',
  applicablePlatform: (item?.applicablePlatform ?? []).join('、'),
  tag: (item?.tag ?? []).join('、'),
  status: item?.status ?? '',
});

interface MaterialFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  options: MaterialOptionsResponse | null;
  initial: MaterialListItem | null;
  onSuccess: () => void;
}

export const MaterialFormDialog: React.FC<MaterialFormDialogProps> = ({
  open,
  onOpenChange,
  options,
  initial,
  onSuccess,
}) => {
  const isEdit: boolean = initial !== null;
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [courseOptions, setCourseOptions] = useState<CourseListItem[]>([]);

  const form = useForm<MaterialFormData>({
    resolver: zodResolver(materialSchema),
    defaultValues: buildDefaults(null),
  });

  useEffect(() => {
    if (open) form.reset(buildDefaults(initial));
  }, [open, initial, form]);

  useEffect(() => {
    if (!open) return;
    let cancelled: boolean = false;
    fetchCourseList({ page: 1, pageSize: 100 })
      .then((result: CourseListResponse) => {
        if (!cancelled) setCourseOptions(result.items);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [open]);

  const handleSubmit = form.handleSubmit(async (data: MaterialFormData) => {
    setSubmitting(true);
    try {
      const relatedCourseId: string | undefined =
        data.relatedCourseId === '' || data.relatedCourseId === NO_COURSE_VALUE
          ? undefined
          : data.relatedCourseId;
      const payload: CreateMaterialRequest = {
        materialTitle: data.materialTitle,
        materialType: data.materialType || undefined,
        relatedCourseId,
        coreContent: data.coreContent || undefined,
        applicablePlatform: splitCsv(data.applicablePlatform),
        tag: splitCsv(data.tag),
        status: data.status || undefined,
      };
      if (initial) {
        await updateMaterial(initial.id, payload);
        toast.success('素材已更新');
      } else {
        await createMaterial(payload);
        toast.success('素材已新增');
      }
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      toast.error(extractErrorMessage(error, '保存失败，请稍后重试'));
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? '编辑素材' : '新增素材'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="materialTitle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    素材标题 <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="请输入素材标题" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="materialType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>素材类型</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="请选择类型" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(options?.materialTypes ?? []).map(
                          (type: string) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>状态</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="请选择状态" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(options?.statuses ?? []).map((status: string) => (
                          <SelectItem key={status} value={status}>
                            {status}
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
              name="relatedCourseId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>关联课程</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="请选择关联课程" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NO_COURSE_VALUE}>
                        不关联课程
                      </SelectItem>
                      {courseOptions.map((course: CourseListItem) => (
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
              name="coreContent"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>核心内容</FormLabel>
                  <FormControl>
                    <Textarea rows={4} placeholder="请输入核心内容" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="applicablePlatform"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>适用平台</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="多个用逗号分隔，如 抖音、小红书"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tag"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>标签</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="多个用逗号分隔，如 烘焙、新品"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
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
