import { Button } from '@/components/ui/button';
import { useTheme } from '@client/src/hooks/useTheme';
import type {
  ProductWithInventory,
  WarehouseInventoryItem,
  HealthScore,
} from '@shared/api.interface';

/** 状态标签：语义 token 双态自动切换 */
const ISSUE_TAG_STYLES: Record<string, string> = {
  '缺货': 'bg-destructive/10 text-destructive border-destructive/20',
  '积压': 'bg-warning/10 text-warning border-warning/20',
  '关注': 'bg-warning/10 text-warning border-warning/20',
  '低库存': 'bg-destructive/10 text-destructive border-destructive/20',
  '正常': 'bg-success/10 text-success border-success/20',
};

/** 紫色「滞销」无对应语义 token，保留 hsl 任意值双态样式 */
const ISSUE_TAG_STALE_LIGHT =
  'bg-[hsl(270_55%_45%_0.1)] text-[hsl(270_55%_38%)] border-[hsl(270_55%_45%_0.25)]';
const ISSUE_TAG_STALE_DARK =
  'bg-[hsl(270_60%_62%_0.16)] text-[hsl(270_60%_72%)] border-[hsl(270_60%_62%_0.3)]';

function getIssueTagStyle(tag: string, isDark: boolean): string {
  if (tag === '滞销') {
    return isDark ? ISSUE_TAG_STALE_DARK : ISSUE_TAG_STALE_LIGHT;
  }
  return ISSUE_TAG_STYLES[tag] ?? '';
}

function getProductStatusInfo(
  productId: string,
  totalQuantity: number,
  safetyStock: number,
  scoreMap: Map<string, HealthScore>,
  isDark: boolean,
): { label: string; className: string } {
  const score = scoreMap.get(productId);
  if (score?.issues) {
    const tagMatch = score.issues.match(/\[(缺货|积压|滞销|关注|预警|低库存)\]/);
    if (tagMatch) {
      const tag = tagMatch[1];
      return {
        label: tag,
        className: getIssueTagStyle(tag, isDark),
      };
    }
  }
  if (totalQuantity === 0) {
    return { label: '缺货', className: getIssueTagStyle('缺货', isDark) };
  }
  if (safetyStock > 0 && totalQuantity < safetyStock) {
    return { label: '低库存', className: getIssueTagStyle('低库存', isDark) };
  }
  return { label: '正常', className: getIssueTagStyle('正常', isDark) };
}

interface ProductTableProps {
  items: ProductWithInventory[];
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
  onViewDetail?: (productId: string) => void;
  healthScoreMap?: Map<string, HealthScore>;
}

const WAREHOUSES = ['上海仓', '北京仓', '广州仓', '成都仓'];

function getWarehouseQty(
  inventory: WarehouseInventoryItem[],
  warehouse: string,
): number {
  const found = inventory.find(
    (inv) => inv.warehouse === warehouse,
  );
  return found?.quantity ?? 0;
}

export const ProductTable = ({
  items,
  page,
  totalPages,
  total,
  onPageChange,
  onViewDetail,
  healthScoreMap = new Map<string, HealthScore>(),
}: ProductTableProps) => {
  const { isDark } = useTheme();
  if (!items.length) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
        暂无商品数据
      </div>
    );
  }
  return (
    <div>
      <div className="overflow-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left p-2 font-medium text-muted-foreground whitespace-nowrap">
                商品编码
              </th>
              <th className="text-left p-2 font-medium text-muted-foreground whitespace-nowrap w-[224px]">
                商品名称
              </th>
              <th className="text-left p-2 font-medium text-muted-foreground whitespace-nowrap">
                品类
              </th>
              {WAREHOUSES.map((wh) => (
                <th
                  key={wh}
                  className="text-right p-2 font-medium text-muted-foreground whitespace-nowrap"
                >
                  {wh}
                </th>
              ))}
              <th className="text-right p-2 font-medium text-muted-foreground whitespace-nowrap">
                总库存
              </th>
              <th className="text-center p-2 font-medium text-muted-foreground whitespace-nowrap">
                状态
              </th>
              <th className="text-center p-2 font-medium text-muted-foreground whitespace-nowrap">
                操作
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const statusInfo = getProductStatusInfo(
                item.id,
                item.totalQuantity,
                item.safetyStock,
                healthScoreMap,
                isDark,
              );
              return (
                <tr
                  key={item.id}
                  className="border-b border-border"
                >
                  <td className="p-2 font-mono text-xs text-muted-foreground">
                    {item.code}
                  </td>
                  <td className="p-2 text-foreground font-medium w-[224px] max-w-[224px]">
                    <span className="block truncate" title={item.name}>
                      {item.name}
                    </span>
                  </td>
                  <td className="p-2 text-muted-foreground">
                    {item.category}
                  </td>
                  {WAREHOUSES.map((wh) => (
                    <td
                      key={wh}
                      className="p-2 text-right font-mono text-foreground"
                    >
                      {getWarehouseQty(
                        item.inventory,
                        wh,
                      ).toLocaleString()}
                    </td>
                  ))}
                  <td className="p-2 text-right font-mono text-foreground font-semibold">
                    {item.totalQuantity.toLocaleString()}
                  </td>
                  <td className="p-2 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 text-xs rounded-sm border ${statusInfo.className}`}
                    >
                      {statusInfo.label}
                    </span>
                  </td>
                  <td className="p-2 text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-primary hover:text-primary"
                      onClick={() => onViewDetail?.(item.id)}
                      disabled={!onViewDetail}
                    >
                      详情
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
        <span className="text-xs text-muted-foreground">
          共 {total} 条记录
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            上一页
          </Button>
          <span className="text-xs text-muted-foreground">
            {page}/{totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            下一页
          </Button>
        </div>
      </div>
    </div>
  );
};
