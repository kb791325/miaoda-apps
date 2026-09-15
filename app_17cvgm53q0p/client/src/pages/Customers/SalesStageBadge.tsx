import type { FC } from 'react';
import { cn } from '@/lib/utils';

const STAGE_STYLES: Record<string, string> = {
  线索: 'border-slate-300 bg-slate-100 text-slate-600',
  初步接触: 'border-sky-400/60 bg-sky-50 text-sky-700',
  需求确认: 'border-indigo-400/60 bg-indigo-50 text-indigo-700',
  方案报价: 'border-violet-400/60 bg-violet-50 text-violet-700',
  谈判中: 'border-amber-400/60 bg-amber-50 text-amber-700',
  已成交: 'border-emerald-400/60 bg-emerald-50 text-emerald-700',
  已流失: 'border-border bg-muted text-muted-foreground',
};

interface SalesStageBadgeProps {
  stage: string;
}

const SalesStageBadge: FC<SalesStageBadgeProps> = ({ stage }) => (
  <span
    className={cn(
      'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
      STAGE_STYLES[stage] ?? STAGE_STYLES['线索'],
    )}
  >
    {stage || '线索'}
  </span>
);

export default SalesStageBadge;
