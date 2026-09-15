import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';
import { ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createStockChange } from '@client/src/api/product';
import type { Product } from '@shared/product';
import { extractErrorMessage } from './inventory-utils';
import type { StockChangeActionType } from './ProductsTable';

/** 入库可选业务类型（出库固定为「其他出库」） */
const IN_BUSINESS_TYPES: string[] = ['采购入库', '退货入库'];

const stockChangeSchema = z.object({
  quantity: z.coerce
    .number({ message: '请输入变动数量' })
    .int('数量必须是正整数')
    .min(1, '数量必须是正整数'),
  businessType: z.string().optional(),
  remark: z.string().optional(),
});

type StockChangeFormData = z.infer<typeof stockChangeSchema>;

export interface StockChangeDialogProps {
  open: boolean;
  /** in=入库 / otherOut=其他出库，弹窗内可切换 */
  type: StockChangeActionType;
  product: Product | null;
  /** product 为空时供弹窗内下拉选择商品（页面级快捷入库/出库） */
  productOptions?: Product[];
  onClose: () => void;
  /** 提交成功后回调（父级刷新列表） */
  onSuccess: () => void;
}

/**
 * 出入库登记弹窗（入库/其他出库双模式）：数量正整数校验；
 * 其他出库时校验数量不超过当前库存。
 */
export const StockChangeDialog: React.FC<StockChangeDialogProps> = ({
  open,
  type,
  product,
  productOptions = [],
  onClose,
  onSuccess,
}) => {
  const [mode, setMode] = useState<StockChangeActionType>('in');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const form = useForm<StockChangeFormData>({
    resolver: zodResolver(stockChangeSchema),
    defaultValues: { quantity: 1, businessType: '', remark: '' },
  });

  useEffect(() => {
    if (open) {
      setMode(type);
      setSelectedProductId('');
      form.reset({ quantity: 1, businessType: '', remark: '' });
    }
  }, [open, type, form]);

  const isOtherOut = mode === 'otherOut';
  const title = isOtherOut ? '其他出库登记' : '入库登记';
  const targetProduct: Product | null =
    product ??
    productOptions.find(
      (item: Product): boolean => item.id === selectedProductId,
    ) ??
    null;

  const handleSubmit = form.handleSubmit(
    async (data: StockChangeFormData): Promise<void> => {
      if (!targetProduct) {
        toast.error('请先选择商品');
        return;
      }
      if (mode === 'in' && !data.businessType) {
        form.setError('businessType', { message: '请选择业务类型' });
        return;
      }
      if (isOtherOut && data.quantity > targetProduct.stock) {
        form.setError('quantity', {
          message: `出库数量不能超过当前库存（${targetProduct.stock}）`,
        });
        return;
      }
      try {
        const result = await createStockChange(targetProduct.id, {
          changeType: mode,
          quantity: data.quantity,
          businessType: isOtherOut ? '其他出库' : data.businessType,
          remark: data.remark?.trim() ? data.remark.trim() : undefined,
        });
        toast.success(
          `${isOtherOut ? '出库' : '入库'}成功：${targetProduct.productName} × ${data.quantity}，变动前库存 ${result.stockBefore} → 变动后库存 ${result.currentStock}`,
        );
        onSuccess();
        onClose();
      } catch (error: unknown) {
        toast.error(extractErrorMessage(error));
      }
    },
  );

  return (
    <Dialog open={open} onOpenChange={(next: boolean) => !next && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {targetProduct
              ? `商品：${targetProduct.productName}（当前库存 ${targetProduct.stock}）`
              : '请选择需要登记出入库的商品'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={mode === 'in' ? 'default' : 'outline'}
                onClick={() => setMode('in')}
              >
                <ArrowDownToLine className="size-4" />
                入库
              </Button>
              <Button
                type="button"
                size="sm"
                variant={mode === 'otherOut' ? 'default' : 'outline'}
                onClick={() => setMode('otherOut')}
              >
                <ArrowUpFromLine className="size-4" />
                其他出库
              </Button>
            </div>
            {!product && productOptions.length > 0 && (
              <FormItem>
                <FormLabel>
                  商品 <span className="text-destructive">*</span>
                </FormLabel>
                <Select
                  value={selectedProductId || undefined}
                  onValueChange={(value: string) => setSelectedProductId(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="请选择商品" />
                  </SelectTrigger>
                  <SelectContent>
                    {productOptions.map((item: Product): React.ReactNode => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.productName}（{item.productNo}）
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            )}
            <FormField
              control={form.control}
              name="businessType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    业务类型 <span className="text-destructive">*</span>
                  </FormLabel>
                  {isOtherOut ? (
                    <div className="flex h-9 items-center rounded-md border border-border bg-muted px-3 text-sm text-muted-foreground">
                      其他出库（固定）
                    </div>
                  ) : (
                    <Select
                      value={field.value || undefined}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="请选择业务类型" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {IN_BUSINESS_TYPES.map(
                          (item: string): React.ReactNode => (
                            <SelectItem key={item} value={item}>
                              {item}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                  )}
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
                      placeholder="请输入数量"
                      {...field}
                    />
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
                      rows={3}
                      placeholder={
                        isOtherOut
                          ? '选填，如领用原因/损耗说明'
                          : '选填，如采购单号'
                      }
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>
                取消
              </Button>
              <Button
                type="submit"
                size="lg"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting
                  ? '提交中…'
                  : isOtherOut
                    ? '确认其他出库'
                    : '确认入库'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
