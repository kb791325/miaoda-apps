import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import dayjs from 'dayjs';
import { purchaseOrders, suppliers, products as productsApi } from '@client/src/api';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@client/src/components/ui/dialog';
import { Button } from '@client/src/components/ui/button';
import { Textarea } from '@client/src/components/ui/textarea';
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
import { Popover, PopoverContent, PopoverTrigger } from '@client/src/components/ui/popover';
import { Calendar } from '@client/src/components/ui/calendar';
import { Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type {
  CreatePurchaseOrderRequest,
  ProductWithInventory,
  Supplier,
} from '@shared/api.interface';
import { FALLBACK_WAREHOUSES, extractErrorMessage } from './constants';
import { purchaseOrderSchema, EMPTY_FORM, calcItemsTotal } from './formSchema';
import type { PurchaseOrderFormData } from './formSchema';
import { OrderItemsEditor } from './OrderItemsEditor';

interface PurchaseOrderCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export const PurchaseOrderCreateDialog: React.FC<
  PurchaseOrderCreateDialogProps
> = ({ open, onOpenChange, onCreated }) => {
  const [supplierOptions, setSupplierOptions] = useState<Supplier[]>([]);
  const [warehouseOptions, setWarehouseOptions] = useState<string[]>([]);
  const [productOptions, setProductOptions] = useState<ProductWithInventory[]>(
    [],
  );
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<PurchaseOrderFormData>({
    resolver: zodResolver(purchaseOrderSchema),
    defaultValues: EMPTY_FORM,
  });

  useEffect(() => {
    if (!open) return;
    form.reset(EMPTY_FORM);
    const loadOptions = async (): Promise<void> => {
      setOptionsLoading(true);
      try {
        const [supplierRes, productRes] = await Promise.all([
          suppliers.getSuppliers({ page: 1, pageSize: 100, status: 'active' }),
          productsApi.getProducts({ page: 1, pageSize: 200 }),
        ]);
        setSupplierOptions(supplierRes.items);
        setProductOptions(productRes.items);
        setWarehouseOptions(FALLBACK_WAREHOUSES);
      } catch (err: unknown) {
        logger.error('加载采购订单表单选项失败:', String(err));
        toast.error(extractErrorMessage(err, '加载表单选项失败'));
      } finally {
        setOptionsLoading(false);
      }
    };
    loadOptions();
  }, [open, form]);

  const watchedItems = useWatch({ control: form.control, name: 'items' });
  const totalAmount: number = calcItemsTotal(watchedItems);

  const handleProductSelect = (index: number, productId: string): void => {
    const product: ProductWithInventory | undefined = productOptions.find(
      (p: ProductWithInventory) => p.id === productId,
    );
    if (product) {
      form.setValue(`items.${index}.unitPrice`, product.unitPrice, {
        shouldDirty: true,
      });
      form.setValue(`items.${index}.unit`, product.baseUnit, {
        shouldDirty: true,
      });
    }
  };

  const handleSubmit = async (data: PurchaseOrderFormData): Promise<void> => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const payload: CreatePurchaseOrderRequest = {
        supplierId: data.supplierId,
        warehouse: data.warehouse,
        expectedDate: data.expectedDate
          ? dayjs(data.expectedDate).format('YYYY-MM-DD')
          : undefined,
        remark: data.remark?.trim() || undefined,
        items: data.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      };
      await purchaseOrders.createOrder(payload);
      toast.success('采购订单创建成功');
      onOpenChange(false);
      onCreated();
    } catch (err: unknown) {
      logger.error('创建采购订单失败:', String(err));
      toast.error(extractErrorMessage(err, '创建采购订单失败'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>新建采购订单</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-4 w-1 rounded-sm bg-primary" />
                <span className="text-sm font-medium text-foreground">
                  基本信息
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="supplierId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>供应商 *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || undefined}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="请选择供应商" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {supplierOptions.map((s: Supplier) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
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
                  <FormItem>
                    <FormLabel>目标仓库 *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || undefined}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="请选择目标仓库" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {warehouseOptions.map((wh: string) => (
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
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="expectedDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>预计到货日期</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal gap-2"
                          >
                            <CalendarIcon className="size-4 text-muted-foreground" />
                            {field.value ? (
                              <span className="font-mono text-xs">
                                {dayjs(field.value).format('YYYY-MM-DD')}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">
                                请选择日期
                              </span>
                            )}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="remark"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>备注</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="选填，如交货要求等"
                        value={field.value ?? ''}
                        onChange={field.onChange}
                        rows={1}
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
                  商品明细
                </span>
              </div>
              <OrderItemsEditor
                control={form.control}
                productOptions={productOptions}
                onProductSelect={handleProductSelect}
              />
            </div>

            <DialogFooter className="border-t border-border pt-4 sm:justify-between">
              <div className="text-sm text-muted-foreground">
                总金额：
                <span className="font-mono font-semibold text-base text-foreground">
                  ¥{totalAmount.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  取消
                </Button>
                <Button type="submit" disabled={submitting || optionsLoading}>
                  {submitting && <Loader2 className="size-4 animate-spin" />}
                  创建订单
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
