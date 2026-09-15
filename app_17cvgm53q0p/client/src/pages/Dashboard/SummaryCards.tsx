import {
  AlertTriangle,
  Clock,
  PackageCheck,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { DashboardSummary } from '@shared/dashboard';

interface SummaryCardsProps {
  summary: DashboardSummary | null;
  loading: boolean;
}

interface CardConfig {
  key: string;
  label: string;
  icon: LucideIcon;
  /** 顶部渐变条 + 图标容器的主题色 */
  barClass: string;
  iconClass: string;
  borderClass: string;
  format: (summary: DashboardSummary) => string;
  hint: string;
}

const CARD_CONFIGS: CardConfig[] = [
  {
    key: 'monthOrders',
    label: '本月订单数',
    icon: PackageCheck,
    barClass: 'from-primary to-primary/30',
    iconClass: 'bg-primary/10 text-primary',
    borderClass: 'border-primary/20',
    format: (s: DashboardSummary) => String(s.monthOrderCount),
    hint: '本月新增订单总量',
  },
  {
    key: 'monthSales',
    label: '本月销售额',
    icon: Wallet,
    barClass: 'from-emerald-500 to-emerald-500/30',
    iconClass: 'bg-emerald-500/10 text-emerald-600',
    borderClass: 'border-emerald-200',
    format: (s: DashboardSummary) =>
      `¥${s.monthSalesAmount.toLocaleString('zh-CN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
    hint: '本月订单金额合计',
  },
  {
    key: 'pendingShipment',
    label: '待出库订单',
    icon: Clock,
    barClass: 'from-amber-400 to-amber-400/30',
    iconClass: 'bg-amber-400/10 text-amber-600',
    borderClass: 'border-amber-200',
    format: (s: DashboardSummary) => String(s.pendingShipmentCount),
    hint: '需要尽快安排发货',
  },
  {
    key: 'warningProducts',
    label: '库存预警',
    icon: AlertTriangle,
    barClass: 'from-red-500 to-red-500/30',
    iconClass: 'bg-red-500/10 text-red-600',
    borderClass: 'border-red-200',
    format: (s: DashboardSummary) => String(s.warningProductCount),
    hint: '库存 ≤ 预警阈值的商品',
  },
];

/** 统计卡片：主题色边框 + 图标容器 + 大号加粗数字 */
const SummaryCards: React.FC<SummaryCardsProps> = ({ summary, loading }) => {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
      {CARD_CONFIGS.map((config) => (
        <Card
          key={config.key}
          className={cn(
            'relative overflow-hidden pt-0 shadow-sm transition-shadow hover:shadow-md',
            config.borderClass,
          )}
        >
          <div
            className={cn('h-[3px] w-full bg-gradient-to-r', config.barClass)}
          />
          <CardContent className="p-5">
            {loading || !summary ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-32" />
                <Skeleton className="h-3 w-28" />
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span
                    className={cn(
                      'flex size-7 items-center justify-center rounded-md',
                      config.iconClass,
                    )}
                  >
                    <config.icon className="size-4" />
                  </span>
                  {config.label}
                </div>
                <p className="mt-3 text-4xl font-bold tracking-tight text-foreground tabular-nums">
                  {config.format(summary)}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {config.hint}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default SummaryCards;
