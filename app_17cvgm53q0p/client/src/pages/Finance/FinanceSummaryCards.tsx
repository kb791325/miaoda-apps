import {
  CreditCard,
  Package,
  Percent,
  Receipt,
  ShoppingCart,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { FinanceSummary } from '@shared/finance';
import { formatMoney, formatPercent } from './finance-utils';

interface FinanceSummaryCardsProps {
  summary: FinanceSummary | null;
  loading: boolean;
}

interface CardConfig {
  key: string;
  label: string;
  icon: LucideIcon;
  barClass: string;
  iconClass: string;
  borderClass: string;
  hint: string;
  format: (summary: FinanceSummary) => string;
  /** 是否负值（负值用错误语义色） */
  isNegative?: (summary: FinanceSummary) => boolean;
}

const CARD_CONFIGS: CardConfig[] = [
  {
    key: 'totalRevenue',
    label: '订单总收入',
    icon: Wallet,
    barClass: 'from-primary to-primary/30',
    iconClass: 'bg-primary/10 text-primary',
    borderClass: 'border-primary/20',
    hint: '订单金额 + 向客户收取的费用',
    format: (s: FinanceSummary) => formatMoney(s.totalRevenue),
  },
  {
    key: 'totalGoodsCost',
    label: '商品总成本',
    icon: Package,
    barClass: 'from-amber-400 to-amber-400/30',
    iconClass: 'bg-amber-400/10 text-amber-600',
    borderClass: 'border-amber-200',
    hint: '销量 × 下单时成本价',
    format: (s: FinanceSummary) => formatMoney(s.totalGoodsCost),
  },
  {
    key: 'totalFeeCost',
    label: '费用总成本',
    icon: Receipt,
    barClass: 'from-slate-400 to-slate-400/30',
    iconClass: 'bg-slate-400/10 text-slate-600',
    borderClass: 'border-slate-200',
    hint: '全部订单费用（含不向客户收取）',
    format: (s: FinanceSummary) => formatMoney(s.totalFeeCost),
  },
  {
    key: 'totalProfit',
    label: '总利润',
    icon: TrendingUp,
    barClass: 'from-emerald-500 to-emerald-500/30',
    iconClass: 'bg-emerald-500/10 text-emerald-600',
    borderClass: 'border-emerald-200',
    hint: '总收入 − 商品成本 − 费用成本',
    format: (s: FinanceSummary) => formatMoney(s.totalProfit),
    isNegative: (s: FinanceSummary) => s.totalProfit < 0,
  },
  {
    key: 'avgProfitRate',
    label: '平均利润率',
    icon: Percent,
    barClass: 'from-cyan-500 to-cyan-500/30',
    iconClass: 'bg-cyan-500/10 text-cyan-600',
    borderClass: 'border-cyan-200',
    hint: '总利润 / 总收入',
    format: (s: FinanceSummary) => formatPercent(s.avgProfitRate),
    isNegative: (s: FinanceSummary) => s.avgProfitRate < 0,
  },
  {
    key: 'orderCount',
    label: '订单数量',
    icon: ShoppingCart,
    barClass: 'from-indigo-400 to-indigo-400/30',
    iconClass: 'bg-indigo-400/10 text-indigo-600',
    borderClass: 'border-indigo-200',
    hint: '区间内订单总量',
    format: (s: FinanceSummary) => String(s.orderCount),
  },
  {
    key: 'avgOrderValue',
    label: '客单价',
    icon: CreditCard,
    barClass: 'from-rose-400 to-rose-400/30',
    iconClass: 'bg-rose-400/10 text-rose-500',
    borderClass: 'border-rose-200',
    hint: '总收入 / 订单数',
    format: (s: FinanceSummary) => formatMoney(s.avgOrderValue),
  },
];

/** 财务统计卡片（7 项）：渐变顶条 + 图标容器 + 大号数字，负利润红色提示 */
const FinanceSummaryCards: React.FC<FinanceSummaryCardsProps> = ({
  summary,
  loading,
}) => {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
      {CARD_CONFIGS.map((config: CardConfig) => {
        const negative: boolean =
          summary !== null && (config.isNegative?.(summary) ?? false);
        return (
          <Card
            key={config.key}
            className={cn(
              'relative overflow-hidden pt-0 shadow-sm transition-shadow hover:shadow-md',
              config.borderClass,
            )}
          >
            <div
              className={cn(
                'h-[3px] w-full bg-gradient-to-r',
                config.barClass,
              )}
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
                  <p
                    className={cn(
                      'mt-3 text-3xl font-bold tracking-tight tabular-nums',
                      negative ? 'text-destructive' : 'text-foreground',
                    )}
                  >
                    {config.format(summary)}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {config.hint}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default FinanceSummaryCards;
