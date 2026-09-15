import { useState, useMemo } from 'react';
import { t } from '@/lib/i18n';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, AlertTriangle, Check, XCircle, ClipboardList } from 'lucide-react';
import InventoryCheckCreateDialog from './InventoryCheckCreateDialog';
import InventoryCheckDetailDialog from './InventoryCheckDetailDialog';
import { useActionLock } from '@/hooks/useActionLock';
import { useExport } from '@/hooks/useExport';
import { useBatchSelection } from '@/hooks/useBatchSelection';
import { runBatch, reportBatchResult } from '@/utils/batch-run';
import { ExportButton } from '@/components/ExportButton';
import { BatchDeleteDialog } from '@/components/BatchDeleteDialog';
import { extractErrorMessage, validateRecordId } from '@/lib/error-utils';
import { toast } from 'sonner';
import ServerListPage, { type FilterField, type ActionButton, type Column } from '@/components/ServerListPage';
import FieldFormDialog, { type FormFieldDef } from '@/components/FieldFormDialog';
import StatusBadge from '@/components/StatusBadge';
import { formatAmount, formatDate, formatDateTime } from '@/lib/format';
import {
  assetsApi, inventoriesApi, stockInsApi, requisitionsApi, returnsApi, inventoryChecksApi,
} from '@/api';
import { useServerList } from '@/hooks/useServerList';
import type {
  Asset, Inventory, StockIn, Requisition, ReturnRecord, InventoryCheck,
} from '@/api/types';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const DEPT_OPTS = [
  { label: '总经办', value: '总经办' },
  { label: '商务一部', value: '商务一部' },
  { label: '商务二部', value: '商务二部' },
  { label: '优化部', value: '优化部' },
  { label: '财务部', value: '财务部' },
  { label: '行政人事部', value: '行政人事部' },
];

// ==================== 资产管理 ====================
const ASSET_STATUS_OPTS = [
  { label: '使用中', value: 'in_use' },
  { label: '闲置', value: 'idle' },
  { label: '维修中', value: 'maintenance' },
  { label: '已报废', value: 'scrapped' },
];
const ASSET_STATUS_MAP: Record<string, string> = { in_use: '使用中', idle: '闲置', maintenance: '维修中', scrapped: '已报废' };
const ASSET_STATUS_VARIANT: Record<string, 'default' | 'info' | 'success' | 'warning' | 'danger'> = {
  in_use: 'success', idle: 'info', maintenance: 'warning', scrapped: 'danger',
};
const ASSET_CATEGORY_OPTS = [
  { label: '办公设备', value: '办公设备' },
  { label: '办公家具', value: '办公家具' },
  { label: '拍摄器材', value: '拍摄器材' },
  { label: '其他', value: '其他' },
];

const ASSET_FILTERS: FilterField[] = [
  { key: 'keyword', label: '资产编号/名称', type: 'input', placeholder: '搜索资产编号/名称' },
  { key: 'category', label: '类别', type: 'select', options: ASSET_CATEGORY_OPTS },
  { key: 'status', label: '状态', type: 'select', options: ASSET_STATUS_OPTS },
];

const ASSET_FORM: FormFieldDef[] = [
  { key: 'asset_name', label: '资产名称', required: true, placeholder: '如 联想 ThinkPad X1' },
  { key: 'category', label: '类别', type: 'select', required: true, options: ASSET_CATEGORY_OPTS, defaultValue: '办公设备' },
  { key: 'spec', label: '规格型号', placeholder: '如 14寸/i7/16G' },
  { key: 'amount', label: '购入金额（元）', required: true, placeholder: '请输入金额' },
  { key: 'department', label: '使用部门', type: 'select', required: true, options: DEPT_OPTS, defaultValue: '行政人事部' },
  { key: 'user_name', label: '使用人', placeholder: '公共资产可留空' },
  { key: 'status', label: '状态', type: 'select', required: true, options: ASSET_STATUS_OPTS, defaultValue: 'in_use' },
  { key: 'purchase_date', label: '购入日期', type: 'date', required: true },
];

