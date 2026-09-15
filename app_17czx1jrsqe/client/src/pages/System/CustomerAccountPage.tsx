import { useState, useMemo } from 'react';
import { t } from '@/lib/i18n';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import ServerListPage, { type FilterField, type ActionButton, type Column } from '@/components/ServerListPage';
import FieldFormDialog, { type FormFieldDef } from '@/components/FieldFormDialog';
import StatusBadge from '@/components/StatusBadge';
import { formatDateTime } from '@/lib/format';
import { customerAccountsApi } from '@/api';
import { useServerList } from '@/hooks/useServerList';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const STATUS_OPTS = [
  { label: '正常', value: 'active' },
  { label: '已禁用', value: 'disabled' },
];

const FILTERS: FilterField[] = [
  { key: 'keyword', label: '客户/账号', type: 'input', placeholder: '搜索客户名称/登录账号' },
  { key: 'status', label: '状态', type: 'select', options: STATUS_OPTS },
];

const FORM_FIELDS: FormFieldDef[] = [
  { key: 'customer_name', label: '客户名称', required: true, placeholder: '请输入客户名称' },
  { key: 'login_account', label: '登录账号', required: true, placeholder: '请输入登录账号' },
  { key: 'contact_name', label: '联系人', placeholder: '请输入联系人姓名' },
  { key: 'status', label: '状态', type: 'select', required: true, options: STATUS_OPTS, defaultValue: 'active' },
  { key: 'remark', label: '备注', placeholder: '可选' },
];

export default function CustomerAccountPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<Record<string, any> | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const table = useServerList({ fetchFn: customerAccountsApi.list, defaultPageSize: 20 });

  const columns: Column<Record<string, any>>[] = useMemo(() => [
    { key: 'account_no', title: '账户ID', width: '110px', sortable: true, render: (r) => <>{r.account_no || '-'}</> },
    { key: 'customer_name', title: '客户名称', width: '240px', render: (r) => <span className="font-medium">{r.customer_name}</span> },
    { key: 'login_account', title: '登录账号', width: '150px', render: (r) => <>{r.login_account || '-'}</> },
    { key: 'contact_name', title: '联系人', width: '100px', render: (r) => <>{r.contact_name || '-'}</> },
    { key: 'status', title: '状态', width: '90px', render: (r) => <StatusBadge status={r.status === 'active' ? '正常' : '已禁用'} variant={r.status === 'active' ? 'success' : 'danger'} /> },
    { key: 'last_login_at', title: '最后登录时间', width: '160px', render: (r) => <span className="tabular-nums text-sm text-muted-foreground">{formatDateTime(r.last_login_at)}</span> },
    { key: 'created_at', title: '创建时间', width: '160px', render: (r) => <span className="tabular-nums text-sm text-muted-foreground">{formatDateTime(r.created_at)}</span> },
  ], []);

  const handleSave = async (values: Record<string, unknown>) => {
    try {
      if (editRecord) {
        const res = await customerAccountsApi.update(editRecord.id, values);
        if (res.code === 0) { toast.success('账户信息已更新'); table.refresh(); return true; }
        toast.error(res.message || '保存失败'); return false;
      }
      const res = await customerAccountsApi.create({ ...values, account_no: `CA${Date.now().toString().slice(-5)}` });
      if (res.code === 0) { toast.success('客户账户创建成功'); table.refresh(); return true; }
      toast.error(res.message || '创建失败'); return false;
    } catch { toast.error('保存失败'); return false; }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await customerAccountsApi.remove(deleteId);
      if (res.code === 0) { toast.success('删除成功'); table.refresh(); }
      else toast.error(res.message || '删除失败');
    } catch { toast.error('删除失败'); }
    finally { setDeleteId(null); }
  };

  const toggleStatus = async (record: Record<string, any>) => {
    const next = record.status === 'active' ? 'disabled' : 'active';
    const res = await customerAccountsApi.update(record.id, { status: next });
    if (res.code === 0) { toast.success(next === 'disabled' ? '账户已禁用' : '账户已启用'); table.refresh(); }
    else toast.error(res.message || '操作失败');
  };

  const primaryActions: ActionButton[] = [
    { label: '新建账户', primary: true, icon: <Plus className="size-3.5" />, onClick: () => { setEditRecord(null); setFormOpen(true); } },
  ];

  return (
    <>
      <ServerListPage
        title={t('客户账户')} description={t('管理客户登录账户')}
        data={table.data} total={table.total} loading={table.loading}
        columns={columns} filters={FILTERS}
        primaryActions={primaryActions}
        rowActions={(r) => [
          { label: '编辑', onClick: () => { setEditRecord(r); setFormOpen(true); } },
          { label: r.status === 'active' ? '禁用' : '启用', onClick: () => toggleStatus(r) },
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
        title={editRecord ? `编辑账户：${editRecord.customer_name}` : '新建客户账户'}
        description={t('录入客户账户信息，带 * 为必填项')}
        fields={FORM_FIELDS} submitLabel={editRecord ? '保存修改' : '确认创建'}
        onSubmit={handleSave} initialValues={editRecord}
      />
      <AlertDialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除该账户？</AlertDialogTitle>
            <AlertDialogDescription>删除后客户将无法登录系统，请谨慎操作。</AlertDialogDescription>
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
