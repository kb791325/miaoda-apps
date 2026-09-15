import React from 'react';
import {
  AlertCircle,
  CalendarDays,
  GraduationCap,
  RefreshCw,
  UserPlus,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@client/src/components/ui/button';
import { Card } from '@client/src/components/ui/card';
import { Skeleton } from '@client/src/components/ui/skeleton';
import type { DashboardOverview } from '@shared/dashboard';

interface KpiCardsProps {
  overview: DashboardOverview | null;
  loading: boolean;
  error?: string | null;
  onRetry?: () => void;
}

interface KpiConfig {
  key:
    | 'monthlyNewStudents'
    | 'activeStudents'
    | 'unpaidStudentCount'
    | 'weeklyCourseCount';
  label: string;
  suffix: string;
  icon: LucideIcon;
  iconClassName: string;
  valueClassName: string;
}

const KPI_CONFIGS: KpiConfig[] = [
  {
    key: 'monthlyNewStudents',
    label: '本月新学员',
    suffix: '人',
    icon: UserPlus,
    iconClassName: 'bg-primary/10 text-primary',
    valueClassName: 'text-foreground',
  },
  {
    key: 'activeStudents',
    label: '在读学员',
    suffix: '人',
    icon: GraduationCap,
    iconClassName: 'bg-[hsl(140_60%_45%/0.12)] text-[hsl(140_60%_38%)]',
    valueClassName: 'text-[hsl(140_60%_38%)]',
  },
  {
    key: 'unpaidStudentCount',
    label: '待缴费学员',
    suffix: '人',
    icon: Wallet,
    iconClassName: 'bg-[hsl(5_75%_55%/0.12)] text-[hsl(5_75%_45%)]',
    valueClassName: 'text-[hsl(5_75%_45%)]',
  },
  {
    key: 'weeklyCourseCount',
    label: '本周课程',
    suffix: '门',
    icon: CalendarDays,
    iconClassName: 'bg-[hsl(220_70%_58%/0.12)] text-[hsl(220_70%_48%)]',
    valueClassName: 'text-[hsl(220_70%_48%)]',
  },
];

const KpiCards: React.FC<KpiCardsProps> = ({
  overview,
  loading,
  error,
  onRetry,
}) => {
  if (loading) {
    return (
      <div
        data-ai-section-type="card-stat"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {KPI_CONFIGS.map((config: KpiConfig) => (
          <Card key={config.key} className="p-6">
            <Skeleton className="mb-3 size-10 rounded-lg" />
            <Skeleton className="mb-2 h-8 w-20" />
            <Skeleton className="h-4 w-24" />
          </Card>
        ))}
      </div>
    );
  }

  if (error || !overview) {
    return (
      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div className="flex items-center gap-2 text-sm text-[hsl(5_75%_40%)]">
            <AlertCircle className="size-4 shrink-0" />
            <span>{error ?? '经营总览数据加载失败'}</span>
          </div>
          {onRetry ? (
            <Button
              data-ai-section-type="button"
              variant="outline"
              size="sm"
              onClick={onRetry}
            >
              <RefreshCw className="size-3.5" />
              重新加载
            </Button>
          ) : null}
        </div>
      </Card>
    );
  }

  return (
    <div
      data-ai-section-type="card-stat"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      {KPI_CONFIGS.map((config: KpiConfig) => {
        const IconComponent: LucideIcon = config.icon;
        return (
          <Card key={config.key} className="p-6">
            <div className="flex items-start gap-4">
              <span
                className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${config.iconClassName}`}
              >
                <IconComponent className="size-5" />
              </span>
              <div className="min-w-0">
                <p className={`text-2xl font-bold ${config.valueClassName}`}>
                  {overview[config.key]}
                  <span className="ml-1 text-sm font-normal text-muted-foreground">
                    {config.suffix}
                  </span>
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {config.label}
                </p>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};

export default KpiCards;
