import { useState, useMemo, useEffect } from 'react';
import { t } from '@/lib/i18n';
import { useNavigate } from 'react-router-dom';
import ServerListPage, { type FilterField, type ActionButton, type Column } from '@/components/ServerListPage';
import StatusBadge from '@/components/StatusBadge';
import FieldFormDialog, { type FormFieldDef } from '@/components/FieldFormDialog';
import BatchImportDialog from '@/components/BatchImportDialog';
import { Plus, Trash2, Upload, Users } from 'lucide-react';
import { toast } from 'sonner';
import { formatDateTime } from '@/lib/format';
import { leadsApi, usersApi, settingsApi } from '@/api';
import { useServerList } from '@/hooks/useServerList';
import { useActionLock } from '@/hooks/useActionLock';
import { extractErrorMessage, validateRecordId } from '@/lib/error-utils';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Lead } from '@/api/types';

const SOURCE_OPTIONS = [
  { label: '官网', value: '官网' },
  { label: '转介绍', value: '转介绍' },
  { label: '陌拜', value: '陌拜' },
  { label: '其他', value: '其他' },
];

const STATUS_OPTIONS = [
  { label: '待跟进', value: 'pending' },
  { label: '跟进中', value: 'following' },
  { label: '已转化', value: 'converted' },
  { label: '已流失', value: 'lost' },
];

const STATUS_MAP: Record<string, string> = {
  pending: '待跟进',
  following: '跟进中',
  converted: '已转化',
  lost: '已流失',
};

const STATUS_VARIANT: Record<string, 'default' | 'info' | 'success' | 'warning' | 'danger'> = {
  pending: 'warning',
  following: 'info',
  converted: 'success',
  lost: 'danger',
};

const FILTER_FIELDS: FilterField[] = [
  { key: 'keyword', label: '线索名称', type: 'input', placeholder: '请输入线索名称' },
  { key: 'source', label: '线索来源', type: 'select', options: SOURCE_OPTIONS },
  { key: 'status', label: '跟进状态', type: 'select', options: STATUS_OPTIONS },
];

function isOverdueRecycle(lastFollowAt: string | undefined, days: number): boolean {
  if (!lastFollowAt || days <= 0) return false;
  const time = new Date(lastFollowAt).getTime();
  if (!Number.isFinite(time)) return false;
  return Date.now() - time > days * 24 * 60 * 60 * 1000;
}

const FORM_FIELDS: FormFieldDef[] = [
  { key: 'lead_name', label: '线索名称', required: true, placeholder: '请输入线索名称' },
  { key: 'company_name', label: '客户/公司', required: true, placeholder: '请输入客户或公司名称' },
  { key: 'source', label: '线索来源', type: 'select', required: true, options: SOURCE_OPTIONS },
  { key: 'status', label: '跟进状态', type: 'select', required: true, options: STATUS_OPTIONS, defaultValue: 'pending' },
  { key: 'phone', label: '联系电话', placeholder: '请输入联系电话' },
  { key: 'remark', label: '备注', type: 'textarea', fullWidth: true, placeholder: '请输入备注信息（选填）' },
];

