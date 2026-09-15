import { useCallback, useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { products, categories as categoriesApi } from '@/api';
import ImageUpload from '@/components/ImageUpload';
import ProductListSection from './ProductListSection';
import { usePageShortcuts } from '@/hooks/useAppShortcuts';
import type { Product } from '@shared/api.interface';

const UNITS = ['件', '个', '箱', '套', '瓶', '盒'];
const WAREHOUSES = ['北京仓', '上海仓', '广州仓', '成都仓'] as const;
type WarehouseName = (typeof WAREHOUSES)[number];

const productSchema = z
  .object({
    code: z.string().min(1, '请输入商品编码'),
    name: z.string().min(1, '请输入商品名称'),
    category: z.string().min(1, '请选择品类'),
    unit: z.string().min(1, '请选择单位'),
    safetyStock: z.coerce.number().min(0, '安全库存不能为负数'),
    unitPrice: z.coerce.number().min(0, '单价不能为负数'),
    imageUrl: z.string().nullable(),
    baseUnit: z.string().min(1, '请输入基本单位'),
    salesUnit: z.string(),
    conversionRatio: z.coerce.number(),
    inventory: z.object({
      北京仓: z.coerce.number().min(0, '库存不能为负数').default(0),
      上海仓: z.coerce.number().min(0, '库存不能为负数').default(0),
      广州仓: z.coerce.number().min(0, '库存不能为负数').default(0),
      成都仓: z.coerce.number().min(0, '库存不能为负数').default(0),
    }),
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

type ProductFormData = z.infer<typeof productSchema>;

const AddProductPage = () => {
  const [productList, setProductList] = useState<Product[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      code: '',
      name: '',
      category: '',
      unit: '件',
      safetyStock: 0,
      unitPrice: 0,
      imageUrl: null,
      baseUnit: '件',
      salesUnit: '',
      conversionRatio: 0,
      inventory: { 北京仓: 0, 上海仓: 0, 广州仓: 0, 成都仓: 0 },
    },
  });

  const fetchProducts = useCallback(async () => {
    try {
      const res = await products.getAllProducts();
      setProductList(res);
    } catch (err) {
      logger.error('获取商品列表失败', err);
    }
  }, []);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await categoriesApi.getCategories();
        setCategoryOptions(res.items.map((c) => c.name));
      } catch (err: unknown) {
        logger.error('获取品类列表失败:', String(err));
      }
    };
    loadCategories();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    const usedNums = new Set(
      productList
        .map((p: Product) => {
          const match = p.code.match(/SKU(\d+)/);
          return match ? parseInt(match[1], 10) : 0;
        })
        .filter((n: number) => n > 0),
    );
    let nextNum = 1;
    while (usedNums.has(nextNum)) {
      nextNum += 1;
    }
    const code = `SKU${String(nextNum).padStart(3, '0')}`;
    form.setValue('code', code);
  }, [productList, form]);

  const onSubmit = async (data: ProductFormData) => {
    try {
      const salesUnit: string = data.salesUnit.trim();
      await products.createProduct({
        code: data.code,
        name: data.name,
        category: data.category,
        brand: '',
        unit: data.unit,
        safetyStock: data.safetyStock,
        unitPrice: data.unitPrice,
        initialInventory: WAREHOUSES.map((warehouse) => ({
          warehouse,
          quantity: Number(data.inventory[warehouse as WarehouseName] ?? 0),
        })),
        baseUnit: data.baseUnit,
        ...(data.imageUrl ? { imageUrl: data.imageUrl } : {}),
        ...(salesUnit
          ? { salesUnit, conversionRatio: data.conversionRatio }
          : {}),
      });
      toast.success('商品创建成功');
      await fetchProducts();
    } catch (err) {
      logger.error('创建商品失败', err);
      toast.error('创建商品失败，请重试');
    }
  };

  usePageShortcuts({
    onSave: () => {
      void form.handleSubmit(onSubmit)();
    },
  });

  const handleDelete = async (id: string, name: string) => {
    setDeletingId(id);
    try {
      await products.deleteProduct(id);
      toast.success(`已删除商品「${name}」`);
      await fetchProducts();
    } catch (err) {
      logger.error('删除商品失败', err);
      toast.error('删除商品失败，请重试');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-start gap-3">
        <div className="h-5 w-1 rounded-sm bg-primary shrink-0 mt-1" />
        <div>
          <h1 className="text-lg font-semibold text-foreground">商品管理</h1>
          <p className="text-sm text-muted-foreground mt-1">
            添加或删除库存商品
          </p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-sm p-5">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-5"
          >
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-4 w-1 rounded-sm bg-primary" />
                <span className="text-sm font-medium text-foreground">
                  基本信息
                </span>
              </div>
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>商品编码</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="自动生成"
                        className="font-mono bg-muted/50"
                        disabled
                        {...field}
                      />
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
                  <FormLabel>
                    商品名称{' '}
                    <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="请输入商品名称"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      品类{' '}
                      <span className="text-destructive">
                        *
                      </span>
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
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
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      单位{' '}
                      <span className="text-destructive">
                        *
                      </span>
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
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
            </div>

            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>商品图片</FormLabel>
                  <FormControl>
                    <ImageUpload
                      value={field.value}
                      onChange={field.onChange}
                      disabled={form.formState.isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-4 w-1 rounded-sm bg-primary" />
                <span className="text-sm font-medium text-foreground">
                  计量单位
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="baseUnit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
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
                      <FormLabel>销售单位</FormLabel>
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
                      <FormLabel>换算比例</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          step="0.1"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                换算比例：1 销售单位 = N 基本单位；填写销售单位后必填且需大于 0
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-4 w-1 rounded-sm bg-primary" />
                <span className="text-sm font-medium text-foreground">
                  价格与安全库存
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="safetyStock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      安全库存 <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="unitPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      参考单价(¥) <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        {...field}
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
                <div className="h-4 w-1 rounded-sm bg-primary" />
                <span className="text-sm font-medium text-foreground">
                  各仓库库存
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {WAREHOUSES.map((wh) => {
                  const fieldName: `inventory.${WarehouseName}` = `inventory.${wh}`;
                  return (
                    <FormField
                      key={wh}
                      control={form.control}
                      name={fieldName}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{wh}</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={0}
                              value={field.value as number}
                              onChange={field.onChange}
                              onBlur={field.onBlur}
                              name={field.name}
                              ref={field.ref}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-border">
              <Button
                type="submit"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? '保存中...' : '保存'}
              </Button>
            </div>
          </form>
        </Form>
      </div>

      <ProductListSection
        productList={productList}
        deletingId={deletingId}
        onDelete={(id: string, name: string) => void handleDelete(id, name)}
      />
    </div>
  );
};

export default AddProductPage;
