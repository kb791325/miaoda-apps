import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  UtensilsCrossed,
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
import { Input } from '@client/src/components/ui/input';
import { Skeleton } from '@client/src/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@client/src/components/ui/table';
import { useBitableRetry } from '@client/src/hooks/use-bitable-retry';
import type { FormulaItem } from '@shared/course';
import { deleteFormula, fetchFormulas } from './course.api';
import { CourseSyncBadge } from './CourseSyncBadge';
import { extractErrorMessage } from './course-form';
import { FormulaFormDialog } from './FormulaFormDialog';

interface FormulaSectionProps {
  courseId: string;
}

export const FormulaSection: React.FC<FormulaSectionProps> = ({ courseId }) => {
  const [keywordInput, setKeywordInput] = useState<string>('');
  const [keyword, setKeyword] = useState<string>('');
  const [items, setItems] = useState<FormulaItem[]>([]);
  const [forbidden, setForbidden] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<FormulaItem | null>(null);
  const [pendingDelete, setPendingDelete] = useState<FormulaItem | null>(null);
  const [removing, setRemoving] = useState<boolean>(false);

  useEffect(() => {
    const timer = setTimeout(() => setKeyword(keywordInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [keywordInput]);

  const reload = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const result = await fetchFormulas(courseId, keyword || undefined);
      setForbidden(result.forbidden);
      setItems(result.items);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [courseId, keyword]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const { syncingIds, retry } = useBitableRetry('formula', reload);

  const handleAdd = (): void => {
    setEditingItem(null);
    setFormOpen(true);
  };

  const handleEdit = (item: FormulaItem): void => {
    setEditingItem(item);
    setFormOpen(true);
  };

  const handleConfirmDelete = async (): Promise<void> => {
    if (!pendingDelete) return;
    setRemoving(true);
    try {
      await deleteFormula(pendingDelete.id);
      toast.success('配方明细已删除');
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
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="flex items-center gap-2 text-base font-bold text-foreground">
            <UtensilsCrossed className="size-4 text-primary" />
            配方明细
          </h3>
          <Button size="sm" onClick={handleAdd} data-ai-section-type="button">
            <Plus className="size-4" />
            新增
          </Button>
        </div>
        <div className="relative w-full sm:w-56">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={keywordInput}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
              setKeywordInput(event.target.value)
            }
            placeholder="搜索食材名称"
            className="pl-9"
          />
        </div>
      </div>
      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      ) : items.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          暂无配方明细数据
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow className="bg-accent/40">
                <TableHead>食材名称</TableHead>
                <TableHead>用量</TableHead>
                <TableHead>单位</TableHead>
                <TableHead>食材分类</TableHead>
                <TableHead>备注</TableHead>
                <TableHead>同步状态</TableHead>
                <TableHead className="w-24">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item: FormulaItem) => (
                <TableRow
                  key={item.id}
                  className="even:bg-muted/30 hover:bg-accent/30"
                >
                  <TableCell className="font-medium text-foreground">
                    {item.ingredientName ?? '-'}
                  </TableCell>
                  <TableCell>{item.quantity ?? '-'}</TableCell>
                  <TableCell>{item.unit ?? '-'}</TableCell>
                  <TableCell>{item.ingredientCategory ?? '-'}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {item.remark ?? '-'}
                  </TableCell>
                  <TableCell>
                    <CourseSyncBadge
                      syncStatus={item.syncStatus}
                      isSyncing={syncingIds.includes(item.id)}
                      onRetry={() => void retry(item.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
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
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <FormulaFormDialog
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
            <AlertDialogTitle>删除配方明细</AlertDialogTitle>
            <AlertDialogDescription>
              确定删除食材「{pendingDelete?.ingredientName ?? ''}」吗？删除后不可恢复。
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
