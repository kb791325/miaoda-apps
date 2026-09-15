import { useState, useMemo } from 'react';
import { useActionLock } from '@/hooks/useActionLock';
import { extractErrorMessage, validateRecordId } from '@/lib/error-utils';
import { t } from '@/lib/i18n';
import ServerListPage, { type FilterField, type ActionButton, type Column } from '@/components/ServerListPage';
import StatusBadge from '@/components/StatusBadge';
import ApprovalTimeline, { type ApprovalStep } from '@/components/ApprovalTimeline';
import ApprovalDetailDialog, { type ApprovalSummaryField } from '@/components/ApprovalDetailDialog';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatAmount, formatDateTime, formatDate } from '@/lib/format';
import { exportRowsToCsv } from '@/lib/export';
import { advancesApi, approvalsApi } from '@/api';
import { useServerList } from '@/hooks/useServerList';
import { useApp } from '@/context/AppContext';
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
import type { Advance } from '@/api/types';
import FieldFormDialog, { type FormFieldDef } from '@/components/FieldFormDialog';

const STATUS_OPTS = [
  { label: '待审批', value: 'pending_approval' },
  { label: '审批中', value: 'approving' },
  { label: '未回款', value: 'unreturned' },
  { label: '部分回款', value: 'partial' },
  { label: '已回款', value: 'returned' },
  { label: '已驳回', value: 'rejected' },
];

const STATUS_MAP: Record<string, string> = {
  pending_approval: '待审批',
  approving: '审批中',
  unreturned: '未回款',
  partial: '部分回款',
  returned: '已回款',
  rejected: '已驳回',
};

const STATUS_VARIANT: Record<string, 'default' | 'info' | 'success' | 'warning' | 'danger'> = {
  pending_approval: 'warning',
  approving: 'info',
  unreturned: 'warning',
  partial: 'info',
  returned: 'success',
  rejected: 'danger',
};

// 服务端审批步骤中文状态 → 时间线组件枚举
const SERVER_STEP_STATUS: Record<string, ApprovalStep['status']> = {
  待审批: 'pending',
  审批中: 'current',
  已通过: 'approved',
  已驳回: 'rejected',
};

const FILTERS: FilterField[] = [
  { key: 'customer_name', label: '客户名称', type: 'input', placeholder: '客户名称' },
  { key: 'status', label: '垫款状态', type: 'select', options: STATUS_OPTS },
];

