import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';

import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import { Label } from '@client/src/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@client/src/components/ui/dialog';
import { Textarea } from '@client/src/components/ui/textarea';
import { UserSelect } from '@client/src/components/business-ui/user-select';

import {
  borrowAsset,
  returnAsset,
  startRepair,
  completeRepair,
  startTransfer,
  completeTransfer,
  scrapAsset,
} from '@client/src/api/fixed-assets';
import {
  FIELD_CONFIGS,
  OPERATION_TITLE,
  EMPTY_FORM,
  type AssetOperationType,
  type OperationFormState,
  type FieldCfg,
} from './operation-config';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assetId: string | null;
  operationType: AssetOperationType | null;
  onSuccess: () => void;
}

const AssetOperationDialog = ({
  open,
  onOpenChange,
  assetId,
  operationType,
  onSuccess,
}: Props) => {
  const [form, setForm] = useState<OperationFormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) setForm(EMPTY_FORM);
  }, [open, operationType]);

  const setF = (k: keyof OperationFormState, v: string) =>
    setForm((p) => ({ ...p, [k]: v }));

  const validate = (configs: FieldCfg[]): boolean => {
    for (const f of configs) {
      if (f.required && !form[f.key].trim()) {
        toast.error(`请填写${f.label}`);
        return false;
      }
    }
    return true;
  };

  const executeOp = async () => {
    if (!assetId || !operationType) return;
    const f = form;
    switch (operationType) {
      case 'borrow':
        await borrowAsset(assetId, {
          targetUserId: f.targetUserId,
          expectedReturnDate: f.expectedReturnDate || undefined,
          reason: f.reason || undefined,
          remark: f.remark || undefined,
        });
        break;
      case 'return':
        await returnAsset(assetId, { remark: f.remark || undefined });
        break;
      case 'repair_start':
        await startRepair(assetId, {
          reason: f.reason,
          expectedDate: f.expectedDate || undefined,
          cost: f.cost ? Number(f.cost) : undefined,
          vendor: f.vendor || undefined,
          remark: f.remark || undefined,
        });
        break;
      case 'repair_complete':
        await completeRepair(assetId, {
          actualCost: f.actualCost ? Number(f.actualCost) : undefined,
          remark: f.remark || undefined,
        });
        break;
      case 'transfer_start':
        await startTransfer(assetId, {
          targetDepartment: f.targetDepartment || undefined,
          targetFloor: f.targetFloor || undefined,
          targetUserId: f.targetUserId || undefined,
          reason: f.reason || undefined,
          remark: f.remark || undefined,
        });
        break;
      case 'transfer_complete':
        await completeTransfer(assetId, { remark: f.remark || undefined });
        break;
      case 'scrap':
        await scrapAsset(assetId, {
          reason: f.reason,
          remark: f.remark || undefined,
        });
        break;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!operationType) return;
    const configs = FIELD_CONFIGS[operationType];
    if (!validate(configs)) return;
    setSubmitting(true);
    try {
      await executeOp();
      toast.success(`${OPERATION_TITLE[operationType]}成功`);
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      logger.error('operation failed', err);
      toast.error('操作失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const renderField = (cfg: FieldCfg) => {
    const wrap = (el: React.ReactNode) => (
      <div
        key={cfg.key}
        className={cfg.full ? 'col-span-2 space-y-1.5' : 'space-y-1.5'}
      >
        <Label>
          {cfg.label}
          {cfg.required && <span className="text-destructive ml-0.5">*</span>}
        </Label>
        {el}
      </div>
    );
    const v = form[cfg.key];
    switch (cfg.type) {
      case 'text':
        return wrap(
          <Input value={v} onChange={(e) => setF(cfg.key, e.target.value)} className="rounded-sm" />,
        );
      case 'number':
        return wrap(
          <Input
            type="number" min="0" step="0.01" value={v}
            onChange={(e) => setF(cfg.key, e.target.value)}
            placeholder="0.00"
            className="rounded-sm font-mono tabular-nums text-right"
          />,
        );
      case 'date':
        return wrap(
          <Input
            type="date" value={v}
            onChange={(e) => setF(cfg.key, e.target.value)}
            className="rounded-sm"
          />,
        );
      case 'textarea':
        return wrap(
          <Textarea
            value={v}
            onChange={(e) => setF(cfg.key, e.target.value)}
            placeholder={`请输入${cfg.label}`}
            className="rounded-sm min-h-[72px]"
          />,
        );
      case 'user':
        return wrap(
          <UserSelect
            value={v || null}
            onChange={(val) => setF(cfg.key, val || '')}
            placeholder={`请选择${cfg.label}`}
          />,
        );
    }
  };

  if (!operationType) return null;
  const configs = FIELD_CONFIGS[operationType];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-sm">
        <DialogHeader>
          <DialogTitle>{OPERATION_TITLE[operationType]}</DialogTitle>
          <DialogDescription className="text-xs">
            提交后资产状态将自动更新
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {configs.map(renderField)}
          </div>
          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-sm"
              disabled={submitting}
            >
              取消
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="rounded-sm"
              variant={operationType === 'scrap' ? 'destructive' : 'default'}
            >
              {submitting ? '提交中...' : '确认提交'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AssetOperationDialog;
