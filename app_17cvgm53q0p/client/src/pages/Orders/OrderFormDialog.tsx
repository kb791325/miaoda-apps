import React from 'react';
import axios from 'axios';
import { AlertTriangle } from 'lucide-react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

import type { Customer } from '@shared/customer';
import type { FeeType, OrderFee } from '@shared/fee';
import type { CreateOrderRequest } from '@shared/order';
import type { Product } from '@shared/product';

import {
  addOrderFee,
  deleteOrderFee,
  fetchFeeTypes,
  fetchOrderFees,
  updateOrderFee,
} from '@client/src/api/fee';
import { createOrder, updateOrder } from '@client/src/api/order';

import FeeTypeDialog from './FeeTypeDialog';
import OrderFeeEditor, { type FeeEditRow } from './OrderFeeEditor';
import OrderProductCombobox from './OrderProductCombobox';
import { extractErrorMessage, type OrderWithAddress } from './order-utils';

export interface OrderFormDialogProps {
  open: boolean;
  /** null 表示新增 */
  order: OrderWithAddress | null;
  customers: Customer[];
  products: Product[];
  onClose: () => void;
  /** 保存成功回调，传回保存后的订单 id（供列表行高亮） */
  onSaved: (savedOrderId: string) => void;
}


const buildOrderFormSchema = (getProducts: () => Product[]) =>
  z
    .object({
      customerId: z.string().min(1, '请选择客户'),
      productId: z.string().min(1, '请选择商品'),
      quantity: z.coerce
        .number({ message: '数量必须为正整数' })
        .int('数量必须为整数')
        .min(1, '数量必须为正整数'),
      address: z.string().optional(),
      remark: z.string().optional(),
    })
    .superRefine((data, ctx) => {
      const product = getProducts().find(
        (item: Product) => item.id === data.productId,
      );
      if (product && data.quantity > product.stock) {
        ctx.addIssue({
          code: 'custom',
          path: ['quantity'],
          message: `数量不能超过当前库存 ${product.stock}`,
        });
      }
    });

const orderFormSchemaForType = buildOrderFormSchema(() => []);

type OrderFormData = z.infer<typeof orderFormSchemaForType>;

