import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Clock,
  User,
  Monitor,
  Globe,
  Terminal,
  Hash,
  Timer,
  AlertTriangle,
  Copy,
  Check,
} from 'lucide-react';
import { Button } from '@client/src/components/ui/button';
import { Badge } from '@client/src/components/ui/badge';
import { Card, CardContent } from '@client/src/components/ui/card';
import { Label } from '@client/src/components/ui/label';
import { Separator } from '@client/src/components/ui/separator';
import DataDiffViewer from '@client/src/components/DataDiffViewer';
import * as auditLogsApi from '@client/src/api/audit-logs';
import type { AuditLogDetail } from '@shared/api.interface';

// ============ 常量 ============

const TYPE_BADGE_MAP: Record<string, { label: string; className: string }> = {
  create: { label: '新增', className: 'border-success/30 bg-success/10 text-success' },
  update: { label: '修改', className: 'border-primary/30 bg-primary/10 text-primary' },
  delete: { label: '删除', className: 'border-destructive/30 bg-destructive/10 text-destructive' },
  approve: { label: '审批', className: 'border-primary/30 bg-primary/10 text-primary' },
  borrow: { label: '借出', className: 'border-warning/30 bg-warning/10 text-warning' },
  return: { label: '归还', className: 'border-success/30 bg-success/10 text-success' },
  login: { label: '登录', className: 'border-border bg-muted text-muted-foreground' },
  export: { label: '导出', className: 'border-warning/30 bg-warning/10 text-warning' },
  import: { label: '导入', className: 'border-success/30 bg-success/10 text-success' },
};

const MODULE_LABEL_MAP: Record<string, string> = {
  expenses: '支出管理',
  fixed_assets: '资产管理',
  inventory: '盘点执行',
  categories: '类目管理',
  budget: '预算管理',
  system: '系统管理',
  auth: '认证登录',
};

// ============ 工具函数 ============

function getTypeBadge(type: string) {
  return TYPE_BADGE_MAP[type] ?? {
    label: type || '未知',
    className: 'border-border bg-accent/50 text-muted-foreground',
  };
}

