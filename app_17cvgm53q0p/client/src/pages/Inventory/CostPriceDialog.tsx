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
import { productApi } from '@client/src/api';
import type { Product } from '@shared/product';
import { extractErrorMessage, formatMoney } from './inventory-utils';

const costPriceSchema = z.object({
  costPrice: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, '请输入不小于 0 的数字，最多 2 位小数'),
});

type CostPriceFormData = z.infer<typeof costPriceSchema>;

export interface CostPriceDialogProps {
  open: boolean;
  product: Product | null;
  onClose: () => void;
  /** 提交成功后回调（父级刷新列表与统计） */
  onSuccess: () => void;
}

/** 设置成本价弹窗：单字段数字输入（>=0，最多 2 位小数） */
export const CostPriceDialog: React.FC<CostPriceDialogProps> = ({
  open,
  product,
  onClose,
  onSuccess,
}) => {
  const form = useForm<CostPriceFormData>({
    resolver: zodResolver(costPriceSchema),
    defaultValues: { costPrice: '' },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        costPrice: product ? String(product.costPrice ?? 0) : '',
      });
    }
  }, [open, product, form]);

  const handleSubmit = form.handleSubmit(
    async (data: CostPriceFormData): Promise<void> => {
      if (!product) return;
      try {
        await productApi.updateProductProfile(product.id, {
          costPrice: Number(data.costPrice),
        });
        toast.success(`「${product.productName}」成本价已更新`);
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
          <DialogTitle>设置成本价</DialogTitle>
          <DialogDescription>
            {product
              ? `商品：${product.productName}（当前成本价 ${formatMoney(product.costPrice ?? 0)}）`
              : ''}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="costPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    成本价（元） <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      placeholder="请输入成本价"
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
                {form.formState.isSubmitting ? '提交中…' : '确认保存'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
