import { useState, useEffect, useCallback } from 'react';
import { formatBeijingTime } from '@client/src/utils/date';
import { auditLogs } from '@client/src/api';
import { Button } from '@client/src/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import { Input } from '@client/src/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@client/src/components/ui/card';
import { Badge } from '@client/src/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@client/src/components/ui/popover';
import { Calendar } from '@client/src/components/ui/calendar';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  RotateCcw,
  FileText,
  Eye,
  Calendar as CalendarIcon,
  Download,
} from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type {
  AuditLog,
  AuditActionType,
  AuditLogListParams,
} from '@shared/api.interface';
import {
  ACTION_TYPE_MAP,
  ACTION_TYPE_OPTIONS,
  AuditLogDetailDialog,
  formatDateForParam,
} from './AuditLogDetailDialog';

const PAGE_SIZE = 10;

interface DatePickerFieldProps {
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
  placeholder: string;
}

function DatePickerField({ value, onChange, placeholder }: DatePickerFieldProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start text-left font-normal gap-2"
        >
          <CalendarIcon className="size-4 text-muted-foreground" />
          {value ? (
            <span className="font-mono text-xs">
              {formatDateForParam(value)}
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={onChange}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

function escapeCsvCell(value: string): string {
  if (/[",\n\r]/u.test(value)) {
    return `"${value.replace(/"/gu, '""')}"`;
  }
  return value;
}

function getExportDateStamp(): string {
  const now: Date = new Date();
  const month: string = String(now.getMonth() + 1).padStart(2, '0');
  const day: string = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}${month}${day}`;
}

function downloadCsvBlob(blob: Blob, filename: string): void {
  const url: string = URL.createObjectURL(blob);
  const link: HTMLAnchorElement = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function AuditLogsPage() {
  const [items, setItems] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const [actionType, setActionType] = useState<string>('all');
  const [targetType, setTargetType] = useState('');
  const [operator, setOperator] = useState('');
  const [keyword, setKeyword] = useState('');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  const [activeParams, setActiveParams] = useState<
    Omit<AuditLogListParams, 'page' | 'pageSize'>
  >({});

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLogId, setDetailLogId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: AuditLogListParams = {
        page,
        pageSize: PAGE_SIZE,
        ...activeParams,
      };
      const res = await auditLogs.getAuditLogs(params);
      setItems(res.items);
      setTotal(res.total);
    } catch (err: unknown) {
      logger.error('获取审计日志失败:', String(err));
      toast.error('获取审计日志失败');
    } finally {
      setIsLoading(false);
    }
  }, [page, activeParams]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleSearch = () => {
    const params: Omit<AuditLogListParams, 'page' | 'pageSize'> = {};
    if (actionType && actionType !== 'all') {
      params.actionType = actionType as AuditActionType;
    }
    if (targetType.trim()) params.targetType = targetType.trim();
    if (operator.trim()) params.operator = operator.trim();
    if (keyword.trim()) params.keyword = keyword.trim();
    const start = formatDateForParam(startDate);
    const end = formatDateForParam(endDate);
    if (start) params.startDate = start;
    if (end) params.endDate = end;
    setActiveParams(params);
    setPage(1);
  };

  const handleReset = () => {
    setActionType('all');
    setTargetType('');
    setOperator('');
    setKeyword('');
    setStartDate(undefined);
    setEndDate(undefined);
    setActiveParams({});
    setPage(1);
  };

  const handleExport = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const data: AuditLog[] = await auditLogs.exportAuditLogs(activeParams);
      const header: string[] = [
        '操作类型', '对象类型', '对象ID', '操作人', '操作人姓名', 'IP', '时间',
      ];
      const rows: string[][] = data.map((item: AuditLog) => [
        ACTION_TYPE_MAP[item.actionType]?.label ?? item.actionType,
        item.targetType,
        item.targetId ?? '',
        item.operator,
        item.operatorName ?? '',
        item.ipAddress ?? '',
        formatBeijingTime(item.createdAt),
      ]);
      const csv: string = [header, ...rows]
        .map((row: string[]) => row.map(escapeCsvCell).join(','))
        .join('\n');
      const blob: Blob = new Blob([`\uFEFF${csv}`], {
        type: 'text/csv;charset=utf-8;',
      });
      downloadCsvBlob(blob, `audit_logs_${getExportDateStamp()}.csv`);
      toast.success('导出成功');
    } catch (err: unknown) {
      logger.error('导出审计日志失败:', String(err));
      toast.error('导出失败');
    } finally {
      setIsExporting(false);
    }
  };

  const handleViewDetail = (log: AuditLog) => {
    setDetailLogId(log.id);
    setDetailOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-5 w-1 rounded-sm bg-primary" />
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-foreground">
              审计日志
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              追踪系统内的关键操作记录，支持筛选与导出
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={isExporting}>
          <Download className="size-4" />
          {isExporting ? '导出中...' : '导出'}
        </Button>
      </div>

      <Card className="rounded-sm shadow-none border border-border">
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">
                操作类型
              </label>
              <Select value={actionType} onValueChange={setActionType}>
                <SelectTrigger>
                  <SelectValue placeholder="全部" />
                </SelectTrigger>
                <SelectContent>
                  {ACTION_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">
                操作对象类型
              </label>
              <Input
                placeholder="如 product / order"
                value={targetType}
                onChange={(e) => setTargetType(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">操作人</label>
              <Input
                placeholder="用户 ID 或姓名"
                value={operator}
                onChange={(e) => setOperator(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">关键词</label>
              <Input
                placeholder="搜索关键词"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">开始日期</label>
              <DatePickerField
                value={startDate}
                onChange={setStartDate}
                placeholder="选择开始日期"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">结束日期</label>
              <DatePickerField
                value={endDate}
                onChange={setEndDate}
                placeholder="选择结束日期"
              />
            </div>

            <div className="flex items-end gap-2 lg:col-span-1 xl:col-span-2 justify-end">
              <Button variant="outline" size="sm" onClick={handleReset}>
                <RotateCcw className="size-4" />
                重置
              </Button>
              <Button size="sm" onClick={handleSearch}>
                <Search className="size-4" />
                查询
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-sm shadow-none border border-border">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <FileText className="size-4 text-primary" />
            日志列表
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
              加载中...
            </div>
          ) : items.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
              暂无日志记录
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                        操作时间
                      </th>
                      <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                        操作类型
                      </th>
                      <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                        操作对象类型
                      </th>
                      <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                        操作对象 ID
                      </th>
                      <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                        操作人
                      </th>
                      <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                        IP 地址
                      </th>
                      <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item: AuditLog) => {
                      const actionInfo = ACTION_TYPE_MAP[item.actionType] ?? {
                        label: item.actionType,
                        className: '',
                      };
                      return (
                        <tr
                          key={item.id}
                          className="border-b border-border/50 hover:bg-accent/50"
                        >
                          <td className="px-3 py-2.5 text-muted-foreground font-mono text-xs">
                            {formatBeijingTime(
                              item.createdAt,
                              'YYYY-MM-DD HH:mm:ss',
                            )}
                          </td>
                          <td className="px-3 py-2.5">
                            <Badge
                              variant="secondary"
                              className={actionInfo.className}
                            >
                              {actionInfo.label}
                            </Badge>
                          </td>
                          <td className="px-3 py-2.5">{item.targetType}</td>
                          <td className="px-3 py-2.5">
                            <button
                              type="button"
                              onClick={() => handleViewDetail(item)}
                              className="font-mono text-xs text-primary hover:underline text-left"
                            >
                              {item.targetId || '-'}
                            </button>
                          </td>
                          <td className="px-3 py-2.5">
                            {item.operatorName || item.operator || '-'}
                          </td>
                          <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">
                            {item.ipAddress || '-'}
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewDetail(item)}
                              className="h-7 px-2"
                            >
                              <Eye className="size-3.5" />
                              查看
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between pt-4 mt-2 border-t border-border">
                <span className="text-sm text-muted-foreground">
                  共 {total} 条记录
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
        </CardContent>
      </Card>

      <AuditLogDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        logId={detailLogId}
      />
    </div>
  );
}
