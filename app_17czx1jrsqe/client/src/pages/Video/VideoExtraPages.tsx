import { useMemo, useState } from 'react';
import { t } from '@/lib/i18n';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import ServerListPage, { type FilterField as ServerFilterField, type Column } from '@/components/ServerListPage';
import FieldFormDialog, { type FormFieldDef } from '@/components/FieldFormDialog';
import StatusBadge from '@/components/StatusBadge';
import { formatDateTime, formatAmount, formatPercent } from '@/lib/format';
import { outsourcingsApi, videoCommissionsApi, shootCostsApi, venueCostsApi, samplesApi } from '@/api';
import { useServerList } from '@/hooks/useServerList';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

function DeleteDialog({ open, onClose, onConfirm, desc }: {
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

// ==================== 外包管理 ====================
const OS_STATUS_OPTS = [
  { label: '待结算', value: 'pending' },
  { label: '已结算', value: 'settled' },
  { label: '部分结算', value: 'partial' },
];
const OS_STATUS_MAP: Record<string, string> = { pending: '待结算', settled: '已结算', partial: '部分结算' };
const OS_STATUS_VARIANT: Record<string, 'default' | 'info' | 'success' | 'warning' | 'danger'> = {
  pending: 'warning', settled: 'success', partial: 'info',
};

const OS_FILTERS: ServerFilterField[] = [
  { key: 'keyword', label: '供应商/项目', type: 'input', placeholder: '搜索供应商/项目' },
  { key: 'settle_status', label: '结算状态', type: 'select', options: OS_STATUS_OPTS },
];

const OS_FORM: FormFieldDef[] = [
  { key: 'supplier', label: '供应商', required: true, placeholder: '请输入供应商名称' },
  { key: 'project_name', label: '外包项目', required: true, placeholder: '请输入外包项目' },
  { key: 'amount', label: '外包费用（元）', required: true, placeholder: '如 15000' },
  { key: 'settle_status', label: '结算状态', type: 'select', required: true, options: OS_STATUS_OPTS, defaultValue: 'pending' },
  { key: 'owner_name', label: '负责人', required: true, placeholder: '请输入负责人姓名' },
  { key: 'remark', label: '备注', placeholder: '可选' },
];

export function OutsourcingPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<Record<string, any> | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const table = useServerList({ fetchFn: outsourcingsApi.list, defaultPageSize: 20 });

  const columns: Column<Record<string, any>>[] = useMemo(() => [
    { key: 'outsource_no', title: '外包ID', width: '110px', sortable: true, dataIndex: 'outsource_no' as any },
    { key: 'supplier', title: '供应商', render: (r) => <span className="font-medium">{r.supplier}</span> },
    { key: 'project_name', title: '外包项目', dataIndex: 'project_name' as any },
    { key: 'amount', title: '外包费用', width: '140px', align: 'right', sortable: true, render: (r) => <span className="font-medium tabular-nums">{formatAmount(r.amount)}</span> },
    { key: 'settle_status', title: '结算状态', width: '100px', render: (r) => <StatusBadge status={OS_STATUS_MAP[r.settle_status] || r.settle_status} variant={OS_STATUS_VARIANT[r.settle_status] || 'default'} /> },
    { key: 'owner_name', title: '负责人', width: '90px', dataIndex: 'owner_name' as any },
    { key: 'created_at', title: '创建时间', width: '160px', render: (r) => <span className="tabular-nums text-sm text-muted-foreground">{formatDateTime(r.created_at)}</span> },
  ], []);

  const handleSave = async (values: Record<string, unknown>) => {
    const data = { ...values, amount: Number(values.amount) || 0 };
    try {
      if (editRecord) {
        const res = await outsourcingsApi.update(editRecord.id, data);
        if (res.code === 0) { toast.success('外包记录已更新'); table.refresh(); return true; }
        toast.error(res.message || '保存失败'); return false;
      }
      const res = await outsourcingsApi.create({ ...data, outsource_no: `OS${Date.now().toString().slice(-5)}` });
      if (res.code === 0) { toast.success('外包记录已创建'); table.refresh(); return true; }
      toast.error(res.message || '创建失败'); return false;
    } catch { toast.error('保存失败'); return false; }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const res = await outsourcingsApi.remove(deleteId);
    if (res.code === 0) { toast.success('删除成功'); table.refresh(); } else toast.error(res.message || '删除失败');
    setDeleteId(null);
  };

  return (
    <>
      <ServerListPage
        title={t('外包管理')} description={t('管理视频外包合作')}
        data={table.data} total={table.total} loading={table.loading}
        columns={columns} filters={OS_FILTERS}
        primaryActions={[{ label: '新增外包', primary: true, icon: <Plus className="size-3.5" />, onClick: () => { setEditRecord(null); setFormOpen(true); } }]}
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
        title={editRecord ? `编辑外包：${editRecord.outsource_no}` : '新增外包记录'}
        description={t('录入外包合作信息，带 * 为必填项')}
        fields={OS_FORM} submitLabel={editRecord ? '保存修改' : '确认创建'}
        onSubmit={handleSave} initialValues={editRecord}
      />
      <DeleteDialog open={deleteId !== null} onClose={() => setDeleteId(null)} onConfirm={handleDelete} desc="删除后外包记录将不可恢复，请谨慎操作。" />
    </>
  );
}

// ==================== 视频提成 ====================
const VC_STATUS_OPTS = [
  { label: '待结算', value: 'pending' },
  { label: '已结算', value: 'settled' },
  { label: '已发放', value: 'paid' },
];
const VC_STATUS_MAP: Record<string, string> = { pending: '待结算', settled: '已结算', paid: '已发放' };
const VC_STATUS_VARIANT: Record<string, 'default' | 'info' | 'success' | 'warning' | 'danger'> = {
  pending: 'warning', settled: 'info', paid: 'success',
};

const VC_FILTERS: ServerFilterField[] = [
  { key: 'keyword', label: '员工/部门', type: 'input', placeholder: '搜索员工姓名/部门' },
  { key: 'status', label: '提成状态', type: 'select', options: VC_STATUS_OPTS },
];

const VC_FORM: FormFieldDef[] = [
  { key: 'employee_name', label: '员工姓名', required: true, placeholder: '请输入员工姓名' },
  { key: 'department', label: '部门', required: true, placeholder: '如 视频部' },
  { key: 'performance', label: '业绩金额（元）', required: true, placeholder: '如 120000' },
  { key: 'commission_rate', label: '提成比例（%）', required: true, placeholder: '如 8' },
  { key: 'settle_month', label: '结算月份', required: true, placeholder: '如 2026-08' },
  { key: 'status', label: '提成状态', type: 'select', required: true, options: VC_STATUS_OPTS, defaultValue: 'pending' },
];

export function VideoCommissionPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<Record<string, any> | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const table = useServerList({ fetchFn: videoCommissionsApi.list, defaultPageSize: 20 });

  const columns: Column<Record<string, any>>[] = useMemo(() => [
    { key: 'commission_no', title: '提成ID', width: '110px', sortable: true },
    { key: 'employee_name', title: '员工姓名', width: '110px', render: (r) => <span className="font-medium">{r.employee_name}</span> },
    { key: 'department', title: '部门', width: '100px', dataIndex: 'department' as any },
    { key: 'performance', title: '业绩金额', width: '140px', align: 'right', sortable: true, render: (r) => <span className="tabular-nums">{formatAmount(r.performance)}</span> },
    { key: 'commission_rate', title: '提成比例', width: '100px', align: 'right', render: (r) => <span className="tabular-nums">{formatPercent(r.commission_rate, 1)}</span> },
    { key: 'commission_amount', title: '提成金额', width: '140px', align: 'right', sortable: true, render: (r) => <span className="font-medium tabular-nums">{formatAmount(r.commission_amount)}</span> },
    { key: 'settle_month', title: '结算月份', width: '100px', dataIndex: 'settle_month' as any },
    { key: 'status', title: '提成状态', width: '90px', render: (r) => <StatusBadge status={VC_STATUS_MAP[r.status] || r.status} variant={VC_STATUS_VARIANT[r.status] || 'default'} /> },
  ], []);

  const handleSave = async (values: Record<string, unknown>) => {
    const performance = Number(values.performance) || 0;
    const rate = Number(values.commission_rate) || 0;
    const data = {
      ...values, performance, commission_rate: rate,
      commission_amount: Number((performance * rate / 100).toFixed(2)),
    };
    try {
      if (editRecord) {
        const res = await videoCommissionsApi.update(editRecord.id, data);
        if (res.code === 0) { toast.success('提成记录已更新'); table.refresh(); return true; }
        toast.error(res.message || '保存失败'); return false;
      }
      const res = await videoCommissionsApi.create({ ...data, commission_no: `VC${Date.now().toString().slice(-5)}` });
      if (res.code === 0) { toast.success('提成记录已创建'); table.refresh(); return true; }
      toast.error(res.message || '创建失败'); return false;
    } catch { toast.error('保存失败'); return false; }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const res = await videoCommissionsApi.remove(deleteId);
    if (res.code === 0) { toast.success('删除成功'); table.refresh(); } else toast.error(res.message || '删除失败');
    setDeleteId(null);
  };

  return (
    <>
      <ServerListPage
        title={t('提成管理')} description={t('管理视频业务提成结算')}
        data={table.data} total={table.total} loading={table.loading}
        columns={columns} filters={VC_FILTERS}
        primaryActions={[{ label: '新增提成', primary: true, icon: <Plus className="size-3.5" />, onClick: () => { setEditRecord(null); setFormOpen(true); } }]}
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
        title={editRecord ? `编辑提成：${editRecord.commission_no}` : '新增提成记录'}
        description={t('录入提成信息，提成金额按业绩×比例自动计算')}
        fields={VC_FORM} submitLabel={editRecord ? '保存修改' : '确认创建'}
        onSubmit={handleSave} initialValues={editRecord}
      />
      <DeleteDialog open={deleteId !== null} onClose={() => setDeleteId(null)} onConfirm={handleDelete} desc="删除后提成记录将不可恢复，请谨慎操作。" />
    </>
  );
}

