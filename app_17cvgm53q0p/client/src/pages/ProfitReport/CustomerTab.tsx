import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Download, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { getCustomerReport } from '@client/src/api/finance';
import type {
  CustomerProfitRow,
  FinanceReportCustomerResponse,
} from '@shared/finance';
import {
  formatMoney,
  formatPercent,
} from '@client/src/pages/Finance/finance-utils';
import {
  downloadFinanceExcel,
  extractReportErrorMessage,
  SortHeaderButton,
  type SortDirection,
} from './profit-report-utils';

export interface CustomerTabProps {
  startDate: string;
  endDate: string;
}

type CustomerSortKey = 'orderCount' | 'profit';

const headCell: string = 'py-3 pl-4 font-medium';
const rightHead: string = 'py-3 pl-4 text-right font-medium';

/** 按客户统计：列头排序（订单数/利润）+ 导出 */
const CustomerTab: React.FC<CustomerTabProps> = ({ startDate, endDate }) => {
  const [data, setData] = useState<FinanceReportCustomerResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);
  const [exporting, setExporting] = useState<boolean>(false);
  const [reloadFlag, setReloadFlag] = useState<number>(0);
  const [sortKey, setSortKey] = useState<CustomerSortKey>('profit');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');

  useEffect(() => {
    let mounted: boolean = true;
    setLoading(true);
    setError(false);
    getCustomerReport({ startDate, endDate })
      .then((result: FinanceReportCustomerResponse) => {
        if (mounted) {
          setData(result);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (mounted) {
          setLoading(false);
          setError(true);
        }
        toast.error(`报表加载失败：${extractReportErrorMessage(err)}`);
      });
    return () => {
      mounted = false;
    };
  }, [startDate, endDate, reloadFlag]);

  const handleSort = (key: CustomerSortKey): void => {
    if (key === sortKey) {
      setSortDir((dir: SortDirection) => (dir === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const handleExport = async (): Promise<void> => {
    setExporting(true);
    try {
      await downloadFinanceExcel({ type: 'customer', startDate, endDate });
      toast.success('导出成功');
    } catch (err: unknown) {
      toast.error(`导出失败：${extractReportErrorMessage(err)}`);
    } finally {
      setExporting(false);
    }
  };

  const rows: CustomerProfitRow[] = data?.rows ?? [];
  const sortedRows: CustomerProfitRow[] = useMemo(() => {
    const factor: number = sortDir === 'desc' ? -1 : 1;
    return [...rows].sort(
      (a: CustomerProfitRow, b: CustomerProfitRow) =>
        factor * (a[sortKey] - b[sortKey]),
    );
  }, [rows, sortKey, sortDir]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button onClick={handleExport} disabled={exporting || rows.length === 0}>
          {exporting ? <Loader2 className="animate-spin" /> : <Download />}
          导出 Excel
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
        {loading ? (
          <div className="space-y-2 p-4">
            {[1, 2, 3, 4, 5].map((n: number) => (
              <Skeleton key={n} className="h-9 w-full" />
            ))}
          </div>
        ) : error ? (
          <div className="flex h-[220px] flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
            <p>报表数据加载失败</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setReloadFlag((n: number) => n + 1)}
            >
              <RefreshCw className="mr-1 h-4 w-4" />
              重新加载
            </Button>
          </div>
        ) : sortedRows.length === 0 ? (
          <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
            该区间内暂无客户统计数据
          </div>
        ) : (
          <table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className={headCell}>客户</th>
                <th className={rightHead}>
                  <SortHeaderButton
                    label="订单数"
                    active={sortKey === 'orderCount'}
                    direction={sortDir}
                    onClick={() => handleSort('orderCount')}
                  />
                </th>
                <th className={rightHead}>收入</th>
                <th className={rightHead}>成本</th>
                <th className={rightHead}>
                  <SortHeaderButton
                    label="利润"
                    active={sortKey === 'profit'}
                    direction={sortDir}
                    onClick={() => handleSort('profit')}
                  />
                </th>
                <th className={cn(rightHead, 'pr-4')}>利润率</th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row: CustomerProfitRow) => (
                <tr
                  key={row.customerId}
                  className="border-b border-border last:border-0 hover:bg-muted/40"
                >
                  <td className="max-w-[220px] truncate py-3 pl-4 font-medium text-foreground">
                    {row.customerName || '-'}
                  </td>
                  <td className="py-3 pl-4 text-right tabular-nums text-muted-foreground">
                    {row.orderCount}
                  </td>
                  <td className="py-3 pl-4 text-right tabular-nums text-foreground">
                    {formatMoney(row.revenue)}
                  </td>
                  <td className="py-3 pl-4 text-right tabular-nums text-foreground">
                    {formatMoney(row.cost)}
                  </td>
                  <td
                    className={cn(
                      'py-3 pl-4 text-right tabular-nums',
                      row.profit < 0
                        ? 'font-medium text-destructive'
                        : 'text-foreground',
                    )}
                  >
                    {formatMoney(row.profit)}
                  </td>
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
        )}
      </div>
    </div>
  );
};

export default CustomerTab;
