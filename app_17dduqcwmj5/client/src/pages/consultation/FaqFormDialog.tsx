import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@client/src/components/ui/button';
import {
  Dialog,
  DialogContent,
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
import { Spinner } from '@client/src/components/ui/spinner';
import { Textarea } from '@client/src/components/ui/textarea';
import type { CreateFaqRequest, FaqListItem } from '@shared/consultation';

const faqFormSchema = z.object({
  question: z.string().min(1, '请输入问题'),
  answer: z.string().min(1, '请输入标准答案'),
  category: z.string().min(1, '请输入分类'),
  keywords: z.string(),
  similarQuestion: z.string(),
});

type FaqFormData = z.infer<typeof faqFormSchema>;

const parseKeywords = (raw: string): string[] =>
  raw
    .split(/[,，]/)
    .map((item: string) => item.trim())
    .filter((item: string) => item.length > 0);

interface FaqFormDialogProps {
  open: boolean;
  editing: FaqListItem | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: CreateFaqRequest) => Promise<void>;
}

const FaqFormDialog = ({
  open,
  editing,
  onOpenChange,
  onSubmit,
}: FaqFormDialogProps) => {
  const [submitting, setSubmitting] = useState<boolean>(false);
  const form = useForm<FaqFormData>({
    resolver: zodResolver(faqFormSchema),
    defaultValues: {
      question: '',
      answer: '',
      category: '',
      keywords: '',
      similarQuestion: '',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        question: editing?.question ?? '',
        answer: editing?.answer ?? '',
        category: editing?.category ?? '',
        keywords: (editing?.keywords ?? []).join('，'),
        similarQuestion: editing?.similarQuestion ?? '',
      });
    }
  }, [open, editing, form]);

  const handleSubmit = async (data: FaqFormData) => {
    setSubmitting(true);
    try {
      const request: CreateFaqRequest = {
        question: data.question.trim(),
        answer: data.answer,
        category: data.category.trim(),
        keywords: parseKeywords(data.keywords),
        similarQuestion: data.similarQuestion.trim() || undefined,
      };
      await onSubmit(request);
      onOpenChange(false);
    } catch (error) {
      const message: string =
        error instanceof Error ? error.message : '保存失败，请稍后重试';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? '编辑常见问题' : '新增常见问题'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="question"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    问题 <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="请输入常见问题" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="answer"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    标准答案 <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="请输入标准答案"
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex flex-wrap gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>
                      分类 <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="如：课程咨询" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="keywords"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>关键词</FormLabel>
                    <FormControl>
                      <Input placeholder="逗号分隔，如：学费，费用" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="similarQuestion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>相似问法</FormLabel>
                  <FormControl>
                    <Input placeholder="如：学厨师要多少钱" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
              >
                取消
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? <Spinner className="size-4" /> : null}
                {editing ? '保存修改' : '确认新增'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default FaqFormDialog;