// ==================== 拍摄费用 ====================
const SC_STATUS_OPTS = [
  { label: '待报销', value: 'pending' },
  { label: '已报销', value: 'reimbursed' },
  { label: '已入账', value: 'booked' },
];
const SC_STATUS_MAP: Record<string, string> = { pending: '待报销', reimbursed: '已报销', booked: '已入账' };
const SC_STATUS_VARIANT: Record<string, 'default' | 'info' | 'success' | 'warning' | 'danger'> = {
  pending: 'warning', reimbursed: 'success', booked: 'info',
};
const SC_TYPE_OPTS = ['场地费', '设备租赁费', '演员费', '交通费', '餐费', '其他'].map((v) => ({ label: v, value: v }));

const SC_FILTERS: ServerFilterField[] = [
  { key: 'keyword', label: '关联项目', type: 'input', placeholder: '搜索关联项目/费用类型' },
  { key: 'reimburse_status', label: '报销状态', type: 'select', options: SC_STATUS_OPTS },
];

const SC_FORM: FormFieldDef[] = [
  { key: 'related_project', label: '关联项目', required: true, placeholder: '请输入关联项目' },
  { key: 'cost_type', label: '费用类型', type: 'select', required: true, options: SC_TYPE_OPTS, defaultValue: '场地费' },
  { key: 'amount', label: '金额（元）', required: true, placeholder: '如 3500' },
  { key: 'occur_date', label: '发生日期', required: true, placeholder: '如 2026-08-28' },
  { key: 'reimburse_status', label: '报销状态', type: 'select', required: true, options: SC_STATUS_OPTS, defaultValue: 'pending' },
  { key: 'owner_name', label: '经办人', placeholder: '请输入经办人' },
];

