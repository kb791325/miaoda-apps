import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { toast } from 'sonner';
import dayjs from 'dayjs';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
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
import { CalendarDays, Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CourseDetail, CourseListItem } from '@shared/course';
import type {
  CreateMarketingContentRequest,
  MarketingContentType,
} from '@shared/content';
import type { AdmissionContentCreationOneInput } from '@shared/plugin-types';
import {
  fetchCourseDetail,
  fetchCourseList,
} from '@client/src/pages/courses/course.api';
import { generateMarketingContent } from '@client/src/services/ai-content';
import { createMarketingContent, extractErrorMessage } from './content.api';
import {
  CONTENT_TYPE_LABELS,
  CONTENT_TYPE_OPTIONS,
  CONTENT_TYPE_PLUGIN_LABELS,
} from './content.constants';
import { ContentMaterialPanel } from './ContentMaterialPanel';
import { ContentMediaPanel } from './ContentMediaPanel';
import type { MediaState } from './ContentMediaPanel';

const saveSchema = z.object({
  title: z.string().min(1, '请输入标题').max(255, '标题过长'),
  body: z.string().min(1, '内容不能为空'),
});

type SaveFormData = z.infer<typeof saveSchema>;

interface AiCreateDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AiCreateDialog: FC<AiCreateDialogProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const [courses, setCourses] = useState<CourseListItem[]>([]);
  const [coursesLoading, setCoursesLoading] = useState<boolean>(false);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [contentType, setContentType] = useState<MarketingContentType | null>(
    null,
  );
  const [generating, setGenerating] = useState<boolean>(false);
  const [materialSummary, setMaterialSummary] = useState<string>('');
  const [scheduleDate, setScheduleDate] = useState<Date | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [media, setMedia] = useState<MediaState>({
    posterImages: [],
    attachments: [],
  });

  const form = useForm<SaveFormData>({
    resolver: zodResolver(saveSchema),
    defaultValues: { title: '', body: '' },
  });

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setSelectedCourseId('');
    setContentType(null);
    setMaterialSummary('');
    setScheduleDate(null);
    setMedia({ posterImages: [], attachments: [] });
    form.reset({ title: '', body: '' });
    const loadCourses = async () => {
      setCoursesLoading(true);
      try {
        const result = await fetchCourseList({ pageSize: 100 });
        if (!cancelled) setCourses(result.items);
      } catch (error) {
        toast.error(extractErrorMessage(error, '获取课程列表失败'));
      } finally {
        if (!cancelled) setCoursesLoading(false);
      }
    };
    void loadCourses();
    return () => {
      cancelled = true;
    };
  }, [open, form]);

  const selectedCourse: CourseListItem | undefined = courses.find(
    (course: CourseListItem) => course.id === selectedCourseId,
  );

  const handleGenerate = async () => {
    if (!selectedCourse || !contentType) {
      toast.warning('请先选择关联课程和内容类型');
      return;
    }
    setGenerating(true);
    try {
      const detail: CourseDetail = await fetchCourseDetail(selectedCourse.id);
      const summary: string = materialSummary.trim();
      const input: AdmissionContentCreationOneInput = {
        course_name: selectedCourse.courseName,
        course_intro: detail.courseIntro ?? '',
        study_duration: selectedCourse.studyDuration ?? '',
        tuition_fee:
          selectedCourse.tuitionFee !== null &&
          selectedCourse.tuitionFee !== undefined
            ? `学费 ${String(selectedCourse.tuitionFee)} 元`
            : '',
        content_type: CONTENT_TYPE_PLUGIN_LABELS[contentType],
        ...(summary ? { marketing_material_summary: summary } : {}),
      };
      const fullText: string = await generateMarketingContent({
        input,
        onChunk: (_delta: string, full: string) =>
          form.setValue('body', full),
      });
      if (!fullText.trim()) {
        toast.error('AI 未返回内容，请重试');
        return;
      }
      if (!form.getValues('title')) {
        form.setValue(
          'title',
          `${selectedCourse.courseName}-${CONTENT_TYPE_LABELS[contentType]}`,
        );
      }
    } catch (error) {
      toast.error(extractErrorMessage(error, 'AI 生成失败，请稍后重试'));
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = form.handleSubmit(async (data: SaveFormData) => {
    if (!contentType) return;
    setSaving(true);
    try {
      const request: CreateMarketingContentRequest = {
        title: data.title.trim(),
        courseId: selectedCourseId || null,
        contentType,
        body: data.body,
        scheduleDate: scheduleDate
          ? dayjs(scheduleDate).format('YYYY-MM-DD')
          : undefined,
        posterImages:
          media.posterImages.length > 0 ? media.posterImages : undefined,
        attachments:
          media.attachments.length > 0 ? media.attachments : undefined,
      };
      await createMarketingContent(request);
      toast.success('内容已保存，进入待审核');
      onSuccess();
    } catch (error) {
      toast.error(extractErrorMessage(error, '保存失败'));
    } finally {
      setSaving(false);
    }
  });

  const handleOpenChange = (next: boolean) => {
    if (!next && !generating && !saving) onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>
            <span className="inline-flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              AI 创作招生内容
            </span>
          </DialogTitle>
          <DialogDescription>
            选择课程与内容类型，可先上传材料，正文将基于材料生成
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="flex flex-wrap gap-4">
              <div className="min-w-[220px] flex-1 space-y-2">
                <p className="text-sm font-medium">
                  关联课程 <span className="text-destructive">*</span>
                </p>
                <Select
                  value={selectedCourseId || undefined}
                  onValueChange={(value: string) => setSelectedCourseId(value)}
                  disabled={generating}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={coursesLoading ? '加载中...' : '请选择课程'}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map((course: CourseListItem) => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.courseName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-[220px] flex-1 space-y-2">
                <p className="text-sm font-medium">
                  内容类型 <span className="text-destructive">*</span>
                </p>
                <Select
                  value={contentType ?? undefined}
                  onValueChange={(value: string) =>
                    setContentType(value as MarketingContentType)
                  }
                  disabled={generating}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="请选择内容类型" />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTENT_TYPE_OPTIONS.map(
                      (type: MarketingContentType) => (
                        <SelectItem key={type} value={type}>
                          {CONTENT_TYPE_LABELS[type]}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <ContentMaterialPanel
              attachments={media.attachments}
              parseEnabled
              onSummaryChange={setMaterialSummary}
              onCommit={(next) =>
                setMedia((prev: MediaState) => ({
                  ...prev,
                  attachments: next,
                }))
              }
            />

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    标题 <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="请输入内容标题" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="body"
              render={({ field }) => (
                <FormItem>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <FormLabel>
                      内容正文 <span className="text-destructive">*</span>
                    </FormLabel>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={generating}
                      onClick={() => void handleGenerate()}
                    >
                      {generating ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Sparkles className="size-4" />
                      )}
                      {generating
                        ? '生成中...'
                        : materialSummary.trim()
                          ? '基于材料生成正文'
                          : 'AI 生成正文'}
                    </Button>
                  </div>
                  <FormControl>
                    <Textarea
                      rows={12}
                      placeholder="点击生成按钮，AI 将结合课程信息与材料摘要创作正文"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                  {generating && (
                    <p className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="size-4 animate-spin text-primary" />
                      AI 正在结合课程信息
                      {materialSummary.trim() ? '与上传材料' : ''}
                      创作正文...
                    </p>
                  )}
                </FormItem>
              )}
            />

            <ContentMediaPanel
              posterImages={media.posterImages}
              attachments={media.attachments}
              contentHint={{
                title: form.getValues('title'),
                body: form.getValues('body'),
              }}
              onCommit={(next: MediaState) => setMedia(next)}
            />

            <div className="space-y-2">
              <p className="text-sm font-medium">计划发布日期（可选）</p>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !scheduleDate && 'text-muted-foreground',
                    )}
                  >
                    <CalendarDays className="size-4" />
                    {scheduleDate
                      ? dayjs(scheduleDate).format('YYYY-MM-DD')
                      : '选择计划发布日期'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={scheduleDate ?? undefined}
                    onSelect={(date: Date | undefined) =>
                      setScheduleDate(date ?? null)
                    }
                  />
                </PopoverContent>
              </Popover>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={generating || saving}
              >
                取消
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? '保存中...' : '保存并提交审核'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
