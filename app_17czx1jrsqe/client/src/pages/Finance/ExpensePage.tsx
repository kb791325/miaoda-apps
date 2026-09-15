import { useState, useMemo } from 'react';
import { useActionLock } from '@/hooks/useActionLock';
import { extractErrorMessage, validateRecordId } from '@/lib/error-utils';
import { t } from '@/lib/i18n';
import ServerListPage, { type FilterField, type ActionButton, type Column } from '@/components/ServerListPage';
import StatusBadge from '@/components/StatusBadge';
import { ProtectedAmount } from '@/components/ProtectedField';
import ApprovalDetailDialog, { type ApprovalSummaryField } from '@/components/ApprovalDetailDialog';
import ApprovalTimeline, { type ApprovalStep } from '@/components/ApprovalTimeline';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatAmount, formatDateTime } from '@/lib/format';
import { expensesApi, approvalsApi } from '@/api';
import { useServerList } from '@/hooks/useServerList';
import { useFieldPermission } from '@/hooks/useFieldPermission';
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
import { Button } from '@/components/ui/button';
import { useApp } from '@/context/AppContext';
import FieldFormDialog, { type FormFieldDef } from '@/components/FieldFormDialog';
import type { Expense } from '@/api/types';

const STATUS_OPTS = [
  { label: '待审批', value: 'pending_approval' },
  { label: '审批中', value: 'approving' },
  { label: '已通过', value: 'approved' },
  { label: '已驳回', value: 'rejected' },
];

const STATUS_MAP: Record<string, string> = {
  pending_approval: '待审批',
  approving: '审批中',
  approved: '已通过',
  rejected: '已驳回',
};

const STATUS_VARIANT: Record<string, 'default' | 'info' | 'success' | 'warning' | 'danger'> = {
  pending_approval: 'warning',
  approving: 'info',
  approved: 'success',
  rejected: 'danger',
};

const FILTERS: FilterField[] = [
  { key: 'expense_type', label: '支出类型', type: 'input', placeholder: '支出类型' },
  { key: 'approval_status', label: '审批状态', type: 'select', options: STATUS_OPTS },
];

// 生成或签审批步骤（支出：两个财务任一审批即可）
function genApprovalSteps(record: Expense): ApprovalStep[] {
  const steps: ApprovalStep[] = [
    {
      id: 0,
      step_name: '提交申请',
      approver_name: record.applicant || '申请人',
      status: 'approved',
      comment: '提交支出申请',
      approved_at: record.created_at,
      is_submit: true,
    },
    {
      id: 1,
      step_name: '财务审批（或签）',
      approver_name: '',
      status: 'pending',
      mode: 'orsign',
      sub_approvers: [
        { name: '赵敏（财务主管）', status: 'pending' },
        { name: '孙磊（财务副主管）', status: 'pending' },
      ],
    },
  ];
  if (record.approval_status === 'pending_approval' || record.approval_status === 'approving') {
    steps[1].status = 'current';
  } else if (record.approval_status === 'approved') {
    steps[1].status = 'approved';
    steps[1].approved_at = (record as any).updated_at || record.created_at;
    if (steps[1].sub_approvers) {
      steps[1].sub_approvers[0].status = 'approved';
    }
  } else if (record.approval_status === 'rejected') {
    steps[1].status = 'rejected';
    steps[1].approved_at = (record as any).updated_at || record.created_at;
    if (steps[1].sub_approvers) {
      steps[1].sub_approvers[0].status = 'rejected';
    }
  }
  return steps;
}

