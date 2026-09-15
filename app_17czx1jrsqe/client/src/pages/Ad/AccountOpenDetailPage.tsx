import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, FileText, Loader2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import ApprovalTimeline, { type ApprovalStep } from '@/components/ApprovalTimeline';
import ApprovalDialog from '@/components/ApprovalDialog';
import StatusBadge from '@/components/StatusBadge';
import { accountApplicationsApi, approvalsApi } from '@/api';
import { useApp } from '@/context/AppContext';
import { formatAmount, formatDateTime } from '@/lib/format';
import { t, useLang } from '@/lib/i18n';
import { STATUS_MAP, STATUS_VARIANT, genApprovalSteps } from './accountOpenMeta';
import type { AccountApplication } from '@/api/types';

// 后端审批链状态为中文，映射为 ApprovalTimeline 组件枚举
const SERVER_STATUS_MAP: Record<string, ApprovalStep['status']> = {
  待审批: 'pending',
  审批中: 'current',
  已通过: 'approved',
  已驳回: 'rejected',
};

function normalizeSteps(raw: any[]): ApprovalStep[] {
  return raw.map((s) => ({
    ...s,
    status: SERVER_STATUS_MAP[s.status] || s.status,
    sub_approvers: Array.isArray(s.sub_approvers)
      ? s.sub_approvers.map((a: any) => ({ ...a, status: SERVER_STATUS_MAP[a.status] || a.status }))
      : undefined,
  }));
}

