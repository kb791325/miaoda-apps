import { useState } from 'react';
import { products } from '@client/src/api';
import { Button } from '@client/src/components/ui/button';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@client/src/components/ui/alert-dialog';
import {
  Trash2,
  Tag,
  ArrowUpToLine,
  ArrowDownToLine,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { ProductsCategoryDialog } from './ProductsCategoryDialog';

interface ProductsBulkBarProps {
  selectedIds: string[];
  categoryOptions: string[];
  onCompleted: () => void;
}

export function ProductsBulkBar({
  selectedIds,
  categoryOptions,
  onCompleted,
}: ProductsBulkBarProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [shelving, setShelving] = useState(false);

  const handleDeleteConfirm = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      const res = await products.bulkDeleteProducts(selectedIds);
      toast.success(`批量删除成功，共处理 ${res.successCount} 项`);
      setDeleteOpen(false);
      onCompleted();
    } catch (err: unknown) {
      logger.error('批量删除失败:', String(err));
      toast.error('批量删除失败');
    } finally {
      setDeleting(false);
    }
  };

  const handleShelf = async (onShelf: boolean) => {
    if (shelving) return;
    setShelving(true);
    try {
      const res = await products.bulkShelfProducts(selectedIds, onShelf);
      toast.success(
        `批量${onShelf ? '上架' : '下架'}成功，共处理 ${res.successCount} 项`,
      );
      onCompleted();
    } catch (err: unknown) {
      logger.error(`批量${onShelf ? '上架' : '下架'}失败:`, String(err));
      toast.error(`批量${onShelf ? '上架' : '下架'}失败`);
    } finally {
      setShelving(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 rounded-sm border border-border bg-muted/30 px-3 py-2 mb-3">
        <span className="text-sm text-muted-foreground">
          已选{' '}
          <span className="font-mono font-medium text-foreground">
            {selectedIds.length}
          </span>{' '}
          项
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="size-4 text-destructive" />
            批量删除
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCategoryOpen(true)}
          >
            <Tag className="size-4" />
            修改品类
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={shelving}
            onClick={() => handleShelf(true)}
          >
            {shelving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ArrowUpToLine className="size-4" />
            )}
            上架
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={shelving}
            onClick={() => handleShelf(false)}
          >
            <ArrowDownToLine className="size-4" />
            下架
          </Button>
        </div>
      </div>

      <AlertDialog
        open={deleteOpen}
        onOpenChange={(nextOpen: boolean) => {
          if (deleting) return;
          setDeleteOpen(nextOpen);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认批量删除</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              确定要删除选中的 {selectedIds.length}{' '}
              个商品吗？删除后商品将下架并移入回收站，可稍后在回收站中恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>取消</AlertDialogCancel>
            <Button onClick={handleDeleteConfirm} disabled={deleting} size="sm">
              {deleting && <Loader2 className="size-4 animate-spin mr-1.5" />}
              {deleting ? '删除中...' : '确定删除'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ProductsCategoryDialog
        open={categoryOpen}
        onOpenChange={setCategoryOpen}
        selectedIds={selectedIds}
        categoryOptions={categoryOptions}
        onCompleted={onCompleted}
      />
    </>
  );
}
