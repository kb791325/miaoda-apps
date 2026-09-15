import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { useCurrentUserProfile } from '@lark-apaas/client-toolkit/hooks/useCurrentUserProfile';
import { Input } from '@client/src/components/ui/input';
import { Label } from '@client/src/components/ui/label';
import {
  Dialog,
  DialogContent,
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
import {
  RadioGroup,
  RadioGroupItem,
} from '@client/src/components/ui/radio-group';
import { Button } from '@client/src/components/ui/button';
import { UserDisplay } from '@client/src/components/business-ui/user-display';
import { UserSelect } from '@client/src/components/business-ui/user-select';

import { createAsset, updateAsset } from '@client/src/api/fixed-assets';
import * as categoriesApi from '@client/src/api/categories';
import {
  PAYER_ENTITY_OPTIONS,
  FLOOR_OPTIONS,
  PURCHASE_DEPARTMENT_OPTIONS,
} from '@client/src/utils/form-options';
import type {
  CreateFixedAssetDto,
  FixedAssetDetail,
  CategoryItem,
} from '@shared/api.interface';

interface AssetFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset: FixedAssetDetail | null;
  onSuccess: () => void;
}

const FIXED_ASSET_CATEGORY = '固定资产';

const defaultForm: CreateFixedAssetDto = {
  assetName: '',
  assetType: '',
  assetCategory: FIXED_ASSET_CATEGORY,
  purchaseDate: '',
  purchaseAmount: 0,
  purchaseDepartment: '',
  payerEntity: '',
  floor: '',
  handler: '',
  owner: '',
  currentStock: 1,
};

