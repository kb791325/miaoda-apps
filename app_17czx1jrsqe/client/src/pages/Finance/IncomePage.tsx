import { useState, useMemo } from 'react';
import { t } from '@/lib/i18n';
import ServerListPage, { type FilterField, type ActionButton, type Column } from '@/components/ServerListPage';
import StatusBadge from '@/components/StatusBadge';
import { ProtectedAmount } from '@/components/ProtectedField';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatAmount, formatDateTime } from '@/lib/format';
import { exportRowsToCsv } from '@/lib/export';
import { incomesApi } from '@/api';
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
import type { Income } from '@/api/types';
import FieldFormDialog, { type FormFieldDef } from '@/components/FieldFormDialog';

const TYPE_OPTS = [
  { label: '广告收入', value: '广告收入' },
  { label: '视频收入', value: '视频收入' },
  { label: '服务收入', value: '服务收入' },
];

const FILTERS: FilterField[] = [
  { key: 'income_type', label: '收入类型', type: 'select', options: TYPE_OPTS },
  { key: 'receipt_status', label: '收款状态', type: 'select', options: [
    { label: '待收款', value: 'pending' },
    { label: '已收款', value: 'received' },
  ]},
];

const STATUS_MAP: Record<string, string> = {
  pending: '待收款',
  received: '已收款',
};

const STATUS_VARIANT: Record<string, 'default' | 'info' | 'success' | 'warning' | 'danger'> = {
  pending: 'warning',
  received: 'success',
};

export default function IncomePage() {
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<Income | null>(null);
  const { isVisible } = useFieldPermission();

  const table = useServerList({
    fetchFn: incomesApi.list,
    defaultPageSize: 20,
  });

  const columns: Column<any>[] = useMemo(() => [
    { key: 'income_no', title: '收入编号', dataIndex: 'income_no' as const, width: '160px' },
    {
      key: 'income_type',
      title: '收入类型',
      dataIndex: 'income_type' as const,
      width: '110px',
      render: (r) => <StatusBadge status={r.income_type} variant="success" />,
    },
    { key: 'customer_name', title: '客户名称', dataIndex: 'customer_name' as const, width: '240px' },
    ...(isVisible('finance.income_amount') ? [{
      key: 'amount' as const,
      title: '金额',
      width: '140px',
      align: 'right' as const,
      sortable: true,
      render: (r: Income) => (
        <ProtectedAmount
          fieldKey="finance.income_amount"
          value={r.amount}
          className="font-semibold text-emerald-600"
        />
      ),
    }] : []),
    {
      key: 'receipt_status',
      title: '收款状态',
      width: '100px',
      render: (r) => (
        <StatusBadge status={STATUS_MAP[r.receipt_status] || r.receipt_status} variant={STATUS_VARIANT[r.receipt_status] || 'default'} />
      ),
    },
    {
      key: 'income_date',
      title: '收入日期',
      dataIndex: 'income_date' as const,
      width: '120px',
      sortable: true,
      render: (r) => r.income_date?.slice(0, 10) || '-',
    },
    { key: 'remark', title: '备注', dataIndex: 'remark' as const, width: '180px' },
    {
      key: 'created_at',
      title: '创建时间',
      dataIndex: 'created_at' as const,
      width: '160px',
      render: (r) => formatDateTime(r.created_at),
    },
  ], []);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await incomesApi.remove(deleteId);
      if (res.code === 0) {
        toast.success('删除成功');
        setDeleteId(null);
        table.refresh();
      } else {
        toast.error(res.message || '删除失败');
      }
    } catch (e) {
      toast.error('删除失败');
    }
  };

  const INCOME_FORM_FIELDS: FormFieldDef[] = [
    { key: 'income_type', label: '收入类型', type: 'select', required: true, options: TYPE_OPTS },
    { key: 'customer_name', label: '客户名称', required: true, placeholder: '请输入客户名称' },
    { key: 'amount', label: '收入金额（元）', type: 'number', required: true, placeholder: '请输入金额' },
    {
      key: 'receipt_status', label: '收款状态', type: 'select', required: true,
      options: [
        { label: '已收款', value: 'received' },
        { label: '待收款', value: 'pending' },
      ],
    },
    { key: 'income_date', label: '收入日期', required: true, placeholder: '如 2026-08-29' },
    { key: 'remark', label: '备注', type: 'textarea', placeholder: '收入备注（可选）' },
  ];

  const handleSubmitIncome = async (values: Record<string, unknown>) => {
    try {
      const payload = { ...values, amount: Number(values.amount) || 0 };
      const res = editRecord
        ? await incomesApi.update(editRecord.id, payload)
        : await incomesApi.create(payload);
      if (res.code === 0) {
        toast.success(editRecord ? '收入修改成功' : '收入登记成功');
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

  const primaryActions: ActionButton[] = [
    { label: '登记收入', primary: true, icon: <Plus className="size-3.5" />, onClick: () => { setEditRecord(null); setFormOpen(true); } },
    {
      label: '导出',
      onClick: () => exportRowsToCsv('收入列表', [
        { key: 'income_type', label: '收入类型' },
        { key: 'customer_name', label: '客户名称' },
        { key: 'amount', label: '收入金额' },
        { key: 'receipt_status', label: '收款状态' },
        { key: 'income_date', label: '收入日期' },
        { key: 'remark', label: '备注' },
        { key: 'created_at', label: '创建时间' },
      ], table.data as Income[]),
    },
  ];

  const rowActions = (record: Income): ActionButton[] => [
    { label: '编辑', onClick: () => { setEditRecord(record); setFormOpen(true); } },
    { label: '删除', onClick: () => setDeleteId(record.id) },
  ];

  return (
    <>
      <ServerListPage<any>
        title={t('收入管理')}
        description="管理公司各项收入"
        data={table.data as any[]}
        total={table.total}
        loading={table.loading}
        columns={columns as any}
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
              删除后将无法恢复，确定要删除该收入记录吗？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleDelete}>
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <FieldFormDialog
        open={formOpen}
        onOpenChange={(o) => { setFormOpen(o); if (!o) setEditRecord(null); }}
        title={editRecord ? '编辑收入' : '登记收入'}
        description={editRecord ? '修改收入信息后提交生效' : '登记新的收入记录'}
        fields={INCOME_FORM_FIELDS}
        initialValues={editRecord ? {
          income_type: editRecord.income_type,
          customer_name: editRecord.customer_name,
          amount: String(editRecord.amount),
          receipt_status: (editRecord as any).receipt_status,
          income_date: editRecord.income_date?.slice(0, 10) || '',
          remark: editRecord.remark || '',
        } : undefined}
        submitLabel={editRecord ? '保存修改' : '确认登记'}
        onSubmit={handleSubmitIncome}
      />
    </>
  );
}
