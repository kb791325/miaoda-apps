import { memo } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface KpiItem {
  key: string;
  label: string;
  value: string;
  desc?: string;
  icon: LucideIcon;
  iconClassName: string;
}

interface KpiGridSectionProps {
  items: KpiItem[];
}

export default memo(function KpiGridSection({ items }: KpiGridSectionProps) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Card key={item.key} className="py-4">
            <CardContent className="space-y-2 px-4">
              <div className="flex items-center gap-2">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted">
                  <Icon className={cn('size-3.5', item.iconClassName)} />
                </div>
                <p className="truncate text-xs text-muted-foreground">{item.label}</p>
              </div>
              <p className="truncate text-xl font-semibold tabular-nums tracking-tight">{item.value}</p>
              {item.desc ? <p className="truncate text-xs text-muted-foreground">{item.desc}</p> : null}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
});
