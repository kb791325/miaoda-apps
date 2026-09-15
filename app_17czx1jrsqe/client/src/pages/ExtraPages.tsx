import { useState, useMemo } from 'react';
import { t } from '@/lib/i18n';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Eye, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import ServerListPage, { type FilterField as ServerFilterField, type Column, type ActionButton } from '@/components/ServerListPage';
import FieldFormDialog, { type FormFieldDef } from '@/components/FieldFormDialog';
import StatusBadge from '@/components/StatusBadge';
import { formatDateTime, formatAmount } from '@/lib/format';
import { useBatchSelection } from '@/hooks/useBatchSelection';
import { runBatch, reportBatchResult } from '@/utils/batch-run';
import { BatchDeleteDialog } from '@/components/BatchDeleteDialog';
import {
  contractTemplatesApi, contractCostsApi, purchaseOrdersApi, purchaseDetailsApi,
  invitationsApi, interviewsApi, checkinsApi, recruitPlansApi, stockInsApi,
} from '@/api';
import { useServerList } from '@/hooks/useServerList';
import { useActionLock } from '@/hooks/useActionLock';
import { useExport } from '@/hooks/useExport';
import { ExportButton } from '@/components/ExportButton';
import { extractErrorMessage, validateRecordId } from '@/lib/error-utils';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

