import { useState, useMemo } from 'react';
import { t } from '@/lib/i18n';
import ServerListPage, { type FilterField, type Column } from '@/components/ServerListPage';
import StatusBadge from '@/components/StatusBadge';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatAmount, formatDateTime, formatPercent } from '@/lib/format';
import { rebatesApi } from '@/api';
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

const STATUS_OPTS = [
  { label: '待确认', value: '待确认' },
  { label: '已确认', value: '已确认' },
  { label: '已结算', value: '已结算' },
];

const PORT_OPTS = [
  { label: '巨量千川', value: '巨量千川' },
  { label: '腾讯广告', value: '腾讯广告' },
  { label: '磁力引擎', value: '磁力引擎' },
  { label: '快手广告', value: '快手广告' },
  { label: '小红书', value: '小红书' },
];

const STATUS_VARIANT: Record<string, 'default' | 'info' | 'success' | 'warning' | 'danger'> = {
  待确认: 'warning',
  已确认: 'info',
  已结算: 'success',
};

const FILTERS: FilterField[] = [
  { key: 'keyword', label: '客户/单号', type: 'input', placeholder: '搜索客户名称/单号' },
  { key: 'port', label: '端口', type: 'select', options: PORT_OPTS },
  { key: 'settle_month', label: '返点周期', type: 'input', placeholder: '如 2024-06' },
  { key: 'status', label: '状态', type: 'select', options: STATUS_OPTS },
];

interface Rebate {
  id: number;
  rebate_no: string;
  customer_name: string;
  port: string;
  settle_month: string;
  rebate_amount: number;
  rebate_ratio: number;
  status: string;
  remark: string;
  created_at: string;
}

export default function RebatePage() {
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<Rebate | null>(null);

  const table = useServerList({
    fetchFn: rebatesApi.list,
    defaultPageSize: 20,
  });

  const columns: Column<Rebate>[] = useMemo(() => [
    { key: 'rebate_no', title: '后返单号', dataIndex: 'rebate_no' as const, width: '130px' },
    { key: 'customer_name', title: '客户名称', dataIndex: 'customer_name' as const, width: '240px' },
    { key: 'port', title: '端口', dataIndex: 'port' as const, width: '110px' },
    { key: 'settle_month', title: '返点周期', dataIndex: 'settle_month' as const, width: '110px' },
    {
      key: 'rebate_amount', title: '返点金额', width: '140px', align: 'right', sortable: true,
      render: (r) => <span className="font-medium tabular-nums">{formatAmount(r.rebate_amount)}</span>,
    },
    {
      key: 'rebate_ratio', title: '返点比例', width: '110px', align: 'right',
      render: (r) => <span className="tabular-nums">{formatPercent(r.rebate_ratio)}</span>,
    },
    {
      key: 'status', title: '状态', width: '100px',
      render: (r) => {
        const s = normalizeFinanceStatus('rebate', r.status);
        return <StatusBadge status={s} variant={STATUS_VARIANT[s] || 'default'} />;
      },
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
      const res = await rebatesApi.remove(deleteId);
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

  const REBATE_FORM_FIELDS: FormFieldDef[] = [
    { key: 'customer_name', label: '客户名称', required: true, placeholder: '请输入客户名称' },
    { key: 'port', label: '端口', type: 'select', required: true, options: PORT_OPTS },
    { key: 'settle_month', label: '返点周期', required: true, placeholder: '如 2026-08' },
    { key: 'rebate_amount', label: '返点金额（元）', type: 'number', required: true, placeholder: '请输入金额' },
    { key: 'rebate_ratio', label: '返点比例（%）', type: 'number', required: true, placeholder: '如 3.5' },
    { key: 'status', label: '状态', type: 'select', required: true, options: STATUS_OPTS, defaultValue: '待确认' },
  ];

  const handleSave = async (values: Record<string, unknown>) => {
    try {
      const payload: Record<string, unknown> = {
        ...values,
        rebate_amount: Number(values.rebate_amount) || 0,
        rebate_ratio: Number(values.rebate_ratio) || 0,
      };
      if (!editRecord) {
        payload.rebate_no = `HF${Date.now().toString().slice(-8)}`;
      }
      const res = editRecord
        ? await rebatesApi.update(editRecord.id, payload)
        : await rebatesApi.create(payload);
      if (res.code === 0) {
        toast.success(editRecord ? '后返信息已更新' : '后返记录创建成功');
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

  const rowActions = (record: Rebate) => [
    { label: '编辑', onClick: () => { setEditRecord(record); setFormOpen(true); } },
    { label: '删除', variant: 'destructive' as const, icon: <Trash2 className="size-4" />, onClick: () => setDeleteId(record.id) },
  ];

  const primaryActions = [
    { label: '新建后返', primary: true, icon: <Plus className="size-4" />, onClick: () => { setEditRecord(null); setFormOpen(true); } },
  ];

  return (
    <>
      <ServerListPage
        title={t('后返管理')}
        description="管理广告渠道后返结算"
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
        title={editRecord ? `编辑后返：${editRecord.rebate_no}` : '新建后返'}
        description="登记广告渠道后返结算记录，带 * 为必填项"
        fields={REBATE_FORM_FIELDS}
        submitLabel={editRecord ? '保存修改' : '创建后返'}
        onSubmit={handleSave}
        initialValues={editRecord ? { ...editRecord, rebate_amount: String(editRecord.rebate_amount), rebate_ratio: String(editRecord.rebate_ratio) } : null}
      />
    </>
  );
}
