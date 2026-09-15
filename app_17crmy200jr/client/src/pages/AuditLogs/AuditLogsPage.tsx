import { useState, useEffect, useCallback } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';
import {
  Search,
  RotateCcw,
  Eye,
  Clock,
  User,
  Activity,
  FileText,
  Plus,
  Trash2,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@client/src/components/ui/dialog';
import { Badge } from '@client/src/components/ui/badge';
import { Card, CardContent } from '@client/src/components/ui/card';
import { Label } from '@client/src/components/ui/label';
import { Separator } from '@client/src/components/ui/separator';
import * as operationLogsApi from '@client/src/api/operation-logs';
import type {
  OperationLogItem,
  OperationLogDetail,
  OperationLogStatItem,
} from '@shared/api.interface';

// ============ 常量配置 ============

const OPERATION_TYPES = [
  { value: '', label: '全部' },
  { value: 'create', label: '新增' },
  { value: 'update', label: '修改' },
  { value: 'delete', label: '删除' },
  { value: 'approve', label: '审批' },
  { value: 'login', label: '登录' },
  { value: 'export', label: '导出' },
  { value: 'import', label: '导入' },
];

const TARGET_TYPES = [
  { value: '', label: '全部' },
  { value: 'expenses', label: '支出' },
  { value: 'fixed_assets', label: '资产' },
  { value: 'inventory', label: '盘点' },
  { value: 'categories', label: '类目' },
  { value: 'system', label: '系统' },
];

const TYPE_BADGE_MAP: Record<string, { label: string; variant: string; className: string }> = {
  create: { label: '新增', variant: 'outline', className: 'border-success/30 bg-success/10 text-success' },
  update: { label: '修改', variant: 'default', className: '' },
  delete: { label: '删除', variant: 'outline', className: 'border-destructive/30 bg-destructive/10 text-destructive' },
  approve: { label: '审批', variant: 'outline', className: 'border-primary/30 bg-primary/10 text-primary' },
  login: { label: '登录', variant: 'outline', className: 'border-border bg-muted text-muted-foreground' },
  export: { label: '导出', variant: 'outline', className: 'border-warning/30 bg-warning/10 text-warning' },
  import: { label: '导入', variant: 'outline', className: 'border-success/30 bg-success/10 text-success' },
};

const TARGET_TYPE_LABELS: Record<string, string> = {
  expenses: '支出',
  fixed_assets: '资产',
  inventory: '盘点',
  categories: '类目',
  system: '系统',
};

// ============ 工具函数 ============

function getTypeBadge(type: string) {
  return TYPE_BADGE_MAP[type] ?? { label: (type || '未知'), variant: 'outline', className: 'border-border bg-accent/50 text-muted-foreground' };
}

function getTargetTypeLabel(type: string) {
  return TARGET_TYPE_LABELS[type] ?? (type || '—');
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function isToday(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  return d.toDateString() === today.toDateString();
}

// ============ 主页面组件 ============

const AuditLogsPage = () => {
  // 筛选状态
  const [operatorId, setOperatorId] = useState('');
  const [operationType, setOperationType] = useState('');
  const [targetType, setTargetType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // 列表状态
  const [items, setItems] = useState<OperationLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(false);

  // 统计状态
  const [stats, setStats] = useState<OperationLogStatItem[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);

  // 详情弹窗
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailData, setDetailData] = useState<OperationLogDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // ============ 数据获取 ============

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = {
        page,
        pageSize,
      };
      if (operatorId.trim()) params.operatorId = operatorId.trim();
      if (operationType) params.operationType = operationType;
      if (targetType) params.targetType = targetType;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const data = await operationLogsApi.getList(params);
      setItems(data.items ?? []);
      setTotal(data.total ?? 0);
    } catch (err: unknown) {
      logger.error('获取审计日志列表失败', err);
      toast.error('获取审计日志列表失败');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, operatorId, operationType, targetType, startDate, endDate]);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const data = await operationLogsApi.getStats();
      setStats(data ?? []);
    } catch (err: unknown) {
      logger.error('获取审计日志统计失败', err);
      toast.error('获取审计日志统计失败');
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // ============ 事件处理 ============

  const handleSearch = () => {
    setPage(1);
    fetchList();
  };

  const handleReset = () => {
    setOperatorId('');
    setOperationType('');
    setTargetType('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const handleViewDetail = async (id: string) => {
    setDetailOpen(true);
    setDetailData(null);
    setDetailLoading(true);
    try {
      const data = await operationLogsApi.getDetail(id);
      setDetailData(data);
    } catch (err: unknown) {
      logger.error('获取审计日志详情失败', err);
      toast.error('获取审计日志详情失败');
    } finally {
      setDetailLoading(false);
    }
  };

  // ============ 统计卡片计算 ============

  const totalOperations = stats.reduce(
    (sum: number, s: OperationLogStatItem) => sum + s.count,
    0,
  );

  const createCount = stats.find(
    (s: OperationLogStatItem) => s.operationType === 'create',
  )?.count ?? 0;

  const deleteCount = stats.find(
    (s: OperationLogStatItem) => s.operationType === 'delete',
  )?.count ?? 0;

  // 注意：本项为当前页数据统计，非全局统计
  // 全量今日操作数需后端聚合接口支持
  const todayCount = items.filter(
    (item: OperationLogItem) => isToday(item.createdAt),
  ).length;

  // ============ 分页 ============

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // ============ 详情内容解析 ============

  const parseContent = (contentStr: string) => {
    try {
      return JSON.parse(contentStr);
    } catch {
      return null;
    }
  };

  const renderDetailContent = () => {
    if (!detailData) return null;

    const content = parseContent(detailData.content);
    const hasBeforeAfter =
      content &&
      typeof content === 'object' &&
      (content.before !== undefined || content.after !== undefined);

    if (!content) {
      return (
        <div className="rounded-sm border bg-accent/30 p-4 text-sm text-muted-foreground font-mono">
          {detailData.content || '无操作内容'}
        </div>
      );
    }

    if (hasBeforeAfter) {
      const before = content.before ?? {};
      const after = content.after ?? {};
      const allKeys = new Set([
        ...Object.keys(before),
        ...Object.keys(after),
      ]);
      const changedKeys = Array.from(allKeys).filter(
        (k: string) =>
          JSON.stringify(before[k]) !== JSON.stringify(after[k]),
      );
      const unchangedKeys = Array.from(allKeys).filter(
        (k: string) =>
          JSON.stringify(before[k]) === JSON.stringify(after[k]),
      );

      return (
        <div className="space-y-4">
          <div>
            <h4 className="mb-2 text-sm font-medium text-foreground">
              变更字段对比
            </h4>
            <div className="rounded-sm border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="w-1/4 px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      字段
                    </th>
                    <th className="w-[37.5%] px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      变更前
                    </th>
                    <th className="w-[37.5%] px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      变更后
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {changedKeys.map((key: string) => (
                    <tr key={key} className="border-t border-border">
                      <td className="px-3 py-2 font-medium text-foreground">
                        {key}
                      </td>
                      <td className="px-3 py-2 text-destructive font-mono text-xs break-words">
                        {formatValue(before[key])}
                      </td>
                      <td className="px-3 py-2 text-success font-mono text-xs break-words">
                        {formatValue(after[key])}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {unchangedKeys.length > 0 && (
            <div>
              <h4 className="mb-2 text-sm font-medium text-foreground">
                未变更字段
              </h4>
              <div className="rounded-sm border bg-accent/20 p-3">
                <div className="flex flex-wrap gap-2">
                  {unchangedKeys.map((key: string) => (
                    <span
                      key={key}
                      className="inline-flex items-center rounded-sm border border-border px-2 py-0.5 text-xs text-muted-foreground"
                    >
                      {key}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    // 普通 JSON 展示
    const entries = Object.entries(content);
    return (
      <div className="rounded-sm border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="w-1/3 px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                字段
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                值
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.map(([key, value]) => (
              <tr key={key} className="border-t border-border">
                <td className="px-3 py-2 font-medium text-foreground align-top">
                  {key}
                </td>
                <td className="px-3 py-2 font-mono text-xs break-words text-muted-foreground">
                  {formatValue(value)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const formatValue = (val: unknown): string => {
    if (val === null || val === undefined) return '—';
    if (typeof val === 'object') return JSON.stringify(val, null, 2);
    return String(val);
  };

  // ============ 渲染 ============

  const statCards = [
    {
      label: '总操作数',
      value: totalOperations,
      icon: Activity,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      label: '本页今日操作',
      value: todayCount,
      icon: Clock,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      label: '新增操作数',
      value: createCount,
      icon: Plus,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      label: '删除操作数',
      value: deleteCount,
      icon: Trash2,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
    },
  ];

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="size-5 text-primary" />
          <h1 className="text-xl font-semibold text-foreground mb-6">审计日志</h1>
        </div>
      </div>

      {/* 统计概览卡片 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label} className="rounded-sm shadow-none">
              <CardContent className="flex items-center gap-4 p-4">
                <div
                  className={`flex size-10 items-center justify-center rounded-sm ${card.bgColor}`}
                >
                  <Icon className={`size-5 ${card.color}`} />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">
                    {card.label}
                  </span>
                  <span
                    className="text-2xl font-semibold text-foreground font-mono"
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                  >
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
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">操作人</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={operatorId}
                  onChange={(e) => setOperatorId(e.target.value)}
                  placeholder="输入操作人ID"
                  className="h-8 w-48 rounded-sm pl-8 text-sm"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">操作类型</Label>
              <Select value={operationType} onValueChange={setOperationType}>
                <SelectTrigger className="h-8 w-32 rounded-sm text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OPERATION_TYPES.map((t) => (
                    <SelectItem key={t.value || 'all'} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">业务域</Label>
              <Select value={targetType} onValueChange={setTargetType}>
                <SelectTrigger className="h-8 w-32 rounded-sm text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TARGET_TYPES.map((t) => (
                    <SelectItem key={t.value || 'all'} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">开始日期</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-8 w-40 rounded-sm text-sm"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">结束日期</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-8 w-40 rounded-sm text-sm"
              />
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <Button
                variant="outline"
                size="sm"
                className="rounded-sm"
                onClick={handleReset}
              >
                <RotateCcw className="mr-1.5 size-3.5" />
                重置
              </Button>
              <Button
                variant="default"
                size="sm"
                className="rounded-sm"
                onClick={handleSearch}
                disabled={loading}
              >
                <Search className="mr-1.5 size-3.5" />
                查询
              </Button>
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
                  操作对象
                </TableHead>
                <TableHead className="h-10 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  IP 地址
                </TableHead>
                <TableHead className="h-10 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  操作
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((log: OperationLogItem) => {
                const badge = getTypeBadge(log.operationType);
                return (
                  <TableRow key={log.id} className="hover:bg-accent">
                    <TableCell className="h-10 text-sm text-muted-foreground font-mono">
                      {formatDateTime(log.createdAt)}
                    </TableCell>
                    <TableCell className="h-10 text-sm text-foreground">
                      <div className="flex items-center gap-2">
                        <User className="size-3.5 text-muted-foreground" />
                        <span className="font-mono text-xs">
                          {log.operator || '—'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="h-10 text-sm">
                      <Badge
                        variant={badge.variant as 'default' | 'outline'}
                        className={`rounded-sm ${badge.className}`}
                      >
                        {badge.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="h-10 text-sm text-foreground">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-muted-foreground">
                          {getTargetTypeLabel(log.targetType)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell
                      className="h-10 font-mono text-sm text-muted-foreground"
                      style={{ fontVariantNumeric: 'tabular-nums' }}
                    >
                      {log.ipAddress || '—'}
                    </TableCell>
                    <TableCell className="h-10 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 rounded-sm text-xs"
                        onClick={() => handleViewDetail(log.id)}
                      >
                        <Eye className="mr-1 size-3.5" />
                        详情
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {!loading && items.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-24 text-center text-sm text-muted-foreground"
                  >
                    暂无数据
                  </TableCell>
                </TableRow>
              )}
              {loading && (
                <TableRow>
                  <TableCell
                    colSpan={6}
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
        </CardContent>
      </Card>

      {/* 详情弹窗 */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-3xl rounded-sm max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="size-4 text-primary" />
              操作详情
            </DialogTitle>
          </DialogHeader>

          {detailLoading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              加载中...
            </div>
          ) : detailData ? (
            <div className="space-y-5">
              {/* 基本信息 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">
                    操作时间
                  </Label>
                  <p className="mt-1 text-sm font-mono text-foreground">
                    {formatDateTime(detailData.createdAt)}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    操作类型
                  </Label>
                  <p className="mt-1">
                    <Badge
                      variant={
                        getTypeBadge(detailData.operationType)
                          .variant as 'default' | 'outline'
                      }
                      className={`rounded-sm ${
                        getTypeBadge(detailData.operationType).className
                      }`}
                    >
                      {getTypeBadge(detailData.operationType).label}
                    </Badge>
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    操作人
                  </Label>
                  <p className="mt-1 text-sm font-mono text-foreground">
                    {detailData.operator || '—'}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    IP 地址
                  </Label>
                  <p className="mt-1 text-sm font-mono text-foreground">
                    {detailData.ipAddress || '—'}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    业务域
                  </Label>
                  <p className="mt-1 text-sm text-foreground">
                    {getTargetTypeLabel(detailData.targetType)}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    目标ID
                  </Label>
                  <p className="mt-1 text-sm font-mono text-foreground">
                    {detailData.targetId || '—'}
                  </p>
                </div>
              </div>

              <Separator />

              {/* 操作内容 */}
              <div>
                <h3 className="mb-3 text-sm font-medium text-foreground">
                  操作内容
                </h3>
                {renderDetailContent()}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AuditLogsPage;
