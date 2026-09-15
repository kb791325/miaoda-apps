import { useState, useMemo } from 'react';
import ServerListPage, { type FilterField, type ActionButton, type Column } from '@/components/ServerListPage';
import StatusBadge from '@/components/StatusBadge';
import { Plus, CheckCircle, XCircle, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { formatAmount, formatDateTime } from '@/lib/format';
import { transfersApi } from '@/api';
import { useServerList } from '@/hooks/useServerList';
import { exportCSV } from '@/lib/export';
import { t, useLang } from '@/lib/i18n';
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
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useApp } from '@/context/AppContext';
import type { Transfer } from '@/api/types';

const STATUS_OPTS = [
  { label: '待审批', value: 'pending_approval' },
  { label: '审批中', value: 'approving' },
  { label: '已完成', value: 'approved' },
  { label: '已驳回', value: 'rejected' },
];

const PORT_OPTS = ['巨量千川', '腾讯广告', '磁力引擎', '百度营销', '快手广告'].map((p) => ({
  label: p,
  value: p,
}));

const STATUS_MAP: Record<string, string> = {
  pending_approval: '待审批',
  approving: '审批中',
  approved: '已完成',
  rejected: '已驳回',
};

const STATUS_VARIANT: Record<string, 'default' | 'info' | 'success' | 'warning' | 'danger'> = {
  pending_approval: 'warning',
  approving: 'info',
  approved: 'success',
  rejected: 'danger',
};

const FILTERS: FilterField[] = [
  { key: 'keyword', label: '集团/主体', type: 'input', placeholder: '请输入集团或主体名称' },
  { key: 'status', label: '状态', type: 'select', options: STATUS_OPTS },
];

interface TransferForm {
  group_name: string;
  entity_name: string;
  from_port: string;
  to_port: string;
  transfer_amount: string;
}

const EMPTY_FORM: TransferForm = {
  group_name: '',
  entity_name: '',
  from_port: '',
  to_port: '',
  transfer_amount: '',
};

