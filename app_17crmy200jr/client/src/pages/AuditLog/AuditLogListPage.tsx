import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';
import {
  Search,
  RotateCcw,
  Eye,
  Calendar,
  Activity,
  FileText,
  Download,
  CheckCircle,
  XCircle,
  GitBranch,
  User,
  Monitor,
  Timer,
} from 'lucide-react';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@client/src/components/ui/table';
import PaginationFooter from '@client/src/components/ui/pagination-footer';
import { Badge } from '@client/src/components/ui/badge';
import { Card, CardContent } from '@client/src/components/ui/card';
import { Label } from '@client/src/components/ui/label';
import * as auditLogsApi from '@client/src/api/audit-logs';
import {
  MODULES,
  OPERATION_TYPES,
  STATUS_OPTIONS,
  getTypeBadge,
  getModuleLabel,
  formatDateTime,
} from './audit-log.constants';
import type { AuditLogItem, AuditLogStats } from '@shared/api.interface';

// ============ 页面组件 ============

const AuditLogListPage = () => {
  const navigate = useNavigate();

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [module, setModule] = useState('');
  const [operationType, setOperationType] = useState('');
  const [status, setStatus] = useState('');
  const [operator, setOperator] = useState('');
  const [keyword, setKeyword] = useState('');

  const [items, setItems] = useState<AuditLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(false);

  const [stats, setStats] = useState<AuditLogStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page, pageSize };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (module) params.module = module;
      if (operationType) params.operationType = operationType;
      if (status) params.status = status;
      if (operator.trim()) params.operator = operator.trim();
      if (keyword.trim()) params.keyword = keyword.trim();
      const data = await auditLogsApi.getAuditLogs(params);
      setItems(data.items ?? []);
      setTotal(data.total ?? 0);
    } catch (err: unknown) {
      logger.error('获取审计日志列表失败', err);
      toast.error('获取审计日志列表失败');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, startDate, endDate, module, operationType, status, operator, keyword]);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const data = await auditLogsApi.getAuditStats();
      setStats(data);
    } catch (err: unknown) {
      logger.error('获取审计统计失败', err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => { fetchList(); }, [fetchList]);
  useEffect(() => { fetchStats(); }, [fetchStats]);

  const handleSearch = () => { setPage(1); };

  const handleReset = () => {
    setStartDate(''); setEndDate(''); setModule('');
    setOperationType(''); setStatus(''); setOperator(''); setKeyword('');
    setPage(1);
  };

  const handleExport = async () => {
    try {
      const params: Record<string, unknown> = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (module) params.module = module;
      if (operationType) params.operationType = operationType;
      if (status) params.status = status;
      if (operator.trim()) params.operator = operator.trim();
      if (keyword.trim()) params.keyword = keyword.trim();
      const blob = await auditLogsApi.exportAuditLogs(params);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('导出成功');
    } catch (err: unknown) {
      logger.error('导出审计日志失败', err);
      toast.error('导出失败');
    }
  };

  const statCards = [
    { label: '总操作数', value: stats?.totalOperations ?? 0, icon: Activity, color: 'text-primary', bgColor: 'bg-primary/10' },
    { label: '成功操作', value: stats?.successCount ?? 0, icon: CheckCircle, color: 'text-success', bgColor: 'bg-success/10' },
    { label: '失败操作', value: stats?.failureCount ?? 0, icon: XCircle, color: 'text-destructive', bgColor: 'bg-destructive/10' },
    { label: '今日操作', value: stats?.todayOperations ?? 0, icon: Calendar, color: 'text-warning', bgColor: 'bg-warning/10' },
  ];

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="size-5 text-primary" />
          <h1 className="text-xl font-semibold text-foreground">审计日志</h1>
        </div>
        <Button variant="outline" size="sm" className="rounded-sm border-border bg-transparent hover:bg-accent" onClick={handleExport}>
          <Download className="mr-1.5 size-3.5" />导出 CSV
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4" data-ai-section-type="card-stat">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label} className="rounded-sm shadow-none">
              <CardContent className="flex items-center gap-4 p-4">
                <div className={`flex size-10 items-center justify-center rounded-sm ${card.bgColor}`}>
                  <Icon className={`size-5 ${card.color}`} />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">{card.label}</span>
                  <span className="text-2xl font-semibold text-foreground font-mono">
                    {statsLoading ? '—' : card.value.toLocaleString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 筛选栏 */}
      <Card className="rounded-sm shadow-none">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-3">
            <FilterField label="开始日期">
              <Input type="date" value={startDate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStartDate(e.target.value)} className="h-8 w-36 rounded-sm text-sm" />
            </FilterField>
            <FilterField label="结束日期">
              <Input type="date" value={endDate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEndDate(e.target.value)} className="h-8 w-36 rounded-sm text-sm" />
            </FilterField>
            <FilterField label="模块">
              <Select value={module} onValueChange={setModule}>
                <SelectTrigger className="h-8 w-32 rounded-sm text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{MODULES.map((m) => (<SelectItem key={m.value || 'all'} value={m.value}>{m.label}</SelectItem>))}</SelectContent>
              </Select>
            </FilterField>
            <FilterField label="操作类型">
              <Select value={operationType} onValueChange={setOperationType}>
                <SelectTrigger className="h-8 w-28 rounded-sm text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{OPERATION_TYPES.map((t) => (<SelectItem key={t.value || 'all'} value={t.value}>{t.label}</SelectItem>))}</SelectContent>
              </Select>
            </FilterField>
            <FilterField label="状态">
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-8 w-24 rounded-sm text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{STATUS_OPTIONS.map((s) => (<SelectItem key={s.value || 'all'} value={s.value}>{s.label}</SelectItem>))}</SelectContent>
              </Select>
            </FilterField>
            <FilterField label="操作人">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input value={operator} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOperator(e.target.value)} placeholder="操作人ID" className="h-8 w-40 rounded-sm pl-8 text-sm" />
              </div>
            </FilterField>
            <FilterField label="关键词">
              <Input value={keyword} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setKeyword(e.target.value)} placeholder="搜索描述/路径" className="h-8 w-40 rounded-sm text-sm" />
            </FilterField>
            <div className="flex items-center gap-2 ml-auto">
              <Button variant="outline" size="sm" className="rounded-sm" onClick={handleReset}><RotateCcw className="mr-1.5 size-3.5" />重置</Button>
              <Button size="sm" className="rounded-sm" onClick={handleSearch} disabled={loading}><Search className="mr-1.5 size-3.5" />查询</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 日志表格 */}
      <Card className="rounded-sm shadow-none">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="h-10 text-xs font-medium uppercase tracking-wider text-muted-foreground">操作时间</TableHead>
                <TableHead className="h-10 text-xs font-medium uppercase tracking-wider text-muted-foreground">操作人</TableHead>
                <TableHead className="h-10 text-xs font-medium uppercase tracking-wider text-muted-foreground">模块</TableHead>
                <TableHead className="h-10 text-xs font-medium uppercase tracking-wider text-muted-foreground">操作类型</TableHead>
                <TableHead className="h-10 text-xs font-medium uppercase tracking-wider text-muted-foreground">操作对象</TableHead>
                <TableHead className="h-10 text-xs font-medium uppercase tracking-wider text-muted-foreground">状态</TableHead>
                <TableHead className="h-10 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">耗时</TableHead>
                <TableHead className="h-10 text-xs font-medium uppercase tracking-wider text-muted-foreground">IP 地址</TableHead>
                <TableHead className="h-10 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((log: AuditLogItem) => {
                const typeBadge = getTypeBadge(log.operationType);
                const isSuccess = log.status === 'success';
                return (
                  <TableRow key={log.id} className="hover:bg-accent">
                    <TableCell className="h-10 text-sm text-muted-foreground font-mono">{formatDateTime(log.createdAt)}</TableCell>
                    <TableCell className="h-10 text-sm text-foreground">
                      <div className="flex items-center gap-2"><User className="size-3.5 text-muted-foreground" /><span className="font-mono text-xs">{log.operatorName || log.operator || '—'}</span></div>
                    </TableCell>
                    <TableCell className="h-10 text-sm text-foreground">
                      <div className="flex items-center gap-1.5"><Monitor className="size-3.5 text-muted-foreground" /><span className="text-xs">{getModuleLabel(log.module)}</span></div>
                    </TableCell>
                    <TableCell className="h-10 text-sm"><Badge variant="outline" className={`rounded-sm text-xs ${typeBadge.className}`}>{typeBadge.label}</Badge></TableCell>
                    <TableCell className="h-10 text-sm text-foreground"><span className="font-mono text-xs">{log.targetName || log.targetId || '—'}</span></TableCell>
                    <TableCell className="h-10 text-sm">
                      <Badge variant="outline" className={`rounded-sm text-xs ${isSuccess ? 'border-success/30 bg-success/10 text-success' : 'border-destructive/30 bg-destructive/10 text-destructive'}`}>{isSuccess ? '成功' : '失败'}</Badge>
                    </TableCell>
                    <TableCell className="h-10 text-right text-sm text-muted-foreground font-mono"><div className="flex items-center justify-end gap-1"><Timer className="size-3 text-muted-foreground" /><span>{log.duration}ms</span></div></TableCell>
                    <TableCell className="h-10 text-sm text-muted-foreground font-mono text-xs">{log.ipAddress || '—'}</TableCell>
                    <TableCell className="h-10 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-sm" title="查看详情" onClick={() => navigate(`/audit-logs/${log.id}`)}><Eye className="size-3.5" /></Button>
                        <Button variant="ghost" size="sm" className="h-7 rounded-sm text-xs" onClick={() => navigate(`/audit-logs/trail/${log.targetType}/${log.targetId}`)}><GitBranch className="mr-1 size-3.5" />链路</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {!loading && items.length === 0 && (
                <TableRow><TableCell colSpan={9} className="h-24 text-center text-sm text-muted-foreground">暂无数据</TableCell></TableRow>
              )}
              {loading && (
                <TableRow><TableCell colSpan={9} className="h-24 text-center text-sm text-muted-foreground">加载中...</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
          <PaginationFooter total={total} page={page} totalPages={totalPages} onPageChange={setPage} />
        </CardContent>
      </Card>
    </div>
  );
};

// ============ 筛选字段子组件 ============

interface FilterFieldProps {
  label: string;
  children: React.ReactNode;
}

const FilterField = ({ label, children }: FilterFieldProps) => (
  <div className="flex flex-col gap-1.5">
    <Label className="text-xs text-muted-foreground">{label}</Label>
    {children}
  </div>
);

export default AuditLogListPage;