export function ShootCostPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<Record<string, any> | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const table = useServerList({ fetchFn: shootCostsApi.list, defaultPageSize: 20 });

  const columns: Column<Record<string, any>>[] = useMemo(() => [
    { key: 'cost_no', title: '费用ID', width: '110px', sortable: true, dataIndex: 'cost_no' as any },
    { key: 'related_project', title: '关联项目', dataIndex: 'related_project' as any },
    { key: 'cost_type', title: '费用类型', width: '110px', render: (r) => <StatusBadge status={r.cost_type} variant="secondary" /> },
    { key: 'amount', title: '金额', width: '130px', align: 'right', sortable: true, render: (r) => <span className="font-medium tabular-nums">{formatAmount(r.amount)}</span> },
    { key: 'occur_date', title: '发生日期', width: '120px', render: (r) => <span className="tabular-nums text-sm">{r.occur_date}</span> },
    { key: 'reimburse_status', title: '报销状态', width: '90px', render: (r) => <StatusBadge status={SC_STATUS_MAP[r.reimburse_status] || r.reimburse_status} variant={SC_STATUS_VARIANT[r.reimburse_status] || 'default'} /> },
    { key: 'owner_name', title: '经办人', width: '90px', dataIndex: 'owner_name' as any },
  ], []);

  const handleSave = async (values: Record<string, unknown>) => {
    const data = { ...values, amount: Number(values.amount) || 0 };
    try {
      if (editRecord) {
        const res = await shootCostsApi.update(editRecord.id, data);
        if (res.code === 0) { toast.success('费用记录已更新'); table.refresh(); return true; }
        toast.error(res.message || '保存失败'); return false;
      }
      const res = await shootCostsApi.create({ ...data, cost_no: `SC${Date.now().toString().slice(-5)}` });
      if (res.code === 0) { toast.success('拍摄费用已登记'); table.refresh(); return true; }
      toast.error(res.message || '创建失败'); return false;
    } catch { toast.error('保存失败'); return false; }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const res = await shootCostsApi.remove(deleteId);
    if (res.code === 0) { toast.success('删除成功'); table.refresh(); } else toast.error(res.message || '删除失败');
    setDeleteId(null);
  };

  return (
    <>
      <ServerListPage
        title={t('拍摄费用')} description={t('登记拍摄过程费用支出')}
        data={table.data} total={table.total} loading={table.loading}
        columns={columns} filters={SC_FILTERS}
        primaryActions={[{ label: '登记费用', primary: true, icon: <Plus className="size-3.5" />, onClick: () => { setEditRecord(null); setFormOpen(true); } }]}
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
        title={editRecord ? `编辑费用：${editRecord.cost_no}` : '登记拍摄费用'}
        description={t('录入费用信息，带 * 为必填项')}
        fields={SC_FORM} submitLabel={editRecord ? '保存修改' : '确认登记'}
        onSubmit={handleSave} initialValues={editRecord}
      />
      <DeleteDialog open={deleteId !== null} onClose={() => setDeleteId(null)} onConfirm={handleDelete} desc="删除后费用记录将不可恢复，请谨慎操作。" />
    </>
  );
}