export default function ExpensePage() {
  const { user } = useApp();
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [approveRecord, setApproveRecord] = useState<Expense | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { withLock: withDeleteLock, locked: deleteLocked } = useActionLock();

  const table = useServerList({
    fetchFn: expensesApi.list,
    defaultPageSize: 20,
  });

  const isManager = user?.role === 'admin' || user?.role === 'manager';
  const { isVisible } = useFieldPermission();

  const columns: Column<Expense>[] = useMemo(() => [
    { key: 'expense_no', title: '支出编号', dataIndex: 'expense_no' as const, width: '160px' },
    { key: 'expense_type', title: '支出类型', dataIndex: 'expense_type' as const, width: '130px' },
    { key: 'expense_reason', title: '支出事由', dataIndex: 'expense_reason' as const, width: '280px' },
    ...(isVisible('finance.expense_amount') ? [{
      key: 'amount' as const,
      title: '金额',
      width: '140px',
      align: 'right' as const,
      sortable: true,
      render: (r: Expense) => (
        <ProtectedAmount
          fieldKey="finance.expense_amount"
          value={r.amount}
          className="font-semibold text-red-500"
        />
      ),
    }] : []),
    { key: 'applicant', title: '申请人', dataIndex: 'applicant' as const, width: '100px' },
    {
      key: 'approval_status',
      title: '审批状态',
      width: '100px',
      render: (r) => (
        <StatusBadge status={STATUS_MAP[r.approval_status] || r.approval_status} variant={STATUS_VARIANT[r.approval_status] || 'default'} />
      ),
    },
    {
      key: 'expense_date',
      title: '支出日期',
      dataIndex: 'expense_date' as const,
      width: '120px',
      sortable: true,
      render: (r) => r.expense_date?.slice(0, 10) || '-',
    },
    {
      key: 'created_at',
      title: '创建时间',
      dataIndex: 'created_at' as const,
      width: '160px',
      render: (r) => formatDateTime(r.created_at),
    },
  ], []);

  const handleDelete = async () => {
    await withDeleteLock(async () => {
      if (!deleteId) return;
      const id = validateRecordId({ id: deleteId });
      if (!id) { toast.warning('记录标识缺失，请刷新后重试'); setDeleteId(null); return; }
      try {
        const res = await expensesApi.remove(id);
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
      const res = type === 'approve'
        ? await approvalsApi.approve(id, comment || '')
        : await approvalsApi.reject(id, comment || '');
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
      { label: '业务类型', value: '支出申请' },
      { label: '单据编号', value: `#${approveRecord.id}` },
      { label: '支出类型', value: approveRecord.expense_type },
      { label: '申请人', value: approveRecord.applicant || '-' },
      { label: '申请时间', value: formatDateTime(approveRecord.created_at) },
      ...(isVisible('finance.expense_amount') ? [
        { label: '金额', value: <span className="font-semibold text-primary tabular-nums">{formatAmount(approveRecord.amount)}</span> },
      ] : []),
      { label: '支出日期', value: approveRecord.expense_date?.slice(0, 10) || '-' },
    ];
  }, [approveRecord, isVisible]);

  const approvalSteps = useMemo<ApprovalStep[]>(() => {
    if (!approveRecord) return [];
    return genApprovalSteps(approveRecord);
  }, [approveRecord]);

  const approveStatusVariant = useMemo(() => {
    if (!approveRecord) return 'default' as const;
    const s = approveRecord.approval_status;
    if (s === 'approved') return 'success' as const;
    if (s === 'rejected') return 'destructive' as const;
    return 'warning' as const;
  }, [approveRecord]);

  const currentStepName = useMemo(() => {
    const cur = approvalSteps.find(s => s.status === 'current');
    return cur?.step_name || '';
  }, [approvalSteps]);

  const EXPENSE_TYPE_OPTS = [
    { label: '市场推广费', value: '市场推广费' },
    { label: '差旅费', value: '差旅费' },
    { label: '招待费', value: '招待费' },
    { label: '办公费', value: '办公费' },
    { label: '服务费', value: '服务费' },
    { label: '其他', value: '其他' },
  ];

  const EXPENSE_FORM_FIELDS: FormFieldDef[] = [
    { key: 'expense_type', label: '支出类型', type: 'select', required: true, options: EXPENSE_TYPE_OPTS, defaultValue: '市场推广费' },
    { key: 'amount', label: '支出金额（元）', type: 'number', required: true, placeholder: '请输入金额' },
    { key: 'expense_date', label: '支出日期', required: true, placeholder: '如 2026-08-29' },
    { key: 'expense_reason', label: '支出事由', type: 'textarea', required: true, placeholder: '请详细描述支出事由' },
  ];

  const handleSubmitExpense = async (values: Record<string, unknown>) => {
    try {
      const res = await expensesApi.create({
        ...values,
        amount: Number(values.amount) || 0,
        approval_status: 'pending_approval',
        applicant: user?.name || '当前用户',
      });
      if (res.code === 0) {
        toast.success('支出申请提交成功，等待审批');
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
    { label: '申请支出', primary: true, icon: <Plus className="size-3.5" />, onClick: () => setFormOpen(true) },
  ];

  const rowActions = (record: Expense): ActionButton[] => {
    const actions: ActionButton[] = [];
    if (isManager && (record.approval_status === 'pending_approval' || record.approval_status === 'approving')) {
      actions.push({ label: '审批', onClick: () => setApproveRecord(record) });
    } else if (record.approval_status === 'approved' || record.approval_status === 'rejected') {
      actions.push({ label: '查看审批', onClick: () => setApproveRecord(record) });
    }
    actions.push({ label: '删除', onClick: () => setDeleteId(record.id) });
    return actions;
  };

  return (
    <>
      <ServerListPage<Expense>
        title={t('支出管理')}
        description="管理公司各项支出申请（或签：财务任一审批人通过即可）"
        data={table.data as Expense[]}
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
              删除后将无法恢复，确定要删除该支出记录吗？
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
        title={approveRecord ? approveRecord.expense_reason : ''}
        subtitle={`支出申请 #${approveRecord?.id || ''}`}
        status={approveRecord ? (STATUS_MAP[approveRecord.approval_status] || approveRecord.approval_status) : ''}
        statusVariant={approveStatusVariant}
        summaryFields={approvalSummary}
        detailLabel="支出详情"
        detailContent={
          approveRecord ? (
            <div className="space-y-2 rounded-lg border p-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">支出类型：</span>{approveRecord.expense_type}</div>
                <div><span className="text-muted-foreground">申请人：</span>{approveRecord.applicant}</div>
                <div><span className="text-muted-foreground">支出日期：</span>{approveRecord.expense_date?.slice(0, 10) || '-'}</div>
                <div>
                  <span className="text-muted-foreground">金额：</span>
                  <ProtectedAmount
                    fieldKey="finance.expense_amount"
                    value={approveRecord.amount}
                    className="font-semibold text-primary"
                  />
                </div>
              </div>
              <div className="pt-2">
                <div className="text-muted-foreground mb-1">支出事由</div>
                <div className="rounded-md bg-muted/30 p-3">{approveRecord.expense_reason}</div>
              </div>
            </div>
          ) : null
        }
        approvalSteps={approvalSteps}
        canApprove={isManager && (approveRecord?.approval_status === 'pending_approval' || approveRecord?.approval_status === 'approving')}
        approving={submitting}
        onApprove={handleApproveAction}
        currentStepName={currentStepName}
      />

      <FieldFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={t('申请支出')}
        description="提交支出申请，提交后进入审批流程，带 * 为必填项"
        fields={EXPENSE_FORM_FIELDS}
        submitLabel="提交申请"
        onSubmit={handleSubmitExpense}
      />
    </>
  );
}
