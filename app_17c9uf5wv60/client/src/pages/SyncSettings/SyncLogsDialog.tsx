import { useState, useEffect, useCallback } from 'react';
import { sync as syncApi } from '@client/src/api';
import { Button } from '@client/src/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@client/src/components/ui/dialog';
import { FileText, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type { SyncLog } from '@shared/api.interface';
import {
  STATUS_FILTERS,
  DOMAIN_FILTERS,
  LogRow,
} from './LogRow';

const PAGE_SIZE = 20;

interface SyncLogsDialogProps {
  children: React.ReactNode;
}

export function SyncLogsDialog({ children }: SyncLogsDialogProps) {
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [domainFilter, setDomainFilter] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await syncApi.getSyncLogs(
        page,
        PAGE_SIZE,
        domainFilter || undefined,
        statusFilter || undefined,
      );
      setLogs(res.items);
      setTotal(res.total);
    } catch (err: unknown) {
      logger.error('获取同步日志失败:', String(err));
      toast.error('获取同步日志失败');
    } finally {
      setIsLoading(false);
    }
  }, [page, statusFilter, domainFilter]);

  useEffect(() => {
    if (open) fetchLogs();
  }, [open, fetchLogs]);

  useEffect(() => {
    if (open) setPage(1);
  }, [open, statusFilter, domainFilter]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const toggleExpand = (id: string): void => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <FileText className="size-4 text-primary" />
            同步日志
          </DialogTitle>
        </DialogHeader>

        {/* 筛选区 */}
        <div className="flex items-center gap-3 pb-2 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">状态</span>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger size="sm" className="w-28 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_FILTERS.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">业务域</span>
            <Select value={domainFilter} onValueChange={setDomainFilter}>
              <SelectTrigger size="sm" className="w-28 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOMAIN_FILTERS.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
            <Loader2 className="size-4 animate-spin mr-2" />
            加载中...
          </div>
        ) : logs.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
            暂无同步日志
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="w-8 px-2 py-2"></th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">时间</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">域</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">方向</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">操作</th>
                    <th className="w-24 px-3 py-2 text-center font-medium text-muted-foreground">进度</th>
                    <th className="w-12 px-2 py-2 text-center font-medium text-muted-foreground">重试</th>
                    <th className="px-3 py-2 text-center font-medium text-muted-foreground">状态</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">插/更/跳</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">耗时</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log: SyncLog) => (
                    <LogRow
                      key={log.id}
                      log={log}
                      isError={log.status === 'error'}
                      isExpanded={expandedId === log.id}
                      onToggle={() => toggleExpand(log.id)}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-border">
              <span className="text-sm text-muted-foreground">
                共 {total} 条日志
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p: number) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="size-4" />
                  上一页
                </Button>
                <span className="text-sm font-mono px-2">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() =>
                    setPage((p: number) => Math.min(totalPages, p + 1))
                  }
                >
                  下一页
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