// ==================== 场地费用 ====================
const LC_FILTERS: ServerFilterField[] = [
  { key: 'keyword', label: '场地/项目', type: 'input', placeholder: '搜索场地名称/关联项目' },
  { key: 'reimburse_status', label: '报销状态', type: 'select', options: SC_STATUS_OPTS },
];

const LC_FORM: FormFieldDef[] = [
  { key: 'related_project', label: '关联项目', required: true, placeholder: '请输入关联项目' },
  { key: 'location_name', label: '场地名称', required: true, placeholder: '请输入场地名称' },
  { key: 'amount', label: '金额（元）', required: true, placeholder: '如 8000' },
  { key: 'start_date', label: '开始日期', required: true, placeholder: '如 2026-08-15' },
  { key: 'end_date', label: '结束日期', required: true, placeholder: '如 2026-08-17' },
  { key: 'reimburse_status', label: '报销状态', type: 'select', required: true, options: SC_STATUS_OPTS, defaultValue: 'pending' },
];

export function LocationCostPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<Record<string, any> | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const table = useServerList({ fetchFn: venueCostsApi.list, defaultPageSize: 20 });

  const columns: Column<Record<string, any>>[] = useMemo(() => [
    { key: 'cost_no', title: '费用ID', width: '110px', sortable: true, dataIndex: 'cost_no' as any },
    { key: 'related_project', title: '关联项目', dataIndex: 'related_project' as any },
    { key: 'location_name', title: '场地名称', render: (r) => <span className="font-medium">{r.location_name}</span> },
    { key: 'amount', title: '金额', width: '130px', align: 'right', sortable: true, render: (r) => <span className="font-medium tabular-nums">{formatAmount(r.amount)}</span> },
    { key: 'start_date', title: '开始日期', width: '110px', render: (r) => <span className="tabular-nums text-sm">{r.start_date}</span> },
    { key: 'end_date', title: '结束日期', width: '110px', render: (r) => <span className="tabular-nums text-sm">{r.end_date}</span> },
    { key: 'reimburse_status', title: '报销状态', width: '90px', render: (r) => <StatusBadge status={SC_STATUS_MAP[r.reimburse_status] || r.reimburse_status} variant={SC_STATUS_VARIANT[r.reimburse_status] || 'default'} /> },
  ], []);

  const handleSave = async (values: Record<string, unknown>) => {
    const data = { ...values, amount: Number(values.amount) || 0 };
    try {
      if (editRecord) {
        const res = await venueCostsApi.update(editRecord.id, data);
        if (res.code === 0) { toast.success('场地费用已更新'); table.refresh(); return true; }
        toast.error(res.message || '保存失败'); return false;
      }
      const res = await venueCostsApi.create({ ...data, cost_no: `LC${Date.now().toString().slice(-5)}` });
      if (res.code === 0) { toast.success('场地费用已登记'); table.refresh(); return true; }
      toast.error(res.message || '创建失败'); return false;
    } catch { toast.error('保存失败'); return false; }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const res = await venueCostsApi.remove(deleteId);
    if (res.code === 0) { toast.success('删除成功'); table.refresh(); } else toast.error(res.message || '删除失败');
    setDeleteId(null);
  };

  return (
    <>
      <ServerListPage
        title={t('场地费用')} description={t('登记拍摄场地租赁费用')}
        data={table.data} total={table.total} loading={table.loading}
        columns={columns} filters={LC_FILTERS}
        primaryActions={[{ label: '登记费用', primary: true, icon: <Plus className="size-3.5" />, onClick: () => { setEditRecord(null); setFormOpen(true); } }]}
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
        title={editRecord ? `编辑费用：${editRecord.cost_no}` : '登记场地费用'}
        description={t('录入场地费用信息，带 * 为必填项')}
        fields={LC_FORM} submitLabel={editRecord ? '保存修改' : '确认登记'}
        onSubmit={handleSave} initialValues={editRecord}
      />
      <DeleteDialog open={deleteId !== null} onClose={() => setDeleteId(null)} onConfirm={handleDelete} desc="删除后场地费用记录将不可恢复，请谨慎操作。" />
    </>
  );
}

