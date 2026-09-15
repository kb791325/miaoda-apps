import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Pencil, Plus, Trash2, Wrench } from 'lucide-react';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@client/src/components/ui/table';
import { useBitableRetry } from '@client/src/hooks/use-bitable-retry';
import { CourseSyncBadge } from './CourseSyncBadge';
import type { EquipmentItem } from '@shared/course';
import { deleteEquipment, fetchEquipments } from './course.api';
import { extractErrorMessage } from './course-form';
import { EquipmentFormDialog } from './EquipmentFormDialog';

interface EquipmentSectionProps {
  courseId: string;
}

export const EquipmentSection: React.FC<EquipmentSectionProps> = ({
  courseId,
}) => {
  const [items, setItems] = useState<EquipmentItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<EquipmentItem | null>(null);
  const [pendingDelete, setPendingDelete] = useState<EquipmentItem | null>(
    null,
  );
  const [removing, setRemoving] = useState<boolean>(false);

  const reload = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const result: EquipmentItem[] = await fetchEquipments(courseId);
      setItems(result);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const { syncingIds, retry } = useBitableRetry('equipment', reload);

  const handleAdd = (): void => {
    setEditingItem(null);
    setFormOpen(true);
  };

  const handleEdit = (item: EquipmentItem): void => {
    setEditingItem(item);
    setFormOpen(true);
  };

  const handleConfirmDelete = async (): Promise<void> => {
    if (!pendingDelete) return;
    setRemoving(true);
    try {
      await deleteEquipment(pendingDelete.id);
      toast.success('设备工具已删除');
      setPendingDelete(null);
      await reload();
    } catch (error) {
      toast.error(extractErrorMessage(error));
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-base font-bold text-foreground">
          <Wrench className="size-4 text-primary" />
          设备工具清单
        </h3>
        <Button size="sm" onClick={handleAdd} data-ai-section-type="button">
          <Plus className="size-4" />
          新增
        </Button>
      </div>
      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      ) : items.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          暂无设备工具数据
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow className="bg-accent/40">
                <TableHead>名称</TableHead>
                <TableHead>规格</TableHead>
                <TableHead>数量</TableHead>
                <TableHead>备注</TableHead>
                <TableHead>同步状态</TableHead>
                <TableHead className="w-24">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item: EquipmentItem) => (
                <TableRow
                  key={item.id}
                  className="even:bg-muted/30 hover:bg-accent/30"
                >
                  <TableCell className="font-medium text-foreground">
                    {item.equipmentToolName ?? '-'}
                  </TableCell>
                  <TableCell>{item.specification ?? '-'}</TableCell>
                  <TableCell>{item.quantity ?? '-'}</TableCell>
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
      <EquipmentFormDialog
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
            <AlertDialogTitle>删除设备工具</AlertDialogTitle>
            <AlertDialogDescription>
              确定删除器材「{pendingDelete?.equipmentToolName ?? ''}」吗？删除后不可恢复。
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
