import { useState, useMemo } from 'react';
import { t } from '@/lib/i18n';
import ServerListPage, { type FilterField, type ActionButton, type Column } from '@/components/ServerListPage';
import StatusBadge from '@/components/StatusBadge';
import { Plus, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { formatAmount, formatDateTime } from '@/lib/format';
import { exportRowsToCsv } from '@/lib/export';
import { filingsApi, approvalsApi } from '@/api';
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
import FieldFormDialog, { type FormFieldDef } from '@/components/FieldFormDialog';
import type { Filing } from '@/api/types';

const STATUS_OPTS = [
  { label: '待报备', value: 'pending' },
  { label: '报备中', value: 'reporting' },
  { label: '已报备', value: 'reported' },
  { label: '已驳回', value: 'rejected' },
];

const PORT_OPTS = [
  { label: '巨量千川', value: '巨量千川' },
  { label: '腾讯广告', value: '腾讯广告' },
  { label: '磁力引擎', value: '磁力引擎' },
  { label: '百度营销', value: '百度营销' },
  { label: '其他', value: '其他' },
];

const STATUS_MAP: Record<string, string> = {
  pending: '待报备',
  reporting: '报备中',
  reported: '已报备',
  rejected: '已驳回',
};

const STATUS_VARIANT: Record<string, 'default' | 'info' | 'success' | 'warning' | 'danger'> = {
  pending: 'warning',
  reporting: 'info',
  reported: 'success',
  rejected: 'danger',
};

const FILTERS: FilterField[] = [
  { key: 'keyword', label: '集团/主体', type: 'input', placeholder: '请输入集团或主体名称' },
  { key: 'port', label: '端口', type: 'select', options: PORT_OPTS },
  { key: 'status', label: '报备状态', type: 'select', options: STATUS_OPTS },
];

export default function FilingPage() {
  const { user } = useApp();
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [approveDialog, setApproveDialog] = useState<{ id: number; type: 'approve' | 'reject' } | null>(null);
  const [approveComment, setApproveComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [detailRecord, setDetailRecord] = useState<Filing | null>(null);
  const [batchOpen, setBatchOpen] = useState(false);
  const [batchSubmitting, setBatchSubmitting] = useState(false);
  const [batchForm, setBatchForm] = useState({
    group_name: '',
    port: '巨量千川',
    filing_type: '新客户报备',
    filing_amount: '',
    entities: '',
  });

  const table = useServerList({
    fetchFn: filingsApi.list,
    defaultPageSize: 20,
  });

  const isManager = user?.role === 'admin' || user?.role === 'manager';

  const columns: Column<Filing>[] = useMemo(() => [
    { key: 'filing_no', title: '报备编号', dataIndex: 'filing_no' as const, width: '150px', sortable: true },
    {
      key: 'group_name',
      title: '集团名称',
      dataIndex: 'group_name' as const,
      render: (r) => <span className="font-medium">{r.group_name}</span>,
    },
    { key: 'entity_name', title: '主体名称', dataIndex: 'entity_name' as const },
    { key: 'port', title: '端口', dataIndex: 'port' as const, width: '110px' },
    { key: 'filing_type', title: '报备类型', dataIndex: 'filing_type' as const, width: '110px' },
    {
      key: 'filing_amount',
      title: '报备金额',
      width: '130px',
      align: 'right',
      sortable: true,
      render: (r) => <span className="tabular-nums">{formatAmount(r.filing_amount)}</span>,
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
      title: '报备时间',
      dataIndex: 'created_at' as const,
      width: '160px',
      sortable: true,
      render: (r) => formatDateTime(r.created_at),
    },
  ], []);

  const handleApprove = async () => {
    if (!approveDialog) return;
    setSubmitting(true);
    try {
      const res = approveDialog.type === 'approve'
        ? await approvalsApi.approve(approveDialog.id, approveComment)
        : await approvalsApi.reject(approveDialog.id, approveComment);
      if (res.code === 0) {
        toast.success(approveDialog.type === 'approve' ? '审批通过' : '已驳回');
        setApproveDialog(null);
        setApproveComment('');
        table.refresh();
      } else {
        toast.error(res.message || '操作失败');
      }
    } catch (e) {
      toast.error('操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await filingsApi.remove(deleteId);
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

  const openBatch = () => {
    setBatchForm({ group_name: '', port: '巨量千川', filing_type: '新客户报备', filing_amount: '', entities: '' });
    setBatchOpen(true);
  };

  const handleBatchSubmit = async () => {
    const lines = batchForm.entities.split('\n').map((s) => s.trim()).filter(Boolean);
    if (!batchForm.group_name.trim()) { toast.warning('请输入集团名称'); return; }
    if (lines.length === 0) { toast.warning('请至少填写一个主体名称'); return; }
    setBatchSubmitting(true);
    try {
      let ok = 0;
      const stamp = Date.now().toString().slice(-8);
      for (let i = 0; i < lines.length; i += 1) {
        const res = await filingsApi.create({
          group_name: batchForm.group_name.trim(),
          entity_name: lines[i],
          port: batchForm.port,
          filing_type: batchForm.filing_type,
          filing_amount: Number(batchForm.filing_amount) || 0,
          filing_no: `BB${stamp}${String(i + 1).padStart(2, '0')}`,
          status: 'pending',
        });
        if (res.code === 0) ok += 1;
      }
      if (ok > 0) {
        toast.success(`已提交 ${ok} 条报备申请`);
        setBatchOpen(false);
        table.refresh();
      } else {
        toast.error('报备提交失败，请重试');
      }
    } finally {
      setBatchSubmitting(false);
    }
  };

  const primaryActions: ActionButton[] = [
    { label: '新建报备', primary: true, icon: <Plus className="size-3.5" />, onClick: () => setFormOpen(true) },
    { label: '批量报备', onClick: openBatch },
    {
      label: '导出',
      onClick: () => exportRowsToCsv('报备列表', [
        { key: 'filing_no', label: '报备单号' },
        { key: 'group_name', label: '集团名称' },
        { key: 'entity_name', label: '主体名称' },
        { key: 'port', label: '端口' },
        { key: 'filing_type', label: '报备类型' },
        { key: 'filing_amount', label: '报备金额' },
        { key: 'status', label: '状态' },
        { key: 'created_at', label: '创建时间' },
      ], table.data as Filing[]),
    },
  ];

  const rowActions = (record: Filing): ActionButton[] => {
    const actions: ActionButton[] = [
      { label: '详情', onClick: () => setDetailRecord(record) },
    ];
    if (isManager && (record.status === 'pending' || record.status === 'reporting')) {
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
      <ServerListPage<Filing>
        title={t('报备管理')}
        description="管理客户报备信息，跟踪报备状态"
        data={table.data as Filing[]}
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

      <AlertDialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              删除后将无法恢复，确定要删除该报备记录吗？
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

      <Dialog open={!!approveDialog} onOpenChange={(o) => !o && setApproveDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {approveDialog?.type === 'approve' ? (
                <><CheckCircle className="size-5 text-emerald-500" /> 审批通过</>
              ) : (
                <><XCircle className="size-5 text-red-500" /> 审批驳回</>
              )}
            </DialogTitle>
            <DialogDescription>
              请填写{approveDialog?.type === 'approve' ? '通过' : '驳回'}意见
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder={`请输入${approveDialog?.type === 'approve' ? '通过' : '驳回'}意见...`}
            value={approveComment}
            onChange={(e) => setApproveComment(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialog(null)}>取消</Button>
            <Button
              variant={approveDialog?.type === 'approve' ? 'default' : 'destructive'}
              onClick={handleApprove}
              disabled={submitting}
            >
              {submitting ? '提交中...' : '确认'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 批量报备弹窗 */}
      <Dialog open={batchOpen} onOpenChange={setBatchOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>批量报备</DialogTitle>
            <DialogDescription>同一集团下多个主体可一次提交，主体名称每行一个</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label><span className="text-destructive">*</span> 集团名称</Label>
                <Input
                  placeholder="请输入集团名称"
                  value={batchForm.group_name}
                  onChange={(e) => setBatchForm((f) => ({ ...f, group_name: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>报备金额（元）</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={batchForm.filing_amount}
                  onChange={(e) => setBatchForm((f) => ({ ...f, filing_amount: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>端口</Label>
                <Select value={batchForm.port} onValueChange={(v) => setBatchForm((f) => ({ ...f, port: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PORT_OPTS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>报备类型</Label>
                <Select value={batchForm.filing_type} onValueChange={(v) => setBatchForm((f) => ({ ...f, filing_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="新客户报备">新客户报备</SelectItem>
                    <SelectItem value="老客户报备">老客户报备</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label><span className="text-destructive">*</span> 主体名称（每行一个）</Label>
              <Textarea
                rows={5}
                placeholder={'示例科技有限公司\n示例贸易有限公司\n示例文化传媒有限公司'}
                value={batchForm.entities}
                onChange={(e) => setBatchForm((f) => ({ ...f, entities: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                已填写 {batchForm.entities.split('\n').filter((s) => s.trim()).length} 个主体，提交后将逐条生成报备单
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBatchOpen(false)}>取消</Button>
            <Button onClick={handleBatchSubmit} disabled={batchSubmitting}>
              {batchSubmitting ? '提交中...' : '提交报备'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 报备详情弹窗 */}
      <Dialog open={!!detailRecord} onOpenChange={(o) => !o && setDetailRecord(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>报备详情</DialogTitle>
            <DialogDescription>报备单号：{detailRecord?.filing_no}</DialogDescription>
          </DialogHeader>
          {detailRecord && (
            <div className="space-y-2.5 py-2 text-sm">
              {[
                ['集团名称', detailRecord.group_name],
                ['主体名称', detailRecord.entity_name],
                ['端口', detailRecord.port],
                ['报备类型', detailRecord.filing_type],
                ['报备金额', formatAmount(detailRecord.filing_amount)],
                ['创建时间', formatDateTime(detailRecord.created_at)],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2">
                  <span className="text-muted-foreground">{k}</span>
                  <span className="font-medium">{v}</span>
                </div>
              ))}
              <div className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2">
                <span className="text-muted-foreground">状态</span>
                <StatusBadge
                  status={STATUS_MAP[detailRecord.status] || detailRecord.status}
                  variant={STATUS_VARIANT[detailRecord.status] || 'default'}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailRecord(null)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <FieldFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={t('新建报备')}
        description="提交广告账户报备申请，带 * 为必填项"
        fields={[
          { key: 'group_name', label: '集团名称', required: true, placeholder: '请输入集团名称' },
          { key: 'entity_name', label: '主体名称', required: true, placeholder: '请输入主体名称' },
          { key: 'port', label: '端口', type: 'select', required: true, options: PORT_OPTS, defaultValue: '巨量千川' },
          { key: 'filing_type', label: '报备类型', type: 'select', required: true, options: [
            { label: '新客户报备', value: '新客户报备' },
            { label: '老客户报备', value: '老客户报备' },
          ], defaultValue: '新客户报备' },
          { key: 'filing_amount', label: '报备金额（元）', type: 'number', required: true, placeholder: '请输入报备金额' },
        ] as FormFieldDef[]}
        submitLabel="提交报备"
        onSubmit={async (values) => {
          try {
            const res = await filingsApi.create({
              ...values,
              filing_no: `BB${Date.now().toString().slice(-8)}`,
              filing_amount: Number(values.filing_amount) || 0,
              status: 'pending',
            });
            if (res.code === 0) {
              toast.success('报备申请提交成功');
              table.refresh();
              return true;
            }
            toast.error(res.message || '提交失败');
            return false;
          } catch {
            toast.error('提交失败');
            return false;
          }
        }}
      />
    </>
  );
}
