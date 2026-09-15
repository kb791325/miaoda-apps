import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, PackageX } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchProducts } from '@/api/product';
import type { Product } from '@shared/product';

interface WarningProductsCardProps {
  /** 数据变化后由父组件递增，触发重新拉取 */
  refreshKey: number;
}

/** 库存预警列表：展示库存 ≤ 预警阈值的商品 */
const WarningProductsCard: React.FC<WarningProductsCardProps> = ({
  refreshKey,
}) => {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const loadWarningProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchProducts({ warningOnly: true });
      setItems(
        [...res.items].sort(
          (a: Product, b: Product): number => a.stock - b.stock,
        ),
      );
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : '预警商品加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadWarningProducts();
  }, [loadWarningProducts, refreshKey]);

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <AlertTriangle className="size-4 text-red-500" />
          库存预警商品
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((n: number) => (
              <Skeleton key={n} className="h-12 w-full" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex h-32 flex-col items-center justify-center gap-2 text-muted-foreground">
            <PackageX className="size-8" />
            <p className="text-sm">库存充足，暂无预警商品</p>
          </div>
        ) : (
          <ul className="divide-y">
            {items.map((product: Product) => (
              <li
                key={product.id}
                className="flex items-center gap-3 py-3 text-sm"
              >
                <span className="size-2 shrink-0 animate-pulse rounded-full bg-red-500" />
                <span className="min-w-0 flex-1 truncate font-medium">
                  {product.productName}
                </span>
                <span className="shrink-0 font-semibold text-red-600">
                  库存 {product.stock}
                  <span className="ml-1 text-xs font-normal text-muted-foreground">
                    / 预警 {product.warningThreshold}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

export default WarningProductsCard;
