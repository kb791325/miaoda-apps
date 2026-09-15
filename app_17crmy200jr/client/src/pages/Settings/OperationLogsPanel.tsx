import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@client/src/components/ui/table';
import PaginationFooter from '@client/src/components/ui/pagination-footer';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import * as operationLogsApi from '@client/src/api/operation-logs';
import type { OperationLogItem } from '@shared/api.interface';

const operationTypes = ['全部', '创建', '更新', '删除', '导出', '登录', '同步'];

const OperationLogsPanel = () => {
  const [logs, setLogs] = useState<OperationLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [opType, setOpType] = useState('全部');
  const [operator, setOperator] = useState('');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = {
        page,
        pageSize,
      };
      if (opType !== '全部') params.operationType = opType;
      if (operator.trim()) params.operator = operator.trim();
      const data = await operationLogsApi.getList(params);
      setLogs(data.items ?? []);
      setTotal(data.total ?? 0);
    } catch (err: unknown) {
      logger.error('获取操作日志失败', err);
      toast.error('获取操作日志失败');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, opType, operator]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-border bg-card p-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">操作类型</span>
            <Select value={opType} onValueChange={setOpType}>
              <SelectTrigger className="w-[120px] rounded-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {operationTypes.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">操作人</span>
             <Input
               value={operator}
               onChange={(e) => setOperator(e.target.value)}
               placeholder="输入操作人"
               className="h-8 w-40 rounded-sm"
             />
          </div>
          <Button
            variant="default"
            size="sm"
            className="rounded-sm"
            onClick={() => {
              setPage(1);
              fetchLogs();
            }}
            disabled={loading}
          >
            查询
          </Button>
        </div>
      </div>

       <div className="rounded-sm border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="h-10 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                操作时间
              </TableHead>
              <TableHead className="h-10 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                操作人
              </TableHead>
              <TableHead className="h-10 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                操作类型
              </TableHead>
              <TableHead className="h-10 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                操作内容
              </TableHead>
              <TableHead className="h-10 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                IP 地址
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="h-10 text-sm text-muted-foreground">
                  {log.createdAt}
                </TableCell>
                <TableCell className="h-10 text-sm text-foreground">
                  {log.operator}
                </TableCell>
                <TableCell className="h-10 text-sm">
                   <span className="inline-flex rounded-sm border border-border px-2 py-0.5 text-xs text-primary">
                    {log.operationType}
                  </span>
                </TableCell>
                <TableCell className="h-10 max-w-[300px] truncate text-sm text-foreground/80">
                  {log.content}
                </TableCell>
                <TableCell
                  className="h-10 font-mono text-sm text-muted-foreground"
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {log.ipAddress}
                </TableCell>
              </TableRow>
            ))}
            {!loading && logs.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-24 text-center text-sm text-muted-foreground"
                >
                  暂无数据
                </TableCell>
              </TableRow>
            )}
            {loading && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-24 text-center text-sm text-muted-foreground"
                >
                  加载中...
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <PaginationFooter
          total={total}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
};

export default OperationLogsPanel;
