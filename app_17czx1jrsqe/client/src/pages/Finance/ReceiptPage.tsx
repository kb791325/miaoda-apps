import { useState, useMemo, useEffect } from 'react';
import { useActionLock } from '@/hooks/useActionLock';
import { extractErrorMessage, validateRecordId } from '@/lib/error-utils';
import { t } from '@/lib/i18n';
import { useSearchParams } from 'react-router-dom';
import ServerListPage, { type FilterField, type ActionButton, type Column } from '@/components/ServerListPage';
import StatusBadge from '@/components/StatusBadge';
import FieldFormDialog, { type FormFieldDef } from '@/components/FieldFormDialog';
import { Plus, Trash2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { formatAmount, formatDateTime } from '@/lib/format';
import { exportRowsToCsv } from '@/lib/export';
import { receiptsApi } from '@/api';
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


const STATUS_OPTS = [
  { label: '待确认', value: 'pending' },
  { label: '已确认', value: 'confirmed' },
  { label: '已核销', value: 'written_off' },
];

const METHOD_OPTS = [
  { label: '银行转账', value: '银行转账' },
  { label: '支付宝', value: '支付宝' },
  { label: '微信', value: '微信' },
  { label: '现金', value: '现金' },
];

const STATUS_MAP: Record<string, string> = {
  pending: '待确认',
  confirmed: '已确认',
  written_off: '已核销',
};

const STATUS_VARIANT: Record<string, 'default' | 'info' | 'success' | 'warning' | 'danger'> = {
  pending: 'warning',
  confirmed: 'info',
  written_off: 'success',
};

const FILTERS: FilterField[] = [
  { key: 'customer_name', label: '客户名称', type: 'input', placeholder: '客户名称' },
  { key: 'status', label: '收款状态', type: 'select', options: STATUS_OPTS },
  { key: 'receipt_method', label: '收款方式', type: 'select', options: METHOD_OPTS, advanced: true },
];

export default function ReceiptPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const { withLock: withDeleteLock, locked: deleteLocked } = useActionLock();
  const { withLock: withOpLock, locked: opLocked } = useActionLock();

  const table = useServerList({
    fetchFn: receiptsApi.list,
    defaultPageSize: 20,
  });

  const columns: Column<any>[] = useMemo(() => [
    { key: 'receipt_no', title: '收款编号', dataIndex: 'receipt_no' as const, width: '150px' },
    { key: 'customer_name', title: '客户名称', dataIndex: 'customer_name' as const, width: '240px' },
    {
      key: 'receipt_amount',
      title: '收款金额',
      width: '140px',
      align: 'right',
      sortable: true,
      render: (r) => <span className="tabular-nums font-semibold">{formatAmount(r.receipt_amount)}</span>,
    },
    { key: 'receipt_method', title: '收款方式', dataIndex: 'receipt_method' as const, width: '110px' },
    { key: 'receipt_account', title: '收款账户', dataIndex: 'receipt_account' as const, width: '150px' },
    {
      key: 'status',
      title: '状态',
      width: '100px',
      render: (r) => (
        <StatusBadge status={STATUS_MAP[r.status] || r.status} variant={STATUS_VARIANT[r.status] || 'default'} />
      ),
    },
    {
      key: 'created_at',
      title: '收款时间',
      dataIndex: 'created_at' as const,
      width: '160px',
      sortable: true,
      render: (r) => (r.created_at ? formatDateTime(r.created_at) : '-'),
    },
  ], []);

  const RECEIPT_FORM_FIELDS: FormFieldDef[] = [
    { key: 'customer_name', label: '客户名称', required: true },
    { key: 'receipt_amount', label: '收款金额', type: 'number', required: true },
    { key: 'receipt_method', label: '收款方式', type: 'select', options: METHOD_OPTS, defaultValue: '银行转账' },
    { key: 'receipt_account', label: '收款账户' },
    { key: 'remark', label: '备注', type: 'textarea', fullWidth: true },
  ];

  useEffect(() => {
    const draft = searchParams.get('draft');
    if (draft?.startsWith('receipt:')) {
      setFormOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete('draft');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleCreate = async (values: Record<string, unknown>) => {
    try {
      const res = await receiptsApi.create(values);
      if (res.code === 0) {
        toast.success('收款登记成功');
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

  const handleConfirm = async (record: any) => {
    await withOpLock(async () => {
      const id = validateRecordId(record);
      if (!id) { toast.warning('记录标识缺失，请刷新后重试'); return; }
      try {
        const res = await receiptsApi.update(id, { status: 'confirmed' });
        if (res.code === 0) {
          toast.success('已确认收款');
          table.refresh();
        } else {
          toast.error(res.message || '操作失败');
        }
      } catch (e) {
        toast.error(extractErrorMessage(e));
      }
    });
  };

  const handleReconcile = async (record: any) => {
    await withOpLock(async () => {
      const id = validateRecordId(record);
      if (!id) { toast.warning('记录标识缺失，请刷新后重试'); return; }
      try {
        const res = await receiptsApi.update(id, { status: 'written_off' });
        if (res.code === 0) {
          toast.success('已核销');
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
        const res = await receiptsApi.remove(id);
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

  const handleBatchConfirm = async () => {
    const targets = (table.data as any[]).filter((r: any) => selectedKeys.includes(String(r.id)) && r.status === 'pending');
    if (targets.length === 0) {
      toast.error('请先勾选待确认状态的收款记录');
      return;
    }
    let ok = 0;
    for (const r of targets) {
      const res = await receiptsApi.update(r.id, { status: 'confirmed' });
      if (res.code === 0) ok++;
    }
    toast.success(`批量确认成功 ${ok} 条`);
    setSelectedKeys([]);
    table.refresh();
  };

  const primaryActions: ActionButton[] = [
    { label: '登记收款', primary: true, icon: <Plus className="size-3.5" />, onClick: () => setFormOpen(true) },
    { label: '批量确认', onClick: handleBatchConfirm },
    {
      label: '导出',
      onClick: () => exportRowsToCsv('收款列表', [
        { key: 'receipt_no', label: '收款单号' },
        { key: 'customer_name', label: '客户名称' },
        { key: 'receipt_amount', label: '收款金额' },
        { key: 'receipt_method', label: '收款方式' },
        { key: 'receipt_account', label: '收款账户' },
        { key: 'status', label: '状态' },
        { key: 'created_at', label: '收款时间' },
      ], table.data as any[]),
    },
  ];

  const rowActions = (record: any): ActionButton[] => {
    const actions: ActionButton[] = [];
    if (record.status === 'pending') {
      actions.push({ label: '确认收款', onClick: () => handleConfirm(record) });
    }
    if (record.status === 'confirmed') {
      actions.push({ label: '核销', onClick: () => handleReconcile(record) });
    }
    actions.push({ label: '删除', onClick: () => setDeleteId(record.id) });
    return actions;
  };

  return (
    <>
      <ServerListPage<any>
        title={t('收款管理')}
        description="管理客户收款记录，确认和核销收款"
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

      {/* 登记收款弹窗 */}
      <FieldFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={t('登记收款')}
        description="填写收款信息，带 * 为必填项"
        fields={RECEIPT_FORM_FIELDS}
        submitLabel="登记"
        onSubmit={handleCreate}
        draft={{ formType: 'receipt', summaryField: 'customer_name' }}
        confirmSubmit={{
          amountField: 'receipt_amount',
          summaryFields: [{ key: 'customer_name', label: '客户名称' }, { key: 'receipt_method', label: '收款方式' }],
          title: '确认登记收款',
        }}
      />

      <AlertDialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              删除后将无法恢复，确定要删除该收款记录吗？
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
    </>
  );
}
