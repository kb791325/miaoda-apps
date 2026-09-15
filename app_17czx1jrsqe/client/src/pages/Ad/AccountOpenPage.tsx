import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import ServerListPage, { type FilterField, type ActionButton, type Column } from '@/components/ServerListPage';
import StatusBadge from '@/components/StatusBadge';
import { Plus, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { formatAmount, formatDateTime } from '@/lib/format';
import { exportCSV } from '@/lib/export';
import { accountApplicationsApi, approvalsApi } from '@/api';
import { useServerList } from '@/hooks/useServerList';
import { t, useLang } from '@/lib/i18n';
import ApprovalTimeline, { type ApprovalStep } from '@/components/ApprovalTimeline';
import FieldFormDialog, { type FormFieldDef } from '@/components/FieldFormDialog';
import ApprovalDetailDialog, { type ApprovalSummaryField } from '@/components/ApprovalDetailDialog';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useApp } from '@/context/AppContext';
import type { AccountApplication } from '@/api/types';

const FILTERS: FilterField[] = [
  { key: 'keyword', label: '集团/主体', type: 'input', placeholder: '请输入集团或主体名称' },
  { key: 'port', label: '端口', type: 'select', options: PORT_OPTS },
  { key: 'status', label: '状态', type: 'select', options: STATUS_OPTS },
];

const FORM_FIELDS: FormFieldDef[] = [
  { key: 'group_name', label: '集团名称', type: 'input', required: true, placeholder: '请输入集团名称' },
  { key: 'entity_name', label: '主体名称', type: 'input', required: true, placeholder: '请输入主体名称' },
  { key: 'port', label: '投放端口', type: 'select', required: true, options: PORT_OPTS },
  { key: 'industry', label: '所属行业', type: 'select', options: INDUSTRY_OPTS, defaultValue: '电商' },
  { key: 'apply_amount', label: '申请金额（元）', type: 'number', required: true, placeholder: '请输入申请金额' },
];

import { STATUS_OPTS, STATUS_MAP, STATUS_VARIANT, PORT_OPTS, INDUSTRY_OPTS, genApprovalSteps } from './accountOpenMeta';

