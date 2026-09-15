import { useState, useMemo } from 'react';
import { t } from '@/lib/i18n';
import ServerListPage, { type FilterField, type Column } from '@/components/ServerListPage';
import StatusBadge from '@/components/StatusBadge';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatAmount, formatDateTime, formatDate } from '@/lib/format';
import { dailyExpensesApi } from '@/api';
import FieldFormDialog, { type FormFieldDef } from '@/components/FieldFormDialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useServerList } from '@/hooks/useServerList';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const TYPE_OPTS = [
  { label: '差旅费', value: '差旅费' },
  { label: '招待费', value: '招待费' },
  { label: '办公费', value: '办公费' },
  { label: '交通费', value: '交通费' },
  { label: '其他', value: '其他' },
];

const STATUS_OPTS = [
  { label: '待审批', value: 'pending_approval' },
  { label: '已通过', value: 'approved' },
  { label: '已驳回', value: 'rejected' },
];

const DEPT_OPTS = [
  { label: '商务一部', value: '商务一部' },
  { label: '商务二部', value: '商务二部' },
  { label: '财务部', value: '财务部' },
  { label: '行政部', value: '行政部' },
];

const STATUS_MAP: Record<string, string> = {
  pending_approval: '待审批',
  approved: '已通过',
  rejected: '已驳回',
};

const STATUS_VARIANT: Record<string, 'default' | 'info' | 'success' | 'warning' | 'danger'> = {
  pending_approval: 'warning',
  approved: 'success',
  rejected: 'danger',
};

const FILTERS: FilterField[] = [
  { key: 'keyword', label: '申请人/单号', type: 'input', placeholder: '搜索申请人/单号' },
  { key: 'expense_type', label: '费用类型', type: 'select', options: TYPE_OPTS },
  { key: 'department', label: '部门', type: 'select', options: DEPT_OPTS },
  { key: 'status', label: '状态', type: 'select', options: STATUS_OPTS },
];

interface DailyExpense {
  id: number;
  expense_no: string;
  expense_type: string;
  amount: number;
  applicant: string;
  department: string;
  expense_date: string;
  status: string;
  remark: string;
  created_at: string;
}

