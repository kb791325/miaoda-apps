import { useState, useMemo } from 'react';
import { t } from '@/lib/i18n';
import ServerListPage, { type FilterField, type Column } from '@/components/ServerListPage';
import StatusBadge from '@/components/StatusBadge';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatAmount, formatDateTime } from '@/lib/format';
import { coinRefundsApi } from '@/api';
import { normalizeFinanceStatus } from '@/api/finance-status';
import FieldFormDialog, { type FormFieldDef } from '@/components/FieldFormDialog';
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
import { useServerList } from '@/hooks/useServerList';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const STATUS_OPTS = [
  { label: '待审批', value: '待审批' },
  { label: '已退币', value: '已退币' },
  { label: '已驳回', value: '已驳回' },
];

const PORT_OPTS = [
  { label: '巨量千川', value: '巨量千川' },
  { label: '腾讯广告', value: '腾讯广告' },
  { label: '磁力引擎', value: '磁力引擎' },
  { label: '快手广告', value: '快手广告' },
  { label: '小红书', value: '小红书' },
];

const STATUS_VARIANT: Record<string, 'default' | 'info' | 'success' | 'warning' | 'danger'> = {
  待审批: 'warning',
  已退币: 'success',
  已驳回: 'danger',
};

const FILTERS: FilterField[] = [
  { key: 'keyword', label: '客户/主体/单号', type: 'input', placeholder: '搜索客户名称/主体/单号' },
  { key: 'port', label: '端口', type: 'select', options: PORT_OPTS },
  { key: 'status', label: '状态', type: 'select', options: STATUS_OPTS },
];

interface CoinRefund {
  id: number;
  coin_refund_no: string;
  customer_name: string;
  entity_name: string;
  port: string;
  coin_amount: number;
  coin_reason: string;
  status: string;
  applicant: string;
  created_at: string;
}

