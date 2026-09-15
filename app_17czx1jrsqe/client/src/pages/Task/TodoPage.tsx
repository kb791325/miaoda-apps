import { useState, useMemo, useEffect } from 'react';
import { t } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, CheckCircle, FileText, AlertCircle, Loader2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import PageHeader from '@/components/PageHeader';
import ApprovalDetailDialog, { type ApprovalSummaryField } from '@/components/ApprovalDetailDialog';
import type { ApprovalStep } from '@/components/ApprovalTimeline';
import { approvalsApi } from '@/api';
import { useApp } from '@/context/AppContext';
import { formatAmount, formatDateTime } from '@/lib/format';
import { extractErrorMessage, validateRecordId } from '@/lib/error-utils';
import type { TodoItem } from '@/api/types';

const TYPE_LABELS: Record<string, string> = {
  account_open: '开户审批',
  filing: '报备审批',
  transfer: '转户审批',
  refund: '退款审批',
  expense: '支出审批',
  purchase_requisition: '采购审批',
  purchase: '采购审批',
  contract: '合同审批',
};

const TYPE_COLORS: Record<string, string> = {
  account_open: 'bg-[#1677FF]/10 text-[#1677FF] border-[#1677FF]/20',
  filing: 'bg-[#722ED1]/10 text-[#722ED1] border-[#722ED1]/20',
  transfer: 'bg-[#0D9488]/10 text-[#0D9488] border-[#0D9488]/20',
  refund: 'bg-[#F5222D]/10 text-[#F5222D] border-[#F5222D]/20',
  expense: 'bg-[#FA8C16]/10 text-[#FA8C16] border-[#FA8C16]/20',
  purchase_requisition: 'bg-[#0891B2]/10 text-[#0891B2] border-[#0891B2]/20',
  purchase: 'bg-[#0891B2]/10 text-[#0891B2] border-[#0891B2]/20',
  contract: 'bg-[#8B5CF6]/10 text-[#8B5CF6] border-[#8B5CF6]/20',
};

type TabKey = 'pending' | 'done' | 'initiated';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'pending', label: '待办' },
  { key: 'done', label: '已办' },
  { key: 'initiated', label: '我发起的' },
];

