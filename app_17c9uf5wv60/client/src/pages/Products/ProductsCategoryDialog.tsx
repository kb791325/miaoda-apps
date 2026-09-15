import { useState } from 'react';
import { products } from '@client/src/api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@client/src/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import { Button } from '@client/src/components/ui/button';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';

interface ProductsCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIds: string[];
  categoryOptions: string[];
  onCompleted: () => void;
}

export function ProductsCategoryDialog({
  open,
  onOpenChange,
  selectedIds,
  categoryOptions,
  onCompleted,
}: ProductsCategoryDialogProps) {
  const [category, setCategory] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (!category || submitting) return;
    setSubmitting(true);
    try {
      const res = await products.bulkUpdateCategory(selectedIds, category);
      toast.success(`品类修改成功，共处理 ${res.successCount} 项`);
      setCategory('');
      onCompleted();
      onOpenChange(false);
    } catch (err: unknown) {
      logger.error('批量修改品类失败:', String(err));
      toast.error('批量修改品类失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen: boolean) => {
        if (submitting) return;
        if (!nextOpen) setCategory('');
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="rounded-sm shadow-none">
        <DialogHeader>
          <DialogTitle>批量修改品类</DialogTitle>
          <DialogDescription>
            将为选中的 {selectedIds.length} 个商品统一修改品类。
          </DialogDescription>
        </DialogHeader>
        <div className="py-2">
          <Select
            value={category}
            onValueChange={(val: string) => setCategory(val)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="请选择品类" />
            </SelectTrigger>
            <SelectContent>
              {categoryOptions.map((name: string) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            disabled={submitting}
            onClick={() => onOpenChange(false)}
          >
            取消
          </Button>
          <Button
            size="sm"
            disabled={!category || submitting}
            onClick={handleConfirm}
          >
            {submitting && <Loader2 className="size-4 animate-spin" />}
            确认
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
