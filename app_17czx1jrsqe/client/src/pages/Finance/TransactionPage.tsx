import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { Plus, Eye, Trash2, Pencil } from 'lucide-react';
import { extractErrorMessage, validateRecordId } from '@/lib/error-utils';
import { useActionLock } from '@/hooks/useActionLock';
import { t } from '@/lib/i18n';
import ServerListPage, { type FilterField, type ActionButton, type Column } from '@/components/ServerListPage';
import StatusBadge from '@/components/StatusBadge';
import { ProtectedAmount } from '@/components/ProtectedField';
import { formatAmount, formatDateTime } from '@/lib/format';
import { transactionsApi } from '@/api';
import { useServerList } from '@/hooks/useServerList';
import { useFieldPermission } from '@/hooks/useFieldPermission';
import FieldFormDialog, { type FormFieldDef } from '@/components/FieldFormDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
import { Button } from '@/components/ui/button';
import type { CustomerTransaction } from '@/api/types';

const TYPE_OPTS = [
  { label: '充值', value: 'recharge' },
  { label: '消耗', value: 'consume' },
  { label: '退款', value: 'refund' },
  { label: '返点', value: 'rebate' },
  { label: '扣减', value: 'deduct' },
];

const TYPE_MAP: Record<string, string> = {
  recharge: '充值',
  consume: '消耗',
  refund: '退款',
  rebate: '返点',
  deduct: '扣减',
};

const FILTERS: FilterField[] = [
  { key: 'customer_name', label: '客户名称', type: 'input', placeholder: '客户名称' },
  { key: 'tx_type', label: '交易类型', type: 'select', options: TYPE_OPTS },
];

const FORM_FIELDS: FormFieldDef[] = [
  { key: 'customer_name', label: '客户名称', required: true, placeholder: '请输入客户名称' },
  { key: 'entity_name', label: '主体名称', required: true, placeholder: '请输入主体名称' },
  { key: 'tx_type', label: '交易类型', type: 'select', required: true, options: TYPE_OPTS },
  { key: 'income_amount', label: '收入金额（元）', type: 'number', placeholder: '请输入收入金额' },
  { key: 'expense_amount', label: '支出金额（元）', type: 'number', placeholder: '请输入支出金额' },
  { key: 'remark', label: '备注', type: 'textarea', placeholder: '请输入备注信息' },
];

const REMARK_FORM_FIELDS: FormFieldDef[] = [
  { key: 'remark', label: '备注', type: 'textarea', fullWidth: true, placeholder: '请输入备注信息' },
];

const DETAIL_FIELDS: { key: string; label: string }[] = [
  { key: 'serial_no', label: '流水编号' },
  { key: 'customer_name', label: '客户名称' },
  { key: 'entity_name', label: '主体名称' },
  { key: 'tx_type', label: '交易类型' },
  { key: 'income_amount', label: '收入金额' },
  { key: 'expense_amount', label: '支出金额' },
  { key: 'balance', label: '账户余额' },
  { key: 'remark', label: '备注' },
  { key: 'created_at', label: '交易时间' },
];

