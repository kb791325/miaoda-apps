import {
  Package,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ClipboardList,
  TrendingDown,
} from 'lucide-react';
import { Progress } from '@client/src/components/ui/progress';
import type { InventoryOverview } from '@shared/api.interface';

function fmt(n: number): string {
  return n.toLocaleString('zh-CN');
}

interface OverviewCardsProps {
  overview: InventoryOverview | null;
  loading: boolean;
}

export const OverviewCards: React.FC<OverviewCardsProps> = ({ overview, loading }) => {
  const cards = [
    {
      label: '资产总数',
      icon: Package,
      value: fmt(overview?.totalAssets ?? 0),
      unit: '件',
      iconColor: 'text-muted-foreground',
      valueColor: 'text-foreground',
    },
    {
      label: '本月已盘点',
      icon: CheckCircle,
      value: fmt(overview?.checkedThisMonth ?? 0),
      unit: '件',
      iconColor: 'text-success',
      valueColor: 'text-success',
    },
    {
      label: '未盘点',
      icon: XCircle,
      value: fmt(overview?.uncheckedCount ?? 0),
      unit: '件',
      iconColor: 'text-warning',
      valueColor: 'text-foreground',
    },
    {
      label: '异常数',
      icon: AlertTriangle,
      value: fmt(overview?.abnormalCount ?? 0),
      unit: '件',
      iconColor: 'text-destructive',
      valueColor: 'text-destructive',
      leftBorder: 'border-l-[#e53e3e]',
    },
    {
      label: '盘点完成率',
      icon: ClipboardList,
      isProgress: true,
      iconColor: 'text-muted-foreground',
    },
    {
      label: '超期未盘点',
      icon: TrendingDown,
      value: fmt(overview?.overdueCount ?? 0),
      unit: '件',
      iconColor: 'text-destructive',
      valueColor: 'text-destructive',
      leftBorder: 'border-l-[#e53e3e]',
    },
  ];

  return (
      <div className="grid grid-cols-6 gap-3" data-ai-section-type="card-stat">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        if (card.isProgress) {
          return (
            <div
              key={idx}
             className="bg-card border border-border rounded-sm p-4 flex flex-col min-h-[88px]"
             >
               <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                 <Icon className="size-3" />
                 {card.label}
               </div>
               <div className="flex items-center gap-2 mt-auto">
                <div className="flex-1">
                  <Progress
                    value={overview?.completionRate ?? 0}
                    className="h-2 bg-muted"
                  />
                </div>
                <span className="text-sm font-semibold font-mono text-primary">
                  {loading ? '--' : `${overview?.completionRate?.toFixed(1) ?? 0}%`}
                </span>
              </div>
            </div>
          );
        }
        return (
          <div
            key={idx}
             className={`bg-card border border-border rounded-sm p-4 flex flex-col min-h-[88px] ${card.leftBorder ? `border-l-4 ${card.leftBorder}` : ''}`}
           >
             <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
               <Icon className={`size-3 ${card.iconColor}`} />
               {card.label}
             </div>
             <div className={`text-xl font-semibold font-mono text-right ${card.valueColor}`}>
              {loading ? '--' : card.value}
            </div>
            <div className="text-xs text-muted-foreground text-right">{card.unit}</div>
          </div>
        );
      })}
    </div>
  );
};
