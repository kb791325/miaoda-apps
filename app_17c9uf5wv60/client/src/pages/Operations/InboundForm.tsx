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
import { Package, Warehouse } from 'lucide-react';
import { FormSectionTitle } from './FormSectionTitle';
import { useCurrentUserProfile } from '@lark-apaas/client-toolkit/hooks/useCurrentUserProfile';
import type { Product, WarehouseInventoryItem, InboundRequest, InboundResponse } from '@shared/api.interface';

const WAREHOUSES = [
  { value: '上海仓', label: '上海仓' },
  { value: '北京仓', label: '北京仓' },
  { value: '广州仓', label: '广州仓' },
  { value: '成都仓', label: '成都仓' },
];

const INBOUND_TYPES = [
  { value: '采购入库', label: '采购入库' },
  { value: '退货入库', label: '退货入库' },
  { value: '调拨入库', label: '调拨入库' },
  { value: '其他入库', label: '其他入库' },
];

const inboundSchema = z.object({
  productId: z.string().min(1, '请选择商品'),
  warehouse: z.string().min(1, '请选择仓库'),
  subType: z.string().min(1, '请选择入库类型'),
  unit: z.string().min(1, '请选择计量单位'),
  quantity: z.coerce.number().min(1, '请输入数量'),
  unitPrice: z.coerce.number().min(0, '请输入单价'),
  operator: z.string(),
  orderNo: z.string().min(1, '入库单号将自动生成'),
  remark: z.string().default(''),
});

type InboundFormData = z.infer<typeof inboundSchema>;

