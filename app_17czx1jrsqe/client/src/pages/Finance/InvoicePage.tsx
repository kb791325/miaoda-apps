import { useState, useMemo, useCallback } from 'react';
import { useActionLock } from '@/hooks/useActionLock';
import { extractErrorMessage, validateRecordId } from '@/lib/error-utils';
import { t } from '@/lib/i18n';
import ServerListPage, { type FilterField, type ActionButton, type Column } from '@/components/ServerListPage';
import StatusBadge from '@/components/StatusBadge';
import { Plus, Trash2, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { formatAmount, formatDateTime, formatPercent } from '@/lib/format';
import { invoicesApi } from '@/api';
import { useServerList } from '@/hooks/useServerList';
import { useSystemSettings } from '@/hooks/useSystemSettings';
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
import type { Invoice } from '@/api/types';
import FieldFormDialog, { type FormFieldDef } from '@/components/FieldFormDialog';

const STATUS_OPTS = [
  { label: '待开', value: 'pending' },
  { label: '已开', value: 'issued' },
  { label: '已寄', value: 'shipped' },
  { label: '已收', value: 'received' },
];

const TYPE_OPTS = [
  { label: '增值税专票', value: '增值税专票' },
  { label: '增值税普票', value: '增值税普票' },
];

const STATUS_MAP: Record<string, string> = {
  pending: '待开',
  issued: '已开',
  shipped: '已寄',
  received: '已收',
};

const STATUS_VARIANT: Record<string, 'default' | 'info' | 'success' | 'warning' | 'danger'> = {
  pending: 'warning',
  issued: 'info',
  shipped: 'info',
  received: 'success',
};

const FILTERS: FilterField[] = [
  { key: 'customer_name', label: '客户名称', type: 'input', placeholder: '客户名称' },
  { key: 'invoice_type', label: '发票类型', type: 'select', options: TYPE_OPTS },
  { key: 'status', label: '开票状态', type: 'select', options: STATUS_OPTS },
];

export default function InvoicePage() {
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [calc, setCalc] = useState<{ amount: number; rate: number }>({ amount: 0, rate: 6 });

  const { settings } = useSystemSettings('tax');
  const defaultTaxRate = Number(settings.vat_rate) || 6;

  const { withLock: withDeleteLock, locked: deleteLocked } = useActionLock();
  const { withLock: withOpLock, locked: opLocked } = useActionLock();

  const table = useServerList({
    fetchFn: invoicesApi.list,
    defaultPageSize: 20,
  });

  const nextStatus: Record<string, { label: string; status: string }> = {
    pending: { label: '开具发票', status: 'issued' },
    issued: { label: '标记寄出', status: 'shipped' },
    shipped: { label: '确认签收', status: 'received' },
  };

  const handleStatusFlow = async (record: Invoice) => {
    await withOpLock(async () => {
      const next = nextStatus[record.status];
      if (!next) return;
      const id = validateRecordId(record);
      if (!id) { toast.warning('记录标识缺失，请刷新后重试'); return; }
      try {
        const res = await invoicesApi.update(id, { status: next.status });
        if (res.code === 0) {
          toast.success(`${next.label}成功`);
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
        const res = await invoicesApi.remove(id);
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

  const columns: Column<Invoice>[] = useMemo(() => [
    { key: 'invoice_no', title: '发票编号', dataIndex: 'invoice_no' as const, width: '150px' },
    { key: 'customer_name', title: '客户名称', dataIndex: 'customer_name' as const, width: '220px' },
    { key: 'invoice_type', title: '发票类型', dataIndex: 'invoice_type' as const, width: '110px' },
    {
      key: 'invoice_amount',
      title: '发票金额',
      width: '130px',
      align: 'right',
      sortable: true,
      render: (r) => <span className="tabular-nums font-semibold">{formatAmount(r.invoice_amount)}</span>,
    },
    {
      key: 'tax_rate',
      title: '税率',
      width: '80px',
      align: 'right',
      render: (r) => formatPercent(r.tax_rate, 0),
    },
    {
      key: 'tax_amount',
      title: '税额',
      width: '120px',
      align: 'right',
      render: (r) => <span className="tabular-nums">{formatAmount(r.tax_amount)}</span>,
    },
    { key: 'title', title: '抬头', dataIndex: 'title' as const, width: '180px' },
    {
      key: 'status',
      title: '状态',
      width: '90px',
      render: (r) => (
        <StatusBadge status={STATUS_MAP[r.status] || r.status} variant={STATUS_VARIANT[r.status] || 'default'} />
      ),
    },
    {
      key: 'invoice_date',
      title: '开票时间',
      dataIndex: 'invoice_date' as const,
      width: '130px',
      sortable: true,
      render: (r) => r.invoice_date?.slice(0, 10) || '-',
    },
  ], []);

  const INVOICE_FORM_FIELDS: FormFieldDef[] = useMemo(() => [
    {
      key: 'invoice_type', label: '发票类型', type: 'select', required: true,
      options: TYPE_OPTS,
    },
    { key: 'customer_name', label: '客户名称', required: true, placeholder: '请输入客户名称' },
    { key: 'title', label: '发票抬头', required: true, placeholder: '请输入发票抬头' },
    { key: 'invoice_amount', label: '含税金额（元）', type: 'number', required: true, placeholder: '请输入金额' },
    { key: 'tax_rate', label: '税率(%)', type: 'number', required: true, defaultValue: defaultTaxRate },
  ], [defaultTaxRate]);

  const handleFormValuesChange = useCallback((values: Record<string, unknown>, key: string) => {
    if (key !== 'invoice_amount' && key !== 'tax_rate') return;
    setCalc({ amount: Number(values.invoice_amount) || 0, rate: Number(values.tax_rate) || 0 });
  }, []);

  const calcRate = calc.rate / 100;
  const taxAmount = Math.round(calc.amount / (1 + calcRate) * calcRate * 100) / 100;
  const netAmount = Math.round((calc.amount - taxAmount) * 100) / 100;
  const formDescription = `登记新的发票信息，提交后进入待开状态。实时计算：税额 ${formatAmount(taxAmount)}，不含税金额 ${formatAmount(netAmount)}，价税合计 ${formatAmount(calc.amount)}`;

  const handleCreateInvoice = async (values: Record<string, unknown>) => {
    try {
      const amount = Number(values.invoice_amount) || 0;
      const rate = (Number(values.tax_rate) || 0) / 100;
      const res = await invoicesApi.create({
        ...values,
        invoice_amount: amount,
        tax_rate: rate,
        tax_amount: Math.round(amount / (1 + rate) * rate * 100) / 100,
        status: 'pending',
      });
      if (res.code === 0) {
        toast.success('发票登记成功');
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

  const handleBatchIssue = async () => {
    const targets = (table.data as Invoice[]).filter((r) => selectedKeys.includes(String(r.id)) && r.status === 'pending');
    if (targets.length === 0) {
      toast.error('请先勾选待开票状态的发票');
      return;
    }
    let ok = 0;
    for (const r of targets) {
      const res = await invoicesApi.update(r.id, { status: 'issued' });
      if (res.code === 0) ok++;
    }
    toast.success(`批量开票成功 ${ok} 张`);
    setSelectedKeys([]);
    table.refresh();
  };

  const primaryActions: ActionButton[] = [
    { label: '开具发票', primary: true, icon: <FileText className="size-3.5" />, onClick: () => setFormOpen(true) },
    { label: '批量开票', onClick: handleBatchIssue },
  ];

  const rowActions = (record: Invoice): ActionButton[] => {
    const actions: ActionButton[] = [];
    if (nextStatus[record.status]) {
      actions.push({ label: nextStatus[record.status].label, onClick: () => handleStatusFlow(record) });
    }
    actions.push({ label: '删除', onClick: () => setDeleteId(record.id) });
    return actions;
  };

  return (
    <>
      <ServerListPage<Invoice>
        title={t('发票管理')}
        description="管理客户发票开具和寄送"
        data={table.data as Invoice[]}
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
              删除后将无法恢复，确定要删除该发票记录吗？
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
        title={t('开具发票')}
        description={formDescription}
        fields={INVOICE_FORM_FIELDS}
        submitLabel="确认登记"
        onSubmit={handleCreateInvoice}
        onValuesChange={handleFormValuesChange}
      />
    </>
  );
}
