import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@client/src/components/ui/dialog';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@client/src/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import { Package, Tag, Hash, DollarSign, Warehouse, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { products, categories as categoriesApi } from '@client/src/api';
import { createProduct } from '@client/src/api/products';
import ImageUpload from '@client/src/components/ImageUpload';
import type { ProductWithInventory } from '@shared/api.interface';

const UNITS = ['件', '个', '箱', '套', '瓶', '盒'];
const WAREHOUSES = ['北京仓', '上海仓', '广州仓', '成都仓'];

const editSchema = z
  .object({
    code: z.string().min(1, '请输入商品编码'),
    name: z.string().min(1, '请输入商品名称'),
    category: z.string().min(1, '请选择品类'),
    unit: z.string().min(1, '请选择单位'),
    unitPrice: z.coerce.number().min(0, '单价不能为负数'),
    warehouse: z.string().min(1, '请选择仓库'),
    quantity: z.coerce.number().min(0, '库存不能为负数'),
    imageUrl: z.string().nullable(),
    baseUnit: z.string().min(1, '请输入基本单位'),
    salesUnit: z.string(),
    conversionRatio: z.coerce.number(),
  })
  .superRefine((data, ctx) => {
    if (data.salesUnit.trim() && data.conversionRatio <= 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['conversionRatio'],
        message: '填写销售单位后，换算比例必须大于 0',
      });
    }
  });

type EditFormData = z.infer<typeof editSchema>;

interface ProductEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: ProductWithInventory | null;
  onSaved: () => void;
  categoryOptions: string[];
  nextCode: string;
}

