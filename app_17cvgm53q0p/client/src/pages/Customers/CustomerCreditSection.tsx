import { useCallback, useEffect, useState, type ChangeEvent, type FC } from 'react';
import { Settings } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@client/src/hooks/use-auth';
import {
  fetchCustomerCredit,
  fetchCustomerReceivableSummary,
  updateCustomerCredit,
} from '@/api/customer';
import type {
  CustomerCreditView,
  LedgerSummary,
} from '@shared/finance-contract';
import { extractErrorMessage, formatAmount } from './customer-utils';

/** 兼容 0-1 小数与 0-100 百分比两种 usedRatio 返回，输出 0-100 */
const toPercent = (ratio: number): number => {
  const value: number = ratio > 1 ? ratio : ratio * 100;
  return Math.min(100, Math.max(0, value));
};

interface CustomerCreditSectionProps {
  customerId: string;
}

/** 客户档案：信用额度卡片（含编辑）+ 应收欠款汇总，接口失败各自降级不显示 */
const CustomerCreditSection: FC<CustomerCreditSectionProps> = ({
  customerId,
}) => {
  const { hasPerm } = useAuth();
  const [credit, setCredit] = useState<CustomerCreditView | null>(null);
  const [receivable, setReceivable] = useState<LedgerSummary | null>(null);
  const [editOpen, setEditOpen] = useState<boolean>(false);
  const [limitInput, setLimitInput] = useState<string>('');
  const [ratioInput, setRatioInput] = useState<string>('');
  const [editError, setEditError] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    if (!customerId) return;
    let cancelled = false;
    setCredit(null);
    setReceivable(null);
    fetchCustomerCredit(customerId)
      .then((data: CustomerCreditView) => {
        if (!cancelled) setCredit(data);
      })
      .catch(() => {
        if (!cancelled) setCredit(null);
      });
    fetchCustomerReceivableSummary(customerId)
      .then((data: LedgerSummary) => {
        if (!cancelled) setReceivable(data);
      })
      .catch(() => {
        if (!cancelled) setReceivable(null);
      });
    return () => {
      cancelled = true;
    };
  }, [customerId]);

  const reloadCredit = useCallback((): void => {
    fetchCustomerCredit(customerId)
      .then((data: CustomerCreditView) => setCredit(data))
      .catch(() => undefined);
  }, [customerId]);

  const openEdit = (): void => {
    if (!credit) return;
    setLimitInput(String(credit.creditLimit));
    setRatioInput(String(credit.warningRatio || 80));
    setEditError('');
    setEditOpen(true);
  };

  const handleSave = async (): Promise<void> => {
    const limit: number = Number(limitInput);
    const ratio: number = Number(ratioInput);
    if (limitInput.trim() === '' || !Number.isFinite(limit) || limit < 0) {
      setEditError('信用额度须为大于等于 0 的数字');
      return;
    }
    if (!Number.isInteger(ratio) || ratio < 1 || ratio > 100) {
      setEditError('预警比例须为 1-100 的整数');
      return;
    }
    setSaving(true);
    try {
      await updateCustomerCredit(customerId, {
        creditLimit: limit,
        warningRatio: ratio,
      });
      toast.success('信用设置已更新');
      setEditOpen(false);
      reloadCredit();
    } catch (error: unknown) {
      toast.error(extractErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  if (!credit && !receivable) return null;

  const usedPercent: number = credit ? toPercent(credit.usedRatio) : 0;
  const barColor: string = credit?.overLimit
    ? 'bg-red-500'
    : credit?.warning
      ? 'bg-yellow-500'
      : 'bg-blue-500';

  return (
    <div className="space-y-6">
      {credit && (
        <div className="rounded-lg border p-4">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-foreground">信用额度</h4>
            <div className="flex items-center gap-2">
              {credit.overLimit ? (
                <span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700">
                  已超额
                </span>
              ) : credit.warning ? (
                <span className="rounded-full border border-yellow-200 bg-yellow-50 px-2.5 py-0.5 text-xs font-medium text-yellow-700">
                  接近额度
                </span>
              ) : null}
              {hasPerm('finance_credit_manage') && (
                <Button variant="outline" size="sm" onClick={openEdit}>
                  <Settings className="mr-1 h-3.5 w-3.5" />
                  设置
                </Button>
              )}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <div className="text-xs text-muted-foreground">信用额度</div>
              <div className="mt-1 text-base font-bold tabular-nums text-foreground">
                {credit.creditLimit > 0
                  ? formatAmount(credit.creditLimit)
                  : '未设置'}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">当前欠款</div>
              <div className="mt-1 text-base font-bold tabular-nums text-foreground">
                {formatAmount(credit.unpaidAmount)}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">剩余额度</div>
              <div
                className={`mt-1 text-base font-bold tabular-nums ${
                  credit.overLimit ? 'text-red-600' : 'text-foreground'
                }`}
              >
                {credit.creditLimit > 0
                  ? formatAmount(credit.remaining)
                  : '不限制'}
              </div>
            </div>
          </div>
          {credit.creditLimit > 0 && (
            <div className="mt-3">
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-2 rounded-full ${barColor}`}
                  style={{ width: `${usedPercent}%` }}
                />
              </div>
              <div className="mt-1 text-xs tabular-nums text-muted-foreground">
                已用 {usedPercent.toFixed(0)}%
              </div>
            </div>
          )}
        </div>
      )}

      {receivable && (
        <div className="rounded-lg border p-4">
          <h4 className="mb-3 text-sm font-semibold text-foreground">
            应收欠款
          </h4>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <div className="text-xs text-muted-foreground">总应收</div>
              <div className="mt-1 text-base font-bold tabular-nums text-foreground">
                {formatAmount(receivable.totalAmount)}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">已收</div>
              <div className="mt-1 text-base font-bold tabular-nums text-foreground">
                {formatAmount(receivable.receivedAmount)}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">未收</div>
              <div
                className={`mt-1 text-base font-bold tabular-nums ${
                  receivable.unpaidAmount > 0
                    ? 'text-red-600'
                    : 'text-foreground'
                }`}
              >
                {formatAmount(receivable.unpaidAmount)}
              </div>
            </div>
          </div>
        </div>
      )}

      <Dialog
        open={editOpen}
        onOpenChange={(next: boolean) => {
          if (!next) setEditOpen(false);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>信用额度设置</DialogTitle>
            <DialogDescription>
              信用额度为 0 表示不限制；已用比例达到预警比例时触发预警。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="credit-limit-input">信用额度</Label>
              <Input
                id="credit-limit-input"
                type="number"
                min={0}
                value={limitInput}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setLimitInput(e.target.value)
                }
                placeholder="0 表示不限制"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="credit-ratio-input">预警比例（%）</Label>
              <Input
                id="credit-ratio-input"
                type="number"
                min={1}
                max={100}
                value={ratioInput}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setRatioInput(e.target.value)
                }
                placeholder="默认 80"
              />
            </div>
            {editError && <p className="text-sm text-red-600">{editError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              取消
            </Button>
            <Button
              onClick={() => {
                void handleSave();
              }}
              disabled={saving}
            >
              {saving ? '保存中…' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CustomerCreditSection;
