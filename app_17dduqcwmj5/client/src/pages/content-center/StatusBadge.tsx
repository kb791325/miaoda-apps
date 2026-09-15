import type { FC } from 'react';
import { cn } from '@/lib/utils';
import type { MarketingContentStatus } from '@shared/content';
import { STATUS_META } from './content.constants';

interface StatusBadgeProps {
  status: MarketingContentStatus;
}

export const StatusBadge: FC<StatusBadgeProps> = ({ status }) => {
  const meta = STATUS_META[status];
  if (!meta) return null;
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap',
        meta.className,
      )}
    >
      {meta.label}
    </span>
  );
};
