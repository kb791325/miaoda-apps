import { useState, useMemo } from 'react';
import { t } from '@/lib/i18n';
import ServerListPage, { type FilterField, type ActionButton, type Column } from '@/components/ServerListPage';
import StatusBadge from '@/components/StatusBadge';
import { ProtectedAmount } from '@/components/ProtectedField';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatAmount, formatDateTime } from '@/lib/format';
import { exportRowsToCsv } from '@/lib/export';
import { costsApi } from '@/api';
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
import type { Cost } from '@/api/types';
import FieldFormDialog, { type FormFieldDef } from '@/components/FieldFormDialog';

const TYPE_OPTS = [
  { label: '媒体成本', value: '媒体成本' },
  { label: '人力成本', value: '人力成本' },
  { label: '外包成本', value: '外包成本' },
  { label: '其他', value: '其他' },
];

const DEPT_OPTS = [
  { label: '商务一部', value: '商务一部' },
  { label: '商务二部', value: '商务二部' },
  { label: '商务三部', value: '商务三部' },
  { label: '财务部', value: '财务部' },
  { label: '行政部', value: '行政部' },
];

const FILTERS: FilterField[] = [
  { key: 'cost_type', label: '成本类型', type: 'select', options: TYPE_OPTS },
  { key: 'department', label: '部门', type: 'select', options: DEPT_OPTS },
];

export default function CostPage() {
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<Cost | null>(null);
  const { isVisible } = useFieldPermission();

  const table = useServerList({
    fetchFn: costsApi.list,
    defaultPageSize: 20,
  });

  const columns: Column<any>[] = useMemo(() => [
    { key: 'cost_no', title: '成本编号', dataIndex: 'cost_no' as const, width: '160px' },
    {
      key: 'cost_type',
      title: '成本类型',
      dataIndex: 'cost_type' as const,
      width: '110px',
      render: (r) => <StatusBadge status={r.cost_type} variant="info" />,
    },
    { key: 'related_customer', title: '关联客户/项目', dataIndex: 'related_customer' as const, width: '240px' },
    ...(isVisible('finance.cost_amount') ? [{
      key: 'amount' as const,
      title: '金额',
      width: '140px',
      align: 'right' as const,
      sortable: true,
      render: (r: Cost) => <ProtectedAmount fieldKey="finance.cost_amount" value={r.amount} className="font-semibold" />,
    }] : []),
    { key: 'department', title: '部门', dataIndex: 'department' as const, width: '120px' },
    {
      key: 'occur_date',
      title: '发生日期',
      dataIndex: 'occur_date' as const,
      width: '120px',
      sortable: true,
      render: (r) => r.occur_date?.slice(0, 10) || '-',
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
      const res = await costsApi.remove(deleteId);
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

  const COST_FORM_FIELDS: FormFieldDef[] = [
    { key: 'cost_type', label: '成本类型', type: 'select', required: true, options: TYPE_OPTS },
    { key: 'related_customer', label: '关联客户/项目', required: true, placeholder: '请输入关联客户或项目' },
    { key: 'department', label: '部门', type: 'select', required: true, options: DEPT_OPTS },
    { key: 'amount', label: '成本金额（元）', type: 'number', required: true, placeholder: '请输入金额' },
    { key: 'occur_date', label: '发生日期', required: true, placeholder: '如 2026-08-29' },
    { key: 'remark', label: '备注', type: 'textarea', placeholder: '成本备注（可选）' },
  ];

  const handleSubmitCost = async (values: Record<string, unknown>) => {
    try {
      const payload = { ...values, amount: Number(values.amount) || 0 };
      const res = editRecord
        ? await costsApi.update(editRecord.id, payload)
        : await costsApi.create(payload);
      if (res.code === 0) {
        toast.success(editRecord ? '成本修改成功' : '成本登记成功');
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
    { label: '登记成本', primary: true, icon: <Plus className="size-3.5" />, onClick: () => { setEditRecord(null); setFormOpen(true); } },
    {
      label: '导出',
      onClick: () => exportRowsToCsv('成本列表', [
        { key: 'cost_type', label: '成本类型' },
        { key: 'related_customer', label: '关联对象' },
        { key: 'amount', label: '金额' },
        { key: 'department', label: '部门' },
        { key: 'occur_date', label: '发生日期' },
        { key: 'remark', label: '备注' },
        { key: 'created_at', label: '创建时间' },
      ], table.data as Cost[]),
    },
  ];

  const rowActions = (record: Cost): ActionButton[] => [
    { label: '编辑', onClick: () => { setEditRecord(record); setFormOpen(true); } },
    { label: '删除', onClick: () => setDeleteId(record.id) },
  ];

  return (
    <>
      <ServerListPage<any>
        title={t('成本管理')}
        description="管理公司各项成本支出"
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
              删除后将无法恢复，确定要删除该成本记录吗？
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
        title={editRecord ? '编辑成本' : '登记成本'}
        description={editRecord ? '修改成本信息后提交生效' : '登记新的成本记录'}
        fields={COST_FORM_FIELDS}
        initialValues={editRecord ? {
          cost_type: editRecord.cost_type,
          related_customer: editRecord.related_customer || '',
          department: editRecord.department || '',
          amount: String(editRecord.amount),
          occur_date: editRecord.occur_date?.slice(0, 10) || '',
          remark: editRecord.remark || '',
        } : undefined}
        submitLabel={editRecord ? '保存修改' : '确认登记'}
        onSubmit={handleSubmitCost}
      />
    </>
  );
}