export default function AccountOpenPage() {
  useLang();
  const navigate = useNavigate();
  const { user } = useApp();
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // 新建开户申请
  const [createOpen, setCreateOpen] = useState(false);
  const [approveRecord, setApproveRecord] = useState<AccountApplication | null>(null);


  // 批量开户
  const [batchOpen, setBatchOpen] = useState(false);
  const [batchRows, setBatchRows] = useState<any[]>([
    { group_name: '', entity_name: '', port: '巨量千川', industry: '电商', apply_amount: '' },
    { group_name: '', entity_name: '', port: '巨量千川', industry: '电商', apply_amount: '' },
  ]);
  const [batchSubmitting, setBatchSubmitting] = useState(false);

  const addBatchRow = () => {
    setBatchRows((prev) => [...prev, { group_name: '', entity_name: '', port: '巨量千川', industry: '电商', apply_amount: '' }]);
  };
  const removeBatchRow = (idx: number) => {
    if (batchRows.length <= 2) {
      toast.warning('至少保留 2 行');
      return;
    }
    setBatchRows((prev) => prev.filter((_, i) => i !== idx));
  };
  const updateBatchRow = (idx: number, field: string, value: string) => {
    setBatchRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
  };

  const handleBatchSubmit = async () => {
    const valid = batchRows.filter((r) => r.entity_name.trim() && r.group_name.trim() && Number(r.apply_amount) > 0);
    if (valid.length < 2) {
      toast.warning('请至少完整填写 2 行');
      return;
    }
    setBatchSubmitting(true);
    try {
      let success = 0;
      for (const row of valid) {
        const res = await accountApplicationsApi.create({
          apply_no: `KH${Date.now().toString().slice(-8)}${success}`,
          group_name: row.group_name.trim(),
          entity_name: row.entity_name.trim(),
          port: row.port,
          industry: row.industry,
          apply_amount: Number(row.apply_amount),
          status: 'pending_approval',
          applicant_id: user?.id,
          applicant_name: user?.name,
        });
        if (res.code === 0) success++;
      }
      toast.success(`成功提交 ${success} 条开户申请`);
      setBatchOpen(false);
      setBatchRows([
        { group_name: '', entity_name: '', port: '巨量千川', industry: '电商', apply_amount: '' },
        { group_name: '', entity_name: '', port: '巨量千川', industry: '电商', apply_amount: '' },
      ]);
      table.reload();
    } catch {
      toast.error('提交失败');
    } finally {
      setBatchSubmitting(false);
    }
  };

  const table = useServerList({
    fetchFn: accountApplicationsApi.list,
    defaultPageSize: 20,
  });

  const isManager = user?.role === 'admin' || user?.role === 'manager';

  const columns: Column<AccountApplication>[] = useMemo(() => [
    { key: 'apply_no', title: '申请编号', dataIndex: 'apply_no' as const, width: '160px' },
    {
      key: 'group_name',
      title: '集团名称',
      dataIndex: 'group_name' as const,
      render: (r) => <span className="font-medium">{r.group_name}</span>,
    },
    { key: 'entity_name', title: '主体名称', dataIndex: 'entity_name' as const },
    { key: 'port', title: '端口', dataIndex: 'port' as const, width: '110px' },
    { key: 'industry', title: '行业', dataIndex: 'industry' as const, width: '100px' },
    {
      key: 'apply_amount',
      title: '申请金额',
      width: '140px',
      align: 'right',
      sortable: true,
      render: (r) => <span className="tabular-nums">{formatAmount(r.apply_amount)}</span>,
    },
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
      title: '申请时间',
      dataIndex: 'created_at' as const,
      width: '160px',
      sortable: true,
      render: (r) => formatDateTime(r.created_at),
    },
  ], []);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await accountApplicationsApi.remove(deleteId);
      if (res.code === 0) {
        toast.success(t('删除成功'));
        setDeleteId(null);
        table.refresh();
      } else {
        toast.error(res.message || t('删除失败'));
      }
    } catch {
      toast.error(t('删除失败'));
    }
  };

  const handleCreate = async (values: Record<string, unknown>): Promise<boolean> => {
    try {
      const applicationNo = `KH${Date.now().toString().slice(-8)}`;
      const res = await accountApplicationsApi.create({
        apply_no: applicationNo,
        group_name: String(values.group_name || '').trim(),
        entity_name: String(values.entity_name || '').trim(),
        port: String(values.port || ''),
        industry: String(values.industry || '电商'),
        apply_amount: Number(values.apply_amount || 0),
        status: 'pending_approval',
        applicant_id: user?.id,
        applicant_name: user?.name,
      });
      if (res.code === 0) {
        toast.success(t('创建成功'));
        table.refresh();
        return true;
      }
      toast.error(res.message || t('创建失败'));
      return false;
    } catch {
      toast.error(t('创建失败'));
      return false;
    }
  };

  // 审批详情弹窗
  const approvalSummary = useMemo<ApprovalSummaryField[]>(() => {
    if (!approveRecord) return [];
    return [
      { label: '业务类型', value: '开户申请' },
      { label: '单据编号', value: approveRecord.apply_no },
      { label: '集团名称', value: approveRecord.group_name },
      { label: '主体名称', value: approveRecord.entity_name },
      { label: '申请人', value: (approveRecord as any).applicant_name || user?.name || '-' },
      { label: '申请时间', value: formatDateTime(approveRecord.created_at) },
      { label: '申请金额', value: <span className="font-semibold text-primary tabular-nums">{formatAmount(approveRecord.apply_amount)}</span> },
      { label: '投放端口', value: approveRecord.port },
      { label: '行业', value: approveRecord.industry },
    ];
  }, [approveRecord, user]);

  const approvalSteps = useMemo<ApprovalStep[]>(() => {
    if (!approveRecord) return [];
    return genApprovalSteps(approveRecord);
  }, [approveRecord]);

  const approveStatusVariant = useMemo(() => {
    if (!approveRecord) return 'default' as const;
    const s = approveRecord.status;
    if (s === 'approved' || s === 'opened') return 'success' as const;
    if (s === 'rejected') return 'destructive' as const;
    return 'warning' as const;
  }, [approveRecord]);

  const handleApproveAction = async (type: 'approve' | 'reject', comment: string): Promise<boolean> => {
    if (!approveRecord) return false;
    setSubmitting(true);
    try {
      const res = type === 'approve'
        ? await approvalsApi.approve(approveRecord.id, comment || '')
        : await approvalsApi.reject(approveRecord.id, comment || '');
      if (res.code === 0) {
        toast.success(type === 'approve' ? '审批通过' : '已驳回');
        setApproveRecord(null);
        table.refresh();
        return true;
      }
      toast.error(res.message || '操作失败');
      return false;
    } catch {
      toast.error('操作失败');
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const canApproveRecord = isManager && (approveRecord?.status === 'pending_approval' || approveRecord?.status === 'approving' || approveRecord?.status === 'approving2');
  const currentStepName = useMemo(() => {
    const cur = approvalSteps.find(s => s.status === 'current');
    return cur?.step_name || '';
  }, [approvalSteps]);

  const handleExport = () => {
    const rows = (table.data as AccountApplication[]).map((r) => [
      r.apply_no,
      r.group_name,
      r.entity_name,
      r.port,
      r.industry,
      r.apply_amount,
      STATUS_MAP[r.status] || r.status,
      (r as any).applicant_name || '',
      r.created_at,
    ]);
    if (rows.length === 0) {
      toast.warning(t('当前无可导出的数据'));
      return;
    }
    exportCSV(
      t('开户管理'),
      [t('申请编号'), t('集团名称'), t('主体名称'), t('端口'), t('行业'), t('申请金额'), t('状态'), t('申请人'), t('申请时间')],
      rows,
    );
    toast.success(`${t('已导出')} ${rows.length} ${t('条')}`);
  };

  const primaryActions: ActionButton[] = [
    { label: '新建开户申请', primary: true, icon: <Plus className="size-3.5" />, onClick: () => setCreateOpen(true) },
    { label: '批量开户', icon: <Users className="size-3.5" />, onClick: () => setBatchOpen(true) },
    { label: '导出', onClick: handleExport },
  ];

  const rowActions = (record: AccountApplication): ActionButton[] => {
    const actions: ActionButton[] = [
      { label: '详情', onClick: () => navigate(`/advertising/account-open/${record.id}`) },
    ];
    if (isManager && (record.status === 'pending_approval' || record.status === 'approving' || record.status === 'approving2')) {
      actions.push({ label: '审批', onClick: () => setApproveRecord(record) });
    } else if (record.status === 'approved' || record.status === 'rejected' || record.status === 'opened') {
      actions.push({ label: '查看审批', onClick: () => setApproveRecord(record) });
    }
    actions.push({ label: '删除', onClick: () => setDeleteId(record.id) });
    return actions;
  };

  return (
    <>
      <ServerListPage<AccountApplication>
        title={t('开户管理')}
        description={t('管理广告账户开户申请，支持审批和状态跟踪')}
        data={table.data as AccountApplication[]}
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

      {/* 删除确认 */}
      <AlertDialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('确认删除')}</AlertDialogTitle>
            <AlertDialogDescription>{t('删除后将无法恢复，确定要删除该开户申请吗？')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('取消')}</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleDelete}>
              {t('确认删除')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 新建开户申请 */}
      <FieldFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title={t('新建开户申请')}
        description={t('填写开户申请信息，提交后进入审批流程')}
        fields={FORM_FIELDS}
        submitLabel="提交申请"
        onSubmit={handleCreate}
        draft={{
          formType: 'account_open',
          businessId: 'new',
          summaryField: 'group_name',
        }}
        confirmSubmit={{
          amountField: 'apply_amount',
          summaryFields: [
            { key: 'group_name', label: '集团名称' },
            { key: 'entity_name', label: '主体名称' },
            { key: 'port', label: '投放端口' },
            { key: 'apply_amount', label: '申请金额' },
          ],
          title: '确认提交开户申请？',
        }}
      />

      {/* 审批详情（统一组件） */}
      <ApprovalDetailDialog
        open={!!approveRecord}
        onOpenChange={(o) => !o && setApproveRecord(null)}
        title={approveRecord ? `${approveRecord.group_name} - 开户申请` : ''}
        subtitle={approveRecord?.apply_no || ''}
        status={approveRecord ? (STATUS_MAP[approveRecord.status] || approveRecord.status) : ''}
        statusVariant={approveStatusVariant}
        summaryFields={approvalSummary}
        detailLabel="申请信息"
        detailContent={
          approveRecord ? (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-muted-foreground">集团名称：</span>{approveRecord.group_name}</div>
              <div><span className="text-muted-foreground">主体名称：</span>{approveRecord.entity_name}</div>
              <div><span className="text-muted-foreground">投放端口：</span>{approveRecord.port}</div>
              <div><span className="text-muted-foreground">所属行业：</span>{approveRecord.industry}</div>
              <div className="col-span-2"><span className="text-muted-foreground">申请金额：</span><span className="font-semibold text-primary tabular-nums">{formatAmount(approveRecord.apply_amount)}</span></div>
            </div>
          ) : null
        }
        approvalSteps={approvalSteps}
        canApprove={canApproveRecord}
        approving={submitting}
        onApprove={handleApproveAction}
        currentStepName={currentStepName}
      />

      {/* 批量开户 */}
      <Dialog open={batchOpen} onOpenChange={(o) => !o && setBatchOpen(false)}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>批量开户申请</DialogTitle>
            <DialogDescription>一次性提交多个开户申请，提交后进入审批流程</DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] space-y-2 overflow-y-auto">
            <div className="grid grid-cols-12 gap-2 px-1 text-xs font-medium text-muted-foreground">
              <div className="col-span-3">集团名称</div>
              <div className="col-span-3">主体名称</div>
              <div className="col-span-2">端口</div>
              <div className="col-span-2">申请金额</div>
              <div className="col-span-2">操作</div>
            </div>
            {batchRows.map((row, idx) => (
              <div key={idx} className="grid grid-cols-12 items-start gap-2">
                <div className="col-span-3">
                  <Input
                    size-sm
                    placeholder="集团名称"
                    value={row.group_name}
                    onChange={(e) => updateBatchRow(idx, 'group_name', e.target.value)}
                  />
                </div>
                <div className="col-span-3">
                  <Input
                    placeholder="主体名称"
                    value={row.entity_name}
                    onChange={(e) => updateBatchRow(idx, 'entity_name', e.target.value)}
                  />
                </div>
                <div className="col-span-2">
                  <Select value={row.port} onValueChange={(v) => updateBatchRow(idx, 'port', v)}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="巨量千川">巨量千川</SelectItem>
                      <SelectItem value="腾讯广告">腾讯广告</SelectItem>
                      <SelectItem value="磁力金牛">磁力金牛</SelectItem>
                      <SelectItem value="小红书">小红书</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Input
                    type="number"
                    placeholder="金额"
                    value={row.apply_amount}
                    onChange={(e) => updateBatchRow(idx, 'apply_amount', e.target.value)}
                  />
                </div>
                <div className="col-span-2 flex items-center gap-2">
                  <Button variant="ghost" size="sm" className="h-9 text-xs" onClick={() => addBatchRow()}>
                    + 增加
                  </Button>
                  <Button variant="ghost" size="sm" className="h-9 text-xs text-destructive" onClick={() => removeBatchRow(idx)}>
                    删除
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBatchOpen(false)}>取消</Button>
            <Button onClick={handleBatchSubmit} disabled={batchSubmitting}>
              {batchSubmitting ? '提交中...' : '批量提交'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
