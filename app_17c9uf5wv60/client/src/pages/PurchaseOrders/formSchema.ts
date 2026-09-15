import { z } from 'zod';

export const purchaseItemSchema = z.object({
  productId: z.string().min(1, '请选择商品'),
  quantity: z.coerce.number().min(1, '数量必须大于 0'),
  unitPrice: z.coerce.number().min(0, '单价不能为负数'),
  unit: z.string().min(1, '请选择单位'),
});

export const purchaseOrderSchema = z.object({
  supplierId: z.string().min(1, '请选择供应商'),
  warehouse: z.string().min(1, '请选择目标仓库'),
  expectedDate: z.date().optional(),
  remark: z.string().optional(),
  items: z.array(purchaseItemSchema).min(1, '至少添加一行商品明细'),
});

export type PurchaseOrderFormData = z.infer<typeof purchaseOrderSchema>;

export const EMPTY_FORM: PurchaseOrderFormData = {
  supplierId: '',
  warehouse: '',
  expectedDate: undefined,
  remark: '',
  items: [{ productId: '', quantity: 1, unitPrice: 0, unit: '' }],
};

export function toNumber(value: unknown): number {
  const n: number = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function calcItemsTotal(
  items: PurchaseOrderFormData['items'] | undefined,
): number {
  if (!items) return 0;
  return items.reduce(
    (sum: number, item) =>
      sum + toNumber(item?.quantity) * toNumber(item?.unitPrice),
    0,
  );
}
