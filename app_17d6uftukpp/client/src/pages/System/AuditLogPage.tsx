import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, Download, RefreshCw, Shield, FileText, Clock, CheckCircle, XCircle, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { fetchAuditLogs, MODULE_LABELS, moduleLabel, type IAuditLog } from '@/lib/audit-log';
import { downloadCsv } from '@/lib/report';
import { formatUserName } from '@/lib/user-names';

const ACTION_ICONS: Record<string, typeof Shield> = {
  '新增': FileText,
  '修改': FileText,
  '删除': Shield,
  '审批': CheckCircle,
  '导出': Download,
  '导入': Download,
  '登录': User,
  '权限变更': Shield,
  '状态变更': Clock,
};

export default function AuditLogPage() {
  const [logs, setLogs] = useState<IAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [moduleFilter, setModuleFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [resultFilter, setResultFilter] = useState('all');
  const [search, setSearch] = useState('');

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAuditLogs();
      setLogs(data);
      if (data.length > 0) {
        toast.success(`已加载 ${data.length} 条审计日志`);
      }
    } catch {
      toast.error('读取审计日志失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  const filtered = useMemo(() => {
    let result = logs;
    if (moduleFilter !== 'all') {
      result = result.filter((l) => l.module === moduleFilter);
    }
    if (actionFilter !== 'all') {
      result = result.filter((l) => l.action === actionFilter);
    }
    if (resultFilter !== 'all') {
      result = result.filter((l) => l.result === resultFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (l) =>
          l.description.toLowerCase().includes(q) ||
          l.operator.toLowerCase().includes(q) ||
          (l.targetId && l.targetId.toLowerCase().includes(q)),
      );
    }
    return result;
  }, [logs, moduleFilter, actionFilter, resultFilter, search]);

  const handleExport = () => {
    const cols = ['时间', '操作人', '操作类型', '模块', '描述', '结果', '详情'];
    const rows = filtered.map((l) => [
      l.timestamp ? new Date(l.timestamp).toLocaleString('zh-CN') : '',
      l.operator,
      l.action,
      l.module,
      l.description,
      l.result,
      l.detail ?? '',
    ]);
    downloadCsv(`操作日志_${new Date().toISOString().slice(0, 10)}.csv`, cols, rows);
    toast.success('操作日志已导出');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">操作日志审计</h2>
          <p className="mt-1 text-sm text-muted-foreground">所有关键操作实时写入多维表格，刷新后、换设备后均可查</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadLogs} disabled={loading}>
            <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="size-4" /> 导出CSV
          </Button>
        </div>
      </div>

      {/* 筛选工具栏 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="搜索操作人/描述"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-background pl-9"
              />
            </div>
            <Select value={moduleFilter} onValueChange={setModuleFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="全部模块" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部模块</SelectItem>
                {Object.entries(MODULE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={label}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="全部操作" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部操作</SelectItem>
                {['新增', '修改', '删除', '审批', '导出', '导入', '登录', '权限变更', '状态变更'].map((a) => (
                  <SelectItem key={a} value={a}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={resultFilter} onValueChange={setResultFilter}>
              <SelectTrigger className="w-28">
                <SelectValue placeholder="全部结果" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部结果</SelectItem>
                <SelectItem value="成功">成功</SelectItem>
                <SelectItem value="失败">失败</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 日志列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="size-5" />
            审计日志
            <Badge variant="secondary">{filtered.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10" />
              ))}
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">时间</TableHead>
                    <TableHead className="whitespace-nowrap">操作人</TableHead>
                    <TableHead className="whitespace-nowrap">操作类型</TableHead>
                    <TableHead className="whitespace-nowrap">模块</TableHead>
                    <TableHead className="whitespace-nowrap">描述</TableHead>
                    <TableHead className="whitespace-nowrap">结果</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                        暂无操作日志记录
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((log) => {
                      const Icon = ACTION_ICONS[log.action] ?? FileText;
                      return (
                        <TableRow key={log.id}>
                          <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                            {log.timestamp ? new Date(log.timestamp).toLocaleString('zh-CN') : ''}
                          </TableCell>
                          <TableCell className="whitespace-nowrap font-medium">{formatUserName(log.operator)}</TableCell>
                          <TableCell className="whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 text-sm">
                              <Icon className="size-3 text-muted-foreground" />
                              {log.action}
                            </span>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            <Badge variant="outline">{moduleLabel(log.module)}</Badge>
                          </TableCell>
                          <TableCell className="max-w-[300px] truncate">{log.description}</TableCell>
                          <TableCell>
                            <Badge variant={log.result === '成功' ? 'secondary' : 'destructive'}>
                              {log.result}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}