import type { FC } from 'react';
import { cn } from '@/lib/utils';

const LEVEL_STYLES: Record<string, string> = {
  至尊: 'border-purple-400/60 bg-purple-50 text-purple-700',
  VIP: 'border-amber-400/60 bg-amber-50 text-amber-700',
  重要: 'border-rose-400/60 bg-rose-50 text-rose-700',
  普通: 'border-border bg-muted text-muted-foreground',
  A类重点: 'border-rose-400/60 bg-rose-50 text-rose-700',
  B类普通: 'border-blue-400/60 bg-blue-50 text-blue-700',
  C类潜在: 'border-teal-400/60 bg-teal-50 text-teal-700',
  D类流失: 'border-border bg-muted text-muted-foreground',
};

interface CustomerLevelBadgeProps {
  level: string;
}

const CustomerLevelBadge: FC<CustomerLevelBadgeProps> = ({ level }) => (
  <span
    className={cn(
      'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
      LEVEL_STYLES[level] ?? LEVEL_STYLES['普通'],
    )}
  >
    {level}
  </span>
);

export default CustomerLevelBadge;
