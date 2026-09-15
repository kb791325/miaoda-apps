import { Badge } from '@client/src/components/ui/badge';
import { Progress } from '@client/src/components/ui/progress';
import { ChevronDown, AlertCircle, RotateCcw } from 'lucide-react';
import type { SyncLog } from '@shared/api.interface';

export const DOMAIN_LABELS: Record<string, string> = {
  products: '商品',
  transactions: '出入库',
  transfers: '调拨',
  inventory_checks: '盘点',
  warehouse_inventory: '库存',
};

export const DIRECTION_LABELS: Record<string, string> = {
  push: '推送',
  pull: '拉取',
  bi: '双向',
};

const STATUS_STYLES: Record<string, string> = {
  success: 'bg-success/10 text-success border-success/20',
  error: 'bg-destructive/10 text-destructive border-destructive/20',
  pending: 'bg-warning/10 text-warning border-warning/20',
  running: 'bg-primary/10 text-primary border-primary/20',
};

const STATUS_LABELS: Record<string, string> = {
  success: '成功',
  error: '失败',
  pending: '待重试',
  running: '进行中',
};

export const STATUS_FILTERS = [
  { value: '', label: '全部' },
  { value: 'success', label: '成功' },
  { value: 'error', label: '失败' },
  { value: 'running', label: '进行中' },
  { value: 'pending', label: '待重试' },
];

export const DOMAIN_FILTERS = [
  { value: '', label: '全部域' },
  { value: 'products', label: '商品' },
  { value: 'transactions', label: '出入库' },
  { value: 'transfers', label: '调拨' },
  { value: 'inventory_checks', label: '盘点' },
  { value: 'warehouse_inventory', label: '库存' },
];

export const statusClass = (s: string): string =>
  STATUS_STYLES[s] ?? STATUS_STYLES.pending;
export const statusLabel = (s: string): string => STATUS_LABELS[s] ?? s;

interface LogRowProps {
  log: SyncLog;
  isError: boolean;
  isExpanded: boolean;
  onToggle: () => void;
}

export function LogRow({ log, isError, isExpanded, onToggle }: LogRowProps) {
  return (
    <>
      <tr className="border-b border-border/50 hover:bg-accent/50">
        <td className="px-2 py-2">
          {isError && log.errorMessage ? (
            <button
              type="button"
              onClick={onToggle}
              className="p-0.5 hover:bg-accent rounded-sm"
            >
              <ChevronDown
                className={`size-3.5 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              />
            </button>
          ) : null}
        </td>
        <td className="px-3 py-2 font-mono text-xs text-muted-foreground whitespace-nowrap">
          {log.createdAt}
        </td>
        <td className="px-3 py-2">
          {DOMAIN_LABELS[log.domain] ?? log.domain}
        </td>
        <td className="px-3 py-2">
          {DIRECTION_LABELS[log.direction] ?? log.direction}
        </td>
        <td className="px-3 py-2">{log.action}</td>
        <td className="px-3 py-2">
          <div className="flex items-center gap-1.5">
            <Progress value={log.progress} className="h-1.5 flex-1" />
            <span className="text-xs font-mono w-8 text-right">
              {Math.round(log.progress)}%
            </span>
          </div>
        </td>
        <td className="px-2 py-2 text-center">
          {log.retryCount > 0 ? (
            <span className="inline-flex items-center gap-0.5 text-xs text-warning">
              <RotateCcw className="size-3" />
              {log.retryCount}
            </span>
          ) : (
            <span className="text-muted-foreground text-xs">0</span>
          )}
        </td>
        <td className="px-3 py-2 text-center">
          <Badge variant="secondary" className={statusClass(log.status)}>
            {statusLabel(log.status)}
          </Badge>
        </td>
        <td className="px-3 py-2 text-right font-mono text-xs whitespace-nowrap">
          <span className="text-success">{log.insertCount}</span>
          {' / '}
          <span className="text-primary">{log.updateCount}</span>
          {' / '}
          <span className="text-muted-foreground">{log.skipCount}</span>
        </td>
        <td className="px-3 py-2 text-right font-mono text-xs">
          {log.durationMs}ms
        </td>
      </tr>
      {isError && log.errorMessage && (
        <tr
          className={`border-b border-border/30 bg-destructive/5 transition-all ${isExpanded ? '' : 'hidden'}`}
        >
          <td colSpan={10} className="px-8 py-2">
            <div className="flex items-start gap-2 text-xs">
              <AlertCircle className="size-3.5 text-destructive mt-0.5 shrink-0" />
              <div className="text-destructive break-all">
                {log.errorMessage}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
