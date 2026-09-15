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
import { updateProduct } from '@client/src/api/product';
import { type Product } from '@shared/product';
import { useAuth } from '@client/src/hooks/use-auth';
import { extractErrorMessage } from './inventory-utils';

const productEditSchema = z.object({
  productName: z.string().min(1, '请输入商品名称'),
  price: z.coerce
    .number({ message: '请输入单价' })
    .min(0, '单价不能为负数'),
  warningThreshold: z.coerce
    .number({ message: '请输入预警阈值' })
    .int('预警阈值必须是整数')
    .min(0, '预警阈值不能为负数'),
  costPrice: z.coerce
    .number({ message: '请输入成本价' })
    .min(0, '成本价不能为负数'),
});

type ProductEditFormData = z.infer<typeof productEditSchema>;

export interface ProductEditDialogProps {
  open: boolean;
  product: Product | null;
  onClose: () => void;
  /** 提交成功后回调（父级刷新列表） */
  onSuccess: () => void;
}

/**
 * 商品信息编辑弹窗：名称/单价/预警阈值，回填原值，Zod 非负校验。
 */
export const ProductEditDialog: React.FC<ProductEditDialogProps> = ({
  open,
  product,
  onClose,
  onSuccess,
}) => {
  const { hasPerm } = useAuth();
  const canViewCost: boolean = hasPerm('cost:view');
  const canManagePrice: boolean = hasPerm('price:manage');
  const form = useForm<ProductEditFormData>({
    resolver: zodResolver(productEditSchema),
    defaultValues: {
      productName: '',
      price: 0,
      warningThreshold: 0,
      costPrice: 0,
    },
  });

  useEffect(() => {
    if (open && product) {
      form.reset({
        productName: product.productName ?? '',
        price: product.price ?? 0,
        warningThreshold: product.warningThreshold ?? 0,
        costPrice: product.costPrice ?? 0,
      });
    }
  }, [open, product, form]);

  const handleSubmit = form.handleSubmit(
    async (data: ProductEditFormData): Promise<void> => {
      if (!product) return;
      try {
        const payload: {
          productName: string;
          warningThreshold: number;
          price?: number;
          costPrice?: number;
        } = {
          productName: data.productName.trim(),
          warningThreshold: data.warningThreshold,
        };
        if (canManagePrice && data.price !== (product.price ?? 0)) {
          payload.price = data.price;
        }
        if (
          canViewCost &&
          canManagePrice &&
          data.costPrice !== (product.costPrice ?? 0)
        ) {
          payload.costPrice = data.costPrice;
        }
        await updateProduct(product.id, payload);
        toast.success('商品信息已更新');
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
          <DialogTitle>编辑商品</DialogTitle>
          <DialogDescription>
            {product ? `${product.productName}（${product.productNo}）` : ''}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="productName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    名称 <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="请输入商品名称" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    单价（¥） <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="0.00"
                      disabled={!canManagePrice}
                      {...field}
                    />
                  </FormControl>
                  {!canManagePrice ? (
                    <p className="text-xs text-muted-foreground">
                      仅管理员与财务可修改价格
                    </p>
                  ) : null}
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="warningThreshold"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    预警阈值 <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step="1"
                      placeholder="低于该数量预警"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {canViewCost ? (
            <FormField
              control={form.control}
              name="costPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>成本价（¥）</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="0.00"
                      disabled={!canManagePrice}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            ) : null}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>
                取消
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? '保存中…' : '保存'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
