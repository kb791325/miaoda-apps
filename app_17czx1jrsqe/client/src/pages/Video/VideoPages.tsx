import { useMemo, useState } from 'react';
import { t } from '@/lib/i18n';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import ServerListPage, { type FilterField as ServerFilterField, type Column } from '@/components/ServerListPage';
import FieldFormDialog, { type FormFieldDef } from '@/components/FieldFormDialog';
import StatusBadge from '@/components/StatusBadge';
import { formatDateTime, formatAmount } from '@/lib/format';
import { videoOrdersApi, videoProjectsApi, actorsApi } from '@/api';
import { useServerList } from '@/hooks/useServerList';
import { cn } from '@/lib/utils';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const VIDEO_TYPE_OPTS = ['产品展示', '品牌宣传', '达人种草', '剧情短片'].map((v) => ({ label: v, value: v }));

// ==================== 视频订单 ====================
const VO_STATUS_OPTS = [
  { label: '待审批', value: 'pending' },
  { label: '拍摄中', value: 'shooting' },
  { label: '后期中', value: 'post' },
  { label: '已完成', value: 'completed' },
];
const VO_STATUS_MAP: Record<string, string> = { pending: '待审批', shooting: '拍摄中', post: '后期中', completed: '已完成', rejected: '已驳回' };
const VO_STATUS_VARIANT: Record<string, 'default' | 'info' | 'success' | 'warning' | 'danger'> = {
  pending: 'warning', shooting: 'info', post: 'default', completed: 'success', rejected: 'danger',
};

const VO_FILTERS: ServerFilterField[] = [
  { key: 'keyword', label: '集团/主体', type: 'input', placeholder: '搜索集团/主体名称' },
  { key: 'video_type', label: '视频类型', type: 'select', options: VIDEO_TYPE_OPTS },
  { key: 'status', label: '状态', type: 'select', options: VO_STATUS_OPTS },
];

const VO_FORM: FormFieldDef[] = [
  { key: 'group_name', label: '集团名称', required: true, placeholder: '请输入集团名称' },
  { key: 'subject_name', label: '主体名称', required: true, placeholder: '请输入主体名称' },
  { key: 'video_type', label: '视频类型', type: 'select', required: true, options: VIDEO_TYPE_OPTS, defaultValue: '产品展示' },
  { key: 'amount', label: '订单金额（元）', required: true, placeholder: '如 28000' },
  { key: 'owner_name', label: '负责人', required: true, placeholder: '请输入负责人姓名' },
  { key: 'remark', label: '备注', placeholder: '可选' },
];