export default function AdvancePage() {
  const { user } = useApp();
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [returnRecord, setReturnRecord] = useState<Advance | null>(null);

  // 审批弹窗状态
  const [approveRecord, setApproveRecord] = useState<Advance | null>(null);
  const [approvalSteps, setApprovalSteps] = useState<ApprovalStep[]>([]);
  const [approvalLoading, setApprovalLoading] = useState(false);
  const [approvalSubmitting, setApprovalSubmitting] = useState(false);

  const { withLock: withDeleteLock, locked: deleteLocked } = useActionLock();

  const isApprover = user?.role === 'admin' || user?.role === 'manager' || user?.role === 'finance';

  const table = useServerList({
    fetchFn: advancesApi.list,
    defaultPageSize: 20,
  });

  const columns: Column<Advance>[] = useMemo(() => [
    { key: 'advance_no', title: '垫款编号', dataIndex: 'advance_no' as const, width: '150px', sortable: true },
    { key: 'customer_name', title: '客户名称', dataIndex: 'customer_name' as const, width: '220px' },
    {
      key: 'advance_amount',
      title: '垫款金额',
      width: '130px',
      align: 'right',
      sortable: true,
      render: (r) => <span className="tabular-nums font-semibold">{formatAmount(r.advance_amount)}</span>,
    },
    {
      key: 'returned_amount',
      title: '已回款金额',
      width: '130px',
      align: 'right',
      render: (r) => <span className="tabular-nums text-emerald-600">{formatAmount(r.returned_amount)}</span>,
    },
    { key: 'advance_reason', title: '垫款原因', dataIndex: 'advance_reason' as const, width: '180px' },
    {
      key: 'advance_date',
      title: '垫款日期',
      dataIndex: 'advance_date' as const,
      width: '120px',
      render: (r) => r.advance_date?.slice(0, 10) || '-',
    },
    {
      key: 'expected_return_date',
      title: '预计回款日期',
      dataIndex: 'expected_return_date' as const,
      width: '130px',
      render: (r) => r.expected_return_date?.slice(0, 10) || '-',
    },
    {
      key: 'status',
      title: '状态',
      width: '100px',
      render: (r) => (
        <StatusBadge status={STATUS_MAP[r.status] || r.status} variant={STATUS_VARIANT[r.status] || 'default'} />
      ),
    },
    {
      key: 'created_at',
      title: '创建时间',
      dataIndex: 'created_at' as const,
      width: '160px',
      sortable: true,
      render: (r) => formatDateTime(r.created_at),
    },
  ], []);

  const handleDelete = async () => {
    await withDeleteLock(async () => {
      if (!deleteId) return;
      const id = validateRecordId({ id: deleteId });
      if (!id) { toast.warning('记录标识缺失，请刷新后重试'); setDeleteId(null); return; }
      try {
        const res = await advancesApi.remove(id);
        if (res.code === 0) {
          toast.success('删除成功');
          setDeleteId(null);
          table.refresh();
        } else {
          toast.error(res.message || '删除失败');
        }
      } catch (e) {
        toast.error(extractErrorMessage(e));
      }
    });
  };

  const ADVANCE_FORM_FIELDS: FormFieldDef[] = [
    { key: 'customer_name', label: '客户名称', required: true, placeholder: '请输入客户名称' },
    { key: 'advance_amount', label: '垫款金额（元）', type: 'number', required: true, placeholder: '请输入垫款金额' },
    {
      key: 'advance_reason', label: '垫款原因', type: 'select', required: true,
      options: [
        { label: '账期资金缺口', value: '账期资金缺口' },
        { label: '大促期间垫资', value: '大促期间垫资' },
        { label: '新客授信支持', value: '新客授信支持' },
        { label: '其他', value: '其他' },
      ],
    },
    { key: 'advance_date', label: '垫款日期', required: true, placeholder: '如 2026-08-29' },
    { key: 'expected_return_date', label: '预计回款日期', required: true, placeholder: '如 2026-09-30' },
  ];

  const RETURN_FORM_FIELDS: FormFieldDef[] = [
    {
      key: 'returned_amount', label: '本次回款金额（元）', type: 'number', required: true,
      placeholder: `未回款金额 ${formatAmount((returnRecord ? returnRecord.advance_amount - returnRecord.returned_amount : 0), '')}`,
    },
  ];

  const handleCreateAdvance = async (values: Record<string, unknown>) => {
    try {
      const advanceNo = `DK${Date.now().toString().slice(-8)}`;
      const res = await advancesApi.create({
        ...values,
        advance_no: advanceNo,
        advance_amount: Number(values.advance_amount) || 0,
        status: 'pending_approval',
        returned_amount: 0,
      });
      if (res.code === 0) {
        const newId = res.data?.id;
        if (newId) {
          // 创建后自动提交审批实例，审批通过后进入未回款状态
          await approvalsApi.submit({
            businessType: 'advance',
            businessId: Number(newId),
            title: `垫款审批 - ${String(values.customer_name || '')}`,
          }).catch(() => undefined);
        }
        toast.success('垫款登记成功，已提交审批');
        table.refresh();
        return true;
      }
      toast.error(res.message || '登记失败');
      return false;
    } catch (e) {
      toast.error(extractErrorMessage(e));
      return false;
    }
  };

  const openApproval = async (record: Advance) => {
    setApproveRecord(record);
    setApprovalSteps([]);
    setApprovalLoading(true);
    try {
      const res = await approvalsApi.getByBusiness('advance', record.id);
      const raw = res.data as { instance?: any; steps?: any[] } | null;
      const rawSteps = Array.isArray(raw?.steps) ? raw.steps : [];
      const normalized: ApprovalStep[] = rawSteps.map((s: any, idx: number) => ({
        id: s.id ?? idx,
        step_name: s.step_name,
        approver_name: s.approver_name,
        status: SERVER_STEP_STATUS[s.status] || 'pending',
        approved_at: s.approved_at || undefined,
        comment: s.comment || undefined,
      }));
      // 实例仍在流转时，第一个待处理步骤标记为当前步骤
      if (raw?.instance && (raw.instance.status === '待审批' || raw.instance.status === '审批中')) {
        const firstPending = normalized.find((s) => s.status === 'pending');
        if (firstPending) firstPending.status = 'current';
      }
      setApprovalSteps(normalized);
    } catch {
      setApprovalSteps([]);
    } finally {
      setApprovalLoading(false);
    }
  };

  const handleApproval = async (type: 'approve' | 'reject', comment: string) => {
    if (!approveRecord) return;
    const id = validateRecordId(approveRecord);
    if (!id) { toast.warning('记录标识缺失，请刷新后重试'); return; }
    setApprovalSubmitting(true);
    try {
      const res = await approvalsApi.getByBusiness('advance', id);
      const instanceId = (res.data as any)?.instance?.id;
      if (!instanceId) {
        toast.error('未找到该垫款的审批实例');
        return;
      }
      const actionRes = type === 'approve'
        ? await approvalsApi.approve(Number(instanceId), comment || '')
        : await approvalsApi.reject(Number(instanceId), comment || '');
      if (actionRes.code === 0) {
        toast.success(type === 'approve' ? '审批通过' : '已驳回');
        setApproveRecord(null);
        table.refresh();
      } else {
        toast.error(actionRes.message || '操作失败');
      }
    } catch (e) {
      toast.error(extractErrorMessage(e));
    } finally {
      setApprovalSubmitting(false);
    }
  };

  const approvalSummary = useMemo<ApprovalSummaryField[]>(() => {
    if (!approveRecord) return [];
    return [
      { label: '业务类型', value: '垫款申请' },
      { label: '单据编号', value: approveRecord.advance_no },
      { label: '客户名称', value: approveRecord.customer_name },
      { label: '垫款原因', value: approveRecord.advance_reason || '-' },
      { label: '垫款金额', value: <span className="font-semibold tabular-nums">{formatAmount(approveRecord.advance_amount)}</span> },
      { label: '预计回款日期', value: approveRecord.expected_return_date?.slice(0, 10) || '-' },
    ];
  }, [approveRecord]);

  const handleReturn = async (values: Record<string, unknown>) => {
    if (!returnRecord) return false;
    const rid = validateRecordId(returnRecord);
    if (!rid) { toast.warning('记录标识缺失，请刷新后重试'); return false; }
    const add = Number(values.returned_amount) || 0;
    if (add <= 0) {
      toast.error('回款金额必须大于 0');
      return false;
    }
    const remaining = returnRecord.advance_amount - returnRecord.returned_amount;
    if (add > remaining) {
      toast.error(`回款金额不能超过未回款金额 ${formatAmount(remaining)}`);
      return false;
    }
    const newReturned = returnRecord.returned_amount + add;
    try {
      const res = await advancesApi.update(Number(rid), {
        returned_amount: newReturned,
        status: newReturned >= returnRecord.advance_amount ? 'returned' : 'partial',
      });
      if (res.code === 0) {
        toast.success('回款登记成功');
        setReturnRecord(null);
        table.refresh();
        return true;
      }
      toast.error(res.message || '登记失败');
      return false;
    } catch (e) {
      toast.error(extractErrorMessage(e));
      return false;
    }
  };

  const primaryActions: ActionButton[] = [
    { label: '登记垫款', primary: true, icon: <Plus className="size-3.5" />, onClick: () => setFormOpen(true) },
    {
      label: '导出',
      onClick: () => exportRowsToCsv('垫款列表', [
        { key: 'advance_no', label: '垫款单号' },
        { key: 'customer_name', label: '客户名称' },
        { key: 'amount', label: '垫款金额' },
        { key: 'reason', label: '垫款原因' },
        { key: 'advance_date', label: '垫款日期' },
        { key: 'expected_return_date', label: '预计归还日期' },
        { key: 'returned_amount', label: '已归还金额' },
        { key: 'status', label: '状态' },
      ], table.data as Advance[]),
    },
  ];

  const rowActions = (record: Advance): ActionButton[] => {
    const actions: ActionButton[] = [];
    if (record.status === 'pending_approval' || record.status === 'approving') {
      actions.push({ label: isApprover ? '审批' : '查看审批', onClick: () => openApproval(record) });
    } else if (record.status === 'rejected') {
      actions.push({ label: '查看审批', onClick: () => openApproval(record) });
    }
    if (record.status === 'unreturned' || record.status === 'partial') {
      actions.push({ label: '登记回款', onClick: () => setReturnRecord(record) });
    }
    actions.push({ label: '删除', onClick: () => setDeleteId(record.id) });
    return actions;
  };

  return (
    <>
      <ServerListPage<Advance>
        title={t('垫款管理')}
        description="管理客户垫款及回款情况"
        data={table.data as Advance[]}
        total={table.total}
        loading={table.loading}
        columns={columns}
        filters={FILTERS}
        primaryActions={primaryActions}
        rowActions={rowActions}
        selectable
        page={table.page}
        pageSize={table.pageSize}
        onPageChange={table.setPage}
        onPageSizeChange={table.setPageSize}
        onSearch={table.setFilters}
        onReset={table.handleReset}
        onSort={table.handleSort}
        sortBy={table.sortBy}
        sortOrder={table.sortOrder}
        onRefresh={table.refresh}
        selectedKeys={selectedKeys}
        onSelectedChange={setSelectedKeys}
      />

      <AlertDialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              删除后将无法恢复，确定要删除该垫款记录吗？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleDelete} disabled={deleteLocked}>
              {deleteLocked ? '删除中...' : '确认删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <FieldFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={t('登记垫款')}
        description="登记客户垫款信息，提交后进入待审批状态，审批通过后开始跟踪回款"
        fields={ADVANCE_FORM_FIELDS}
        submitLabel="确认登记"
        onSubmit={handleCreateAdvance}
      />

      <FieldFormDialog
        open={!!returnRecord}
        onOpenChange={(o) => !o && setReturnRecord(null)}
        title={`登记回款 - ${returnRecord?.customer_name || ''}`}
        description="登记本次回款金额，全部回款后状态自动更新为已回款"
        fields={RETURN_FORM_FIELDS}
        submitLabel="确认回款"
        onSubmit={handleReturn}
      />

      {/* 审批详情弹窗 */}
      <ApprovalDetailDialog
        open={!!approveRecord}
        onOpenChange={(o) => { if (!o) setApproveRecord(null); }}
        title={approveRecord ? `垫款审批 - ${approveRecord.customer_name}` : ''}
        subtitle={approveRecord?.advance_no || ''}
        status={approveRecord ? (STATUS_MAP[approveRecord.status] || approveRecord.status) : ''}
        statusVariant={approveRecord?.status === 'rejected' ? 'destructive' : approveRecord?.status === 'returned' ? 'success' : 'warning'}
        summaryFields={approvalSummary}
        detailLabel="垫款详情"
        detailContent={approveRecord ? (
          <div className="space-y-2 rounded-lg border p-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div><span className="text-muted-foreground">客户名称：</span>{approveRecord.customer_name}</div>
              <div><span className="text-muted-foreground">垫款金额：</span><span className="font-semibold tabular-nums">{formatAmount(approveRecord.advance_amount)}</span></div>
              <div><span className="text-muted-foreground">垫款日期：</span>{approveRecord.advance_date?.slice(0, 10) || '-'}</div>
              <div><span className="text-muted-foreground">预计回款日期：</span>{approveRecord.expected_return_date?.slice(0, 10) || '-'}</div>
            </div>
            <div className="pt-2">
              <div className="mb-1 text-muted-foreground">垫款原因</div>
              <div className="rounded-md bg-muted/30 p-3">{approveRecord.advance_reason || '-'}</div>
            </div>
            {approvalLoading && <div className="pt-2 text-xs text-muted-foreground">审批记录加载中…</div>}
            {!approvalLoading && approvalSteps.length === 0 && (
              <div className="pt-2 text-xs text-muted-foreground">该垫款暂无审批实例记录</div>
            )}
          </div>
        ) : null}
        approvalSteps={approvalSteps}
        canApprove={isApprover && (approveRecord?.status === 'pending_approval' || approveRecord?.status === 'approving')}
        approving={approvalSubmitting}
        onApprove={handleApproval}
      />
    </>
  );
}
