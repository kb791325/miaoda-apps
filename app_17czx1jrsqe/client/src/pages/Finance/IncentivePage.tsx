import { useState, useMemo } from 'react';
import { t } from '@/lib/i18n';
import ServerListPage, { type FilterField, type Column } from '@/components/ServerListPage';
import StatusBadge from '@/components/StatusBadge';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatAmount, formatDateTime } from '@/lib/format';
import { incentivesApi } from '@/api';
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
  { label: '业绩奖', value: '业绩奖' },
  { label: '开拓奖', value: '开拓奖' },
  { label: '服务奖', value: '服务奖' },
  { label: '其他', value: '其他' },
];

const STATUS_OPTS = [
  { label: '待审批', value: 'pending_approval' },
  { label: '已发放', value: 'paid' },
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
  paid: '已发放',
  rejected: '已驳回',
};

const STATUS_VARIANT: Record<string, 'default' | 'info' | 'success' | 'warning' | 'danger'> = {
  pending_approval: 'warning',
  paid: 'success',
  rejected: 'danger',
};

const FILTERS: FilterField[] = [
  { key: 'keyword', label: '员工/单号', type: 'input', placeholder: '搜索员工姓名/单号' },
  { key: 'department', label: '部门', type: 'select', options: DEPT_OPTS },
  { key: 'incentive_type', label: '激励类型', type: 'select', options: TYPE_OPTS },
  { key: 'status', label: '状态', type: 'select', options: STATUS_OPTS },
];

interface Incentive {
  id: number;
  incentive_no: string;
  customer_name: string;
  port: string;
  employee_name: string;
  department: string;
  incentive_type: string;
  incentive_amount: number;
  reason: string;
  status: string;
  created_at: string;
}

export default function IncentivePage() {
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<Incentive | null>(null);

  const table = useServerList({
    fetchFn: incentivesApi.list,
    defaultPageSize: 20,
  });

  const columns: Column<Incentive>[] = useMemo(() => [
    { key: 'incentive_no', title: '激励单号', dataIndex: 'incentive_no' as const, width: '130px' },
    { key: 'customer_name', title: '客户名称', dataIndex: 'customer_name' as const, width: '200px' },
    { key: 'port', title: '端口', dataIndex: 'port' as const, width: '110px' },
    { key: 'employee_name', title: '员工姓名', dataIndex: 'employee_name' as const, width: '120px' },
    { key: 'department', title: '部门', dataIndex: 'department' as const, width: '120px' },
    { key: 'incentive_type', title: '激励类型', dataIndex: 'incentive_type' as const, width: '110px' },
    {
      key: 'incentive_amount', title: '激励金额', width: '140px', align: 'right', sortable: true,
      render: (r) => <span className="font-medium tabular-nums text-success">{formatAmount(r.incentive_amount)}</span>,
    },
    { key: 'reason', title: '激励原因', dataIndex: 'reason' as const, width: '180px' },
    {
      key: 'status', title: '状态', width: '100px',
      render: (r) => <StatusBadge status={STATUS_MAP[r.status] || r.status} variant={STATUS_VARIANT[r.status] || 'default'} />,
    },
    {
      key: 'created_at', title: '创建时间', width: '170px', sortable: true,
      render: (r) => <span className="text-muted-foreground tabular-nums text-sm">{formatDateTime(r.created_at)}</span>,
    },
  ], []);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await incentivesApi.remove(deleteId);
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

  const INCENTIVE_FORM_FIELDS: FormFieldDef[] = [
    { key: 'employee_name', label: '员工姓名', required: true, placeholder: '请输入员工姓名' },
    { key: 'department', label: '部门', type: 'select', required: true, options: DEPT_OPTS },
    { key: 'incentive_type', label: '激励类型', type: 'select', required: true, options: TYPE_OPTS, defaultValue: '业绩奖' },
    { key: 'incentive_amount', label: '激励金额（元）', type: 'number', required: true, placeholder: '请输入金额' },
    { key: 'status', label: '状态', type: 'select', required: true, options: STATUS_OPTS, defaultValue: 'pending_approval' },
    { key: 'reason', label: '激励原因', type: 'textarea', required: true, placeholder: '请填写激励原因' },
  ];

  const handleSave = async (values: Record<string, unknown>) => {
    try {
      const payload: Record<string, unknown> = {
        ...values,
        incentive_amount: Number(values.incentive_amount) || 0,
      };
      if (!editRecord) {
        payload.incentive_no = `JL${Date.now().toString().slice(-8)}`;
      }
      const res = editRecord
        ? await incentivesApi.update(editRecord.id, payload)
        : await incentivesApi.create(payload);
      if (res.code === 0) {
        toast.success(editRecord ? '激励信息已更新' : '激励申请提交成功');
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

  const rowActions = (record: Incentive) => [
    { label: '编辑', onClick: () => { setEditRecord(record); setFormOpen(true); } },
    { label: '删除', variant: 'destructive' as const, icon: <Trash2 className="size-4" />, onClick: () => setDeleteId(record.id) },
  ];

  const primaryActions = [
    { label: '新建激励', primary: true, icon: <Plus className="size-4" />, onClick: () => { setEditRecord(null); setFormOpen(true); } },
  ];

  return (
    <>
      <ServerListPage
        title={t('激励管理')}
        description="管理员工激励奖励"
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
        title={editRecord ? `编辑激励：${editRecord.incentive_no}` : '新建激励'}
        description="提交员工激励奖励申请，带 * 为必填项"
        fields={INCENTIVE_FORM_FIELDS}
        submitLabel={editRecord ? '保存修改' : '提交申请'}
        onSubmit={handleSave}
        initialValues={editRecord ? { ...editRecord, incentive_amount: String(editRecord.incentive_amount) } : null}
      />
    </>
  );
}
