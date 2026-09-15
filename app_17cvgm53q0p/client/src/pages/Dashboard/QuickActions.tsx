import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ShoppingCart,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { createStockChange, fetchProducts } from '@/api/product';
import { useAuth } from '@client/src/hooks/use-auth';
import type { Product } from '@shared/product';

type StockChangeActionType = 'in' | 'otherOut';

const stockSchema = z.object({
  productId: z.string().min(1, '请选择商品'),
  quantity: z.coerce.number().int('数量必须是正整数').min(1, '数量必须是正整数'),
  remark: z.string().max(100, '备注最多 100 字').optional(),
});

type StockFormData = z.infer<typeof stockSchema>;

interface QuickActionsProps {
  /** 出入库成功后通知仪表盘刷新统计数据 */
  onStockChanged: () => void;
}

/** 仪表盘快捷操作区：新增订单跳转、入库/出库直接弹窗登记 */
const QuickActions: React.FC<QuickActionsProps> = ({ onStockChanged }) => {
  const navigate = useNavigate();
  const { hasPerm } = useAuth();
  const [stockType, setStockType] = useState<StockChangeActionType>('in');
  const [stockOpen, setStockOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const productsLoadedRef = useRef(false);

  const form = useForm<StockFormData>({
    resolver: zodResolver(stockSchema),
    defaultValues: { productId: '', quantity: 1, remark: '' },
  });

  const loadProducts = useCallback(async () => {
    if (productsLoadedRef.current) return;
    setProductsLoading(true);
    try {
      const res = await fetchProducts({});
      setProducts(res.items);
      productsLoadedRef.current = true;
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : '商品加载失败');
    } finally {
      setProductsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (stockOpen) void loadProducts();
  }, [stockOpen, loadProducts]);

  const openStockDialog = (type: StockChangeActionType): void => {
    setStockType(type);
    form.reset({ productId: '', quantity: 1, remark: '' });
    setStockOpen(true);
  };

  const onSubmit = async (data: StockFormData): Promise<void> => {
    const product = products.find((item: Product) => item.id === data.productId);
    if (!product) {
      form.setError('productId', { message: '请选择商品' });
      return;
    }
    if (stockType === 'otherOut' && data.quantity > product.stock) {
      form.setError('quantity', { message: '出库数量不能超过当前库存' });
      return;
    }
    setSubmitting(true);
    try {
      await createStockChange(data.productId, {
        changeType: stockType,
        quantity: data.quantity,
        remark: data.remark || undefined,
      });
      toast.success(
        stockType === 'in'
          ? `已入库 ${product.productName} × ${data.quantity}`
          : `已完成其他出库 ${product.productName} × ${data.quantity}`,
      );
      setStockOpen(false);
      onStockChanged();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : '登记失败');
    } finally {
      setSubmitting(false);
    }
  };

  const dialogTitle = stockType === 'in' ? '商品入库' : '其他出库';

  return (
    <Card className="shadow-sm">
      <CardContent className="flex flex-wrap items-center gap-3 p-4">
        <span className="text-sm font-medium text-muted-foreground">
          快捷操作
        </span>
        {hasPerm('order:create') ? (
          <Button onClick={() => navigate('/orders?create=1')}>
            <ShoppingCart className="mr-1 h-4 w-4" />
            新增订单
          </Button>
        ) : null}
        <Button variant="outline" onClick={() => openStockDialog('in')}>
          <ArrowDownToLine className="mr-1 h-4 w-4 text-emerald-600" />
          商品入库
        </Button>
        <Button variant="outline" onClick={() => openStockDialog('otherOut')}>
          <ArrowUpFromLine className="mr-1 h-4 w-4 text-amber-600" />
          其他出库
        </Button>
      </CardContent>

      <Dialog open={stockOpen} onOpenChange={setStockOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription>
              选择商品并填写数量，提交后库存实时更新
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="productId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      商品 <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              productsLoading ? '商品加载中…' : '请选择商品'
                            }
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {products.map((product: Product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.productName}（库存 {product.stock}）
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
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      数量 <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input type="number" min={1} {...field} />
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
                        rows={2}
                        placeholder="选填，如补货批次、订单核销"
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
                  onClick={() => setStockOpen(false)}
                >
                  取消
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? '提交中…' : '确认提交'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default QuickActions;
