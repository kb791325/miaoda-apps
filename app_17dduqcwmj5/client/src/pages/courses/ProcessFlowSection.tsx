import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  AlertTriangle,
  Clock,
  ListOrdered,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Video,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@client/src/components/ui/alert-dialog';
import { Button } from '@client/src/components/ui/button';
import { Skeleton } from '@client/src/components/ui/skeleton';
import { useBitableRetry } from '@client/src/hooks/use-bitable-retry';
import type { ProcessFlowItem } from '@shared/course';
import { deleteProcessFlow, fetchProcessFlows } from './course.api';
import { CourseSyncBadge } from './CourseSyncBadge';
import { extractErrorMessage } from './course-form';
import { ProcessFlowFormDialog } from './ProcessFlowFormDialog';
import { UniversalLink } from '@lark-apaas/client-toolkit/components/UniversalLink';

interface ProcessFlowSectionProps {
  courseId: string;
}

export const ProcessFlowSection: React.FC<ProcessFlowSectionProps> = ({
  courseId,
}) => {
  const [items, setItems] = useState<ProcessFlowItem[]>([]);
  const [forbidden, setForbidden] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<ProcessFlowItem | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ProcessFlowItem | null>(
    null,
  );
  const [removing, setRemoving] = useState<boolean>(false);

  const reload = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const result = await fetchProcessFlows(courseId);
      setForbidden(result.forbidden);
      setItems(result.items);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const { syncingIds, retry } = useBitableRetry('processFlow', reload);

  const handleAdd = (): void => {
    setEditingItem(null);
    setFormOpen(true);
  };

  const handleEdit = (item: ProcessFlowItem): void => {
    setEditingItem(item);
    setFormOpen(true);
  };

  const handleConfirmDelete = async (): Promise<void> => {
    if (!pendingDelete) return;
    setRemoving(true);
    try {
      await deleteProcessFlow(pendingDelete.id);
      toast.success('工艺流程已删除');
      setPendingDelete(null);
      await reload();
    } catch (error) {
      toast.error(extractErrorMessage(error));
    } finally {
      setRemoving(false);
    }
  };

  if (forbidden) {
    return null;
  }

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-base font-bold text-foreground">
          <ListOrdered className="size-4 text-primary" />
          工艺流程
        </h3>
        <Button size="sm" onClick={handleAdd} data-ai-section-type="button">
          <Plus className="size-4" />
          新增
        </Button>
      </div>
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : items.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          暂无工艺流程数据
        </p>
      ) : (
        <ol className="space-y-4">
          {items.map((item: ProcessFlowItem) => (
            <li
              key={item.id}
              className="rounded-lg border border-border bg-background/60 p-4"
            >
              <div className="flex flex-wrap items-center gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  {item.stepNo ?? '-'}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">
                    {item.stepName ?? '未命名步骤'}
                  </p>
                </div>
                <CourseSyncBadge
                  syncStatus={item.syncStatus}
                  isSyncing={syncingIds.includes(item.id)}
                  onRetry={() => void retry(item.id)}
                />
                {item.estimatedDuration ? (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="size-3.5" />
                    {item.estimatedDuration}
                  </span>
                ) : null}
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-muted-foreground hover:text-primary"
                    onClick={() => handleEdit(item)}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-muted-foreground hover:text-destructive"
                    onClick={() => setPendingDelete(item)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
              {item.operationDesc ? (
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {item.operationDesc}
                </p>
              ) : null}
              {item.keyControlPoint ? (
                <div className="mt-3 flex items-start gap-2 rounded-md bg-[hsl(38_85%_55%/0.15)] px-3 py-2.5 text-sm text-[hsl(38_85%_28%)]">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  <span>
                    <span className="font-semibold">关键控制点：</span>
                    {item.keyControlPoint}
                  </span>
                </div>
              ) : null}
              {item.operationVideo.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {item.operationVideo.map((videoUrl: string, index: number) => (
                    <UniversalLink
                      key={`${index}-${videoUrl}`}
                      to={videoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
                    >
                      <Video className="size-3.5" />
                      操作视频 {index + 1}
                    </UniversalLink>
                  ))}
                </div>
              ) : null}
            </li>
          ))}
        </ol>
      )}
      <ProcessFlowFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        courseId={courseId}
        initial={editingItem}
        onSuccess={reload}
      />
      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(nextOpen: boolean) => {
          if (!nextOpen && !removing) setPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除工艺流程</AlertDialogTitle>
            <AlertDialogDescription>
              确定删除步骤「{pendingDelete?.stepName ?? ''}」吗？删除后不可恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>取消</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={() => void handleConfirmDelete()}
              disabled={removing}
            >
              {removing && <Loader2 className="size-4 animate-spin" />}
              确认删除
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
