import { useState, useMemo } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@client/src/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@client/src/components/ui/dialog';
import { Input } from '@client/src/components/ui/input';
import { Label } from '@client/src/components/ui/label';
import { Textarea } from '@client/src/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import type { CategoryL1Item, CategoryItem, BatchOperationResult } from '@shared/api.interface';

export type BatchDialogType = 'category' | 'department' | null;

interface BatchDialogsProps {
  open: BatchDialogType;
  onOpenChange: (type: BatchDialogType) => void;
  selectedIds: string[];
  categoriesL1: CategoryL1Item[];
  categoriesL2: CategoryItem[];
  filterL1: string;
  onUpdateCategory: (
    ids: string[],
    categoryL1: string,
    categoryL2: string,
  ) => Promise<BatchOperationResult>;
  onUpdateDepartment: (ids: string[], department: string) => Promise<BatchOperationResult>;
  onSuccess: () => void;
  actionLabels: { category: string; department: string };
}

const showBatchToast = (
  successCount: number,
  failedCount: number,
  failedItems: Array<{ id: string; reason: string }>,
  actionLabel: string,
) => {
  if (failedCount === 0) {
    toast.success(`${actionLabel}成功 ${successCount} 条`);
  } else {
    toast(
      <div className="space-y-2">
        <div className="font-medium">
          {actionLabel}完成：成功 {successCount} 条，失败 {failedCount} 条
        </div>
        <div className="max-h-48 overflow-y-auto space-y-1">
          {failedItems.slice(0, 5).map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-2 text-xs text-muted-foreground"
            >
              <AlertTriangle className="mt-0.5 h-3 w-3 flex-shrink-0 text-destructive" />
              <span className="font-mono">{item.id}</span>
              <span>{item.reason}</span>
            </div>
          ))}
          {failedItems.length > 5 && (
            <div className="text-xs text-muted-foreground">
              还有 {failedItems.length - 5} 条失败...
            </div>
          )}
        </div>
      </div>,
    );
  }
};

const BatchDialogs = ({
  open,
  onOpenChange,
  selectedIds,
  categoriesL1,
  categoriesL2,
  filterL1,
  onUpdateCategory,
  onUpdateDepartment,
  onSuccess,
  actionLabels,
}: BatchDialogsProps) => {
  const [batchCategoryL1, setBatchCategoryL1] = useState('');
  const [batchCategoryL2, setBatchCategoryL2] = useState('');
  const [batchDepartment, setBatchDepartment] = useState('');
  const [acting, setActing] = useState(false);

  const l2Options = useMemo(() => {
    if (!batchCategoryL1) return categoriesL2;
    return categoriesL2.filter((c: CategoryItem) => c.categoryL1 === batchCategoryL1);
  }, [batchCategoryL1, categoriesL2]);

  const handleOpen = (type: BatchDialogType) => {
    if (type === 'category') {
      setBatchCategoryL1(filterL1 || '');
      setBatchCategoryL2('');
    } else if (type === 'department') {
      setBatchDepartment('');
    }
    onOpenChange(type);
  };

  const runBatch = async (fn: () => Promise<BatchOperationResult>, label: string) => {
    setActing(true);
    try {
      const result = await fn();
      showBatchToast(result.successCount, result.failedCount, result.failedItems, label);
      if (result.successCount > 0) {
        onSuccess();
      }
      onOpenChange(null);
    } catch (err: unknown) {
      logger.error('批量操作失败', err);
      toast.error('操作失败');
    } finally {
      setActing(false);
    }
  };

  const handleCategory = () => {
    if (!batchCategoryL1 || !batchCategoryL2) {
      toast.error('请选择一级和二级类目');
      return;
    }
    runBatch(
      () => onUpdateCategory(selectedIds, batchCategoryL1, batchCategoryL2),
      actionLabels.category,
    );
  };

  const handleDepartment = () => {
    if (!batchDepartment.trim()) {
      toast.error('请输入部门名称');
      return;
    }
    runBatch(() => onUpdateDepartment(selectedIds, batchDepartment), actionLabels.department);
  };

  return (
    <>
      {/* 修改类目 */}
      <Dialog open={open === 'category'} onOpenChange={(v) => !v && handleOpen(null)}>
        <DialogContent className="rounded-sm sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>{actionLabels.category}</DialogTitle>
            <DialogDescription>
              已选择 {selectedIds.length} 条记录，请选择新的类目。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>一级类目</Label>
              <Select
                value={batchCategoryL1}
                onValueChange={(v) => {
                  setBatchCategoryL1(v);
                  setBatchCategoryL2('');
                }}
              >
                <SelectTrigger><SelectValue placeholder="请选择一级类目" /></SelectTrigger>
                <SelectContent>
                  {categoriesL1.map((c: CategoryL1Item) => (
                    <SelectItem key={c.id} value={c.categoryL1}>
                      {c.categoryL1}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>二级类目</Label>
              <Select
                value={batchCategoryL2}
                onValueChange={setBatchCategoryL2}
                disabled={!batchCategoryL1}
              >
                <SelectTrigger><SelectValue placeholder="请选择二级类目" /></SelectTrigger>
                <SelectContent>
                  {l2Options.map((c: CategoryItem) => (
                    <SelectItem key={c.id} value={c.categoryL2}>
                      {c.categoryL2}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={acting}>取消</Button>
            </DialogClose>
            <Button
              onClick={handleCategory}
              disabled={acting || !batchCategoryL1 || !batchCategoryL2}
            >
              {acting ? '处理中...' : '确认修改'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 修改部门 */}
      <Dialog open={open === 'department'} onOpenChange={(v) => !v && handleOpen(null)}>
        <DialogContent className="rounded-sm sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>{actionLabels.department}</DialogTitle>
            <DialogDescription>
              已选择 {selectedIds.length} 条记录，请输入新的部门名称。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>部门名称</Label>
            <Input
              value={batchDepartment}
              onChange={(e) => setBatchDepartment(e.target.value)}
              placeholder="请输入部门名称"
              autoFocus
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={acting}>取消</Button>
            </DialogClose>
            <Button
              onClick={handleDepartment}
              disabled={acting || !batchDepartment.trim()}
            >
              {acting ? '处理中...' : '确认修改'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BatchDialogs;
