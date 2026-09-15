import { useState } from 'react';
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
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { products } from '@client/src/api';

interface ProductOfflineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productName: string;
  productId: string | null;
  onConfirmed: () => void;
}

export function ProductOfflineDialog({
  open,
  onOpenChange,
  productName,
  productId,
  onConfirmed,
}: ProductOfflineDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    if (!productId || isDeleting) return;
    setIsDeleting(true);
    try {
      await products.deleteProduct(productId);
      toast.success(`商品「${productName}」已删除`);
      onConfirmed();
      onOpenChange(false);
    } catch (err: unknown) {
      logger.error('删除商品失败:', String(err));
      toast.error('删除失败，请重试');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (isDeleting) return;
        onOpenChange(nextOpen);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>确认删除</AlertDialogTitle>
          <AlertDialogDescription className="text-sm">
            确定要从数据库中删除商品「{productName}
            」吗？删除后该商品及其所有库存数据将无法恢复。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>取消</AlertDialogCancel>
          <Button
            onClick={handleConfirm}
            disabled={isDeleting}
            size="sm"
          >
            {isDeleting && <Loader2 className="size-4 animate-spin mr-1.5" />}
            {isDeleting ? '删除中...' : '确定'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