export default function DailyExpensePage() {
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<DailyExpense | null>(null);
  const [approvalTarget, setApprovalTarget] = useState<DailyExpense | null>(null);
  const [approvalComment, setApprovalComment] = useState('');
  const [approving, setApproving] = useState(false);

  const table = useServerList({
    fetchFn: dailyExpensesApi.list,
    defaultPageSize: 20,
  });

  const columns: Column<DailyExpense>[] = useMemo(() => [
    { key: 'expense_no', title: '费用单号', dataIndex: 'expense_no' as const, width: '130px' },
    { key: 'expense_type', title: '费用类型', dataIndex: 'expense_type' as const, width: '110px' },
    {
      key: 'amount', title: '费用金额', width: '130px', align: 'right', sortable: true,
      render: (r) => <span className="font-medium tabular-nums">{formatAmount(r.amount)}</span>,
    },
    { key: 'applicant', title: '申请人', dataIndex: 'applicant' as const, width: '100px' },
    { key: 'department', title: '部门', dataIndex: 'department' as const, width: '120px' },
    {
      key: 'expense_date', title: '发生日期', width: '120px',
      render: (r) => <span className="tabular-nums text-sm">{formatDate(r.expense_date)}</span>,
    },
    {
      key: 'status', title: '状态', width: '100px',
      render: (r) => <StatusBadge status={STATUS_MAP[r.status] || r.status} variant={STATUS_VARIANT[r.status] || 'default'} />,
    },
    { key: 'remark', title: '备注', dataIndex: 'remark' as const, width: '160px' },
    {
      key: 'created_at', title: '创建时间', width: '170px', sortable: true,
      render: (r) => <span className="text-muted-foreground tabular-nums text-sm">{formatDateTime(r.created_at)}</span>,
    },
  ], []);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await dailyExpensesApi.remove(deleteId);
      if (res.code === 0) {
        toast.success('删除成功');
        table.refresh();
      } else {
        toast.error(res.message || '删除失败');
      }
    } catch {
      toast.error('删除失败');
    } finally {
      setDeleteId(null);
    }
  };

  const EXPENSE_FORM_FIELDS: FormFieldDef[] = [
    { key: 'expense_type', label: '费用类型', type: 'select', required: true, options: TYPE_OPTS, defaultValue: '差旅费' },
    { key: 'amount', label: '金额（元）', type: 'number', required: true, placeholder: '请输入金额' },
    { key: 'applicant', label: '申请人', required: true, placeholder: '请输入申请人姓名' },
    { key: 'department', label: '部门', type: 'select', required: true, options: DEPT_OPTS },
    { key: 'expense_date', label: '发生日期', required: true, placeholder: '如 2026-08-29' },
    { key: 'status', label: '状态', type: 'select', required: true, options: STATUS_OPTS, defaultValue: 'pending_approval' },
    { key: 'remark', label: '备注', type: 'textarea', placeholder: '费用说明（可选）' },
  ];

  const handleSave = async (values: Record<string, unknown>) => {
    try {
      const payload: Record<string, unknown> = {
        ...values,
        amount: Number(values.amount) || 0,
      };
      if (!editRecord) {
        payload.expense_no = `FY${Date.now().toString().slice(-8)}`;
      }
      const res = editRecord
        ? await dailyExpensesApi.update(editRecord.id, payload)
        : await dailyExpensesApi.create(payload);
      if (res.code === 0) {
        toast.success(editRecord ? '费用信息已更新' : '费用登记成功');
        setEditRecord(null);
        table.refresh();
        return true;
      }
      toast.error(res.message || '保存失败');
      return false;
    } catch {
      toast.error('保存失败');
      return false;
    }
  };

  const handleApprove = async (approved: boolean) => {
    if (!approvalTarget) return;
    setApproving(true);
    try {
      const res = await dailyExpensesApi.update(approvalTarget.id, {
        status: approved ? 'approved' : 'rejected',
        approve_comment: approvalComment || (approved ? '同意报销' : '不同意报销'),
        approved_at: new Date().toISOString(),
      });
      if (res.code === 0) {
        toast.success(approved ? '已同意报销' : '已驳回费用申请');
        setApprovalTarget(null);
        setApprovalComment('');
        table.refresh();
      } else {
        toast.error(res.message || '审批失败');
      }
    } catch {
      toast.error('审批失败');
    } finally {
      setApproving(false);
    }
  };

  const rowActions = (record: DailyExpense) => [
    ...(record.status === 'pending_approval' ? [{ label: '审批', onClick: () => setApprovalTarget(record) }] : []),
    { label: '编辑', onClick: () => { setEditRecord(record); setFormOpen(true); } },
    { label: '删除', variant: 'destructive' as const, icon: <Trash2 className="size-4" />, onClick: () => setDeleteId(record.id) },
  ];

  const primaryActions = [
    { label: '登记费用', primary: true, icon: <Plus className="size-4" />, onClick: () => { setEditRecord(null); setFormOpen(true); } },
  ];

  return (
    <>
      <ServerListPage
        title={t('日常费用')}
        description="管理日常费用报销"
        data={table.data}
        total={table.total}
        loading={table.loading}
        columns={columns}
        filters={FILTERS}
        primaryActions={primaryActions}
        rowActions={rowActions}
        selectable
        selectedKeys={selectedKeys}
        onSelectedChange={setSelectedKeys}
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
      />
      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">确认删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <FieldFormDialog
        key={editRecord ? `edit-${editRecord.id}` : 'create'}
        open={formOpen}
        onOpenChange={(o) => {
          setFormOpen(o);
          if (!o) setEditRecord(null);
        }}
        title={editRecord ? `编辑费用：${editRecord.expense_no}` : '登记费用'}
        description="登记日常费用支出，带 * 为必填项"
        fields={EXPENSE_FORM_FIELDS}
        submitLabel={editRecord ? '保存修改' : '登记费用'}
        onSubmit={handleSave}
        initialValues={editRecord ? { ...editRecord, amount: String(editRecord.amount) } : null}
      />

      <Dialog open={!!approvalTarget} onOpenChange={(o) => { if (!o) { setApprovalTarget(null); setApprovalComment(''); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>费用审批</DialogTitle>
            <DialogDescription>
              {approvalTarget ? `${approvalTarget.applicant} · ${approvalTarget.expense_type} · ${formatAmount(approvalTarget.amount)}` : ''}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={approvalComment}
            onChange={(e) => setApprovalComment(e.target.value)}
            placeholder="审批意见（可选）"
            className="min-h-[80px]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => handleApprove(false)} disabled={approving}>驳回</Button>
            <Button onClick={() => handleApprove(true)} disabled={approving}>同意报销</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