function getModuleLabel(module: string): string {
  return MODULE_LABEL_MAP[module] ?? (module || '—');
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function formatMethod(method: string): string {
  return method?.toUpperCase() || '—';
}

function getMethodBadge(method: string): string {
  const m = method?.toUpperCase();
  switch (m) {
    case 'GET':
      return 'border-green-200 bg-green-50 text-green-700';
    case 'POST':
      return 'border-blue-200 bg-blue-50 text-blue-700';
    case 'PUT':
      return 'border-orange-200 bg-orange-50 text-orange-700';
    case 'DELETE':
      return 'border-red-200 bg-red-50 text-red-700';
    case 'PATCH':
      return 'border-purple-200 bg-purple-50 text-purple-700';
    default:
      return 'border-border bg-muted text-muted-foreground';
  }
}

// ============ 字段标签行 ============

interface FieldRowProps {
  label: string;
  value: React.ReactNode;
}

const FieldRow = ({ label, value }: FieldRowProps) => (
  <div>
    <Label className="text-xs text-muted-foreground">{label}</Label>
    <div className="mt-1">{value}</div>
  </div>
);

// ============ 页面组件 ============

const AuditLogDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [data, setData] = useState<AuditLogDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [traceIdCopied, setTraceIdCopied] = useState(false);

  const handleCopyTraceId = async () => {
    if (!data?.traceId) return;
    try {
      await navigator.clipboard.writeText(data.traceId);
      setTraceIdCopied(true);
      toast.success('Trace ID 已复制');
      setTimeout(() => setTraceIdCopied(false), 2000);
    } catch {
      toast.error('复制失败');
    }
  };

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    auditLogsApi
      .getAuditLogById(id)
      .then((res: AuditLogDetail) => {
        setData(res);
      })
      .catch((err: unknown) => {
        logger.error('获取审计日志详情失败', err);
        toast.error('获取审计日志详情失败');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  // ============ 渲染 ============

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-muted-foreground">加载中...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <p className="text-sm text-muted-foreground">日志不存在</p>
        <Button
          variant="outline"
          size="sm"
          className="rounded-sm"
          onClick={() => navigate('/audit-logs')}
        >
          <ArrowLeft className="mr-1.5 size-3.5" />
          返回列表
        </Button>
      </div>
    );
  }

  const typeBadge = getTypeBadge(data.operationType);
  const isSuccess = data.status === 'success';

  return (
    <div className="space-y-4">
      {/* 返回按钮 */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 rounded-sm"
          onClick={() => navigate('/audit-logs')}
        >
          <ArrowLeft className="mr-1.5 size-4" />
          返回列表
        </Button>
        <h1 className="text-xl font-semibold text-foreground">操作详情</h1>
      </div>

      {/* 基本信息卡片 */}
      <Card className="rounded-sm shadow-none">
        <CardContent className="p-4">
          <h2 className="mb-3 text-sm font-medium text-foreground flex items-center gap-2">
            <Hash className="size-4 text-primary" />
            基本信息
          </h2>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-4">
            <FieldRow
              label="操作时间"
              value={
                <div className="flex items-center gap-1.5">
                  <Clock className="size-3.5 text-muted-foreground" />
                  <span className="text-sm font-mono text-foreground">
                    {formatDateTime(data.createdAt)}
                  </span>
                </div>
              }
            />
            <FieldRow
              label="Trace ID"
              value={
                <div className="flex items-center gap-1.5">
                  <Terminal className="size-3.5 text-muted-foreground" />
                  <span className="text-sm font-mono text-foreground">
                    {data.traceId || '—'}
                  </span>
                  {data.traceId && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 rounded-sm"
                      title="复制 Trace ID"
                      onClick={handleCopyTraceId}
                    >
                      {traceIdCopied ? (
                        <Check className="size-3 text-success" />
                      ) : (
                        <Copy className="size-3" />
                      )}
                    </Button>
                  )}
                </div>
              }
            />
            <FieldRow
              label="操作人"
              value={
                <div className="flex items-center gap-1.5">
                  <User className="size-3.5 text-muted-foreground" />
                  <span className="text-sm font-mono text-foreground">
                    {data.operatorName || data.operator || '—'}
                  </span>
                </div>
              }
            />
            <FieldRow
              label="部门"
              value={
                <span className="text-sm text-foreground">
                  {data.department || '—'}
                </span>
              }
            />
            <FieldRow
              label="IP 地址"
              value={
                <div className="flex items-center gap-1.5">
                  <Globe className="size-3.5 text-muted-foreground" />
                  <span className="text-sm font-mono text-foreground">
                    {data.ipAddress || '—'}
                  </span>
                </div>
              }
            />
            <FieldRow
              label="User Agent"
              value={
                <span className="text-sm text-muted-foreground break-words">
                  {data.userAgent || '—'}
                </span>
              }
            />
            <FieldRow
              label="状态"
              value={
                <Badge
                  variant="outline"
                  className={`rounded-sm text-xs ${
                    isSuccess
                      ? 'border-success/30 bg-success/10 text-success'
                      : 'border-destructive/30 bg-destructive/10 text-destructive'
                  }`}
                >
                  {isSuccess ? '成功' : '失败'}
                </Badge>
              }
            />
            <FieldRow
              label="耗时"
              value={
                <div className="flex items-center gap-1.5">
                  <Timer className="size-3.5 text-muted-foreground" />
                  <span className="text-sm font-mono text-foreground">
                    {data.duration}ms
                  </span>
                </div>
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* 操作信息卡片 */}
      <Card className="rounded-sm shadow-none">
        <CardContent className="p-4">
          <h2 className="mb-3 text-sm font-medium text-foreground flex items-center gap-2">
            <Monitor className="size-4 text-primary" />
            操作信息
          </h2>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-4">
            <FieldRow
              label="模块"
              value={
                <span className="text-sm text-foreground">
                  {getModuleLabel(data.module)}
                </span>
              }
            />
            <FieldRow
              label="操作类型"
              value={
                <Badge
                  variant="outline"
                  className={`rounded-sm text-xs ${typeBadge.className}`}
                >
                  {typeBadge.label}
                </Badge>
              }
            />
            <FieldRow
              label="操作对象"
              value={
                <span className="text-sm font-mono text-foreground">
                  {data.targetName || data.targetId || '—'}
                </span>
              }
            />
            <FieldRow
              label="对象类型"
              value={
                <span className="text-sm text-foreground">
                  {data.targetType || '—'}
                </span>
              }
            />
            {data.description && (
              <div className="col-span-2 md:col-span-4">
                <Label className="text-xs text-muted-foreground">描述</Label>
                <p className="mt-1 text-sm text-foreground">
                  {data.description}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 请求信息卡片 */}
      <Card className="rounded-sm shadow-none">
        <CardContent className="p-4">
          <h2 className="mb-3 text-sm font-medium text-foreground flex items-center gap-2">
            <Globe className="size-4 text-primary" />
            请求信息
          </h2>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-4">
            <FieldRow
              label="请求方法"
              value={
                <Badge
                  variant="outline"
                  className={`rounded-sm text-xs font-mono ${getMethodBadge(data.method)}`}
                >
                  {formatMethod(data.method)}
                </Badge>
              }
            />
            <FieldRow
              label="请求路径"
              value={
                <span className="text-sm font-mono text-foreground break-all">
                  {data.path || '—'}
                </span>
              }
            />
            <FieldRow
              label="状态码"
              value={
                <Badge
                  variant="outline"
                  className={`rounded-sm text-xs font-mono ${
                    isSuccess
                      ? 'border-green-200 bg-green-50 text-green-700'
                      : 'border-red-200 bg-red-50 text-red-700'
                  }`}
                >
                  {isSuccess ? '200' : '—'}
                </Badge>
              }
            />
            <FieldRow
              label="响应耗时"
              value={
                <span className="text-sm font-mono text-foreground">
                  {data.duration}ms
                </span>
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* 数据变更对比 */}
      <Card className="rounded-sm shadow-none">
        <CardContent className="p-4">
          <h2 className="mb-3 text-sm font-medium text-foreground">
            数据变更对比
          </h2>
          <DataDiffViewer
            beforeData={data.beforeData}
            afterData={data.afterData}
            changedFields={data.changedFields}
          />
        </CardContent>
      </Card>

      {/* 错误信息 */}
      {!isSuccess && data.errorMessage && (
        <Card className="rounded-sm shadow-none border-destructive/30 bg-destructive/5">
          <CardContent className="p-4">
            <h2 className="mb-3 text-sm font-medium text-destructive flex items-center gap-2">
              <AlertTriangle className="size-4" />
              错误信息
            </h2>
            <div className="rounded-sm bg-destructive/10 border border-destructive/20 p-3">
              <pre className="text-sm font-mono text-destructive whitespace-pre-wrap break-words">
                {data.errorMessage}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* 底部操作 */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          className="rounded-sm"
          onClick={() => navigate('/audit-logs')}
        >
          <ArrowLeft className="mr-1.5 size-3.5" />
          返回列表
        </Button>
      </div>
    </div>
  );
};

export default AuditLogDetailPage;