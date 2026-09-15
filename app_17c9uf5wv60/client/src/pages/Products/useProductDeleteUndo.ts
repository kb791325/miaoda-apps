import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { undoOperation } from '@client/src/api/undo';

export interface DeletedProductInfo {
  id: string;
  name: string;
}

export function useProductDeleteUndo(onRestored: () => void) {
  const [undoProduct, setUndoProduct] =
    useState<DeletedProductInfo | null>(null);
  const [undoing, setUndoing] = useState<boolean>(false);

  const notifyDeleted = useCallback((product: DeletedProductInfo): void => {
    setUndoProduct(product);
  }, []);

  const dismissUndo = useCallback((): void => {
    setUndoProduct(null);
  }, []);

  const handleUndo = useCallback(async (): Promise<void> => {
    if (!undoProduct || undoing) return;
    setUndoing(true);
    try {
      const res = await undoOperation({
        action: 'product_delete',
        targetId: undoProduct.id,
      });
      if (res.success) {
        toast.success(res.message);
        setUndoProduct(null);
        onRestored();
      } else {
        toast.error(res.message || '撤销失败，请重试');
      }
    } catch (err: unknown) {
      logger.error('撤销删除失败:', String(err));
      toast.error('撤销失败，请重试');
    } finally {
      setUndoing(false);
    }
  }, [undoProduct, undoing, onRestored]);

  return { undoProduct, undoing, notifyDeleted, dismissUndo, handleUndo };
}
