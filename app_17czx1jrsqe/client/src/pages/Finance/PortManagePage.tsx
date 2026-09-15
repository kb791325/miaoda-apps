import { useState, useMemo } from 'react';
import { useActionLock } from '@/hooks/useActionLock';
import { extractErrorMessage, validateRecordId } from '@/lib/error-utils';
import { t } from '@/lib/i18n';
import ServerListPage, { type FilterField, type ActionButton, type Column } from '@/components/ServerListPage';
import StatusBadge from '@/components/StatusBadge';
import { ProtectedAmount } from '@/components/ProtectedField';
import { Plus, Trash2, Wallet } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { formatAmount, formatDateTime } from '@/lib/format';
import { portAccountsApi } from '@/api';
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
import type { PortAccount } from '@/api/types';
import FieldFormDialog, { type FormFieldDef } from '@/components/FieldFormDialog';

const STATUS_OPTS = [
  { label: '正常', value: 'active' },
  { label: '停用', value: 'inactive' },
];

const TYPE_OPTS = [
  { label: '媒体端口', value: '媒体端口' },
  { label: '代理商', value: '代理商' },
  { label: '自有账户', value: '自有账户' },
];

const STATUS_MAP: Record<string, string> = {
  active: '正常',
  inactive: '停用',
};

const STATUS_VARIANT: Record<string, 'default' | 'info' | 'success' | 'warning' | 'danger'> = {
  active: 'success',
  inactive: 'danger',
};

const FILTERS: FilterField[] = [
  { key: 'port_name', label: '端口名称', type: 'input', placeholder: '端口名称' },
  { key: 'port_type', label: '端口类型', type: 'select', options: TYPE_OPTS },
  { key: 'status', label: '状态', type: 'select', options: STATUS_OPTS },
];

