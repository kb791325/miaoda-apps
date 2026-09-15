import { useState, useMemo } from 'react';
import { t } from '@/lib/i18n';
import ServerListPage, { type FilterField, type ActionButton, type Column } from '@/components/ServerListPage';
import StatusBadge from '@/components/StatusBadge';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatAmount, formatDateTime } from '@/lib/format';
import { bankAccountsApi } from '@/api';
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
import type { BankAccount } from '@/api/types';
import FieldFormDialog, { type FormFieldDef } from '@/components/FieldFormDialog';

const STATUS_OPTS = [
  { label: '启用', value: 'active' },
  { label: '停用', value: 'inactive' },
];

const TYPE_OPTS = [
  { label: '基本户', value: '基本户' },
  { label: '一般户', value: '一般户' },
  { label: '专用账户', value: '专用账户' },
];

const STATUS_MAP: Record<string, string> = {
  active: '启用',
  inactive: '停用',
};

const STATUS_VARIANT: Record<string, 'default' | 'info' | 'success' | 'warning' | 'danger'> = {
  active: 'success',
  inactive: 'danger',
};

const FILTERS: FilterField[] = [
  { key: 'bank_name', label: '银行名称', type: 'input', placeholder: '银行名称' },
  { key: 'account_type', label: '账户类型', type: 'select', options: TYPE_OPTS },
  { key: 'status', label: '状态', type: 'select', options: STATUS_OPTS },
];

