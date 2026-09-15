import { useState, useEffect, useRef, useMemo } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { useCurrentUserProfile } from '@lark-apaas/client-toolkit/hooks/useCurrentUserProfile';
import { toast } from 'sonner';
import { Package, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@client/src/components/ui/dialog';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import { Label } from '@client/src/components/ui/label';
import { Textarea } from '@client/src/components/ui/textarea';
import { Checkbox } from '@client/src/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import type {
  ExpenseDetail,
  CreateExpenseDto,
  CategoryL1Item,
  CategoryItem,
  ExpenseAssetLinkDto,
} from '@shared/api.interface';
import { isFixedAsset, inferAssetType } from '@shared/asset-utils';
import * as expensesApi from '@client/src/api/expenses';
import * as categoriesApi from '@client/src/api/categories';
import {
  PAYER_ENTITY_OPTIONS,
  FLOOR_OPTIONS,
  DEPARTMENT_OPTIONS,
  PURCHASE_DEPARTMENT_OPTIONS,
} from '@client/src/utils/form-options';
import { UserDisplay } from '@client/src/components/business-ui/user-display';
import { UserSelect } from '@client/src/components/business-ui/user-select';
import FileUploadField from '@client/src/components/ui/file-upload-field';
import FileUploader from '@client/src/components/FileUpload/FileUploader';
import AttachmentList from '@client/src/components/FileUpload/AttachmentList';
import * as attachmentsApi from '@client/src/api/attachments';
import type { AttachmentItem } from '@shared/api.interface';

interface ExpenseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense: ExpenseDetail | null;
  onSaved: () => void;
}

const todayStr = (): string => new Date().toISOString().split('T')[0];

const emptyForm: CreateExpenseDto = {
  expenseDate: todayStr(),
  amount: 0,
  categoryL1: '',
  categoryL2: '',
  payerEntity: '',
  floor: '',
  department: '',
  purchaseDepartment: '',
  description: '',
  handler: '',
  invoiceUrl: '',
  screenshotUrl: '',
};

 const emptyAssetForm: ExpenseAssetLinkDto = {
   assetName: '',
   assetType: '',
   owner: '',
   currentStock: 1,
 };