export default function AccountOpenDetailPage() {
  useLang();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useApp();

  const [record, setRecord] = useState<AccountApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [serverSteps, setServerSteps] = useState<ApprovalStep[] | null>(null);
  const [activeTab, setActiveTab] = useState('basic');
  const [approvalType, setApprovalType] = useState<'approve' | 'reject' | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    const numId = Number(id);
    if (!id || Number.isNaN(numId)) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [detailRes, stepsRes] = await Promise.all([
        accountApplicationsApi.get(numId),
        accountApplicationsApi.getApprovalSteps(numId).catch(() => null),
      ]);
      if (detailRes.code === 0 && detailRes.data) {
        setRecord(detailRes.data);
        setNotFound(false);
      } else {
        setNotFound(true);
      }
      const steps = (stepsRes as any)?.data;
      if (Array.isArray(steps) && steps.length > 0) {
        setServerSteps(steps as ApprovalStep[]);
      }
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const steps = useMemo<ApprovalStep[]>(() => {
    if (serverSteps) return normalizeSteps(serverSteps);
    return record ? genApprovalSteps(record) : [];
  }, [serverSteps, record]);

  const isManager = user?.role === 'admin' || user?.role === 'manager';
  const canApprove =
    isManager &&
    !!record &&
    (record.status === 'pending_approval' || record.status === 'approving' || record.status === 'approving2');

  const handleApproval = async (comment: string) => {
    if (!record || !approvalType) return;
    setSubmitting(true);
    try {
      const res =
        approvalType === 'approve'
          ? await approvalsApi.approve(record.id, comment)
          : await approvalsApi.reject(record.id, comment);
      if (res.code === 0) {
        toast.success(approvalType === 'approve' ? t('审批通过') : t('已驳回'));
        setApprovalType(null);
        setServerSteps(null);
        await load();
      } else {
        toast.error(res.message || t('操作失败'));
      }
    } catch {
      toast.error(t('操作失败'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (notFound || !record) {
    return (
      <Card className="shadow-sm">
        <CardContent className="flex flex-col items-center gap-3 py-20 text-muted-foreground">
          <FileText className="size-10 opacity-40" />
          <div className="text-sm">{t('未找到该开户申请，可能已被删除')}</div>
          <Button variant="outline" size="sm" onClick={() => navigate('/advertising/account-open')}>
            <ArrowLeft className="size-3.5" /> {t('返回开户管理')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* 顶部信息条 */}
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => navigate('/advertising/account-open')}>
          <ArrowLeft className="size-4" /> {t('返回')}
        </Button>
        <div className="h-4 w-px bg-border" />
        <div className="flex items-center gap-2">
          <span className="text-base font-semibold">{record.group_name}</span>
          <span className="text-sm text-muted-foreground">/ {record.entity_name}</span>
        </div>
        <StatusBadge
          status={STATUS_MAP[record.status] || record.status}
          variant={STATUS_VARIANT[record.status] || 'default'}
        />
        <span className="text-xs text-muted-foreground tabular-nums">{record.apply_no}</span>
        {canApprove && (
          <div className="ml-auto flex items-center gap-2">
            <Button size="sm" variant="outline" className="text-destructive" onClick={() => setApprovalType('reject')}>
              <XCircle className="size-3.5" /> {t('驳回')}
            </Button>
            <Button size="sm" onClick={() => setApprovalType('approve')}>
              <CheckCircle2 className="size-3.5" /> {t('审批通过')}
            </Button>
          </div>
        )}
        {!canApprove && (record.status === 'approved' || record.status === 'rejected' || record.status === 'opened') && (
          <Button size="sm" variant="outline" className="ml-auto" onClick={() => setActiveTab('approval')}>
            {t('查看审批记录')}
          </Button>
        )}
      </div>

      {/* 标签页 */}
      <Card className="shadow-sm">
        <CardContent className="pt-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList>
              <TabsTrigger value="basic">{t('申请信息')}</TabsTrigger>
              <TabsTrigger value="approval">{t('审批记录')}</TabsTrigger>
              <TabsTrigger value="account">{t('账户信息')}</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm md:grid-cols-4">
                <div>
                  <div className="text-xs text-muted-foreground">{t('集团名称')}</div>
                  <div className="mt-0.5 font-medium">{record.group_name}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">{t('主体名称')}</div>
                  <div className="mt-0.5 font-medium">{record.entity_name}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">{t('端口')}</div>
                  <div className="mt-0.5">{record.port}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">{t('行业')}</div>
                  <div className="mt-0.5">{record.industry}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">{t('申请金额')}</div>
                  <div className="mt-0.5 font-semibold tabular-nums text-primary">{formatAmount(record.apply_amount)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">{t('申请人')}</div>
                  <div className="mt-0.5">{(record as any).applicant_name || '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">{t('申请部门')}</div>
                  <div className="mt-0.5">{record.applicant_department || '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">{t('申请时间')}</div>
                  <div className="mt-0.5 tabular-nums">{formatDateTime(record.created_at)}</div>
                </div>
              </div>
              {record.remark && (
                <div className="rounded-md bg-muted/30 p-3 text-sm">
                  <div className="text-xs text-muted-foreground">{t('备注')}</div>
                  <div className="mt-1">{record.remark}</div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="approval" className="pt-4">
              <ApprovalTimeline steps={steps} />
            </TabsContent>

            <TabsContent value="account" className="pt-4">
              {record.status === 'opened' ? (
                <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm md:grid-cols-3">
                  <div>
                    <div className="text-xs text-muted-foreground">{t('广告账户号')}</div>
                    <div className="mt-0.5 font-medium tabular-nums">ADV{String(record.id).padStart(9, '0')}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">{t('投放平台')}</div>
                    <div className="mt-0.5">{record.port}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">{t('账户状态')}</div>
                    <div className="mt-0.5"><StatusBadge status={t('已开户')} variant="success" /></div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">{t('开户日期')}</div>
                    <div className="mt-0.5 tabular-nums">{formatDateTime(record.approved_at || record.created_at).slice(0, 10)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">{t('授信额度')}</div>
                    <div className="mt-0.5 font-semibold tabular-nums">{formatAmount(record.apply_amount)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">{t('当前余额')}</div>
                    <div className="mt-0.5 font-semibold tabular-nums">{formatAmount(record.apply_amount * 0.82)}</div>
                  </div>
                </div>
              ) : (
                <div className="rounded-md bg-muted/30 p-6 text-center text-sm text-muted-foreground">
                  {record.status === 'rejected' ? t('申请已驳回，账户未开通') : t('审批通过后自动创建广告账户，当前尚未开通')}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <ApprovalDialog
        open={approvalType !== null}
        onOpenChange={(o) => !o && setApprovalType(null)}
        type={approvalType === 'reject' ? 'reject' : 'approve'}
        title={approvalType === 'reject' ? t('驳回开户申请') : t('通过开户申请')}
        description={`${record.apply_no} · ${record.group_name}`}
        loading={submitting}
        onSubmit={handleApproval}
      />
    </div>
  );
}
