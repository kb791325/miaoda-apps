import { useState, useMemo, useEffect } from 'react';
import { t } from '@/lib/i18n';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ServerListPage, { type FilterField, type ActionButton, type Column } from '@/components/ServerListPage';
import StatusBadge from '@/components/StatusBadge';
import FieldFormDialog, { type FormFieldDef } from '@/components/FieldFormDialog';
import BatchImportDialog from '@/components/BatchImportDialog';
import { Plus, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { formatDateTime } from '@/lib/format';
import { exportRowsToCsv } from '@/lib/export';
import { customersApi, settingsApi } from '@/api';
import { apiPost } from '@/api/request';
import { useServerList } from '@/hooks/useServerList';
import { useDepartmentOptions } from '@/hooks/useDepartmentOptions';
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
import type { Customer } from '@/api/types';

const LEVEL_OPTIONS = [
  { label: 'A级', value: 'A' },
  { label: 'B级', value: 'B' },
  { label: 'C级', value: 'C' },
  { label: 'D级', value: 'D' },
];

const STATUS_OPTIONS = [
  { label: '活跃', value: 'active' },
  { label: '冻结', value: 'frozen' },
  { label: '流失', value: 'lost' },
];

const INDUSTRY_OPTIONS = [
  { label: '电商', value: '电商' },
  { label: '教育', value: '教育' },
  { label: '游戏', value: '游戏' },
  { label: '金融', value: '金融' },
  { label: '本地生活', value: '本地生活' },
  { label: '家居', value: '家居' },
  { label: '美妆', value: '美妆' },
];

const FILTER_FIELDS: FilterField[] = [
  { key: 'keyword', label: '客户名称', type: 'input', placeholder: '请输入客户名称' },
  { key: 'primary_industry', label: '一级行业', type: 'select', options: INDUSTRY_OPTIONS },
  { key: 'level', label: '客户等级', type: 'select', options: LEVEL_OPTIONS },
  { key: 'status', label: '状态', type: 'select', options: STATUS_OPTIONS },
];

const CUSTOMER_FORM_FIELDS: FormFieldDef[] = [
  { key: 'customer_name', label: '客户名称', required: true },
  { key: 'group_name', label: '集团名称' },
  { key: 'primary_industry', label: '一级行业', required: true, type: 'select',
    options: [{ label: '电商', value: '电商' }, { label: '教育', value: '教育' }, { label: '游戏', value: '游戏' },
      { label: '金融', value: '金融' }, { label: '本地生活', value: '本地生活' }, { label: '家居', value: '家居' }, { label: '美妆', value: '美妆' }] },
  { key: 'secondary_industry', label: '二级行业' },
  { key: 'customer_level', label: '客户等级', type: 'select', options: LEVEL_OPTIONS, defaultValue: 'B' },
  { key: 'sales_name', label: '负责商务', required: true },
  { key: 'department', label: '所属部门', type: 'select', options: [] },
  { key: 'status', label: '状态', type: 'select', options: STATUS_OPTIONS, defaultValue: 'active' },
  { key: 'remark', label: '备注', type: 'textarea', fullWidth: true },
];

const STATUS_MAP: Record<string, string> = {
  active: '活跃',
  inactive: '停用',
  pending: '待激活',
  frozen: '冻结',
  lost: '流失',
};

const CUSTOMER_COLUMN_MAP: Record<string, string> = {
  customer_no: '客户编号',
  customer_name: '客户名称',
  group_name: '集团名称',
  primary_industry: '一级行业',
  secondary_industry: '二级行业',
  level: '客户等级',
  status: '客户状态',
  owner_name: '负责商务',
  department: '所属部门',
  remark: '备注',
};

const CUSTOMER_STATUS_CN: Record<string, string> = {
  active: '合作中',
  pending: '待激活',
  frozen: '已冻结',
};

function todayDateStr(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}${month}${day}`;
}

async function createCustomerWithNo(payload: Record<string, unknown>): Promise<boolean> {
  const body: Record<string, unknown> = {};
  for (const [fe, cn] of Object.entries(CUSTOMER_COLUMN_MAP)) {
    const v = payload[fe];
    if (v === undefined || v === null) continue;
    body[cn] = fe === 'status' ? (CUSTOMER_STATUS_CN[String(v)] || v) : v;
  }
  const res = await apiPost<Record<string, unknown>>(`entity/${encodeURIComponent('客户管理')}`, body);
  if (res.code === 0) return true;
  toast.error(res.message || '保存失败');
  return false;
}

export default function CustomerPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<Customer | null>(null);
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);
  const [batchDeleting, setBatchDeleting] = useState(false);
  const { withLock: withDeleteLock, locked: deleteLocked } = useActionLock();
  const { withLock: withOpLock, locked: opLocked } = useActionLock();
  const departmentOptions = useDepartmentOptions();

  const filterFields: FilterField[] = useMemo(
    () => [...FILTER_FIELDS, { key: 'department', label: '所属部门', type: 'select', options: departmentOptions, advanced: true }],
    [departmentOptions],
  );

  const formFields: FormFieldDef[] = useMemo(
    () => CUSTOMER_FORM_FIELDS.map((f) => (f.key === 'department' ? { ...f, type: 'select', options: departmentOptions } : f)),
    [departmentOptions],
  );

  const table = useServerList({
    fetchFn: customersApi.list,
    defaultPageSize: 20,
  });

  const columns: Column<Customer>[] = useMemo(() => [
    { key: 'customer_no', title: '客户编号', width: '110px', sortable: true, render: (r) => <span className="font-mono text-xs">{r.customer_no}</span> },
    {
      key: 'customer_name',
      title: '客户名称',
      dataIndex: 'customer_name' as const,
      sortable: true,
      render: (r) => <span className="font-medium">{r.customer_name}</span>,
    },
    { key: 'group_name', title: '集团名称', dataIndex: 'group_name' as const },
    { key: 'primary_industry', title: '一级行业', dataIndex: 'primary_industry' as const, width: '100px' },
    { key: 'secondary_industry', title: '二级行业', dataIndex: 'secondary_industry' as const, width: '120px' },
    {
      key: 'level',
      title: '客户等级',
      width: '90px',
      render: (r) => <StatusBadge status={r.level} variant="info" />,
    },
    { key: 'department', title: '所属部门', dataIndex: 'department' as const, width: '120px' },
    {
      key: 'status',
      title: '状态',
      width: '90px',
      render: (r) => (
        <StatusBadge
          status={STATUS_MAP[r.status] || r.status}
          variant={r.status === 'active' ? 'success' : r.status === 'pending' ? 'warning' : r.status === 'inactive' ? 'secondary' : 'danger'}
        />
      ),
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

  // 从 URL 参数打开草稿
  useEffect(() => {
    const draft = searchParams.get('draft');
    if (draft?.startsWith('customer:')) {
      setFormOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete('draft');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleSave = async (values: Record<string, unknown>) => {
    // 表单字段映射为后端列名
    const payload: Record<string, unknown> = { ...values };
    if (payload.customer_level !== undefined) {
      payload.level = payload.customer_level;
      delete payload.customer_level;
    }
    if (payload.sales_name !== undefined) {
      payload.owner_name = payload.sales_name;
      delete payload.sales_name;
    }
    if (!editRecord) {
      const settingsRes = await settingsApi.getGroup('customer');
      const settings: Record<string, string> = settingsRes.code === 0 && settingsRes.data ? settingsRes.data : {};
      if (settings.auto_no === 'true') {
        if (!payload.customer_no) {
          const prefix = settings.id_prefix || 'CU';
          const dateStr = todayDateStr();
          const listRes = await customersApi.list({ page: 1, page_size: 10000 });
          const rows: Customer[] = listRes.code === 0 && listRes.data ? ((listRes.data as { list?: Customer[] }).list || []) : [];
          const seq = rows.filter((r: Customer) => typeof r.customer_no === 'string' && r.customer_no.startsWith(`${prefix}${dateStr}`)).length + 1;
          payload.customer_no = `${prefix}${dateStr}${String(seq).padStart(4, '0')}`;
        }
        try {
          const ok = await createCustomerWithNo(payload);
          if (ok) {
            toast.success('客户创建成功');
            setEditRecord(null);
            table.refresh();
          }
          return ok;
        } catch (e) {
          toast.error(extractErrorMessage(e));
          return false;
        }
      }
    }
    try {
      const res = editRecord
        ? await customersApi.update(editRecord.id, payload)
        : await customersApi.create(payload);
      if (res.code === 0) {
        toast.success(editRecord ? '客户信息已更新' : '客户创建成功');
        setEditRecord(null);
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

  const handleBatchDelete = async () => {
    await withOpLock(async () => {
      if (selectedKeys.length === 0) { toast.warning('请先选择要删除的客户'); return; }
      setBatchDeleting(true);
      try {
        const res = await customersApi.batchDelete(selectedKeys.map(Number));
        if (res.code === 0) {
          toast.success(`已删除 ${selectedKeys.length} 条客户`);
          setSelectedKeys([]);
          table.refresh();
        } else {
          toast.error(res.message || '批量删除失败');
        }
      } catch (e) {
        toast.error(extractErrorMessage(e));
      } finally {
        setBatchDeleting(false);
        setBatchDeleteOpen(false);
      }
    });
  };

  const handleDelete = async () => {
    await withDeleteLock(async () => {
      if (!deleteId) return;
      const id = validateRecordId({ id: deleteId });
      if (!id) { toast.warning('记录标识缺失，请刷新后重试'); setDeleteId(null); return; }
      try {
        const res = await customersApi.remove(id);
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

  const primaryActions: ActionButton[] = [
    { label: '新建客户', primary: true, icon: <Plus className="size-3.5" />, onClick: () => { setEditRecord(null); setFormOpen(true); } },
    { label: '批量导入', icon: <Upload className="size-3.5" />, onClick: () => setImportOpen(true) },
    {
      label: '导出',
      onClick: () => exportRowsToCsv('客户列表', [
        { key: 'customer_name', label: '客户名称' },
        { key: 'group_name', label: '集团名称' },
        { key: 'primary_industry', label: '一级行业' },
        { key: 'secondary_industry', label: '二级行业' },
        { key: 'level', label: '客户等级' },
        { key: 'department', label: '所属部门' },
        { key: 'status', label: '状态' },
        { key: 'created_at', label: '创建时间' },
      ], table.data as Customer[]),
    },
  ];

  const batchActions: ActionButton[] = [
    {
      label: '批量删除',
      variant: 'destructive',
      icon: <Trash2 className="size-3.5" />,
      onClick: () => {
        if (selectedKeys.length === 0) {
          toast.warning('请先勾选要删除的客户');
          return;
        }
        setBatchDeleteOpen(true);
      },
    },
  ];

  const rowActions = (record: Customer): ActionButton[] => [
    { label: '详情', onClick: () => navigate(`/customer/customers/${record.id}`) },
    { label: '编辑', onClick: () => { setEditRecord(record); setFormOpen(true); } },
    { label: '删除', onClick: () => setDeleteId(record.id) },
  ];

  return (
    <>
      <ServerListPage<Customer>
        title={t('客户管理')}
        description="管理所有客户信息，跟踪客户等级和负责商务"
        data={table.data as Customer[]}
        total={table.total}
        loading={table.loading}
        onExportAll={async () => {
          const res = await customersApi.list({ ...table.filters, page: 1, page_size: 10000 });
          return (res.code === 0 ? (res.data as any).list : []) as Customer[];
        }}
        columns={columns}
        filters={filterFields}
        primaryActions={primaryActions}
        batchActions={batchActions}
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
        emptyActionText="新建第一条客户"
        onEmptyAction={() => setFormOpen(true)}
        onRowClick={(r) => navigate(`/customer/customers/${r.id}`)}
        rowActions={rowActions}
      />

      {/* 新建/编辑客户弹窗 */}
      <FieldFormDialog
        key={editRecord ? `edit-${editRecord.id}` : 'create'}
        open={formOpen}
        onOpenChange={(o) => {
          setFormOpen(o);
          if (!o) setEditRecord(null);
        }}
        title={editRecord ? `编辑客户：${editRecord.customer_name}` : '新建客户'}
        description="填写客户基本信息，带 * 为必填项"
        fields={formFields}
        submitLabel={editRecord ? '保存修改' : '创建客户'}
        onSubmit={handleSave}
        initialValues={editRecord ? { ...editRecord, customer_level: editRecord.level } : null}
        draft={editRecord ? undefined : { formType: 'customer', summaryField: 'customer_name' }}
      />

      {/* 批量导入弹窗 */}
      <BatchImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        importType="客户导入"
        onImported={() => table.refresh()}
      />

      {/* 批量删除确认 */}
      <AlertDialog open={batchDeleteOpen} onOpenChange={(o) => !o && setBatchDeleteOpen(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认批量删除</AlertDialogTitle>
            <AlertDialogDescription>
              即将删除已勾选的 {selectedKeys.length} 条客户，删除后将无法恢复，确定继续吗？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleBatchDelete} disabled={batchDeleting || opLocked}>
              {opLocked ? '删除中...' : '确认删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              删除后将无法恢复，确定要删除该客户吗？
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
    </>
  );
}
