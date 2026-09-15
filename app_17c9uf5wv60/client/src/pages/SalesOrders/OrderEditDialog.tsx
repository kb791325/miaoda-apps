import { useEffect, useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
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
import { FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { salesOrders } from '@client/src/api';
import type {
  SalesOrder,
  SalesOrderItem,
  ProductWithInventory,
  CreateSalesOrderRequest,
} from '@shared/api.interface';
import { salesOrderSchema, EMPTY_SALES_ITEM } from './formSchema';
import type { OrderFormData } from './formSchema';
import { SalesItemsEditor } from './SalesItemsEditor';

const WAREHOUSES = ['上海仓', '北京仓', '广州仓', '成都仓'];

interface OrderEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: SalesOrder | null;
  productOptions: ProductWithInventory[];
  onSaved: () => void;
}

export function OrderEditDialog({
  open,
  onOpenChange,
  order,
  productOptions,
  onSaved,
}: OrderEditDialogProps) {
  const isEdit = !!order;

  const form = useForm<OrderFormData>({
    resolver: zodResolver(salesOrderSchema),
    defaultValues: {
      customerName: '',
      customerContact: '',
      customerPhone: '',
      warehouse: '',
      expectedShipDate: '',
      remark: '',
      items: [EMPTY_SALES_ITEM],
    },
  });

  useEffect(() => {
    if (!open) return;
    if (order) {
      form.reset({
        customerName: order.customerName,
        customerContact: order.customerContact ?? '',
        customerPhone: order.customerPhone ?? '',
        warehouse: order.warehouse,
        expectedShipDate: order.expectedShipDate ?? '',
        remark: order.remark ?? '',
        items:
          order.items?.map((item: SalesOrderItem) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            unit:
              item.unit ||
              productOptions.find(
                (p: ProductWithInventory) => p.id === item.productId,
              )?.baseUnit ||
              '',
          })) ?? [EMPTY_SALES_ITEM],
      });
    } else {
      form.reset({
        customerName: '',
        customerContact: '',
        customerPhone: '',
        warehouse: '',
        expectedShipDate: '',
        remark: '',
        items: [EMPTY_SALES_ITEM],
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, order, form]);

  const productMap = useMemo(() => {
    const map = new Map<string, ProductWithInventory>();
    for (const p of productOptions) {
      map.set(p.id, p);
    }
    return map;
  }, [productOptions]);

  const isSubmitting = form.formState.isSubmitting;

  const handleSubmit = async (data: OrderFormData) => {
    try {
      const payload: CreateSalesOrderRequest = {
        customerName: data.customerName,
        customerContact: data.customerContact || undefined,
        customerPhone: data.customerPhone || undefined,
        warehouse: data.warehouse,
        expectedShipDate: data.expectedShipDate || undefined,
        remark: data.remark || undefined,
        items: data.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      };

      if (isEdit && order) {
        await salesOrders.updateOrder(order.id, payload);
        toast.success('订单已更新');
      } else {
        await salesOrders.createOrder(payload);
        toast.success('订单创建成功');
      }
      onSaved();
      onOpenChange(false);
    } catch (err: unknown) {
      logger.error(isEdit ? '更新订单失败:' : '创建订单失败:', String(err));
      toast.error(isEdit ? '更新订单失败，请重试' : '创建订单失败，请重试');
    }
  };

  const handleProductChange = (index: number, productId: string) => {
    const product = productMap.get(productId);
    form.setValue(`items.${index}.productId`, productId);
    if (product) {
      form.setValue(`items.${index}.unitPrice`, product.unitPrice);
      form.setValue(`items.${index}.unit`, product.baseUnit);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[820px] max-h-[85vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="px-6 py-5 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-sm bg-primary/10">
              <FileText className="size-4 text-primary" />
            </div>
            <DialogTitle className="text-base font-semibold tracking-tight">
              {isEdit ? '编辑销售订单' : '新增销售订单'}
            </DialogTitle>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="px-6 py-5 space-y-6"
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
                  name="customerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-muted-foreground font-normal">
                        客户名称 <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="请输入客户名称" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="warehouse"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-muted-foreground font-normal">
                        发货仓库 <span className="text-destructive">*</span>
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="请选择仓库" />
                          </SelectTrigger>
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
                  name="customerContact"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-muted-foreground font-normal">
                        联系人
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="请输入联系人" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="customerPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-muted-foreground font-normal">
                        联系电话
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="请输入联系电话" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="expectedShipDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-muted-foreground font-normal">
                        预计发货日
                      </FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="remark"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-muted-foreground font-normal">
                        备注
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="选填" {...field} />
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
                  商品明细
                </span>
              </div>
              <SalesItemsEditor
                control={form.control}
                productOptions={productOptions}
                onProductSelect={handleProductChange}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                取消
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="size-4 mr-2 animate-spin" />
                )}
                {isEdit ? '保存修改' : '创建订单'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
