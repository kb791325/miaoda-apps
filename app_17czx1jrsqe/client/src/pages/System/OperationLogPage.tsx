import { useCallback, useMemo, useState } from 'react';
import { t } from '@/lib/i18n';
import ServerListPage, { type FilterField, type Column } from '@/components/ServerListPage';
import StatusBadge from '@/components/StatusBadge';
import { formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import { operationLogsApi } from '@/api';
import { useServerList } from '@/hooks/useServerList';
import type { ApiResponse, ListParams, PageResult } from '@/api/types';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

interface OperationLogRow {
  id?: string;
  log_no?: string;
  operator_name?: string;
  operator_id?: string;
  department?: string;
  role?: string;
  module?: string;
  op_type?: string;
  object_type?: string;
  object_no?: string;
  op_content?: string;
  result?: string;
  fail_reason?: string;
  ip?: string;
  browser?: string;
  trace_id?: string;
  operated_at?: string;
  created_at?: string;
}

const MODULE_OPTS = [
  '客户管理', '广告业务', '视频业务', '合同业务', '财务管理', '人资管理', '行政管理', '任务中心', '系统管理',
].map((m) => ({ label: m, value: m }));

const OP_TYPE_OPTS = [
  '新增', '修改', '删除', '批量新增', '批量删除', '审批提交', '审批通过', '审批驳回', '审批', '上传', '导入', '导出', '配置变更',
].map((v) => ({ label: v, value: v }));

const RESULT_OPTS = ['成功', '失败'].map((v) => ({ label: v, value: v }));

const DETAIL_FIELDS: { key: keyof OperationLogRow; label: string }[] = [
  { key: 'log_no', label: '日志编号' },
  { key: 'operator_name', label: '操作人' },
  { key: 'operator_id', label: '操作人标识' },
  { key: 'department', label: '所属部门' },
  { key: 'role', label: '角色' },
  { key: 'module', label: '模块' },
  { key: 'op_type', label: '操作类型' },
  { key: 'object_type', label: '对象类型' },
  { key: 'object_no', label: '对象业务编号' },
  { key: 'result', label: '结果' },
  { key: 'fail_reason', label: '失败原因' },
  { key: 'ip', label: 'IP地址' },
  { key: 'browser', label: '浏览器' },
  { key: 'trace_id', label: '链路ID' },
  { key: 'operated_at', label: '操作时间' },
  { key: 'created_at', label: '创建时间' },
];

function normalizeFilters(filters: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, val] of Object.entries(filters)) {
    if (val === undefined || val === null || val === '' || val === 'all') continue;
    out[key] = String(val);
  }
  const start = out['operated_atStart'];
  const end = out['operated_atEnd'];
  delete out['operated_atStart'];
  delete out['operated_atEnd'];
  if (start) out['操作时间__gte'] = `${start} 00:00:00`;
  if (end) out['操作时间__lte'] = `${end} 23:59:59`;
  return out;
}

function formatOpContent(raw: unknown): string {
  const text = raw == null ? '' : String(raw);
  try {
    const parsed: unknown = JSON.parse(text);
    if (parsed && typeof parsed === 'object') return JSON.stringify(parsed, null, 2);
  } catch {
    return text;
  }
  return text;
}

