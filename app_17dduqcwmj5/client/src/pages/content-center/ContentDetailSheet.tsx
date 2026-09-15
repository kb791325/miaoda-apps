import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { toast } from 'sonner';
import { formatDateTime } from '@client/src/utils/format';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@client/src/components/ui/sheet';
import { Button } from '@client/src/components/ui/button';
import { Skeleton } from '@client/src/components/ui/skeleton';
import { Check, Copy } from 'lucide-react';
import type { MarketingContentDetail } from '@shared/content';
import {
  extractErrorMessage,
  fetchMarketingContentDetail,
  saveMarketingContentMedia,
} from './content.api';
import { ContentMaterialPanel } from './ContentMaterialPanel';
import { ContentMediaPanel } from './ContentMediaPanel';
import { CONTENT_TYPE_LABELS } from './content.constants';
import { StatusBadge } from './StatusBadge';

interface ContentDetailSheetProps {
  open: boolean;
  contentId: string | null;
  onClose: () => void;
}

interface DetailFieldProps {
  label: string;
  value: string;
}

const DetailField: FC<DetailFieldProps> = ({ label, value }) => (
  <div className="space-y-1">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="break-words text-sm">{value}</p>
  </div>
);

export const ContentDetailSheet: FC<ContentDetailSheetProps> = ({
  open,
  contentId,
  onClose,
}) => {
  const [detail, setDetail] = useState<MarketingContentDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (!open || !contentId) return;
    let cancelled = false;
    setLoading(true);
    setDetail(null);
    setCopied(false);
    fetchMarketingContentDetail(contentId)
      .then((result: MarketingContentDetail) => {
        if (!cancelled) setDetail(result);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          toast.error(extractErrorMessage(error, '获取内容详情失败'));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, contentId]);

  const handleCopy = async () => {
    if (!detail) return;
    try {
      await navigator.clipboard.writeText(detail.body);
      setCopied(true);
      toast.success('已复制到剪贴板');
      window.setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error(extractErrorMessage(error, '复制失败'));
    }
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(next: boolean) => {
        if (!next) onClose();
      }}
    >
      <SheetContent side="right" className="flex flex-col gap-0 overflow-y-auto p-0 sm:max-w-3xl">
        <SheetHeader className="border-b px-6 py-4 text-left">
          <SheetTitle className="pr-8 text-base leading-snug">
            {loading ? (
              <Skeleton className="h-5 w-48" />
            ) : (
              detail?.title ?? '内容详情'
            )}
          </SheetTitle>
        </SheetHeader>
        {loading || !detail ? (
          <div className="space-y-3 px-6 py-5">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : (
          <div className="flex-1 space-y-5 px-6 py-5">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={detail.status} />
              <span className="rounded-full bg-accent px-2 py-0.5 text-xs text-accent-foreground">
                {CONTENT_TYPE_LABELS[detail.contentType] ?? detail.contentType}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 rounded-lg border p-4">
              <DetailField label="关联课程" value={detail.courseName ?? '-'} />
              <DetailField
                label="计划发布日期"
                value={detail.scheduleDate ?? '-'}
              />
              <DetailField
                label="发布平台"
                value={detail.publishPlatform ?? '-'}
              />
              <DetailField
                label="创建时间"
                value={formatDateTime(detail.createdAt)}
              />
              <DetailField
                label="点赞数"
                value={detail.likeCount === null ? '未录入' : String(detail.likeCount)}
              />
              <DetailField
                label="转化数"
                value={detail.conversionCount === null ? '未录入' : String(detail.conversionCount)}
              />
            </div>
            {detail.status === 'rejected' && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4">
                <p className="text-xs font-medium text-destructive">驳回原因</p>
                <p className="mt-1 break-words text-sm text-destructive">
                  {detail.rejectReason || '-'}
                </p>
              </div>
            )}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">内容正文</p>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => void handleCopy()}
                >
                  {copied ? (
                    <Check className="size-4" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                  {copied ? '已复制' : '一键复制'}
                </Button>
              </div>
              <div className="whitespace-pre-wrap break-words rounded-lg border bg-muted/30 p-4 text-sm leading-relaxed">
                {detail.body}
              </div>
            </div>
            <ContentMaterialPanel
              attachments={detail.attachments}
              onCommit={async (next) => {
                const updated: MarketingContentDetail =
                  await saveMarketingContentMedia(detail.id, {
                    posterImages: detail.posterImages,
                    attachments: next,
                  });
                setDetail(updated);
              }}
            />
            <ContentMediaPanel
              posterImages={detail.posterImages}
              attachments={detail.attachments}
              contentHint={{ title: detail.title, body: detail.body }}
              onCommit={async (next) => {
                const updated: MarketingContentDetail =
                  await saveMarketingContentMedia(detail.id, next);
                setDetail(updated);
              }}
            />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};