const OrderFormDialog: React.FC<OrderFormDialogProps> = ({
  open,
  order,
  customers,
  products,
  onClose,
  onSaved,
}) => {
  const [submitting, setSubmitting] = React.useState<boolean>(false);
  const [feeTypes, setFeeTypes] = React.useState<FeeType[]>([]);
  const [feeRows, setFeeRows] = React.useState<FeeEditRow[]>([]);
  const [originalFees, setOriginalFees] = React.useState<FeeEditRow[]>([]);
  const [feeTypeDialogOpen, setFeeTypeDialogOpen] =
    React.useState<boolean>(false);
  const [creditBlockOpen, setCreditBlockOpen] = React.useState<boolean>(false);
  const [creditBlockMessage, setCreditBlockMessage] =
    React.useState<string>('');

  // 库存上限依赖异步加载的 products，用 getter 保证校验时读到最新列表
  const productsRef = React.useRef<Product[]>(products);
  productsRef.current = products;

  const resolver = React.useMemo(
    () => zodResolver(buildOrderFormSchema(() => productsRef.current)),
    [],
  );

  const form = useForm<OrderFormData>({
    resolver,
    defaultValues: {
      customerId: '',
      productId: '',
      quantity: 1,
      address: '',
      remark: '',
    },
  });

  React.useEffect(() => {
    if (!open) return;
    form.reset({
      customerId: order?.customerId ?? '',
      productId: order?.productId ?? '',
      quantity: order?.quantity ?? 1,
      address: order?.address ?? '',
      remark: order?.remark ?? '',
    });
    fetchFeeTypes()
      .then((res) => setFeeTypes(res.items))
      .catch((error: unknown) => toast.error(extractErrorMessage(error)));
    if (order) {
      fetchOrderFees(order.id)
        .then((res) => {
          const mapped: FeeEditRow[] = res.items.map((fee: OrderFee) => ({
            id: fee.id,
            feeTypeId: fee.feeTypeId,
            amount: fee.amount,
            isChargeCustomer: fee.isChargeCustomer,
            remark: fee.remark ?? '',
          }));
          setFeeRows(mapped);
          setOriginalFees(mapped);
        })
        .catch((error: unknown) => toast.error(extractErrorMessage(error)));
    } else {
      setFeeRows([]);
      setOriginalFees([]);
    }
  }, [open, order, form]);

  const watchedProductId: string = form.watch('productId');
  const watchedQuantity: number = Number(form.watch('quantity')) || 0;
  const goodsAmount: number = React.useMemo<number>(() => {
    const product: Product | undefined = products.find(
      (item: Product) => item.id === watchedProductId,
    );
    return (product?.price ?? 0) * watchedQuantity;
  }, [products, watchedProductId, watchedQuantity]);

  const reconcileFees = async (
    orderId: string,
    currentRows: FeeEditRow[],
  ): Promise<void> => {
    const keptIds: string[] = currentRows
      .filter((row: FeeEditRow) => row.id !== undefined)
      .map((row: FeeEditRow) => row.id ?? '');
    for (const original of originalFees) {
      if (original.id && !keptIds.includes(original.id)) {
        await deleteOrderFee(orderId, original.id);
      }
    }
    for (const row of currentRows) {
      if (!row.id) continue;
      const original: FeeEditRow | undefined = originalFees.find(
        (fee: FeeEditRow) => fee.id === row.id,
      );
      const changed: boolean =
        original !== undefined &&
        (original.amount !== row.amount ||
          original.isChargeCustomer !== row.isChargeCustomer ||
          original.remark !== row.remark);
      if (changed) {
        await updateOrderFee(orderId, row.id, {
          amount: row.amount,
          isChargeCustomer: row.isChargeCustomer,
          remark: row.remark || undefined,
        });
      }
    }
    for (const row of currentRows) {
      if (row.id) continue;
      await addOrderFee(orderId, {
        feeTypeId: row.feeTypeId,
        amount: row.amount,
        isChargeCustomer: row.isChargeCustomer,
        remark: row.remark || undefined,
      });
    }
  };

  const handleSubmit = async (data: OrderFormData): Promise<void> => {
    setSubmitting(true);
    try {
      const body: CreateOrderRequest = {
        customerId: data.customerId,
        productId: data.productId,
        quantity: data.quantity,
        address: data.address || undefined,
        remark: data.remark || undefined,
      };
      if (order) {
        await updateOrder(order.id, body);
        try {
          await reconcileFees(order.id, feeRows);
          toast.success('订单已保存');
          onSaved(order.id);
        } catch (error: unknown) {
          toast.error(extractErrorMessage(error));
          onSaved(order.id);
        }
      } else {
        const validFeeRows: FeeEditRow[] = feeRows.filter(
          (row: FeeEditRow) => row.feeTypeId !== '' && row.amount > 0,
        );
        const created = await createOrder({
          ...body,
          fees: validFeeRows.map((row: FeeEditRow) => ({
            feeTypeId: row.feeTypeId,
            amount: row.amount,
            isChargeCustomer: row.isChargeCustomer,
            remark: row.remark || undefined,
          })),
        });
        toast.success('订单已创建');
        onSaved(created.id);
      }
    } catch (error: unknown) {
      const axiosError = axios.isAxiosError(error) ? error : null;
      const responseData = axiosError?.response?.data as
        | { error?: { message?: string } }
        | undefined;
      const serverMessage: string | undefined = responseData?.error?.message;
      if (
        !order &&
        axiosError?.response?.status === 409 &&
        typeof serverMessage === 'string' &&
        serverMessage.includes('信用额度')
      ) {
        setCreditBlockMessage(serverMessage ?? extractErrorMessage(error));
        setCreditBlockOpen(true);
      } else {
        toast.error(extractErrorMessage(error));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
    <Dialog
      open={open}
      onOpenChange={(nextOpen: boolean) => {
        if (!nextOpen) onClose();
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{order ? '编辑订单' : '新增订单'}</DialogTitle>
          <DialogDescription>
            金额与商品名称由系统自动计算，无需填写。
          </DialogDescription>
        </DialogHeader>

        <div className="bg-accent text-accent-foreground rounded-md px-4 py-3 text-base">
          操作步骤：1. 选择客户 2. 选择商品并填写数量 3. 确认提交
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((data: OrderFormData) => {
              void handleSubmit(data);
            })}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="customerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    客户 <span className="text-destructive">*</span>
                  </FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={(value: string) => {
                      field.onChange(value);
                      const selected: Customer | undefined = customers.find(
                        (customer: Customer) => customer.id === value,
                      );
                      form.setValue('address', selected?.address ?? '', {
                        shouldDirty: true,
                      });
                    }}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="请选择客户" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {customers.map((customer: Customer) => (
                        <SelectItem
                          key={customer.id}
                          value={customer.id}
                        >
                          {customer.customerName}
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
              name="productId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    商品 <span className="text-destructive">*</span>
                  </FormLabel>
                  <OrderProductCombobox
                    value={field.value}
                    products={products}
                    onChange={field.onChange}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    数量 <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      step={1}
                      placeholder="请输入数量"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <OrderFeeEditor
              feeTypes={feeTypes}
              rows={feeRows}
              onChange={setFeeRows}
              goodsAmount={goodsAmount}
              onManageFeeTypes={() => setFeeTypeDialogOpen(true)}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>收货地址</FormLabel>
                  <FormControl>
                    <Input placeholder="请输入收货地址（选填）" {...field} />
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
                  <FormLabel>备注</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="请输入备注（选填）"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="lg"
                disabled={submitting}
                onClick={onClose}
              >
                取消
              </Button>
              <Button type="submit" size="lg" disabled={submitting}>
                {submitting ? '提交中…' : order ? '保存' : '确认提交'}
              </Button>
            </DialogFooter>
          </form>
        </Form>

        <FeeTypeDialog
          open={feeTypeDialogOpen}
          onClose={() => setFeeTypeDialogOpen(false)}
          onChanged={() => {
            fetchFeeTypes()
              .then((res) => setFeeTypes(res.items))
              .catch(() => undefined);
          }}
        />
      </DialogContent>
    </Dialog>

    <Dialog
      open={creditBlockOpen}
      onOpenChange={(nextOpen: boolean) => {
        if (!nextOpen) setCreditBlockOpen(false);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            超出信用额度，无法创建订单
          </DialogTitle>
          <DialogDescription className="text-sm text-foreground">
            {creditBlockMessage}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button size="lg" onClick={() => setCreditBlockOpen(false)}>
            我知道了
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
};

export default OrderFormDialog;
