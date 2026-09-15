import { useState, useMemo } from 'react';
import { useActionLock } from '@/hooks/useActionLock';
import { extractErrorMessage, validateRecordId } from '@/lib/error-utils';
import { t } from '@/lib/i18n';
import ServerListPage, { type FilterField, type ActionButton, type Column } from '@/components/ServerListPage';
import StatusBadge from '@/components/StatusBadge';
import { Plus, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { formatAmount, formatDateTime } from '@/lib/format';
import { exportRowsToCsv } from '@/lib/export';
import { consumptionsApi } from '@/api';
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
import type { Consumption } from '@/api/types';
import FieldFormDialog, { type FormFieldDef } from '@/components/FieldFormDialog';
import BatchImportDialog from '@/components/BatchImportDialog';

const PORT_OPTS = [
  { label: '巨量千川', value: '巨量千川' },
  { label: '腾讯广告', value: '腾讯广告' },
  { label: '磁力引擎', value: '磁力引擎' },
  { label: '百度营销', value: '百度营销' },
];

const DEPT_OPTS = [
  { label: '商务一部', value: '商务一部' },
  { label: '商务二部', value: '商务二部' },
  { label: '商务三部', value: '商务三部' },
  { label: '优化部', value: '优化部' },
];

const FILTERS: FilterField[] = [
  { key: 'customer_name', label: '客户名称', type: 'input', placeholder: '客户名称' },
  { key: 'port', label: '端口', type: 'select', options: PORT_OPTS },
  { key: 'department', label: '部门', type: 'select', options: DEPT_OPTS },
  { key: 'sales_name', label: '商务', type: 'input', placeholder: '商务姓名', advanced: true },
];

export default function ConsumptionPage() {
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<Consumption | null>(null);

  const { withLock: withDeleteLock, locked: deleteLocked } = useActionLock();

  const table = useServerList({
    fetchFn: consumptionsApi.list,
    defaultPageSize: 20,
  });

  const columns: Column<any>[] = useMemo(() => [
    { key: 'consume_no', title: '消耗编号', dataIndex: 'consume_no' as const, width: '150px' },
    { key: 'customer_name', title: '客户名称', dataIndex: 'customer_name' as const, width: '220px' },
    { key: 'port', title: '端口', dataIndex: 'port' as const, width: '110px' },
    { key: 'department', title: '部门', dataIndex: 'department' as const, width: '110px' },
    { key: 'sales_name', title: '商务', dataIndex: 'sales_name' as const, width: '90px' },
    {
      key: 'consume_amount',
      title: '消耗金额',
      width: '130px',
      align: 'right',
      sortable: true,
      render: (r) => <span className="tabular-nums font-semibold">{formatAmount(r.consume_amount)}</span>,
    },
    {
      key: 'grant_consume',
      title: '赠款消耗',
      width: '130px',
      align: 'right',
      render: (r) => <span className="tabular-nums text-emerald-600">{formatAmount(r.grant_consume)}</span>,
    },
    {
      key: 'cash_consume',
      title: '现金消耗',
      width: '130px',
      align: 'right',
      render: (r) => <span className="tabular-nums">{formatAmount(r.cash_consume)}</span>,
    },
    {
      key: 'consume_date',
      title: '消耗日期',
      dataIndex: 'consume_date' as const,
      width: '120px',
      sortable: true,
      render: (r) => r.consume_date?.slice(0, 10) || '-',
    },
    {
      key: 'created_at',
      title: '创建时间',
      dataIndex: 'created_at' as const,
      width: '160px',
      render: (r) => formatDateTime(r.created_at),
    },
  ], []);

  const handleDelete = async () => {
    await withDeleteLock(async () => {
      if (!deleteId) return;
      const id = validateRecordId({ id: deleteId });
      if (!id) { toast.warning('记录标识缺失，请刷新后重试'); setDeleteId(null); return; }
      try {
        const res = await consumptionsApi.remove(id);
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

  const CONSUMPTION_FORM_FIELDS: FormFieldDef[] = [
    { key: 'customer_name', label: '客户名称', required: true, placeholder: '请输入客户名称' },
    { key: 'port', label: '端口', type: 'select', required: true, options: PORT_OPTS },
    { key: 'department', label: '部门', type: 'select', required: true, options: DEPT_OPTS },
    { key: 'sales_name', label: '商务', required: true, placeholder: '请输入商务姓名' },
    { key: 'cash_consume', label: '现金消耗（元）', type: 'number', required: true, placeholder: '请输入现金消耗' },
    { key: 'grant_consume', label: '赠款消耗（元）', type: 'number', placeholder: '请输入赠款消耗（可选）' },
    { key: 'consume_date', label: '消耗日期', required: true, placeholder: '如 2026-08-29' },
  ];

  const handleSubmitConsumption = async (values: Record<string, unknown>) => {
    try {
      const cash = Number(values.cash_consume) || 0;
      const bonus = Number(values.grant_consume) || 0;
      const payload = { ...values, cash_consume: cash, grant_consume: bonus, consume_amount: cash + bonus };
      const res = editRecord
        ? await consumptionsApi.update(editRecord.id, payload)
        : await consumptionsApi.create(payload);
      if (res.code === 0) {
        toast.success(editRecord ? '消耗修改成功' : '消耗登记成功');
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

  const primaryActions: ActionButton[] = [
    { label: '新增消耗', primary: true, icon: <Plus className="size-3.5" />, onClick: () => { setEditRecord(null); setFormOpen(true); } },
    { label: '批量导入', icon: <Upload className="size-3.5" />, onClick: () => setImportOpen(true) },
    {
      label: '导出',
      onClick: () => exportRowsToCsv('消耗列表', [
        { key: 'consume_no', label: '消耗单号' },
        { key: 'customer_name', label: '客户名称' },
        { key: 'port', label: '端口' },
        { key: 'sales_name', label: '商务' },
        { key: 'consume_amount', label: '消耗总额' },
        { key: 'grant_consume', label: '赠款消耗' },
        { key: 'cash_consume', label: '现金消耗' },
        { key: 'consume_date', label: '消耗日期' },
      ], table.data as Consumption[]),
    },
  ];

  const rowActions = (record: Consumption): ActionButton[] => [
    { label: '编辑', onClick: () => { setEditRecord(record); setFormOpen(true); } },
    { label: '删除', onClick: () => setDeleteId(record.id) },
  ];

  return (
    <>
      <ServerListPage<any>
        title={t('消耗管理')}
        description="查看广告投放消耗明细"
          data={table.data as any[]}
        total={table.total}
        loading={table.loading}
        columns={columns as any}
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

      {/* 批量导入弹窗 */}
      <BatchImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        importType="消耗导入"
        onImported={() => table.refresh()}
      />

      <AlertDialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              删除后将无法恢复，确定要删除该消耗记录吗？
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

      <FieldFormDialog
        open={formOpen}
        onOpenChange={(o) => { setFormOpen(o); if (!o) setEditRecord(null); }}
        title={editRecord ? '编辑消耗' : '登记消耗'}
        description={editRecord ? '修改消耗记录后提交生效' : '登记新的消耗记录，消耗总额自动合计现金与赠款'}
        fields={CONSUMPTION_FORM_FIELDS}
        initialValues={editRecord ? {
          customer_name: editRecord.customer_name,
          port: editRecord.port || '',
          department: editRecord.department || '',
          sales_name: editRecord.sales_name,
          cash_consume: String(editRecord.cash_consume),
          grant_consume: String(editRecord.grant_consume),
          consume_date: editRecord.consume_date?.slice(0, 10) || '',
        } : undefined}
        submitLabel={editRecord ? '保存修改' : '确认登记'}
        onSubmit={handleSubmitConsumption}
      />
    </>
  );
}
