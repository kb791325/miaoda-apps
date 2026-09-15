import { useState, useMemo } from 'react';
import { t } from '@/lib/i18n';
import ServerListPage, { type FilterField, type Column } from '@/components/ServerListPage';
import StatusBadge from '@/components/StatusBadge';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatAmount, formatDateTime } from '@/lib/format';
import { deductionsApi } from '@/api';
import { normalizeFinanceStatus } from '@/api/finance-status';
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
  { label: '违规扣减', value: '违规扣减' },
  { label: '差异扣减', value: '差异扣减' },
  { label: '其他扣减', value: '其他扣减' },
  { label: '政策扣减', value: '政策扣减' },
];

const PORT_OPTS = [
  { label: '巨量千川', value: '巨量千川' },
  { label: '腾讯广告', value: '腾讯广告' },
  { label: '磁力引擎', value: '磁力引擎' },
  { label: '快手广告', value: '快手广告' },
  { label: '小红书', value: '小红书' },
];

const STATUS_VARIANT: Record<string, 'default' | 'info' | 'success' | 'warning' | 'danger'> = {
  待处理: 'warning',
  已扣减: 'success',
};

const FILTERS: FilterField[] = [
  { key: 'keyword', label: '客户/主体/单号', type: 'input', placeholder: '搜索客户名称/主体/单号' },
  { key: 'port', label: '端口', type: 'select', options: PORT_OPTS },
  { key: 'deduction_type', label: '扣减类型', type: 'select', options: TYPE_OPTS },
  { key: 'status', label: '状态', type: 'select', options: [{ label: '待处理', value: '待处理' }, { label: '已扣减', value: '已扣减' }] },
];

interface Deduction {
  id: number;
  deduction_no: string;
  customer_name: string;
  entity_name: string;
  port: string;
  deduction_amount: number;
  deduction_type: string;
  deduction_reason: string;
  status: string;
  operator: string;
  created_at: string;
}

export default function DeductionPage() {
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<Deduction | null>(null);

  const table = useServerList({
    fetchFn: deductionsApi.list,
    defaultPageSize: 20,
  });

  const columns: Column<Deduction>[] = useMemo(() => [
    { key: 'deduction_no', title: '扣减单号', dataIndex: 'deduction_no' as const, width: '130px' },
    { key: 'customer_name', title: '客户名称', dataIndex: 'customer_name' as const, width: '240px' },
    { key: 'entity_name', title: '主体名称', dataIndex: 'entity_name' as const, width: '200px' },
    { key: 'port', title: '端口', dataIndex: 'port' as const, width: '110px' },
    {
      key: 'deduction_amount', title: '扣减金额', width: '140px', align: 'right', sortable: true,
      render: (r) => <span className="font-medium tabular-nums text-destructive">{formatAmount(r.deduction_amount)}</span>,
    },
    { key: 'deduction_type', title: '扣减类型', dataIndex: 'deduction_type' as const, width: '120px' },
    { key: 'deduction_reason', title: '扣减原因', dataIndex: 'deduction_reason' as const, width: '160px' },
    {
      key: 'status', title: '状态', width: '100px',
      render: (r) => {
        const s = normalizeFinanceStatus('deduction', r.status);
        return <StatusBadge status={s} variant={STATUS_VARIANT[s] || 'default'} />;
      },
    },
    { key: 'operator', title: '操作人', dataIndex: 'operator' as const, width: '100px' },
    {
      key: 'created_at', title: '创建时间', width: '170px', sortable: true,
      render: (r) => <span className="text-muted-foreground tabular-nums text-sm">{formatDateTime(r.created_at)}</span>,
    },
  ], []);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await deductionsApi.remove(deleteId);
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

  const DEDUCTION_FORM_FIELDS: FormFieldDef[] = [
    { key: 'customer_name', label: '客户名称', required: true, placeholder: '请输入客户名称' },
    { key: 'entity_name', label: '主体名称', required: true, placeholder: '请输入主体名称' },
    { key: 'port', label: '端口', type: 'select', required: true, options: PORT_OPTS },
    { key: 'deduction_type', label: '扣减类型', type: 'select', required: true, options: TYPE_OPTS, defaultValue: '违规扣减' },
    { key: 'deduction_amount', label: '扣减金额（元）', type: 'number', required: true, placeholder: '请输入金额' },
    { key: 'status', label: '状态', type: 'select', required: true, options: [
      { label: '待处理', value: '待处理' },
      { label: '已扣减', value: '已扣减' },
    ], defaultValue: '待处理' },
    { key: 'deduction_reason', label: '扣减原因', type: 'textarea', required: true, placeholder: '请填写扣减原因' },
  ];

  const handleSave = async (values: Record<string, unknown>) => {
    try {
      const payload: Record<string, unknown> = {
        ...values,
        deduction_amount: Number(values.deduction_amount) || 0,
      };
      if (!editRecord) {
        payload.deduction_no = `KJ${Date.now().toString().slice(-8)}`;
      }
      const res = editRecord
        ? await deductionsApi.update(editRecord.id, payload)
        : await deductionsApi.create(payload);
      if (res.code === 0) {
        toast.success(editRecord ? '扣减信息已更新' : '扣减记录创建成功');
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

  const rowActions = (record: Deduction) => [
    { label: '编辑', onClick: () => { setEditRecord(record); setFormOpen(true); } },
    { label: '删除', variant: 'destructive' as const, icon: <Trash2 className="size-4" />, onClick: () => setDeleteId(record.id) },
  ];

  const primaryActions = [
    { label: '新建扣减', primary: true, icon: <Plus className="size-4" />, onClick: () => { setEditRecord(null); setFormOpen(true); } },
  ];

  return (
    <>
      <ServerListPage
        title={t('扣减管理')}
        description="管理客户账户扣减记录"
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
        title={editRecord ? `编辑扣减：${editRecord.deduction_no}` : '新建扣减'}
        description="登记客户账户扣减记录，带 * 为必填项"
        fields={DEDUCTION_FORM_FIELDS}
        submitLabel={editRecord ? '保存修改' : '创建扣减'}
        onSubmit={handleSave}
        initialValues={editRecord ? { ...editRecord, deduction_amount: String(editRecord.deduction_amount) } : null}
      />
    </>
  );
}