// ==================== 样品管理 ====================
const SP_STATUS_OPTS = [
  { label: '待寄出', value: 'pending_send' },
  { label: '已寄出', value: 'sent' },
  { label: '待归还', value: 'pending_return' },
  { label: '已归还', value: 'returned' },
  { label: '已丢失', value: 'lost' },
];
const SP_STATUS_MAP: Record<string, string> = {
  pending_send: '待寄出', sent: '已寄出', pending_return: '待归还', returned: '已归还', lost: '已丢失',
};
const SP_STATUS_VARIANT: Record<string, 'default' | 'info' | 'success' | 'warning' | 'danger'> = {
  pending_send: 'default', sent: 'info', pending_return: 'warning', returned: 'success', lost: 'danger',
};

const SP_FILTERS: ServerFilterField[] = [
  { key: 'keyword', label: '样品/订单', type: 'input', placeholder: '搜索样品名称/关联订单' },
  { key: 'mail_status', label: '邮寄状态', type: 'select', options: SP_STATUS_OPTS },
];

const SP_FORM: FormFieldDef[] = [
  { key: 'sample_name', label: '样品名称', required: true, placeholder: '请输入样品名称' },
  { key: 'related_order', label: '关联订单', required: true, placeholder: '如 VD00001' },
  { key: 'tracking_no', label: '物流单号', placeholder: '请输入物流单号' },
  { key: 'send_date', label: '寄出日期', placeholder: '如 2026-08-20' },
  { key: 'return_date', label: '归还日期', placeholder: '如 2026-08-28' },
  { key: 'mail_status', label: '邮寄状态', type: 'select', required: true, options: SP_STATUS_OPTS, defaultValue: 'pending_send' },
];

