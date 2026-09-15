import { useMemo, useState } from 'react';
import { t } from '@/lib/i18n';
import { Download, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import ServerListPage, { type FilterField as ServerFilterField, type Column } from '@/components/ServerListPage';
import StatusBadge from '@/components/StatusBadge';
import { formatDateTime } from '@/lib/format';
import { exportTasksApi } from '@/api';
import { useServerList } from '@/hooks/useServerList';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useActionLock } from '@/hooks/useActionLock';
import { extractErrorMessage, validateRecordId } from '@/lib/error-utils';
import { TASK_STATUS_MAP, TASK_STATUS_OPTS, TASK_STATUS_VARIANT } from './task-shared';
import { reportOperation } from '@/api/audit';
import { createExportTaskRecord, finishExportTaskRecord, makeTaskNo } from './import-result';
import {
  AVAILABLE_EXPORT_TYPES, UNAVAILABLE_EXPORT_TYPES, describeExportConditions,
  downloadCsv, encodeExportConditions, fetchAllEntityRows, resolveRedownloadTarget,
} from './export-configs';

// ==================== 批量导出 ====================
const SELECT_OPTIONS = [
  ...AVAILABLE_EXPORT_TYPES.map((t2) => ({ key: t2.key, label: t2.label, available: true })),
  ...UNAVAILABLE_EXPORT_TYPES.map((t2) => ({ key: t2.key, label: `${t2.label}【暂未开放】`, available: false })),
];

const BE_FILTERS: ServerFilterField[] = [
  { key: 'keyword', label: '导出类型', type: 'input', placeholder: '搜索导出类型/条件' },
  { key: 'status', label: '任务状态', type: 'select', options: TASK_STATUS_OPTS },
];

