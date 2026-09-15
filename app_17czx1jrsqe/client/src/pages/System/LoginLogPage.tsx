import { useCallback, useEffect, useMemo, useState } from 'react';
import { TriangleAlert } from 'lucide-react';
import { t } from '@/lib/i18n';
import ServerListPage, { type FilterField, type Column } from '@/components/ServerListPage';
import StatusBadge from '@/components/StatusBadge';
import { formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import { loginLogsApi } from '@/api';
import { useServerList } from '@/hooks/useServerList';
import type { ApiResponse, ListParams, PageResult } from '@/api/types';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

interface LoginLogRow {
  id?: string;
  log_no?: string;
  username?: string;
  user_id?: string;
  login_mode?: string;
  ip?: string;
  location?: string;
  browser?: string;
  os?: string;
  device?: string;
  status?: string;
  fail_reason?: string;
  session_id?: string;
  remark?: string;
  login_at?: string;
  created_at?: string;
}

const LOGIN_MODE_OPTS = ['飞书授权登录', '刷新会话', '登出', '会话失效']
  .map((v) => ({ label: v, value: v }));

const STATUS_OPTS = ['成功', '失败'].map((v) => ({ label: v, value: v }));

const DETAIL_FIELDS: { key: keyof LoginLogRow; label: string }[] = [
  { key: 'log_no', label: '日志编号' },
  { key: 'username', label: '用户名' },
  { key: 'user_id', label: '用户标识' },
  { key: 'login_mode', label: '登录方式' },
  { key: 'status', label: '登录状态' },
  { key: 'ip', label: 'IP地址' },
  { key: 'location', label: '登录地点' },
  { key: 'browser', label: '浏览器' },
  { key: 'os', label: '操作系统' },
  { key: 'device', label: '设备' },
  { key: 'session_id', label: '会话标识' },
  { key: 'remark', label: '备注' },
  { key: 'fail_reason', label: '失败原因' },
  { key: 'login_at', label: '登录时间' },
  { key: 'created_at', label: '创建时间' },
];

function normalizeFilters(filters: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, val] of Object.entries(filters)) {
    if (val === undefined || val === null || val === '' || val === 'all') continue;
    out[key] = String(val);
  }
  const start = out['login_atStart'];
  const end = out['login_atEnd'];
  delete out['login_atStart'];
  delete out['login_atEnd'];
  if (start) out['登录时间__gte'] = `${start} 00:00:00`;
  if (end) out['登录时间__lte'] = `${end} 23:59:59`;
  return out;
}

