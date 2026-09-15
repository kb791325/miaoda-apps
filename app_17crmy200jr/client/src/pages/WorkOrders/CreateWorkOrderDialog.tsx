import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { Plus } from 'lucide-react';

import { Button } from '@client/src/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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

import { create } from '@client/src/api/work-orders';
import type { CreateWorkOrderDto } from '@shared/api.interface';

const formSchema = z.object({
  contactPhone: z.string().optional(),
  assetId: z.string().optional(),
  assetName: z.string().optional(),
  problemType: z.string().min(1, '请选择问题类型'),
  urgency: z.string().min(1, '请选择紧急程度'),
  description: z.string().min(1, '请输入问题描述'),
  attachmentUrls: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

const PROBLEM_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'hardware', label: '硬件故障' },
  { value: 'software', label: '软件问题' },
  { value: 'network', label: '网络问题' },
  { value: 'account', label: '账号问题' },
  { value: 'peripheral', label: '外设问题' },
  { value: 'other', label: '其他' },
];

const URGENCY_OPTIONS: { value: string; label: string }[] = [
  { value: 'low', label: '低' },
  { value: 'medium', label: '中' },
  { value: 'high', label: '高' },
  { value: 'urgent', label: '紧急' },
];

interface CreateWorkOrderDialogProps {
  onCreated: () => void;
}

const CreateWorkOrderDialog: React.FC<CreateWorkOrderDialogProps> = ({
  onCreated,
}) => {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      contactPhone: '',
      assetId: '',
      assetName: '',
      problemType: '',
      urgency: '',
      description: '',
      attachmentUrls: '',
    },
  });

  const handleSubmit = async (data: FormData): Promise<void> => {
    setSubmitting(true);
    try {
      const dto: CreateWorkOrderDto = {
        problemType: data.problemType as CreateWorkOrderDto['problemType'],
        urgency: data.urgency as CreateWorkOrderDto['urgency'],
        description: data.description,
        contactPhone: data.contactPhone || undefined,
        assetId: data.assetId || undefined,
        assetName: data.assetName || undefined,
        attachmentUrls: data.attachmentUrls || undefined,
      };
      await create(dto);
      toast.success('工单创建成功');
      setOpen(false);
      form.reset();
      onCreated();
    } catch (err: unknown) {
      logger.error('创建工单失败', err);
      toast.error('创建失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4 mr-2" />
          新增工单
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg rounded-sm">
        <DialogHeader>
          <DialogTitle>新增报修工单</DialogTitle>
          <DialogDescription>
            填写报修信息，提交后将生成工单号
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <div className="flex flex-wrap gap-4">
              <FormField
                control={form.control}
                name="problemType"
                render={({ field }) => (
                  <FormItem className="flex-1 min-w-[180px]">
                    <FormLabel>
                      问题类型 <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="请选择" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PROBLEM_TYPE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
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
                name="urgency"
                render={({ field }) => (
                  <FormItem className="flex-1 min-w-[180px]">
                    <FormLabel>
                      紧急程度 <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="请选择" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {URGENCY_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
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
              name="contactPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>联系电话</FormLabel>
                  <FormControl>
                    <Input placeholder="请输入联系电话" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex flex-wrap gap-4">
              <FormField
                control={form.control}
                name="assetId"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>资产编号</FormLabel>
                    <FormControl>
                      <Input placeholder="请输入资产编号" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="assetName"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>资产名称</FormLabel>
                    <FormControl>
                      <Input placeholder="请输入资产名称" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    问题描述 <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="请详细描述问题现象"
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="attachmentUrls"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>附件链接</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="请输入附件链接（多个用逗号分隔）"
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
                onClick={() => setOpen(false)}
              >
                取消
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? '提交中...' : '提交工单'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateWorkOrderDialog;