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
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@client/src/components/ui/dialog';
import { ArrowUpFromLine, AlertTriangle, Warehouse } from 'lucide-react';
import { FormSectionTitle } from './FormSectionTitle';
import { useCurrentUserProfile } from '@lark-apaas/client-toolkit/hooks/useCurrentUserProfile';
import type { Product, OutboundRequest, OutboundResponse, WarehouseInventoryItem } from '@shared/api.interface';

const WAREHOUSES = [
  { value: '上海仓', label: '上海仓' },
  { value: '北京仓', label: '北京仓' },
  { value: '广州仓', label: '广州仓' },
  { value: '成都仓', label: '成都仓' },
];

const OUTBOUND_TYPES = [
  { value: '销售出库', label: '销售出库' },
  { value: '调拨出库', label: '调拨出库' },
  { value: '退货出库', label: '退货出库' },
  { value: '报废出库', label: '报废出库' },
];

const outboundSchema = z.object({
  productId: z.string().min(1, '请选择商品'),
  warehouse: z.string().min(1, '请选择仓库'),
  unit: z.string().min(1, '请选择计量单位'),
  quantity: z.coerce.number().min(1, '请输入数量'),
  subType: z.string().min(1, '请选择出库类型'),
  orderNo: z.string().min(1, '出库单号将自动生成'),
  operator: z.string(),
  remark: z.string().default(''),
});

type OutboundFormData = z.infer<typeof outboundSchema>;

interface OutboundFormProps {
  onOutboundSuccess?: (transactionId?: string) => void;
}

export function OutboundForm({ onOutboundSuccess }: OutboundFormProps) {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [currentStock, setCurrentStock] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [warningDialog, setWarningDialog] = useState(false);
  const [pendingRequest, setPendingRequest] = useState<OutboundRequest | null>(null);
  const [generatedDocNo, setGeneratedDocNo] = useState<string | null>(null);
  const userInfo = useCurrentUserProfile();

  const form = useForm<OutboundFormData>({
    resolver: zodResolver(outboundSchema),
    defaultValues: {
      productId: '',
      warehouse: '',
      unit: '',
      quantity: 0,
      subType: '',
      orderNo: '',
      operator: '',
      remark: '',
    },
    mode: 'onChange',
  });

  const orderNoVal = form.watch('orderNo');
  const operatorVal = form.watch('operator');

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

  const selectedProduct = allProducts.find((p: Product) => p.id === productId);
  const unitVal = form.watch('unit');
  const conversionRatio: number = selectedProduct?.conversionRatio ?? 0;
  const isSalesUnit: boolean = Boolean(
    selectedProduct?.salesUnit && conversionRatio > 0 && unitVal === selectedProduct.salesUnit,
  );
  const qtyNum: number = Number(quantity) || 0;
  const baseQty: number = isSalesUnit ? qtyNum * conversionRatio : qtyNum;
  const baseQtyInvalid: boolean = qtyNum > 0 && (!Number.isInteger(baseQty) || baseQty <= 0);

  useEffect(() => {
    const product: Product | undefined = allProducts.find((p: Product) => p.id === productId);
    if (product) {
      form.setValue('unit', product.baseUnit);
    }
  }, [productId, allProducts, form]);

  const afterStock = currentStock !== null ? currentStock - baseQty : null;
  const isBelowSafety = selectedProduct && afterStock !== null && afterStock < selectedProduct.safetyStock;
  const exceedsStock = currentStock !== null && baseQty > currentStock;

  const doSubmit = async (data: OutboundFormData) => {
    setIsSubmitting(true);
    try {
      const request: OutboundRequest = {
        productId: data.productId,
        warehouse: data.warehouse,
        quantity: baseQty,
        subType: data.subType,
        orderNo: data.orderNo,
        operator: data.operator,
        remark: data.remark || undefined,
      };
      const result: OutboundResponse = await operations.outbound(request);
      if (result.warning) {
        setPendingRequest(request);
        setWarningDialog(true);
        return;
      }
      setGeneratedDocNo(result.docNo ?? '');
      toast.success(`出库成功，单号：${result.docNo}`);
      form.reset();
      setCurrentStock(null);
      onOutboundSuccess?.(result.transactionId);
    } catch (err: unknown) {
      logger.error('Outbound failed:', String(err));
      toast.error('出库失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSubmit = (data: OutboundFormData) => {
    if (baseQtyInvalid) {
      form.setError('quantity', { message: '换算后基本单位数量需为整数' });
      return;
    }
    if (exceedsStock) {
      toast.error('出库数量不能超过当前库存');
      return;
    }
    doSubmit(data);
  };

  const confirmWarning = async () => {
    if (!pendingRequest) return;
    setIsSubmitting(true);
    try {
      const result: OutboundResponse = await operations.outbound({ ...pendingRequest, confirm: true });
      setGeneratedDocNo(result.docNo ?? '');
      toast.success(`出库成功（已确认），单号：${result.docNo}`);
      form.reset();
      setCurrentStock(null);
      setWarningDialog(false);
      setPendingRequest(null);
      onOutboundSuccess?.(result.transactionId);
    } catch (err: unknown) {
      logger.error('Outbound confirm failed:', String(err));
      toast.error('出库失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Card className="rounded-sm shadow-none border border-border">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <ArrowUpFromLine className="size-4 text-primary" />
            商品出库
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
                <div className="flex flex-wrap items-center gap-4 px-3 py-2 border border-border rounded-sm bg-muted/30">
                  <Warehouse className="size-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">可用库存:</span>
                  <span className="text-sm font-mono font-medium">{currentStock}</span>
                  {afterStock !== null && (
                    <>
                      <span className="text-sm text-muted-foreground">出库后库存:</span>
                      <span className={`text-sm font-mono font-medium ${isBelowSafety ? 'text-warning' : 'text-primary'}`}>
                        {afterStock}
                      </span>
                    </>
                  )}
                </div>
              )}

              {exceedsStock && (
                <div className="flex items-center gap-2 px-3 py-2 border border-destructive/40 rounded-sm bg-destructive/5">
                  <AlertTriangle className="size-4 text-destructive" />
                  <span className="text-sm text-destructive font-medium">
                    出库数量不能超过当前库存（可用 {currentStock}）
                  </span>
                </div>
              )}

              {isBelowSafety && !exceedsStock && (
                <div className="flex items-center gap-2 px-3 py-2 border border-warning/40 rounded-sm bg-warning/5">
                  <AlertTriangle className="size-4 text-warning" />
                  <span className="text-sm text-warning">
                    出库后库存将低于安全库存 ({selectedProduct?.safetyStock})
                  </span>
                </div>
              )}

              <FormSectionTitle title="明细信息" />
              <div className="flex flex-wrap gap-4">
                <FormField
                  control={form.control}
                  name="subType"
                  render={({ field }) => (
                    <FormItem className="flex-1 min-w-[150px]">
                      <FormLabel>出库类型 <span className="text-destructive">*</span></FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="请选择类型" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {OUTBOUND_TYPES.map((t) => (
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
                        <Input
                          type="number"
                          placeholder="出库数量"
                          {...field}
                          className={exceedsStock ? 'border-destructive focus-visible:ring-destructive/30' : ''}
                        />
                      </FormControl>
                      {exceedsStock ? (
                        <p className="text-xs text-destructive">出库数量不能超过当前库存</p>
                      ) : baseQtyInvalid ? (
                        <p className="text-xs text-destructive">换算后基本单位数量需为整数</p>
                      ) : (
                        <FormMessage />
                      )}
                      {isSalesUnit && qtyNum > 0 && !baseQtyInvalid && selectedProduct && (
                        <p className="text-xs text-muted-foreground">
                          将按 {baseQty} {selectedProduct.baseUnit} 扣减库存
                        </p>
                      )}
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
                        <FormLabel>出库单号</FormLabel>
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

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => { form.reset(); setCurrentStock(null); }}>
                  重置
                </Button>
                <Button type="submit" disabled={isSubmitting || exceedsStock || baseQtyInvalid}>
                  {isSubmitting ? '处理中...' : '确认出库'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Dialog open={warningDialog} onOpenChange={setWarningDialog}>
        <DialogContent className="rounded-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-warning" />
              库存预警确认
            </DialogTitle>
            <DialogDescription>
              当前操作将导致库存低于安全库存线，确认继续执行出库操作？
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWarningDialog(false)}>
              取消
            </Button>
            <Button onClick={confirmWarning} disabled={isSubmitting}>
              {isSubmitting ? '处理中...' : '确认出库'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
