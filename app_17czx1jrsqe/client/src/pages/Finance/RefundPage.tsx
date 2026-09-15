import { useState, useMemo } from 'react';
import { useActionLock } from '@/hooks/useActionLock';
import { extractErrorMessage, validateRecordId } from '@/lib/error-utils';
import { t } from '@/lib/i18n';
import ServerListPage, { type FilterField, type ActionButton, type Column } from '@/components/ServerListPage';
import StatusBadge from '@/components/StatusBadge';
import ApprovalDetailDialog, { type ApprovalSummaryField } from '@/components/ApprovalDetailDialog';
import ApprovalTimeline, { type ApprovalStep } from '@/components/ApprovalTimeline';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatAmount, formatDateTime } from '@/lib/format';
import { refundsApi } from '@/api';
import { normalizeFinanceStatus } from '@/api/finance-status';
import { useServerList } from '@/hooks/useServerList';
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
import { useApp } from '@/context/AppContext';
import FieldFormDialog, { type FormFieldDef } from '@/components/FieldFormDialog';
import type { Refund } from '@/api/types';

const STATUS_OPTS = [
  { label: '待审批', value: '待审批' },
  { label: '审批中', value: '审批中' },
  { label: '已退款', value: '已退款' },
  { label: '已驳回', value: '已驳回' },
];

const STATUS_VARIANT: Record<string, 'default' | 'info' | 'success' | 'warning' | 'danger'> = {
  待审批: 'warning',
  审批中: 'info',
  已退款: 'success',
  已驳回: 'danger',
};

const FILTERS: FilterField[] = [
  { key: 'customer_name', label: '客户名称', type: 'input', placeholder: '客户名称' },
  { key: 'status', label: '退款状态', type: 'select', options: STATUS_OPTS },
];

function genApprovalSteps(record: Refund): ApprovalStep[] {
  return [
    {
      id: 0,
      step_name: '提交退款申请',
      approver_name: record.customer_name || '申请人',
      status: 'approved',
      comment: '提交退款申请',
      approved_at: record.created_at,
      is_submit: true,
    },
    {
      id: 1,
      step_name: '财务主管审批',
      approver_name: '赵敏（财务主管）',
      status: 'pending',
    },
  ];
}