export default function BankPage() {
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<BankAccount | null>(null);
  // 充值/扣款弹窗：type 区分资金方向
  const [fundAction, setFundAction] = useState<{ record: BankAccount; type: 'recharge' | 'deduct' } | null>(null);

  const table = useServerList({
    fetchFn: bankAccountsApi.list,
    defaultPageSize: 20,
  });

  const maskAccount = (no: string) => {
    if (!no || no.length < 8) return no || '';
    return no.slice(0, 4) + ' **** **** ' + no.slice(-4);
  };

  const columns: Column<BankAccount>[] = useMemo(() => [
    { key: 'account_name', title: '账户名称', dataIndex: 'account_name' as const, width: '200px' },
    { key: 'bank_name', title: '银行名称', dataIndex: 'bank_name' as const, width: '180px' },
    {
      key: 'account_number',
      title: '账号',
      dataIndex: 'account_number' as const,
      width: '220px',
      render: (r) => <span className="tabular-nums font-mono">{maskAccount(r.account_number)}</span>,
    },
    { key: 'account_type', title: '账户类型', dataIndex: 'account_type' as const, width: '110px' },
    {
      key: 'balance',
      title: '余额',
      width: '140px',
      align: 'right',
      sortable: true,
      render: (r) => <span className="tabular-nums font-semibold text-primary">{formatAmount(r.balance)}</span>,
    },
    {
      key: 'status',
      title: '状态',
      width: '90px',
      render: (r) => (
        <StatusBadge status={STATUS_MAP[r.status] || r.status} variant={STATUS_VARIANT[r.status] || 'default'} />
      ),
    },
    {
      key: 'updated_at',
      title: '更新时间',
      dataIndex: 'updated_at' as const,
      width: '160px',
      sortable: true,
      render: (r) => formatDateTime(r.updated_at),
    },
  ], []);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await bankAccountsApi.remove(deleteId);
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

  const BANK_FORM_FIELDS: FormFieldDef[] = [
    { key: 'bank_name', label: '银行名称', required: true, placeholder: '如 工商银行' },
    { key: 'account_name', label: '账户名称', required: true, placeholder: '请输入账户名称' },
    { key: 'account_number', label: '银行账号', required: true, placeholder: '请输入银行账号' },
    {
      key: 'account_type', label: '账户类型', type: 'select', required: true,
      options: [
        { label: '一般户', value: '一般户' },
        { label: '基本户', value: '基本户' },
      ],
    },
    { key: 'balance', label: '账户余额（元）', type: 'number', placeholder: '请输入余额（可选）' },
    {
      key: 'status', label: '账户状态', type: 'select', required: true,
      options: [
        { label: '启用', value: 'active' },
        { label: '停用', value: 'inactive' },
      ],
    },
  ];

  const handleSubmitBank = async (values: Record<string, unknown>) => {
    try {
      const payload = { ...values, balance: Number(values.balance) || 0 };
      const res = editRecord
        ? await bankAccountsApi.update(editRecord.id, payload)
        : await bankAccountsApi.create(payload);
      if (res.code === 0) {
        toast.success(editRecord ? '账户修改成功' : '银行账户新增成功');
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
    { label: '新增账户', primary: true, icon: <Plus className="size-3.5" />, onClick: () => { setEditRecord(null); setFormOpen(true); } },
  ];

  const rowActions = (record: BankAccount): ActionButton[] => [
    { label: '充值', onClick: () => setFundAction({ record, type: 'recharge' }) },
    { label: '扣款', onClick: () => setFundAction({ record, type: 'deduct' }) },
    { label: '编辑', onClick: () => { setEditRecord(record); setFormOpen(true); } },
    { label: '删除', onClick: () => setDeleteId(record.id) },
  ];

  const FUND_FORM_FIELDS: FormFieldDef[] = [
    { key: 'amount', label: fundAction?.type === 'deduct' ? '扣款金额（元）' : '充值金额（元）', type: 'number', required: true, placeholder: '请输入金额' },
    { key: 'remark', label: '备注', placeholder: '如 客户回款充值 / 手续费扣款（可选）' },
  ];

  const handleFundAction = async (values: Record<string, unknown>) => {
    if (!fundAction) return false;
    const amount = Number(values.amount) || 0;
    if (amount <= 0) {
      toast.error('金额必须大于 0');
      return false;
    }
    const { record, type } = fundAction;
    if (type === 'deduct' && amount > record.balance) {
      toast.error(`扣款金额不能超过当前余额 ${formatAmount(record.balance)}`);
      return false;
    }
    const newBalance = Number((type === 'recharge' ? record.balance + amount : record.balance - amount).toFixed(2));
    try {
      const res = await bankAccountsApi.update(record.id, { balance: newBalance });
      if (res.code === 0) {
        toast.success(type === 'recharge' ? `充值成功，当前余额 ${formatAmount(newBalance)}` : `扣款成功，当前余额 ${formatAmount(newBalance)}`);
        setFundAction(null);
        table.refresh();
        return true;
      }
      toast.error(res.message || '操作失败');
      return false;
    } catch {
      toast.error('操作失败');
      return false;
    }
  };

  return (
    <>
      <ServerListPage<BankAccount>
        title={t('银行管理')}
        description="管理公司银行账户"
        data={table.data as BankAccount[]}
        total={table.total}
        loading={table.loading}
        columns={columns}
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
        selectedKeys={selectedKeys}
        onSelectedChange={setSelectedKeys}
      />

      <AlertDialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              删除后将无法恢复，确定要删除该银行账户吗？
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
        title={editRecord ? '编辑银行账户' : '新增银行账户'}
        description={editRecord ? '修改账户信息后提交生效' : '登记新的公司银行账户'}
        fields={BANK_FORM_FIELDS}
        initialValues={editRecord ? {
          bank_name: editRecord.bank_name,
          account_name: editRecord.account_name,
          account_number: editRecord.account_number,
          account_type: editRecord.account_type,
          balance: String(editRecord.balance),
          status: editRecord.status,
        } : undefined}
        submitLabel={editRecord ? '保存修改' : '确认新增'}
        onSubmit={handleSubmitBank}
      />

      <FieldFormDialog
        key={fundAction ? `${fundAction.record.id}-${fundAction.type}` : 'fund-closed'}
        open={!!fundAction}
        onOpenChange={(o) => !o && setFundAction(null)}
        title={fundAction ? `${fundAction.type === 'recharge' ? '账户充值' : '账户扣款'} - ${fundAction.record.bank_name}` : ''}
        description={fundAction ? `当前余额 ${formatAmount(fundAction.record.balance)}，操作后实时生效` : ''}
        fields={FUND_FORM_FIELDS}
        submitLabel={fundAction?.type === 'deduct' ? '确认扣款' : '确认充值'}
        onSubmit={handleFundAction}
      />
    </>
  );
}
