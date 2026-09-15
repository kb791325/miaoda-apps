import React from 'react';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

import type { FeeType } from '@shared/fee';

import {
  createFeeType,
  deleteFeeType,
  fetchFeeTypes,
} from '@client/src/api/fee';

import { extractErrorMessage } from './order-utils';

export interface FeeTypeDialogProps {
  open: boolean;
  onClose: () => void;
  onChanged?: () => void;
}

const PRESET_BADGE_CLASS =
  'border-[hsl(217_91%_60%_/_0.3)] bg-[hsl(217_91%_95%)] text-[hsl(217_91%_40%)]';

const FeeTypeDialog: React.FC<FeeTypeDialogProps> = ({
  open,
  onClose,
  onChanged,
}) => {
  const [feeTypes, setFeeTypes] = React.useState<FeeType[]>([]);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [name, setName] = React.useState<string>('');
  const [adding, setAdding] = React.useState<boolean>(false);

  const loadFeeTypes = React.useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const res = await fetchFeeTypes();
      setFeeTypes(res.items);
    } catch (error: unknown) {
      toast.error(extractErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (!open) return;
    void loadFeeTypes();
  }, [open, loadFeeTypes]);

  const handleAdd = async (): Promise<void> => {
    const trimmed: string = name.trim();
    if (!trimmed) return;
    setAdding(true);
    try {
      await createFeeType({ name: trimmed });
      setName('');
      toast.success('费用类型已添加');
      await loadFeeTypes();
      onChanged?.();
    } catch (error: unknown) {
      toast.error(extractErrorMessage(error));
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (feeType: FeeType): Promise<void> => {
    try {
      await deleteFeeType(feeType.id);
      toast.success('费用类型已删除');
      await loadFeeTypes();
      onChanged?.();
    } catch (error: unknown) {
      toast.error(extractErrorMessage(error));
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen: boolean) => {
        if (!nextOpen) onClose();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>管理费用类型</DialogTitle>
          <DialogDescription>
            预设类型不可删除，自定义类型被订单费用使用时也不可删除。
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-72 space-y-2 overflow-y-auto">
          {loading &&
            [1, 2, 3].map((n: number) => (
              <Skeleton key={n} className="h-9 w-full" />
            ))}
          {!loading && feeTypes.length === 0 && (
            <p className="rounded-lg border p-4 text-center text-sm text-muted-foreground">
              暂无费用类型，请在下方添加
            </p>
          )}
          {!loading &&
            feeTypes.map((feeType: FeeType) => (
              <div
                key={feeType.id}
                className="flex items-center justify-between rounded-lg border px-3 py-2"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className="truncate text-sm">{feeType.name}</span>
                  {feeType.isDefault && (
                    <Badge
                      variant="outline"
                      className={PRESET_BADGE_CLASS}
                    >
                      预设
                    </Badge>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() => {
                    void handleDelete(feeType);
                  }}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ))}
        </div>

        <div className="flex items-center gap-2">
          <Input
            value={name}
            placeholder="请输入费用类型名称"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setName(e.target.value)
            }
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void handleAdd();
              }
            }}
          />
          <Button
            disabled={adding || name.trim() === ''}
            onClick={() => {
              void handleAdd();
            }}
          >
            {adding ? '添加中…' : '添加'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FeeTypeDialog;
