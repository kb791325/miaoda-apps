import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { t } from '@/lib/i18n';
import { Button } from '@/components/ui/button';

export interface BatchAction {
  label: string;
  variant?: 'default' | 'outline' | 'secondary' | 'destructive' | 'ghost';
  icon?: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
}

interface BatchActionBarProps {
  selectedCount: number;
  actions: BatchAction[];
  onClear?: () => void;
  className?: string;
}

export function BatchActionBar({ selectedCount, actions, onClear, className }: BatchActionBarProps) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2 border-l border-border pl-2', className)}>
      <span className="whitespace-nowrap text-xs text-muted-foreground">
        {t('已选')} <span className="font-medium text-foreground">{selectedCount}</span> {t('项')}
      </span>
      {onClear && (
        <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={onClear}>
          <X className="size-3" />
          {t('清空')}
        </Button>
      )}
      {actions.map((a, i) => (
        <Button
          key={i}
          size="sm"
          variant={a.variant || 'outline'}
          className="h-7"
          disabled={a.disabled}
          onClick={a.onClick}
        >
          {a.icon}
          {t(a.label)}
        </Button>
      ))}
    </div>
  );
}