export default function TransactionPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [remarkRecord, setRemarkRecord] = useState<any>(null);
  const [detailRecord, setDetailRecord] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<number | string | null>(null);

  const { withLock: withDeleteLock, locked: deleteLocked } = useActionLock();

  const { isVisible } = useFieldPermission();
  const table = useServerList({
    fetchFn: transactionsApi.list,
    defaultPageSize: 20,
  });

  const columns: Column<any>[] = useMemo(() => {
    const base: Column<any>[] = [
      { key: 'serial_no', title: '流水编号', dataIndex: 'serial_no' as const, width: '160px' },
      { key: 'customer_name', title: '客户名称', dataIndex: 'customer_name' as const, width: '220px' },
      { key: 'entity_name', title: '主体名称', dataIndex: 'entity_name' as const, width: '220px' },
      {
        key: 'tx_type',
        title: '交易类型',
        width: '100px',
        render: (r) => (
          <StatusBadge status={TYPE_MAP[r.tx_type] || r.tx_type} variant="info" />
        ),
      },
    ];
    if (isVisible('finance.income_amount')) {
      base.push({
        key: 'income_amount',
        title: '收入金额',
        width: '140px',
        align: 'right',
        sortable: true,
        render: (r) => (
          r.income_amount > 0
            ? <ProtectedAmount fieldKey="finance.income_amount" value={r.income_amount} className="text-emerald-600" />
            : <span>-</span>
        ),
      });
    }
    if (isVisible('finance.expense_amount')) {
      base.push({
        key: 'expense_amount',
        title: '支出金额',
        width: '140px',
        align: 'right',
        render: (r) => (
          r.expense_amount > 0
            ? <ProtectedAmount fieldKey="finance.expense_amount" value={r.expense_amount} className="text-red-500" />
            : <span>-</span>
        ),
      });
    }
    if (isVisible('finance.transaction_amount')) {
      base.push({
        key: 'balance',
        title: '余额',
        width: '140px',
        align: 'right',
        render: (r) => (
          <ProtectedAmount fieldKey="finance.transaction_amount" value={r.balance} className="font-semibold" />
        ),
      });
    }
    base.push(
      {
        key: 'created_at',
        title: '交易时间',
        dataIndex: 'created_at' as const,
        width: '160px',
        sortable: true,
        render: (r) => (r.created_at ? formatDateTime(r.created_at) : '-'),
      },
      {
        key: 'remark',
        title: '备注',
        width: '200px',
        render: (r) => (
          <div className="group flex items-center gap-1">
            <span className="flex-1 truncate max-w-[160px]">{r.remark || '-'}</span>
            <Button
              variant="ghost"
              size="icon"
              className="size-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => setRemarkRecord(r)}
            >
              <Pencil className="size-3" />
            </Button>
          </div>
        ),
      },
    );
    return base;
  }, [isVisible]);

  const handleCreate = async (values: Record<string, unknown>) => {
    try {
      const payload: Record<string, unknown> = {
        customer_name: values.customer_name,
        entity_name: values.entity_name,
        tx_type: values.tx_type,
        remark: values.remark || '',
      };
      if (values.income_amount !== undefined && values.income_amount !== '') {
        payload.income_amount = Number(values.income_amount) || 0;
      }
      if (values.expense_amount !== undefined && values.expense_amount !== '') {
        payload.expense_amount = Number(values.expense_amount) || 0;
      }
      const res = await transactionsApi.create(payload);
      if (res.code === 0) {
        toast.success('新增客户流水成功');
        table.refresh();
        return true;
      }
      toast.error(res.message || '新增失败');
      return false;
    } catch (e) {
      toast.error(extractErrorMessage(e));
      return false;
    }
  };

  const handleRemarkSave = async (values: Record<string, unknown>) => {
    if (!remarkRecord) return false;
    try {
      const id = validateRecordId(remarkRecord);
      if (!id) { toast.warning('记录标识缺失，请刷新后重试'); return false; }
      const res = await transactionsApi.update(id, { remark: values.remark || '' });
      if (res.code === 0) {
        toast.success('备注修改成功');
        setRemarkRecord(null);
        table.refresh();
        return true;
      }
      toast.error(res.message || '修改失败');
      return false;
    } catch (e) {
      toast.error(extractErrorMessage(e));
      return false;
    }
  };

  const handleDelete = async () => {
    await withDeleteLock(async () => {
      if (!deleteId && deleteId !== 0) return;
      const id = validateRecordId({ id: deleteId });
      if (!id) { toast.warning('记录标识缺失，请刷新后重试'); setDeleteId(null); return; }
      try {
        const res = await transactionsApi.remove(id);
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

  const primaryActions: ActionButton[] = [
    { label: '新增客户', primary: true, icon: <Plus className="size-3.5" />, onClick: () => setFormOpen(true) },
  ];

  const rowActions = (record: any): ActionButton[] => [
    { label: '客户详情', icon: <Eye className="size-3.5" />, onClick: () => setDetailRecord(record) },
    { label: '删除', icon: <Trash2 className="size-3.5" />, onClick: () => setDeleteId(record.id) },
  ];

  const renderDetailValue = (record: any, key: string) => {
    const val = record[key];
    if (val === undefined || val === null || val === '') return '-';
    if (key === 'tx_type') return TYPE_MAP[val] || val;
    if (key === 'income_amount' || key === 'expense_amount' || key === 'balance') return formatAmount(val);
    if (key === 'created_at') return formatDateTime(val);
    return String(val);
  };

  return (
    <>
      <ServerListPage<any>
      title={t('客户明细')}
      description="客户账户资金流水明细"
        data={table.data as any[]}
      total={table.total}
      loading={table.loading}
        columns={columns as any}
      filters={FILTERS}
      primaryActions={primaryActions}
      rowActions={rowActions}
      selectable={false}
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

      <FieldFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={t('新增客户')}
        description="登记客户资金流水信息"
        fields={FORM_FIELDS}
        submitLabel="确认新增"
        onSubmit={handleCreate}
      />

      <FieldFormDialog
        open={remarkRecord !== null}
        onOpenChange={(o) => { if (!o) setRemarkRecord(null); }}
        title={t('编辑备注')}
        description="修改客户流水备注信息"
        fields={REMARK_FORM_FIELDS}
        initialValues={remarkRecord ? { remark: remarkRecord.remark || '' } : undefined}
        submitLabel="保存"
        onSubmit={handleRemarkSave}
      />

      <Dialog open={detailRecord !== null} onOpenChange={(o) => { if (!o) setDetailRecord(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>客户详情</DialogTitle>
          </DialogHeader>
          {detailRecord && (
            <div className="grid grid-cols-2 gap-4">
              {DETAIL_FIELDS.map((f) => (
                <div key={f.key} className={f.key === 'remark' ? 'col-span-2' : ''}>
                  <div className="text-xs text-muted-foreground mb-0.5">{f.label}</div>
                  <div className="text-sm">{renderDetailValue(detailRecord, f.key)}</div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId !== null} onOpenChange={(o) => { if (!o) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              删除后将无法恢复，确定要删除该客户流水记录吗？
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
