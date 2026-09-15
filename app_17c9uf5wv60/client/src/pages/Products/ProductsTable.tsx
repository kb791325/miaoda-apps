import { Badge } from '@client/src/components/ui/badge';
import { Button } from '@client/src/components/ui/button';
import { Checkbox } from '@client/src/components/ui/checkbox';
import { Image as ProductImage } from '@client/src/components/ui/image';
import { ChevronLeft, ChevronRight, Package } from 'lucide-react';
import type {
  ProductWithInventory,
  HealthScore,
} from '@shared/api.interface';
import { WAREHOUSES, getStatusTags } from './productStatusTags';

interface ProductsTableProps {
  items: ProductWithInventory[];
  total: number;
  page: number;
  totalPages: number;
  isLoading: boolean;
  healthScoreMap: Map<string, HealthScore>;
  selectedIds: string[];
  onToggleAll: (checked: boolean | 'indeterminate') => void;
  onToggleOne: (id: string, checked: boolean | 'indeterminate') => void;
  onViewDetail: (id: string) => void;
  onEdit: (item: ProductWithInventory) => void;
  onOffline: (item: ProductWithInventory) => void;
  onPageChange: (page: number) => void;
}

const SHELF_ON_STYLE =
  'rounded-full bg-success/10 text-success border border-success/20';
const SHELF_OFF_STYLE =
  'rounded-full bg-muted text-muted-foreground border border-border';

function getWarehouseQty(
  item: ProductWithInventory,
  warehouse: string,
): number {
  const found = item.inventory.find((i) => i.warehouse === warehouse);
  return found?.quantity ?? 0;
}

export function ProductsTable({
  items,
  total,
  page,
  totalPages,
  isLoading,
  healthScoreMap,
  selectedIds,
  onToggleAll,
  onToggleOne,
  onViewDetail,
  onEdit,
  onOffline,
  onPageChange,
}: ProductsTableProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
        加载中...
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
        暂无符合条件的商品数据
      </div>
    );
  }

  const currentPageIds: string[] = items.map(
    (item: ProductWithInventory) => item.id,
  );
  const allPageSelected: boolean =
    currentPageIds.length > 0 &&
    currentPageIds.every((id: string) => selectedIds.includes(id));
  const somePageSelected: boolean = currentPageIds.some((id: string) =>
    selectedIds.includes(id),
  );

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm whitespace-nowrap">
          <thead>
            <tr className="border-b border-border">
              <th className="px-3 py-2.5 text-left w-10">
                <Checkbox
                  checked={
                    allPageSelected
                      ? true
                      : somePageSelected
                        ? 'indeterminate'
                        : false
                  }
                  onCheckedChange={(checked: boolean | 'indeterminate') =>
                    onToggleAll(checked)
                  }
                />
              </th>
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground w-28">
                商品编码
              </th>
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground min-w-[140px] w-[48px]">
                商品名称
              </th>
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground w-24">
                品类
              </th>
              {WAREHOUSES.map((wh) => (
                <th
                  key={wh}
                  className="px-3 py-2.5 text-right font-medium text-muted-foreground w-20"
                >
                  {wh}
                </th>
              ))}
              <th className="px-3 py-2.5 text-right font-medium text-muted-foreground w-20">
                总库存
              </th>
              <th className="px-3 py-2.5 text-center font-medium text-muted-foreground w-20">
                上架状态
              </th>
              <th className="px-3 py-2.5 text-center font-medium text-muted-foreground w-20">
                状态
              </th>
              <th className="px-3 py-2.5 text-right font-medium text-muted-foreground w-36">
                操作
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item: ProductWithInventory) => {
              const statusTags = getStatusTags(
                item.id,
                item.totalQuantity,
                item.safetyStock,
                healthScoreMap,
              );
              const isOnShelf: boolean = item.shelfStatus === 'active';
              return (
                <tr
                  key={item.id}
                  className="border-b border-border/50 hover:bg-muted/30"
                >
                  <td className="px-3 py-2.5">
                    <Checkbox
                      checked={selectedIds.includes(item.id)}
                      onCheckedChange={(checked: boolean | 'indeterminate') =>
                        onToggleOne(item.id, checked)
                      }
                    />
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs">
                    {item.code}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2.5">
                      {item.imageUrl ? (
                        <ProductImage
                          src={item.imageUrl}
                          alt={item.name}
                          width={40}
                          className="h-10 w-10 shrink-0 rounded-sm border border-border object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-muted">
                          <Package className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <span className="font-medium">{item.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <Badge variant="secondary" className="font-normal">
                      {item.category}
                    </Badge>
                  </td>
                  {WAREHOUSES.map((wh) => (
                    <td key={wh} className="px-3 py-2.5 text-right font-mono">
                      {getWarehouseQty(item, wh)}
                    </td>
                  ))}
                  <td className="px-3 py-2.5 text-right">
                    <div className="font-mono font-medium">
                      {item.totalQuantity}
                    </div>
                    {item.salesUnit && item.conversionRatio ? (
                      <div className="text-xs text-muted-foreground">
                        销售单位约等于{' '}
                        {(item.totalQuantity / item.conversionRatio).toFixed(1)}{' '}
                        {item.salesUnit}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <Badge
                      className={isOnShelf ? SHELF_ON_STYLE : SHELF_OFF_STYLE}
                    >
                      {isOnShelf ? '上架' : '下架'}
                    </Badge>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <div className="flex flex-wrap items-center justify-center gap-1">
                      {statusTags.map((tag) => (
                        <Badge key={tag.label} className={tag.className}>
                          {tag.label}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => onViewDetail(item.id)}
                        className="text-primary hover:text-primary/80 text-xs px-1.5 py-0.5"
                      >
                        详情
                      </button>
                      <button
                        type="button"
                        onClick={() => onEdit(item)}
                        className="text-success hover:text-success/80 text-xs px-1.5 py-0.5"
                      >
                        编辑
                      </button>
                      <button
                        type="button"
                        onClick={() => onOffline(item)}
                        className="text-destructive hover:text-destructive/80 text-xs px-1.5 py-0.5"
                      >
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between pt-4 mt-2 border-t border-border">
        <span className="text-sm text-muted-foreground">
          共 {total} 条商品
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => onPageChange(Math.max(1, page - 1))}
          >
            <ChevronLeft className="size-4" />
            上一页
          </Button>
          <span className="text-sm font-mono px-2">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          >
            下一页
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </>
  );
}
