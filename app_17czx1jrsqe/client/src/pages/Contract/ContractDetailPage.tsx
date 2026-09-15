import { useState, useEffect, useMemo, useCallback } from 'react';
import { t } from '@/lib/i18n';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Download, FileText, Loader2, Paperclip, CheckCircle2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import ApprovalTimeline from '@/components/ApprovalTimeline';
import ApprovalDialog from '@/components/ApprovalDialog';
import StatusBadge from '@/components/StatusBadge';
import { contractsApi, paymentPlansApi, paymentRecordsApi } from '@/api';
import { useApp } from '@/context/AppContext';
import { formatAmount, formatDate } from '@/lib/format';
import { useApprovalFlow } from '@/hooks/useApprovalFlow';
import { type Contract } from './ContractPage';

const STATUS_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'secondary'> = {
  待审批: 'warning',
  审批中: 'default',
  已生效: 'success',
  已到期: 'secondary',
  已终止: 'danger',
};

interface ReceiptItem {
  term: string;
  ratio: number;
  amount: number;
  due_date: string;
  status: '已回款' | '待回款' | '未开始';
}

interface FileItem {
  name: string;
  size: string;
  uploader: string;
}

function buildReceipts(contract: Contract): ReceiptItem[] {
  const base = contract.amount;
  const signMonth = contract.sign_date || '';
  const active = contract.status === '已生效';
  return [
    { term: '首付款', ratio: 0.3, amount: Math.round(base * 0.3), due_date: signMonth, status: active ? '已回款' : '未开始' },
    { term: '第二期', ratio: 0.5, amount: Math.round(base * 0.5), due_date: contract.end_date || signMonth, status: active ? '待回款' : '未开始' },
    { term: '尾款', ratio: 0.2, amount: Math.round(base * 0.2), due_date: contract.end_date || signMonth, status: active ? '待回款' : '未开始' },
  ];
}

function buildFiles(contract: Contract): FileItem[] {
  return [
    { name: `${contract.name}-签章版合同文本.pdf`, size: '2.4 MB', uploader: contract.owner || '申请人' },
    { name: `${contract.subject_name}-营业执照副本扫描件.pdf`, size: '1.1 MB', uploader: contract.owner || '申请人' },
    { name: '补充协议-结算条款说明.docx', size: '86 KB', uploader: '陈法务' },
  ];
}