function todayStr(): string {
  const d = new Date();
  const pad = (x: number): string => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

interface LoginStats {
  todayCount: number;
  todayFail: number;
  lastActive: string;
}

function findConsecutiveFailUser(rows: LoginLogRow[]): string {
  let streakUser = '';
  let streak = 0;
  for (const r of rows) {
    if (r.status === '失败') {
      streak = r.username && r.username === streakUser ? streak + 1 : 1;
      streakUser = r.username || streakUser;
      if (streak >= 3) return streakUser;
    } else {
      streakUser = '';
      streak = 0;
    }
  }
  return '';
}

export default function LoginLogPage() {
  const [detail, setDetail] = useState<LoginLogRow | null>(null);
  const [alertUser, setAlertUser] = useState('');
  const [stats, setStats] = useState<LoginStats>({ todayCount: 0, todayFail: 0, lastActive: '-' });

  const fetchLogs = useCallback(
    async (params: ListParams): Promise<ApiResponse<PageResult<Record<string, unknown>>>> => {
      const query: ListParams = {
        ...normalizeFilters(params),
        page: params.page,
        pageSize: params.pageSize,
        pageToken: params.pageToken,
        sortBy: params.sortBy || 'login_at',
        sortOrder: params.sortOrder || 'desc',
      };
      return loginLogsApi.list(query);
    },
    [],
  );

  const table = useServerList({ fetchFn: fetchLogs, defaultPageSize: 20 });

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const res = await loginLogsApi.list({ page: 1, pageSize: 200, sortBy: 'login_at', sortOrder: 'desc' });
        if (cancelled) return;
        if (res.code !== 0 || !res.data) {
          setAlertUser('');
          setStats({ todayCount: 0, todayFail: 0, lastActive: '-' });
          return;
        }
        const rows = (res.data.list || []) as LoginLogRow[];
        setAlertUser(findConsecutiveFailUser(rows));
        const today = todayStr();
        let todayCount = 0;
        let todayFail = 0;
        let lastActive = '-';
        for (const r of rows) {
          const day = (r.login_at || '').slice(0, 10);
          if (day !== today) continue;
          if (r.status === '失败') todayFail += 1;
          else if (r.status === '成功' && r.login_mode !== '登出') todayCount += 1;
        }
        const latestActive = rows.find((r) => r.status === '成功' && r.login_mode !== '登出');
        if (latestActive) {
          lastActive = `${latestActive.username || '-'} · ${formatDateTime(latestActive.login_at)}`;
        }
        setStats({ todayCount, todayFail, lastActive });
      } catch {
        if (!cancelled) {
          setAlertUser('');
          setStats({ todayCount: 0, todayFail: 0, lastActive: '-' });
        }
      }
    };
    check();
    return () => { cancelled = true; };
  }, [table.data]);

  const filters: FilterField[] = useMemo(
    () => [
      { key: 'username', label: '用户', type: 'input', placeholder: '搜索用户名' },
      { key: 'login_mode', label: '登录方式', type: 'select', options: LOGIN_MODE_OPTS },
      { key: 'status', label: '登录状态', type: 'select', options: STATUS_OPTS },
      { key: 'login_at', label: '登录时间', type: 'date-range' },
      { key: 'keyword', label: '关键词', type: 'input', placeholder: '用户名/日志编号/会话标识' },
    ],
    [],
  );

  const handleExportAll = useCallback(async (): Promise<LoginLogRow[]> => {
    const query: ListParams = {
      ...normalizeFilters(table.filters),
      page: 1,
      pageSize: 1000,
      sortBy: table.sortBy || 'login_at',
      sortOrder: table.sortOrder || 'desc',
    };
    const res = await loginLogsApi.list(query);
    if (res.code !== 0 || !res.data) return [];
    return (res.data.list || []) as LoginLogRow[];
  }, [table.filters, table.sortBy, table.sortOrder]);

  const columns: Column<LoginLogRow>[] = useMemo(
    () => [
      { key: 'log_no', title: '日志编号', width: '120px', render: (r) => <span className="text-xs text-muted-foreground">{r.log_no || '-'}</span> },
      {
        key: 'username', title: '用户名', width: '130px',
        render: (r) => <span className={cn('font-medium', r.status === '失败' && 'text-destructive')}>{r.username || '-'}</span>,
      },
      { key: 'login_mode', title: '登录方式', width: '120px', render: (r) => <>{r.login_mode || '-'}</> },
      { key: 'ip', title: 'IP地址', width: '130px', render: (r) => <span className="text-sm tabular-nums">{r.ip || '-'}</span> },
      { key: 'location', title: '登录地点', width: '110px', render: (r) => <>{r.location || '-'}</> },
      { key: 'browser', title: '浏览器', width: '110px', render: (r) => <>{r.browser || '-'}</> },
      { key: 'os', title: '操作系统', width: '110px', render: (r) => <>{r.os || '-'}</> },
      { key: 'device', title: '设备', width: '100px', defaultVisible: false, render: (r) => <>{r.device || '-'}</> },
      {
        key: 'status', title: '登录状态', width: '90px',
        render: (r) => <StatusBadge status={r.status === '失败' ? '失败' : r.status === '成功' ? '成功' : r.status || '-'} variant={r.status === '失败' ? 'danger' : 'success'} />,
      },
      {
        key: 'fail_reason', title: '失败原因', defaultVisible: false,
        render: (r) => <span className="block max-w-[240px] truncate text-sm text-destructive" title={r.fail_reason || ''}>{r.fail_reason || '-'}</span>,
      },
      { key: 'login_at', title: '登录时间', width: '170px', sortable: true, render: (r) => <span className="text-sm tabular-nums">{formatDateTime(r.login_at)}</span> },
    ],
    [],
  );

  return (
    <>
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3" data-ai-section-type="card-stat">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="text-xs text-muted-foreground">今日登录次数</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">{stats.todayCount}</div>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="text-xs text-muted-foreground">今日失败次数</div>
          <div className={cn('mt-1 text-2xl font-semibold tabular-nums', stats.todayFail > 0 && 'text-destructive')}>
            {stats.todayFail}
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="text-xs text-muted-foreground">最近活跃</div>
          <div className="mt-1 truncate text-sm font-medium" title={stats.lastActive}>{stats.lastActive}</div>
        </div>
      </div>
      {alertUser && (
        <Alert variant="warning" className="border-amber-300 bg-amber-50 text-amber-800">
          <TriangleAlert className="size-4" />
          <AlertTitle>检测到账号连续登录失败</AlertTitle>
          <AlertDescription>用户「{alertUser}」最近登录记录连续多次失败，请关注账号安全风险。</AlertDescription>
        </Alert>
      )}
      <ServerListPage<LoginLogRow>
        title={t('登录日志')} description={t('用户登录安全记录（只读，不可修改删除）')}
        data={table.data} total={table.total} loading={table.loading}
        columns={columns} filters={filters}
        selectable={false}
        onRowClick={(r) => setDetail(r)}
        emptyText="暂无登录日志，调整筛选条件或先产生登录行为"
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
            <DialogTitle>登录日志详情</DialogTitle>
            <DialogDescription>
              {detail?.log_no || '-'} · {formatDateTime(detail?.login_at)}
            </DialogDescription>
          </DialogHeader>
          {detail && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
                {DETAIL_FIELDS.map((f) => {
                  const val = detail[f.key];
                  const shown = f.key === 'login_at' || f.key === 'created_at'
                    ? formatDateTime(val as string | undefined)
                    : val == null || val === '' ? '-' : String(val);
                  return (
                    <div key={f.key} className="flex min-w-0 items-start gap-2">
                      <span className="w-24 shrink-0 text-muted-foreground">{f.label}</span>
                      <span className={cn('min-w-0 break-words', f.key === 'fail_reason' && detail.status === '失败' && 'text-destructive')}>{shown}</span>
                    </div>
                  );
                })}
              </div>
              {detail.status === '失败' && detail.fail_reason && (
                <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                  登录失败原因：{detail.fail_reason}
                </div>
              )}
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