export function BatchExportPage() {
  const [open, setOpen] = useState(false);
  const [exportKey, setExportKey] = useState(AVAILABLE_EXPORT_TYPES[0].key);
  const [keyword, setKeyword] = useState('');
  const [creating, setCreating] = useState(false);
  const [redownloading, setRedownloading] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const { withLock: withDeleteLock, locked: deleteLocked } = useActionLock();
  const table = useServerList({ fetchFn: exportTasksApi.list, defaultPageSize: 20 });

  const selectedType = AVAILABLE_EXPORT_TYPES.find((t2) => t2.key === exportKey) ?? null;

  const columns: Column<Record<string, any>>[] = useMemo(() => [
    { key: 'task_no', title: '任务ID', width: '150px', sortable: true, render: (r) => <>{r.task_no || '-'}</> },
    { key: 'task_type', title: '导出类型', width: '130px', render: (r) => <StatusBadge status={r.task_type} variant="secondary" /> },
    { key: 'conditions', title: '导出条件', render: (r) => <span className="text-sm">{describeExportConditions(r.conditions)}</span> },
    { key: 'row_count', title: '导出行数', width: '90px', align: 'right', render: (r) => <span className="tabular-nums">{r.row_count ?? '-'}</span> },
    { key: 'fail_reason', title: '失败原因', render: (r) => <span className="text-sm text-destructive">{r.fail_reason || '-'}</span> },
    { key: 'status', title: '状态', width: '90px', render: (r) => <StatusBadge status={TASK_STATUS_MAP[r.status] || r.status} variant={TASK_STATUS_VARIANT[r.status] || 'default'} /> },
    { key: 'created_at', title: '创建时间', width: '160px', sortable: true, render: (r) => <span className="tabular-nums text-sm text-muted-foreground">{formatDateTime(r.created_at)}</span> },
  ], []);

  const handleCreate = async () => {
    if (!selectedType) {
      toast.warning('该导出类型暂未开放');
      return;
    }
    setCreating(true);
    const taskNo = makeTaskNo('EXP');
    const fileName = `${selectedType.label}导出_${new Date().toISOString().slice(0, 10)}.csv`;
    const conditions = encodeExportConditions({
      tableKey: selectedType.tableKey,
      keyword: keyword.trim(),
    });
    let recordId: string;
    try {
      recordId = await createExportTaskRecord({
        taskNo,
        taskType: selectedType.label,
        conditions,
        fileName,
      });
    } catch (e) {
      toast.error(extractErrorMessage(e));
      setCreating(false);
      return;
    }
    try {
      const rows = await fetchAllEntityRows(selectedType.tableKey, keyword.trim());
      const outName = downloadCsv(selectedType.label, selectedType.columns, rows);
      await finishExportTaskRecord(recordId, { completed: true, rowCount: rows.length, fileName: outName });
      reportOperation({
        module: '任务中心',
        op_type: '导出',
        object_type: selectedType.label,
        object_no: taskNo,
        summary: `导出「${selectedType.label}」${rows.length} 行`,
      });
      toast.success(`导出完成，共 ${rows.length} 行`);
      table.refresh();
      setOpen(false);
    } catch (e) {
      const msg = extractErrorMessage(e);
      try {
        await finishExportTaskRecord(recordId, { completed: false, failReason: msg });
      } catch { /* 任务状态更新失败，记录保留处理中 */ }
      toast.error(msg);
    } finally {
      setCreating(false);
    }
  };

  const handleRedownload = async (r: Record<string, any>) => {
    const target = resolveRedownloadTarget(r.conditions, r.task_type);
    if (!target) {
      toast.warning('无法识别该任务的导出类型，请重新创建导出任务');
      return;
    }
    const typeInfo = AVAILABLE_EXPORT_TYPES.find((t2) => t2.tableKey === target.tableKey);
    if (!typeInfo) {
      toast.warning('该导出类型暂未开放，无法重新下载');
      return;
    }
    setRedownloading(true);
    try {
      const rows = await fetchAllEntityRows(target.tableKey, target.keyword);
      downloadCsv(typeInfo.label, typeInfo.columns, rows);
      toast.success(`重新下载完成，共 ${rows.length} 行`);
    } catch (e) {
      toast.error(extractErrorMessage(e));
    } finally {
      setRedownloading(false);
    }
  };

  const handleDelete = async () => {
    await withDeleteLock(async () => {
      if (!deleteId) return;
      const id = validateRecordId({ id: deleteId });
      if (!id) { toast.warning('记录标识缺失，请刷新后重试'); setDeleteId(null); return; }
      try {
        const res = await exportTasksApi.remove(deleteId);
        if (res.code === 0) { toast.success('删除成功'); setDeleteId(null); table.refresh(); } else toast.error(res.message || '删除失败');
      } catch (e) { toast.error(extractErrorMessage(e)); }
    });
  };

  return (
    <>
      <ServerListPage
        title={t('批量导出')} description={t('管理批量导出任务，导出真实拉取全量数据并生成文件下载')}
        data={table.data} total={table.total} loading={table.loading}
        columns={columns} filters={BE_FILTERS}
        primaryActions={[{ label: '新建导出任务', primary: true, icon: <Plus className="size-3.5" />, onClick: () => setOpen(true) }]}
        rowActions={(r) => [
          ...(r.status === 'completed' ? [{
            label: redownloading ? '下载中…' : '重新下载',
            variant: 'default' as const,
            icon: <Download className="size-3.5" />,
            onClick: () => handleRedownload(r),
          }] : []),
          { label: '删除', variant: 'destructive', icon: <Trash2 className="size-3.5" />, onClick: () => setDeleteId(r.id) },
        ]}
        page={table.page} pageSize={table.pageSize}
        onPageChange={table.setPage} onPageSizeChange={table.setPageSize}
        onSearch={table.setFilters} onReset={table.handleReset} onSort={table.handleSort}
        sortBy={table.sortBy} sortOrder={table.sortOrder} onRefresh={table.refresh}
      />

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>新建导出任务</DialogTitle>
            <DialogDescription>选择导出类型与条件，系统将真实拉取全量数据并生成 CSV 文件下载</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>导出类型</Label>
              <Select
                value={exportKey}
                onValueChange={(k: string) => {
                  const opt = SELECT_OPTIONS.find((o) => o.key === k);
                  if (!opt) return;
                  if (!opt.available) {
                    toast.warning(`${opt.label.replace('【暂未开放】', '')}暂未开放，敬请期待`);
                    return;
                  }
                  setExportKey(k);
                }}
              >
                <SelectTrigger><SelectValue placeholder="请选择导出类型" /></SelectTrigger>
                <SelectContent>
                  {SELECT_OPTIONS.map((opt) => (
                    <SelectItem
                      key={opt.key}
                      value={opt.key}
                      disabled={!opt.available}
                      className={opt.available ? undefined : 'opacity-50'}
                    >
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedType && (
                <p className="text-xs text-muted-foreground">导出范围：{selectedType.columns.length} 列，按关键字条件拉取全量数据</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>导出条件</Label>
              <Input
                value={keyword}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setKeyword(e.target.value)}
                placeholder="可选：输入关键字筛选，留空导出全部数据"
                maxLength={100}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={creating}>取消</Button>
            <Button onClick={handleCreate} disabled={creating || !selectedType}>
              {creating ? '导出中…' : '确认导出'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除该导出任务？</AlertDialogTitle>
            <AlertDialogDescription>删除后任务记录将不可恢复，请谨慎操作。</AlertDialogDescription>
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
