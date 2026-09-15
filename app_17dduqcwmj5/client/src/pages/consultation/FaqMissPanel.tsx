import { useState } from 'react';
import { formatDateTime } from '@client/src/utils/format';
import { RefreshCw } from 'lucide-react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Badge } from '@client/src/components/ui/badge';
import { Button } from '@client/src/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Spinner } from '@client/src/components/ui/spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@client/src/components/ui/table';
import { Textarea } from '@client/src/components/ui/textarea';
import type {
  ConvertFaqMissRequest,
  FaqMissListItem,
} from '@shared/consultation';
import type { BitableSyncStatus } from '@shared/bitable-sync';
import {
  BITABLE_SYNC_STATUS_LABEL,
  getBitableSyncBadgeClass,
  normalizeSyncStatus,
} from '@client/src/lib/bitable-sync';

interface FaqMissPanelProps {
  items: FaqMissListItem[];
  total: number;
  loading: boolean;
  statusFilter: string;
  page: number;
  pageSize: number;
  onStatusChange: (status: string) => void;
  onPageChange: (page: number) => void;
  onConvert: (id: string, request: ConvertFaqMissRequest) => Promise<void>;
  syncingIds: string[];
  onRetrySync: (id: string) => void;
}

const MISS_STATUS_PENDING = 'pending';
const MISS_STATUS_CONVERTED = 'converted';

const convertSchema = z.object({
  answer: z.string().min(1, '请输入标准答案'),
  category: z.string().min(1, '请输入分类'),
  keywords: z.string(),
});

type ConvertFormData = z.infer<typeof convertSchema>;

const parseKeywords = (raw: string): string[] =>
  raw
    .split(/[,，]/)
    .map((item: string) => item.trim())
    .filter((item: string) => item.length > 0);

const FaqMissPanel = ({
  items,
  total,
  loading,
  statusFilter,
  page,
  pageSize,
  onStatusChange,
  onPageChange,
  onConvert,
  syncingIds,
  onRetrySync,
}: FaqMissPanelProps) => {
  const [target, setTarget] = useState<FaqMissListItem | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const form = useForm<ConvertFormData>({
    resolver: zodResolver(convertSchema),
    defaultValues: { answer: '', category: '', keywords: '' },
  });

  const totalPages: number = Math.max(1, Math.ceil(total / pageSize));

  const openConvert = (item: FaqMissListItem) => {
    form.reset({ answer: '', category: '', keywords: '' });
    setTarget(item);
  };

  const handleSubmit = async (data: ConvertFormData) => {
    if (!target) return;
    setSubmitting(true);
    try {
      const request: ConvertFaqMissRequest = {
        answer: data.answer,
        category: data.category.trim(),
        keywords: parseKeywords(data.keywords),
      };
      await onConvert(target.id, request);
      setTarget(null);
    } catch (error) {
      const message: string =
        error instanceof Error ? error.message : '转换失败，请稍后重试';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={statusFilter || 'all'}
          onValueChange={(value: string) =>
            onStatusChange(value === 'all' ? '' : value)
          }
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="全部状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            <SelectItem value={MISS_STATUS_PENDING}>待处理</SelectItem>
            <SelectItem value={MISS_STATUS_CONVERTED}>已转换</SelectItem>
          </SelectContent>
        </Select>
        <span className="ml-auto text-sm text-muted-foreground">
          智能问答未命中的问题会记录在这里，可补充标准答案转为常见问题
        </span>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[48%]">问题</TableHead>
              <TableHead>提问时间</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>同步状态</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={5} className="h-32 text-center">
                  <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                    <Spinner className="size-4" />
                    加载中
                  </span>
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={5}
                  className="h-32 text-center text-sm text-muted-foreground"
                >
                  暂无未命中问题
                </TableCell>
              </TableRow>
            ) : (
              items.map((item: FaqMissListItem) => {
                const syncStatus: BitableSyncStatus = normalizeSyncStatus(
                  item.syncStatus,
                );
                const isSyncing: boolean = syncingIds.includes(item.id);
                return (
                <TableRow key={item.id}>
                  <TableCell className="break-words">
                    {item.question}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDateTime(item.createdAt)}
                  </TableCell>
                  <TableCell>
                    {item.status === MISS_STATUS_CONVERTED ? (
                      <Badge className="bg-[hsl(140_60%_94%)] text-[hsl(140_60%_28%)]">
                        已转换
                      </Badge>
                    ) : (
                      <Badge className="bg-[hsl(38_85%_93%)] text-[hsl(38_80%_30%)]">
                        待处理
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getBitableSyncBadgeClass(syncStatus)}`}
                      >
                        {BITABLE_SYNC_STATUS_LABEL[syncStatus]}
                      </span>
                      {syncStatus === 'failed' && (
                        <Button
                          data-ai-section-type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 gap-1 px-2 text-xs text-primary"
                          disabled={isSyncing}
                          onClick={() => onRetrySync(item.id)}
                        >
                          <RefreshCw
                            className={`h-3 w-3 ${isSyncing ? 'animate-spin' : ''}`}
                          />
                          {isSyncing ? '同步中' : '重试'}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {item.status === MISS_STATUS_PENDING ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openConvert(item)}
                      >
                        转为新 FAQ
                      </Button>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        已转入知识库
                      </span>
                    )}
                  </TableCell>
                </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
        <span>共 {total} 条</span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1 || loading}
            onClick={() => onPageChange(page - 1)}
          >
            上一页
          </Button>
          <span>
            第 {page} / {totalPages} 页
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages || loading}
            onClick={() => onPageChange(page + 1)}
          >
            下一页
          </Button>
        </div>
      </div>

      <Dialog
        open={target !== null}
        onOpenChange={(open: boolean) => {
          if (!open) setTarget(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>转为新 FAQ</DialogTitle>
            <DialogDescription className="break-words">
              问题：{target?.question ?? ''}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-4"
            >
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
                        placeholder="请输入该问题的标准答案"
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
                        <Input
                          placeholder="逗号分隔，如：学费，费用"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setTarget(null)}
                  disabled={submitting}
                >
                  取消
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? <Spinner className="size-4" /> : null}
                  确认转换
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FaqMissPanel;