const AssetFormDialog = ({
  open,
  onOpenChange,
  asset,
  onSuccess,
}: AssetFormDialogProps) => {
  const currentUser = useCurrentUserProfile();
  const [form, setForm] = useState<CreateFixedAssetDto>(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [categoryL2Options, setCategoryL2Options] = useState<CategoryItem[]>([]);


  useEffect(() => {
    categoriesApi
      .getCategoriesL2({ categoryL1: FIXED_ASSET_CATEGORY, pageSize: 200 })
      .then((res) => setCategoryL2Options(res.items))
      .catch((err: unknown) => {
        logger.error('加载类目选项失败', err);
        toast.error('加载类目选项失败');
      });
  }, []);

  // 表单初始化：只在 open/asset/currentUser 变化时执行，避免 userOptions 异步加载覆盖用户修改
  useEffect(() => {
    if (!open) {
      setForm(defaultForm);
      return;
    }

    if (currentUser?.user_id && !asset) {
      setForm((prev) => ({
        ...prev,
        handler: prev.handler || currentUser.user_id,
        owner: prev.owner || currentUser.user_id,
      }));
    }

    if (asset) {
      const handlerId =
        typeof asset.handler === 'string'
          ? asset.handler
          : asset.handler?.userId ?? '';
      const ownerId =
        typeof asset.owner === 'string'
          ? asset.owner
          : asset.owner?.userId ?? '';
      setForm({
        assetName: asset.assetName,
        assetType: asset.assetType,
        assetCategory: FIXED_ASSET_CATEGORY,
        purchaseDate: asset.purchaseDate,
        purchaseAmount: asset.purchaseAmount,
        purchaseDepartment: asset.purchaseDepartment ?? '',
        payerEntity: asset.payerEntity ?? '',
        floor: asset.floor,
        handler: handlerId,
        owner: ownerId,
        currentStock: asset.currentStock,
      });
    }
  }, [open, asset, currentUser]);

  const updateField = <K extends keyof CreateFixedAssetDto>(
    key: K,
    value: CreateFixedAssetDto[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.assetName.trim()) {
      toast.error('请输入资产名称');
      return;
    }
    if (!form.assetType) {
      toast.error('请选择资产类型');
      return;
    }
    if (!form.purchaseDate) {
      toast.error('请选择采购日期');
      return;
    }
    if (!form.owner) {
      toast.error('请选择归属人');
      return;
    }
    setSubmitting(true);
    try {
      if (asset) {
        await updateAsset(asset.id, form);
      } else {
        await createAsset(form);
      }
      onSuccess();
    } catch {
      toast.error(asset ? '更新失败，请重试' : '创建失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto rounded-sm">
        <DialogHeader>
          <DialogTitle>{asset ? '编辑资产' : '新增资产'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
              <span className="w-1 h-4 bg-primary" />
              基本信息
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="assetName">
                  资产名称 <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="assetName"
                  value={form.assetName}
                  onChange={(e) => updateField('assetName', e.target.value)}
                  placeholder="请输入资产名称"
                  className="rounded-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="assetCategory">
                  资产类目 <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="assetCategory"
                  value={FIXED_ASSET_CATEGORY}
                  disabled
                  readOnly
                  className="rounded-sm bg-muted/50"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="assetType">
                资产类型 <span className="text-destructive">*</span>
              </Label>
              <Select
                value={form.assetType}
                onValueChange={(v) => updateField('assetType', v)}
              >
                <SelectTrigger id="assetType" className="w-full rounded-sm">
                  <SelectValue placeholder="请选择资产类型" />
                </SelectTrigger>
                <SelectContent>
                  {categoryL2Options.map((c) => (
                    <SelectItem key={c.id} value={c.categoryL2}>
                      {c.categoryL2}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
              <span className="w-1 h-4 bg-primary" />
              采购信息
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="purchaseDate">采购日期</Label>
                <Input
                  id="purchaseDate"
                  type="date"
                  value={form.purchaseDate}
                  onChange={(e) => updateField('purchaseDate', e.target.value)}
                  className="rounded-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="purchaseAmount">采购金额</Label>
                <Input
                  id="purchaseAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.purchaseAmount}
                  onChange={(e) =>
                    updateField('purchaseAmount', Number(e.target.value))
                  }
                  className="rounded-sm font-mono tabular-nums text-right"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="purchaseDepartment">采购申请部门</Label>
                <Select
                  value={form.purchaseDepartment}
                  onValueChange={(v) => updateField('purchaseDepartment', v)}
                >
                  <SelectTrigger
                    id="purchaseDepartment"
                    className="w-full rounded-sm"
                  >
                    <SelectValue placeholder="请选择部门" />
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
              <div className="space-y-1.5">
                <Label htmlFor="payerEntity">付费主体</Label>
                <Select
                  value={form.payerEntity}
                  onValueChange={(v) => updateField('payerEntity', v)}
                >
                  <SelectTrigger
                    id="payerEntity"
                    className="w-full rounded-sm"
                  >
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
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
              <span className="w-1 h-4 bg-primary" />
              归属信息
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="handler">经办人</Label>
                <div
                  id="handler"
                  className="flex h-9 w-full items-center rounded-sm border border-input bg-muted/30 px-3 text-sm"
                >
                  {form.handler ? (
                    <UserDisplay value={[form.handler]} size="small" />
                  ) : (
                    <span className="text-muted-foreground">加载中...</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  自动填写当前登录用户
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="owner">
                  归属人 <span className="text-destructive">*</span>
                </Label>
                <UserSelect
                  value={form.owner || null}
                  onChange={(val) => updateField('owner', val || '')}
                  triggerType="search"
                  placeholder="搜索并选择归属人"
                  disabled={submitting}
                />
                <p className="text-xs text-muted-foreground">
                  输入姓名/拼音/邮箱可搜索全公司用户
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="floor">使用楼层</Label>
                <Select
                  value={form.floor}
                  onValueChange={(v) => updateField('floor', v)}
                >
                  <SelectTrigger id="floor" className="w-full rounded-sm">
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
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
              <span className="w-1 h-4 bg-primary" />
              库存信息
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="currentStock">商品数量（当前库存）</Label>
                <Input
                  id="currentStock"
                  type="number"
                  min="1"
                  value={form.currentStock}
                  onChange={(e) =>
                    updateField('currentStock', Number(e.target.value))
                  }
                  className="rounded-sm font-mono tabular-nums text-right"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-sm"
            >
              取消
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="rounded-sm"
            >
              {submitting ? '提交中...' : asset ? '保存修改' : '确认新增'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AssetFormDialog;