export function ProductEditDialog({
  open,
  onOpenChange,
  product,
  onSaved,
  categoryOptions,
  nextCode,
}: ProductEditDialogProps) {
  const isEdit = !!product;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<EditFormData>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      code: '',
      name: '',
      category: '',
      unit: '',
      unitPrice: 0,
      warehouse: '',
      quantity: 0,
      imageUrl: null,
      baseUnit: '件',
      salesUnit: '',
      conversionRatio: 0,
    },
  });

  useEffect(() => {
    if (!open) return;
    if (product) {
      const topInv = [...(product.inventory ?? [])].sort(
        (a, b) => b.quantity - a.quantity,
      )[0];
      form.reset({
        code: product.code,
        name: product.name,
        category: product.category,
        unit: product.unit,
        unitPrice: Number(product.unitPrice),
        warehouse: topInv?.warehouse ?? WAREHOUSES[0],
        quantity: topInv?.quantity ?? 0,
        imageUrl: product.imageUrl ?? null,
        baseUnit: product.baseUnit || '件',
        salesUnit: product.salesUnit ?? '',
        conversionRatio: product.conversionRatio ?? 0,
      });
    } else {
      form.reset({
        code: nextCode,
        name: '',
        category: '',
        unit: '',
        unitPrice: 0,
        warehouse: '',
        quantity: 0,
        imageUrl: null,
        baseUnit: '件',
        salesUnit: '',
        conversionRatio: 0,
      });
    }
  }, [open, product, form, nextCode]);

  const handleSubmit = async (data: EditFormData) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      if (isEdit) {
        const salesUnit: string = data.salesUnit.trim();
        await products.updateProduct(product.id, {
          code: data.code,
          name: data.name,
          category: data.category,
          unit: data.unit,
          unitPrice: data.unitPrice,
          imageUrl: data.imageUrl ?? null,
          baseUnit: data.baseUnit,
          salesUnit: salesUnit || null,
          conversionRatio: salesUnit ? data.conversionRatio : null,
        });
        toast.success('商品信息已更新');
      } else {
        const initialInventory = WAREHOUSES.map((warehouse) => ({
          warehouse,
          quantity: warehouse === data.warehouse ? Number(data.quantity ?? 0) : 0,
        }));
        const salesUnit: string = data.salesUnit.trim();
        await createProduct({
          code: data.code,
          name: data.name,
          category: data.category,
          brand: '',
          unit: data.unit,
          safetyStock: 0,
          unitPrice: data.unitPrice,
          initialInventory,
          baseUnit: data.baseUnit,
          ...(data.imageUrl ? { imageUrl: data.imageUrl } : {}),
          ...(salesUnit
            ? { salesUnit, conversionRatio: data.conversionRatio }
            : {}),
        });
        toast.success('商品创建成功');
      }
      await onSaved();
      onOpenChange(false);
    } catch (err: unknown) {
      logger.error(isEdit ? '更新商品失败:' : '创建商品失败:', String(err));
      toast.error(isEdit ? '更新商品失败，请重试' : '创建商品失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] p-0 gap-0">
        <DialogHeader className="px-6 py-5 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-sm bg-primary/10">
              <Package className="size-4 text-primary" />
            </div>
            <DialogTitle className="text-base font-semibold tracking-tight">
              {isEdit ? '编辑商品' : '新增商品'}
            </DialogTitle>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="px-6 py-5 space-y-5"
          >
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-1 h-4 rounded-sm bg-primary" />
                <span className="text-sm font-medium text-foreground">
                  基本信息
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 pl-3">
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-muted-foreground font-normal">
                        商品编码 <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Hash className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                          <Input
                            placeholder="自动生成"
                            className="pl-8 font-mono bg-muted/50"
                            disabled={!isEdit}
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-muted-foreground font-normal">
                        商品名称 <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="请输入商品名称" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-1 h-4 rounded-sm bg-primary" />
                <span className="text-sm font-medium text-foreground">
                  商品图片
                </span>
              </div>
              <div className="pl-3">
                <FormField
                  control={form.control}
                  name="imageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <ImageUpload
                          value={field.value}
                          onChange={field.onChange}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-1 h-4 rounded-sm bg-primary" />
                <span className="text-sm font-medium text-foreground">
                  分类与规格
                </span>
              </div>
              <div className="grid grid-cols-1 gap-4 pl-3">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-muted-foreground font-normal">
                        商品品类 <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Tag className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none z-10" />
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="pl-8 w-full">
                                <SelectValue placeholder="请选择品类" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {categoryOptions.map((cat) => (
                                <SelectItem key={cat} value={cat}>
                                  {cat}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4 pl-3">
                <FormField
                  control={form.control}
                  name="unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-muted-foreground font-normal">
                        计量单位 <span className="text-destructive">*</span>
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="w-[281px]">
                            <SelectValue placeholder="请选择单位" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {UNITS.map((u) => (
                            <SelectItem key={u} value={u}>
                              {u}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="unitPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-muted-foreground font-normal">
                        参考单价（元） <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            className="pl-8 font-mono"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-1 h-4 rounded-sm bg-primary" />
                <span className="text-sm font-medium text-foreground">
                  计量单位
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4 pl-3">
                <FormField
                  control={form.control}
                  name="baseUnit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-muted-foreground font-normal">
                        基本单位 <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="件" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="salesUnit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-muted-foreground font-normal">
                        销售单位
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="选填，如：箱" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="conversionRatio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-muted-foreground font-normal">
                        换算比例
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          step="0.1"
                          className="font-mono"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <p className="pl-3 text-xs text-muted-foreground">
                换算比例：1 销售单位 = N 基本单位；填写销售单位后必填且需大于 0
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-1 h-4 rounded-sm bg-primary" />
                <span className="text-sm font-medium text-foreground">
                  仓库库存
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 pl-3">
                <FormField
                  control={form.control}
                  name="warehouse"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-muted-foreground font-normal">
                        仓库 <span className="text-destructive">*</span>
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <div className="relative">
                            <Warehouse className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none z-10" />
                            <SelectTrigger className="pl-8 w-full">
                              <SelectValue placeholder="请选择仓库" />
                            </SelectTrigger>
                          </div>
                        </FormControl>
                        <SelectContent>
                          {WAREHOUSES.map((wh) => (
                            <SelectItem key={wh} value={wh}>
                              {wh}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-muted-foreground font-normal">
                        库存数量 <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          className="font-mono"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <DialogFooter className="pt-3 gap-2 border-t border-border -mx-6 px-6 -mb-5 py-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                size="sm"
                disabled={isSubmitting}
              >
                取消
              </Button>
              <Button type="submit" size="sm" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="size-4 animate-spin mr-1.5" />}
                {isSubmitting ? '处理中...' : isEdit ? '保存修改' : '确认新增'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
