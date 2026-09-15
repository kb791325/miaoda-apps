import { useState, useMemo } from 'react';
import { t } from '@/lib/i18n';
import ServerListPage, { type FilterField, type Column } from '@/components/ServerListPage';
import StatusBadge from '@/components/StatusBadge';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatAmount, formatDateTime, formatDate } from '@/lib/format';
import { depositsApi } from '@/api';
import FieldFormDialog, { type FormFieldDef } from '@/components/FieldFormDialog';
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
  { label: '保证金', value: '保证金' },
  { label: '押金', value: '押金' },
];

const STATUS_OPTS = [
  { label: '已缴纳', value: 'paid' },
  { label: '已退还', value: 'refunded' },
  { label: '已扣除', value: 'deducted' },
];

const STATUS_MAP: Record<string, string> = {
  paid: '已缴纳',
  refunded: '已退还',
  deducted: '已扣除',
};

const STATUS_VARIANT: Record<string, 'default' | 'info' | 'success' | 'warning' | 'danger'> = {
  paid: 'info',
  refunded: 'success',
  deducted: 'danger',
};

const FILTERS: FilterField[] = [
  { key: 'keyword', label: '客户/单号', type: 'input', placeholder: '搜索客户名称/单号' },
  { key: 'deposit_type', label: '类型', type: 'select', options: TYPE_OPTS },
  { key: 'status', label: '状态', type: 'select', options: STATUS_OPTS },
];

interface Deposit {
  id: number;
  deposit_no: string;
  customer_name: string;
  deposit_type: string;
  deposit_amount: number;
  paid_date: string;
  refund_date: string;
  status: string;
  remark: string;
  created_at: string;
}

export default function DepositPage() {
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<Deposit | null>(null);

  const table = useServerList({
    fetchFn: depositsApi.list,
    defaultPageSize: 20,
  });

  const columns: Column<Deposit>[] = useMemo(() => [
    { key: 'deposit_no', title: '保证金单号', dataIndex: 'deposit_no' as const, width: '130px' },
    { key: 'customer_name', title: '客户名称', dataIndex: 'customer_name' as const, width: '240px' },
    { key: 'deposit_type', title: '类型', dataIndex: 'deposit_type' as const, width: '100px' },
    {
      key: 'deposit_amount', title: '金额', width: '140px', align: 'right', sortable: true,
      render: (r) => <span className="font-medium tabular-nums">{formatAmount(r.deposit_amount)}</span>,
    },
    {
      key: 'paid_date', title: '缴纳日期', width: '120px',
      render: (r) => <span className="tabular-nums text-sm">{formatDate(r.paid_date)}</span>,
    },
    {
      key: 'refund_date', title: '预计退还', width: '120px',
      render: (r) => <span className="tabular-nums text-sm">{r.refund_date ? formatDate(r.refund_date) : '-'}</span>,
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
      const res = await depositsApi.remove(deleteId);
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

  const DEPOSIT_FORM_FIELDS: FormFieldDef[] = [
    { key: 'customer_name', label: '客户名称', required: true, placeholder: '请输入客户名称' },
    { key: 'deposit_type', label: '类型', type: 'select', required: true, options: TYPE_OPTS, defaultValue: '保证金' },
    { key: 'deposit_amount', label: '金额（元）', type: 'number', required: true, placeholder: '请输入金额' },
    { key: 'paid_date', label: '缴纳日期', required: true, placeholder: '如 2026-08-29' },
    { key: 'refund_date', label: '退还日期', placeholder: '如 2026-09-30（可选）' },
    { key: 'status', label: '状态', type: 'select', required: true, options: STATUS_OPTS, defaultValue: 'paid' },
    { key: 'remark', label: '备注', type: 'textarea', placeholder: '备注信息（可选）' },
  ];

  const handleSave = async (values: Record<string, unknown>) => {
    try {
      const payload: Record<string, unknown> = {
        ...values,
        deposit_amount: Number(values.deposit_amount) || 0,
      };
      if (!editRecord) {
        payload.deposit_no = `BZ${Date.now().toString().slice(-8)}`;
      }
      const res = editRecord
        ? await depositsApi.update(editRecord.id, payload)
        : await depositsApi.create(payload);
      if (res.code === 0) {
        toast.success(editRecord ? '保证金信息已更新' : '保证金登记成功');
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

  const rowActions = (record: Deposit) => [
    { label: '编辑', onClick: () => { setEditRecord(record); setFormOpen(true); } },
    { label: '删除', variant: 'destructive' as const, icon: <Trash2 className="size-4" />, onClick: () => setDeleteId(record.id) },
  ];

  const primaryActions = [
    { label: '新建保证金', primary: true, icon: <Plus className="size-4" />, onClick: () => { setEditRecord(null); setFormOpen(true); } },
  ];

  return (
    <>
      <ServerListPage
        title={t('保证金 & 押金')}
        description="管理客户保证金和押金"
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
        title={editRecord ? `编辑保证金：${editRecord.deposit_no}` : '新建保证金'}
        description="登记客户保证金/押金信息，带 * 为必填项"
        fields={DEPOSIT_FORM_FIELDS}
        submitLabel={editRecord ? '保存修改' : '登记保证金'}
        onSubmit={handleSave}
        initialValues={editRecord ? { ...editRecord, deposit_amount: String(editRecord.deposit_amount) } : null}
      />
    </>
  );
}