export function SamplePage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<Record<string, any> | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const table = useServerList({ fetchFn: samplesApi.list, defaultPageSize: 20 });

  const columns: Column<Record<string, any>>[] = useMemo(() => [
    { key: 'sample_no', title: '样品ID', width: '110px', sortable: true, dataIndex: 'sample_no' as any },
    { key: 'sample_name', title: '样品名称', render: (r) => <span className="font-medium">{r.sample_name}</span> },
    { key: 'related_order', title: '关联订单', width: '110px', render: (r) => <span className="tabular-nums text-sm">{r.related_order}</span> },
    { key: 'mail_status', title: '邮寄状态', width: '100px', render: (r) => <StatusBadge status={SP_STATUS_MAP[r.mail_status] || r.mail_status} variant={SP_STATUS_VARIANT[r.mail_status] || 'default'} /> },
    { key: 'tracking_no', title: '物流单号', width: '150px', render: (r) => <span className="tabular-nums text-sm">{r.tracking_no || '—'}</span> },
    { key: 'send_date', title: '寄出日期', width: '110px', render: (r) => <span className="tabular-nums text-sm">{r.send_date || '—'}</span> },
    { key: 'return_date', title: '归还日期', width: '110px', render: (r) => <span className="tabular-nums text-sm">{r.return_date || '—'}</span> },
  ], []);

  const handleSave = async (values: Record<string, unknown>) => {
    try {
      if (editRecord) {
        const res = await samplesApi.update(editRecord.id, values);
        if (res.code === 0) { toast.success('样品信息已更新'); table.refresh(); return true; }
        toast.error(res.message || '保存失败'); return false;
      }
      const res = await samplesApi.create({ ...values, sample_no: `SP${Date.now().toString().slice(-5)}` });
      if (res.code === 0) { toast.success('样品已登记'); table.refresh(); return true; }
      toast.error(res.message || '创建失败'); return false;
    } catch { toast.error('保存失败'); return false; }
  };

  const handleFlow = async (r: Record<string, any>, action: 'send' | 'apply_return' | 'return') => {
    try {
      const res = await samplesApi.flow(r.id, action);
      if (res.code === 0) {
        toast.success(action === 'send' ? '样品已寄出' : action === 'apply_return' ? '已申请归还' : '已确认归还');
        table.refresh();
      } else toast.error(res.message || '操作失败');
    } catch { toast.error('操作失败'); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const res = await samplesApi.remove(deleteId);
    if (res.code === 0) { toast.success('删除成功'); table.refresh(); } else toast.error(res.message || '删除失败');
    setDeleteId(null);
  };

  return (
    <>
      <ServerListPage
        title={t('样品管理')} description={t('管理样品邮寄与归还')}
        data={table.data} total={table.total} loading={table.loading}
        columns={columns} filters={SP_FILTERS}
        primaryActions={[{ label: '登记样品', primary: true, icon: <Plus className="size-3.5" />, onClick: () => { setEditRecord(null); setFormOpen(true); } }]}
        rowActions={(r) => {
          const acts = [];
          if (r.mail_status === 'pending_send') acts.push({ label: '寄出', onClick: () => handleFlow(r, 'send') });
          if (r.mail_status === 'sent') acts.push({ label: '申请归还', onClick: () => handleFlow(r, 'apply_return') });
          if (r.mail_status === 'pending_return') acts.push({ label: '确认归还', onClick: () => handleFlow(r, 'return') });
          acts.push({ label: '编辑', onClick: () => { setEditRecord(r); setFormOpen(true); } });
          acts.push({ label: '删除', variant: 'destructive' as const, icon: <Trash2 className="size-3.5" />, onClick: () => setDeleteId(r.id) });
          return acts;
        }}
        page={table.page} pageSize={table.pageSize}
        onPageChange={table.setPage} onPageSizeChange={table.setPageSize}
        onSearch={table.setFilters} onReset={table.handleReset} onSort={table.handleSort}
        sortBy={table.sortBy} sortOrder={table.sortOrder} onRefresh={table.refresh}
      />
      <FieldFormDialog
        key={editRecord ? `edit-${editRecord.id}` : 'create'}
        open={formOpen} onOpenChange={setFormOpen}
        title={editRecord ? `编辑样品：${editRecord.sample_no}` : '登记样品'}
        description={t('录入样品邮寄信息，带 * 为必填项')}
        fields={SP_FORM} submitLabel={editRecord ? '保存修改' : '确认登记'}
        onSubmit={handleSave} initialValues={editRecord}
      />
      <DeleteDialog open={deleteId !== null} onClose={() => setDeleteId(null)} onConfirm={handleDelete} desc="删除后样品记录将不可恢复，请谨慎操作。" />
    </>
  );
}
