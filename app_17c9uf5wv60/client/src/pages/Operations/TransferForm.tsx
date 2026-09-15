import { useState, useEffect, useCallback } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { products, inventory, operations } from '@client/src/api';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@client/src/components/ui/select';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@client/src/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@client/src/components/ui/card';
import { ArrowLeftRight, Warehouse } from 'lucide-react';
import { FormSectionTitle } from './FormSectionTitle';
import type { Product, TransferRequest, TransferResponse, WarehouseInventoryItem } from '@shared/api.interface';

const WAREHOUSES = [
  { value: '上海仓', label: '上海仓' },
  { value: '北京仓', label: '北京仓' },
  { value: '广州仓', label: '广州仓' },
  { value: '成都仓', label: '成都仓' },
];

const transferSchema = z.object({
  productId: z.string().min(1, '请选择商品'),
  sourceWarehouse: z.string().min(1, '请选择源仓库'),
  targetWarehouse: z.string().min(1, '请选择目标仓库'),
  quantity: z.coerce.number().min(1, '请输入数量'),
  remark: z.string().default(''),
}).refine((data) => data.sourceWarehouse !== data.targetWarehouse, {
  message: '源仓库和目标仓库不能相同',
  path: ['targetWarehouse'],
});

type TransferFormData = z.infer<typeof transferSchema>;

export function TransferForm() {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [sourceStock, setSourceStock] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedDocNo, setGeneratedDocNo] = useState<string | null>(null);

  const form = useForm<TransferFormData>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      productId: '',
      sourceWarehouse: '',
      targetWarehouse: '',
      quantity: 0,
      remark: '',
    },
  });

  const productId = form.watch('productId');
  const sourceWarehouse = form.watch('sourceWarehouse');
  const quantity = form.watch('quantity');

  useEffect(() => {
    products.getAllProducts()
      .then((data: Product[]) => setAllProducts(data))
      .catch((err: unknown) => logger.error('Failed to load products:', String(err)));
  }, []);

  const fetchStock = useCallback(async (pid: string, wh: string) => {
    try {
      const items: WarehouseInventoryItem[] = await inventory.getWarehouseStock(pid);
      const match = items.find((item: WarehouseInventoryItem) => item.warehouse === wh);
      setSourceStock(match ? match.quantity : 0);
    } catch (err: unknown) {
      logger.error('Failed to fetch stock:', String(err));
      setSourceStock(null);
    }
  }, []);

  useEffect(() => {
    if (productId && sourceWarehouse) {
      fetchStock(productId, sourceWarehouse);
    } else {
      setSourceStock(null);
    }
  }, [productId, sourceWarehouse, fetchStock]);

  const afterStock = sourceStock !== null ? sourceStock - (quantity || 0) : null;

  const onSubmit = async (data: TransferFormData) => {
    setIsSubmitting(true);
    try {
      const result: TransferResponse = await operations.transfer(data as unknown as TransferRequest);
      setGeneratedDocNo(result.docNo);
      toast.success(`调拨成功，单号：${result.docNo}`);
      form.reset({}, { keepDefaultValues: true });
      form.clearErrors();
      setSourceStock(null);
    } catch (err: unknown) {
      logger.error('Transfer failed:', String(err));
      toast.error('调拨失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="rounded-sm shadow-none border border-border">
      <CardHeader className="pb-4">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <ArrowLeftRight className="size-4 text-primary" />
          库存调拨
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormSectionTitle title="基础信息" />
            <FormField
              control={form.control}
              name="productId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>商品 <span className="text-destructive">*</span></FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="请选择商品" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {allProducts.map((p: Product) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} ({p.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex flex-wrap gap-4">
              <FormField
                control={form.control}
                name="sourceWarehouse"
                render={({ field }) => (
                  <FormItem className="flex-1 min-w-[200px]">
                    <FormLabel>源仓库 <span className="text-destructive">*</span></FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="请选择源仓库" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {WAREHOUSES.map((w) => (
                          <SelectItem key={w.value} value={w.value}>
                            {w.label}
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
                name="targetWarehouse"
                render={({ field }) => (
                  <FormItem className="flex-1 min-w-[200px]">
                    <FormLabel>目标仓库 <span className="text-destructive">*</span></FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="请选择目标仓库" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {WAREHOUSES.map((w) => (
                          <SelectItem key={w.value} value={w.value}>
                            {w.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {sourceStock !== null && (
              <div className="flex flex-wrap items-center gap-4 px-3 py-2 border border-border rounded-sm bg-muted/30">
                <Warehouse className="size-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">源仓库可用库存:</span>
                <span className="text-sm font-mono font-medium">{sourceStock}</span>
                {afterStock !== null && (
                  <>
                    <span className="text-sm text-muted-foreground">调拨后剩余:</span>
                    <span className={`text-sm font-mono font-medium ${afterStock < 0 ? 'text-destructive' : 'text-primary'}`}>
                      {afterStock}
                    </span>
                  </>
                )}
              </div>
            )}

            <FormSectionTitle title="调拨明细" />
            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>调拨数量 <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="调拨数量" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="px-3 py-2 border border-border rounded-sm bg-muted/30">
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <span>调拨单号:</span>
                <span className="font-mono text-foreground">
                  {generatedDocNo || '自动生成'}
                </span>
                {generatedDocNo && (
                  <span className="text-xs text-primary">(上一单)</span>
                )}
              </div>
            </div>

            <FormField
              control={form.control}
              name="remark"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>备注</FormLabel>
                  <FormControl>
                    <Input placeholder="备注信息" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => { form.reset({}, { keepDefaultValues: true }); form.clearErrors(); setSourceStock(null); }}>
                重置
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? '处理中...' : '确认调拨'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
