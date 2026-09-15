import { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import type { ModuleKey } from '@/data/mt-records';
import { ArrowLeft, FileQuestion, Pencil, Trash2, Loader2, Paperclip } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { MODULES, type IRowAction, type IDetailTab } from '@/config/modules';
import { useModuleData } from '@/lib/data-service';
import CrossTableTab from '@/components/generic/CrossTableTab';
import ContractApprovalTimeline from '@/components/generic/ContractApprovalTimeline';
import ApprovalTimeline from '@/components/generic/ApprovalTimeline';
import VideoDetailTabs from '@/components/generic/VideoDetailTabs';
import { formatFieldValue, formatDisplayValue, optionMeta, isPersonField } from '@/lib/format';
import SupportDetailTabs from '@/components/generic/SupportDetailTabs';
import { maskField } from '@/lib/mask';
import { formatUserName } from '@/lib/user-names';
import { UniversalLink } from '@lark-apaas/client-toolkit/components/UniversalLink';

interface GenericDetailPageProps {
  moduleKey: ModuleKey;
}

function actionVisible(action: IRowAction, values: Record<string, string | number>): boolean {
  if (
    action.visibleWhenIn &&
    !action.visibleWhenIn.values.includes(String(values[action.visibleWhenIn.field] ?? ''))
  ) {
    return false;
  }
  if (
    action.visibleWhenEquals &&
    String(values[action.visibleWhenEquals.field] ?? '') !== action.visibleWhenEquals.value
  ) {
    return false;
  }
  if (
    action.hiddenWhenIn &&
    action.hiddenWhenIn.values.includes(String(values[action.hiddenWhenIn.field] ?? ''))
  ) {
    return false;
  }
  if (
    action.hiddenWhenEquals &&
    String(values[action.hiddenWhenEquals.field] ?? '') === action.hiddenWhenEquals.value
  ) {
    return false;
  }
  return true;
}

export default function GenericDetailPage({ moduleKey }: GenericDetailPageProps) {
  const config = MODULES[moduleKey];
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { records, loading, update, remove } = useModuleData(moduleKey);
  const record = records.find((r) => r.recordId === id);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [askDelete, setAskDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [detailTab, setDetailTab] = useState('info');

  const maskFieldKeys = useMemo(() => new Set(config.maskFields ?? []), [config.maskFields]);

  const detailFields = config.fields.filter((f) => f.inDetail);
  const primaryField = config.fields[0];
  const statusField = config.filterField
    ? config.fields.find((f) => f.key === config.filterField)
    : undefined;
  const visibleActions = config.rowActions?.filter((a) => record && actionVisible(a, record.values)) ?? [];

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-48" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Skeleton className="h-72 lg:col-span-2" />
          <Skeleton className="h-72" />
        </div>
      </div>
    );
  }
  if (!record) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <FileQuestion className="size-10 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">未找到该{config.noun}记录, 可能已被删除</p>
          <Button variant="outline" size="sm" onClick={() => navigate(config.route)}>
            <ArrowLeft className="size-4" />
            返回列表
          </Button>
        </CardContent>
      </Card>
    );
  }

  const statusMeta = statusField
    ? optionMeta(statusField, record.values[statusField.key])
    : { label: '', className: '' };
  const primaryText = formatDisplayValue(record.values[primaryField.key]) === '—' ? config.noun : formatDisplayValue(record.values[primaryField.key]);

  const runAction = async (action: IRowAction) => {
    setBusyAction(action.key);
    try {
      await update(record.recordId, action.patch);
      toast.success(action.successMessage);
    } catch {
      // 错误详情已由 data-service 统一 toast
    } finally {
      setBusyAction(null);
    }
  };

  const runDelete = async () => {
    setDeleting(true);
    try {
      await remove(record.recordId);
      toast.success(`${config.noun}已删除`);
      navigate(config.route);
    } catch {
      setDeleting(false);
      setAskDelete(false);
    }
  };

  const renderFieldValue = (field: typeof config.fields[0], raw: string | number | undefined | null) => {
    if (maskFieldKeys.has(field.key)) {
      return maskField(field.key, raw);
    }
    if (field.type === 'select') {
      return formatFieldValue(field, raw);
    }
    if (field.money) {
      return formatFieldValue(field, raw);
    }
    if (field.percent) {
      return formatFieldValue(field, raw);
    }
    if (field.bitableType === 'Attachment' && typeof raw === 'string') {
      try {
        const files = JSON.parse(raw);
        if (Array.isArray(files) && files.length > 0) {
          return (
            <div className="flex flex-wrap gap-2">
              {files.map((file, idx) => {
                const name = String(file.name ?? file.fileName ?? `附件${idx + 1}`);
                const url = String(file.url ?? file.downloadUrl ?? '');
                return (
                  <UniversalLink
                    key={idx}
                    to={url || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded border border-border px-2.5 py-1 text-sm',
                      url ? 'text-primary hover:bg-accent' : 'text-muted-foreground',
                    )}
                  >
                    <Paperclip className="size-3.5" />
                    {name}
                  </UniversalLink>
                );
              })}
            </div>
          );
        }
      } catch {
        // 非JSON格式，回退到文本展示
      }
      return formatDisplayValue(raw);
    }
    // 统一走 formatDisplayValue: 人员ID→姓名、时间戳→日期、兜底→'—'
    return formatDisplayValue(raw);
  };

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" className="-ml-2" onClick={() => navigate(config.route)}>
        <ArrowLeft className="size-4" />
        返回{config.label}
      </Button>

      {/* 标题区 */}
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <h2 className="truncate text-xl font-semibold tracking-tight">{primaryText}</h2>
          {statusField ? (
            <Badge variant="outline" className={cn('shrink-0 text-xs', statusMeta.className)}>
              {statusMeta.label}
            </Badge>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate(`${config.route}/${record.recordId}/edit`)}>
            <Pencil className="size-4" />
            编辑
          </Button>
          <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => setAskDelete(true)}>
            <Trash2 className="size-4" />
            删除
          </Button>
        </div>
      </div>

      {/* 业务流转动作 */}
      {visibleActions.length > 0 ? (
        <Card className="border-primary/20 bg-primary/[0.03]">
          <CardContent className="flex flex-wrap items-center gap-2 p-4">
            <span className="mr-1 text-sm font-medium">业务操作：</span>
            {visibleActions.map((action) => (
              <Button
                key={action.key}
                size="sm"
                variant="secondary"
                disabled={busyAction !== null}
                onClick={() => void runAction(action)}
              >
                {busyAction === action.key ? '处理中…' : action.label}
              </Button>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {/* 详情 Tab */}
      <Tabs value={detailTab} onValueChange={setDetailTab}>
        <TabsList>
          <TabsTrigger value="info">基本信息</TabsTrigger>
          {config.detailTabs?.map((tab) => (
            <TabsTrigger key={tab.key} value={tab.key}>{tab.label}</TabsTrigger>
          ))}
          <TabsTrigger value="timeline">操作记录</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="mt-4">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* 主信息卡 */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">基本信息</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
                {detailFields.map((field) => (
                  <div key={field.key} className={cn('min-w-0 space-y-1', field.span === 2 && 'sm:col-span-2')}>
                    <p className="text-xs text-muted-foreground">{field.label}</p>
                    <p className="break-words text-sm font-medium">
                      {renderFieldValue(field, record.values[field.key])}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* 元信息侧卡 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">关联信息</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">所属模块</p>
                  <p className="text-sm font-medium">{config.label}</p>
                </div>
                {statusField ? (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">{statusField.label}</p>
                    <Badge variant="outline" className={cn('text-xs', statusMeta.className)}>
                      {statusMeta.label}
                    </Badge>
                  </div>
                ) : null}
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">创建时间</p>
                  <p className="text-sm font-medium tabular-nums">{record.createdAt || '—'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">最后更新</p>
                  <p className="text-sm font-medium tabular-nums">{record.updatedAt || '—'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">数据表</p>
                  <p className="text-sm font-medium">{config.bitableEnabled ? `多维表格「${config.label}」` : config.tableKey}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">记录 ID</p>
                  <p className="break-all font-mono text-xs text-muted-foreground">{record.recordId}</p>
                </div>
                <div className="border-t border-border/60 pt-4">
                  <Button asChild variant="outline" size="sm" className="w-full">
                    <Link to={config.route}>查看全部{config.noun}</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 跨表关联 Tab */}
        {config.detailTabs?.map((tab) => {
          if (tab.key === 'approval' && moduleKey === 'contract') {
            return (
              <TabsContent key={tab.key} value={tab.key} className="mt-4">
                <ContractApprovalTimeline record={record} fields={detailFields} />
              </TabsContent>
            );
          }
          if (tab.key === 'approval' && ['adOpen', 'purchaseOrder', 'videoOrder', 'support'].includes(moduleKey)) {
            return (
              <TabsContent key={tab.key} value={tab.key} className="mt-4">
                <ApprovalTimeline record={record} flowType={moduleKey === 'support' ? 'support' : moduleKey} />
              </TabsContent>
            );
          }
          if (['items', 'stockIn', 'payment'].includes(tab.key) && moduleKey === 'support') {
            return (
              <TabsContent key={tab.key} value={tab.key} className="mt-4">
                <SupportDetailTabs tabKey={tab.key as 'items' | 'stockIn' | 'payment'} record={record} fields={detailFields} />
              </TabsContent>
            );
          }
          if (['progress', 'deliverables', 'team'].includes(tab.key) && moduleKey === 'video') {
            return (
              <TabsContent key={tab.key} value={tab.key} className="mt-4">
                <VideoDetailTabs tabKey={tab.key as 'progress' | 'deliverables' | 'team'} record={record} />
              </TabsContent>
            );
          }
          return (
            <TabsContent key={tab.key} value={tab.key} className="mt-4">
              <CrossTableTab tab={tab} parentRecord={record} moduleConfig={config} />
            </TabsContent>
          );
        })}

        <TabsContent value="timeline" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">操作记录</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {record.createdAt ? (
                  <div className="flex gap-3">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
                      <span className="text-xs text-muted-foreground">+</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">记录创建</p>
                      <p className="text-xs text-muted-foreground">{record.createdAt}</p>
                    </div>
                  </div>
                ) : null}
                {record.updatedAt && record.updatedAt !== record.createdAt ? (
                  <div className="flex gap-3">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
                      <span className="text-xs text-muted-foreground">~</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">最近更新</p>
                      <p className="text-xs text-muted-foreground">{record.updatedAt}</p>
                    </div>
                  </div>
                ) : null}
                {(!record.createdAt && !record.updatedAt) ? (
                  <p className="text-sm text-muted-foreground">暂无操作记录</p>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 删除确认 */}
      <AlertDialog open={askDelete} onOpenChange={(open) => !open && setAskDelete(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除{config.noun}</AlertDialogTitle>
            <AlertDialogDescription>
              确认删除「{primaryText}」? 删除后将同步从多维表格移除, 且不可恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>取消</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                void runDelete();
              }}
            >
              {deleting ? '删除中…' : '确认删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}