export function InboundForm() {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [currentStock, setCurrentStock] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedDocNo, setGeneratedDocNo] = useState<string | null>(null);
  const userInfo = useCurrentUserProfile();

  const form = useForm<InboundFormData>({
    resolver: zodResolver(inboundSchema),
    defaultValues: {
      productId: '',
      warehouse: '',
      subType: '',
      unit: '',
      quantity: 0,
      unitPrice: 0,
      operator: '',
      orderNo: '',
      remark: '',
    },
    mode: 'onChange',
  });

  const orderNoVal = form.watch('orderNo');
  const operatorVal = form.watch('operator');

  useEffect(() => {
    setGeneratedDocNo(null);
  }, [form.formState.submitCount]);

  useEffect(() => {
    if (!orderNoVal) {
      const dateStr = new Date().toISOString().slice(0,10).replace(/-/g,'');
      const seq = String(Math.floor(Math.random()*9000)+1000);
      const orderNo = `SO-${dateStr}-${seq}`;
      form.setValue('orderNo', orderNo);
    }
  }, [orderNoVal, form]);

  useEffect(() => {
    const name = userInfo?.name?.trim() || userInfo?.userName?.trim() || '';
    if (name && !operatorVal) {
      form.setValue('operator', name);
    }
  }, [userInfo, operatorVal, form]);

  const productId = form.watch('productId');
  const warehouse = form.watch('warehouse');
  const quantity = form.watch('quantity');
  const selectedProduct = allProducts.find((p: Product) => p.id === productId);

  useEffect(() => {
    products.getAllProducts()
      .then((data: Product[]) => setAllProducts(data))
      .catch((err: unknown) => logger.error('Failed to load products:', String(err)));
  }, []);

  const fetchStock = useCallback(async (pid: string, wh: string) => {
    try {
      const items: WarehouseInventoryItem[] = await inventory.getWarehouseStock(pid);
      const match = items.find((item: WarehouseInventoryItem) => item.warehouse === wh);
      setCurrentStock(match ? match.quantity : 0);
    } catch (err: unknown) {
      logger.error('Failed to fetch stock:', String(err));
      setCurrentStock(null);
    }
  }, []);

  useEffect(() => {
    if (productId && warehouse) {
      fetchStock(productId, warehouse);
    } else {
      setCurrentStock(null);
    }
  }, [productId, warehouse, fetchStock]);

  useEffect(() => {
    if (selectedProduct) {
      form.setValue('unitPrice', Number(selectedProduct.unitPrice) || 0);
      form.setValue('unit', selectedProduct.baseUnit);
    }
  }, [selectedProduct, form]);

  const unitVal = form.watch('unit');
  const conversionRatio: number = selectedProduct?.conversionRatio ?? 0;
  const isSalesUnit: boolean = Boolean(
    selectedProduct?.salesUnit && conversionRatio > 0 && unitVal === selectedProduct.salesUnit,
  );
  const qtyNum: number = Number(quantity) || 0;
  const baseQty: number = isSalesUnit ? qtyNum * conversionRatio : qtyNum;
  const baseQtyInvalid: boolean = qtyNum > 0 && (!Number.isInteger(baseQty) || baseQty <= 0);

  const afterStock = currentStock !== null ? currentStock + baseQty : null;

  const onSubmit = async (data: InboundFormData) => {
    if (baseQtyInvalid) {
      form.setError('quantity', { message: '换算后基本单位数量需为整数' });
      return;
    }
    setIsSubmitting(true);
    try {
      const request: InboundRequest = {
        productId: data.productId,
        warehouse: data.warehouse,
        quantity: baseQty,
        unitPrice: data.unitPrice,
        operator: data.operator,
        subType: data.subType,
        orderNo: data.orderNo,
        remark: data.remark || undefined,
      };
      const result: InboundResponse = await operations.inbound(request);
      setGeneratedDocNo(result.docNo);
      toast.success(`入库成功，单号：${result.docNo}`);
      form.reset();
      setCurrentStock(null);
    } catch (err: unknown) {
      logger.error('Inbound failed:', String(err));
      toast.error('入库失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="rounded-sm shadow-none border border-border">
      <CardHeader className="pb-4">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Package className="size-4 text-primary" />
          商品入库
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormSectionTitle title="基础信息" />
            <div className="flex flex-wrap gap-4">
                <FormField
                control={form.control}
                name="productId"
                render={({ field }) => (
                  <FormItem className="flex-1 min-w-[200px]">
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
              <FormField
                control={form.control}
                name="warehouse"
                render={({ field }) => (
                  <FormItem className="flex-1 min-w-[200px]">
                    <FormLabel>仓库 <span className="text-destructive">*</span></FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="请选择仓库" />
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

            {currentStock !== null && (
              <div className="flex items-center gap-4 px-3 py-2 border border-border rounded-sm bg-muted/30">
                <Warehouse className="size-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">当前库存:</span>
                <span className="text-sm font-mono font-medium">{currentStock}</span>
                {afterStock !== null && (
                  <>
                    <span className="text-sm text-muted-foreground">入库后库存:</span>
                    <span className="text-sm font-mono font-medium text-primary">{afterStock}</span>
                  </>
                )}
              </div>
            )}

            <FormField
              control={form.control}
              name="subType"
              render={({ field }) => (
                <FormItem className="max-w-[280px]">
                  <FormLabel>入库类型 <span className="text-destructive">*</span></FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="请选择入库类型" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {INBOUND_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormSectionTitle title="明细信息" />
            <div className="flex flex-wrap gap-4">
              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem className="flex-1 min-w-[150px]">
                    <FormLabel>计量单位 <span className="text-destructive">*</span></FormLabel>
                    <Select value={field.value || undefined} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="请选择单位" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {selectedProduct && (
                          <>
                            <SelectItem value={selectedProduct.baseUnit}>
                              {selectedProduct.baseUnit}
                            </SelectItem>
                            {selectedProduct.salesUnit && conversionRatio > 0 && (
                              <SelectItem value={selectedProduct.salesUnit}>
                                {selectedProduct.salesUnit}（1 {selectedProduct.salesUnit} = {conversionRatio} {selectedProduct.baseUnit}）
                              </SelectItem>
                            )}
                          </>
                        )}
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
                  <FormItem className="flex-1 min-w-[150px]">
                    <FormLabel>数量 <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="入库数量" {...field} />
                    </FormControl>
                    {baseQtyInvalid ? (
                      <p className="text-xs text-destructive">换算后基本单位数量需为整数</p>
                    ) : (
                      <FormMessage />
                    )}
                    {isSalesUnit && qtyNum > 0 && !baseQtyInvalid && selectedProduct && (
                      <p className="text-xs text-muted-foreground">
                        将按 {baseQty} {selectedProduct.baseUnit} 增加库存
                      </p>
                    )}
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="unitPrice"
                render={({ field }) => (
                  <FormItem className="flex-1 min-w-[150px]">
                    <FormLabel>单价 (元) <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormSectionTitle title="单据信息" />
            <div className="flex flex-wrap gap-4">
              <FormField
                control={form.control}
                name="orderNo"
                render={({ field }) => (
                  <FormItem className="flex-1 min-w-[200px]">
                    <FormLabel>入库单号</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="自动生成"
                        {...field}
                        readOnly
                        className="bg-muted/50 font-mono"
                      />
                    </FormControl>
                    {generatedDocNo && (
                      <p className="text-xs text-primary font-medium">
                        上一单: {generatedDocNo}
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="operator"
                render={({ field }) => (
                  <FormItem className="flex-1 min-w-[200px]">
                    <FormLabel>操作人</FormLabel>
                    <FormControl>
                      <Input placeholder="自动识别当前账户" {...field} readOnly className="bg-muted/50" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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

            {selectedProduct && quantity > 0 && (
              <div className="text-sm text-muted-foreground font-mono px-3 py-2 border border-dashed border-border rounded-sm">
                入库金额: ¥{(quantity * form.getValues('unitPrice')).toFixed(2)}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => { form.reset(); setCurrentStock(null); }}>
                重置
              </Button>
              <Button type="submit" disabled={isSubmitting || baseQtyInvalid}>
                {isSubmitting ? '处理中...' : '确认入库'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
