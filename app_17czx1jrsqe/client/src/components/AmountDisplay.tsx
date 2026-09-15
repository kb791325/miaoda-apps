import { formatAmount } from '@/lib/format';
import { cn } from '@/lib/utils';

interface AmountDisplayProps {
  value: number | string;
  prefix?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function AmountDisplay({
  value,
  prefix = '¥',
  className,
  size = 'md',
}: AmountDisplayProps) {
  return (
    <span
      className={cn(
        'tabular-nums font-medium text-foreground',
        size === 'sm' && 'text-xs',
        size === 'md' && 'text-sm',
        size === 'lg' && 'text-base',
        className,
      )}
    >
      {formatAmount(value, prefix)}
    </span>
  );
}
