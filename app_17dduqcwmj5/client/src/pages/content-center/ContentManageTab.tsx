import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@client/src/components/ui/alert-dialog';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import { cn } from '@/lib/utils';
import { CalendarDays, List, Sparkles } from 'lucide-react';
import type {
  MarketingContentEffectRequest,
  MarketingContentListItem,
  MarketingContentListResponse,
  MarketingContentStatus,
} from '@shared/content';
import { useBitableRetry } from '@client/src/hooks/use-bitable-retry';
import {
  auditMarketingContent,
  deleteMarketingContent,
  extractErrorMessage,
  fetchMarketingContents,
  saveMarketingContentEffect,
  markMarketingContentUsed,
} from './content.api';
import { STATUS_FILTER_OPTIONS } from './content.constants';
import { AiCreateDialog } from './AiCreateDialog';
import { ContentDetailSheet } from './ContentDetailSheet';
import { ContentTable } from './ContentTable';
import { EffectDialog } from './EffectDialog';
import { PublishCalendar } from './PublishCalendar';
import { RejectDialog } from './RejectDialog';

const PAGE_SIZE = 20;
const ALL_STATUS = 'all';

type ViewMode = 'list' | 'calendar';

export const ContentManageTab = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [statusFilter, setStatusFilter] = useState<string>(ALL_STATUS);
  const [keywordDraft, setKeywordDraft] = useState<string>('');
  const [keyword, setKeyword] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [data, setData] = useState<MarketingContentListResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [aiDialogOpen, setAiDialogOpen] = useState<boolean>(false);
  const [rejectTarget, setRejectTarget] =
    useState<MarketingContentListItem | null>(null);
  const [rejectSubmitting, setRejectSubmitting] = useState<boolean>(false);
  const [effectTarget, setEffectTarget] =
    useState<MarketingContentListItem | null>(null);
  const [effectSubmitting, setEffectSubmitting] = useState<boolean>(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] =
    useState<MarketingContentListItem | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);
  const loadSeqRef = useRef<number>(0);

  const loadList = useCallback(async () => {
    const seq: number = loadSeqRef.current + 1;
    loadSeqRef.current = seq;
    setLoading(true);
    try {
      const result: MarketingContentListResponse = await fetchMarketingContents(
        {
          status:
            statusFilter === ALL_STATUS
              ? undefined
              : (statusFilter as MarketingContentStatus),
          keyword: keyword || undefined,
          page,
          pageSize: PAGE_SIZE,
        },
      );
      if (seq !== loadSeqRef.current) {
        return;
      }
      setData(result);
    } catch (error) {
      if (seq !== loadSeqRef.current) {
        return;
      }
      toast.error(extractErrorMessage(error, '获取内容列表失败'));
    } finally {
      if (seq === loadSeqRef.current) {
        setLoading(false);
      }
    }
  }, [statusFilter, keyword, page]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const {
    syncingIds: syncingContentIds,
    retry: retryContentSync,
  } = useBitableRetry('marketingContent', loadList);

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    setPage(1);
  };

  const handleSearch = () => {
    setKeyword(keywordDraft.trim());
    setPage(1);
  };

  const handleApprove = async (item: MarketingContentListItem) => {
    setBusyId(item.id);
    try {
      await auditMarketingContent(item.id, { action: 'approve' });
      toast.success('审核通过，内容已变为可用');
      void loadList();
    } catch (error) {
      toast.error(extractErrorMessage(error, '审核失败'));
    } finally {
      setBusyId(null);
    }
  };

  const handleMarkUsed = async (item: MarketingContentListItem) => {
    setBusyId(item.id);
    try {
      await markMarketingContentUsed(item.id);
      toast.success('已标记为已使用');
      void loadList();
    } catch (error) {
      toast.error(extractErrorMessage(error, '标记失败'));
    } finally {
      setBusyId(null);
    }
  };

  const handleRejectSubmit = async (reason: string) => {
    if (!rejectTarget) return;
    setRejectSubmitting(true);
    try {
      await auditMarketingContent(rejectTarget.id, {
        action: 'reject',
        rejectReason: reason,
      });
      toast.success('已驳回该内容');
      setRejectTarget(null);
      void loadList();
    } catch (error) {
      toast.error(extractErrorMessage(error, '驳回失败'));
    } finally {
      setRejectSubmitting(false);
    }
  };

  const handleEffectSubmit = async (request: MarketingContentEffectRequest) => {
    if (!effectTarget) return;
    setEffectSubmitting(true);
    try {
      await saveMarketingContentEffect(effectTarget.id, request);
      toast.success('效果数据已录入');
      setEffectTarget(null);
      void loadList();
    } catch (error) {
      toast.error(extractErrorMessage(error, '录入失败'));
    } finally {
      setEffectSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteMarketingContent(deleteTarget.id);
      toast.success('内容已删除');
      setDeleteTarget(null);
      void loadList();
    } catch (error) {
      toast.error(extractErrorMessage(error, '删除失败，请稍后重试'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={statusFilter} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_STATUS}>全部状态</SelectItem>
            {STATUS_FILTER_OPTIONS.map(
              (option: { value: MarketingContentStatus; label: string }) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ),
            )}
          </SelectContent>
        </Select>
        <Input
          value={keywordDraft}
          onChange={(e) => setKeywordDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSearch();
          }}
          onBlur={handleSearch}
          placeholder="搜索标题，回车查询"
          className="w-64"
        />
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-lg border bg-muted p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={cn(
                'inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-sm transition-colors',
                viewMode === 'list'
                  ? 'bg-background font-medium shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <List className="size-4" />
              列表视图
            </button>
            <button
              type="button"
              onClick={() => setViewMode('calendar')}
              className={cn(
                'inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-sm transition-colors',
                viewMode === 'calendar'
                  ? 'bg-background font-medium shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <CalendarDays className="size-4" />
              日历视图
            </button>
          </div>
          <Button onClick={() => setAiDialogOpen(true)} data-ai-section-type="button">
            <Sparkles className="size-4" />
            AI 创作
          </Button>
        </div>
      </div>

      {viewMode === 'list' ? (
        <ContentTable
          items={data?.items ?? []}
          total={data?.total ?? 0}
          page={page}
          pageSize={PAGE_SIZE}
          loading={loading}
          busyId={busyId}
          syncingIds={syncingContentIds}
          onPageChange={(nextPage: number) => setPage(nextPage)}
          onApprove={(item: MarketingContentListItem) => void handleApprove(item)}
          onOpenReject={(item: MarketingContentListItem) => setRejectTarget(item)}
          onMarkUsed={(item: MarketingContentListItem) => void handleMarkUsed(item)}
          onOpenEffect={(item: MarketingContentListItem) => setEffectTarget(item)}
          onViewDetail={(item: MarketingContentListItem) => setDetailId(item.id)}
          onRetrySync={retryContentSync}
          onDelete={setDeleteTarget}
        />
      ) : (
        <PublishCalendar onViewDetail={(id: string) => setDetailId(id)} />
      )}

      <ContentDetailSheet
        open={detailId !== null}
        contentId={detailId}
        onClose={() => setDetailId(null)}
      />
      <AiCreateDialog
        open={aiDialogOpen}
        onClose={() => setAiDialogOpen(false)}
        onSuccess={() => {
          setAiDialogOpen(false);
          setPage(1);
          void loadList();
        }}
      />
      <RejectDialog
        open={rejectTarget !== null}
        title={rejectTarget?.title ?? ''}
        submitting={rejectSubmitting}
        onClose={() => setRejectTarget(null)}
        onSubmit={(reason: string) => void handleRejectSubmit(reason)}
      />
      <EffectDialog
        open={effectTarget !== null}
        item={effectTarget}
        submitting={effectSubmitting}
        onClose={() => setEffectTarget(null)}
        onSubmit={(request: MarketingContentEffectRequest) =>
          void handleEffectSubmit(request)
        }
      />
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open: boolean) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除招生内容</AlertDialogTitle>
            <AlertDialogDescription>
              确定删除内容「{deleteTarget?.title}」吗？删除后不可恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-[hsl(5_75%_55%)] text-white hover:bg-[hsl(5_75%_48%)]"
              disabled={deleting}
              onClick={(e: { preventDefault: () => void }) => {
                e.preventDefault();
                void handleConfirmDelete();
              }}
            >
              {deleting ? '删除中...' : '确认删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
