import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';
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
import { productApi } from '@client/src/api';
import type { Product } from '@shared/product';
import { extractErrorMessage } from './inventory-utils';

const stocktakeSchema = z.object({
  actualQuantity: z.string().regex(/^\d+$/, '实盘数量必须是非负整数'),
  remark: z.string().max(200, '备注不能超过 200 字'),
});

type StocktakeFormData = z.infer<typeof stocktakeSchema>;

export interface StocktakeDialogProps {
  open: boolean;
  product: Product | null;
  onClose: () => void;
  /** 提交成功后回调（父级刷新列表） */
  onSuccess: () => void;
}

/** 库存盘点弹窗：输入实盘数量与当前库存比对，差值记「盘点调整」流水 */
export const StocktakeDialog: React.FC<StocktakeDialogProps> = ({
  open,
  product,
  onClose,
  onSuccess,
}) => {
  const form = useForm<StocktakeFormData>({
    resolver: zodResolver(stocktakeSchema),
    defaultValues: { actualQuantity: '', remark: '' },
  });

  useEffect(() => {
    if (open) {
      form.reset({ actualQuantity: '', remark: '' });
    }
  }, [open, form]);

  const actualValue: string = form.watch('actualQuantity');
  const parsed: number = /^\d+$/.test(actualValue) ? Number(actualValue) : -1;
  const diff: number =
    product !== null && parsed >= 0 ? parsed - product.stock : 0;

  const handleSubmit = form.handleSubmit(
    async (data: StocktakeFormData): Promise<void> => {
      if (!product) return;
      try {
        const result = await productApi.stocktakeProduct(product.id, {
          actualQuantity: Number(data.actualQuantity),
          remark: data.remark.trim() !== '' ? data.remark.trim() : undefined,
        });
        if (result.adjusted === 0) {
          toast.success('实盘数量与当前库存一致，无需调整');
        } else {
          toast.success(
            `盘点完成：库存 ${result.stockAfter - result.adjusted} → ${result.stockAfter}`,
          );
        }
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
          <DialogTitle>库存盘点</DialogTitle>
          <DialogDescription>
            {product
              ? `商品：${product.productName}（当前库存 ${product.stock}）`
              : ''}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="actualQuantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    实盘数量 <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      placeholder="请输入实际盘点数量"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {product !== null && parsed >= 0 ? (
              <p className="text-sm text-muted-foreground">
                {diff === 0
                  ? '与当前库存一致，无需调整'
                  : diff > 0
                    ? `盘盈 +${diff}，库存将调整为 ${product.stock + diff}`
                    : `盘亏 ${diff}，库存将调整为 ${product.stock + diff}`}
              </p>
            ) : null}
            <FormField
              control={form.control}
              name="remark"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>备注（选填）</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="可填写盘点说明，如盘点人、差异原因等"
                      rows={3}
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
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? '提交中…' : '确认盘点'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
