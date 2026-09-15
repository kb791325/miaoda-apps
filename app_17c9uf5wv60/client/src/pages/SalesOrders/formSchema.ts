import { z } from 'zod';

export const salesItemSchema = z.object({
  productId: z.string().min(1, '请选择商品'),
  quantity: z.coerce.number().min(1, '数量至少为 1'),
  unitPrice: z.coerce.number().min(0, '单价不能为负数'),
  unit: z.string().min(1, '请选择单位'),
});

export const salesOrderSchema = z.object({
  customerName: z.string().min(1, '请输入客户名称'),
  customerContact: z.string().optional(),
  customerPhone: z.string().optional(),
  warehouse: z.string().min(1, '请选择仓库'),
  expectedShipDate: z.string().optional(),
  remark: z.string().optional(),
  items: z.array(salesItemSchema).min(1, '至少添加一条商品明细'),
});

export type OrderFormData = z.infer<typeof salesOrderSchema>;

export const EMPTY_SALES_ITEM: OrderFormData['items'][number] = {
  productId: '',
  quantity: 1,
  unitPrice: 0,
  unit: '',
};
