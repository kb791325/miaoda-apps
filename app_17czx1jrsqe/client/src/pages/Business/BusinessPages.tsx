import { useMemo, useState } from 'react';
import { t } from '@/lib/i18n';
import { Plus, Trash2, TrendingUp, TrendingDown, FileDown, Upload, Download, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import ServerListPage, { type FilterField as ServerFilterField, type Column } from '@/components/ServerListPage';
import FieldFormDialog, { type FormFieldDef } from '@/components/FieldFormDialog';
import StatusBadge from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
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
import { formatDateTime, formatAmount } from '@/lib/format';
import { industryRoisApi, competitorsApi } from '@/api';
import { INDUSTRY_ROI_IMPORT_SCHEMA, downloadImportTemplate } from '@/api/import-schemas';
import { EXPORT_SCHEMAS, runExport } from '@/api/export-schemas';
import { extractErrorMessage } from '@/lib/error-utils';
import BatchImportDialog from '@/components/BatchImportDialog';
import IndustryRoiBatchFixDialog from './IndustryRoiBatchFixDialog';
import { useServerList } from '@/hooks/useServerList';
import { cn } from '@/lib/utils';

const PLATFORM_OPTS = [
  { label: '巨量千川', value: '巨量千川' },
  { label: '腾讯广告', value: '腾讯广告' },
  { label: '磁力引擎', value: '磁力引擎' },
  { label: '小红书', value: '小红书' },
];

// ==================== 行业ROI管理 ====================
const ROI_FILTERS: ServerFilterField[] = [
  { key: 'keyword', label: '行业名称', type: 'input', placeholder: '搜索行业名称' },
  { key: 'platform', label: '平台', type: 'select', options: PLATFORM_OPTS },
];

const ROI_FORM: FormFieldDef[] = [
  { key: 'industry_name', label: '行业名称', required: true, placeholder: '如 美妆个护' },
  { key: 'platform', label: '平台', type: 'select', required: true, options: PLATFORM_OPTS, defaultValue: '巨量千川' },
  { key: 'roi_base', label: 'ROI基准值', required: true, placeholder: '如 1.85' },
  { key: 'avg_cpc', label: '平均CPC（元）', required: true, placeholder: '如 0.85' },
  { key: 'avg_cvr', label: '平均转化率（%）', required: true, placeholder: '如 3.2' },
];

export function IndustryRoiPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<Record<string, any> | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Record<string, any> | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [importOpen, setImportOpen] = useState(false);
  const [fixOpen, setFixOpen] = useState(false);
  const table = useServerList({ fetchFn: industryRoisApi.list, defaultPageSize: 20 });

  const selectedRecords = useMemo(
    () => table.data.filter((r: Record<string, any>) => selectedKeys.includes(String(r.id))),
    [table.data, selectedKeys],
  );

  const handleDownloadTemplate = () => {
    downloadImportTemplate(INDUSTRY_ROI_IMPORT_SCHEMA, 'xlsx');
    toast.success('导入模板已下载');
  };

  const handleExportAll = async () => {
    try {
      const count = await runExport(EXPORT_SCHEMAS.industryRois, 'csv');
      toast.success(`已导出 ${count} 条行业ROI数据（CSV）`);
    } catch (e) {
      toast.error(extractErrorMessage(e));
    }
  };

  const handleImported = () => {
    setSelectedKeys([]);
    table.refresh();
  };

  const handleFixDone = () => {
    setSelectedKeys([]);
    table.refresh();
  };

  const columns: Column<Record<string, any>>[] = useMemo(() => [
    { key: 'industry_name', title: '行业名称', width: '150px', render: (r) => <span className="font-medium">{r.industry_name}</span> },
    { key: 'platform', title: '平台', width: '120px', dataIndex: 'platform' as any },
    { key: 'roi_base', title: 'ROI基准值', width: '120px', align: 'right', sortable: true, render: (r) => <span className="font-semibold tabular-nums">{Number(r.roi_base).toFixed(2)}</span> },
    { key: 'avg_cpc', title: '平均CPC', width: '110px', align: 'right', render: (r) => <span className="tabular-nums">¥{Number(r.avg_cpc).toFixed(2)}</span> },
    { key: 'avg_cvr', title: '平均转化率', width: '120px', align: 'right', render: (r) => <span className="tabular-nums">{Number(r.avg_cvr).toFixed(2)}%</span> },
    { key: 'updated_at', title: '更新时间', width: '170px', render: (r) => <span className="tabular-nums text-sm text-muted-foreground">{formatDateTime(r.updated_at)}</span> },
  ], []);

  const handleSave = async (values: Record<string, unknown>) => {
    const data = {
      ...values,
      roi_base: Number(values.roi_base) || 0,
      avg_cpc: Number(values.avg_cpc) || 0,
      avg_cvr: Number(values.avg_cvr) || 0,
    };
    try {
      if (editRecord) {
        const res = await industryRoisApi.update(editRecord.id, data);
        if (res.code === 0) { toast.success('ROI数据已更新'); table.refresh(); return true; }
        toast.error(res.message || '保存失败'); return false;
      }
      const res = await industryRoisApi.create(data);
      if (res.code === 0) { toast.success('ROI基准已新增'); table.refresh(); return true; }
      toast.error(res.message || '创建失败'); return false;
    } catch { toast.error('保存失败'); return false; }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await industryRoisApi.remove(deleteTarget.id);
      if (res.code === 0) { toast.success('删除成功'); table.refresh(); }
      else toast.error(res.message || '删除失败');
    } catch { toast.error('删除失败'); }
    finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  return (
    <>
      <ServerListPage
        title={t('行业ROI管理')} description={t('管理各行业投放ROI基准数据')}
        data={table.data} total={table.total} loading={table.loading}
        columns={columns} filters={ROI_FILTERS}
        primaryActions={[
          { label: '新增基准', primary: true, icon: <Plus className="size-3.5" />, onClick: () => { setEditRecord(null); setFormOpen(true); } },
          { label: '下载模板', icon: <FileDown className="size-3.5" />, onClick: handleDownloadTemplate },
          { label: '批量导入', icon: <Upload className="size-3.5" />, onClick: () => setImportOpen(true) },
          { label: '批量导出', icon: <Download className="size-3.5" />, onClick: handleExportAll },
        ]}
        batchActions={[
          { label: '批量修正', icon: <Wand2 className="size-3.5" />, onClick: () => setFixOpen(true) },
        ]}
        selectedKeys={selectedKeys} onSelectedChange={setSelectedKeys}
        exportable={false}
        rowActions={(r) => [
          { label: '编辑', onClick: () => { setEditRecord(r); setFormOpen(true); } },
          { label: '删除', variant: 'destructive', icon: <Trash2 className="size-3.5" />, onClick: () => setDeleteTarget(r) },
        ]}
        page={table.page} pageSize={table.pageSize}
        onPageChange={table.setPage} onPageSizeChange={table.setPageSize}
        onSearch={table.setFilters} onReset={table.handleReset} onSort={table.handleSort}
        sortBy={table.sortBy} sortOrder={table.sortOrder} onRefresh={table.refresh}
      />
      <FieldFormDialog
        key={editRecord ? `edit-${editRecord.id}` : 'create'}
        open={formOpen} onOpenChange={setFormOpen}
        title={editRecord ? `编辑ROI：${editRecord.industry_name}` : '新增ROI基准'}
        description={t('维护行业ROI基准，带 * 为必填项')}
        fields={ROI_FORM} submitLabel={editRecord ? '保存修改' : '确认新增'}
        onSubmit={handleSave} initialValues={editRecord}
      />
      <BatchImportDialog
        open={importOpen} onOpenChange={setImportOpen}
        importType={INDUSTRY_ROI_IMPORT_SCHEMA.type}
        onImported={handleImported}
      />
      <IndustryRoiBatchFixDialog
        open={fixOpen} onOpenChange={setFixOpen}
        records={selectedRecords} onDone={handleFixDone}
      />
      <AlertDialog open={deleteTarget !== null} onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除ROI基准</AlertDialogTitle>
            <AlertDialogDescription>
              将删除「{deleteTarget?.industry_name}」（{deleteTarget?.platform}）的ROI基准数据，该操作不可恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>取消</AlertDialogCancel>
            <AlertDialogAction disabled={deleting} onClick={(e) => { e.preventDefault(); handleDelete(); }}>
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ==================== 竞品监控 ====================
const COMP_FILTERS: ServerFilterField[] = [
  { key: 'keyword', label: '竞品名称', type: 'input', placeholder: '搜索竞品名称/行业' },
  { key: 'platform', label: '投放平台', type: 'select', options: PLATFORM_OPTS },
  { key: 'monitor_status', label: '监控状态', type: 'select', options: [
    { label: '监控中', value: 'monitoring' },
    { label: '已暂停', value: 'paused' },
  ] },
];

const COMP_FORM: FormFieldDef[] = [
  { key: 'competitor_name', label: '竞品名称', required: true, placeholder: '请输入竞品名称' },
  { key: 'industry', label: '所属行业', required: true, placeholder: '如 美妆个护' },
  { key: 'platform', label: '投放平台', type: 'select', required: true, options: PLATFORM_OPTS, defaultValue: '巨量千川' },
  { key: 'estimated_cost', label: '预估消耗（元）', required: true, placeholder: '如 520000' },
  { key: 'mom_change', label: '环比变化（%）', placeholder: '如 12.5' },
  { key: 'monitor_status', label: '监控状态', type: 'select', required: true, options: [
    { label: '监控中', value: 'monitoring' },
    { label: '已暂停', value: 'paused' },
  ], defaultValue: 'monitoring' },
];

export function CompetitorPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<Record<string, any> | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Record<string, any> | null>(null);
  const [deleting, setDeleting] = useState(false);
  const table = useServerList({ fetchFn: competitorsApi.list, defaultPageSize: 20 });

  const columns: Column<Record<string, any>>[] = useMemo(() => [
    { key: 'competitor_name', title: '竞品名称', width: '180px', render: (r) => <span className="font-medium">{r.competitor_name}</span> },
    { key: 'industry', title: '所属行业', width: '120px', dataIndex: 'industry' as any },
    { key: 'platform', title: '投放平台', width: '120px', dataIndex: 'platform' as any },
    { key: 'estimated_cost', title: '预估消耗', width: '140px', align: 'right', sortable: true, render: (r) => <span className="font-medium tabular-nums">{formatAmount(r.estimated_cost)}</span> },
    { key: 'mom_change', title: '环比变化', width: '120px', align: 'right', render: (r) => {
      const v = Number(r.mom_change);
      return (
        <span className={cn('inline-flex items-center gap-1 font-medium tabular-nums', v >= 0 ? 'text-emerald-600' : 'text-red-500')}>
          {v >= 0 ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
          {v >= 0 ? '+' : ''}{v.toFixed(1)}%
        </span>
      );
    } },
    { key: 'monitor_status', title: '监控状态', width: '100px', render: (r) => <StatusBadge status={r.monitor_status === 'monitoring' ? '监控中' : '已暂停'} variant={r.monitor_status === 'monitoring' ? 'success' : 'default'} /> },
    { key: 'updated_at', title: '更新时间', width: '170px', render: (r) => <span className="tabular-nums text-sm text-muted-foreground">{formatDateTime(r.updated_at)}</span> },
  ], []);

  const handleSave = async (values: Record<string, unknown>) => {
    const data = {
      ...values,
      estimated_cost: Number(values.estimated_cost) || 0,
      mom_change: Number(values.mom_change) || 0,
    };
    try {
      if (editRecord) {
        const res = await competitorsApi.update(editRecord.id, data);
        if (res.code === 0) { toast.success('竞品监控已更新'); table.refresh(); return true; }
        toast.error(res.message || '保存失败'); return false;
      }
      const res = await competitorsApi.create(data);
      if (res.code === 0) { toast.success('竞品监控已新增'); table.refresh(); return true; }
      toast.error(res.message || '创建失败'); return false;
    } catch { toast.error('保存失败'); return false; }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await competitorsApi.remove(deleteTarget.id);
      if (res.code === 0) { toast.success('删除成功'); table.refresh(); }
      else toast.error(res.message || '删除失败');
    } catch { toast.error('删除失败'); }
    finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  return (
    <>
      <ServerListPage
        title={t('竞品监控')} description={t('监控竞品投放动态')}
        data={table.data} total={table.total} loading={table.loading}
        columns={columns} filters={COMP_FILTERS}
        primaryActions={[
          { label: '新增监控', primary: true, icon: <Plus className="size-3.5" />, onClick: () => { setEditRecord(null); setFormOpen(true); } },
        ]}
        rowActions={(r) => [
          { label: '编辑', onClick: () => { setEditRecord(r); setFormOpen(true); } },
          { label: '删除', variant: 'destructive', icon: <Trash2 className="size-3.5" />, onClick: () => setDeleteTarget(r) },
        ]}
        page={table.page} pageSize={table.pageSize}
        onPageChange={table.setPage} onPageSizeChange={table.setPageSize}
        onSearch={table.setFilters} onReset={table.handleReset} onSort={table.handleSort}
        sortBy={table.sortBy} sortOrder={table.sortOrder} onRefresh={table.refresh}
      />
      <FieldFormDialog
        key={editRecord ? `edit-${editRecord.id}` : 'create'}
        open={formOpen} onOpenChange={setFormOpen}
        title={editRecord ? `编辑竞品：${editRecord.competitor_name}` : '新增竞品监控'}
        description={t('录入竞品投放信息，带 * 为必填项')}
        fields={COMP_FORM} submitLabel={editRecord ? '保存修改' : '确认新增'}
        onSubmit={handleSave} initialValues={editRecord}
      />
      <AlertDialog open={deleteTarget !== null} onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除竞品监控</AlertDialogTitle>
            <AlertDialogDescription>
              将删除「{deleteTarget?.competitor_name}」（{deleteTarget?.platform}）的监控记录，该操作不可恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>取消</AlertDialogCancel>
            <AlertDialogAction disabled={deleting} onClick={(e) => { e.preventDefault(); handleDelete(); }}>
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ==================== 素材库（卡片 / 列表双视图） ====================