export default function TodoPage() {
  const { user } = useApp();
  const [tab, setTab] = useState<TabKey>('pending');
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedTodo, setSelectedTodo] = useState<TodoItem | null>(null);

  const loadTodos = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const res = await approvalsApi.todo({ status: tab });
      if (res.code === 0) {
        setTodos(res.data.list || []);
      } else {
        setError(res.message || '加载失败');
        toast.error(res.message || '加载失败');
      }
    } catch (e: any) {
      const msg = e?.message || '网络异常，请稍后重试';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTodos();
  }, [tab, user]);

  // 三个 Tab 的真实数量统计（独立于当前列表）
  const [counts, setCounts] = useState({ pending: 0, done: 0, initiated: 0, overdue: 0 });
  const loadCounts = async () => {
    if (!user) return;
    try {
      const [p, d, i] = await Promise.all([
        approvalsApi.todo({ status: 'pending' }),
        approvalsApi.todo({ status: 'done' }),
        approvalsApi.todo({ status: 'initiated' }),
      ]);
      const pendingList = p.code === 0 ? (p.data.list || []) : [];
      // 申请超过 7 天仍未处理视为逾期
      const overdueThreshold = Date.now() - 7 * 86400000;
      const overdue = pendingList.filter(
        (t: TodoItem) => new Date(t.instance_created_at).getTime() < overdueThreshold,
      ).length;
      setCounts({
        pending: pendingList.length,
        done: d.code === 0 ? (d.data.list || []).length : 0,
        initiated: i.code === 0 ? (i.data.list || []).length : 0,
        overdue,
      });
    } catch {
      // 统计失败静默处理，不影响主列表
    }
  };
  useEffect(() => {
    loadCounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const typeLabel = (type: string) => TYPE_LABELS[type] || type;
  const typeColor = (type: string) => TYPE_COLORS[type] || 'bg-muted text-muted-foreground border-border';

  // 统计：当前 Tab 用列表长度（保证与下方列表一致），其余用真实计数
  const stats = useMemo(() => {
    if (tab === 'pending') return { ...counts, pending: todos.length };
    if (tab === 'done') return { ...counts, done: todos.length };
    if (tab === 'initiated') return { ...counts, initiated: todos.length };
    return counts;
  }, [todos, tab, counts]);

  const renderStatusBadge = (status: string) => {
    if (status === 'pending' || status === 'current') {
      return <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200">待处理</Badge>;
    }
    if (status === 'approved') {
      return <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200">已通过</Badge>;
    }
    if (status === 'rejected') {
      return <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">已驳回</Badge>;
    }
    return <Badge variant="outline">{status}</Badge>;
  };

  const renderMyActionBadge = (action?: string | null) => {
    if (action === 'approved') {
      return <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200">已通过</Badge>;
    }
    if (action === 'rejected') {
      return <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">已驳回</Badge>;
    }
    return null;
  };

  const handleApprove = async (type: 'approve' | 'reject', comment: string) => {
    if (!selectedTodo) return;
    const recordId = validateRecordId({ id: selectedTodo.id });
    if (!recordId) { toast.warning('记录标识缺失，请刷新后重试'); return; }
    setSubmitting(true);
    try {
      const res = type === 'approve'
        ? await approvalsApi.approve(selectedTodo.id, comment || '')
        : await approvalsApi.reject(selectedTodo.id, comment || '');
      if (res.code === 0) {
        toast.success(type === 'approve' ? '审批通过' : '已驳回');
        setSelectedTodo(null);
        loadTodos();
        loadCounts();
      } else {
        toast.error(res.message || '操作失败');
      }
    } catch (e) {
      toast.error(extractErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  const canApprove = tab === 'pending' && selectedTodo?.status === 'pending';

  // 生成详情摘要字段
  const summaryFields = useMemo<ApprovalSummaryField[]>(() => {
    if (!selectedTodo) return [];
    return [
      { label: '业务类型', value: typeLabel(selectedTodo.business_type) },
      { label: '单据编号', value: `#${selectedTodo.business_id}` },
      { label: '申请人', value: selectedTodo.applicant_name },
      { label: '申请时间', value: formatDateTime(selectedTodo.instance_created_at) },
      { label: '当前节点', value: selectedTodo.step_name || '-' },
      ...(selectedTodo.amount != null ? [
        { label: '金额', value: <span className="font-semibold text-primary tabular-nums">{formatAmount(selectedTodo.amount)}</span> },
      ] : []),
    ];
  }, [selectedTodo]);

  const approvalSteps: ApprovalStep[] = useMemo(() => {
    if (!selectedTodo?.approval_steps) return [];
    return selectedTodo.approval_steps.map((s: any, i: number) => ({
      id: s.id ?? i,
      step_name: s.step_name,
      approver_name: s.approver_name,
      status: s.status,
      comment: s.comment,
      approved_at: s.approved_at,
      is_submit: s.is_submit,
      mode: s.mode,
      sub_approvers: s.sub_approvers,
      condition_text: s.condition_text,
    }));
  }, [selectedTodo]);

  // 当前审批节点名（用于按钮提示）
  const currentStepName = useMemo(() => {
    if (!approvalSteps.length) return '';
    const current = approvalSteps.find(s => s.status === 'current');
    return current?.step_name || '';
  }, [approvalSteps]);

  // 状态 variant 映射
  const statusVariant = useMemo(() => {
    if (!selectedTodo) return 'default' as const;
    const s = selectedTodo.status;
    if (s === 'approved') return 'success' as const;
    if (s === 'rejected') return 'destructive' as const;
    if (s === 'pending' || s === 'current') return 'warning' as const;
    return 'secondary' as const;
  }, [selectedTodo]);

  const statusLabel = useMemo(() => {
    if (!selectedTodo) return '';
    return selectedTodo.instance_status || selectedTodo.status;
  }, [selectedTodo]);

  const renderItemDetail = (t: TodoItem) => {
    if (tab === 'done') {
      return (
        <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
          <span>我的处理：</span>
          {renderMyActionBadge(t.my_action)}
          {t.my_comment && <span className="truncate">意见：{t.my_comment}</span>}
          {t.my_operated_at && <span>{formatDateTime(t.my_operated_at)}</span>}
        </div>
      );
    }
    if (tab === 'initiated') {
      return (
        <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
          <span>当前节点：{t.step_name}</span>
          {t.status === 'pending' && <span className="flex items-center gap-1"><Clock className="size-3" />处理中</span>}
          {t.amount != null && <span>金额：{formatAmount(t.amount)}</span>}
        </div>
      );
    }
    return (
      <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
        <span>申请人：{t.applicant_name}</span>
        <span>{formatDateTime(t.instance_created_at)}</span>
        {t.amount != null && <span>金额：{formatAmount(t.amount)}</span>}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('我的待办')}
        description="查看和处理需要您审批的事项"
      />

      {/* 统计卡 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="pt-5">
            <div className="text-xs text-muted-foreground">待处理</div>
            <div className="mt-1 text-2xl font-bold tabular-nums">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="pt-5">
            <div className="text-xs text-muted-foreground">已处理</div>
            <div className="mt-1 text-2xl font-bold tabular-nums">{stats.done}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-primary">
          <CardContent className="pt-5">
            <div className="text-xs text-muted-foreground">我发起的</div>
            <div className="mt-1 text-2xl font-bold tabular-nums">{stats.initiated}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="pt-5">
            <div className="text-xs text-muted-foreground">已逾期</div>
            <div className="mt-1 text-2xl font-bold tabular-nums">{stats.overdue}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs + 列表 */}
      <Card>
        <CardHeader className="pb-3">
          <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
            <TabsList>
              {TABS.map(t => (
                <TabsTrigger key={t.key} value={t.key} className="min-w-[100px]">
                  {t.label}
                  {t.key === 'pending' && stats.pending > 0 && (
                    <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-medium text-primary-foreground min-w-[18px] h-[18px]">
                      {stats.pending}
                    </span>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </CardHeader>

        <CardContent className="pt-0">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="mr-2 size-4 animate-spin" />
              加载中...
            </div>
          ) : error ? (
            <div className="flex flex-col items-center py-16 text-center">
              <div className="flex size-16 items-center justify-center rounded-full bg-red-50">
                <AlertCircle className="size-8 text-red-400" />
              </div>
              <div className="mt-3 text-sm font-medium text-red-600">加载失败</div>
              <div className="mt-1 text-xs text-muted-foreground">{error}</div>
              <Button variant="outline" size="sm" className="mt-4" onClick={loadTodos}>
                重试
              </Button>
            </div>
          ) : todos.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center">
              <div className="flex size-16 items-center justify-center rounded-full bg-muted">
                <FileText className="size-8 text-muted-foreground/50" />
              </div>
              <div className="mt-3 text-sm font-medium">暂无{
                tab === 'pending' ? '待办' : tab === 'done' ? '已办' : '我发起的'
              }事项</div>
              <div className="mt-1 text-xs text-muted-foreground">所有审批事项都处理完了，很棒！</div>
            </div>
          ) : (
            <div className="space-y-3">
              {todos.map((t) => (
                <div
                  key={t.id}
                  className="flex items-start gap-4 rounded-lg border p-4 transition-colors hover:border-primary/30 hover:bg-muted/20 cursor-pointer"
                  onClick={() => setSelectedTodo(t)}
                >
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted">
                    <FileText className="size-5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium border ${typeColor(t.business_type)}`}>
                        {typeLabel(t.business_type)}
                      </span>
                      {renderStatusBadge(t.status)}
                    </div>
                    <div className="mt-1.5 font-medium truncate">{t.title}</div>
                    {renderItemDetail(t)}
                  </div>
                  <div className="shrink-0 text-right">
                    {t.amount != null && (
                      <div className="text-sm font-semibold tabular-nums text-primary">
                        {formatAmount(t.amount)}
                      </div>
                    )}
                    <div className="mt-1 text-xs text-muted-foreground">
                      #{t.business_id}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ApprovalDetailDialog
        open={!!selectedTodo}
        onOpenChange={(o) => !o && setSelectedTodo(null)}
        title={selectedTodo?.title || ''}
        subtitle={`单据编号 #${selectedTodo?.business_id || ''}`}
        status={statusLabel}
        statusVariant={statusVariant}
        summaryFields={summaryFields}
        detailLabel="单据信息"
        detailContent={
          <div className="rounded-lg border border-dashed border-border/70 bg-muted/20 p-4 text-sm text-muted-foreground text-center">
            <FileText className="mx-auto mb-2 size-6 opacity-50" />
            <p>业务单据详情摘要</p>
            <p className="mt-1 text-xs">点击列表页对应单据可查看完整信息</p>
          </div>
        }
        approvalSteps={approvalSteps}
        canApprove={canApprove}
        approving={submitting}
        onApprove={handleApprove}
        currentStepName={currentStepName}
      />
    </div>
  );
}