export default function RefundPage() {
  const { user } = useApp();
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [approveRecord, setApproveRecord] = useState<Refund | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { withLock: withDeleteLock, locked: deleteLocked } = useActionLock();

  const table = useServerList({
    fetchFn: refundsApi.list,
    defaultPageSize: 20,
  });

  const isManager = user?.role === 'admin' || user?.role === 'manager';

  const columns: Column<Refund>[] = useMemo(() => [
    { key: 'refund_no', title: '退款编号', dataIndex: 'refund_no' as const, width: '150px', sortable: true },
    { key: 'customer_name', title: '客户名称', dataIndex: 'customer_name' as const, width: '240px' },
    {
      key: 'refund_amount',
      title: '退款金额',
      width: '140px',
      align: 'right',
      sortable: true,
      render: (r) => <span className="tabular-nums font-semibold text-red-500">{formatAmount(r.refund_amount)}</span>,
    },
    { key: 'refund_reason', title: '退款原因', dataIndex: 'refund_reason' as const, width: '200px' },
    { key: 'refund_method', title: '退款方式', dataIndex: 'refund_method' as const, width: '110px' },
    {
      key: 'status',
      title: '状态',
      width: '100px',
      render: (r) => {
        const s = normalizeFinanceStatus('refund', r.status);
        return <StatusBadge status={s} variant={STATUS_VARIANT[s] || 'default'} />;
      },
    },
    {
      key: 'created_at',
      title: '申请时间',
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
        const res = await refundsApi.remove(id);
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

  const handleApproveAction = async (type: 'approve' | 'reject', comment: string): Promise<boolean> => {
    if (!approveRecord) return false;
    const id = validateRecordId(approveRecord);
    if (!id) { toast.warning('记录标识缺失，请刷新后重试'); return false; }
    setSubmitting(true);
    try {
      const res = await refundsApi.update(id, {
        status: type === 'approve' ? '已退款' : '已驳回',
        approver: user?.name || user?.username || '',
        approval_comment: comment || (type === 'approve' ? '同意退款' : '驳回退款申请'),
      });
      if (res.code === 0) {
        toast.success(type === 'approve' ? '审批通过' : '已驳回');
        setApproveRecord(null);
        table.refresh();
        return true;
      }
      toast.error(res.message || '操作失败');
      return false;
    } catch (e) {
      toast.error(extractErrorMessage(e));
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const approvalSummary = useMemo<ApprovalSummaryField[]>(() => {
    if (!approveRecord) return [];
    return [
      { label: '业务类型', value: '退款申请' },
      { label: '单据编号', value: approveRecord.refund_no },
      { label: '客户名称', value: approveRecord.customer_name },
      { label: '退款原因', value: approveRecord.refund_reason || '-' },
      { label: '申请时间', value: formatDateTime(approveRecord.created_at) },
      { label: '退款金额', value: <span className="font-semibold text-red-500 tabular-nums">{formatAmount(approveRecord.refund_amount)}</span> },
      { label: '退款方式', value: approveRecord.refund_method || '-' },
    ];
  }, [approveRecord]);

  const approvalSteps = useMemo<ApprovalStep[]>(() => {
    if (!approveRecord) return [];
    const steps = genApprovalSteps(approveRecord);
    const s = normalizeFinanceStatus('refund', approveRecord.status);
    if (s === '待审批' || s === '审批中') {
      steps[1].status = 'current';
    } else if (s === '已退款') {
      steps[1].status = 'approved';
      steps[1].approved_at = (approveRecord as any).updated_at || approveRecord.created_at;
    } else if (s === '已驳回') {
      steps[1].status = 'rejected';
      steps[1].approved_at = (approveRecord as any).updated_at || approveRecord.created_at;
    }
    return steps;
  }, [approveRecord]);

  const approveStatusVariant = useMemo(() => {
    if (!approveRecord) return 'default' as const;
    const s = normalizeFinanceStatus('refund', approveRecord.status);
    if (s === '已退款') return 'success' as const;
    if (s === '已驳回') return 'destructive' as const;
    return 'warning' as const;
  }, [approveRecord]);

  const currentStepName = useMemo(() => {
    const cur = approvalSteps.find(s => s.status === 'current');
    return cur?.step_name || '';
  }, [approvalSteps]);

  const REFUND_METHOD_OPTS = [
    { label: '银行转账', value: '银行转账' },
    { label: '原路退回', value: '原路退回' },
    { label: '账户冲抵', value: '账户冲抵' },
  ];

  const REFUND_FORM_FIELDS: FormFieldDef[] = [
    { key: 'customer_name', label: '客户名称', required: true, placeholder: '请输入客户名称' },
    { key: 'refund_amount', label: '退款金额（元）', type: 'number', required: true, placeholder: '请输入金额' },
    { key: 'refund_method', label: '退款方式', type: 'select', required: true, options: REFUND_METHOD_OPTS, defaultValue: '银行转账' },
    { key: 'refund_reason', label: '退款原因', type: 'textarea', required: true, placeholder: '请详细描述退款原因' },
  ];

  const handleSubmitRefund = async (values: Record<string, unknown>) => {
    try {
      const res = await refundsApi.create({
        ...values,
        refund_no: `TK${Date.now().toString().slice(-8)}`,
        refund_amount: Number(values.refund_amount) || 0,
        status: '待审批',
      });
      if (res.code === 0) {
        toast.success('退款申请提交成功，等待审批');
        table.refresh();
        return true;
      }
      toast.error(res.message || '提交失败');
      return false;
    } catch (e) {
      toast.error(extractErrorMessage(e));
      return false;
    }
  };

  const primaryActions: ActionButton[] = [
    { label: '申请退款', primary: true, icon: <Plus className="size-3.5" />, onClick: () => setFormOpen(true) },
  ];

  const rowActions = (record: Refund): ActionButton[] => {
    const actions: ActionButton[] = [];
    const s = normalizeFinanceStatus('refund', record.status);
    if (isManager && (s === '待审批' || s === '审批中')) {
      actions.push({ label: '审批', onClick: () => setApproveRecord(record) });
    } else if (s === '已退款' || s === '已驳回') {
      actions.push({ label: '查看审批', onClick: () => setApproveRecord(record) });
    }
    actions.push({ label: '删除', onClick: () => setDeleteId(record.id) });
    return actions;
  };

  return (
    <>
      <ServerListPage<Refund>
        title={t('退款管理')}
        description="管理客户退款申请"
        data={table.data as Refund[]}
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
              删除后将无法恢复，确定要删除该退款记录吗？
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

      <ApprovalDetailDialog
        open={!!approveRecord}
        onOpenChange={(o) => !o && setApproveRecord(null)}
        title={approveRecord ? approveRecord.customer_name : ''}
        subtitle={approveRecord?.refund_no || ''}
        status={approveRecord ? normalizeFinanceStatus('refund', approveRecord.status) : ''}
        statusVariant={approveStatusVariant}
        summaryFields={approvalSummary}
        detailLabel="退款详情"
        detailContent={
          approveRecord ? (
            <div className="space-y-2 rounded-lg border p-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">客户名称：</span>{approveRecord.customer_name}</div>
                <div><span className="text-muted-foreground">退款方式：</span>{approveRecord.refund_method || '-'}</div>
                <div><span className="text-muted-foreground">退款金额：</span><span className="font-semibold text-red-500 tabular-nums">{formatAmount(approveRecord.refund_amount)}</span></div>
                <div><span className="text-muted-foreground">申请时间：</span>{formatDateTime(approveRecord.created_at)}</div>
              </div>
              <div className="pt-2">
                <div className="text-muted-foreground mb-1">退款原因</div>
                <div className="rounded-md bg-muted/30 p-3">{approveRecord.refund_reason || '-'}</div>
              </div>
            </div>
          ) : null
        }
        approvalSteps={approvalSteps}
        canApprove={isManager && (normalizeFinanceStatus('refund', approveRecord?.status) === '待审批' || normalizeFinanceStatus('refund', approveRecord?.status) === '审批中')}
        approving={submitting}
        onApprove={handleApproveAction}
        currentStepName={currentStepName}
      />

      <FieldFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={t('申请退款')}
        description="提交客户退款申请，提交后进入审批流程，带 * 为必填项"
        fields={REFUND_FORM_FIELDS}
        submitLabel="提交申请"
        onSubmit={handleSubmitRefund}
      />
    </>
  );
}