export function VideoOrderPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<Record<string, any> | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const table = useServerList({ fetchFn: videoOrdersApi.list, defaultPageSize: 20 });

  const columns: Column<Record<string, any>>[] = useMemo(() => [
    { key: 'order_no', title: '订单ID', width: '110px', sortable: true, dataIndex: 'order_no' as any },
    { key: 'group_name', title: '集团名称', render: (r) => <span className="font-medium">{r.group_name}</span> },
    { key: 'subject_name', title: '主体名称', render: (r) => <span className="text-sm">{r.subject_name}</span> },
    { key: 'video_type', title: '视频类型', width: '100px', render: (r) => <StatusBadge status={r.video_type} variant="secondary" /> },
    { key: 'amount', title: '订单金额', width: '140px', align: 'right', sortable: true, render: (r) => <span className="font-medium tabular-nums">{formatAmount(r.amount)}</span> },
    { key: 'status', title: '状态', width: '90px', render: (r) => <StatusBadge status={VO_STATUS_MAP[r.status] || r.status} variant={VO_STATUS_VARIANT[r.status] || 'default'} /> },
    { key: 'owner_name', title: '负责人', width: '90px', dataIndex: 'owner_name' as any },
    { key: 'created_at', title: '创建时间', width: '160px', sortable: true, render: (r) => <span className="tabular-nums text-sm text-muted-foreground">{formatDateTime(r.created_at)}</span> },
  ], []);

  const handleSave = async (values: Record<string, unknown>) => {
    const data = { ...values, amount: Number(values.amount) || 0 };
    try {
      if (editRecord) {
        const res = await videoOrdersApi.update(editRecord.id, data);
        if (res.code === 0) { toast.success('订单已更新'); table.refresh(); return true; }
        toast.error(res.message || '保存失败'); return false;
      }
      const res = await videoOrdersApi.create({ ...data, order_no: `VD${Date.now().toString().slice(-5)}`, status: 'pending' });
      if (res.code === 0) { toast.success('视频订单已创建'); table.refresh(); return true; }
      toast.error(res.message || '创建失败'); return false;
    } catch { toast.error('保存失败'); return false; }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await videoOrdersApi.remove(deleteId);
      if (res.code === 0) { toast.success('删除成功'); table.refresh(); }
      else toast.error(res.message || '删除失败');
    } catch { toast.error('删除失败'); }
    finally { setDeleteId(null); }
  };

  const batchSetStatus = async (status: string, label: string) => {
    if (selected.length === 0) { toast.warning('请先勾选订单'); return; }
    const ids = selected.map(Number);
    try {
      const res = await videoOrdersApi.batchStatus(ids, status);
      if (res.code === 0) { toast.success(`已${label} ${ids.length} 条订单`); setSelected([]); table.refresh(); }
      else toast.error(res.message || '操作失败');
    } catch { toast.error('操作失败'); }
  };

  return (
    <>
      <ServerListPage
        title={t('视频订单')} description={t('管理视频制作订单')}
        data={table.data} total={table.total} loading={table.loading}
        columns={columns} filters={VO_FILTERS}
        primaryActions={[
          { label: '新建订单', primary: true, icon: <Plus className="size-3.5" />, onClick: () => { setEditRecord(null); setFormOpen(true); } },
        ]}
        batchActions={[
          { label: '批量通过', onClick: () => batchSetStatus('shooting', '批量通过') },
          { label: '批量驳回', variant: 'destructive', onClick: () => batchSetStatus('rejected', '批量驳回') },
        ]}
        selectedKeys={selected} onSelectedChange={setSelected}
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
        title={editRecord ? `编辑订单：${editRecord.order_no}` : '新建视频订单'}
        description={t('录入视频订单信息，带 * 为必填项')}
        fields={VO_FORM} submitLabel={editRecord ? '保存修改' : '确认创建'}
        onSubmit={handleSave} initialValues={editRecord}
      />
      <AlertDialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除该订单？</AlertDialogTitle>
            <AlertDialogDescription>删除后订单记录将不可恢复，请谨慎操作。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>确认删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ==================== 视频项目 ====================
const VP_STATUS_OPTS = [
  { label: '未开始', value: 'not_started' },
  { label: '进行中', value: 'in_progress' },
  { label: '已完成', value: 'completed' },
];
const VP_STATUS_MAP: Record<string, string> = { not_started: '未开始', in_progress: '进行中', completed: '已完成' };
const VP_STATUS_VARIANT: Record<string, 'default' | 'info' | 'success' | 'warning' | 'danger'> = {
  not_started: 'default', in_progress: 'info', completed: 'success',
};

const VP_FILTERS: ServerFilterField[] = [
  { key: 'keyword', label: '项目名称', type: 'input', placeholder: '搜索项目名称/关联订单' },
  { key: 'status', label: '状态', type: 'select', options: VP_STATUS_OPTS },
];

const VP_FORM: FormFieldDef[] = [
  { key: 'project_name', label: '项目名称', required: true, placeholder: '请输入项目名称' },
  { key: 'related_order', label: '关联订单', placeholder: '如 VD00001' },
  { key: 'owner_name', label: '负责人', required: true, placeholder: '请输入负责人姓名' },
  { key: 'deadline', label: '截止时间', required: true, placeholder: '如 2026-09-15' },
  { key: 'progress', label: '项目进度（%）', placeholder: '0-100，默认 0' },
  { key: 'status', label: '状态', type: 'select', required: true, options: VP_STATUS_OPTS, defaultValue: 'not_started' },
];

export function VideoProjectPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<Record<string, any> | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const table = useServerList({ fetchFn: videoProjectsApi.list, defaultPageSize: 20 });

  const columns: Column<Record<string, any>>[] = useMemo(() => [
    { key: 'project_name', title: '项目名称', render: (r) => <span className="font-medium">{r.project_name}</span> },
    { key: 'related_order', title: '关联订单', width: '110px', render: (r) => <span className="tabular-nums text-sm">{r.related_order}</span> },
    { key: 'progress', title: '项目进度', width: '160px', sortable: true, render: (r) => {
      const p = Number(r.progress || 0);
      return (
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
            <div className={cn('h-full rounded-full', p >= 100 ? 'bg-emerald-500' : 'bg-primary')} style={{ width: `${Math.min(p, 100)}%` }} />
          </div>
          <span className="text-xs tabular-nums text-muted-foreground">{p}%</span>
        </div>
      );
    } },
    { key: 'owner_name', title: '负责人', width: '90px', dataIndex: 'owner_name' as any },
    { key: 'deadline', title: '截止时间', width: '120px', render: (r) => <span className="tabular-nums text-sm">{r.deadline}</span> },
    { key: 'status', title: '状态', width: '90px', render: (r) => <StatusBadge status={VP_STATUS_MAP[r.status] || r.status} variant={VP_STATUS_VARIANT[r.status] || 'default'} /> },
  ], []);

  const handleSave = async (values: Record<string, unknown>) => {
    const data = { ...values, progress: Number(values.progress) || 0 };
    try {
      if (editRecord) {
        const res = await videoProjectsApi.update(editRecord.id, data);
        if (res.code === 0) { toast.success('项目已更新'); table.refresh(); return true; }
        toast.error(res.message || '保存失败'); return false;
      }
      const res = await videoProjectsApi.create(data);
      if (res.code === 0) { toast.success('视频项目已创建'); table.refresh(); return true; }
      toast.error(res.message || '创建失败'); return false;
    } catch { toast.error('保存失败'); return false; }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await videoProjectsApi.remove(deleteId);
      if (res.code === 0) { toast.success('删除成功'); table.refresh(); }
      else toast.error(res.message || '删除失败');
    } catch { toast.error('删除失败'); }
    finally { setDeleteId(null); }
  };

  return (
    <>
      <ServerListPage
        title={t('视频项目')} description={t('管理视频制作项目进度')}
        data={table.data} total={table.total} loading={table.loading}
        columns={columns} filters={VP_FILTERS}
        primaryActions={[
          { label: '新建项目', primary: true, icon: <Plus className="size-3.5" />, onClick: () => { setEditRecord(null); setFormOpen(true); } },
        ]}
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
        title={editRecord ? `编辑项目：${editRecord.project_name}` : '新建视频项目'}
        description={t('录入项目信息，带 * 为必填项')}
        fields={VP_FORM} submitLabel={editRecord ? '保存修改' : '确认创建'}
        onSubmit={handleSave} initialValues={editRecord}
      />
      <AlertDialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除该项目？</AlertDialogTitle>
            <AlertDialogDescription>删除后项目记录将不可恢复，请谨慎操作。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>确认删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ==================== 演员管理 ====================
const ACTOR_STATUS_OPTS = [
  { label: '可预约', value: 'free' },
  { label: '已约满', value: 'booked' },
];

const ACTOR_FILTERS: ServerFilterField[] = [
  { key: 'keyword', label: '姓名', type: 'input', placeholder: '搜索演员姓名' },
  { key: 'schedule_status', label: '档期状态', type: 'select', options: ACTOR_STATUS_OPTS },
];

const ACTOR_FORM: FormFieldDef[] = [
  { key: 'name', label: '姓名', required: true, placeholder: '请输入演员姓名' },
  { key: 'phone', label: '联系方式', placeholder: '请输入联系方式' },
  { key: 'fans', label: '粉丝量', placeholder: '如 860000' },
  { key: 'price', label: '报价（元）', required: true, placeholder: '如 3800' },
  { key: 'schedule_status', label: '档期状态', type: 'select', required: true, options: ACTOR_STATUS_OPTS, defaultValue: 'free' },
  { key: 'tags', label: '标签', placeholder: '如 美妆/穿搭，多个用 / 分隔' },
];

const fmtFans = (n: number) => (n >= 10000 ? `${(n / 10000).toFixed(1)}w` : String(n));

export function ActorPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<Record<string, any> | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const table = useServerList({ fetchFn: actorsApi.list, defaultPageSize: 20 });

  const columns: Column<Record<string, any>>[] = useMemo(() => [
    { key: 'name', title: '姓名', width: '110px', render: (r) => <span className="font-medium">{r.name}</span> },
    { key: 'phone', title: '联系方式', width: '130px', render: (r) => <span className="tabular-nums text-sm">{r.phone}</span> },
    { key: 'fans', title: '粉丝量', width: '110px', align: 'right', sortable: true, render: (r) => <span className="tabular-nums">{fmtFans(Number(r.fans || 0))}</span> },
    { key: 'price', title: '报价', width: '120px', align: 'right', sortable: true, render: (r) => <span className="font-medium tabular-nums">{formatAmount(r.price)}</span> },
    { key: 'schedule_status', title: '档期状态', width: '100px', render: (r) => <StatusBadge status={r.schedule_status === 'free' ? '可预约' : '已约满'} variant={r.schedule_status === 'free' ? 'success' : 'warning'} /> },
    { key: 'tags', title: '标签', render: (r) => (
      <div className="flex flex-wrap gap-1">
        {String(r.tags || '').split('/').filter(Boolean).slice(0, 3).map((tag) => (
          <span key={tag} className="rounded bg-accent px-1.5 py-0.5 text-[10px] text-accent-foreground">{tag.trim()}</span>
        ))}
      </div>
    ) },
  ], []);

  const handleSave = async (values: Record<string, unknown>) => {
    const data = { ...values, fans: Number(values.fans) || 0, price: Number(values.price) || 0 };
    try {
      if (editRecord) {
        const res = await actorsApi.update(editRecord.id, data);
        if (res.code === 0) { toast.success('演员信息已更新'); table.refresh(); return true; }
        toast.error(res.message || '保存失败'); return false;
      }
      const res = await actorsApi.create(data);
      if (res.code === 0) { toast.success('演员已新增'); table.refresh(); return true; }
      toast.error(res.message || '创建失败'); return false;
    } catch { toast.error('保存失败'); return false; }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await actorsApi.remove(deleteId);
      if (res.code === 0) { toast.success('删除成功'); table.refresh(); }
      else toast.error(res.message || '删除失败');
    } catch { toast.error('删除失败'); }
    finally { setDeleteId(null); }
  };

  return (
    <>
      <ServerListPage
        title={t('演员管理')} description={t('管理合作演员资源')}
        data={table.data} total={table.total} loading={table.loading}
        columns={columns} filters={ACTOR_FILTERS}
        primaryActions={[
          { label: '新增演员', primary: true, icon: <Plus className="size-3.5" />, onClick: () => { setEditRecord(null); setFormOpen(true); } },
        ]}
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
        title={editRecord ? `编辑演员：${editRecord.name}` : '新增演员'}
        description={t('录入演员资源信息，带 * 为必填项')}
        fields={ACTOR_FORM} submitLabel={editRecord ? '保存修改' : '确认新增'}
        onSubmit={handleSave} initialValues={editRecord}
      />
      <AlertDialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除该演员？</AlertDialogTitle>
            <AlertDialogDescription>删除后演员记录将不可恢复，请谨慎操作。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>确认删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
