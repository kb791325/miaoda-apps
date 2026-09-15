import type { FC } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@client/src/components/ui/button';
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
import type {
  MarketingContentEffectRequest,
  MarketingContentListItem,
} from '@shared/content';

const effectSchema = z.object({
  publishPlatform: z.string().min(1, '请输入发布平台'),
  likeCount: z.coerce.number().int().min(0, '点赞数不能为负数'),
  conversionCount: z.coerce.number().int().min(0, '咨询转化数不能为负数'),
});

type EffectFormData = z.infer<typeof effectSchema>;

interface EffectDialogProps {
  open: boolean;
  item: MarketingContentListItem | null;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (request: MarketingContentEffectRequest) => void;
}

export const EffectDialog: FC<EffectDialogProps> = ({
  open,
  item,
  submitting,
  onClose,
  onSubmit,
}) => {
  const form = useForm<EffectFormData>({
    resolver: zodResolver(effectSchema),
    defaultValues: {
      publishPlatform: '',
      likeCount: 0,
      conversionCount: 0,
    },
  });

  const handleOpenChange = (next: boolean) => {
    if (next) {
      form.reset({
        publishPlatform: item?.publishPlatform ?? '',
        likeCount: item?.likeCount ?? 0,
        conversionCount: item?.conversionCount ?? 0,
      });
    } else if (!submitting) {
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>录入发布效果</DialogTitle>
          <DialogDescription className="truncate">
            {item?.title ?? ''}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((data: EffectFormData) => {
              const request: MarketingContentEffectRequest = {
                publishPlatform: data.publishPlatform,
                likeCount: data.likeCount,
                conversionCount: data.conversionCount,
              };
              onSubmit(request);
            })}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="publishPlatform"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    发布平台 <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="如：抖音、视频号、朋友圈" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex flex-wrap gap-4">
              <FormField
                control={form.control}
                name="likeCount"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>点赞数</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="conversionCount"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>咨询转化数</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} {...field} />
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
                onClick={onClose}
                disabled={submitting}
              >
                取消
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? '保存中...' : '保存'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