const ExpenseFormDialog = ({
  open,
  onOpenChange,
  expense,
  onSaved,
}: ExpenseFormDialogProps) => {
  const [form, setForm] = useState<CreateExpenseDto>(emptyForm);
  const [isAutoAsset, setIsAutoAsset] = useState(false);
  const [skipAsset, setSkipAsset] = useState(false);
  const [assetForm, setAssetForm] = useState<ExpenseAssetLinkDto>(emptyAssetForm);
  const [assetSectionOpen, setAssetSectionOpen] = useState(true);
  const [categoriesL1, setCategoriesL1] = useState<CategoryL1Item[]>([]);
  const [categoriesL2, setCategoriesL2] = useState<CategoryItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);

  const isEdit = !!expense;
  const currentUser = useCurrentUserProfile();

  const showAssetSection = isAutoAsset && !skipAsset && !isEdit;

  useEffect(() => {
    categoriesApi.getCategoriesL1().then(setCategoriesL1).catch((err: unknown) => {
      logger.error('加载一级类目失败', err);
    });
  }, []);

  const hasInitializedRef = useRef(false);

  useEffect(() => {
    if (!open) {
      hasInitializedRef.current = false;
      return;
    }
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    if (isEdit && expense) {
      setForm({
        expenseDate: expense.expenseDate,
        amount: expense.amount,
        categoryL1: expense.categoryL1,
        categoryL2: expense.categoryL2,
        payerEntity: expense.payerEntity,
        floor: expense.floor,
        department: expense.department,
        purchaseDepartment: expense.purchaseDepartment,
        description: expense.description,
        handler: expense.handler,
        invoiceUrl: expense.invoiceUrl || '',
        screenshotUrl: expense.screenshotUrl || '',
      });
      setIsAutoAsset(false);
      setSkipAsset(false);
      setAssetForm(emptyAssetForm);
    } else {
      setForm({
        ...emptyForm,
        expenseDate: todayStr(),
        handler: currentUser?.user_id ?? '',
      });
      setIsAutoAsset(false);
      setSkipAsset(false);
      setAssetForm({
        ...emptyAssetForm,
        owner: currentUser?.user_id ?? '',
      });
    }
  }, [isEdit, expense, open, currentUser?.user_id]);

  // 新增模式下，当 currentUser 加载完成且 handler/owner 为空时补充默认值
  useEffect(() => {
    if (!open || isEdit) return;
    const userId = currentUser?.user_id;
    if (!userId) return;
    setForm((prev) => {
      if (prev.handler) return prev;
      return { ...prev, handler: userId };
    });
    setAssetForm((prev) => {
      if (prev.owner) return prev;
      return { ...prev, owner: userId };
    });
  }, [open, isEdit, currentUser?.user_id]);

  useEffect(() => {
    if (!form.categoryL1) {
      setCategoriesL2([]);
      return;
    }
    categoriesApi
      .getCategoriesL2({ categoryL1: form.categoryL1 })
      .then((res) => setCategoriesL2(res.items))
      .catch((err: unknown) => {
        logger.error('加载二级类目失败', err);
      });
  }, [form.categoryL1]);

  useEffect(() => {
    if (isEdit) return;
    const detected = isFixedAsset(form.categoryL1, form.categoryL2);
    setIsAutoAsset(detected);
    if (detected) {
      setAssetForm((prev) => ({
        ...prev,
        assetName:
          prev.assetName || form.description || form.categoryL2 || '',
        assetType: inferAssetType(form.categoryL2),
        owner: prev.owner || currentUser?.user_id || '',
      }));
      setSkipAsset(false);
    }
  }, [form.categoryL1, form.categoryL2, isEdit]);

  useEffect(() => {
    if (!open || !isEdit || !expense) return;
    setAttachmentsLoading(true);
    attachmentsApi
      .getAttachmentsByRelated('expense', expense.id)
      .then((res) => setAttachments(res.items))
      .catch((err: unknown) => {
        logger.error('加载附件列表失败', err);
      })
      .finally(() => setAttachmentsLoading(false));
  }, [open, isEdit, expense?.id]);

  const handleDeleteAttachment = async (id: string) => {
    try {
      await attachmentsApi.deleteAttachment(id);
      setAttachments((prev: AttachmentItem[]) =>
        prev.filter((a: AttachmentItem) => a.id !== id),
      );
      toast.success('附件已删除');
    } catch (err) {
      logger.error('删除附件失败', err);
      toast.error('删除失败');
    }
  };

  const handleUploadComplete = () => {
    if (expense?.id) {
      attachmentsApi
        .getAttachmentsByRelated('expense', expense.id)
        .then((res) => setAttachments(res.items))
        .catch((err: unknown) => {
          logger.error('刷新附件列表失败', err);
        });
    }
  };

  useEffect(() => {
    if (!showAssetSection) return;
    if (!assetForm.assetName && (form.description || form.categoryL2)) {
      setAssetForm((prev) => ({
        ...prev,
        assetName: form.description || form.categoryL2 || '',
      }));
    }
  }, [showAssetSection, form.description, form.categoryL2]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.expenseDate) {
      toast.error('请选择支出日期');
      return;
    }
    if (!form.amount || form.amount <= 0) {
      toast.error('请输入有效金额');
      return;
    }
    if (!form.categoryL1 || !form.categoryL2) {
      toast.error('请选择类目');
      return;
    }
    if (showAssetSection) {
      if (!assetForm.assetName.trim()) {
        toast.error('请输入资产名称');
        return;
      }
      if (assetForm.currentStock <= 0) {
        toast.error('当前库存必须大于 0');
        return;
      }
    }
    setSubmitting(true);
    try {
      const data: CreateExpenseDto = {
        ...form,
        amount: Number(form.amount.toFixed(2)),
        asset: showAssetSection ? assetForm : undefined,
      };
      if (isEdit && expense) {
        await expensesApi.updateExpense(expense.id, data);
        toast.success('修改成功');
      } else {
        const result = await expensesApi.createExpense(data);
        if (isAutoAsset && result?.assetError) {
          toast.warning(`支出已创建，但固定资产创建失败：${result.assetError}`);
        } else if (isAutoAsset && result?.assetId) {
          toast.success('新增成功，固定资产已自动创建');
        } else {
          toast.success('新增成功');
        }
      }
      onOpenChange(false);
      onSaved();
    } catch (err) {
      logger.error('保存支出失败', err);
      toast.error('保存失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto rounded-sm">
        <DialogHeader>
          <DialogTitle>{isEdit ? '编辑支出' : '新增支出'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>支出日期</Label>
             <Input
               type="date"
               value={form.expenseDate}
               max={todayStr()}
               onChange={(e) =>
                 setForm({ ...form, expenseDate: e.target.value })
               }
             />
          </div>
          <div className="space-y-2">
            <Label>支出金额（元）</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={form.amount ?? ''}
              onChange={(e) =>
                setForm({ ...form, amount: Number(e.target.value) })
              }
              placeholder="0.00"
              className="font-mono text-right"
            />
          </div>
          <div className="space-y-2">
            <Label>一级类目</Label>
            <Select
              value={form.categoryL1}
              onValueChange={(v) =>
                setForm({ ...form, categoryL1: v, categoryL2: '' })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="请选择一级类目" />
              </SelectTrigger>
              <SelectContent>
                {categoriesL1.map((c) => (
                  <SelectItem key={c.id} value={c.categoryL1}>
                    {c.categoryL1}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>二级类目</Label>
            <Select
              value={form.categoryL2}
              onValueChange={(v) => setForm({ ...form, categoryL2: v })}
              disabled={!form.categoryL1}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="请选择二级类目" />
              </SelectTrigger>
              <SelectContent>
                {categoriesL2.map((c) => (
                  <SelectItem key={c.id} value={c.categoryL2}>
                    {c.categoryL2}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>付费主体</Label>
            <Select
              value={form.payerEntity}
              onValueChange={(v) => setForm({ ...form, payerEntity: v })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="请选择付费主体" />
              </SelectTrigger>
              <SelectContent>
                {PAYER_ENTITY_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>使用楼层</Label>
            <Select
              value={form.floor}
              onValueChange={(v) => setForm({ ...form, floor: v })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="请选择使用楼层" />
              </SelectTrigger>
              <SelectContent>
                {FLOOR_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>部门</Label>
            <Select
              value={form.department}
              onValueChange={(v) => setForm({ ...form, department: v })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="请选择部门" />
              </SelectTrigger>
              <SelectContent>
                {DEPARTMENT_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>采购申请部门</Label>
            <Select
              value={form.purchaseDepartment}
              onValueChange={(v) =>
                setForm({ ...form, purchaseDepartment: v })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="请选择采购申请部门" />
              </SelectTrigger>
              <SelectContent>
                {PURCHASE_DEPARTMENT_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>经办人</Label>
            <div className="flex h-10 items-center rounded-sm border border-border bg-accent/30 px-3 text-sm">
              {form.handler ? (
                <UserDisplay value={[form.handler]} size="small" />
              ) : (
                <span className="text-muted-foreground">加载中...</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">自动填写当前登录用户，不可修改</p>
          </div>
          <div className="col-span-2 space-y-2">
            <Label>支出说明</Label>
            <Textarea
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              placeholder="请输入支出说明"
              rows={3}
            />
          </div>
          <div className="col-span-2 grid grid-cols-2 gap-4">
            <FileUploadField
              label="发票上传"
              value={form.invoiceUrl || ''}
              onChange={(url) => setForm({ ...form, invoiceUrl: url })}
              accept="image/jpeg,image/png,image/gif,.pdf"
              type="all"
              hint="支持图片（jpg/png/gif）和 PDF，单个文件不超过 10MB"
            />
            <FileUploadField
              label="购买截图上传"
              value={form.screenshotUrl || ''}
              onChange={(url) =>
                setForm({ ...form, screenshotUrl: url })
              }
              accept="image/jpeg,image/png,image/gif"
              type="image"
              hint="支持图片（jpg/png/gif），单个文件不超过 10MB"
            />
          </div>

          {isAutoAsset && !isEdit && (
            <div className="col-span-2 mt-2">
              <div className="flex items-center gap-3 rounded-md border border-primary/30 bg-primary/5 px-4 py-3">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">
                    检测到您选择的是固定资产类目
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    系统将自动创建对应的固定资产记录，点击下方可展开查看或修改资产信息
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-muted-foreground">
                    暂不创建
                  </label>
                  <Checkbox
                    checked={skipAsset}
                    onCheckedChange={(v) => setSkipAsset(Boolean(v))}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setAssetSectionOpen(!assetSectionOpen)}
                    className="h-7 px-2"
                    disabled={skipAsset}
                  >
                    {assetSectionOpen ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {showAssetSection && assetSectionOpen && (
            <>
              <div className="col-span-2 grid grid-cols-2 gap-4 border-t border-dashed border-border pt-4">
                <div className="space-y-2">
                  <Label>资产名称</Label>
                  <Input
                    value={assetForm.assetName}
                    onChange={(e) =>
                      setAssetForm({ ...assetForm, assetName: e.target.value })
                    }
                    placeholder="自动取自支出说明或二级类目"
                  />
                </div>
                <div className="space-y-2">
                  <Label>资产类型</Label>
                  <Select
                    value={assetForm.assetType}
                    onValueChange={(v) =>
                      setAssetForm({
                        ...assetForm,
                        assetType: v,
                      })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="请选择资产类型" />
                    </SelectTrigger>
                     <SelectContent>
                       {categoriesL2.map((c) => (
                         <SelectItem key={c.id} value={c.categoryL2}>
                           {c.categoryL2}
                         </SelectItem>
                       ))}
                     </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>归属人</Label>
                  <UserSelect
                    value={assetForm.owner || null}
                    onChange={(val) =>
                      setAssetForm({ ...assetForm, owner: val || '' })
                    }
                    triggerType="search"
                    placeholder="搜索并选择归属人"
                    disabled={submitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label>使用楼层</Label>
                  <div className="flex h-10 items-center rounded-sm border border-border bg-accent/30 px-3 text-sm">
                    <span className="text-foreground">
                      {form.floor || '与支出记录一致'}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>商品数量</Label>
                  <Input
                    type="number"
                    min="1"
                    value={assetForm.currentStock}
                    onChange={(e) =>
                      setAssetForm({
                        ...assetForm,
                        currentStock: Number(e.target.value),
                      })
                    }
                  />
                </div>
              </div>
              <div className="col-span-2 -mt-2 text-xs text-muted-foreground">
                采购日期、采购金额、采购申请部门、付费主体、经办人、使用楼层将自动从支出记录同步
              </div>
            </>
          )}

          {/* 附件管理 */}
          <div className="col-span-2 border-t border-border pt-4">
            <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
              <span className="w-1 h-4 bg-primary" />
              附件管理
            </h3>
            <FileUploader
              relatedType="expense"
              relatedId={expense?.id || 'new'}
              onUploadComplete={handleUploadComplete}
            />
            {isEdit && (
              <div className="mt-4">
                <AttachmentList
                  attachments={attachments}
                  onDelete={handleDeleteAttachment}
                  loading={attachmentsLoading}
                />
              </div>
            )}
          </div>

          <DialogFooter className="col-span-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              取消
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ExpenseFormDialog;