function downloadFile(file: FileItem, contract: Contract) {
  const content = [
    `${file.name}`,
    '',
    `合同编号：${contract.contract_no}`,
    `合同名称：${contract.name}`,
    `主体名称：${contract.subject_name}`,
    '（本文件为系统生成的占位附件，用于演示合同附件下载）',
  ].join('\n');
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${file.name}.txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function ContractDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useApp();

  const [record, setRecord] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [approvalType, setApprovalType] = useState<'approve' | 'reject' | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [approvingStepId, setApprovingStepId] = useState<number | null>(null);
  const [approvingAction, setApprovingAction] = useState<'approve' | 'reject' | null>(null);

  // 付款计划
  const [paymentPlans, setPaymentPlans] = useState<any[]>([]);
  const [paymentRecords, setPaymentRecords] = useState<any[]>([]);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<any>(null);
  const [planForm, setPlanForm] = useState({ term: '', plan_amount: '', plan_date: '', status: '未开始' });
  const [recordForm, setRecordForm] = useState({ amount: '', pay_date: '', pay_method: '银行转账', remark: '' });

  const loadPaymentPlans = useCallback(async () => {
    if (!id) return;
    setPaymentLoading(true);
    try {
      const [plansRes, recordsRes] = await Promise.all([
        paymentPlansApi.list({ contract_id: Number(id) }),
        paymentRecordsApi.list({ contract_id: Number(id) }),
      ]);
      if (plansRes.code === 0) {
        setPaymentPlans((plansRes.data as any)?.list || plansRes.data || []);
      }
      if (recordsRes.code === 0) {
        setPaymentRecords((recordsRes.data as any)?.list || recordsRes.data || []);
      }
    } catch {
      toast.error('加载付款数据失败');
    } finally {
      setPaymentLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (record) loadPaymentPlans();
  }, [record, loadPaymentPlans]);

  const paymentStats = useMemo(() => {
    const total = paymentPlans.reduce((s, p) => s + (Number(p.plan_amount) || 0), 0);
    const paid = paymentPlans.reduce((s, p) => s + (Number(p.paid_amount) || 0), 0);
    const unpaid = Math.max(0, total - paid);
    return { total, paid, unpaid };
  }, [paymentPlans]);

  const handleAddPlan = async () => {
    if (!planForm.term || !planForm.plan_amount) {
      toast.warning('请填写期次和计划金额');
      return;
    }
    try {
      const res = await paymentPlansApi.create({
        contract_id: Number(id),
        term: planForm.term,
        plan_amount: Number(planForm.plan_amount),
        plan_date: planForm.plan_date || null,
        status: planForm.status,
        paid_amount: 0,
      });
      if (res.code === 0) {
        toast.success('已添加付款计划');
        setPlanDialogOpen(false);
        setPlanForm({ term: '', plan_amount: '', plan_date: '', status: '未开始' });
        loadPaymentPlans();
      } else {
        toast.error(res.message || '保存失败');
      }
    } catch {
      toast.error('保存失败');
    }
  };

  const handleRecordPayment = async () => {
    if (!recordForm.amount || !currentPlan) {
      toast.warning('请填写付款金额');
      return;
    }
    try {
      const res = await paymentRecordsApi.create({
        plan_id: currentPlan.id,
        contract_id: Number(id),
        amount: Number(recordForm.amount),
        pay_date: recordForm.pay_date || new Date().toISOString().slice(0, 10),
        pay_method: recordForm.pay_method,
        remark: recordForm.remark,
        status: '已到账',
      });
      if (res.code === 0) {
        toast.success('已登记付款');
        setPaymentDialogOpen(false);
        setCurrentPlan(null);
        setRecordForm({ amount: '', pay_date: '', pay_method: '银行转账', remark: '' });
        loadPaymentPlans();
      } else {
        toast.error(res.message || '登记失败');
      }
    } catch {
      toast.error('登记失败');
    }
  };

  const approval = useApprovalFlow(record ? 'contract' : null, record?.id || null);

  const load = useCallback(async () => {
    const numId = Number(id);
    if (!id || Number.isNaN(numId)) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await contractsApi.list({ page: 1, page_size: 500 });
      const item = (res.data?.list as Contract[] | undefined)?.find((c) => c.id === numId);
      if (res.code === 0 && item) {
        setRecord(item);
        setNotFound(false);
      } else {
        setNotFound(true);
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

  const steps = approval.steps;
  const receipts = useMemo(() => (record ? buildReceipts(record) : []), [record]);
  const files = useMemo(() => (record ? buildFiles(record) : []), [record]);

  // 审批权限：有当前待处理节点就可以审批
  const canApprove = useMemo(() => {
    if (!approval.currentStepId) return false;
    const role = user?.role || '';
    if (role === 'admin') return true;
    if (approval.currentStepId && approval.steps.length > 0) return true;
    return false;
  }, [approval.currentStepId, approval.steps, user]);

  const handleApprovalSubmit = async (comment: string) => {
    if (!approvalType || !approval.currentStepId) return;
    setSubmitting(true);
    try {
      const fn = approvalType === 'approve' ? approval.stepApprove : approval.stepReject;
      const result = await fn(approval.currentStepId, comment);
      if (result.success) {
        toast.success(approvalType === 'approve' ? '审批通过' : '已驳回');
        setApprovalType(null);
      } else {
        toast.error(result.message || '操作失败');
      }
    } catch {
      toast.error('操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubApproverAction = async (stepId: number, action: 'approve' | 'reject', comment: string) => {
    setSubmitting(true);
    try {
      const fn = action === 'approve' ? approval.stepApprove : approval.stepReject;
      const result = await fn(stepId, comment);
      if (result.success) {
        toast.success(action === 'approve' ? '已通过' : '已驳回');
        setApprovingStepId(null);
        setApprovingAction(null);
      } else {
        toast.error(result.message || '操作失败');
      }
    } catch {
      toast.error('操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  const downloadAllFiles = () => {
    if (!record) return;
    files.forEach((f) => downloadFile(f, record));
    toast.success(`已开始下载 ${files.length} 个附件`);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (notFound || !record) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" className="gap-1" onClick={() => navigate('/contract/contracts')}>
          <ArrowLeft className="size-4" /> 返回合同管理
        </Button>
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
            <Loader2 className="size-8 opacity-40" />
            <p className="text-sm">未找到该合同，可能已被删除</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const basicInfo: Array<[string, string]> = [
    ['合同编号', record.contract_no],
    ['合同名称', record.name],
    ['主体名称', record.subject_name],
    ['合同类型', record.type],
    ['合同金额', formatAmount(record.amount)],
    ['签订日期', formatDate(record.sign_date) || '—'],
    ['到期日期', formatDate(record.end_date) || '—'],
    ['负责人', record.owner || '—'],
  ];

  return (
    <div className="space-y-4">
      {/* 顶部信息条 */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="size-8 shrink-0" onClick={() => navigate('/contract/contracts')} title={t('返回合同管理')}>
          <ArrowLeft className="size-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-lg font-semibold">{record.name}</h1>
            <StatusBadge status={record.status} variant={STATUS_VARIANT[record.status] || 'default'} />
            <span className="font-mono text-xs text-muted-foreground">{record.contract_no}</span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {record.subject_name} · {record.type} · 负责人 {record.owner || '—'}
          </p>
        </div>
        {canApprove && (
          <div className="flex shrink-0 gap-2">
            <Button variant="outline" size="sm" onClick={() => setApprovalType('reject')}>驳回</Button>
            <Button size="sm" onClick={() => setApprovalType('approve')}>审批通过</Button>
          </div>
        )}
      </div>

      <Tabs defaultValue="basic">
        <TabsList>
          <TabsTrigger value="basic">基本信息</TabsTrigger>
          <TabsTrigger value="approval">审批流程</TabsTrigger>
          <TabsTrigger value="receipts">费用与付款</TabsTrigger>
          <TabsTrigger value="files">合同附件</TabsTrigger>
        </TabsList>

        {/* 基本信息 */}
        <TabsContent value="basic" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">合同信息</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {basicInfo.map(([label, value]) => (
                  <div key={label} className="rounded-lg bg-muted/40 px-3 py-2.5">
                    <div className="text-xs text-muted-foreground">{label}</div>
                    <div className="mt-1 text-sm font-medium tabular-nums">{value}</div>
                  </div>
                ))}
              </div>
              {record.remark && (
                <div className="mt-4 rounded-lg border border-border/60 px-3 py-2.5">
                  <div className="text-xs text-muted-foreground">备注</div>
                  <div className="mt-1 whitespace-pre-line text-sm">{record.remark}</div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 审批流程 */}
        <TabsContent value="approval" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">审批流程</CardTitle>
                {approval.currentStepId && canApprove && (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setApprovalType('reject')}>
                      驳回
                    </Button>
                    <Button size="sm" onClick={() => setApprovalType('approve')}>
                      审批通过
                    </Button>
                  </div>
                )}
                {!approval.loading && !approval.instance && (
                  <Button size="sm" onClick={async () => {
                    const res = await approval.submit(`${record?.name}审批`);
                    if (res.success) toast.success('已提交审批');
                    else toast.error(res.message || '提交失败');
                  }}>
                    发起审批
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {approval.loading ? (
                <div className="py-8 text-center text-sm text-muted-foreground">加载中...</div>
              ) : !approval.instance ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  暂无审批流程，点击右上角「发起审批」提交
                </div>
              ) : (
                <ApprovalTimeline steps={steps} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 费用与付款 */}
        <TabsContent value="receipts" className="mt-4 space-y-5">
          {/* 顶部统计卡 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-xl border border-border/60 bg-card p-4">
              <div className="text-xs text-muted-foreground">合同金额</div>
              <div className="mt-1.5 text-xl font-semibold tabular-nums text-foreground">
                {formatAmount(record?.amount || 0)}
              </div>
            </div>
            <div className="rounded-xl border border-border/60 bg-card p-4">
              <div className="text-xs text-muted-foreground">计划总额</div>
              <div className="mt-1.5 text-xl font-semibold tabular-nums text-foreground">
                {formatAmount(paymentStats.total)}
              </div>
            </div>
            <div className="rounded-xl border border-emerald-200/60 bg-emerald-50/40 p-4">
              <div className="text-xs text-emerald-600">已回款</div>
              <div className="mt-1.5 text-xl font-semibold tabular-nums text-emerald-600">
                {formatAmount(paymentStats.paid)}
              </div>
            </div>
            <div className="rounded-xl border border-amber-200/60 bg-amber-50/40 p-4">
              <div className="text-xs text-amber-600">待回款</div>
              <div className="mt-1.5 text-xl font-semibold tabular-nums text-amber-600">
                {formatAmount(paymentStats.unpaid)}
              </div>
            </div>
          </div>

          {/* 付款计划 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">付款计划</CardTitle>
                  <p className="text-xs text-muted-foreground">分期付款期次与进度跟踪</p>
                </div>
                <Button size="sm" onClick={() => setPlanDialogOpen(true)}>
                  <Plus className="mr-1 size-3.5" /> 新增期次
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {paymentLoading ? (
                <div className="py-6 text-center text-sm text-muted-foreground">加载中...</div>
              ) : paymentPlans.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">暂无付款计划，点击右上角新增</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/60 bg-muted/30 text-left text-xs font-medium text-muted-foreground">
                        <th className="whitespace-nowrap px-3 py-2">期次</th>
                        <th className="whitespace-nowrap px-3 py-2">计划日期</th>
                        <th className="whitespace-nowrap px-3 py-2 text-right">计划金额</th>
                        <th className="whitespace-nowrap px-3 py-2 text-right">已付金额</th>
                        <th className="whitespace-nowrap px-3 py-2 text-center">状态</th>
                        <th className="whitespace-nowrap px-3 py-2 text-right">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paymentPlans.map((p) => {
                        const remaining = Math.max(0, Number(p.plan_amount) - Number(p.paid_amount || 0));
                        const statusLabel = remaining === 0 ? '已付清' : Number(p.paid_amount || 0) > 0 ? '部分支付' : (p.status || '未开始');
                        const statusVariant = remaining === 0 ? 'success' : Number(p.paid_amount || 0) > 0 ? 'warning' : 'secondary';
                        return (
                          <tr key={p.id} className="border-b border-border/40 hover:bg-muted/20">
                            <td className="px-3 py-2.5 font-medium">{p.term}</td>
                            <td className="px-3 py-2.5 text-muted-foreground">{p.plan_date || '—'}</td>
                            <td className="px-3 py-2.5 text-right tabular-nums">{formatAmount(p.plan_amount)}</td>
                            <td className="px-3 py-2.5 text-right tabular-nums text-emerald-600 font-medium">{formatAmount(p.paid_amount || 0)}</td>
                            <td className="px-3 py-2.5 text-center">
                              <StatusBadge status={statusLabel} variant={statusVariant} />
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setCurrentPlan(p);
                                  setRecordForm({
                                    amount: String(remaining),
                                    pay_date: new Date().toISOString().slice(0, 10),
                                    pay_method: '银行转账',
                                    remark: '',
                                  });
                                  setPaymentDialogOpen(true);
                                }}
                              >
                                登记付款
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 付款记录时间线 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">付款记录</CardTitle>
            </CardHeader>
            <CardContent>
              {paymentRecords.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">暂无付款记录</div>
              ) : (
                <div className="relative pl-6">
                  <div className="absolute left-2 top-1 bottom-1 w-px bg-border" />
                  {paymentRecords.map((r: any) => (
                    <div key={r.id} className="relative mb-4 last:mb-0">
                      <div className="absolute -left-[22px] top-1.5 size-3 rounded-full bg-emerald-500 ring-2 ring-emerald-100" />
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="text-sm font-medium">{r.term || '付款'}</div>
                          <div className="mt-0.5 text-xs text-muted-foreground">
                            {r.pay_date} · {r.pay_method} · 金额 <span className="font-medium tabular-nums text-emerald-600">{formatAmount(r.amount)}</span>
                          </div>
                          {r.remark && <div className="mt-1 text-xs text-muted-foreground/80">备注：{r.remark}</div>}
                        </div>
                        <StatusBadge status="已到账" variant="success" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 合同附件 */}
        <TabsContent value="files" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">合同附件</CardTitle>
                <Button variant="outline" size="sm" className="gap-1" onClick={downloadAllFiles}>
                  <Download className="size-3.5" /> 全部下载
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {files.map((f) => (
                <div key={f.name} className="flex items-center justify-between rounded-lg border border-border/60 px-4 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
                      <FileText className="size-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 truncate text-sm font-medium">
                        <Paperclip className="size-3 shrink-0 text-muted-foreground" />
                        {f.name}
                      </div>
                      <div className="text-xs text-muted-foreground">{f.size} · 上传人：{f.uploader}</div>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="gap-1" onClick={() => { downloadFile(f, record); toast.success('已开始下载'); }}>
                    <Download className="size-3.5" /> 下载
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ApprovalDialog
        open={approvalType !== null}
        onOpenChange={(open) => !open && setApprovalType(null)}
        type={approvalType ?? 'approve'}
        title={approvalType === 'reject' ? '驳回合同审批' : '通过合同审批'}
        description={`合同「${record?.name || ''}」`}
        loading={submitting}
        onSubmit={handleApprovalSubmit}
      />

      {/* 新增回款计划弹窗 */}
      <Dialog open={planDialogOpen} onOpenChange={setPlanDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>新增回款计划</DialogTitle>
            <DialogDescription>设置分期付款期次、金额和计划日期</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label><span className="text-destructive">*</span> 期次名称</Label>
                <Input
                  value={planForm.term}
                  onChange={(e) => setPlanForm({ ...planForm, term: e.target.value })}
                  placeholder="如 首付款 / 第二期 / 尾款"
                />
              </div>
              <div className="space-y-1.5">
                <Label><span className="text-destructive">*</span> 计划金额</Label>
                <Input
                  type="number"
                  value={planForm.plan_amount}
                  onChange={(e) => setPlanForm({ ...planForm, plan_amount: e.target.value })}
                  placeholder="元"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>计划日期</Label>
                <Input
                  type="date"
                  value={planForm.plan_date}
                  onChange={(e) => setPlanForm({ ...planForm, plan_date: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>状态</Label>
                <Select
                  value={planForm.status}
                  onValueChange={(v) => setPlanForm({ ...planForm, status: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="未开始">未开始</SelectItem>
                    <SelectItem value="待回款">待回款</SelectItem>
                    <SelectItem value="部分支付">部分支付</SelectItem>
                    <SelectItem value="已付清">已付清</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPlanDialogOpen(false)}>取消</Button>
            <Button onClick={handleAddPlan}>确认添加</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 登记付款弹窗 */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>登记付款</DialogTitle>
            <DialogDescription>
              {currentPlan ? `期次：${currentPlan.term} · 剩余 ${formatAmount(Math.max(0, Number(currentPlan.plan_amount) - Number(currentPlan.paid_amount || 0)))} 元` : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label><span className="text-destructive">*</span> 付款金额</Label>
                <Input
                  type="number"
                  value={recordForm.amount}
                  onChange={(e) => setRecordForm({ ...recordForm, amount: e.target.value })}
                  placeholder="元"
                />
              </div>
              <div className="space-y-1.5">
                <Label>付款日期</Label>
                <Input
                  type="date"
                  value={recordForm.pay_date}
                  onChange={(e) => setRecordForm({ ...recordForm, pay_date: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>付款方式</Label>
              <Select
                value={recordForm.pay_method}
                onValueChange={(v) => setRecordForm({ ...recordForm, pay_method: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="银行转账">银行转账</SelectItem>
                  <SelectItem value="电汇">电汇</SelectItem>
                  <SelectItem value="承兑汇票">承兑汇票</SelectItem>
                  <SelectItem value="现金">现金</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>备注</Label>
              <Textarea
                value={recordForm.remark}
                onChange={(e) => setRecordForm({ ...recordForm, remark: e.target.value })}
                placeholder="可选"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>取消</Button>
            <Button onClick={handleRecordPayment}>确认登记</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
