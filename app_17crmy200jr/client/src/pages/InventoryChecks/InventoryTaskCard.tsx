import { Badge } from '@client/src/components/ui/badge';
import { Progress } from '@client/src/components/ui/progress';
import { ClipboardList } from 'lucide-react';
import type { InventoryTaskItem } from '@shared/api.interface';

interface InventoryTaskCardProps {
  task: InventoryTaskItem;
  selected: boolean;
  onClick: () => void;
}

const STATUS_MAP: Record<
  string,
  { label: string; className: string }
> = {
  pending: {
    label: '待开始',
    className:
      'border-border bg-muted text-muted-foreground',
  },
  in_progress: {
    label: '进行中',
    className:
      'border-primary/30 bg-primary/10 text-primary',
  },
  completed: {
    label: '已完成',
    className:
      'border-success/30 bg-success/10 text-success',
  },
  abnormal: {
    label: '异常',
    className:
      'border-destructive/30 bg-destructive/10 text-destructive',
  },
};

export function assetTypeLabel(type: string): string {
  return type || '-';
}

function formatDate(iso: string): string {
  if (!iso) return '-';
  return iso.slice(0, 16).replace('T', ' ');
}

export function InventoryTaskCard({
  task,
  selected,
  onClick,
}: InventoryTaskCardProps) {
  const status = STATUS_MAP[task.status] || STATUS_MAP.pending;
  const progress = task.progress ?? 0;

  return (
    <div
      onClick={onClick}
      className={`bg-card border rounded-sm p-4 cursor-pointer transition-colors ${
        selected
          ? 'border-primary ring-1 ring-primary'
          : 'border-border hover:border-primary/50'
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <ClipboardList className="size-4 text-muted-foreground" />
          <span className="text-lg font-semibold text-foreground font-mono">
            {task.taskNo}
          </span>
        </div>
        <Badge className={`rounded-sm ${status.className}`}>
          {status.label}
        </Badge>
      </div>

      <div className="text-muted-foreground text-sm mb-3">
        盘点月份：{task.checkMonth}
      </div>

      <div className="mb-2">
        <div className="flex items-center justify-between text-muted-foreground text-xs mb-1.5">
          <span>盘点进度</span>
          <span className="font-mono font-medium text-foreground">
            {progress}%
          </span>
        </div>
        <Progress
          value={progress}
          className="h-1.5 rounded-none bg-muted"
        />
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
        <span>
          已盘点：
          <span className="text-foreground text-sm font-medium font-mono">
            {task.checkedCount}
          </span>
          {' / '}
          <span className="font-mono">{task.totalCount}</span>
        </span>
      </div>

      <div className="border-t border-border pt-2 text-xs text-muted-foreground">
        创建时间：{formatDate(task.createdAt)}
      </div>
    </div>
  );
}