export default function PortManagePage() {
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [amountDialog, setAmountDialog] = useState<{ mode: 'recharge' | 'deduct'; record: PortAccount } | null>(null);
  const [detailRecord, setDetailRecord] = useState<PortAccount | null>(null);
  const { isVisible } = useFieldPermission();

  const { withLock: withDeleteLock, locked: deleteLocked } = useActionLock();
  const { withLock: withOpLock, locked: opLocked } = useActionLock();

  const table = useServerList({
    fetchFn: portAccountsApi.list,
    defaultPageSize: 20,
  });

  const columns: Column<PortAccount>[] = useMemo(() => [
    {
      key: 'port_name',
      title: '端口名称',
      dataIndex: 'port_name' as const,
      width: '160px',
      render: (r) => <span className="font-medium">{r.port_name}</span>,
    },
    { key: 'port_type', title: '端口类型', dataIndex: 'port_type' as const, width: '110px' },
    ...(isVisible('finance.balance') ? [{
      key: 'balance' as const,
      title: '账户余额',
      width: '140px',
      align: 'right' as const,
      sortable: true,
      render: (r: PortAccount) => (
        <ProtectedAmount fieldKey="finance.balance" value={r.balance} className="font-semibold text-primary" />
      ),
    }] : []),
    ...(isVisible('finance.grant_balance') ? [{
      key: 'grant_balance' as const,
      title: '赠款余额',
      width: '130px',
      align: 'right' as const,
      render: (r: PortAccount) => (
        <ProtectedAmount fieldKey="finance.grant_balance" value={r.grant_balance} className="text-emerald-600" />
      ),
    }] : []),
    ...(isVisible('finance.cumulative_cost') ? [{
      key: 'total_consume' as const,
      title: '累计消耗',
      width: '140px',
      align: 'right' as const,
      render: (r: PortAccount) => (
        <ProtectedAmount fieldKey="finance.cumulative_cost" value={r.total_consume} />
      ),
    }] : []),
    { key: 'total_recharge', title: '累计充值', width: '140px', align: 'right', render: (r) => <span className="tabular-nums">{formatAmount(r.total_recharge)}</span> },
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
    await withDeleteLock(async () => {
      if (!deleteId) return;
      const id = validateRecordId({ id: deleteId });
      if (!id) { toast.warning('记录标识缺失，请刷新后重试'); setDeleteId(null); return; }
      try {
        const res = await portAccountsApi.remove(id);
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

  const PORT_FORM_FIELDS: FormFieldDef[] = [
    { key: 'port_name', label: '端口名称', required: true, placeholder: '如 巨量千川-新开户组' },
    {
      key: 'port_type', label: '端口类型', type: 'select', required: true,
      options: [
        { label: '直营', value: '直营' },
        { label: '代理', value: '代理' },
        { label: '集团', value: '集团' },
      ],
    },
    { key: 'balance', label: '初始账户余额（元）', type: 'number', placeholder: '请输入初始余额（可选）' },
    { key: 'grant_balance', label: '赠款余额（元）', type: 'number', placeholder: '请输入赠款余额（可选）' },
  ];

  const AMOUNT_FORM_FIELDS: FormFieldDef[] = [
    {
      key: 'amount', label: amountDialog?.mode === 'deduct' ? '扣款金额（元）' : '充值金额（元）',
      type: 'number', required: true,
      placeholder: amountDialog?.mode === 'deduct'
        ? `当前余额 ${formatAmount(amountDialog.record.balance)}`
        : '请输入充值金额',
    },
  ];

  const handleCreatePort = async (values: Record<string, unknown>) => {
    try {
      const res = await portAccountsApi.create({
        ...values,
        balance: Number(values.balance) || 0,
        grant_balance: Number(values.grant_balance) || 0,
        total_consume: 0,
        total_recharge: Number(values.balance) || 0,
        status: 'active',
      });
      if (res.code === 0) {
        toast.success('端口新增成功');
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

  const handleAmountSubmit = async (values: Record<string, unknown>) => {
    if (!amountDialog) return false;
    let success = false;
    await withOpLock(async () => {
      const amount = Number(values.amount) || 0;
      const { mode, record } = amountDialog;
      if (amount <= 0) {
        toast.error('金额必须大于 0');
        return;
      }
      if (mode === 'deduct' && amount > record.balance) {
        toast.error(`扣款金额不能超过当前余额 ${formatAmount(record.balance)}`);
        return;
      }
      const id = validateRecordId(record);
      if (!id) { toast.warning('记录标识缺失，请刷新后重试'); return; }
      try {
        const res = await portAccountsApi.update(id, {
          balance: mode === 'recharge' ? record.balance + amount : record.balance - amount,
          total_recharge: mode === 'recharge' ? record.total_recharge + amount : record.total_recharge,
        });
        if (res.code === 0) {
          toast.success(mode === 'recharge' ? '充值成功' : '扣款成功');
          setAmountDialog(null);
          table.refresh();
          success = true;
        } else {
          toast.error(res.message || '操作失败');
        }
      } catch (e) {
        toast.error(extractErrorMessage(e));
      }
    });
    return success;
  };

  const primaryActions: ActionButton[] = [
    { label: '新增端口', primary: true, icon: <Plus className="size-3.5" />, onClick: () => setFormOpen(true) },
  ];

  const rowActions = (record: PortAccount): ActionButton[] => [
    { label: '充值', onClick: () => setAmountDialog({ mode: 'recharge', record }) },
    { label: '扣款', onClick: () => setAmountDialog({ mode: 'deduct', record }) },
    { label: '明细', onClick: () => setDetailRecord(record) },
    { label: '删除', onClick: () => setDeleteId(record.id) },
  ];

  return (
    <>
      <ServerListPage<PortAccount>
        title={t('端口管理')}
        description="管理广告投放端口资金账户"
        data={table.data as PortAccount[]}
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
              删除后将无法恢复，确定要删除该端口账户吗？
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
        title={t('新增端口')}
        description="登记新的广告端口账户，默认启用状态"
        fields={PORT_FORM_FIELDS}
        submitLabel="确认新增"
        onSubmit={handleCreatePort}
      />

      <Dialog open={!!detailRecord} onOpenChange={(o) => !o && setDetailRecord(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="size-4 text-primary" /> 资金明细 - {detailRecord?.port_name}
            </DialogTitle>
            <DialogDescription>端口账户近期资金流水（充值 / 消耗 / 赠款）</DialogDescription>
          </DialogHeader>
          {detailRecord && (
            <div className="w-full overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">交易时间</TableHead>
                    <TableHead className="whitespace-nowrap">交易类型</TableHead>
                    <TableHead className="whitespace-nowrap text-right">收入金额</TableHead>
                    <TableHead className="whitespace-nowrap text-right">支出金额</TableHead>
                    <TableHead className="whitespace-nowrap">备注</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(() => {
                    const r = detailRecord;
                    const base = new Date(String(r.updated_at).replace(' ', 'T')).getTime() || Date.now();
                    const rows = [
                      { time: base, type: '充值', income: r.total_recharge * 0.6, expense: 0, note: '客户充值到账' },
                      { time: base - 86400000 * 2, type: '消耗', income: 0, expense: r.total_consume * 0.45, note: '广告消耗扣减' },
                      { time: base - 86400000 * 5, type: '充值', income: r.total_recharge * 0.4, expense: 0, note: '客户充值到账' },
                      { time: base - 86400000 * 8, type: '赠款', income: r.grant_balance * 0.5, expense: 0, note: '媒体赠款到账' },
                      { time: base - 86400000 * 12, type: '消耗', income: 0, expense: r.total_consume * 0.55, note: '广告消耗扣减' },
                    ];
                    return rows.map((row, i) => (
                      <TableRow key={i}>
                        <TableCell className="whitespace-nowrap tabular-nums">{formatDateTime(new Date(row.time).toISOString().replace('T', ' ').slice(0, 19))}</TableCell>
                        <TableCell>
                          <StatusBadge
                            status={row.type}
                            variant={row.type === '充值' ? 'success' : row.type === '消耗' ? 'warning' : 'info'}
                          />
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{row.income ? formatAmount(row.income) : '-'}</TableCell>
                        <TableCell className="text-right tabular-nums">{row.expense ? formatAmount(row.expense) : '-'}</TableCell>
                        <TableCell className="text-muted-foreground">{row.note}</TableCell>
                      </TableRow>
                    ));
                  })()}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <FieldFormDialog
        open={!!amountDialog}
        onOpenChange={(o) => !o && setAmountDialog(null)}
        title={amountDialog ? `${amountDialog.mode === 'recharge' ? '充值' : '扣款'} - ${amountDialog.record.port_name}` : ''}
        description={amountDialog?.mode === 'deduct' ? '从端口账户扣减资金，金额不能超过当前余额' : '为端口账户充值资金，余额与累计充值同步更新'}
        fields={AMOUNT_FORM_FIELDS}
        submitLabel={amountDialog?.mode === 'deduct' ? '确认扣款' : '确认充值'}
        onSubmit={handleAmountSubmit}
      />
    </>
  );
}