export default function CoinRefundPage() {
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<CoinRefund | null>(null);
  const [approvalTarget, setApprovalTarget] = useState<CoinRefund | null>(null);
  const [approvalComment, setApprovalComment] = useState('');
  const [approving, setApproving] = useState(false);

  const table = useServerList({
    fetchFn: coinRefundsApi.list,
    defaultPageSize: 20,
  });

  const columns: Column<CoinRefund>[] = useMemo(() => [
    { key: 'coin_refund_no', title: '退币单号', dataIndex: 'coin_refund_no' as const, width: '130px' },
    { key: 'customer_name', title: '客户名称', dataIndex: 'customer_name' as const, width: '240px' },
    { key: 'entity_name', title: '主体名称', dataIndex: 'entity_name' as const, width: '200px' },
    { key: 'port', title: '端口', dataIndex: 'port' as const, width: '110px' },
    {
      key: 'coin_amount', title: '退币金额', width: '140px', align: 'right', sortable: true,
      render: (r) => <span className="font-medium tabular-nums">{formatAmount(r.coin_amount)}</span>,
    },
    { key: 'coin_reason', title: '退币原因', dataIndex: 'coin_reason' as const, width: '160px' },
    {
      key: 'status', title: '状态', width: '100px',
      render: (r) => {
        const s = normalizeFinanceStatus('coin_refund', r.status);
        return <StatusBadge status={s} variant={STATUS_VARIANT[s] || 'default'} />;
      },
    },
    { key: 'applicant', title: '申请人', dataIndex: 'applicant' as const, width: '100px' },
    {
      key: 'created_at', title: '申请时间', width: '170px', sortable: true,
      render: (r) => <span className="text-muted-foreground tabular-nums text-sm">{formatDateTime(r.created_at)}</span>,
    },
  ], []);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await coinRefundsApi.remove(deleteId);
      if (res.code === 0) {
        toast.success('删除成功');
        table.refresh();
      } else {
        toast.error(res.message || '删除失败');
      }
    } catch {
      toast.error('删除失败');
    } finally {
      setDeleteId(null);
    }
  };

  const COIN_REFUND_FORM_FIELDS: FormFieldDef[] = [
    { key: 'customer_name', label: '客户名称', required: true, placeholder: '请输入客户名称' },
    { key: 'entity_name', label: '主体名称', required: true, placeholder: '请输入主体名称' },
    { key: 'port', label: '端口', type: 'select', required: true, options: PORT_OPTS },
    { key: 'coin_amount', label: '退币金额（元）', type: 'number', required: true, placeholder: '请输入金额' },
    { key: 'status', label: '状态', type: 'select', required: true, options: STATUS_OPTS, defaultValue: '待审批' },
    { key: 'coin_reason', label: '退币原因', type: 'textarea', required: true, placeholder: '请填写退币原因' },
  ];

  const handleSave = async (values: Record<string, unknown>) => {
    try {
      const payload: Record<string, unknown> = {
        ...values,
        coin_amount: Number(values.coin_amount) || 0,
      };
      if (!editRecord) {
        payload.coin_refund_no = `TB${Date.now().toString().slice(-8)}`;
      }
      const res = editRecord
        ? await coinRefundsApi.update(editRecord.id, payload)
        : await coinRefundsApi.create(payload);
      if (res.code === 0) {
        toast.success(editRecord ? '退币信息已更新' : '退币申请提交成功');
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

  const handleApprove = async (approved: boolean) => {
    if (!approvalTarget) return;
    setApproving(true);
    try {
      const res = await coinRefundsApi.update(approvalTarget.id, {
        status: approved ? '已退币' : '已驳回',
        approve_comment: approvalComment || (approved ? '同意退币' : '不同意退币'),
        approved_at: new Date().toISOString(),
      });
      if (res.code === 0) {
        toast.success(approved ? '已同意退币' : '已驳回退币申请');
        setApprovalTarget(null);
        setApprovalComment('');
        table.refresh();
      } else {
        toast.error(res.message || '审批失败');
      }
    } catch {
      toast.error('审批失败');
    } finally {
      setApproving(false);
    }
  };

  const rowActions = (record: CoinRefund) => [
    ...(normalizeFinanceStatus('coin_refund', record.status) === '待审批' ? [{ label: '审批', onClick: () => setApprovalTarget(record) }] : []),
    { label: '编辑', onClick: () => { setEditRecord(record); setFormOpen(true); } },
    { label: '删除', variant: 'destructive' as const, icon: <Trash2 className="size-4" />, onClick: () => setDeleteId(record.id) },
  ];

  const primaryActions = [
    { label: '新建退币', primary: true, icon: <Plus className="size-4" />, onClick: () => { setEditRecord(null); setFormOpen(true); } },
  ];

  return (
    <>
      <ServerListPage
        title={t('退币管理')}
        description="管理广告账户退币申请"
        data={table.data}
        total={table.total}
        loading={table.loading}
        columns={columns}
        filters={FILTERS}
        primaryActions={primaryActions}
        rowActions={rowActions}
        selectable
        selectedKeys={selectedKeys}
        onSelectedChange={setSelectedKeys}
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
      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">确认删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <FieldFormDialog
        key={editRecord ? `edit-${editRecord.id}` : 'create'}
        open={formOpen}
        onOpenChange={(o) => {
          setFormOpen(o);
          if (!o) setEditRecord(null);
        }}
        title={editRecord ? `编辑退币：${editRecord.coin_refund_no}` : '新建退币'}
        description="提交客户退币申请，带 * 为必填项"
        fields={COIN_REFUND_FORM_FIELDS}
        submitLabel={editRecord ? '保存修改' : '提交申请'}
        onSubmit={handleSave}
        initialValues={editRecord ? { ...editRecord, coin_amount: String(editRecord.coin_amount) } : null}
      />

      <Dialog open={!!approvalTarget} onOpenChange={(o) => { if (!o) { setApprovalTarget(null); setApprovalComment(''); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>退币审批</DialogTitle>
            <DialogDescription>
              {approvalTarget ? `${approvalTarget.customer_name} · ${approvalTarget.entity_name} · 退币金额 ${formatAmount(approvalTarget.coin_amount)}` : ''}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={approvalComment}
            onChange={(e) => setApprovalComment(e.target.value)}
            placeholder="审批意见（可选）"
            className="min-h-[80px]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => handleApprove(false)} disabled={approving}>驳回</Button>
            <Button onClick={() => handleApprove(true)} disabled={approving}>同意退币</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