export function AssetPage() {
  const navigate = useNavigate();
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<Asset | null>(null);
  const { withLock: withDeleteLock, locked: deleteLocked } = useActionLock();
  const { withLock: withOpLock, locked: opLocked } = useActionLock();

  const table = useServerList({ fetchFn: assetsApi.list, defaultPageSize: 20 });
  const { exporting, exportAs } = useExport({ fetchFn: assetsApi.list, filename: '资产管理' });
  const selection = useBatchSelection();
  const { withLock: withBatchLock, locked: batchLocked } = useActionLock();
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);

  const batchActions: ActionButton[] = [
    { label: '批量删除', variant: 'destructive', icon: <Trash2 className="size-3.5" />, disabled: batchLocked, onClick: () => setBatchDeleteOpen(true) },
  ];

  const handleBatchDelete = async () => {
    await withBatchLock(async () => {
      const res = await runBatch(selection.selectedKeys, (id: string) => assetsApi.remove(Number(id)));
      reportBatchResult('批量删除', res);
      setBatchDeleteOpen(false);
      selection.clear();
      table.refresh();
    });
  };

  const columns: Column<Record<string, any>>[] = useMemo(() => [
    { key: 'asset_no', title: '资产编号', width: '110px', sortable: true, render: (r) => r.asset_no || '-' },
    { key: 'asset_name', title: '资产名称', width: '170px', render: (r) => <span className="font-medium">{r.asset_name || '-'}</span> },
    { key: 'category', title: '类别', width: '110px', render: (r) => r.category || '-' },
    { key: 'spec', title: '规格型号', width: '150px', render: (r) => r.spec || '-' },
    { key: 'amount', title: '金额', width: '120px', align: 'right', sortable: true, render: (r) => <span className="font-medium tabular-nums">{formatAmount(r.amount)}</span> },
    { key: 'department', title: '使用部门', width: '120px', render: (r) => r.department || '-' },
    { key: 'user_name', title: '使用人', width: '90px', render: (r) => r.user_name || '-' },
    { key: 'status', title: '状态', width: '100px', render: (r) => <StatusBadge status={ASSET_STATUS_MAP[r.status] || r.status} variant={ASSET_STATUS_VARIANT[r.status] || 'default'} /> },
    { key: 'purchase_date', title: '购入日期', width: '120px', render: (r) => <span className="tabular-nums text-sm">{formatDate(r.purchase_date)}</span> },
  ], []);

  const handleSave = async (values: Record<string, unknown>) => {
    const data = { ...values, amount: Number(values.amount) || 0 };
    try {
      if (editRecord) {
        const res = await assetsApi.update(editRecord.id, data);
        if (res.code === 0) { toast.success('资产信息已更新'); table.refresh(); return true; }
        toast.error(res.message || '保存失败'); return false;
      }
      const res = await assetsApi.create({ ...data, asset_no: `ZC${Date.now().toString().slice(-5)}` });
      if (res.code === 0) { toast.success('资产登记成功'); table.refresh(); return true; }
      toast.error(res.message || '创建失败'); return false;
    } catch (e) { toast.error(extractErrorMessage(e)); return false; }
  };

  const handleDelete = async () => {
    await withDeleteLock(async () => {
      if (!deleteId) return;
      const id = validateRecordId({ id: deleteId });
      if (!id) { toast.warning('记录标识缺失，请刷新后重试'); setDeleteId(null); return; }
      try {
        const res = await assetsApi.remove(deleteId);
        if (res.code === 0) { toast.success('删除成功'); setDeleteId(null); table.refresh(); }
        else toast.error(res.message || '删除失败');
      } catch (e) { toast.error(extractErrorMessage(e)); }
    });
  };

  const primaryActions: ActionButton[] = [
    { label: '新增资产', primary: true, icon: <Plus className="size-3.5" />, onClick: () => { setEditRecord(null); setFormOpen(true); } },
    { label: '盘点', onClick: () => navigate('/admin/inventory-check') },
  ];

  const rowActions = (record: Record<string, any>): ActionButton[] => [
    { label: '编辑', onClick: () => { setEditRecord(record as Asset); setFormOpen(true); } },
    { label: '删除', variant: 'destructive', icon: <Trash2 className="size-3.5" />, onClick: () => setDeleteId(record.id) },
  ];

  return (
    <>
      <ServerListPage
        title={t('资产管理')} description={t('管理公司固定资产')}
        data={table.data} total={table.total} loading={table.loading}
        columns={columns} filters={ASSET_FILTERS}
        primaryActions={primaryActions} rowActions={rowActions}
        page={table.page} pageSize={table.pageSize}
        onPageChange={table.setPage} onPageSizeChange={table.setPageSize}
        onSearch={table.setFilters} onReset={table.handleReset} onSort={table.handleSort}
        sortBy={table.sortBy} sortOrder={table.sortOrder} onRefresh={table.refresh}
        actionsRight={
          <ExportButton
            exporting={exporting}
            onExport={(format) => exportAs(format, columns, table.filters, table.sortBy, table.sortOrder)}
          />
        }
        selectedKeys={selection.selectedKeys}
        onSelectedChange={selection.setKeys}
        batchActions={batchActions}
      />
      <BatchDeleteDialog
        open={batchDeleteOpen} count={selection.selectedCount} loading={batchLocked}
        onOpenChange={setBatchDeleteOpen} onConfirm={handleBatchDelete}
      />
      <FieldFormDialog
        key={editRecord ? `edit-${editRecord.id}` : 'create'}
        open={formOpen} onOpenChange={setFormOpen}
        title={editRecord ? `编辑资产：${editRecord.asset_name}` : '新增资产'}
        description={t('录入资产信息，带 * 为必填项')}
        fields={ASSET_FORM} submitLabel={editRecord ? '保存修改' : '确认登记'}
        onSubmit={handleSave} initialValues={editRecord}
      />
      <AlertDialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除该资产？</AlertDialogTitle>
            <AlertDialogDescription>删除后资产记录将不可恢复，请谨慎操作。</AlertDialogDescription>
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

// ==================== 库存管理 ====================
const INV_CATEGORY_OPTS = [
  { label: '办公耗材', value: '办公耗材' },
  { label: '拍摄物资', value: '拍摄物资' },
  { label: '礼品物资', value: '礼品物资' },
  { label: '其他', value: '其他' },
];

const INV_FILTERS: FilterField[] = [
  { key: 'keyword', label: '物资名称', type: 'input', placeholder: '搜索物资名称' },
  { key: 'category', label: '分类', type: 'select', options: INV_CATEGORY_OPTS },
];

const INV_FORM: FormFieldDef[] = [
  { key: 'material_name', label: '物资名称', required: true, placeholder: '如 A4打印纸' },
  { key: 'category', label: '分类', type: 'select', required: true, options: INV_CATEGORY_OPTS, defaultValue: '办公耗材' },
  { key: 'unit', label: '单位', required: true, placeholder: '如 箱/盒/个' },
  { key: 'stock_quantity', label: '库存数量', required: true, placeholder: '请输入数量' },
  { key: 'warning_quantity', label: '预警阈值', required: true, placeholder: '低于该数量触发预警' },
  { key: 'location', label: '存放位置', placeholder: '如 仓库 A 区' },
  { key: 'remark', label: '备注', placeholder: '可选' },
];

export function InventoryPage() {
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<Inventory | null>(null);
  const { withLock: withDeleteLock, locked: deleteLocked } = useActionLock();
  const { withLock: withOpLock, locked: opLocked } = useActionLock();
  const [warningOpen, setWarningOpen] = useState(false);

  const table = useServerList({ fetchFn: inventoriesApi.list, defaultPageSize: 20 });
  const { exporting, exportAs } = useExport({ fetchFn: inventoriesApi.list, filename: '库存管理' });
  const selection = useBatchSelection();
  const { withLock: withBatchLock, locked: batchLocked } = useActionLock();
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);

  const batchActions: ActionButton[] = [
    { label: '批量删除', variant: 'destructive', icon: <Trash2 className="size-3.5" />, disabled: batchLocked, onClick: () => setBatchDeleteOpen(true) },
  ];

  const handleBatchDelete = async () => {
    await withBatchLock(async () => {
      const res = await runBatch(selection.selectedKeys, (id: string) => inventoriesApi.remove(Number(id)));
      reportBatchResult('批量删除', res);
      setBatchDeleteOpen(false);
      selection.clear();
      table.refresh();
    });
  };

  const warningList = useMemo(
    () => (table.data as Inventory[]).filter((r) => r.stock_quantity < r.warning_quantity),
    [table.data]
  );

  const columns: Column<Record<string, any>>[] = useMemo(() => [
    { key: 'material_name', title: '物资名称', width: '170px', render: (r) => <span className="font-medium">{r.material_name || '-'}</span> },
    { key: 'category', title: '分类', width: '110px', render: (r) => r.category || '-' },
    { key: 'unit', title: '单位', width: '70px', render: (r) => r.unit || '-' },
    {
      key: 'stock_quantity', title: '库存数量', width: '110px', align: 'right', sortable: true,
      render: (r) => (
        <span className={`tabular-nums ${r.stock_quantity < r.warning_quantity ? 'font-semibold text-destructive' : ''}`}>
          {r.stock_quantity}
        </span>
      ),
    },
    { key: 'warning_quantity', title: '预警阈值', width: '100px', align: 'right', render: (r) => <span className="tabular-nums">{r.warning_quantity}</span> },
    { key: 'location', title: '存放位置', width: '140px', render: (r) => r.location || '-' },
    {
      key: 'warning_status', title: '库存状态', width: '100px',
      render: (r) => r.stock_quantity < r.warning_quantity
        ? <StatusBadge status="库存不足" variant="danger" />
        : <StatusBadge status="正常" variant="success" />,
    },
    { key: 'remark', title: '备注', width: '150px', render: (r) => r.remark || '-' },
  ], []);

  const handleSave = async (values: Record<string, unknown>) => {
    const data = {
      ...values,
      stock_quantity: Number(values.stock_quantity) || 0,
      warning_quantity: Number(values.warning_quantity) || 0,
    };
    try {
      if (editRecord) {
        const res = await inventoriesApi.update(editRecord.id, data);
        if (res.code === 0) { toast.success('物资信息已更新'); table.refresh(); return true; }
        toast.error(res.message || '保存失败'); return false;
      }
      const res = await inventoriesApi.create(data);
      if (res.code === 0) { toast.success('物资新增成功'); table.refresh(); return true; }
      toast.error(res.message || '创建失败'); return false;
    } catch (e) { toast.error(extractErrorMessage(e)); return false; }
  };

  const handleDelete = async () => {
    await withDeleteLock(async () => {
      if (!deleteId) return;
      const id = validateRecordId({ id: deleteId });
      if (!id) { toast.warning('记录标识缺失，请刷新后重试'); setDeleteId(null); return; }
      try {
        const res = await inventoriesApi.remove(deleteId);
        if (res.code === 0) { toast.success('删除成功'); setDeleteId(null); table.refresh(); }
        else toast.error(res.message || '删除失败');
      } catch (e) { toast.error(extractErrorMessage(e)); }
    });
  };

  const handleSendWarning = () => {
    if (warningList.length === 0) {
      toast.success('当前库存均正常，无需预警');
      return;
    }
    setWarningOpen(true);
  };

  const primaryActions: ActionButton[] = [
    { label: '新增物资', primary: true, icon: <Plus className="size-3.5" />, onClick: () => { setEditRecord(null); setFormOpen(true); } },
    { label: '预警提醒', icon: <AlertTriangle className="size-3.5" />, onClick: handleSendWarning },
  ];

  const rowActions = (record: Record<string, any>): ActionButton[] => [
    { label: '编辑', onClick: () => { setEditRecord(record as Inventory); setFormOpen(true); } },
    { label: '删除', variant: 'destructive', icon: <Trash2 className="size-3.5" />, onClick: () => setDeleteId(record.id) },
  ];

  return (
    <>
      <ServerListPage
        title={t('库存管理')} description={t('管理物资库存，低于预警阈值自动标红')}
        data={table.data} total={table.total} loading={table.loading}
        columns={columns} filters={INV_FILTERS}
        primaryActions={primaryActions} rowActions={rowActions}
        page={table.page} pageSize={table.pageSize}
        onPageChange={table.setPage} onPageSizeChange={table.setPageSize}
        onSearch={table.setFilters} onReset={table.handleReset} onSort={table.handleSort}
        sortBy={table.sortBy} sortOrder={table.sortOrder} onRefresh={table.refresh}
        actionsRight={
          <ExportButton
            exporting={exporting}
            onExport={(format) => exportAs(format, columns, table.filters, table.sortBy, table.sortOrder)}
          />
        }
        selectedKeys={selection.selectedKeys}
        onSelectedChange={selection.setKeys}
        batchActions={batchActions}
      />
      <BatchDeleteDialog
        open={batchDeleteOpen} count={selection.selectedCount} loading={batchLocked}
        onOpenChange={setBatchDeleteOpen} onConfirm={handleBatchDelete}
      />
      <FieldFormDialog
        key={editRecord ? `edit-${editRecord.id}` : 'create'}
        open={formOpen} onOpenChange={setFormOpen}
        title={editRecord ? `编辑物资：${editRecord.material_name}` : '新增物资'}
        description={t('录入物资信息，带 * 为必填项')}
        fields={INV_FORM} submitLabel={editRecord ? '保存修改' : '确认新增'}
        onSubmit={handleSave} initialValues={editRecord}
      />
      <AlertDialog open={warningOpen} onOpenChange={setWarningOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>库存不足物资</AlertDialogTitle>
            <AlertDialogDescription>以下物资库存低于预警阈值，已提醒行政负责人补货。</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-2">
            {warningList.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                <span className="font-medium">{r.material_name}</span>
                <span className="tabular-nums text-muted-foreground">{r.stock_quantity} / 预警 {r.warning_quantity}</span>
              </div>
            ))}
            {warningList.length === 0 && <div className="text-sm text-muted-foreground">当前库存均正常</div>}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setWarningOpen(false)}>取消</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              setWarningOpen(false);
              toast.success(`预警已发送：${warningList.length} 项物资低于预警阈值，已通知行政负责人补货`);
            }}>发送预警</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除该物资？</AlertDialogTitle>
            <AlertDialogDescription>删除后物资记录将不可恢复，请谨慎操作。</AlertDialogDescription>
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