export default function TransferPage() {
  useLang();
  const { user } = useApp();
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [approveDialog, setApproveDialog] = useState<{ id: number; type: 'approve' | 'reject' } | null>(null);
  const [approveComment, setApproveComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 新建转户
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<TransferForm>(EMPTY_FORM);
  const [creating, setCreating] = useState(false);

  // 详情
  const [detail, setDetail] = useState<Transfer | null>(null);

  const table = useServerList({
    fetchFn: transfersApi.list,
    defaultPageSize: 20,
  });

  const isManager = user?.role === 'admin' || user?.role === 'manager';

  const columns: Column<Transfer>[] = useMemo(() => [
    { key: 'transfer_no', title: '转户编号', dataIndex: 'transfer_no' as const, width: '150px', sortable: true },
    {
      key: 'group_name',
      title: '集团名称',
      dataIndex: 'group_name' as const,
      render: (r) => <span className="font-medium">{r.group_name}</span>,
    },
    { key: 'entity_name', title: '主体名称', dataIndex: 'entity_name' as const },
    { key: 'from_port', title: '转出端口', dataIndex: 'from_port' as const, width: '110px' },
    { key: 'to_port', title: '转入端口', dataIndex: 'to_port' as const, width: '110px' },
    {
      key: 'transfer_amount',
      title: '转户金额',
      width: '130px',
      align: 'right',
      sortable: true,
      render: (r) => <span className="tabular-nums font-medium">{formatAmount(r.transfer_amount)}</span>,
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
      key: 'created_at',
      title: '申请时间',
      dataIndex: 'created_at' as const,
      width: '160px',
      sortable: true,
      render: (r) => formatDateTime(r.created_at),
    },
  ], []);

  // 审批通过 / 驳回：直接更新业务记录状态（mock 与真实模式均可用）
  const handleApprove = async () => {
    if (!approveDialog) return;
    setSubmitting(true);
    try {
      const newStatus = approveDialog.type === 'approve' ? 'approved' : 'rejected';
      const res = await transfersApi.update(approveDialog.id, { status: newStatus });
      if (res.code === 0) {
        toast.success(approveDialog.type === 'approve' ? t('审批通过') : t('已驳回'));
        setApproveDialog(null);
        setApproveComment('');
        table.refresh();
      } else {
        toast.error(res.message || t('操作失败'));
      }
    } catch {
      toast.error(t('操作失败'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await transfersApi.remove(deleteId);
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

  const resetForm = () => setForm(EMPTY_FORM);

  const handleCreate = async () => {
    if (!form.group_name.trim() || !form.entity_name.trim()) {
      toast.warning(t('请填写集团名称和主体名称'));
      return;
    }
    if (!form.from_port || !form.to_port) {
      toast.warning(t('请选择转出端口和转入端口'));
      return;
    }
    if (form.from_port === form.to_port) {
      toast.warning(t('转出端口与转入端口不能相同'));
      return;
    }
    const amount = Number(form.transfer_amount);
    if (!amount || amount <= 0) {
      toast.warning(t('请输入有效的转户金额'));
      return;
    }
    setCreating(true);
    try {
      const transferNo = `ZH${Date.now().toString().slice(-8)}`;
      const res = await transfersApi.create({
        transfer_no: transferNo,
        group_name: form.group_name.trim(),
        entity_name: form.entity_name.trim(),
        from_port: form.from_port,
        to_port: form.to_port,
        transfer_amount: amount,
        status: 'pending_approval',
        applicant_id: user?.id,
        applicant_name: user?.name,
      });
      if (res.code === 0) {
        toast.success(t('创建成功'));
        setCreateOpen(false);
        resetForm();
        table.refresh();
      } else {
        toast.error(res.message || t('创建失败'));
      }
    } catch {
      toast.error(t('创建失败'));
    } finally {
      setCreating(false);
    }
  };

  const handleBatchApprove = async () => {
    const pendingRows = (table.data as Transfer[]).filter(
      (r) => selectedKeys.includes(String(r.id)) && (r.status === 'pending_approval' || r.status === 'approving'),
    );
    if (pendingRows.length === 0) {
      toast.warning(t('请选择待审批或审批中的记录'));
      return;
    }
    setSubmitting(true);
    try {
      await Promise.all(pendingRows.map((r) => transfersApi.update(r.id, { status: 'approved' })));
      toast.success(`${t('已批量通过')} ${pendingRows.length} ${t('条')}`);
      setSelectedKeys([]);
      table.refresh();
    } catch {
      toast.error(t('操作失败'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleExport = () => {
    const rows = (table.data as Transfer[]).map((r) => [
      r.transfer_no,
      r.group_name,
      r.entity_name,
      r.from_port,
      r.to_port,
      r.transfer_amount,
      STATUS_MAP[r.status] || r.status,
      r.created_at,
    ]);
    if (rows.length === 0) {
      toast.warning(t('当前无可导出的数据'));
      return;
    }
    exportCSV(
      t('转户管理'),
      [t('转户编号'), t('集团名称'), t('主体名称'), t('转出端口'), t('转入端口'), t('转户金额'), t('状态'), t('申请时间')],
      rows,
    );
    toast.success(`${t('已导出')} ${rows.length} ${t('条')}`);
  };

  const primaryActions: ActionButton[] = [
    { label: '新建转户', primary: true, icon: <Plus className="size-3.5" />, onClick: () => setCreateOpen(true) },
    { label: '批量审批', onClick: handleBatchApprove },
    { label: '导出', onClick: handleExport },
  ];

  const rowActions = (record: Transfer): ActionButton[] => {
    const actions: ActionButton[] = [
      { label: '详情', onClick: () => setDetail(record) },
    ];
    if (isManager && (record.status === 'pending_approval' || record.status === 'approving')) {
      actions.push(
        { label: '审批通过', onClick: () => setApproveDialog({ id: record.id, type: 'approve' }) },
        { label: '驳回', onClick: () => setApproveDialog({ id: record.id, type: 'reject' }) },
      );
    }
    actions.push({ label: '删除', onClick: () => setDeleteId(record.id) });
    return actions;
  };

  return (
    <>
      <ServerListPage<Transfer>
        title={t('转户管理')}
        description="管理账户转移申请，跟踪转户进度"
        data={table.data as Transfer[]}
        total={table.total}
        loading={table.loading}
        columns={columns}
        filters={FILTERS}
        primaryActions={primaryActions}
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
            <AlertDialogDescription>{t('删除后将无法恢复，确定要删除该转户记录吗？')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('取消')}</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleDelete}>
              {t('确认删除')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 审批通过 / 驳回 */}
      <Dialog open={!!approveDialog} onOpenChange={(o) => !o && setApproveDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {approveDialog?.type === 'approve' ? (
                <><CheckCircle className="size-5 text-emerald-500" /> {t('审批通过')}</>
              ) : (
                <><XCircle className="size-5 text-red-500" /> {t('审批驳回')}</>
              )}
            </DialogTitle>
            <DialogDescription>
              {t('请填写')}{approveDialog?.type === 'approve' ? t('通过') : t('驳回')}{t('意见')}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder={`${t('请输入')}${approveDialog?.type === 'approve' ? t('通过') : t('驳回')}${t('意见')}`}
            value={approveComment}
            onChange={(e) => setApproveComment(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialog(null)}>{t('取消')}</Button>
            <Button
              variant={approveDialog?.type === 'approve' ? 'default' : 'destructive'}
              onClick={handleApprove}
              disabled={submitting}
            >
              {submitting ? t('提交中...') : t('确认')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 新建转户 */}
      <Dialog open={createOpen} onOpenChange={(o) => { setCreateOpen(o); if (!o) resetForm(); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="size-4 text-primary" /> {t('新建转户')}
            </DialogTitle>
            <DialogDescription>{t('填写转户信息，提交后进入审批流程')}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>{t('集团名称')} <span className="text-red-500">*</span></Label>
                <Input
                  value={form.group_name}
                  onChange={(e) => setForm({ ...form, group_name: e.target.value })}
                  placeholder={t('请输入集团名称')}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t('主体名称')} <span className="text-red-500">*</span></Label>
                <Input
                  value={form.entity_name}
                  onChange={(e) => setForm({ ...form, entity_name: e.target.value })}
                  placeholder={t('请输入主体名称')}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>{t('转出端口')} <span className="text-red-500">*</span></Label>
                <Select value={form.from_port} onValueChange={(v) => setForm({ ...form, from_port: v })}>
                  <SelectTrigger><SelectValue placeholder={t('请选择')} /></SelectTrigger>
                  <SelectContent>
                    {PORT_OPTS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>{t(p.label)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t('转入端口')} <span className="text-red-500">*</span></Label>
                <Select value={form.to_port} onValueChange={(v) => setForm({ ...form, to_port: v })}>
                  <SelectTrigger><SelectValue placeholder={t('请选择')} /></SelectTrigger>
                  <SelectContent>
                    {PORT_OPTS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>{t(p.label)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t('转户金额')} <span className="text-red-500">*</span></Label>
              <Input
                type="number"
                min="0"
                value={form.transfer_amount}
                onChange={(e) => setForm({ ...form, transfer_amount: e.target.value })}
                placeholder={t('请输入转户金额')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateOpen(false); resetForm(); }}>{t('取消')}</Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? t('提交中...') : t('提交')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 详情 */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="size-4 text-primary" /> {t('转户详情')}
            </DialogTitle>
            <DialogDescription>{detail?.transfer_no}</DialogDescription>
          </DialogHeader>
          {detail && (
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 py-2 text-sm">
              <div>
                <div className="text-xs text-muted-foreground">{t('集团名称')}</div>
                <div className="mt-0.5 font-medium">{detail.group_name}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">{t('主体名称')}</div>
                <div className="mt-0.5 font-medium">{detail.entity_name}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">{t('转出端口')}</div>
                <div className="mt-0.5">{t(detail.from_port || '')}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">{t('转入端口')}</div>
                <div className="mt-0.5">{t(detail.to_port || '')}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">{t('转户金额')}</div>
                <div className="mt-0.5 font-semibold tabular-nums">{formatAmount(detail.transfer_amount)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">{t('状态')}</div>
                <div className="mt-0.5">
                  <StatusBadge status={STATUS_MAP[detail.status] || detail.status} variant={STATUS_VARIANT[detail.status] || 'default'} />
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">{t('申请人')}</div>
                <div className="mt-0.5">{(detail as any).applicant_name || '-'}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">{t('申请时间')}</div>
                <div className="mt-0.5">{formatDateTime(detail.created_at)}</div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetail(null)}>{t('关闭')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
