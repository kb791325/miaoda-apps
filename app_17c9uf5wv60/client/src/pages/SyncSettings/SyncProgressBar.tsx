import { Progress } from '@client/src/components/ui/progress';
import { AlertCircle, CheckCircle, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@client/src/components/ui/button';
import type { SyncTaskStatus } from '@shared/api.interface';

interface SyncProgressProps {
  task: SyncTaskStatus | null;
  direction: 'push' | 'pull';
  onRetry: () => void;
}

export function SyncProgressBar({ task, direction, onRetry }: SyncProgressProps) {
  if (!task) return null;

  const isRunning = task.status === 'running' || task.status === 'pending';
  const isDone = task.status === 'success';
  const isError = task.status === 'error' || task.status === 'failed';
  const total = task.insertCount + task.updateCount + task.skipCount;
  const label = direction === 'push' ? '推送' : '拉取';

  return (
    <div className="border border-border rounded-sm p-3 bg-muted/20 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isRunning && <Loader2 className="size-4 text-primary animate-spin" />}
          {isDone && <CheckCircle className="size-4 text-success" />}
          {isError && <AlertCircle className="size-4 text-destructive" />}
          <span className="text-sm font-medium">
            {isRunning ? `正在${label} ${Math.round(task.progress)}%` : ''}
            {isDone ? `${label}完成` : ''}
            {isError ? `${label}失败` : ''}
          </span>
        </div>
        <span className="text-xs font-mono text-muted-foreground">
          {total} 条
        </span>
      </div>

      <Progress value={task.progress} className="h-1.5" />

      <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
        <span>
          插入 <span className="text-foreground">{task.insertCount}</span>
        </span>
        <span>
          更新 <span className="text-foreground">{task.updateCount}</span>
        </span>
        <span>
          跳过 <span className="text-foreground">{task.skipCount}</span>
        </span>
        {task.durationMs !== undefined && (
          <span>{(task.durationMs / 1000).toFixed(1)}s</span>
        )}
      </div>

      {isError && task.errorMessage && (
        <div className="flex items-start justify-between gap-2 pt-2 border-t border-border/60">
          <p className="text-xs text-destructive break-words">
            {task.errorMessage}
          </p>
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RefreshCw className="size-3.5 mr-1" />
            重试
          </Button>
        </div>
      )}
    </div>
  );
}
