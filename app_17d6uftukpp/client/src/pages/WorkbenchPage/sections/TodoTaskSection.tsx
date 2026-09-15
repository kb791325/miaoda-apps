import { memo, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { IBizRecord } from '@/data/mt-records';
import { formatUserName } from '@/lib/user-names';

interface TodoTaskSectionProps {
  tasks: IBizRecord[];
}

const PRIORITY_META: Record<string, { label: string; className: string }> = {
  高: { label: '高', className: 'border-destructive/40 bg-destructive/10 text-destructive' },
  中: { label: '中', className: 'border-warning/40 bg-warning/10 text-warning' },
  低: { label: '低', className: 'border-border bg-muted text-muted-foreground' },
};

/** 待办任务 TOP5 (未完成, 高优先级在前) */
export default memo(function TodoTaskSection({ tasks }: TodoTaskSectionProps) {
  const todo = useMemo(() => {
    const order: Record<string, number> = { 高: 0, 中: 1, 低: 2 };
    return tasks
      .filter((t) => t.values.status !== '已完成' && t.values.status !== '已取消')
      .sort((a, b) => (order[String(a.values.priority)] ?? 9) - (order[String(b.values.priority)] ?? 9))
      .slice(0, 5);
  }, [tasks]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base">待办任务</CardTitle>
          <CardDescription>未完成任务按优先级排序 TOP 5</CardDescription>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link to="/tasks">
            全部
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="px-0 py-0">
        {todo.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <CheckSquare className="size-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">暂无待办任务</p>
          </div>
        ) : (
          todo.map((task) => {
            const priority = PRIORITY_META[String(task.values.priority ?? '低')] ?? PRIORITY_META.低;
            return (
              <Link
                key={task.recordId}
                to={`/tasks/${task.recordId}`}
                className="flex min-w-0 items-center gap-3 border-t border-border/50 px-6 py-3 transition-colors hover:bg-muted/50"
              >
                <Badge variant="outline" className={cn('shrink-0 text-xs', priority.className)}>
                  {priority.label}
                </Badge>
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {String(task.values.title ?? '未命名任务')}
                </span>
                <span className="hidden shrink-0 text-xs text-muted-foreground md:inline">
                  {formatUserName(String(task.values.owner ?? task.values.assignee ?? ''))}
                </span>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {String(task.values.dueDate ?? '—')}
                </span>
              </Link>
            );
          })
        )}
      </CardContent>
    </Card>
  );
});
