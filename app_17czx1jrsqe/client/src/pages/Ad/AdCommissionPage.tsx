import { useState, useMemo } from 'react';
import ServerListPage, { type FilterField, type ActionButton, type Column } from '@/components/ServerListPage';
import StatusBadge from '@/components/StatusBadge';
import { Plus, Trash2, Calculator, RefreshCw, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { formatAmount, formatDateTime, formatPercent } from '@/lib/format';
import { exportRowsToCsv } from '@/lib/export';
import { adCommissionsApi, commissionRulesApi } from '@/api';
import { useServerList } from '@/hooks/useServerList';
import { useActionLock } from '@/hooks/useActionLock';
import { extractErrorMessage, validateRecordId } from '@/lib/error-utils';
import FieldFormDialog, { type FormFieldDef } from '@/components/FieldFormDialog';
import CommissionRuleDrawer from '@/components/CommissionRuleDrawer';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import type { AdCommission } from '@/api/types';

const STATUS_OPTS = [
  { label: '待确认', value: 'pending' },
  { label: '已确认', value: 'confirmed' },
  { label: '已发放', value: 'paid' },
];

const DEPT_OPTS = [
  { label: '商务一部', value: '商务一部' },
  { label: '商务二部', value: '商务二部' },
  { label: '商务三部', value: '商务三部' },
];

const SALES_OPTS = ['张伟', '李娜', '王强', '刘洋', '陈静'].map((n) => ({ label: n, value: n }));

const STATUS_MAP: Record<string, string> = {
  pending: '待确认',
  confirmed: '已确认',
  paid: '已发放',
};

const STATUS_VARIANT: Record<string, 'default' | 'info' | 'success' | 'warning' | 'danger'> = {
  pending: 'warning',
  confirmed: 'info',
  paid: 'success',
};

const FILTERS: FilterField[] = [
  { key: 'sales_name', label: '商务姓名', type: 'input', placeholder: '商务姓名' },
  { key: 'department', label: '部门', type: 'select', options: DEPT_OPTS },
  { key: 'status', label: '提成状态', type: 'select', options: STATUS_OPTS },
];

// 发放记录（从已发放的提成中派生）
function buildPayoutRecords(list: AdCommission[]): any[] {
  return list
    .filter((r) => r.status === 'paid')
    .map((r) => ({
      id: r.id,
      payout_no: `FF${String(r.id).padStart(6, '0')}`,
      sales_name: r.sales_name,
      department: r.department,
      amount: r.commission_amount,
      settle_month: r.settle_month,
      pay_time: (r as any).paid_at || r.created_at || '-',
      status: '已发放',
    }));
}

export default function AdCommissionPage() {
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<AdCommission | null>(null);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'list' | 'payout'>('list');
  const [calcLoading, setCalcLoading] = useState(false);
  const [rules, setRules] = useState<any[]>([]);
  const { withLock: withDeleteLock, locked: deleteLocked } = useActionLock();
  const { withLock: withOpLock, locked: opLocked } = useActionLock();

  const table = useServerList({
    fetchFn: adCommissionsApi.list,
    defaultPageSize: 20,
  });

  const payoutRecords = useMemo(
    () => buildPayoutRecords((table.data as AdCommission[]) || []),
    [table.data],
  );

  const columns: Column<AdCommission>[] = useMemo(() => [
    { key: 'commission_no', title: '提成编号', width: '130px', sortable: true, render: (r) => <span className="font-mono text-xs">{r.commission_no}</span> },
    { key: 'sales_name', title: '商务姓名', dataIndex: 'sales_name' as const, width: '100px' },
    { key: 'department', title: '部门', dataIndex: 'department' as const, width: '110px' },
    {
      key: 'performance_amount',
      title: '业绩金额',
      width: '140px',
      align: 'right',
      render: (r) => <span className="tabular-nums">{formatAmount(r.performance_amount)}</span>,
    },
    {
      key: 'commission_ratio',
      title: '提成比例',
      width: '100px',
      align: 'center',
      render: (r) => formatPercent(r.commission_ratio, 2),
    },
    {
      key: 'commission_amount',
      title: '提成金额',
      width: '140px',
      align: 'right',
      sortable: true,
      render: (r) => <span className="tabular-nums font-semibold text-primary">{formatAmount(r.commission_amount)}</span>,
    },
    { key: 'settle_month', title: '结算月份', dataIndex: 'settle_month' as const, width: '110px' },
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
      title: '创建时间',
      dataIndex: 'created_at' as const,
      width: '160px',
      sortable: true,
      render: (r) => formatDateTime(r.created_at),
    },
  ], []);

  const payoutColumns: Column<any>[] = useMemo(() => [
    { key: 'payout_no', title: '发放单号', width: '130px', render: (r) => <span className="font-mono text-xs">{r.payout_no}</span> },
    { key: 'sales_name', title: '商务姓名', width: '110px', dataIndex: 'sales_name' as any },
    { key: 'department', title: '部门', width: '110px', dataIndex: 'department' as any },
    { key: 'amount', title: '发放金额', width: '140px', align: 'right', sortable: true, render: (r) => <span className="font-semibold tabular-nums text-emerald-600">{formatAmount(r.amount)}</span> },
    { key: 'settle_month', title: '结算月份', width: '110px' },
    { key: 'pay_time', title: '发放时间', width: '170px', render: (r) => <span className="tabular-nums text-sm text-muted-foreground">{r.pay_time}</span> },
    { key: 'status', title: '状态', width: '90px', render: (r) => <StatusBadge status={r.status} variant="success" /> },
  ], []);

  const handleConfirm = async (record: AdCommission) => {
    await withOpLock(async () => {
      const id = validateRecordId(record);
      if (!id) { toast.warning('记录标识缺失，请刷新后重试'); return; }
      try {
        const res = await adCommissionsApi.update(id, { status: 'confirmed' });
        if (res.code === 0) {
          toast.success('已确认');
          table.refresh();
        } else {
          toast.error(res.message || '操作失败');
        }
      } catch (e) {
        toast.error(extractErrorMessage(e));
      }
    });
  };

  const handlePay = async (record: AdCommission) => {
    await withOpLock(async () => {
      const id = validateRecordId(record);
      if (!id) { toast.warning('记录标识缺失，请刷新后重试'); return; }
      try {
        const res = await adCommissionsApi.update(id, {
          status: 'paid',
          paid_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
        });
        if (res.code === 0) {
          toast.success('已发放');
          table.refresh();
        } else {
          toast.error(res.message || '操作失败');
        }
      } catch (e) {
        toast.error(extractErrorMessage(e));
      }
    });
  };

  const handleRecalc = async (record: AdCommission) => {
    await withOpLock(async () => {
      const id = validateRecordId(record);
      if (!id) { toast.warning('记录标识缺失，请刷新后重试'); return; }
      try {
        setCalcLoading(true);
        const rulesRes = await commissionRulesApi.all({ biz_type: 'ad' });
        const ruleList = (rulesRes.data as any[]) || [];
        const activeRule = ruleList.find((r) => r.status === 'active');
        if (!activeRule) {
          toast.warning('暂无启用的提成规则');
          return;
        }
        const calcRes = await commissionRulesApi.calculate({
          biz_type: 'ad',
          sales_name: record.sales_name,
          settle_month: record.settle_month,
          rule_id: activeRule.id,
        });
        if (calcRes.code === 0 && calcRes.data) {
          const { base_amount, commission, rate } = calcRes.data as any;
          const res = await adCommissionsApi.update(id, {
            performance_amount: base_amount,
            commission_ratio: rate / 100,
            commission_amount: commission,
          });
          if (res.code === 0) {
            toast.success(`已重新计算：业绩 ${formatAmount(base_amount)}，提成 ${formatAmount(commission)}`);
            table.refresh();
          }
        } else {
          toast.error(calcRes.message || '计算失败');
        }
      } catch (e) {
        toast.error(extractErrorMessage(e));
      } finally {
        setCalcLoading(false);
      }
    });
  };

  const handleBatchConfirm = async () => {
    await withOpLock(async () => {
      if (selectedKeys.length === 0) {
        toast.warning('请先选择待确认的记录');
        return;
      }
      try {
        let success = 0;
        for (const id of selectedKeys) {
          const res = await adCommissionsApi.update(id, { status: 'confirmed' });
          if (res.code === 0) success++;
        }
        toast.success(`已确认 ${success} 条`);
        setSelectedKeys([]);
        table.refresh();
      } catch (e) {
        toast.error(extractErrorMessage(e));
      }
    });
  };

  const handleBatchPay = async () => {
    await withOpLock(async () => {
      if (selectedKeys.length === 0) {
        toast.warning('请先选择已确认的记录');
        return;
      }
      try {
        const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
        let success = 0;
        for (const id of selectedKeys) {
          const res = await adCommissionsApi.update(id, { status: 'paid', paid_at: now });
          if (res.code === 0) success++;
        }
        toast.success(`已发放 ${success} 条`);
        setSelectedKeys([]);
        table.refresh();
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
        const res = await adCommissionsApi.remove(id);
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

  const openRules = async () => {
    // 预加载规则
    try {
      const res = await commissionRulesApi.all({ biz_type: 'ad' });
      setRules((res.data as any[]) || []);
    } catch { /* ignore */ }
    setRulesOpen(true);
  };

  // 自动计算：选商务+月份+规则，点计算
  const AutoCalcForm = ({ form, setForm }: { form: Record<string, any>; setForm: (v: any) => void }) => {
    const [loading, setLoading] = useState(false);
    const handleAutoCalc = async () => {
      if (!form.sales_name || !form.settle_month) {
        toast.warning('请先填写商务姓名和结算月份');
        return;
      }
      const rulesRes = await commissionRulesApi.all({ biz_type: 'ad' });
      const ruleList = (rulesRes.data as any[]) || [];
      const activeRule = ruleList.find((r) => r.status === 'active');
      if (!activeRule) {
        toast.warning('暂无启用的提成规则，请先在「提成规则」中配置');
        return;
      }
      setLoading(true);
      try {
        const res = await commissionRulesApi.calculate({
          biz_type: 'ad',
          sales_name: form.sales_name,
          settle_month: form.settle_month,
          rule_id: activeRule.id,
        });
        if (res.code === 0 && res.data) {
          const { base_amount, commission, rate, rule_name } = res.data as any;
          setForm({
            ...form,
            performance_amount: base_amount,
            commission_ratio: rate / 100,
            commission_amount: commission,
            rule_name,
          });
          toast.success(`自动计算完成：业绩 ${formatAmount(base_amount)}，提成 ${formatAmount(commission)}`);
        } else {
          toast.error(res.message || '计算失败');
        }
      } catch {
        toast.error('计算失败');
      } finally {
        setLoading(false);
      }
    };
    return (
      <div className="space-y-3">
        <div className="flex items-end gap-2">
          <div className="flex-1 space-y-1.5">
            <Label>使用规则</Label>
            <div className="flex h-9 items-center rounded-md border border-input bg-muted/30 px-3 text-sm text-muted-foreground">
              自动匹配启用中的广告提成规则
            </div>
          </div>
          <Button onClick={handleAutoCalc} disabled={loading} variant="outline" className="h-9">
            <Calculator className="mr-1 size-3.5" />
            {loading ? '计算中...' : '自动计算'}
          </Button>
        </div>
        {form.rule_name && (
          <div className="text-xs text-muted-foreground">
            计算依据：{form.rule_name} · 业绩基数 <span className="tabular-nums">{formatAmount(form.performance_amount || 0)}</span>
          </div>
        )}
      </div>
    );
  };

  const primaryActions: ActionButton[] = [
    { label: '新建提成', primary: true, icon: <Plus className="size-3.5" />, onClick: () => { setEditRecord(null); setFormOpen(true); } },
    { label: '提成规则', onClick: openRules },
    ...(activeTab === 'list' ? [
      { label: '批量确认', onClick: handleBatchConfirm },
      { label: '批量发放', onClick: handleBatchPay },
    ] : []),
    {
      label: '导出',
      onClick: () => exportRowsToCsv('提成列表', [
        { key: 'sales_name', label: '商务姓名' },
        { key: 'department', label: '部门' },
        { key: 'performance_amount', label: '业绩金额' },
        { key: 'commission_ratio', label: '提成比例' },
        { key: 'commission_amount', label: '提成金额' },
        { key: 'settle_month', label: '结算月份' },
        { key: 'status', label: '状态' },
      ], table.data as AdCommission[]),
    },
  ];

  const rowActions = (record: AdCommission): ActionButton[] => {
    const actions: ActionButton[] = [];
    if (record.status === 'pending') {
      actions.push({ label: '确认', onClick: () => handleConfirm(record) });
    }
    if (record.status === 'confirmed') {
      actions.push({ label: '发放', onClick: () => handlePay(record) });
    }
    if (record.status === 'pending') {
      actions.push({ label: '重新计算', icon: <RefreshCw className="size-3.5" />, onClick: () => handleRecalc(record) });
    }
    actions.push({ label: '编辑', onClick: () => { setEditRecord(record); setFormOpen(true); } });
    actions.push({ label: '删除', variant: 'destructive', icon: <Trash2 className="size-3.5" />, onClick: () => setDeleteId(record.id) });
    return actions;
  };

  const payoutRowActions = (): ActionButton[] => [
    { label: '查看详情', onClick: () => toast.info('查看详情') },
  ];

  // 新建表单字段（加入自动计算按钮区）
  const formFields: FormFieldDef[] = [
    { key: 'sales_name', label: '商务姓名', required: true, placeholder: '请输入商务姓名' },
    { key: 'department', label: '部门', type: 'select', required: true, options: DEPT_OPTS, defaultValue: '商务一部' },
    { key: 'settle_month', label: '结算月份', required: true, placeholder: '如 2026-08' },
    { key: 'performance_amount', label: '业绩金额（元）', type: 'number', required: true, placeholder: '自动计算或手动填写' },
    { key: 'commission_ratio', label: '提成比例（%）', type: 'number', required: true, placeholder: '如 3.5' },
    { key: 'commission_amount', label: '提成金额（元）', type: 'number', required: true, placeholder: '自动计算或手动填写' },
  ];

  const [formValues, setFormValues] = useState<Record<string, any>>({
    sales_name: '', department: '商务一部', settle_month: '',
    performance_amount: '', commission_ratio: '', commission_amount: '',
  });

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">提成管理</h2>
            <p className="text-sm text-muted-foreground">管理广告业务提成计算和发放</p>
          </div>
        </div>

        <div className="rounded-lg border border-border/60 bg-card p-1">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'list' | 'payout')}>
            <TabsList className="grid w-60 grid-cols-2">
              <TabsTrigger value="list">提成列表</TabsTrigger>
              <TabsTrigger value="payout">
                <FileText className="mr-1 size-3.5" /> 发放记录
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {activeTab === 'list' ? (
          <ServerListPage<AdCommission>
            title=""
            description=""
            data={table.data as AdCommission[]}
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
        ) : (
          <ServerListPage
            title=""
            description=""
            data={payoutRecords}
            total={payoutRecords.length}
            loading={table.loading}
            columns={payoutColumns}
            filters={[
              { key: 'sales_name', label: '商务姓名', type: 'input', placeholder: '商务姓名' },
              { key: 'settle_month', label: '结算月份', type: 'input', placeholder: '如 2026-08' },
            ]}
            primaryActions={[
              {
                label: '导出',
                onClick: () => exportRowsToCsv('发放记录', [
                  { key: 'payout_no', label: '发放单号' },
                  { key: 'sales_name', label: '商务姓名' },
                  { key: 'department', label: '部门' },
                  { key: 'amount', label: '发放金额' },
                  { key: 'settle_month', label: '结算月份' },
                  { key: 'pay_time', label: '发放时间' },
                ], payoutRecords),
              },
            ]}
            rowActions={payoutRowActions}
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
        )}
      </div>

      <AlertDialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              删除后将无法恢复，确定要删除该提成记录吗？
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

      {/* 新建/编辑提成弹窗 */}
      <Dialog
        open={formOpen}
        onOpenChange={(o) => {
          setFormOpen(o);
          if (o && editRecord) {
            setFormValues({
              sales_name: editRecord.sales_name,
              department: editRecord.department,
              settle_month: editRecord.settle_month,
              performance_amount: editRecord.performance_amount,
              commission_ratio: (editRecord.commission_ratio * 100).toFixed(2),
              commission_amount: editRecord.commission_amount,
            });
          } else if (o && !editRecord) {
            setFormValues({
              sales_name: '', department: '商务一部', settle_month: '',
              performance_amount: '', commission_ratio: '', commission_amount: '',
            });
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editRecord ? '编辑提成' : '新建提成'}</DialogTitle>
            <DialogDescription>录入提成信息，可使用自动计算</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label><span className="text-destructive">*</span> 商务姓名</Label>
                <Select
                  value={formValues.sales_name}
                  onValueChange={(v) => setFormValues({ ...formValues, sales_name: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择商务" />
                  </SelectTrigger>
                  <SelectContent>
                    {SALES_OPTS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label><span className="text-destructive">*</span> 部门</Label>
                <Select
                  value={formValues.department}
                  onValueChange={(v) => setFormValues({ ...formValues, department: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPT_OPTS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label><span className="text-destructive">*</span> 结算月份</Label>
                <Input
                  value={formValues.settle_month}
                  onChange={(e) => setFormValues({ ...formValues, settle_month: e.target.value })}
                  placeholder="如 2026-08"
                />
              </div>
              <div className="space-y-1.5">
                <Label>&nbsp;</Label>
                <div />
              </div>
            </div>

            <AutoCalcForm form={formValues} setForm={setFormValues} />

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label><span className="text-destructive">*</span> 业绩金额</Label>
                <Input
                  type="number"
                  value={formValues.performance_amount}
                  onChange={(e) => setFormValues({ ...formValues, performance_amount: e.target.value })}
                  placeholder="元"
                />
              </div>
              <div className="space-y-1.5">
                <Label><span className="text-destructive">*</span> 提成比例</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formValues.commission_ratio}
                  onChange={(e) => setFormValues({ ...formValues, commission_ratio: e.target.value })}
                  placeholder="%"
                />
              </div>
              <div className="space-y-1.5">
                <Label><span className="text-destructive">*</span> 提成金额</Label>
                <Input
                  type="number"
                  value={formValues.commission_amount}
                  onChange={(e) => setFormValues({ ...formValues, commission_amount: e.target.value })}
                  placeholder="元"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>取消</Button>
            <Button onClick={async () => {
              await withOpLock(async () => {
                if (!formValues.sales_name || !formValues.settle_month) {
                  toast.warning('请填写商务姓名和结算月份');
                  return;
                }
                try {
                  const perf = Number(formValues.performance_amount) || 0;
                  const rate = Number(formValues.commission_ratio) || 0;
                  const amount = Number(formValues.commission_amount) || 0;
                  let res;
                  if (editRecord) {
                    res = await adCommissionsApi.update(editRecord.id, {
                      sales_name: formValues.sales_name,
                      department: formValues.department,
                      settle_month: formValues.settle_month,
                      performance_amount: perf,
                      commission_ratio: rate / 100,
                      commission_amount: amount,
                    });
                  } else {
                    res = await adCommissionsApi.create({
                      sales_name: formValues.sales_name,
                      department: formValues.department,
                      settle_month: formValues.settle_month,
                      performance_amount: perf,
                      commission_ratio: rate / 100,
                      commission_amount: amount,
                      status: 'pending',
                    });
                  }
                  if (res.code === 0) {
                    toast.success(editRecord ? '更新成功' : '创建成功');
                    setFormOpen(false);
                    table.refresh();
                  } else {
                    toast.error(res.message || '保存失败');
                  }
                } catch (e) {
                  toast.error(extractErrorMessage(e));
                }
              });
            }}>
              {editRecord ? '保存修改' : '创建提成'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 提成规则配置抽屉 */}
      <CommissionRuleDrawer
        open={rulesOpen}
        onOpenChange={setRulesOpen}
        bizType="ad"
        bizLabel="广告业务"
      />
    </>
  );
}
