import { useState, useMemo } from 'react';
import ServerListPage, { type FilterField, type ActionButton, type Column } from '@/components/ServerListPage';
import StatusBadge from '@/components/StatusBadge';
import { Plus, Trash2, RefreshCw, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { formatAmount, formatDateTime, formatPercent } from '@/lib/format';
import { exportRowsToCsv } from '@/lib/export';
import { videoCommissionsApi, commissionRulesApi } from '@/api';
import { pickCommissionRule } from '@shared/commission-calc';
import { useServerList } from '@/hooks/useServerList';
import { useActionLock } from '@/hooks/useActionLock';
import { extractErrorMessage, validateRecordId } from '@/lib/error-utils';
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

function asRuleList(value: unknown): any[] {
  if (Array.isArray(value)) return value as any[];
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    for (const key of ['list', 'records', 'data']) {
      const inner = obj[key];
      if (Array.isArray(inner)) return inner as any[];
    }
  }
  return [];
}

const STATUS_OPTS = [
  { label: '待结算', value: 'pending' },
  { label: '已结算', value: 'settled' },
  { label: '已发放', value: 'paid' },
];

const DEPT_OPTS = [
  { label: '视频部', value: '视频部' },
  { label: '商务一部', value: '商务一部' },
  { label: '商务二部', value: '商务二部' },
  { label: '商务三部', value: '商务三部' },
];

const EMPLOYEE_OPTS = ['王小明', '李小红', '张伟', '陈静', '赵刚'].map((n) => ({ label: n, value: n }));

const STATUS_MAP: Record<string, string> = {
  pending: '待结算',
  settled: '已结算',
  paid: '已发放',
};

const STATUS_VARIANT: Record<string, 'default' | 'info' | 'success' | 'warning' | 'danger'> = {
  pending: 'warning',
  settled: 'info',
  paid: 'success',
};

const FILTERS: FilterField[] = [
  { key: 'employee_name', label: '员工姓名', type: 'input', placeholder: '员工姓名' },
  { key: 'department', label: '部门', type: 'select', options: DEPT_OPTS },
  { key: 'status', label: '提成状态', type: 'select', options: STATUS_OPTS },
];

// 发放记录
function buildPayoutRecords(list: any[]): any[] {
  return list
    .filter((r) => r.status === 'paid')
    .map((r) => ({
      id: r.id,
      payout_no: `VP${String(r.id).padStart(6, '0')}`,
      employee_name: r.employee_name,
      department: r.department,
      amount: r.commission_amount,
      settle_month: r.settle_month,
      pay_time: r.paid_at || r.updated_at || r.created_at || '-',
      status: '已发放',
    }));
}

