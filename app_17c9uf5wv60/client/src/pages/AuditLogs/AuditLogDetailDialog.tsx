import { useState, useEffect } from 'react';
import { formatBeijingTime } from '@client/src/utils/date';
import { auditLogs } from '@client/src/api';
import { Badge } from '@client/src/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@client/src/components/ui/dialog';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type { AuditLog, AuditActionType } from '@shared/api.interface';

export const ACTION_TYPE_MAP: Record<
  AuditActionType,
  { label: string; className: string }
> = {
  create: {
    label: '新增',
    className:
      'bg-success/10 text-success border-success/20',
  },
  update: {
    label: '更新',
    className:
      'bg-primary/10 text-primary border-primary/20',
  },
  delete: {
    label: '删除',
    className:
      'bg-destructive/10 text-destructive border-destructive/20',
  },
  archive: {
    label: '归档',
    className:
      'bg-warning/10 text-warning border-warning/20',
  },
  restore: {
    label: '恢复',
    className:
      'bg-muted/60 text-muted-foreground border-border',
  },
  inbound: {
    label: '入库',
    className:
      'bg-success/10 text-success border-success/20',
  },
  outbound: {
    label: '出库',
    className:
      'bg-destructive/10 text-destructive border-destructive/20',
  },
  transfer: {
    label: '调拨',
    className:
      'bg-primary/10 text-primary border-primary/20',
  },
  inventory_check: {
    label: '盘点',
    className:
      'bg-muted/60 text-muted-foreground border-border',
  },
  order_confirm: {
    label: '订单确认',
    className:
      'bg-warning/10 text-warning border-warning/20',
  },
  order_cancel: {
    label: '订单取消',
    className:
      'bg-destructive/10 text-destructive border-destructive/20',
  },
  order_ship: {
    label: '订单出库',
    className:
      'bg-primary/10 text-primary border-primary/20',
  },
  order_complete: {
    label: '订单完成',
    className:
      'bg-success/10 text-success border-success/20',
  },
  login: {
    label: '登录',
    className:
      'bg-success/10 text-success border-success/20',
  },
  logout: {
    label: '登出',
    className:
      'bg-muted/60 text-muted-foreground border-border',
  },
  system: {
    label: '系统',
    className:
      'bg-muted/60 text-muted-foreground border-border',
  },
};

export const ACTION_TYPE_OPTIONS: {
  value: AuditActionType | 'all';
  label: string;
}[] = [
  { value: 'all', label: '全部' },
  { value: 'create', label: '新增' },
  { value: 'update', label: '更新' },
  { value: 'delete', label: '删除' },
  { value: 'archive', label: '归档' },
  { value: 'restore', label: '恢复' },
  { value: 'inbound', label: '入库' },
  { value: 'outbound', label: '出库' },
  { value: 'transfer', label: '调拨' },
  { value: 'inventory_check', label: '盘点' },
  { value: 'order_confirm', label: '订单确认' },
  { value: 'order_cancel', label: '订单取消' },
  { value: 'order_ship', label: '订单出库' },
  { value: 'order_complete', label: '订单完成' },
  { value: 'login', label: '登录' },
  { value: 'logout', label: '登出' },
  { value: 'system', label: '系统' },
];

export function formatDateForParam(
  date: Date | undefined,
): string | undefined {
  if (!date) return undefined;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function renderJson(obj: Record<string, unknown> | undefined) {
  if (!obj) return <span className="text-muted-foreground">-</span>;
  return (
    <pre className="bg-muted/40 border border-border rounded-sm p-3 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-all">
      <code>{JSON.stringify(obj, null, 2)}</code>
    </pre>
  );
}

function renderChanges(log: AuditLog) {
  const { detail } = log;
  if (!detail.before && !detail.after && !detail.changes) return null;

  if (detail.changes && Object.keys(detail.changes).length > 0) {
    const entries = Object.entries(detail.changes);
    return (
      <div className="space-y-2">
        <h4 className="text-sm font-medium">变更摘要</h4>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                  字段
                </th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                  变更前
                </th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                  变更后
                </th>
              </tr>
            </thead>
            <tbody>
              {entries.map(([key, val]) => {
                const change = val as { before?: unknown; after?: unknown };
                return (
                  <tr key={key} className="border-b border-border/50">
                    <td className="px-3 py-2 font-mono text-xs">{key}</td>
                    <td className="px-3 py-2 font-mono text-xs text-destructive">
                      {change?.before === undefined
                        ? '-'
                        : typeof change.before === 'object'
                          ? JSON.stringify(change.before)
                          : String(change.before)}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-success">
                      {change?.after === undefined
                        ? '-'
                        : typeof change.after === 'object'
                          ? JSON.stringify(change.after)
                          : String(change.after)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (detail.before || detail.after) {
    return (
      <div className="space-y-2">
        <h4 className="text-sm font-medium">变更前后对比</h4>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-xs text-muted-foreground mb-1">
              变更前 (before)
            </div>
            {renderJson(detail.before)}
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">
              变更后 (after)
            </div>
            {renderJson(detail.after)}
          </div>
        </div>
      </div>
    );
  }
  return null;
}

interface AuditLogDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  logId: string | null;
}

export function AuditLogDetailDialog({
  open,
  onOpenChange,
  logId,
}: AuditLogDetailDialogProps) {
  const [log, setLog] = useState<AuditLog | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !logId) {
      setLog(null);
      return;
    }
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const data = await auditLogs.getAuditLogDetail(logId);
        if (!cancelled) setLog(data);
      } catch (err: unknown) {
        logger.error('获取审计日志详情失败:', String(err));
        toast.error('获取审计日志详情失败');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [open, logId]);

  if (!log && !loading) return null;

  const actionInfo = log
    ? ACTION_TYPE_MAP[log.actionType] ?? {
        label: log.actionType,
        className: '',
      }
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px] max-h-[85vh] overflow-y-auto">
        <DialogHeader className="pb-3 border-b border-border">
          <DialogTitle className="text-base font-medium">
            审计日志详情
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
            加载中...
          </div>
        ) : log ? (
          <div className="space-y-5 pt-2">
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
              <div>
                <div className="text-muted-foreground text-xs mb-1">
                  日志 ID
                </div>
                <div className="font-mono text-xs break-all">{log.id}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs mb-1">
                  操作类型
                </div>
                <div>
                  {actionInfo && (
                    <Badge variant="secondary" className={actionInfo.className}>
                      {actionInfo.label}
                    </Badge>
                  )}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs mb-1">
                  操作对象类型
                </div>
                <div>{log.targetType || '-'}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs mb-1">
                  操作对象 ID
                </div>
                <div className="font-mono text-xs break-all">
                  {log.targetId || '-'}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs mb-1">
                  操作人
                </div>
                <div>{log.operatorName || log.operator || '-'}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs mb-1">
                  IP 地址
                </div>
                <div className="font-mono text-xs">
                  {log.ipAddress || '-'}
                </div>
              </div>
              <div className="col-span-2">
                <div className="text-muted-foreground text-xs mb-1">
                  操作时间
                </div>
                <div className="font-mono text-xs">
                  {formatBeijingTime(log.createdAt, 'YYYY-MM-DD HH:mm:ss')}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium">详细数据 (detail)</h4>
              {renderJson(log.detail as Record<string, unknown>)}
            </div>

            {renderChanges(log)}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
