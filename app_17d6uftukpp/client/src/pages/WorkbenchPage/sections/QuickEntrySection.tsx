import { memo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckSquare, FileText, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { QUICK_ENTRIES } from '@/data/workbench-page';

const ENTRY_ICONS: Record<string, LucideIcon> = {
  '/customers/new': Users,
  '/contracts/new': FileText,
  '/tasks/new': CheckSquare,
};

/** 常用操作快捷入口 */
export default memo(function QuickEntrySection() {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base">快捷入口</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {QUICK_ENTRIES.map((entry) => {
          const Icon = ENTRY_ICONS[entry.route] ?? ArrowRight;
          return (
            <Link
              key={entry.id}
              to={entry.route}
              className="group flex items-center gap-3 rounded-lg border border-border/60 p-3 transition-colors hover:border-primary/40 hover:bg-muted/50"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10">
                <Icon className="size-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{entry.label}</p>
                <p className="truncate text-xs text-muted-foreground">{entry.description}</p>
              </div>
              <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
});