export default function OperationLogPage() {
  const [detail, setDetail] = useState<OperationLogRow | null>(null);

  const fetchLogs = useCallback(
    async (params: ListParams): Promise<ApiResponse<PageResult<Record<string, unknown>>>> => {
      const query: ListParams = {
        ...normalizeFilters(params),
        page: params.page,
        pageSize: params.pageSize,
        pageToken: params.pageToken,
        sortBy: params.sortBy || 'operated_at',
        sortOrder: params.sortOrder || 'desc',
      };
      return operationLogsApi.list(query);
    },
    [],
  );

  const table = useServerList({ fetchFn: fetchLogs, defaultPageSize: 20 });

  const moduleOptions = useMemo(() => {
    const seen = new Set<string>(MODULE_OPTS.map((m) => m.value));
    const extra: { label: string; value: string }[] = [];
    for (const r of table.data as OperationLogRow[]) {
      if (r.module && !seen.has(r.module)) {
        seen.add(r.module);
        extra.push({ label: r.module, value: r.module });
      }
    }
    return [...MODULE_OPTS, ...extra];
  }, [table.data]);

  const filters: FilterField[] = useMemo(
    () => [
      { key: 'operator_name', label: '操作人', type: 'input', placeholder: '搜索操作人' },
      { key: 'module', label: '模块', type: 'select', options: moduleOptions },
      { key: 'op_type', label: '操作类型', type: 'select', options: OP_TYPE_OPTS },
      { key: 'result', label: '结果', type: 'select', options: RESULT_OPTS },
      { key: 'operated_at', label: '操作时间', type: 'date-range' },
      { key: 'keyword', label: '关键词', type: 'input', placeholder: '操作内容/对象编号/日志编号' },
    ],
    [moduleOptions],
  );

  const handleExportAll = useCallback(async (): Promise<OperationLogRow[]> => {
    const query: ListParams = {
      ...normalizeFilters(table.filters),
      page: 1,
      pageSize: 1000,
      sortBy: table.sortBy || 'operated_at',
      sortOrder: table.sortOrder || 'desc',
    };
    const res = await operationLogsApi.list(query);
    if (res.code !== 0 || !res.data) return [];
    return (res.data.list || []) as OperationLogRow[];
  }, [table.filters, table.sortBy, table.sortOrder]);

  const columns: Column<OperationLogRow>[] = useMemo(
    () => [
      { key: 'log_no', title: '日志编号', width: '120px', render: (r) => <span className="text-xs text-muted-foreground">{r.log_no || '-'}</span> },
      {
        key: 'operator_name', title: '操作人', width: '110px',
        render: (r) => <span className={cn('font-medium', r.result === '失败' && 'text-destructive')}>{r.operator_name || '-'}</span>,
      },
      { key: 'module', title: '模块', width: '110px', render: (r) => <>{r.module || '-'}</> },
      {
        key: 'op_type', title: '操作类型', width: '100px',
        render: (r) => <StatusBadge status={r.op_type || '-'} variant={r.op_type === '删除' || r.op_type === '批量删除' ? 'danger' : r.op_type === '新增' ? 'success' : 'info'} />,
      },
      {
        key: 'op_content', title: '操作内容',
        render: (r) => (
          <span className={cn('block max-w-[280px] truncate text-sm', r.result === '失败' && 'text-destructive')} title={r.op_content || ''}>
            {r.op_content || '-'}
          </span>
        ),
      },
      { key: 'object_no', title: '对象业务编号', width: '140px', render: (r) => <span className="text-xs tabular-nums">{r.object_no || '-'}</span> },
      {
        key: 'result', title: '结果', width: '80px',
        render: (r) => <StatusBadge status={r.result === '失败' ? '失败' : r.result === '成功' ? '成功' : r.result || '-'} variant={r.result === '失败' ? 'danger' : 'success'} />,
      },
      { key: 'ip', title: 'IP地址', width: '130px', defaultVisible: false, render: (r) => <span className="text-sm tabular-nums text-muted-foreground">{r.ip || '-'}</span> },
      { key: 'browser', title: '浏览器', width: '120px', defaultVisible: false, render: (r) => <>{r.browser || '-'}</> },
      { key: 'trace_id', title: '链路ID', width: '150px', defaultVisible: false, render: (r) => <span className="text-xs text-muted-foreground">{r.trace_id || '-'}</span> },
      { key: 'operated_at', title: '操作时间', width: '170px', sortable: true, render: (r) => <span className="text-sm tabular-nums">{formatDateTime(r.operated_at)}</span> },
    ],
    [],
  );

  return (
    <>
      <ServerListPage<OperationLogRow>
        title={t('操作日志')} description={t('系统操作审计记录（只读，不可修改删除）')}
        data={table.data} total={table.total} loading={table.loading}
        columns={columns} filters={filters}
        selectable={false}
        onRowClick={(r) => setDetail(r)}
        emptyText="暂无操作日志，调整筛选条件或先产生业务操作"
        emptyActionText="重置筛选" onEmptyAction={table.handleReset}
        onExportAll={handleExportAll}
        page={table.page} pageSize={table.pageSize}
        onPageChange={table.setPage} onPageSizeChange={table.setPageSize}
        onSearch={table.setFilters} onReset={table.handleReset} onSort={table.handleSort}
        sortBy={table.sortBy} sortOrder={table.sortOrder} onRefresh={table.refresh}
      />
      <Dialog open={detail !== null} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>操作日志详情</DialogTitle>
            <DialogDescription>
              {detail?.log_no || '-'} · {formatDateTime(detail?.operated_at)}
            </DialogDescription>
          </DialogHeader>
          {detail && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
                {DETAIL_FIELDS.map((f) => {
                  const val = detail[f.key];
                  const shown = f.key === 'operated_at' || f.key === 'created_at'
                    ? formatDateTime(val as string | undefined)
                    : val == null || val === '' ? '-' : String(val);
                  return (
                    <div key={f.key} className="flex min-w-0 items-start gap-2">
                      <span className="w-24 shrink-0 text-muted-foreground">{f.label}</span>
                      <span className={cn('min-w-0 break-words', f.key === 'fail_reason' && detail.result === '失败' && 'text-destructive')}>{shown}</span>
                    </div>
                  );
                })}
              </div>
              <div>
                <div className="mb-1 text-sm font-medium">操作内容</div>
                <pre className="max-h-60 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-muted/60 p-3 text-xs leading-5">
                  {formatOpContent(detail.op_content) || '-'}
                </pre>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetail(null)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