// ==================== 入库管理 ====================
const STOCK_IN_FILTERS: FilterField[] = [
  { key: 'keyword', label: '入库单号/物资', type: 'input', placeholder: '搜索入库单号/物资名称' },
  { key: 'in_date_start', label: '入库开始日期', type: 'input', placeholder: '如 2026-08-01' },
];

const STOCK_IN_FORM: FormFieldDef[] = [
  { key: 'material_name', label: '物资名称', required: true, placeholder: '如 A4打印纸' },
  { key: 'category', label: '分类', type: 'select', required: true, options: INV_CATEGORY_OPTS, defaultValue: '办公耗材' },
  { key: 'quantity', label: '入库数量', required: true, placeholder: '请输入数量' },
  { key: 'unit_price', label: '单价（元）', required: true, placeholder: '请输入单价' },
  { key: 'supplier', label: '供应商', required: true, placeholder: '如 震坤行' },
  { key: 'in_date', label: '入库日期', type: 'date', required: true },
  { key: 'operator_name', label: '经办人', required: true, placeholder: '请输入经办人姓名' },
];

export function StockInPage() {
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<Record<string, any> | null>(null);
  const { withLock: withDeleteLock, locked: deleteLocked } = useActionLock();
  const { withLock: withOpLock, locked: opLocked } = useActionLock();

  const table = useServerList({ fetchFn: stockInsApi.list, defaultPageSize: 20 });
  const { exporting, exportAs } = useExport({ fetchFn: stockInsApi.list, filename: '入库管理' });
  const selection = useBatchSelection();
  const { withLock: withBatchLock, locked: batchLocked } = useActionLock();
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);

  const batchActions: ActionButton[] = [
    { label: '批量删除', variant: 'destructive', icon: <Trash2 className="size-3.5" />, disabled: batchLocked, onClick: () => setBatchDeleteOpen(true) },
  ];

  const handleBatchDelete = async () => {
    await withBatchLock(async () => {
      const res = await runBatch(selection.selectedKeys, (id: string) => stockInsApi.remove(Number(id)));
      reportBatchResult('批量删除', res);
      setBatchDeleteOpen(false);
      selection.clear();
      table.refresh();
    });
  };

  const columns: Column<Record<string, any>>[] = useMemo(() => [
    { key: 'stock_in_no', title: '入库单号', width: '120px', sortable: true, render: (r) => r.stock_in_no || '-' },
    { key: 'material_name', title: '物资名称', width: '170px', render: (r) => <span className="font-medium">{r.material_name || '-'}</span> },
    { key: 'category', title: '分类', width: '110px', render: (r) => r.category || '-' },
    { key: 'quantity', title: '入库数量', width: '110px', align: 'right', sortable: true, render: (r) => <span className="tabular-nums">{r.quantity}</span> },
    { key: 'unit_price', title: '单价', width: '110px', align: 'right', render: (r) => <span className="tabular-nums">{formatAmount(r.unit_price)}</span> },
    { key: 'total_amount', title: '总金额', width: '130px', align: 'right', sortable: true, render: (r) => <span className="font-medium tabular-nums">{formatAmount(r.total_amount)}</span> },
    { key: 'supplier', title: '供应商', width: '150px', render: (r) => r.supplier || '-' },
    { key: 'in_date', title: '入库日期', width: '120px', render: (r) => <span className="tabular-nums text-sm">{formatDate(r.in_date) || '-'}</span> },
    { key: 'operator_name', title: '经办人', width: '90px', render: (r) => r.operator_name || '-' },
  ], []);

  const handleSave = async (values: Record<string, unknown>) => {
    const quantity = Number(values.quantity) || 0;
    const unitPrice = Number(values.unit_price) || 0;
    const data = {
      ...values,
      quantity,
      unit_price: unitPrice,
      total_amount: Number((quantity * unitPrice).toFixed(2)),
    };
    try {
      if (editRecord) {
        const res = await stockInsApi.update(editRecord.id, data);
        if (res.code === 0) { toast.success('入库记录已更新'); table.refresh(); return true; }
        toast.error(res.message || '保存失败'); return false;
      }
      const res = await stockInsApi.create({ ...data, stock_in_no: `RK${Date.now().toString().slice(-5)}` });
      if (res.code === 0) { toast.success('入库登记成功'); table.refresh(); return true; }
      toast.error(res.message || '创建失败'); return false;
    } catch (e) { toast.error(extractErrorMessage(e)); return false; }
  };

  const handleDelete = async () => {
    await withDeleteLock(async () => {
      if (!deleteId) return;
      const id = validateRecordId({ id: deleteId });
      if (!id) { toast.warning('记录标识缺失，请刷新后重试'); setDeleteId(null); return; }
      try {
        const res = await stockInsApi.remove(deleteId);
        if (res.code === 0) { toast.success('删除成功'); setDeleteId(null); table.refresh(); }
        else toast.error(res.message || '删除失败');
      } catch (e) { toast.error(extractErrorMessage(e)); }
    });
  };

  const primaryActions: ActionButton[] = [
    { label: '登记入库', primary: true, icon: <Plus className="size-3.5" />, onClick: () => { setEditRecord(null); setFormOpen(true); } },
  ];

  const rowActions = (record: Record<string, any>): ActionButton[] => [
    { label: '编辑', onClick: () => { setEditRecord(record); setFormOpen(true); } },
    { label: '删除', variant: 'destructive', icon: <Trash2 className="size-3.5" />, onClick: () => setDeleteId(record.id) },
  ];

  return (
    <>
      <ServerListPage
        title={t('入库管理')} description={t('管理物资入库记录')}
        data={table.data} total={table.total} loading={table.loading}
        columns={columns} filters={STOCK_IN_FILTERS}
        primaryActions={primaryActions} rowActions={rowActions}
        page={table.page} pageSize={table.pageSize}
        onPageChange={table.setPage} onPageSizeChange={table.setPageSize}
        onSearch={table.setFilters} onReset={table.handleReset} onSort={table.handleSort}
        sortBy={table.sortBy} sortOrder={table.sortOrder} onRefresh={table.refresh}
        actionsRight={
          <ExportButton
            exporting={exporting}
            onExport={(format) => exportAs(format, columns, table.filters, table.sortBy, table.sortOrder)}
          />
        }
        selectedKeys={selection.selectedKeys}
        onSelectedChange={selection.setKeys}
        batchActions={batchActions}
      />
      <BatchDeleteDialog
        open={batchDeleteOpen} count={selection.selectedCount} loading={batchLocked}
        onOpenChange={setBatchDeleteOpen} onConfirm={handleBatchDelete}
      />
      <FieldFormDialog
        key={editRecord ? `edit-${editRecord.id}` : 'create'}
        open={formOpen} onOpenChange={setFormOpen}
        title={editRecord ? `编辑入库：${editRecord.stock_in_no || ''}` : t('登记入库')}
        description={t('录入入库信息，带 * 为必填项')}
        fields={STOCK_IN_FORM} submitLabel={editRecord ? '保存修改' : '确认入库'}
        onSubmit={handleSave} initialValues={editRecord}
      />
      <AlertDialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除该入库记录？</AlertDialogTitle>
            <AlertDialogDescription>删除后入库记录将不可恢复，请谨慎操作。</AlertDialogDescription>
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

// ==================== 领用管理 ====================
const REQ_STATUS_OPTS = [
  { label: '待确认', value: 'pending' },
  { label: '已确认', value: 'confirmed' },
  { label: '已驳回', value: 'rejected' },
];
const REQ_STATUS_MAP: Record<string, string> = { pending: '待确认', confirmed: '已确认', rejected: '已驳回' };
const REQ_STATUS_VARIANT: Record<string, 'default' | 'info' | 'success' | 'warning' | 'danger'> = {
  pending: 'warning', confirmed: 'success', rejected: 'danger',
};

const REQ_FILTERS: FilterField[] = [
  { key: 'keyword', label: '单号/物资/领用人', type: 'input', placeholder: '搜索领用单号/物资/领用人' },
  { key: 'status', label: '状态', type: 'select', options: REQ_STATUS_OPTS },
];

const REQ_FORM: FormFieldDef[] = [
  { key: 'material_name', label: '物资名称', required: true, placeholder: '如 A4打印纸' },
  { key: 'quantity', label: '领用数量', required: true, placeholder: '请输入数量' },
  { key: 'applicant_name', label: '领用人', required: true, placeholder: '请输入领用人姓名' },
  { key: 'department', label: '部门', type: 'select', required: true, options: DEPT_OPTS, defaultValue: '商务一部' },
  { key: 'purpose', label: '用途', required: true, placeholder: '请说明领用用途' },
  { key: 'apply_date', label: '申请日期', type: 'date', required: true },
];

export function RequisitionPage() {
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<Record<string, any> | null>(null);
  const { withLock: withDeleteLock, locked: deleteLocked } = useActionLock();
  const { withLock: withOpLock, locked: opLocked } = useActionLock();

  const table = useServerList({ fetchFn: requisitionsApi.list, defaultPageSize: 20 });
  const { exporting, exportAs } = useExport({ fetchFn: requisitionsApi.list, filename: '领用管理' });
  const selection = useBatchSelection();
  const { withLock: withBatchLock, locked: batchLocked } = useActionLock();
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);

  const handleBatchConfirm = async (action: 'confirm' | 'reject') => {
    await withBatchLock(async () => {
      const res = await runBatch(selection.selectedKeys, (id: string) => requisitionsApi.confirm(Number(id), action));
      reportBatchResult(action === 'reject' ? '批量驳回' : '批量确认', res);
      selection.clear();
      table.refresh();
    });
  };

  const handleBatchDelete = async () => {
    await withBatchLock(async () => {
      const res = await runBatch(selection.selectedKeys, (id: string) => requisitionsApi.remove(Number(id)));
      reportBatchResult('批量删除', res);
      setBatchDeleteOpen(false);
      selection.clear();
      table.refresh();
    });
  };

  const batchActions: ActionButton[] = [
    { label: '批量确认', icon: <Check className="size-3.5" />, disabled: batchLocked, onClick: () => handleBatchConfirm('confirm') },
    { label: '批量驳回', variant: 'destructive', icon: <XCircle className="size-3.5" />, disabled: batchLocked, onClick: () => handleBatchConfirm('reject') },
    { label: '批量删除', variant: 'destructive', icon: <Trash2 className="size-3.5" />, disabled: batchLocked, onClick: () => setBatchDeleteOpen(true) },
  ];

  const handleConfirm = async (record: Record<string, any>, action: string) => {
    await withOpLock(async () => {
      const recordId = validateRecordId({ id: record.id });
      if (!recordId) { toast.warning('记录标识缺失，请刷新后重试'); return; }
      try {
        const res = await requisitionsApi.confirm(record.id, action);
        if (res.code === 0) {
          toast.success(action === 'reject' ? '已驳回领用申请' : '领用已确认');
          table.refresh();
        } else toast.error(res.message || '操作失败');
      } catch (e) { toast.error(extractErrorMessage(e)); }
    });
  };

  const columns: Column<Record<string, any>>[] = useMemo(() => [
    { key: 'requisition_no', title: '领用单号', width: '120px', sortable: true, render: (r) => r.requisition_no || '-' },
    { key: 'material_name', title: '物资名称', width: '160px', render: (r) => <span className="font-medium">{r.material_name || '-'}</span> },
    { key: 'quantity', title: '领用数量', width: '100px', align: 'right', render: (r) => <span className="tabular-nums">{r.quantity}</span> },
    { key: 'applicant_name', title: '领用人', width: '90px', render: (r) => r.applicant_name || '-' },
    { key: 'department', title: '部门', width: '120px', render: (r) => r.department || '-' },
    { key: 'purpose', title: '用途', width: '180px', render: (r) => r.purpose || '-' },
    { key: 'apply_date', title: '申请日期', width: '120px', render: (r) => <span className="tabular-nums text-sm">{formatDate(r.apply_date)}</span> },
    { key: 'status', title: '状态', width: '100px', render: (r) => <StatusBadge status={REQ_STATUS_MAP[r.status] || r.status} variant={REQ_STATUS_VARIANT[r.status] || 'default'} /> },
  ], []);

  const handleSave = async (values: Record<string, unknown>) => {
    const data = {
      ...values,
      quantity: Number(values.quantity) || 0,
      ...(editRecord
        ? {}
        : {
            requisition_no: `LY${Date.now().toString().slice(-5)}`,
            status: 'pending',
          }),
    };
    try {
      if (editRecord) {
        const res = await requisitionsApi.update(editRecord.id, data);
        if (res.code === 0) { toast.success('领用记录已更新'); table.refresh(); return true; }
        toast.error(res.message || '保存失败'); return false;
      }
      const res = await requisitionsApi.create(data);
      if (res.code === 0) { toast.success('领用申请已提交'); table.refresh(); return true; }
      toast.error(res.message || '创建失败'); return false;
    } catch (e) { toast.error(extractErrorMessage(e)); return false; }
  };

  const handleDelete = async () => {
    await withDeleteLock(async () => {
      if (!deleteId) return;
      const id = validateRecordId({ id: deleteId });
      if (!id) { toast.warning('记录标识缺失，请刷新后重试'); setDeleteId(null); return; }
      try {
        const res = await requisitionsApi.remove(deleteId);
        if (res.code === 0) { toast.success('删除成功'); setDeleteId(null); table.refresh(); }
        else toast.error(res.message || '删除失败');
      } catch (e) { toast.error(extractErrorMessage(e)); }
    });
  };

  const primaryActions: ActionButton[] = [
    { label: '新建领用', primary: true, icon: <Plus className="size-3.5" />, onClick: () => { setEditRecord(null); setFormOpen(true); } },
  ];

  const rowActions = (record: Record<string, any>): ActionButton[] => {
    const actions: ActionButton[] = [];
    if (record.status === 'pending') {
      actions.push(
        { label: '编辑', onClick: () => { setEditRecord(record); setFormOpen(true); } },
        { label: '确认领用', onClick: () => handleConfirm(record, 'confirm') },
        { label: '驳回', variant: 'destructive', onClick: () => handleConfirm(record, 'reject') },
      );
    }
    actions.push({ label: '删除', variant: 'destructive', icon: <Trash2 className="size-3.5" />, onClick: () => setDeleteId(record.id) });
    return actions;
  };

  return (
    <>
      <ServerListPage
        title={t('领用管理')} description={t('管理物资领用申请与确认')}
        data={table.data} total={table.total} loading={table.loading}
        columns={columns} filters={REQ_FILTERS}
        primaryActions={primaryActions} rowActions={rowActions}
        page={table.page} pageSize={table.pageSize}
        onPageChange={table.setPage} onPageSizeChange={table.setPageSize}
        onSearch={table.setFilters} onReset={table.handleReset} onSort={table.handleSort}
        sortBy={table.sortBy} sortOrder={table.sortOrder} onRefresh={table.refresh}
        actionsRight={
          <ExportButton
            exporting={exporting}
            onExport={(format) => exportAs(format, columns, table.filters, table.sortBy, table.sortOrder)}
          />
        }
        selectedKeys={selection.selectedKeys}
        onSelectedChange={selection.setKeys}
        batchActions={batchActions}
      />
      <BatchDeleteDialog
        open={batchDeleteOpen} count={selection.selectedCount} loading={batchLocked}
        onOpenChange={setBatchDeleteOpen} onConfirm={handleBatchDelete}
      />
      <FieldFormDialog
        key={editRecord ? `edit-${editRecord.id}` : 'create'}
        open={formOpen} onOpenChange={setFormOpen}
        title={editRecord ? `编辑领用：${editRecord.requisition_no || ''}` : t('新建领用申请')}
        description={t('录入领用信息，带 * 为必填项')}
        fields={REQ_FORM} submitLabel={editRecord ? '保存修改' : '提交申请'}
        onSubmit={handleSave} initialValues={editRecord}
      />
      <AlertDialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除该领用记录？</AlertDialogTitle>
            <AlertDialogDescription>删除后领用记录将不可恢复，请谨慎操作。</AlertDialogDescription>
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

// ==================== 归还管理 ====================
const RETURN_STATUS_OPTS = [
  { label: '待确认', value: 'pending' },
  { label: '已确认', value: 'confirmed' },
];
const RETURN_STATUS_MAP: Record<string, string> = { pending: '待确认', confirmed: '已确认' };
const RETURN_CONDITION_OPTS = [
  { label: '完好', value: '完好' },
  { label: '轻微划痕', value: '轻微划痕' },
  { label: '有损坏', value: '有损坏' },
];

const RETURN_FILTERS: FilterField[] = [
  { key: 'keyword', label: '单号/物资/归还人', type: 'input', placeholder: '搜索归还单号/物资/归还人' },
  { key: 'status', label: '状态', type: 'select', options: RETURN_STATUS_OPTS },
];

const RETURN_FORM: FormFieldDef[] = [
  { key: 'material_name', label: '物资名称', required: true, placeholder: '如 拍摄道具箱' },
  { key: 'quantity', label: '归还数量', required: true, placeholder: '请输入数量' },
  { key: 'returner_name', label: '归还人', required: true, placeholder: '请输入归还人姓名' },
  { key: 'department', label: '部门', type: 'select', required: true, options: DEPT_OPTS, defaultValue: '商务一部' },
  { key: 'return_date', label: '归还日期', type: 'date', required: true },
  { key: 'condition', label: '物品状态', type: 'select', required: true, options: RETURN_CONDITION_OPTS, defaultValue: '完好' },
];

export function ReturnPage() {
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<Record<string, any> | null>(null);
  const { withLock: withDeleteLock, locked: deleteLocked } = useActionLock();
  const { withLock: withOpLock, locked: opLocked } = useActionLock();

  const table = useServerList({ fetchFn: returnsApi.list, defaultPageSize: 20 });
  const { exporting, exportAs } = useExport({ fetchFn: returnsApi.list, filename: '归还管理' });
  const selection = useBatchSelection();
  const { withLock: withBatchLock, locked: batchLocked } = useActionLock();
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);

  const handleBatchConfirm = async () => {
    await withBatchLock(async () => {
      const res = await runBatch(selection.selectedKeys, (id: string) => returnsApi.confirm(Number(id)));
      reportBatchResult('批量确认', res);
      selection.clear();
      table.refresh();
    });
  };

  const handleBatchDelete = async () => {
    await withBatchLock(async () => {
      const res = await runBatch(selection.selectedKeys, (id: string) => returnsApi.remove(Number(id)));
      reportBatchResult('批量删除', res);
      setBatchDeleteOpen(false);
      selection.clear();
      table.refresh();
    });
  };

  const batchActions: ActionButton[] = [
    { label: '批量确认', icon: <Check className="size-3.5" />, disabled: batchLocked, onClick: handleBatchConfirm },
    { label: '批量删除', variant: 'destructive', icon: <Trash2 className="size-3.5" />, disabled: batchLocked, onClick: () => setBatchDeleteOpen(true) },
  ];

  const handleConfirm = async (record: Record<string, any>) => {
    await withOpLock(async () => {
      const recordId = validateRecordId({ id: record.id });
      if (!recordId) { toast.warning('记录标识缺失，请刷新后重试'); return; }
      try {
        const res = await returnsApi.confirm(record.id);
        if (res.code === 0) { toast.success('归还已确认入库'); table.refresh(); }
        else toast.error(res.message || '操作失败');
      } catch (e) { toast.error(extractErrorMessage(e)); }
    });
  };

  const columns: Column<Record<string, any>>[] = useMemo(() => [
    { key: 'return_no', title: '归还单号', width: '120px', sortable: true, render: (r) => r.return_no || '-' },
    { key: 'material_name', title: '物资名称', width: '160px', render: (r) => <span className="font-medium">{r.material_name || '-'}</span> },
    { key: 'quantity', title: '归还数量', width: '100px', align: 'right', render: (r) => <span className="tabular-nums">{r.quantity}</span> },
    { key: 'returner_name', title: '归还人', width: '90px', render: (r) => r.returner_name || '-' },
    { key: 'department', title: '部门', width: '120px', render: (r) => r.department || '-' },
    { key: 'return_date', title: '归还日期', width: '120px', render: (r) => <span className="tabular-nums text-sm">{formatDate(r.return_date)}</span> },
    { key: 'condition', title: '物品状态', width: '100px', render: (r) => r.condition || '-' },
    { key: 'status', title: '状态', width: '100px', render: (r) => <StatusBadge status={RETURN_STATUS_MAP[r.status] || r.status} variant={r.status === 'confirmed' ? 'success' : 'warning'} /> },
  ], []);

  const handleSave = async (values: Record<string, unknown>) => {
    const data = {
      ...values,
      quantity: Number(values.quantity) || 0,
      ...(editRecord
        ? {}
        : {
            return_no: `GH${Date.now().toString().slice(-5)}`,
            status: 'pending',
          }),
    };
    try {
      if (editRecord) {
        const res = await returnsApi.update(editRecord.id, data);
        if (res.code === 0) { toast.success('归还记录已更新'); table.refresh(); return true; }
        toast.error(res.message || '保存失败'); return false;
      }
      const res = await returnsApi.create(data);
      if (res.code === 0) { toast.success('归还登记成功，待确认入库'); table.refresh(); return true; }
      toast.error(res.message || '创建失败'); return false;
    } catch (e) { toast.error(extractErrorMessage(e)); return false; }
  };

  const handleDelete = async () => {
    await withDeleteLock(async () => {
      if (!deleteId) return;
      const id = validateRecordId({ id: deleteId });
      if (!id) { toast.warning('记录标识缺失，请刷新后重试'); setDeleteId(null); return; }
      try {
        const res = await returnsApi.remove(deleteId);
        if (res.code === 0) { toast.success('删除成功'); setDeleteId(null); table.refresh(); }
        else toast.error(res.message || '删除失败');
      } catch (e) { toast.error(extractErrorMessage(e)); }
    });
  };

  const primaryActions: ActionButton[] = [
    { label: '登记归还', primary: true, icon: <Plus className="size-3.5" />, onClick: () => { setEditRecord(null); setFormOpen(true); } },
  ];

  const rowActions = (record: Record<string, any>): ActionButton[] => {
    const actions: ActionButton[] = [];
    if (record.status === 'pending') {
      actions.push(
        { label: '编辑', onClick: () => { setEditRecord(record); setFormOpen(true); } },
        { label: '确认归还', onClick: () => handleConfirm(record) },
      );
    }
    actions.push({ label: '删除', variant: 'destructive', icon: <Trash2 className="size-3.5" />, onClick: () => setDeleteId(record.id) });
    return actions;
  };

  return (
    <>
      <ServerListPage
        title={t('归还管理')} description={t('管理物资归还记录')}
        data={table.data} total={table.total} loading={table.loading}
        columns={columns} filters={RETURN_FILTERS}
        primaryActions={primaryActions} rowActions={rowActions}
        page={table.page} pageSize={table.pageSize}
        onPageChange={table.setPage} onPageSizeChange={table.setPageSize}
        onSearch={table.setFilters} onReset={table.handleReset} onSort={table.handleSort}
        sortBy={table.sortBy} sortOrder={table.sortOrder} onRefresh={table.refresh}
        actionsRight={
          <ExportButton
            exporting={exporting}
            onExport={(format) => exportAs(format, columns, table.filters, table.sortBy, table.sortOrder)}
          />
        }
        selectedKeys={selection.selectedKeys}
        onSelectedChange={selection.setKeys}
        batchActions={batchActions}
      />
      <BatchDeleteDialog
        open={batchDeleteOpen} count={selection.selectedCount} loading={batchLocked}
        onOpenChange={setBatchDeleteOpen} onConfirm={handleBatchDelete}
      />
      <FieldFormDialog
        key={editRecord ? `edit-${editRecord.id}` : 'create'}
        open={formOpen} onOpenChange={setFormOpen}
        title={editRecord ? `编辑归还：${editRecord.return_no || ''}` : t('登记归还')}
        description={t('录入归还信息，带 * 为必填项')}
        fields={RETURN_FORM} submitLabel={editRecord ? '保存修改' : '确认登记'}
        onSubmit={handleSave} initialValues={editRecord}
      />
      <AlertDialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除该归还记录？</AlertDialogTitle>
            <AlertDialogDescription>删除后归还记录将不可恢复，请谨慎操作。</AlertDialogDescription>
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

// ==================== 盘点管理 ====================
const CHECK_STATUS_OPTS = [
  { label: '盘点中', value: 'in_progress' },
  { label: '已完成', value: 'completed' },
];
const CHECK_STATUS_MAP: Record<string, string> = { in_progress: '盘点中', completed: '已完成' };

const CHECK_FILTERS: FilterField[] = [
  { key: 'keyword', label: '盘点单号/范围', type: 'input', placeholder: '搜索盘点单号/范围' },
  { key: 'status', label: '状态', type: 'select', options: CHECK_STATUS_OPTS },
];

const CHECK_EDIT_FORM: FormFieldDef[] = [
  { key: 'check_date', label: '盘点日期', type: 'date', required: true },
  { key: 'checker_name', label: '盘点人', required: true, placeholder: '请输入盘点人姓名' },
  { key: 'remark', label: '备注', placeholder: '可选' },
];

export function InventoryCheckPage() {
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailRecord, setDetailRecord] = useState<Record<string, any> | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<Record<string, any> | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const { withLock: withDeleteLock, locked: deleteLocked } = useActionLock();

  const table = useServerList({ fetchFn: inventoryChecksApi.list, defaultPageSize: 20 });
  const { exporting, exportAs } = useExport({ fetchFn: inventoryChecksApi.list, filename: '盘点管理' });
  const selection = useBatchSelection();
  const { withLock: withBatchLock, locked: batchLocked } = useActionLock();
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);

  const batchActions: ActionButton[] = [
    { label: '批量删除', variant: 'destructive', icon: <Trash2 className="size-3.5" />, disabled: batchLocked, onClick: () => setBatchDeleteOpen(true) },
  ];

  const handleBatchDelete = async () => {
    const completed = table.data.filter(
      (r: Record<string, any>) => selection.selectedKeys.includes(String(r.id)) && r.status !== 'in_progress',
    );
    if (completed.length > 0) {
      toast.warning('已完成盘点单不可删除，请先取消勾选');
      setBatchDeleteOpen(false);
      return;
    }
    await withBatchLock(async () => {
      const res = await runBatch(selection.selectedKeys, (id: string) => inventoryChecksApi.remove(Number(id)));
      reportBatchResult('批量删除', res);
      setBatchDeleteOpen(false);
      selection.clear();
      table.refresh();
    });
  };

  const openDetail = (record: Record<string, any>) => {
    setDetailRecord(record);
    setDetailOpen(true);
  };

  const columns: Column<Record<string, any>>[] = useMemo(() => [
    { key: 'check_no', title: '盘点单号', width: '120px', sortable: true, render: (r) => r.check_no || '-' },
    { key: 'check_date', title: '盘点日期', width: '120px', render: (r) => <span className="tabular-nums text-sm">{formatDate(r.check_date)}</span> },
    { key: 'check_range', title: '盘点范围', width: '150px', render: (r) => <span className="font-medium">{r.check_range}</span> },
    { key: 'checker_name', title: '盘点人', width: '90px', render: (r) => r.checker_name || '-' },
    { key: 'system_count', title: '系统数量', width: '100px', align: 'right', render: (r) => <span className="tabular-nums">{r.system_count}</span> },
    { key: 'actual_count', title: '实盘数量', width: '100px', align: 'right', render: (r) => <span className="tabular-nums">{r.actual_count}</span> },
    {
      key: 'diff_count', title: '差异数量', width: '100px', align: 'right', sortable: true,
      render: (r) => (
        <span className={`tabular-nums ${Number(r.diff_count) !== 0 ? 'font-semibold text-destructive' : 'text-muted-foreground'}`}>
          {r.diff_count}
        </span>
      ),
    },
    { key: 'gain_count', title: '盘盈项数', width: '90px', align: 'right', render: (r) => <span className="tabular-nums text-red-600">{Number(r.gain_count) || 0}</span> },
    { key: 'loss_count', title: '盘亏项数', width: '90px', align: 'right', render: (r) => <span className="tabular-nums text-amber-600">{Number(r.loss_count) || 0}</span> },
    { key: 'status', title: '状态', width: '100px', render: (r) => <StatusBadge status={CHECK_STATUS_MAP[r.status] || r.status} variant={r.status === 'completed' ? 'success' : 'warning'} /> },
    { key: 'remark', title: '备注', width: '180px', render: (r) => r.remark || '-' },
    {
      key: 'created_at', title: '创建时间', width: '170px', sortable: true,
      render: (r) => <span className="text-muted-foreground tabular-nums text-sm">{formatDateTime(r.created_at)}</span>,
    },
  ], []);

  const handleSave = async (values: Record<string, unknown>) => {
    if (!editRecord) return false;
    try {
      const res = await inventoryChecksApi.update(editRecord.id, values);
      if (res.code === 0) { toast.success('盘点记录已更新'); table.refresh(); return true; }
      toast.error(res.message || '保存失败'); return false;
    } catch (e) { toast.error(extractErrorMessage(e)); return false; }
  };

  const handleDelete = async () => {
    await withDeleteLock(async () => {
      if (!deleteId) return;
      const id = validateRecordId({ id: deleteId });
      if (!id) { toast.warning('记录标识缺失，请刷新后重试'); setDeleteId(null); return; }
      try {
        const res = await inventoryChecksApi.remove(deleteId);
        if (res.code === 0) { toast.success('删除成功'); setDeleteId(null); table.refresh(); }
        else toast.error(res.message || '删除失败');
      } catch (e) { toast.error(extractErrorMessage(e)); }
    });
  };

  const primaryActions: ActionButton[] = [
    { label: '发起盘点', primary: true, icon: <Plus className="size-3.5" />, onClick: () => setCreateOpen(true) },
  ];

  const rowActions = (record: Record<string, any>): ActionButton[] => {
    if (record.status === 'in_progress') {
      return [
        { label: '录入明细', primary: true, icon: <ClipboardList className="size-3.5" />, onClick: () => openDetail(record) },
        { label: '编辑', onClick: () => { setEditRecord(record); setFormOpen(true); } },
        { label: '删除', variant: 'destructive', icon: <Trash2 className="size-3.5" />, onClick: () => setDeleteId(record.id) },
      ];
    }
    return [{ label: '查看详情', icon: <ClipboardList className="size-3.5" />, onClick: () => openDetail(record) }];
  };

  return (
    <>
      <ServerListPage
        title={t('盘点管理')} description={t('发起库存盘点并核对账实差异')}
        data={table.data} total={table.total} loading={table.loading}
        columns={columns} filters={CHECK_FILTERS}
        primaryActions={primaryActions} rowActions={rowActions}
        page={table.page} pageSize={table.pageSize}
        onPageChange={table.setPage} onPageSizeChange={table.setPageSize}
        onSearch={table.setFilters} onReset={table.handleReset} onSort={table.handleSort}
        sortBy={table.sortBy} sortOrder={table.sortOrder} onRefresh={table.refresh}
        actionsRight={
          <ExportButton
            exporting={exporting}
            onExport={(format) => exportAs(format, columns, table.filters, table.sortBy, table.sortOrder)}
          />
        }
        selectedKeys={selection.selectedKeys}
        onSelectedChange={selection.setKeys}
        batchActions={batchActions}
      />
      <BatchDeleteDialog
        open={batchDeleteOpen} count={selection.selectedCount} loading={batchLocked}
        onOpenChange={setBatchDeleteOpen} onConfirm={handleBatchDelete}
      />
      <FieldFormDialog
        key={editRecord ? `edit-${editRecord.id}` : 'create'}
        open={formOpen} onOpenChange={setFormOpen}
        title={`编辑盘点：${editRecord?.check_no || ''}`}
        description={t('可修改盘点日期、盘点人与备注，盘点范围创建后不可变更')}
        fields={CHECK_EDIT_FORM} submitLabel="保存修改"
        onSubmit={handleSave} initialValues={editRecord}
      />
      <InventoryCheckCreateDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={table.refresh} />
      <InventoryCheckDetailDialog
        record={detailRecord} open={detailOpen}
        onOpenChange={setDetailOpen} onSaved={table.refresh}
      />
      <AlertDialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除该盘点记录？</AlertDialogTitle>
            <AlertDialogDescription>删除后盘点记录将不可恢复，请谨慎操作。</AlertDialogDescription>
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
