import { useEffect, useMemo, useState } from 'react';
import { t } from '@/lib/i18n';
import { CheckCircle2, Download, Plus, Trash2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import ServerListPage, { type FilterField as ServerFilterField, type Column } from '@/components/ServerListPage';
import BatchImportTaskDialog from '@/components/BatchImportTaskDialog';
import StatusBadge from '@/components/StatusBadge';
import { formatDateTime } from '@/lib/format';
import { importTasksApi } from '@/api';
import { useServerList } from '@/hooks/useServerList';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useActionLock } from '@/hooks/useActionLock';
import { extractErrorMessage, validateRecordId } from '@/lib/error-utils';
import { TASK_STATUS_MAP, TASK_STATUS_OPTS, TASK_STATUS_VARIANT } from './task-shared';
import { reportOperation } from '@/api/audit';
import type { BatchImportTaskResult } from '@/components/BatchImportTaskDialog';
import {
  downloadFromUrl, getAttachmentDownloadUrl, parseFailDetail,
} from './import-result';

// ==================== 批量导入 ====================
const BI_FILTERS: ServerFilterField[] = [
  { key: 'keyword', label: '任务编号', type: 'input', placeholder: '搜索任务编号或导入类型' },
  { key: 'status', label: '任务状态', type: 'select', options: TASK_STATUS_OPTS },
];