export default function LeadPage() {
  const navigate = useNavigate();
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // 新建/编辑弹窗
  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);

  // 批量分配弹窗
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignTo, setAssignTo] = useState('');
  const [userOptions, setUserOptions] = useState<{ id: number; name: string; department?: string }[]>([]);
  const [recycleDays, setRecycleDays] = useState(15);
  const { withLock: withDeleteLock, locked: deleteLocked } = useActionLock();
  const { withLock: withOpLock, locked: opLocked } = useActionLock();

  const table = useServerList({
    fetchFn: leadsApi.list,
    defaultPageSize: 20,
  });

  // 加载用户列表用于分配
  useEffect(() => {
    usersApi.list({ pageSize: 100 }).then((res) => {
      if (res.code === 0) setUserOptions(res.data?.list || []);
    });
    settingsApi.getGroup('clue').then((res: { code: number; data?: Record<string, string> }) => {
      if (res.code === 0 && res.data) {
        const days = Number(res.data.recycle_days);
        setRecycleDays(Number.isFinite(days) && days > 0 ? days : 15);
      }
    });
  }, []);

  const columns: Column<Lead>[] = useMemo(() => [
    { key: 'lead_no', title: '线索编号', width: '110px', sortable: true, render: (r) => <span className="font-mono text-xs">{r.lead_no}</span> },
    {
      key: 'lead_name',
      title: '线索名称',
      dataIndex: 'lead_name' as const,
      sortable: true,
      render: (r) => <span className="font-medium">{r.lead_name}</span>,
    },
    { key: 'company_name', title: '客户/公司', dataIndex: 'company_name' as const },
    {
      key: 'source',
      title: '线索来源',
      width: '100px',
      render: (r) => <StatusBadge status={r.source || '其他'} variant="info" />,
    },
    {
      key: 'status',
      title: '跟进状态',
      width: '100px',
      render: (r) => (
        <div className="flex flex-col items-start gap-1">
          <StatusBadge status={STATUS_MAP[r.status] || r.status} variant={STATUS_VARIANT[r.status] || 'default'} />
          {isOverdueRecycle(r.last_follow_at, recycleDays) && r.status !== 'converted' ? (
            <StatusBadge status="已达回收周期" variant="warning" />
          ) : null}
        </div>
      ),
    },
    { key: 'phone', title: '联系电话', dataIndex: 'phone' as const, width: '120px' },
    {
      key: 'last_follow_at',
      title: '最近跟进时间',
      dataIndex: 'last_follow_at' as const,
      width: '160px',
      sortable: true,
      render: (r) => r.last_follow_at ? formatDateTime(r.last_follow_at) : '-',
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

  const handleDelete = async () => {
    await withDeleteLock(async () => {
      if (!deleteId) return;
      const id = validateRecordId({ id: deleteId });
      if (!id) { toast.warning('记录标识缺失，请刷新后重试'); setDeleteId(null); return; }
      try {
        const res = await leadsApi.remove(id);
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

  // 新建/编辑提交
  const handleFormSubmit = async (values: Record<string, unknown>): Promise<boolean> => {
    try {
      const submitValues: Record<string, unknown> = { ...values };
      if (!editingLead && !submitValues.owner_name) {
        const settingsRes = await settingsApi.getGroup('clue');
        const settings: Record<string, string> = settingsRes.code === 0 && settingsRes.data ? settingsRes.data : {};
        if (settings.auto_assign === 'true') {
          let options = userOptions;
          if (options.length === 0) {
            const usersRes = await usersApi.list({ pageSize: 100 });
            if (usersRes.code === 0) {
              options = usersRes.data?.list || [];
              setUserOptions(options);
            }
          }
          if (options.length > 0) {
            const totalRes = await leadsApi.list({ page: 1, page_size: 1 });
            const total = totalRes.code === 0 && totalRes.data ? Number(totalRes.data.total) || 0 : 0;
            const owner = options[total % options.length];
            if (owner) submitValues.owner_name = owner.name;
          }
        }
      }
      const res = editingLead
        ? await leadsApi.update(editingLead.id, submitValues)
        : await leadsApi.create(submitValues);
      if (res.code === 0) {
        toast.success(editingLead ? '线索已更新' : '线索已创建');
        table.refresh();
        return true;
      }
      toast.error(res.message || '保存失败');
      return false;
    } catch (e) {
      toast.error(extractErrorMessage(e));
      return false;
    }
  };

  // 批量分配提交
  const handleAssign = async () => {
    if (!assignTo) {
      toast.warning('请选择负责人');
      return;
    }
    const owner = userOptions.find((u) => String(u.id) === assignTo);
    try {
      const res = await leadsApi.batchAssign(selectedKeys.map(Number), Number(assignTo), owner?.name || '');
      if (res.code === 0) {
        toast.success(`已分配 ${selectedKeys.length} 条线索给 ${owner?.name || '负责人'}`);
        setAssignOpen(false);
        setAssignTo('');
        setSelectedKeys([]);
        table.refresh();
      } else {
        toast.error(res.message || '分配失败');
      }
    } catch {
      toast.error('分配失败');
    }
  };

  const primaryActions: ActionButton[] = [
    {
      label: '新建线索',
      primary: true,
      icon: <Plus className="size-3.5" />,
      onClick: () => { setEditingLead(null); setFormOpen(true); },
    },
    { label: '批量导入', icon: <Upload className="size-3.5" />, onClick: () => setImportOpen(true) },
    {
      label: '批量分配',
      icon: <Users className="size-3.5" />,
      onClick: () => {
        if (selectedKeys.length === 0) { toast.warning('请先勾选要分配的线索'); return; }
        setAssignOpen(true);
      },
    },
  ];

  const rowActions = (record: Lead): ActionButton[] => [
    { label: '详情', onClick: () => navigate(`/customer/clues/${record.id}`) },
    { label: '编辑', onClick: () => { setEditingLead(record); setFormOpen(true); } },
    { label: '删除', variant: 'destructive', onClick: () => setDeleteId(record.id) },
  ];

  return (
    <>
      <ServerListPage<Lead>
        title={t('线索管理')}
        description="管理销售线索，跟进转化"
        data={table.data as Lead[]}
        total={table.total}
        loading={table.loading}
        columns={columns}
        filters={FILTER_FIELDS}
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

      {/* 新建/编辑弹窗 */}
      <FieldFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editingLead ? '编辑线索' : '新建线索'}
        description={editingLead ? `编辑线索「${editingLead.lead_name}」` : '填写线索信息，带 * 为必填项'}
        fields={FORM_FIELDS}
        initialValues={editingLead}
        submitLabel={editingLead ? '保存修改' : '创建线索'}
        onSubmit={handleFormSubmit}
        draft={!editingLead ? { formType: 'lead', summaryField: 'lead_name' } : undefined}
      />

      {/* 批量分配弹窗 */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>批量分配线索</DialogTitle>
            <DialogDescription>已选择 {selectedKeys.length} 条线索，请选择分配负责人</DialogDescription>
          </DialogHeader>
          <Select value={assignTo} onValueChange={setAssignTo}>
            <SelectTrigger>
              <SelectValue placeholder="请选择负责人" />
            </SelectTrigger>
            <SelectContent>
              {userOptions.map((u) => (
                <SelectItem key={u.id} value={String(u.id)}>
                  {u.name}{u.department ? `（${u.department}）` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)}>取消</Button>
            <Button onClick={handleAssign}>确认分配</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认 */}
      <AlertDialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              删除后将无法恢复，确定要删除该线索吗？
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

      {/* 批量导入弹窗 */}
      <BatchImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        importType="线索导入"
        onImported={() => table.refresh()}
      />
    </>
  );
}