function ConfirmDeleteDialog({ open, onClose, onConfirm, desc }: {
  open: boolean; onClose: () => void; onConfirm: () => void; desc: string;
}) {
  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>确认删除该记录？</AlertDialogTitle>
          <AlertDialogDescription>{desc}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>确认删除</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ==================== 合同模板 ====================
const CT_TYPE_OPTS = ['广告投放', '视频制作', '服务合同', '框架协议', '合作协议', '保密协议'].map((v) => ({ label: v, value: v }));

const CT_FILTERS: ServerFilterField[] = [
  { key: 'keyword', label: '模版名称', type: 'input', placeholder: '搜索模版名称' },
  { key: 'contract_type', label: '合同类型', type: 'select', options: CT_TYPE_OPTS },
];

const CT_FORM: FormFieldDef[] = [
  { key: 'template_name', label: '模版名称', required: true, placeholder: '请输入模版名称' },
  { key: 'contract_type', label: '合同类型', type: 'select', required: true, options: CT_TYPE_OPTS, defaultValue: '服务合同' },
  { key: 'category', label: '模版分类', type: 'select', options: [
    { label: '标准模板', value: 'standard' },
    { label: '框架协议', value: 'framework' },
    { label: '合作协议', value: 'cooperation' },
    { label: '保密协议', value: 'nda' },
    { label: '其他', value: 'other' },
  ], defaultValue: 'standard' },
  { key: 'default_amount', label: '默认金额（元）', type: 'number', placeholder: '选填，使用模板时自动带出' },
  { key: 'payment_method', label: '付款方式', type: 'select', options: [
    { label: '一次性付款', value: '一次性付款' },
    { label: '分期付款', value: '分期付款' },
    { label: '月结', value: '月结' },
    { label: '季结', value: '季结' },
    { label: '按消耗结算', value: '按消耗结算' },
  ], defaultValue: '分期付款' },
  { key: 'status', label: '状态', type: 'select', options: [
    { label: '启用', value: 'active' },
    { label: '停用', value: 'inactive' },
  ], defaultValue: 'active' },
  { key: 'terms', label: '标准条款内容', type: 'textarea', fullWidth: true, placeholder: '输入标准条款、范本内容等' },
  { key: 'remark', label: '备注', type: 'textarea', fullWidth: true, placeholder: '可选' },
];

export function ContractTemplatePage() {
  const navigate = useNavigate();
  const [formOpen, setFormOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<Record<string, any> | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [previewRecord, setPreviewRecord] = useState<Record<string, any> | null>(null);
  const table = useServerList({ fetchFn: contractTemplatesApi.list, defaultPageSize: 20 });

  const columns: Column<Record<string, any>>[] = useMemo(() => [
    { key: 'template_no', title: '模版ID', width: '110px', sortable: true, dataIndex: 'template_no' as any },
    { key: 'template_name', title: '模版名称', render: (r) => (
      <button
        onClick={() => setPreviewRecord(r)}
        className="font-medium text-primary hover:underline"
      >
        {r.template_name}
      </button>
    ) },
    { key: 'category', title: '分类', width: '100px', render: (r) => <StatusBadge status={r.category || 'standard'} variant="secondary" /> },
    { key: 'contract_type', title: '合同类型', width: '120px', render: (r) => <StatusBadge status={r.contract_type} variant="default" /> },
    { key: 'default_amount', title: '默认金额', width: '130px', align: 'right', render: (r) => r.default_amount ? <span className="tabular-nums">{formatAmount(r.default_amount)}</span> : <span className="text-muted-foreground">—</span> },
    { key: 'payment_method', title: '付款方式', width: '120px', render: (r) => r.payment_method || '—' },
    { key: 'status', title: '状态', width: '80px', render: (r) => <StatusBadge status={r.status === 'active' ? '启用' : '停用'} variant={r.status === 'active' ? 'success' : 'secondary'} /> },
    { key: 'updated_at', title: '更新时间', width: '170px', sortable: true, render: (r) => <span className="tabular-nums text-sm text-muted-foreground">{formatDateTime(r.updated_at)}</span> },
  ], []);

  const handleSave = async (values: Record<string, unknown>) => {
    try {
      if (editRecord) {
        const res = await contractTemplatesApi.update(editRecord.id, values);
        if (res.code === 0) { toast.success('模版已更新'); table.refresh(); return true; }
        toast.error(res.message || '保存失败'); return false;
      }
      const res = await contractTemplatesApi.create({ ...values, template_no: `TPL${Date.now().toString().slice(-5)}` });
      if (res.code === 0) { toast.success('模版已创建'); table.refresh(); return true; }
      toast.error(res.message || '创建失败'); return false;
    } catch { toast.error('保存失败'); return false; }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const res = await contractTemplatesApi.remove(deleteId);
    if (res.code === 0) { toast.success('删除成功'); table.refresh(); } else toast.error(res.message || '删除失败');
    setDeleteId(null);
  };

  const handleUseTemplate = (record: Record<string, any>) => {
    // 跳转到合同管理页面，通过 sessionStorage 传递模板数据，进入后自动打开新建弹窗
    sessionStorage.setItem('__mutang_template_prefill__', JSON.stringify({
      template_id: record.id,
      template_name: record.template_name,
      name: `${record.template_name}-`,
      type: record.contract_type,
      amount: record.default_amount || 0,
      payment_method: record.payment_method,
      terms: record.terms,
      remark: `基于模板「${record.template_name}」创建`,
    }));
    toast.success(`已选用模板「${record.template_name}」`);
    navigate('/contract/contracts?tpl=1');
  };

  return (
    <>
      <ServerListPage
        title={t('合同模版')} description={t('管理合同模板库，支持分类筛选和快速套用')}
        data={table.data} total={table.total} loading={table.loading}
        columns={columns} filters={CT_FILTERS}
        primaryActions={[{ label: '新建模版', primary: true, icon: <Plus className="size-3.5" />, onClick: () => { setEditRecord(null); setFormOpen(true); } }]}
        rowActions={(r) => [
          { label: '使用此模板', icon: <FileText className="size-3.5" />, onClick: () => handleUseTemplate(r) },
          { label: '预览', icon: <Eye className="size-3.5" />, onClick: () => setPreviewRecord(r) },
          { label: '编辑', onClick: () => { setEditRecord(r); setFormOpen(true); } },
          { label: '删除', variant: 'destructive', icon: <Trash2 className="size-3.5" />, onClick: () => setDeleteId(r.id) },
        ]}
        page={table.page} pageSize={table.pageSize}
        onPageChange={table.setPage} onPageSizeChange={table.setPageSize}
        onSearch={table.setFilters} onReset={table.handleReset} onSort={table.handleSort}
        sortBy={table.sortBy} sortOrder={table.sortOrder} onRefresh={table.refresh}
      />
      <FieldFormDialog
        key={editRecord ? `edit-${editRecord.id}` : 'create'}
        open={formOpen} onOpenChange={setFormOpen}
        title={editRecord ? `编辑模版：${editRecord.template_name}` : '新建合同模版'}
        description={t('录入模版信息，带 * 为必填项')}
        fields={CT_FORM} submitLabel={editRecord ? '保存修改' : '确认创建'}
        onSubmit={handleSave} initialValues={editRecord}
      />
      <ConfirmDeleteDialog open={deleteId !== null} onClose={() => setDeleteId(null)} onConfirm={handleDelete} desc="删除后模版将不可恢复，请谨慎操作。" />

      {/* 模板预览弹窗 */}
      <Dialog open={!!previewRecord} onOpenChange={(o) => !o && setPreviewRecord(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="size-4 text-primary" />
              {previewRecord?.template_name}
            </DialogTitle>
            <DialogDescription>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                <span>模板编号：<span className="font-mono">{previewRecord?.template_no}</span></span>
                <span>类型：{previewRecord?.contract_type}</span>
                <span>分类：{previewRecord?.category}</span>
                {previewRecord?.default_amount && <span>默认金额：{formatAmount(previewRecord.default_amount)}</span>}
                <span>付款方式：{previewRecord?.payment_method || '—'}</span>
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <div className="mb-2 text-sm font-medium">标准条款</div>
              <div className="rounded-md bg-muted/30 p-4 text-sm leading-relaxed whitespace-pre-wrap text-foreground/80">
                {previewRecord?.terms || '暂无标准条款内容。'}
              </div>
            </div>
            {previewRecord?.remark && (
              <div>
                <div className="mb-2 text-sm font-medium">备注</div>
                <p className="text-sm text-muted-foreground">{previewRecord.remark}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewRecord(null)}>关闭</Button>
            <Button onClick={() => { if (previewRecord) handleUseTemplate(previewRecord); }}>
              使用此模板新建合同
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ==================== 合同费用 ====================
const CF_STATUS_OPTS = [
  { label: '待支付', value: 'pending' },
  { label: '已支付', value: 'paid' },
];
const CF_TYPE_OPTS = ['签约服务费', '制作定金', '履约保证金', '尾款', '其他'].map((v) => ({ label: v, value: v }));

const CF_FILTERS: ServerFilterField[] = [
  { key: 'keyword', label: '关联合同', type: 'input', placeholder: '搜索关联合同编号' },
  { key: 'pay_status', label: '付款状态', type: 'select', options: CF_STATUS_OPTS },
];

const CF_FORM: FormFieldDef[] = [
  { key: 'related_contract', label: '关联合同', required: true, placeholder: '如 HT20260001' },
  { key: 'cost_type', label: '费用类型', type: 'select', required: true, options: CF_TYPE_OPTS, defaultValue: '签约服务费' },
  { key: 'amount', label: '金额（元）', required: true, placeholder: '如 15000' },
  { key: 'plan_date', label: '付款计划日期', required: true, placeholder: '如 2026-09-15' },
  { key: 'pay_status', label: '付款状态', type: 'select', required: true, options: CF_STATUS_OPTS, defaultValue: 'pending' },
];

export function ContractFeePage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<Record<string, any> | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const table = useServerList({ fetchFn: contractCostsApi.list, defaultPageSize: 20 });

  const columns: Column<Record<string, any>>[] = useMemo(() => [
    { key: 'cost_no', title: '费用ID', dataIndex: 'cost_no' as const, width: '110px', sortable: true },
    { key: 'related_contract', title: '关联合同', width: '140px', render: (r) => <span className="tabular-nums text-sm">{r.related_contract}</span> },
    { key: 'cost_type', title: '费用类型', width: '130px', render: (r) => <StatusBadge status={r.cost_type} variant="secondary" /> },
    { key: 'amount', title: '金额', width: '140px', align: 'right', sortable: true, render: (r) => <span className="font-medium tabular-nums">{formatAmount(r.amount)}</span> },
    { key: 'plan_date', title: '付款计划日期', width: '130px', render: (r) => <span className="tabular-nums text-sm">{r.plan_date}</span> },
    { key: 'pay_status', title: '付款状态', width: '90px', render: (r) => <StatusBadge status={r.pay_status === 'paid' ? '已支付' : '待支付'} variant={r.pay_status === 'paid' ? 'success' : 'warning'} /> },
  ], []);

  const handleSave = async (values: Record<string, unknown>) => {
    const data = { ...values, amount: Number(values.amount) || 0 };
    try {
      if (editRecord) {
        const res = await contractCostsApi.update(editRecord.id, data);
        if (res.code === 0) { toast.success('合同费用已更新'); table.refresh(); return true; }
        toast.error(res.message || '保存失败'); return false;
      }
      const res = await contractCostsApi.create({ ...data, cost_no: `CF${Date.now().toString().slice(-5)}` });
      if (res.code === 0) { toast.success('合同费用已登记'); table.refresh(); return true; }
      toast.error(res.message || '创建失败'); return false;
    } catch { toast.error('保存失败'); return false; }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const res = await contractCostsApi.remove(deleteId);
    if (res.code === 0) { toast.success('删除成功'); table.refresh(); } else toast.error(res.message || '删除失败');
    setDeleteId(null);
  };

  return (
    <>
      <ServerListPage
        title={t('合同费用')} description={t('管理合同费用和付款计划')}
        data={table.data} total={table.total} loading={table.loading}
        columns={columns} filters={CF_FILTERS}
        primaryActions={[{ label: '登记费用', primary: true, icon: <Plus className="size-3.5" />, onClick: () => { setEditRecord(null); setFormOpen(true); } }]}
        rowActions={(r) => [
          ...(r.pay_status === 'pending' ? [{ label: '标记已支付', onClick: async () => {
            const res = await contractCostsApi.update(r.id, { pay_status: 'paid' });
            if (res.code === 0) { toast.success('已标记为已支付'); table.refresh(); } else toast.error(res.message || '操作失败');
          } }] : []),
          { label: '编辑', onClick: () => { setEditRecord(r); setFormOpen(true); } },
          { label: '删除', variant: 'destructive', icon: <Trash2 className="size-3.5" />, onClick: () => setDeleteId(r.id) },
        ]}
        page={table.page} pageSize={table.pageSize}
        onPageChange={table.setPage} onPageSizeChange={table.setPageSize}
        onSearch={table.setFilters} onReset={table.handleReset} onSort={table.handleSort}
        sortBy={table.sortBy} sortOrder={table.sortOrder} onRefresh={table.refresh}
      />
      <FieldFormDialog
        key={editRecord ? `edit-${editRecord.id}` : 'create'}
        open={formOpen} onOpenChange={setFormOpen}
        title={editRecord ? `编辑费用：${editRecord.cost_no}` : '登记合同费用'}
        description={t('录入费用与付款计划，带 * 为必填项')}
        fields={CF_FORM} submitLabel={editRecord ? '保存修改' : '确认登记'}
        onSubmit={handleSave} initialValues={editRecord}
      />
      <ConfirmDeleteDialog open={deleteId !== null} onClose={() => setDeleteId(null)} onConfirm={handleDelete} desc="删除后费用记录将不可恢复，请谨慎操作。" />
    </>
  );
}

// ==================== 采购订单 ====================
const PO_STATUS_OPTS = [
  { label: '待发货', value: 'pending' },
  { label: '配送中', value: 'in_delivery' },
  { label: '已送达', value: 'delivered' },
];
const PO_STATUS_MAP: Record<string, string> = { pending: '待发货', in_delivery: '配送中', delivered: '已送达', cancelled: '已取消' };
const PO_STATUS_VARIANT: Record<string, 'default' | 'info' | 'success' | 'warning' | 'danger'> = {
  pending: 'warning', in_delivery: 'info', delivered: 'success', cancelled: 'danger',
};

const PO_FILTERS: ServerFilterField[] = [
  { key: 'keyword', label: '供应商/申请', type: 'input', placeholder: '搜索供应商/关联申请' },
  { key: 'status', label: '订单状态', type: 'select', options: PO_STATUS_OPTS },
];

const PO_FORM: FormFieldDef[] = [
  { key: 'related_req', label: '关联申请', required: true, placeholder: '如 PR20260001' },
  { key: 'supplier', label: '供应商', required: true, placeholder: '请输入供应商名称' },
  { key: 'amount', label: '订单金额（元）', required: true, placeholder: '如 12800' },
  { key: 'status', label: '订单状态', type: 'select', required: true, options: PO_STATUS_OPTS, defaultValue: 'pending' },
  { key: 'remark', label: '备注', placeholder: '可选' },
];

export function PurchaseOrderPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<Record<string, any> | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [cancelId, setCancelId] = useState<number | null>(null);
  const { withLock: withDeleteLock, locked: deleteLocked } = useActionLock();
  const { withLock: withOpLock, locked: opLocked } = useActionLock();
  const { withLock: withStatusLock, locked: statusLocked } = useActionLock();
  const table = useServerList({ fetchFn: purchaseOrdersApi.list, defaultPageSize: 20 });
  const { exporting, exportAs } = useExport({ fetchFn: purchaseOrdersApi.list, filename: '采购订单' });
  const selection = useBatchSelection();
  const { withLock: withBatchLock, locked: batchLocked } = useActionLock();
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);

  const handleBatchDelete = async () => {
    await withBatchLock(async () => {
      const res = await runBatch(selection.selectedKeys, (id: string) => purchaseOrdersApi.remove(Number(id)));
      reportBatchResult('批量删除', res);
      setBatchDeleteOpen(false);
      selection.clear();
      table.refresh();
    });
  };

  const batchActions: ActionButton[] = [
    { label: '批量删除', variant: 'destructive', icon: <Trash2 className="size-3.5" />, disabled: batchLocked, onClick: () => setBatchDeleteOpen(true) },
  ];

  const updateStatus = async (id: number, status: string, successMsg: string) => {
    await withStatusLock(async () => {
      try {
        const res = await purchaseOrdersApi.update(id, { status });
        if (res.code === 0) { toast.success(successMsg); table.refresh(); } else toast.error(res.message || '操作失败');
      } catch (e) { toast.error(extractErrorMessage(e)); }
    });
  };

  const handleCancel = async () => {
    if (!cancelId) return;
    await updateStatus(cancelId, 'cancelled', '订单已取消');
    setCancelId(null);
  };

  const columns: Column<Record<string, any>>[] = useMemo(() => [
    { key: 'order_no', title: '订单ID', width: '110px', sortable: true, dataIndex: 'order_no' as any },
    { key: 'related_req', title: '关联申请', width: '140px', render: (r) => <span className="tabular-nums text-sm">{r.related_req}</span> },
    { key: 'supplier', title: '供应商', render: (r) => <span className="font-medium">{r.supplier}</span> },
    { key: 'amount', title: '订单金额', width: '140px', align: 'right', sortable: true, render: (r) => <span className="font-medium tabular-nums">{formatAmount(r.amount)}</span> },
    { key: 'status', title: '订单状态', width: '100px', render: (r) => <StatusBadge status={PO_STATUS_MAP[r.status] || r.status} variant={PO_STATUS_VARIANT[r.status] || 'default'} /> },
    { key: 'created_at', title: '创建时间', width: '160px', render: (r) => <span className="tabular-nums text-sm text-muted-foreground">{formatDateTime(r.created_at)}</span> },
  ], []);

  const handleSave = async (values: Record<string, unknown>) => {
    const data = { ...values, amount: Number(values.amount) || 0 };
    try {
      if (editRecord) {
        const res = await purchaseOrdersApi.update(editRecord.id, data);
        if (res.code === 0) { toast.success('采购订单已更新'); table.refresh(); return true; }
        toast.error(res.message || '保存失败'); return false;
      }
      const res = await purchaseOrdersApi.create({ ...data, order_no: `PO${Date.now().toString().slice(-5)}` });
      if (res.code === 0) { toast.success('采购订单已创建'); table.refresh(); return true; }
      toast.error(res.message || '创建失败'); return false;
    } catch (e) { toast.error(extractErrorMessage(e)); return false; }
  };

  const handleDelete = async () => {
    await withDeleteLock(async () => {
      if (!deleteId) return;
      const id = validateRecordId({ id: deleteId });
      if (!id) { toast.warning('记录标识缺失，请刷新后重试'); setDeleteId(null); return; }
      try {
        const res = await purchaseOrdersApi.remove(deleteId);
        if (res.code === 0) { toast.success('删除成功'); setDeleteId(null); table.refresh(); }
        else toast.error(res.message || '删除失败');
      } catch (e) { toast.error(extractErrorMessage(e)); }
    });
  };

  return (
    <>
      <ServerListPage
        title={t('采购订单')} description={t('管理采购订单执行')}
        data={table.data} total={table.total} loading={table.loading}
        columns={columns} filters={PO_FILTERS}
        actionsRight={
          <ExportButton
            exporting={exporting}
            onExport={(format) => exportAs(format, columns, table.filters, table.sortBy, table.sortOrder)}
          />
        }
        selectedKeys={selection.selectedKeys}
        onSelectedChange={selection.setKeys}
        batchActions={batchActions}
        primaryActions={[{ label: '新建订单', primary: true, icon: <Plus className="size-3.5" />, onClick: () => { setEditRecord(null); setFormOpen(true); } }]}
        rowActions={(r) => [
          ...(r.status === 'pending' ? [{ label: '开始发货', onClick: () => updateStatus(r.id, 'in_delivery', '已开始发货，状态更新为配送中') }] : []),
          ...(r.status === 'in_delivery' ? [{ label: '确认送达', onClick: () => updateStatus(r.id, 'delivered', '已确认送达') }] : []),
          ...(r.status === 'pending' || r.status === 'in_delivery' ? [{ label: '取消订单', onClick: () => setCancelId(r.id) }] : []),
          { label: '编辑', onClick: () => { setEditRecord(r); setFormOpen(true); } },
          { label: '删除', variant: 'destructive', icon: <Trash2 className="size-3.5" />, onClick: () => setDeleteId(r.id) },
        ]}
        page={table.page} pageSize={table.pageSize}
        onPageChange={table.setPage} onPageSizeChange={table.setPageSize}
        onSearch={table.setFilters} onReset={table.handleReset} onSort={table.handleSort}
        sortBy={table.sortBy} sortOrder={table.sortOrder} onRefresh={table.refresh}
      />
      <FieldFormDialog
        key={editRecord ? `edit-${editRecord.id}` : 'create'}
        open={formOpen} onOpenChange={setFormOpen}
        title={editRecord ? `编辑订单：${editRecord.order_no}` : '新建采购订单'}
        description={t('录入采购订单信息，带 * 为必填项')}
        fields={PO_FORM} submitLabel={editRecord ? '保存修改' : '确认创建'}
        onSubmit={handleSave} initialValues={editRecord}
      />
      <BatchDeleteDialog
        open={batchDeleteOpen} count={selection.selectedCount} loading={batchLocked}
        onOpenChange={setBatchDeleteOpen} onConfirm={handleBatchDelete}
      />
      <AlertDialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除该采购订单？</AlertDialogTitle>
            <AlertDialogDescription>删除后采购订单将不可恢复，请谨慎操作。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleDelete} disabled={deleteLocked}>
              {deleteLocked ? '删除中...' : '确认删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={cancelId !== null} onOpenChange={(o) => !o && setCancelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认取消该采购订单？</AlertDialogTitle>
            <AlertDialogDescription>取消后订单将停止执行且不可恢复配送，请确认已与供应商沟通。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>暂不取消</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleCancel} disabled={statusLocked}>
              {statusLocked ? '处理中...' : '确认取消'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ==================== 采购详情（执行明细） ====================
const PD_FILTERS: ServerFilterField[] = [
  { key: 'keyword', label: '物资/订单', type: 'input', placeholder: '搜索物资名称/关联订单' },
  { key: 'receive_status', label: '收货状态', type: 'select', options: [
    { label: '待收货', value: 'pending' },
    { label: '已收货', value: 'received' },
  ] },
];

const PD_FORM: FormFieldDef[] = [
  { key: 'related_order', label: '采购订单', required: true, placeholder: '如 PO00001' },
  { key: 'item_name', label: '物资名称', required: true, placeholder: '请输入物资名称' },
  { key: 'spec', label: '规格型号', placeholder: '如 80g/500张' },
  { key: 'quantity', label: '数量', required: true, placeholder: '如 20' },
  { key: 'unit_price', label: '单价（元）', required: true, placeholder: '如 95' },
  { key: 'remark', label: '备注', placeholder: '选填备注信息' },
];

export function PurchaseDetailPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<Record<string, any> | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const { withLock: withDeleteLock, locked: deleteLocked } = useActionLock();
  const { withLock: withOpLock, locked: opLocked } = useActionLock();
  const table = useServerList({ fetchFn: purchaseDetailsApi.list, defaultPageSize: 20 });
  const { exporting, exportAs } = useExport({ fetchFn: purchaseDetailsApi.list, filename: '采购明细' });
  const selection = useBatchSelection();
  const { withLock: withBatchLock, locked: batchLocked } = useActionLock();
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);

  const handleBatchReceive = async () => {
    await withBatchLock(async () => {
      const res = await runBatch(selection.selectedKeys, (id: string) => purchaseDetailsApi.receive(Number(id)));
      reportBatchResult('批量收货入库', res);
      selection.clear();
      table.refresh();
    });
  };

  const handleBatchDelete = async () => {
    await withBatchLock(async () => {
      const res = await runBatch(selection.selectedKeys, (id: string) => purchaseDetailsApi.remove(Number(id)));
      reportBatchResult('批量删除', res);
      setBatchDeleteOpen(false);
      selection.clear();
      table.refresh();
    });
  };

  const batchActions: ActionButton[] = [
    { label: '批量收货入库', icon: <FileText className="size-3.5" />, disabled: batchLocked, onClick: handleBatchReceive },
    { label: '批量删除', variant: 'destructive', icon: <Trash2 className="size-3.5" />, disabled: batchLocked, onClick: () => setBatchDeleteOpen(true) },
  ];

  const columns: Column<Record<string, any>>[] = useMemo(() => [
    { key: 'detail_no', title: '明细ID', width: '110px', sortable: true, dataIndex: 'detail_no' as any },
    { key: 'related_order', title: '采购订单', width: '120px', render: (r) => <span className="tabular-nums text-sm">{r.related_order}</span> },
    { key: 'item_name', title: '物资名称', render: (r) => <span className="font-medium">{r.item_name}</span> },
    { key: 'spec', title: '规格型号', width: '150px', dataIndex: 'spec' as any },
    { key: 'quantity', title: '数量', width: '80px', align: 'right', render: (r) => <span className="tabular-nums">{r.quantity}</span> },
    { key: 'unit_price', title: '单价', width: '110px', align: 'right', render: (r) => <span className="tabular-nums">{formatAmount(r.unit_price)}</span> },
    { key: 'amount', title: '金额', width: '130px', align: 'right', sortable: true, render: (r) => <span className="font-medium tabular-nums">{formatAmount(r.amount)}</span> },
    { key: 'receive_status', title: '收货状态', width: '90px', render: (r) => <StatusBadge status={r.receive_status === 'received' ? '已收货' : '待收货'} variant={r.receive_status === 'received' ? 'success' : 'warning'} /> },
  ], []);

  const handleSave = async (values: Record<string, unknown>) => {
    const quantity = Number(values.quantity) || 0;
    const unitPrice = Number(values.unit_price) || 0;
    const data = { ...values, quantity, unit_price: unitPrice, amount: Number((quantity * unitPrice).toFixed(2)) };
    try {
      if (editRecord) {
        const res = await purchaseDetailsApi.update(editRecord.id, data);
        if (res.code === 0) { toast.success('采购明细已更新'); table.refresh(); return true; }
        toast.error(res.message || '保存失败'); return false;
      }
      const res = await purchaseDetailsApi.create({ ...data, detail_no: `PD${Date.now().toString().slice(-5)}`, receive_status: 'pending' });
      if (res.code === 0) { toast.success('采购明细已创建'); table.refresh(); return true; }
      toast.error(res.message || '创建失败'); return false;
    } catch (e) { toast.error(extractErrorMessage(e)); return false; }
  };

  const handleReceive = async (r: Record<string, any>) => {
    await withOpLock(async () => {
      const res = await purchaseDetailsApi.receive(r.id);
      if (res.code !== 0) { toast.error(res.message || '操作失败'); return; }
      try {
        await stockInsApi.create({
          stock_in_no: `RK${Date.now().toString().slice(-5)}`,
          material_name: r.item_name,
          category: '采购收货',
          quantity: Number(r.quantity) || 0,
          unit_price: Number(r.unit_price) || 0,
          total_amount: Number(r.amount) || 0,
          supplier: r.related_order || '\u2014',
          in_date: new Date().toISOString().slice(0, 10),
          operator_name: '系统自动入库',
        });
        toast.success('已确认收货并自动生成入库单');
      } catch {
        toast.success('已确认收货');
      }
      table.refresh();
    });
  };

  const handleDelete = async () => {
    await withDeleteLock(async () => {
      if (!deleteId) return;
      const id = validateRecordId({ id: deleteId });
      if (!id) { toast.warning('记录标识缺失，请刷新后重试'); setDeleteId(null); return; }
      try {
        const res = await purchaseDetailsApi.remove(deleteId);
        if (res.code === 0) { toast.success('删除成功'); setDeleteId(null); table.refresh(); }
        else toast.error(res.message || '删除失败');
      } catch (e) { toast.error(extractErrorMessage(e)); }
    });
  };

  return (
    <>
      <ServerListPage
        title={t('采购详情')} description={t('采购执行明细管理')}
        data={table.data} total={table.total} loading={table.loading}
        columns={columns} filters={PD_FILTERS}
        actionsRight={
          <ExportButton
            exporting={exporting}
            onExport={(format) => exportAs(format, columns, table.filters, table.sortBy, table.sortOrder)}
          />
        }
        selectedKeys={selection.selectedKeys}
        onSelectedChange={selection.setKeys}
        batchActions={batchActions}
        primaryActions={[{ label: '新增明细', primary: true, icon: <Plus className="size-3.5" />, onClick: () => { setEditRecord(null); setFormOpen(true); } }]}
        rowActions={(r) => [
          ...(r.receive_status === 'pending' ? [{ label: '收货并入库', onClick: () => handleReceive(r) }] : []),
          { label: '编辑', onClick: () => { setEditRecord(r); setFormOpen(true); } },
          { label: '删除', variant: 'destructive', icon: <Trash2 className="size-3.5" />, onClick: () => setDeleteId(r.id) },
        ]}
        page={table.page} pageSize={table.pageSize}
        onPageChange={table.setPage} onPageSizeChange={table.setPageSize}
        onSearch={table.setFilters} onReset={table.handleReset} onSort={table.handleSort}
        sortBy={table.sortBy} sortOrder={table.sortOrder} onRefresh={table.refresh}
      />
      <FieldFormDialog
        key={editRecord ? `edit-${editRecord.id}` : 'create'}
        open={formOpen} onOpenChange={setFormOpen}
        title={editRecord ? `编辑明细：${editRecord.detail_no}` : '新增采购明细'}
        description={t('录入采购明细，金额按数量×单价自动计算')}
        fields={PD_FORM} submitLabel={editRecord ? '保存修改' : '确认创建'}
        onSubmit={handleSave} initialValues={editRecord}
      />
      <BatchDeleteDialog
        open={batchDeleteOpen} count={selection.selectedCount} loading={batchLocked}
        onOpenChange={setBatchDeleteOpen} onConfirm={handleBatchDelete}
      />
      <AlertDialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除该采购明细？</AlertDialogTitle>
            <AlertDialogDescription>删除后采购明细将不可恢复，请谨慎操作。</AlertDialogDescription>
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

// ==================== 邀约管理 ====================
const IV_STATUS_OPTS = [
  { label: '已邀约', value: 'invited' },
  { label: '已确认', value: 'confirmed' },
  { label: '已到面', value: 'attended' },
  { label: '已拒绝', value: 'declined' },
];
const IV_STATUS_MAP: Record<string, string> = { invited: '已邀约', confirmed: '已确认', attended: '已到面', declined: '已拒绝' };
const IV_STATUS_VARIANT: Record<string, 'default' | 'info' | 'success' | 'warning' | 'danger'> = {
  invited: 'info', confirmed: 'warning', attended: 'success', declined: 'danger',
};

const IV_FILTERS: ServerFilterField[] = [
  { key: 'keyword', label: '候选人', type: 'input', placeholder: '搜索候选人姓名/岗位' },
  { key: 'status', label: '邀约状态', type: 'select', options: IV_STATUS_OPTS },
];

const IV_FORM: FormFieldDef[] = [
  { key: 'candidate_name', label: '候选人姓名', required: true, placeholder: '请输入候选人姓名' },
  { key: 'position', label: '应聘岗位', required: true, placeholder: '如 商务专员' },
  { key: 'invite_channel', label: '邀约渠道', type: 'select', required: true, options: [
    { label: '电话邀约', value: '电话邀约' },
    { label: '短信邀约', value: '短信邀约' },
    { label: '邮件邀约', value: '邮件邀约' },
  ], defaultValue: '电话邀约' },
  { key: 'interview_time', label: '面试时间', required: true, placeholder: '如 2026-08-30 10:00' },
  { key: 'status', label: '邀约状态', type: 'select', required: true, options: IV_STATUS_OPTS, defaultValue: 'invited' },
];

export function InvitationPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<Record<string, any> | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const table = useServerList({ fetchFn: invitationsApi.list, defaultPageSize: 20 });

  const columns: Column<Record<string, any>>[] = useMemo(() => [
    { key: 'invitation_no', title: '邀约ID', width: '110px', sortable: true },
    { key: 'candidate_name', title: '候选人', width: '110px', render: (r) => <span className="font-medium">{r.candidate_name}</span> },
    { key: 'position', title: '应聘岗位', width: '130px' },
    { key: 'invite_channel', title: '邀约渠道', width: '100px' },
    { key: 'interview_time', title: '面试时间', width: '150px', sortable: true, render: (r) => <span className="tabular-nums text-sm">{r.interview_time}</span> },
    { key: 'status', title: '状态', width: '90px', render: (r) => <StatusBadge status={IV_STATUS_MAP[r.status] || r.status} variant={IV_STATUS_VARIANT[r.status] || 'default'} /> },
  ], []);

  const handleSave = async (values: Record<string, unknown>) => {
    try {
      if (editRecord) {
        const res = await invitationsApi.update(editRecord.id, values);
        if (res.code === 0) { toast.success('邀约信息已更新'); table.refresh(); return true; }
        toast.error(res.message || '保存失败'); return false;
      }
      const res = await invitationsApi.create({ ...values, invitation_no: `IV${Date.now().toString().slice(-5)}` });
      if (res.code === 0) { toast.success('邀约已发起'); table.refresh(); return true; }
      toast.error(res.message || '创建失败'); return false;
    } catch { toast.error('保存失败'); return false; }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const res = await invitationsApi.remove(deleteId);
    if (res.code === 0) { toast.success('删除成功'); table.refresh(); } else toast.error(res.message || '删除失败');
    setDeleteId(null);
  };

  return (
    <>
      <ServerListPage
        title={t('邀约管理')} description={t('管理面试邀约安排')}
        data={table.data} total={table.total} loading={table.loading}
        columns={columns} filters={IV_FILTERS}
        primaryActions={[{ label: '新增邀约', primary: true, icon: <Plus className="size-3.5" />, onClick: () => { setEditRecord(null); setFormOpen(true); } }]}
        rowActions={(r) => [
          { label: '编辑', onClick: () => { setEditRecord(r); setFormOpen(true); } },
          { label: '删除', variant: 'destructive', icon: <Trash2 className="size-3.5" />, onClick: () => setDeleteId(r.id) },
        ]}
        page={table.page} pageSize={table.pageSize}
        onPageChange={table.setPage} onPageSizeChange={table.setPageSize}
        onSearch={table.setFilters} onReset={table.handleReset} onSort={table.handleSort}
        sortBy={table.sortBy} sortOrder={table.sortOrder} onRefresh={table.refresh}
      />
      <FieldFormDialog
        key={editRecord ? `edit-${editRecord.id}` : 'create'}
        open={formOpen} onOpenChange={setFormOpen}
        title={editRecord ? `编辑邀约：${editRecord.candidate_name}` : '新增面试邀约'}
        description={t('录入邀约信息，带 * 为必填项')}
        fields={IV_FORM} submitLabel={editRecord ? '保存修改' : '确认发起'}
        onSubmit={handleSave} initialValues={editRecord}
      />
      <ConfirmDeleteDialog open={deleteId !== null} onClose={() => setDeleteId(null)} onConfirm={handleDelete} desc="删除后邀约记录将不可恢复，请谨慎操作。" />
    </>
  );
}

// ==================== 面试管理 ====================
const IT_STATUS_OPTS = [
  { label: '待面试', value: 'scheduled' },
  { label: '已通过', value: 'passed' },
  { label: '未通过', value: 'failed' },
  { label: '已录用', value: 'hired' },
];
const IT_STATUS_MAP: Record<string, string> = { scheduled: '待面试', passed: '已通过', failed: '未通过', hired: '已录用' };
const IT_STATUS_VARIANT: Record<string, 'default' | 'info' | 'success' | 'warning' | 'danger'> = {
  scheduled: 'info', passed: 'success', failed: 'danger', hired: 'success',
};
const IT_ROUND_OPTS = ['一面', '二面', '终面'].map((v) => ({ label: v, value: v }));

const IT_FILTERS: ServerFilterField[] = [
  { key: 'keyword', label: '候选人', type: 'input', placeholder: '搜索候选人/面试官' },
  { key: 'status', label: '面试结果', type: 'select', options: IT_STATUS_OPTS },
  { key: 'round', label: '面试轮次', type: 'select', options: IT_ROUND_OPTS },
];

const IT_FORM: FormFieldDef[] = [
  { key: 'candidate_name', label: '候选人姓名', required: true, placeholder: '请输入候选人姓名' },
  { key: 'position', label: '应聘岗位', required: true, placeholder: '如 优化师' },
  { key: 'interviewer_name', label: '面试官', required: true, placeholder: '请输入面试官姓名' },
  { key: 'interview_time', label: '面试时间', required: true, placeholder: '如 2026-08-30 10:00' },
  { key: 'round', label: '面试轮次', type: 'select', required: true, options: IT_ROUND_OPTS, defaultValue: '一面' },
  { key: 'status', label: '面试结果', type: 'select', required: true, options: IT_STATUS_OPTS, defaultValue: 'scheduled' },
  { key: 'evaluation', label: '面试评价', placeholder: '选填' },
];

export function InterviewPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<Record<string, any> | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const table = useServerList({ fetchFn: interviewsApi.list, defaultPageSize: 20 });

  const columns: Column<Record<string, any>>[] = useMemo(() => [
    { key: 'interview_no', title: '面试ID', width: '110px', sortable: true },
    { key: 'candidate_name', title: '候选人', width: '110px', render: (r) => <span className="font-medium">{r.candidate_name}</span> },
    { key: 'position', title: '应聘岗位', width: '120px' },
    { key: 'interviewer_name', title: '面试官', width: '100px' },
    { key: 'interview_time', title: '面试时间', width: '150px', sortable: true, render: (r) => <span className="tabular-nums text-sm">{r.interview_time}</span> },
    { key: 'round', title: '轮次', width: '80px' },
    { key: 'status', title: '面试结果', width: '90px', render: (r) => <StatusBadge status={IT_STATUS_MAP[r.status] || r.status} variant={IT_STATUS_VARIANT[r.status] || 'default'} /> },
    { key: 'evaluation', title: '面试评价', render: (r) => <span className="text-sm text-muted-foreground">{r.evaluation || '—'}</span> },
  ], []);

  const handleSave = async (values: Record<string, unknown>) => {
    try {
      if (editRecord) {
        const res = await interviewsApi.update(editRecord.id, values);
        if (res.code === 0) { toast.success('面试记录已更新'); table.refresh(); return true; }
        toast.error(res.message || '保存失败'); return false;
      }
      const res = await interviewsApi.create({ ...values, interview_no: `IT${Date.now().toString().slice(-5)}` });
      if (res.code === 0) { toast.success('面试记录已创建'); table.refresh(); return true; }
      toast.error(res.message || '创建失败'); return false;
    } catch { toast.error('保存失败'); return false; }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const res = await interviewsApi.remove(deleteId);
    if (res.code === 0) { toast.success('删除成功'); table.refresh(); } else toast.error(res.message || '删除失败');
    setDeleteId(null);
  };

  return (
    <>
      <ServerListPage
        title={t('面试管理')} description={t('管理面试记录和评估')}
        data={table.data} total={table.total} loading={table.loading}
        columns={columns} filters={IT_FILTERS}
        primaryActions={[{ label: '录入面试', primary: true, icon: <Plus className="size-3.5" />, onClick: () => { setEditRecord(null); setFormOpen(true); } }]}
        rowActions={(r) => [
          { label: '编辑', onClick: () => { setEditRecord(r); setFormOpen(true); } },
          { label: '删除', variant: 'destructive', icon: <Trash2 className="size-3.5" />, onClick: () => setDeleteId(r.id) },
        ]}
        page={table.page} pageSize={table.pageSize}
        onPageChange={table.setPage} onPageSizeChange={table.setPageSize}
        onSearch={table.setFilters} onReset={table.handleReset} onSort={table.handleSort}
        sortBy={table.sortBy} sortOrder={table.sortOrder} onRefresh={table.refresh}
      />
      <FieldFormDialog
        key={editRecord ? `edit-${editRecord.id}` : 'create'}
        open={formOpen} onOpenChange={setFormOpen}
        title={editRecord ? `编辑面试：${editRecord.candidate_name}` : '录入面试记录'}
        description={t('录入面试安排与结果，带 * 为必填项')}
        fields={IT_FORM} submitLabel={editRecord ? '保存修改' : '确认录入'}
        onSubmit={handleSave} initialValues={editRecord}
      />
      <ConfirmDeleteDialog open={deleteId !== null} onClose={() => setDeleteId(null)} onConfirm={handleDelete} desc="删除后面试记录将不可恢复，请谨慎操作。" />
    </>
  );
}

// ==================== 签到管理 ====================
const CK_FILTERS: ServerFilterField[] = [
  { key: 'keyword', label: '候选人', type: 'input', placeholder: '搜索候选人姓名/岗位' },
  { key: 'status', label: '签到状态', type: 'select', options: [
    { label: '已签到', value: 'checked_in' },
    { label: '待签到', value: 'pending' },
  ] },
];

export function CheckinPage() {
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const table = useServerList({ fetchFn: checkinsApi.list, defaultPageSize: 20 });

  const columns: Column<Record<string, any>>[] = useMemo(() => [
    { key: 'checkin_no', title: '签到ID', width: '110px', sortable: true },
    { key: 'candidate_name', title: '候选人', width: '110px', render: (r) => <span className="font-medium">{r.candidate_name}</span> },
    { key: 'position', title: '应聘岗位', width: '130px' },
    { key: 'interview_time', title: '面试时间', width: '150px', render: (r) => <span className="tabular-nums text-sm">{r.interview_time}</span> },
    { key: 'checkin_time', title: '签到时间', width: '150px', render: (r) => <span className="tabular-nums text-sm">{r.checkin_time || '—'}</span> },
    { key: 'status', title: '签到状态', width: '90px', render: (r) => <StatusBadge status={r.status === 'checked_in' ? '已签到' : '待签到'} variant={r.status === 'checked_in' ? 'success' : 'warning'} /> },
  ], []);

  const handleCheckin = async (r: Record<string, any>) => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const checkinTime = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const res = await checkinsApi.update(r.id, { status: 'checked_in', checkin_time: checkinTime });
    if (res.code === 0) { toast.success('签到成功'); table.refresh(); } else toast.error(res.message || '签到失败');
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const res = await checkinsApi.remove(deleteId);
    if (res.code === 0) { toast.success('删除成功'); table.refresh(); } else toast.error(res.message || '删除失败');
    setDeleteId(null);
  };

  return (
    <>
      <ServerListPage
        title={t('签到管理')} description={t('管理候选人面试签到')}
        data={table.data} total={table.total} loading={table.loading}
        columns={columns} filters={CK_FILTERS}
        rowActions={(r) => [
          ...(r.status === 'pending' ? [{ label: '现场签到', onClick: () => handleCheckin(r) }] : []),
          { label: '删除', variant: 'destructive', icon: <Trash2 className="size-3.5" />, onClick: () => setDeleteId(r.id) },
        ]}
        page={table.page} pageSize={table.pageSize}
        onPageChange={table.setPage} onPageSizeChange={table.setPageSize}
        onSearch={table.setFilters} onReset={table.handleReset} onSort={table.handleSort}
        sortBy={table.sortBy} sortOrder={table.sortOrder} onRefresh={table.refresh}
      />
      <ConfirmDeleteDialog open={deleteId !== null} onClose={() => setDeleteId(null)} onConfirm={handleDelete} desc="删除后签到记录将不可恢复，请谨慎操作。" />
    </>
  );
}

// ==================== 招聘计划 ====================
const RP_STATUS_OPTS = [
  { label: '招聘中', value: 'recruiting' },
  { label: '待启动', value: 'pending' },
  { label: '已完成', value: 'completed' },
];
const RP_STATUS_MAP: Record<string, string> = { recruiting: '招聘中', pending: '待启动', completed: '已完成', paused: '已暂停' };
const RP_STATUS_VARIANT: Record<string, 'default' | 'info' | 'success' | 'warning' | 'danger'> = {
  recruiting: 'info', pending: 'default', completed: 'success', paused: 'warning',
};
const RP_URGENCY_MAP: Record<string, string> = { urgent: '紧急', normal: '普通', low: '低' };

const RP_FILTERS: ServerFilterField[] = [
  { key: 'keyword', label: '部门/岗位', type: 'input', placeholder: '搜索部门/岗位' },
  { key: 'status', label: '计划状态', type: 'select', options: RP_STATUS_OPTS },
];

const RP_FORM: FormFieldDef[] = [
  { key: 'department', label: '需求部门', required: true, placeholder: '如 商务一部' },
  { key: 'position', label: '招聘岗位', required: true, placeholder: '如 商务专员' },
  { key: 'headcount', label: '招聘人数', required: true, placeholder: '如 3' },
  { key: 'urgency', label: '紧急程度', type: 'select', required: true, options: [
    { label: '紧急', value: 'urgent' },
    { label: '普通', value: 'normal' },
    { label: '低', value: 'low' },
  ], defaultValue: 'normal' },
  { key: 'plan_date', label: '计划到岗日期', required: true, placeholder: '如 2026-09-15' },
  { key: 'status', label: '计划状态', type: 'select', required: true, options: RP_STATUS_OPTS, defaultValue: 'recruiting' },
];

export function RecruitPlanPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<Record<string, any> | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const table = useServerList({ fetchFn: recruitPlansApi.list, defaultPageSize: 20 });

  const columns: Column<Record<string, any>>[] = useMemo(() => [
    { key: 'plan_no', title: '计划ID', width: '110px', sortable: true },
    { key: 'department', title: '需求部门', width: '120px' },
    { key: 'position', title: '招聘岗位', render: (r) => <span className="font-medium">{r.position}</span> },
    { key: 'headcount', title: '招聘人数', width: '90px', align: 'right', render: (r) => <span className="tabular-nums">{r.headcount}</span> },
    { key: 'hired_count', title: '已入职', width: '80px', align: 'right', render: (r) => <span className="tabular-nums">{r.hired_count}</span> },
    { key: 'urgency', title: '紧急程度', width: '90px', render: (r) => <StatusBadge status={RP_URGENCY_MAP[r.urgency] || r.urgency} variant={r.urgency === 'urgent' ? 'danger' : r.urgency === 'low' ? 'default' : 'info'} /> },
    { key: 'plan_date', title: '计划到岗', width: '110px', render: (r) => <span className="tabular-nums text-sm">{r.plan_date}</span> },
    { key: 'status', title: '状态', width: '90px', render: (r) => <StatusBadge status={RP_STATUS_MAP[r.status] || r.status} variant={RP_STATUS_VARIANT[r.status] || 'default'} /> },
  ], []);

  const handleSave = async (values: Record<string, unknown>) => {
    const data = { ...values, headcount: Number(values.headcount) || 1 };
    try {
      if (editRecord) {
        const res = await recruitPlansApi.update(editRecord.id, data);
        if (res.code === 0) { toast.success('招聘计划已更新'); table.refresh(); return true; }
        toast.error(res.message || '保存失败'); return false;
      }
      const res = await recruitPlansApi.create({ ...data, plan_no: `RP${Date.now().toString().slice(-5)}`, hired_count: 0 });
      if (res.code === 0) { toast.success('招聘计划已创建'); table.refresh(); return true; }
      toast.error(res.message || '创建失败'); return false;
    } catch { toast.error('保存失败'); return false; }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const res = await recruitPlansApi.remove(deleteId);
    if (res.code === 0) { toast.success('删除成功'); table.refresh(); } else toast.error(res.message || '删除失败');
    setDeleteId(null);
  };

  return (
    <>
      <ServerListPage
        title={t('招聘计划')} description={t('管理招聘计划和进度')}
        data={table.data} total={table.total} loading={table.loading}
        columns={columns} filters={RP_FILTERS}
        primaryActions={[{ label: '新增计划', primary: true, icon: <Plus className="size-3.5" />, onClick: () => { setEditRecord(null); setFormOpen(true); } }]}
        rowActions={(r) => [
          { label: '编辑', onClick: () => { setEditRecord(r); setFormOpen(true); } },
          { label: '删除', variant: 'destructive', icon: <Trash2 className="size-3.5" />, onClick: () => setDeleteId(r.id) },
        ]}
        page={table.page} pageSize={table.pageSize}
        onPageChange={table.setPage} onPageSizeChange={table.setPageSize}
        onSearch={table.setFilters} onReset={table.handleReset} onSort={table.handleSort}
        sortBy={table.sortBy} sortOrder={table.sortOrder} onRefresh={table.refresh}
      />
      <FieldFormDialog
        key={editRecord ? `edit-${editRecord.id}` : 'create'}
        open={formOpen} onOpenChange={setFormOpen}
        title={editRecord ? `编辑计划：${editRecord.plan_no}` : '新增招聘计划'}
        description={t('录入招聘计划，带 * 为必填项')}
        fields={RP_FORM} submitLabel={editRecord ? '保存修改' : '确认创建'}
        onSubmit={handleSave} initialValues={editRecord}
      />
      <ConfirmDeleteDialog open={deleteId !== null} onClose={() => setDeleteId(null)} onConfirm={handleDelete} desc="删除后招聘计划将不可恢复，请谨慎操作。" />
    </>
  );
}