export function BatchImportPage() {
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const { withLock: withDeleteLock, locked: deleteLocked } = useActionLock();
  const [resultRow, setResultRow] = useState<Record<string, any> | null>(null);
  const [detail, setDetail] = useState<Record<string, any> | null>(null);
  const table = useServerList({ fetchFn: importTasksApi.list, defaultPageSize: 20 });

  useEffect(() => {
    if (!resultRow) { setDetail(null); return; }
    setDetail(resultRow);
    let cancelled = false;
    const loadFull = async () => {
      if (resultRow.fail_detail === undefined || resultRow.doc_file === undefined) {
        try {
          const res = await importTasksApi.get(resultRow.id);
          if (!cancelled && res.code === 0 && res.data) {
            setDetail({ ...resultRow, ...(res.data as Record<string, any>) });
          }
        } catch { /* 保留列表行数据 */ }
      }
    };
    loadFull();
    return () => { cancelled = true; };
  }, [resultRow]);

  const detailRows = useMemo(() => (detail ? parseFailDetail(detail.fail_detail) : []), [detail]);
  const docUrl = detail ? getAttachmentDownloadUrl(detail.doc_file) : null;

  const columns: Column<Record<string, any>>[] = useMemo(() => [
    { key: 'task_no', title: '任务ID', width: '150px', sortable: true, render: (r) => <>{r.task_no || '-'}</> },
    { key: 'task_type', title: '导入类型', width: '120px', render: (r) => <StatusBadge status={r.task_type} variant="secondary" /> },
    { key: 'file_name', title: '文件名', render: (r) => <span className="text-sm">{r.file_name}</span> },
    { key: 'total_rows', title: '总条数', width: '90px', align: 'right', render: (r) => <span className="tabular-nums">{r.total_rows}</span> },
    { key: 'success_rows', title: '成功', width: '90px', align: 'right', render: (r) => <span className="tabular-nums text-success">{r.success_rows}</span> },
    { key: 'fail_rows', title: '失败', width: '90px', align: 'right', render: (r) => <span className="tabular-nums text-destructive">{r.fail_rows}</span> },
    { key: 'status', title: '状态', width: '90px', render: (r) => <StatusBadge status={TASK_STATUS_MAP[r.status] || r.status} variant={TASK_STATUS_VARIANT[r.status] || 'default'} /> },
    { key: 'created_at', title: '创建时间', width: '160px', sortable: true, render: (r) => <span className="tabular-nums text-sm text-muted-foreground">{formatDateTime(r.created_at)}</span> },
  ], []);

  const handleDelete = async () => {
    await withDeleteLock(async () => {
      if (!deleteId) return;
      const id = validateRecordId({ id: deleteId });
      if (!id) { toast.warning('记录标识缺失，请刷新后重试'); setDeleteId(null); return; }
      try {
        const res = await importTasksApi.remove(deleteId);
        if (res.code === 0) { toast.success('删除成功'); setDeleteId(null); table.refresh(); } else toast.error(res.message || '删除失败');
      } catch (e) { toast.error(extractErrorMessage(e)); }
    });
  };

  return (
    <>
      <ServerListPage
        title={t('批量导入')} description={t('管理批量导入任务，真实解析文件校验后写入数据表')}
        data={table.data} total={table.total} loading={table.loading}
        columns={columns} filters={BI_FILTERS}
        primaryActions={[{ label: '新建导入任务', primary: true, icon: <Plus className="size-3.5" />, onClick: () => setOpen(true) }]}
        rowActions={(r) => [
          { label: '查看结果', onClick: () => setResultRow(r) },
          { label: '删除', variant: 'destructive', icon: <Trash2 className="size-3.5" />, onClick: () => setDeleteId(r.id) },
        ]}
        page={table.page} pageSize={table.pageSize}
        onPageChange={table.setPage} onPageSizeChange={table.setPageSize}
        onSearch={table.setFilters} onReset={table.handleReset} onSort={table.handleSort}
        sortBy={table.sortBy} sortOrder={table.sortOrder} onRefresh={table.refresh}
      />
      <BatchImportTaskDialog
        open={open}
        onOpenChange={setOpen}
        onFinished={(result: BatchImportTaskResult) => {
          table.refresh();
          const allFailed = result.fail > 0 && result.success === 0;
          reportOperation({
            module: '任务中心',
            op_type: '导入',
            object_type: '批量导入任务',
            object_no: result.taskNo,
            summary: `导入「${result.fileName}」共${result.total}行，成功${result.success}行，失败${result.fail}行`,
            result: allFailed ? '失败' : '成功',
            fail_reason: allFailed ? `全部 ${result.fail} 行导入失败` : undefined,
          });
        }}
      />
      {/* 导入结果明细弹窗 */}
      <Dialog open={resultRow !== null} onOpenChange={(o) => !o && setResultRow(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>导入结果明细</DialogTitle>
            <DialogDescription>
              任务 {detail?.task_no} · {detail?.file_name} · {formatDateTime(detail?.created_at)}
            </DialogDescription>
          </DialogHeader>
          {detail && (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg bg-muted/60 p-3 text-center">
                  <div className="text-xl font-bold tabular-nums">{detail.total_rows}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">总条数</div>
                </div>
                <div className="rounded-lg bg-success/10 p-3 text-center">
                  <div className="text-xl font-bold tabular-nums text-success">{detail.success_rows}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">成功</div>
                </div>
                <div className="rounded-lg bg-destructive/10 p-3 text-center">
                  <div className="text-xl font-bold tabular-nums text-destructive">{detail.fail_rows}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">失败</div>
                </div>
              </div>
              <div className="max-h-72 overflow-y-auto rounded-lg border border-border/60">
                {detailRows.length > 0 ? (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/60 bg-muted/40 text-left text-xs text-muted-foreground">
                        <th className="px-3 py-2 font-medium">行号</th>
                        <th className="px-3 py-2 font-medium">结果</th>
                        <th className="px-3 py-2 font-medium">说明</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailRows.map((row) => (
                        <tr key={`${row.row}-${row.reason}`} className="border-b border-border/40 last:border-0">
                          <td className="px-3 py-2 tabular-nums text-muted-foreground">第 {row.row} 行</td>
                          <td className="px-3 py-2">
                            {row.ok ? (
                              <span className="inline-flex items-center gap-1 text-success"><CheckCircle2 className="size-3.5" />成功</span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-destructive"><XCircle className="size-3.5" />失败</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">{row.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-6 text-center text-sm text-muted-foreground">该任务没有逐行明细记录</div>
                )}
              </div>
            </>
          )}
          <DialogFooter className="items-center">
            {detail && !docUrl && (
              <span className="mr-auto text-xs text-muted-foreground">该任务没有原文档附件</span>
            )}
            <Button
              variant="outline"
              disabled={!docUrl}
              onClick={() => {
                if (docUrl && detail) downloadFromUrl(docUrl, detail.file_name || '导入原文档');
              }}
            >
              <Download className="size-3.5" /> 下载原文档
            </Button>
            <Button variant="outline" onClick={() => setResultRow(null)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除该导入任务？</AlertDialogTitle>
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