export function VideoCommissionPage() {
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<any>(null);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'list' | 'payout'>('list');
  const [calcLoading, setCalcLoading] = useState(false);
  const [rulesLoading, setRulesLoading] = useState(false);
  const { withLock: withDeleteLock, locked: deleteLocked } = useActionLock();
  const { withLock: withOpLock, locked: opLocked } = useActionLock();

  const table = useServerList({
    fetchFn: videoCommissionsApi.list,
    defaultPageSize: 20,
  });

  const payoutRecords = useMemo(
    () => buildPayoutRecords(table.data || []),
    [table.data],
  );

  const columns: Column<any>[] = useMemo(() => [
    { key: 'commission_no', title: '提成单号', width: '130px', render: (r) => <span className="font-mono text-xs">{r.commission_no}</span> },
    { key: 'employee_name', title: '员工姓名', width: '100px', render: (r) => <span className="font-medium">{r.employee_name}</span> },
    { key: 'department', title: '部门', width: '110px', dataIndex: 'department' as any },
    {
      key: 'performance',
      title: '业绩金额',
      width: '140px',
      align: 'right',
      sortable: true,
      render: (r) => <span className="tabular-nums">{formatAmount(r.performance)}</span>,
    },
    {
      key: 'commission_rate',
      title: '提成比例',
      width: '100px',
      align: 'center',
      render: (r) => formatPercent(r.commission_rate, 1),
    },
    {
      key: 'commission_amount',
      title: '提成金额',
      width: '140px',
      align: 'right',
      sortable: true,
      render: (r) => <span className="font-semibold tabular-nums text-primary">{formatAmount(r.commission_amount)}</span>,
    },
    { key: 'settle_month', title: '结算月份', width: '110px', dataIndex: 'settle_month' as any },
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
      width: '160px',
      sortable: true,
      render: (r) => formatDateTime(r.created_at),
    },
  ], []);

  const payoutColumns: Column<any>[] = useMemo(() => [
    { key: 'payout_no', title: '发放单号', width: '130px', render: (r) => <span className="font-mono text-xs">{r.payout_no}</span> },
    { key: 'employee_name', title: '员工姓名', width: '100px' },
    { key: 'department', title: '部门', width: '110px', dataIndex: 'department' as any },
    { key: 'amount', title: '发放金额', width: '140px', align: 'right', sortable: true, render: (r) => <span className="font-semibold tabular-nums text-emerald-600">{formatAmount(r.amount)}</span> },
    { key: 'settle_month', title: '结算月份', width: '110px', dataIndex: 'settle_month' as any },
    { key: 'pay_time', title: '发放时间', width: '170px', render: (r) => <span className="tabular-nums text-sm text-muted-foreground">{r.pay_time}</span> },
    { key: 'status', title: '状态', width: '90px', render: (r) => <StatusBadge status={r.status} variant="success" /> },
  ], []);

  const handleSettle = async (record: any) => {
    await withOpLock(async () => {
      const id = validateRecordId(record);
      if (!id) { toast.warning('记录标识缺失，请刷新后重试'); return; }
      try {
        const res = await videoCommissionsApi.update(id, { status: 'settled' });
        if (res.code === 0) {
          toast.success('已结算');
          table.refresh();
        } else {
          toast.error(res.message || '操作失败');
        }
      } catch (e) {
        toast.error(extractErrorMessage(e));
      }
    });
  };

  const handlePay = async (record: any) => {
    await withOpLock(async () => {
      const id = validateRecordId(record);
      if (!id) { toast.warning('记录标识缺失，请刷新后重试'); return; }
      try {
        const res = await videoCommissionsApi.update(id, {
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

  const handleRecalc = async (record: any) => {
    await withOpLock(async () => {
      const id = validateRecordId(record);
      if (!id) { toast.warning('记录标识缺失，请刷新后重试'); return; }
      try {
        setCalcLoading(true);
        setRulesLoading(true);
        const rulesRes = await commissionRulesApi.all({ biz_type: 'video' });
        const ruleList = asRuleList(rulesRes?.data);
        const activeRule = pickCommissionRule(ruleList, 'video', record.department);
        if (!activeRule) {
          toast.warning('未匹配到启用的视频提成规则，请到【提成规则】中检查配置');
          return;
        }
        const calcRes = await commissionRulesApi.calculate({
          biz_type: 'video',
          sales_name: record.employee_name,
          settle_month: record.settle_month,
          rule_id: activeRule.id,
        });
        if (calcRes.code === 0 && calcRes.data) {
          const { base_amount, commission, rate } = calcRes.data as any;
          const res = await videoCommissionsApi.update(id, {
            performance: base_amount,
            commission_rate: rate,
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
        setRulesLoading(false);
      }
    });
  };

  const handleBatchSettle = async () => {
    await withOpLock(async () => {
      if (selectedKeys.length === 0) {
        toast.warning('请先选择待结算的记录');
        return;
      }
      try {
        const rulesRes = await commissionRulesApi.all({ biz_type: 'video' });
        const ruleList = asRuleList(rulesRes?.data);
        let success = 0;
        for (const id of selectedKeys) {
          const record = (table.data || []).find((r: any) => String(r.id) === String(id));
          if (!record) continue;
          const activeRule = pickCommissionRule(ruleList, 'video', record.department);
          if (!activeRule) {
            toast.warning(`${record.employee_name || '记录'} 未匹配到启用的提成规则，已跳过`);
            continue;
          }
          const calcRes = await commissionRulesApi.calculate({
            biz_type: 'video',
            sales_name: record.employee_name,
            settle_month: record.settle_month,
            rule_id: activeRule.id,
          });
          const payload: Record<string, unknown> =
            calcRes.code === 0 && calcRes.data
              ? {
                  performance: (calcRes.data as any).base_amount,
                  commission_rate: (calcRes.data as any).rate,
                  commission_amount: (calcRes.data as any).commission,
                  status: 'settled',
                }
              : { status: 'settled' };
          const res = await videoCommissionsApi.update(id, payload);
          if (res.code === 0) success++;
        }
        toast.success(`已按启用规则重算并结算 ${success} 条`);
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
        toast.warning('请先选择已结算的记录');
        return;
      }
      try {
        const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
        let success = 0;
        for (const id of selectedKeys) {
          const res = await videoCommissionsApi.update(id, { status: 'paid', paid_at: now });
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
        const res = await videoCommissionsApi.remove(id);
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

  // 表单状态
  const [formValues, setFormValues] = useState({
    employee_name: '', department: '视频部', settle_month: '',
    performance: '', commission_rate: '', commission_amount: '', rule_name: '',
  });

  const AutoCalcBlock = () => {
    const [loading, setLoading] = useState(false);
    const handleAutoCalc = async () => {
      if (!formValues.employee_name || !formValues.settle_month) {
        toast.warning('请先填写员工姓名和结算月份');
        return;
      }
      const rulesRes = await commissionRulesApi.all({ biz_type: 'video' });
      const ruleList = asRuleList(rulesRes?.data);
      const activeRule = pickCommissionRule(ruleList, 'video', formValues.department);
      if (!activeRule) {
        toast.warning('暂无启用的提成规则，请先在「提成规则」中配置');
        return;
      }
      setLoading(true);
      try {
        const res = await commissionRulesApi.calculate({
          biz_type: 'video',
          sales_name: formValues.employee_name,
          settle_month: formValues.settle_month,
          rule_id: activeRule.id,
        });
        if (res.code === 0 && res.data) {
          const { base_amount, commission, rate, rule_name } = res.data as any;
          setFormValues({
            ...formValues,
            performance: String(base_amount),
            commission_rate: String(rate),
            commission_amount: String(commission),
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
              自动匹配启用中的视频提成规则
            </div>
          </div>
          <Button onClick={handleAutoCalc} disabled={loading} variant="outline" className="h-9">
            <RefreshCw className="mr-1 size-3.5" />
            {loading ? '计算中...' : '自动计算'}
          </Button>
        </div>
        {formValues.rule_name && (
          <div className="text-xs text-muted-foreground">
            计算依据：{formValues.rule_name} · 业绩基数 <span className="tabular-nums">{formatAmount(Number(formValues.performance) || 0)}</span>
          </div>
        )}
      </div>
    );
  };

  const primaryActions: ActionButton[] = [
    { label: '新建提成', primary: true, icon: <Plus className="size-3.5" />, onClick: () => { setEditRecord(null); setFormOpen(true); } },
    { label: '提成规则', onClick: () => setRulesOpen(true) },
    ...(activeTab === 'list' ? [
      { label: '批量结算', onClick: handleBatchSettle },
      { label: '批量发放', onClick: handleBatchPay },
    ] : []),
    {
      label: '导出',
      onClick: () => exportRowsToCsv('视频提成列表', [
        { key: 'employee_name', label: '员工姓名' },
        { key: 'department', label: '部门' },
        { key: 'performance', label: '业绩金额' },
        { key: 'commission_rate', label: '提成比例' },
        { key: 'commission_amount', label: '提成金额' },
        { key: 'settle_month', label: '结算月份' },
        { key: 'status', label: '状态' },
      ], table.data || []),
    },
  ];

  const rowActions = (record: any): ActionButton[] => {
    const actions: ActionButton[] = [];
    if (record.status === 'pending') {
      actions.push({ label: '结算', onClick: () => handleSettle(record) });
      actions.push({
        label: calcLoading || rulesLoading ? '计算中...' : '重新计算',
        icon: <RefreshCw className="size-3.5" />,
        onClick: () => handleRecalc(record),
        disabled: calcLoading || rulesLoading || opLocked,
      });
    }
    if (record.status === 'settled') {
      actions.push({ label: '发放', onClick: () => handlePay(record) });
    }
    actions.push({ label: '编辑', onClick: () => { setEditRecord(record); setFormOpen(true); } });
    actions.push({ label: '删除', variant: 'destructive', icon: <Trash2 className="size-3.5" />, onClick: () => setDeleteId(record.id) });
    return actions;
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">提成管理</h2>
            <p className="text-sm text-muted-foreground">管理视频业务提成计算和发放</p>
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
          <ServerListPage
            title=""
            description=""
            data={table.data || []}
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
              { key: 'employee_name', label: '员工姓名', type: 'input', placeholder: '员工姓名' },
              { key: 'settle_month', label: '结算月份', type: 'input', placeholder: '如 2026-08' },
            ]}
            primaryActions={[
              {
                label: '导出',
                onClick: () => exportRowsToCsv('发放记录', [
                  { key: 'payout_no', label: '发放单号' },
                  { key: 'employee_name', label: '员工姓名' },
                  { key: 'department', label: '部门' },
                  { key: 'amount', label: '发放金额' },
                  { key: 'settle_month', label: '结算月份' },
                  { key: 'pay_time', label: '发放时间' },
                ], payoutRecords),
              },
            ]}
            rowActions={() => [{ label: '查看详情', onClick: () => toast.info('查看详情') }]}
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

      {/* 新建/编辑弹窗 */}
      <Dialog
        open={formOpen}
        onOpenChange={(o) => {
          setFormOpen(o);
          if (o && editRecord) {
            setFormValues({
              employee_name: editRecord.employee_name,
              department: editRecord.department,
              settle_month: editRecord.settle_month,
              performance: String(editRecord.performance || ''),
              commission_rate: String(editRecord.commission_rate || ''),
              commission_amount: String(editRecord.commission_amount || ''),
              rule_name: '',
            });
          } else if (o && !editRecord) {
            setFormValues({
              employee_name: '', department: '视频部', settle_month: '',
              performance: '', commission_rate: '', commission_amount: '', rule_name: '',
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
                <Label><span className="text-destructive">*</span> 员工姓名</Label>
                <Select
                  value={formValues.employee_name}
                  onValueChange={(v) => setFormValues({ ...formValues, employee_name: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择员工" />
                  </SelectTrigger>
                  <SelectContent>
                    {EMPLOYEE_OPTS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label><span className="text-destructive">*</span> 部门</Label>
                <Select
                  value={formValues.department}
                  onValueChange={(v) => setFormValues({ ...formValues, department: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
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

            <AutoCalcBlock />

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label><span className="text-destructive">*</span> 业绩金额</Label>
                <Input
                  type="number"
                  value={formValues.performance}
                  onChange={(e) => setFormValues({ ...formValues, performance: e.target.value })}
                  placeholder="元"
                />
              </div>
              <div className="space-y-1.5">
                <Label><span className="text-destructive">*</span> 提成比例</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formValues.commission_rate}
                  onChange={(e) => setFormValues({ ...formValues, commission_rate: e.target.value })}
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
                if (!formValues.employee_name || !formValues.settle_month) {
                  toast.warning('请填写员工姓名和结算月份');
                  return;
                }
                try {
                  const perf = Number(formValues.performance) || 0;
                  const rate = Number(formValues.commission_rate) || 0;
                  const amount = Number(formValues.commission_amount) || 0;
                  let res;
                  if (editRecord) {
                    res = await videoCommissionsApi.update(editRecord.id, {
                      employee_name: formValues.employee_name,
                      department: formValues.department,
                      settle_month: formValues.settle_month,
                      performance: perf,
                      commission_rate: rate,
                      commission_amount: amount,
                    });
                  } else {
                    res = await videoCommissionsApi.create({
                      employee_name: formValues.employee_name,
                      department: formValues.department,
                      settle_month: formValues.settle_month,
                      performance: perf,
                      commission_rate: rate,
                      commission_amount: amount,
                      status: 'pending',
                      commission_no: `VC${Date.now().toString().slice(-6)}`,
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
        bizType="video"
        bizLabel="视频业务"
      />
    </>
  );
}

export default VideoCommissionPage;
