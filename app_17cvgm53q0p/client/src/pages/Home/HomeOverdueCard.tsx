import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlarmClock, CheckCircle2 } from 'lucide-react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@client/src/components/ui/card';
import { Button } from '@client/src/components/ui/button';
import { Skeleton } from '@client/src/components/ui/skeleton';
import { receivableApi } from '@client/src/api';
import { formatMoney } from '@client/src/pages/Inventory/inventory-utils';
import type {
  AgingBucket,
  OverdueSummary,
} from '@shared/finance-contract';

const AGING_LABELS: Record<AgingBucket, string> = {
  '0-30': '0-30天',
  '31-60': '31-60天',
  '61-90': '61-90天',
  '90+': '90天以上',
};

/** 逾期提醒卡片：挂载后拉取逾期汇总，请求失败静默隐藏，不影响其他区块 */
const HomeOverdueCard: React.FC = () => {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<OverdueSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [failed, setFailed] = useState<boolean>(false);

  useEffect(() => {
    let mounted: boolean = true;
    receivableApi
      .getOverdueSummary()
      .then((res) => {
        if (mounted) setSummary(res);
      })
      .catch((error: unknown) => {
        const message: string =
          error instanceof Error ? error.message : String(error);
        logger.error(`逾期汇总加载失败: ${message}`);
        if (mounted) setFailed(true);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  if (failed) return null;

  const buckets = Array.isArray(summary?.buckets) ? summary.buckets : [];
  const agingText: string = buckets
    .filter((item) => item.count > 0)
    .map(
      (item) =>
        `${AGING_LABELS[item.bucket]} ${formatMoney(item.amount)}×${item.count}笔`,
    )
    .join(' · ');

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <AlarmClock className="size-5 text-primary" />
          逾期提醒
        </CardTitle>
        {!loading && summary && summary.overdueCount > 0 ? (
          <Button
            variant="ghost"
            onClick={() => navigate('/receivables?overdue=1')}
          >
            去处理 →
          </Button>
        ) : null}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-9 w-56" />
            <Skeleton className="h-4 w-full" />
          </div>
        ) : !summary ? null : summary.overdueCount > 0 ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold tabular-nums text-[hsl(4_85%_35%)]">
                {formatMoney(summary.overdueAmount)}
              </span>
              <span className="text-base text-muted-foreground">
                共 {summary.overdueCount} 笔
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {agingText || '暂无账龄明细'}
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-2 py-2">
            <CheckCircle2 className="size-5 text-[hsl(152_65%_30%)]" />
            <span className="text-base text-foreground">
              当前无逾期应收，账款状况良好
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default HomeOverdueCard;
