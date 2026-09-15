import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CustomerProfitRow, ProductProfitRow } from '@shared/finance';
import { formatMoney, formatPercent } from './finance-utils';

interface RankTableStateProps {
  loading: boolean;
  error: boolean;
  empty: boolean;
  emptyText: string;
  onRetry: () => void;
  children: React.ReactNode;
}

/** 排行表统一状态：骨架 / 错误重试 / 空态 */
const RankTableState: React.FC<RankTableStateProps> = ({
  loading,
  error,
  empty,
  emptyText,
  onRetry,
  children,
}) => {
  if (loading) {
    return (
      <div className="space-y-2 py-2">
        {[1, 2, 3, 4, 5].map((n: number) => (
          <Skeleton key={n} className="h-9 w-full" />
        ))}
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex h-[220px] flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
        <p>排行数据加载失败</p>
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="mr-1 h-4 w-4" />
          重新加载
        </Button>
      </div>
    );
  }
  if (empty) {
    return (
      <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
        {emptyText}
      </div>
    );
  }
  return <>{children}</>;
};

/** 金额单元格：千分位 + 负值红色 */
const MoneyCell: React.FC<{ value: number }> = ({ value }) => (
  <td
    className={cn(
      'py-3 pl-4 text-right tabular-nums',
      value < 0 ? 'font-medium text-destructive' : 'text-foreground',
    )}
  >
    {formatMoney(value)}
  </td>
);

const headCellClass: string = 'py-3 pl-4 font-medium';
const rowClass: string = 'border-b border-border last:border-0 hover:bg-muted/40';

export interface FinanceRankTablesProps {
  productRank: ProductProfitRow[];
  customerRank: CustomerProfitRow[];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}

/** 商品利润排行 Top10 + 客户利润排行 Top10（原生 table + tailwind） */
const FinanceRankTables: React.FC<FinanceRankTablesProps> = ({
  productRank,
  customerRank,
  loading,
  error,
  onRetry,
}) => {
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">商品利润排行 Top10</CardTitle>
        </CardHeader>
        <CardContent>
          <RankTableState
            loading={loading}
            error={error}
            empty={productRank.length === 0}
            emptyText="区间内暂无商品利润数据"
            onRetry={onRetry}
          >
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className={headCellClass}>商品名称</th>
                  <th className={cn(headCellClass, 'text-right')}>销量</th>
                  <th className={cn(headCellClass, 'text-right')}>收入</th>
                  <th className={cn(headCellClass, 'text-right')}>成本</th>
                  <th className={cn(headCellClass, 'text-right')}>利润</th>
                  <th className={cn(headCellClass, 'pr-4 text-right')}>利润率</th>
                </tr>
              </thead>
              <tbody>
                {productRank.map((row: ProductProfitRow) => (
                  <tr key={row.productId} className={rowClass}>
                    <td className="max-w-[160px] truncate py-3 pl-4 font-medium text-foreground">
                      {row.productName || '-'}
                    </td>
                    <td className="py-3 pl-4 text-right tabular-nums text-muted-foreground">
                      {row.quantity}
                    </td>
                    <MoneyCell value={row.revenue} />
                    <MoneyCell value={row.cost} />
                    <MoneyCell value={row.profit} />
                    <td
                      className={cn(
                        'py-3 pl-4 pr-4 text-right tabular-nums',
                        row.profitRate < 0
                          ? 'font-medium text-destructive'
                          : 'text-muted-foreground',
                      )}
                    >
                      {formatPercent(row.profitRate)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </RankTableState>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">客户利润排行 Top10</CardTitle>
        </CardHeader>
        <CardContent>
          <RankTableState
            loading={loading}
            error={error}
            empty={customerRank.length === 0}
            emptyText="区间内暂无客户利润数据"
            onRetry={onRetry}
          >
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className={headCellClass}>客户名称</th>
                  <th className={cn(headCellClass, 'text-right')}>订单数</th>
                  <th className={cn(headCellClass, 'text-right')}>收入</th>
                  <th className={cn(headCellClass, 'text-right')}>利润</th>
                  <th className={cn(headCellClass, 'pr-4 text-right')}>利润率</th>
                </tr>
              </thead>
              <tbody>
                {customerRank.map((row: CustomerProfitRow) => (
                  <tr key={row.customerId} className={rowClass}>
                    <td className="max-w-[160px] truncate py-3 pl-4 font-medium text-foreground">
                      {row.customerName || '-'}
                    </td>
                    <td className="py-3 pl-4 text-right tabular-nums text-muted-foreground">
                      {row.orderCount}
                    </td>
                    <MoneyCell value={row.revenue} />
                    <MoneyCell value={row.profit} />
                    <td
                      className={cn(
                        'py-3 pl-4 pr-4 text-right tabular-nums',
                        row.profitRate < 0
                          ? 'font-medium text-destructive'
                          : 'text-muted-foreground',
                      )}
                    >
                      {formatPercent(row.profitRate)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </RankTableState>
        </CardContent>
      </Card>
    </div>
  );
};

export default FinanceRankTables;
