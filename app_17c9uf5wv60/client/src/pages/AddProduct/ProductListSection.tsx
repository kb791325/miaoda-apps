import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import type { Product } from '@shared/api.interface';

interface ProductListSectionProps {
  productList: Product[];
  deletingId: string | null;
  onDelete: (id: string, name: string) => void;
}

const ProductListSection = ({
  productList,
  deletingId,
  onDelete,
}: ProductListSectionProps) => (
  <div className="bg-card border border-border rounded-sm mt-6">
    <div className="p-4 border-b border-border">
      <h3 className="text-sm font-medium text-foreground">
        商品列表
        <span className="ml-2 font-mono text-muted-foreground text-xs">
          共 {productList.length} 件
        </span>
      </h3>
    </div>
    {productList.length === 0 ? (
      <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
        暂无商品
      </div>
    ) : (
      <div className="overflow-auto max-h-[400px]">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left p-3 font-medium text-muted-foreground whitespace-nowrap">
                商品编码
              </th>
              <th className="text-left p-3 font-medium text-muted-foreground whitespace-nowrap">
                商品名称
              </th>
              <th className="text-left p-3 font-medium text-muted-foreground whitespace-nowrap">
                品类
              </th>
              <th className="text-right p-3 font-medium text-muted-foreground whitespace-nowrap">
                单价
              </th>
              <th className="text-right p-3 font-medium text-muted-foreground whitespace-nowrap">
                商品库存
              </th>
              <th className="text-center p-3 font-medium text-muted-foreground whitespace-nowrap">
                操作
              </th>
            </tr>
          </thead>
          <tbody>
            {productList.map((item: Product) => (
              <tr key={item.id} className="border-b border-border">
                <td className="p-3 font-mono text-xs text-muted-foreground">
                  {item.code}
                </td>
                <td className="p-3 text-foreground font-medium">{item.name}</td>
                <td className="p-3 text-muted-foreground">{item.category}</td>
                <td className="p-3 text-right font-mono text-foreground">
                  ¥{Number(item.unitPrice).toFixed(2)}
                </td>
                <td className="p-3 text-right font-mono text-muted-foreground">
                  {item.safetyStock}
                </td>
                <td className="p-3 text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={deletingId === item.id}
                    onClick={() => onDelete(item.id, item.name)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 h-7 px-2"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
);

export default ProductListSection;
