import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, Save } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import DraftBanner from '@/components/DraftBanner';
import { useFormDraft } from '@/hooks/useFormDraft';
import { useApp } from '@/context/AppContext';
import { purchaseReqsApi } from '@/api';
import { formatAmount } from '@/lib/format';

interface PurchaseItem {
  name: string;
  spec: string;
  quantity: number;
  unit_price: number;
}

interface PurchaseFormData {
  reason: string;
  expectedDate: string;
  remark: string;
  items: PurchaseItem[];
}

interface PurchaseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  /** 编辑回填（可选） */
  initialData?: Partial<PurchaseFormData> | null;
  /** 编辑模式的记录 ID */
  editRecordId?: string | number | null;
  draftBusinessId?: string;
}

const emptyItem = (): PurchaseItem => ({ name: '', spec: '', quantity: 1, unit_price: 0 });

const EMPTY_FORM: PurchaseFormData = {
  reason: '',
  expectedDate: '',
  remark: '',
  items: [emptyItem()],
};

export default function PurchaseFormDialog({
  open,
  onOpenChange,
  onSuccess,
  initialData,
  editRecordId,
  draftBusinessId = 'new',
}: PurchaseFormDialogProps) {
  const isEdit = !!editRecordId;
  const { user } = useApp();
  const [form, setForm] = useState<PurchaseFormData>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);

  // 草稿
  const draftHook = useFormDraft('purchase', draftBusinessId, {
    getSummary: (data) => {
      const d = data as PurchaseFormData;
      return d.reason || '';
    },
  });

  // 防抖自动保存
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!open) return;
    if (!form.reason.trim() && form.items.every(i => !i.name.trim())) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      draftHook.scheduleAutoSave(form as any);
    }, 1500);
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [form, open, draftHook.scheduleAutoSave]);

  // 打开时回填
  useEffect(() => {
    if (!open) return;
    if (initialData) {
      setForm({ ...EMPTY_FORM, ...initialData, items: initialData.items?.length ? initialData.items : [emptyItem()] });
      return;
    }
    if (draftHook.hasDraft && draftHook.draft?.data) {
      // 有草稿，保持原状，等用户点恢复
      return;
    }
    setForm(EMPTY_FORM);
    setErrors({});
  }, [open, initialData, draftHook.hasDraft, draftHook.draft?.data]);

  const totalAmount = useMemo(() => {
    return form.items.reduce((sum, it) => {
      const q = Number(it.quantity) || 0;
      const p = Number(it.unit_price) || 0;
      return sum + q * p;
    }, 0);
  }, [form.items]);

  const addItem = () => {
    setForm((prev) => ({ ...prev, items: [...prev.items, emptyItem()] }));
  };

  const removeItem = (idx: number) => {
    if (form.items.length <= 1) return;
    setForm((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }));
  };

  const updateItem = (idx: number, key: keyof PurchaseItem, value: string | number) => {
    setForm((prev) => {
      const next = [...prev.items];
      next[idx] = { ...next[idx], [key]: value };
      return { ...prev, items: next };
    });
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.reason.trim()) errs.reason = '请填写申请事由';
    const validItems = form.items.filter(it => it.name.trim() || it.quantity > 0 || it.unit_price > 0);
    if (validItems.length === 0) {
      errs.items = '请至少添加一条采购物品';
    } else {
      validItems.forEach((it, i) => {
        if (!it.name.trim()) errs[`item_${i}_name`] = '请填写物品名称';
        if (!it.quantity || it.quantity <= 0) errs[`item_${i}_qty`] = '数量必须大于0';
        if (it.unit_price < 0) errs[`item_${i}_price`] = '单价不能为负';
      });
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const doSubmit = useCallback(async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const validItems = form.items
        .filter(it => it.name.trim())
        .map(it => ({
          name: it.name.trim(),
          spec: it.spec.trim(),
          quantity: Number(it.quantity) || 0,
          unit_price: Number(it.unit_price) || 0,
          subtotal: (Number(it.quantity) || 0) * (Number(it.unit_price) || 0),
        }));
      const payload: Record<string, unknown> = {
        reason: form.reason.trim(),
        items: validItems,
        total_amount: totalAmount,
        expected_date: form.expectedDate || undefined,
        remark: form.remark.trim() || undefined,
      };
      if (!isEdit) {
        const now = new Date();
        const pad = (n: number) => String(n).padStart(2, '0');
        const reqNo = `SQ${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
        Object.assign(payload, {
          req_no: reqNo,
          applicant_id: user?.id,
          applicant_name: user?.name || '当前用户',
          department: user?.department || '未分配',
          status: '待审批',
        });
      }
      const res = isEdit
        ? await purchaseReqsApi.update(editRecordId, payload)
        : await purchaseReqsApi.create(payload);
      if (res.code === 0) {
        toast.success(isEdit ? '采购申请已更新' : '采购申请已提交，等待审批');
        draftHook.clearDraft();
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error(res.message || (isEdit ? '保存失败' : '提交失败'));
      }
    } catch {
      toast.error('提交失败');
    } finally {
      setSubmitting(false);
    }
  }, [form, totalAmount, user, onOpenChange, onSuccess, draftHook.clearDraft]);

  const handleSubmit = async () => {
    if (!validate()) return;
    // 大额（≥1万）弹确认
    if (totalAmount >= 10000) {
      setConfirmOpen(true);
      return;
    }
    await doSubmit();
  };

  const handleSaveDraft = () => {
    draftHook.saveDraft(form as any);
    toast.success('草稿已保存');
  };

  const handleRestore = () => {
    if (!draftHook.draft?.data) return;
    setForm(draftHook.draft.data as PurchaseFormData);
    toast.success('已恢复草稿');
  };

  const handleDiscard = () => {
    draftHook.clearDraft();
    setForm(EMPTY_FORM);
    setErrors({});
    toast.info('已丢弃草稿');
  };

  const showDraftBanner = open && !initialData && draftHook.hasDraft;

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !submitting && onOpenChange(o)}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEdit ? '编辑采购申请' : '新建采购申请'}</DialogTitle>
            <DialogDescription>{isEdit ? '修改采购申请信息后重新提交' : '填写采购需求明细，提交后将进入审批流程'}</DialogDescription>
          </DialogHeader>

          {showDraftBanner && (
            <DraftBanner
              savedAt={draftHook.draft?.savedAt}
              onRestore={handleRestore}
              onDiscard={handleDiscard}
            />
          )}

          <div className="space-y-5">
            {/* 申请事由 */}
            <div className="space-y-2">
              <Label htmlFor="purchase-reason">
                申请事由 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="purchase-reason"
                value={form.reason}
                onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))}
                placeholder="如：办公耗材采购、会议室设备升级等"
              />
              {errors.reason && <p className="text-xs text-red-500">{errors.reason}</p>}
            </div>

            {/* 期望日期 + 备注 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="purchase-expected-date">期望到货日期</Label>
                <Input
                  id="purchase-expected-date"
                  type="date"
                  value={form.expectedDate}
                  onChange={(e) => setForm((p) => ({ ...p, expectedDate: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="purchase-remark">备注</Label>
                <Input
                  id="purchase-remark"
                  value={form.remark}
                  onChange={(e) => setForm((p) => ({ ...p, remark: e.target.value }))}
                  placeholder="选填"
                />
              </div>
            </div>

            {/* 物品明细表格 */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">
                  采购物品明细 <span className="text-red-500">*</span>
                </Label>
                <Button size="sm" variant="secondary" type="button" onClick={addItem}>
                  <Plus className="mr-1 size-3.5" /> 添加行
                </Button>
              </div>

              {errors.items && <p className="text-xs text-red-500">{errors.items}</p>}

              <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-muted-foreground">
                    <tr>
                      <th className="w-[30%] px-3 py-2 text-left font-medium">物品名称</th>
                      <th className="w-[20%] px-3 py-2 text-left font-medium">规格</th>
                      <th className="w-[15%] px-3 py-2 text-right font-medium">数量</th>
                      <th className="w-[15%] px-3 py-2 text-right font-medium">单价</th>
                      <th className="w-[15%] px-3 py-2 text-right font-medium">小计</th>
                      <th className="w-[50px] px-2 py-2 text-center font-medium">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.items.map((item, idx) => {
                      const subtotal = (Number(item.quantity) || 0) * (Number(item.unit_price) || 0);
                      return (
                        <tr key={idx} className="border-t">
                          <td className="px-2 py-2">
                            <Input
                              value={item.name}
                              onChange={(e) => updateItem(idx, 'name', e.target.value)}
                              placeholder="物品名称"
                              className="h-8"
                            />
                            {errors[`item_${idx}_name`] && (
                              <p className="mt-1 text-xs text-red-500">{errors[`item_${idx}_name`]}</p>
                            )}
                          </td>
                          <td className="px-2 py-2">
                            <Input
                              value={item.spec}
                              onChange={(e) => updateItem(idx, 'spec', e.target.value)}
                              placeholder="规格"
                              className="h-8"
                            />
                          </td>
                          <td className="px-2 py-2 text-right">
                            <Input
                              type="number"
                              min={1}
                              value={item.quantity}
                              onChange={(e) => updateItem(idx, 'quantity', Number(e.target.value) || 0)}
                              className="h-8 text-right tabular-nums"
                            />
                            {errors[`item_${idx}_qty`] && (
                              <p className="mt-1 text-xs text-red-500 text-left">{errors[`item_${idx}_qty`]}</p>
                            )}
                          </td>
                          <td className="px-2 py-2 text-right">
                            <Input
                              type="number"
                              min={0}
                              step={0.01}
                              value={item.unit_price}
                              onChange={(e) => updateItem(idx, 'unit_price', Number(e.target.value) || 0)}
                              className="h-8 text-right tabular-nums"
                            />
                          </td>
                          <td className="px-3 py-2 text-right font-medium tabular-nums">
                            {formatAmount(subtotal)}
                          </td>
                          <td className="px-2 py-2 text-center">
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              onClick={() => removeItem(idx)}
                              disabled={form.items.length <= 1}
                              className="h-8 w-8 text-muted-foreground hover:text-red-600"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="border-t bg-muted/30">
                    <tr>
                      <td colSpan={4} className="px-3 py-2 text-right font-medium">合计金额</td>
                      <td className="px-3 py-2 text-right text-lg font-bold text-primary tabular-nums">
                        {formatAmount(totalAmount)}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>

              <p className="text-xs text-muted-foreground">
                注：金额＜5000 元由部门经理审批；≥5000 元由部门经理→总经理两级审批
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={submitting}>
              取消
            </Button>
            <Button variant="outline" onClick={handleSaveDraft} disabled={submitting}>
              <Save className="mr-1 size-3.5" /> 保存草稿
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? '提交中...' : '提交申请'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 大额确认 */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认提交采购申请？</AlertDialogTitle>
            <AlertDialogDescription>
              提交后将进入审批流程，请确认以下信息：
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 rounded-lg border p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">申请事由</span>
              <span className="font-medium">{form.reason || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">物品种类</span>
              <span className="font-medium">{form.items.filter(i => i.name.trim()).length} 项</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">合计金额</span>
              <span className="font-bold text-primary tabular-nums">{formatAmount(totalAmount)}</span>
            </div>
            {form.expectedDate && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">期望到货日期</span>
                <span>{form.expectedDate}</span>
              </div>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmOpen(false);
                doSubmit();
              }}
              disabled={submitting}
            >
              确认提交
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
