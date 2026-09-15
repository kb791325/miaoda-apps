import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { toast } from 'sonner';
import { Download, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { getTimelineReport } from '@client/src/api/finance';
import type {
  FinanceGroupBy,
  FinanceReportTimelineResponse,
  FinanceTrendPoint,
} from '@shared/finance';
import {
  formatMoney,
  formatPercent,
} from '@client/src/pages/Finance/finance-utils';
import {
  downloadFinanceExcel,
  extractReportErrorMessage,
} from './profit-report-utils';

export interface TimelineTabProps {
  startDate: string;
  endDate: string;
}

const GROUP_OPTIONS: { value: FinanceGroupBy; label: string }[] = [
  { value: 'day', label: '按日' },
  { value: 'week', label: '按周' },
  { value: 'month', label: '按月' },
];

const headCell: string = 'py-3 pl-4 font-medium';
const rightHead: string = 'py-3 pl-4 text-right font-medium';

/** 按时间统计：分组切换 + 明细表 + 合计行 + 导出 */
const TimelineTab: React.FC<TimelineTabProps> = ({ startDate, endDate }) => {
  const [groupBy, setGroupBy] = useState<FinanceGroupBy>('day');
  const [data, setData] = useState<FinanceReportTimelineResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);
  const [exporting, setExporting] = useState<boolean>(false);
  const [reloadFlag, setReloadFlag] = useState<number>(0);

  useEffect(() => {
    let mounted: boolean = true;
    setLoading(true);
    setError(false);
    getTimelineReport({ startDate, endDate, groupBy })
      .then((result: FinanceReportTimelineResponse) => {
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
  }, [startDate, endDate, groupBy, reloadFlag]);

  const handleExport = async (): Promise<void> => {
    setExporting(true);
    try {
      await downloadFinanceExcel({ type: 'timeline', startDate, endDate, groupBy });
      toast.success('导出成功');
    } catch (err: unknown) {
      toast.error(`导出失败：${extractReportErrorMessage(err)}`);
    } finally {
      setExporting(false);
    }
  };

  const rows: FinanceTrendPoint[] = data?.rows ?? [];
  const summary = data?.summary ?? null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Select
          value={groupBy}
          onValueChange={(value: string) => setGroupBy(value as FinanceGroupBy)}
        >
          <SelectTrigger className="h-9 w-[120px]">
            <SelectValue placeholder="分组维度" />
          </SelectTrigger>
          <SelectContent>
            {GROUP_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
        ) : rows.length === 0 ? (
          <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
            该区间内暂无统计数据
          </div>
        ) : (
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className={headCell}>期间</th>
                <th className={rightHead}>订单数</th>
                <th className={rightHead}>收入</th>
                <th className={rightHead}>商品成本</th>
                <th className={rightHead}>费用成本</th>
                <th className={rightHead}>利润</th>
                <th className={cn(rightHead, 'pr-4')}>利润率</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row: FinanceTrendPoint) => (
                <tr
                  key={row.period}
                  className="border-b border-border last:border-0 hover:bg-muted/40"
                >
                  <td className="py-3 pl-4 font-medium text-foreground">
                    {row.period}
                  </td>
                  <td className="py-3 pl-4 text-right tabular-nums text-muted-foreground">
                    {row.orderCount}
                  </td>
                  <td className="py-3 pl-4 text-right tabular-nums text-foreground">
                    {formatMoney(row.revenue)}
                  </td>
                  <td className="py-3 pl-4 text-right tabular-nums text-foreground">
                    {formatMoney(row.goodsCost)}
                  </td>
                  <td className="py-3 pl-4 text-right tabular-nums text-foreground">
                    {formatMoney(row.feeCost)}
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
            {summary ? (
              <tfoot>
                <tr className="border-t border-border bg-muted/40 font-medium">
                  <td className="py-3 pl-4 text-foreground">
                    合计（{dayjs(startDate).format('YYYY-MM-DD')} ~{' '}
                    {dayjs(endDate).format('YYYY-MM-DD')}）
                  </td>
                  <td className="py-3 pl-4 text-right tabular-nums text-foreground">
                    {summary.orderCount}
                  </td>
                  <td className="py-3 pl-4 text-right tabular-nums text-foreground">
                    {formatMoney(summary.totalRevenue)}
                  </td>
                  <td className="py-3 pl-4 text-right tabular-nums text-foreground">
                    {formatMoney(summary.totalGoodsCost)}
                  </td>
                  <td className="py-3 pl-4 text-right tabular-nums text-foreground">
                    {formatMoney(summary.totalFeeCost)}
                  </td>
                  <td
                    className={cn(
                      'py-3 pl-4 text-right tabular-nums',
                      summary.totalProfit < 0
                        ? 'text-destructive'
                        : 'text-foreground',
                    )}
                  >
                    {formatMoney(summary.totalProfit)}
                  </td>
                  <td
                    className={cn(
                      'py-3 pl-4 pr-4 text-right tabular-nums',
                      summary.avgProfitRate < 0
                        ? 'text-destructive'
                        : 'text-foreground',
                    )}
                  >
                    {formatPercent(summary.avgProfitRate)}
                  </td>
                </tr>
              </tfoot>
            ) : null}
          </table>
        )}
      </div>
    </div>
  );
};

export default TimelineTab;
