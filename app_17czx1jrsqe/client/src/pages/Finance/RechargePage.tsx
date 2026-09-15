import { useState, useMemo } from 'react';
import { useActionLock } from '@/hooks/useActionLock';
import { extractErrorMessage, validateRecordId } from '@/lib/error-utils';
import { t } from '@/lib/i18n';
import ServerListPage, { type FilterField, type ActionButton, type Column } from '@/components/ServerListPage';
import StatusBadge from '@/components/StatusBadge';
import { Plus, Trash2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { formatAmount, formatDateTime } from '@/lib/format';
import { exportRowsToCsv } from '@/lib/export';
import { rechargesApi } from '@/api';
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
import type { Recharge } from '@/api/types';
import FieldFormDialog, { type FormFieldDef } from '@/components/FieldFormDialog';

const STATUS_OPTS = [
  { label: '充值中', value: 'pending' },
  { label: '已到账', value: 'arrived' },
  { label: '充值失败', value: 'failed' },
];

const PORT_OPTS = [
  { label: '巨量千川', value: '巨量千川' },
  { label: '腾讯广告', value: '腾讯广告' },
  { label: '磁力引擎', value: '磁力引擎' },
  { label: '百度营销', value: '百度营销' },
];

const STATUS_MAP: Record<string, string> = {
  pending: '充值中',
  arrived: '已到账',
  failed: '充值失败',
};

const STATUS_VARIANT: Record<string, 'default' | 'info' | 'success' | 'warning' | 'danger'> = {
  pending: 'warning',
  arrived: 'success',
  failed: 'danger',
};

const FILTERS: FilterField[] = [
  { key: 'customer_name', label: '客户名称', type: 'input', placeholder: '客户名称' },
  { key: 'port', label: '端口', type: 'select', options: PORT_OPTS },
  { key: 'status', label: '充值状态', type: 'select', options: STATUS_OPTS },
];

export default function RechargePage() {
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const { withLock: withDeleteLock, locked: deleteLocked } = useActionLock();
  const { withLock: withOpLock, locked: opLocked } = useActionLock();

  const table = useServerList({
    fetchFn: rechargesApi.list,
    defaultPageSize: 20,
  });

  const columns: Column<Recharge>[] = useMemo(() => [
    { key: 'recharge_no', title: '充值编号', dataIndex: 'recharge_no' as const, width: '150px', sortable: true },
    { key: 'customer_name', title: '客户名称', dataIndex: 'customer_name' as const, width: '220px' },
    { key: 'entity_name', title: '主体名称', dataIndex: 'entity_name' as const, width: '200px' },
    { key: 'port', title: '端口', dataIndex: 'port' as const, width: '110px' },
    {
      key: 'recharge_amount',
      title: '充值金额',
      width: '130px',
      align: 'right',
      render: (r) => <span className="tabular-nums">{formatAmount(r.recharge_amount)}</span>,
    },
    {
      key: 'bonus_amount',
      title: '赠款金额',
      width: '120px',
      align: 'right',
      render: (r) => <span className="tabular-nums text-emerald-600">{formatAmount(r.bonus_amount)}</span>,
    },
    {
      key: 'arrived_amount',
      title: '到账金额',
      width: '130px',
      align: 'right',
      sortable: true,
      render: (r) => <span className="tabular-nums font-semibold">{formatAmount(r.arrived_amount)}</span>,
    },
    {
      key: 'status',
      title: '状态',
      width: '100px',
      render: (r) => {
        const s = normalizeFinanceStatus('recharge', r.status);
        return <StatusBadge status={STATUS_MAP[s] || s} variant={STATUS_VARIANT[s] || 'default'} />;
      },
    },
    {
      key: 'recharged_at',
      title: '充值时间',
      dataIndex: 'recharged_at' as const,
      width: '160px',
      sortable: true,
      render: (r) => (r.recharged_at ? formatDateTime(r.recharged_at) : '-'),
    },
  ], []);

  const handleArrive = async (record: Recharge) => {
    await withOpLock(async () => {
      const id = validateRecordId(record);
      if (!id) { toast.warning('记录标识缺失，请刷新后重试'); return; }
      try {
        const res = await rechargesApi.update(id, { status: 'arrived' });
        if (res.code === 0) {
          toast.success('已确认到账');
          table.refresh();
        } else {
          toast.error(res.message || '操作失败');
        }
      } catch (e) {
        toast.error(extractErrorMessage(e));
      }
    });
  };

  const handleDelete = async () => {
    await withDeleteLock(async () => {
      if (!deleteId) return;
      const id = validateRecordId({ id: deleteId });
      if (!id) { toast.warning('记录标识缺失，请刷新后重试'); setDeleteId(null); return; }
      try {
        const res = await rechargesApi.remove(id);
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

  const RECHARGE_FORM_FIELDS: FormFieldDef[] = [
    { key: 'customer_name', label: '客户名称', required: true, placeholder: '请输入客户名称' },
    { key: 'entity_name', label: '主体名称', required: true, placeholder: '请输入主体名称' },
    { key: 'port', label: '端口', type: 'select', required: true, options: PORT_OPTS },
    { key: 'recharge_amount', label: '充值金额（元）', type: 'number', required: true, placeholder: '请输入充值金额' },
    {
      key: 'recharge_method', label: '充值方式', type: 'select', required: true,
      options: [
        { label: '银行转账', value: '银行转账' },
        { label: '对公账户', value: '对公账户' },
        { label: '第三方支付', value: '第三方支付' },
      ],
    },
    { key: 'recharged_at', label: '充值时间', type: 'datetime', placeholder: '选择充值时间' },
  ];

  const handleCreateRecharge = async (values: Record<string, unknown>) => {
    try {
      const payload: Record<string, unknown> = {
        ...values,
        recharge_amount: Number(values.recharge_amount) || 0,
        status: 'pending',
      };
      if (values.recharged_at && typeof values.recharged_at === 'string' && values.recharged_at.length > 0) {
        payload.recharged_at = new Date(values.recharged_at as string).getTime();
      }
      const res = await rechargesApi.create(payload);
      if (res.code === 0) {
        toast.success('充值登记成功，待确认到账');
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
    { label: '新增充值', primary: true, icon: <Plus className="size-3.5" />, onClick: () => setFormOpen(true) },
    {
      label: '导出',
      onClick: () => exportRowsToCsv('充值列表', [
        { key: 'recharge_no', label: '充值单号' },
        { key: 'customer_name', label: '客户名称' },
        { key: 'entity_name', label: '主体名称' },
        { key: 'port', label: '端口' },
        { key: 'recharge_amount', label: '充值金额' },
        { key: 'bonus_amount', label: '赠款金额' },
        { key: 'arrived_amount', label: '到账金额' },
        { key: 'status', label: '状态' },
        { key: 'created_at', label: '创建时间' },
      ], table.data as Recharge[]),
    },
  ];

  const rowActions = (record: Recharge): ActionButton[] => {
    const actions: ActionButton[] = [];
    if (normalizeFinanceStatus('recharge', record.status) === 'pending') {
      actions.push({ label: '确认到账', onClick: () => handleArrive(record) });
    }
    actions.push({ label: '删除', onClick: () => setDeleteId(record.id) });
    return actions;
  };

  return (
    <>
      <ServerListPage<Recharge>
        title={t('充值管理')}
        description="管理客户账户充值记录"
        data={table.data as Recharge[]}
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
              删除后将无法恢复，确定要删除该充值记录吗？
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
        title={t('新增充值')}
        description="登记客户充值信息，提交后进入充值中状态"
        fields={RECHARGE_FORM_FIELDS}
        submitLabel="确认登记"
        onSubmit={handleCreateRecharge}
      />
    </>
  );
}
