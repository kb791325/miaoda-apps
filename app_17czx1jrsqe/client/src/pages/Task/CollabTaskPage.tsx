import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, MessageSquare, Eye, Send, User, CalendarClock, Flag, Percent, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useCurrentUserProfile } from '@lark-apaas/client-toolkit/hooks/useCurrentUserProfile';
import ServerListPage, { type FilterField, type ActionButton, type Column } from '@/components/ServerListPage';
import StatusBadge from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { collabTasksApi, employeesApi } from '@/api';
import { useServerList } from '@/hooks/useServerList';
import { extractErrorMessage } from '@/lib/error-utils';
import { t } from '@/lib/i18n';
import { useApp } from '@/context/AppContext';
import CollabTaskCreateDialog from './CollabTaskCreateDialog';
import CollabTaskRowActionsDialog, {
  type CollabTask,
  type EmployeeOption,
  type RowActionMode,
} from './CollabTaskRowActionsDialog';
import CollabTaskCommentList, { type TaskComment } from './CollabTaskCommentList';

const PRIORITY_OPTIONS = ['高', '中', '低'];
const STATUS_OPTIONS = ['未开始', '进行中', '已完成', '已延期'];

export default function CollabTaskPage() {
  const { user } = useApp();
  const profile = useCurrentUserProfile();
  const commentAuthor: string = user?.name || profile?.name || '未知用户';

  // 新建任务
  const [createOpen, setCreateOpen] = useState(false);

  // 行操作（分配负责人 / 更新进度 / 修改截止日期）
  const [actionTask, setActionTask] = useState<CollabTask | null>(null);
  const [actionMode, setActionMode] = useState<RowActionMode | null>(null);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);

  // 评论 / 详情
  const [commentTask, setCommentTask] = useState<CollabTask | null>(null);
  const [detailTask, setDetailTask] = useState<CollabTask | null>(null);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  const [sending, setSending] = useState(false);

  const table = useServerList({
    fetchFn: collabTasksApi.list,
    defaultPageSize: 15,
  });

  const activeTask = commentTask || detailTask;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await employeesApi.list({ page: 1, pageSize: 500 });
        const rows: Array<Record<string, unknown>> = res?.data?.list || [];
        const opts: EmployeeOption[] = rows
          .map((r: Record<string, unknown>) => ({
            name: String(r.name || '').trim(),
            department: String(r.department || ''),
          }))
          .filter((o: EmployeeOption) => o.name);
        if (!cancelled) setEmployees(opts);
      } catch {
        if (!cancelled) setEmployees([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadComments = useCallback(async (taskId: number) => {
    setCommentsLoading(true);
    try {
      const res = await collabTasksApi.comments(taskId);
      if (res.code === 0) {
        setComments((res.data || []) as TaskComment[]);
      } else {
        setComments([]);
      }
    } catch {
      setComments([]);
    } finally {
      setCommentsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTask) {
      loadComments(activeTask.id);
    } else {
      setComments([]);
    }
  }, [activeTask?.id]);

  const handleSendComment = async () => {
    if (!commentTask) return;
    const text = commentInput.trim();
    if (!text) {
      toast.warning('请输入评论内容');
      return;
    }
    setSending(true);
    try {
      const res = await collabTasksApi.addComment(commentTask.id, text, commentAuthor);
      if (res.code === 0) {
        setComments((prev) => [...prev, res.data as TaskComment]);
        setCommentInput('');
        toast.success('评论已发布');
      } else {
        toast.error(res.message || '评论发布失败');
      }
    } catch (e) {
      toast.error(extractErrorMessage(e));
    } finally {
      setSending(false);
    }
  };

  const columns: Column<CollabTask>[] = [
    { key: 'task_no', title: '任务编号', width: '120px', sortable: true, render: (r) => <span className="font-mono text-xs">{r.task_no}</span> },
    {
      key: 'title',
      title: '任务标题',
      render: (r) => <span className="font-medium">{r.title}</span>,
    },
    { key: 'owner', title: '负责人', width: '90px', render: (r) => <>{r.owner || '-'}</> },
    {
      key: 'collaborators',
      title: '协作人',
      width: '180px',
      render: (r) => <span className="truncate block max-w-[170px]">{r.collaborators}</span>,
    },
    { key: 'deadline', title: '截止日期', width: '120px', sortable: true, render: (r) => <>{r.deadline || '-'}</> },
    { key: 'priority', title: '优先级', width: '90px', render: (r) => <StatusBadge status={r.priority} /> },
    {
      key: 'progress',
      title: '进度',
      width: '150px',
      sortable: true,
      render: (r) => {
        const pct = Math.min(100, Math.max(0, Number(r.progress) || 0));
        return (
          <div className="flex items-center gap-2">
            <div className="h-1.5 flex-1 rounded-full bg-muted">
              <div
                className={`h-1.5 rounded-full ${pct === 100 ? 'bg-success' : 'bg-primary'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="w-9 text-right text-xs tabular-nums text-muted-foreground">{pct}%</span>
          </div>
        );
      },
    },
    { key: 'status', title: '状态', width: '100px', render: (r) => <StatusBadge status={r.status} /> },
  ];

  const filters: FilterField[] = [
    { key: 'keyword', label: '任务编号/标题/负责人', type: 'input', placeholder: '搜索任务编号、标题或负责人' },
    {
      key: 'priority',
      label: '优先级',
      type: 'select',
      options: [{ label: '全部', value: '' }, ...PRIORITY_OPTIONS.map((p) => ({ label: p, value: p }))],
    },
    {
      key: 'status',
      label: '状态',
      type: 'select',
      options: [{ label: '全部', value: '' }, ...STATUS_OPTIONS.map((s) => ({ label: s, value: s }))],
    },
  ];

  const primaryActions: ActionButton[] = [
    { label: '新建任务', primary: true, icon: <Plus className="size-3.5" />, onClick: () => setCreateOpen(true) },
  ];

  const rowActions = (record: CollabTask): ActionButton[] => [
    { label: '查看', icon: <Eye className="size-3.5" />, onClick: () => setDetailTask(record) },
    { label: '评论', icon: <MessageSquare className="size-3.5" />, onClick: () => { setCommentTask(record); setCommentInput(''); } },
    { label: '分配负责人', icon: <User className="size-3.5" />, onClick: () => { setActionTask(record); setActionMode('owner'); } },
    { label: '更新进度', icon: <Percent className="size-3.5" />, onClick: () => { setActionTask(record); setActionMode('progress'); } },
    { label: '修改截止日期', icon: <CalendarClock className="size-3.5" />, onClick: () => { setActionTask(record); setActionMode('deadline'); } },
  ];

  const commentList = useMemo(() => comments, [comments]);

  return (
    <>
      <ServerListPage<CollabTask>
        title={t('协作任务')}
        description="团队协作任务跟踪，支持新建任务与评论交流"
        data={table.data as CollabTask[]}
        total={table.total}
        loading={table.loading}
        columns={columns}
        filters={filters}
        primaryActions={primaryActions}
        rowActions={rowActions}
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
        emptyActionText="新建第一个任务"
        onEmptyAction={() => setCreateOpen(true)}
      />

      <CollabTaskCreateDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={() => {
          setCreateOpen(false);
          table.refresh();
        }}
      />

      <CollabTaskRowActionsDialog
        task={actionTask}
        mode={actionMode}
        employees={employees}
        onClose={() => {
          setActionTask(null);
          setActionMode(null);
        }}
        onSuccess={() => {
          setActionTask(null);
          setActionMode(null);
          table.refresh();
        }}
      />

      {/* 任务详情 */}
      <Dialog open={!!detailTask} onOpenChange={(o) => !o && setDetailTask(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="size-4 text-primary" /> {detailTask?.title}
            </DialogTitle>
            <DialogDescription>任务编号：{detailTask?.task_no}</DialogDescription>
          </DialogHeader>
          {detailTask && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2 rounded-md bg-muted/40 p-2.5">
                  <User className="size-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">负责人</span>
                  <span className="ml-auto font-medium">{detailTask.owner}</span>
                </div>
                <div className="flex items-center gap-2 rounded-md bg-muted/40 p-2.5">
                  <CalendarClock className="size-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">截止日期</span>
                  <span className="ml-auto font-medium">{detailTask.deadline}</span>
                </div>
                <div className="flex items-center gap-2 rounded-md bg-muted/40 p-2.5">
                  <Flag className="size-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">优先级</span>
                  <span className="ml-auto"><StatusBadge status={detailTask.priority} /></span>
                </div>
                <div className="flex items-center gap-2 rounded-md bg-muted/40 p-2.5">
                  <span className="text-xs text-muted-foreground">当前状态</span>
                  <span className="ml-auto"><StatusBadge status={detailTask.status} /></span>
                </div>
              </div>
              <div>
                <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
                  <span>协作人</span>
                  <span>{detailTask.collaborators}</span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div
                    className={`h-2 rounded-full ${detailTask.progress === 100 ? 'bg-success' : 'bg-primary'}`}
                    style={{ width: `${detailTask.progress}%` }}
                  />
                </div>
                <div className="mt-1 text-right text-xs text-muted-foreground">进度 {detailTask.progress}%</div>
              </div>
              {detailTask.description && (
                <div className="rounded-md border border-border/60 p-3 text-sm leading-relaxed">
                  <div className="mb-1 text-xs font-medium text-muted-foreground">任务描述</div>
                  {detailTask.description}
                </div>
              )}
              <div>
                <div className="mb-2 text-sm font-medium">评论 ({commentList.length})</div>
                <div className="max-h-44 space-y-3 overflow-y-auto pr-1">
                  <CollabTaskCommentList comments={commentList} loading={commentsLoading} emptyText="暂无评论，去发表第一条吧" />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailTask(null)}>{t('关闭')}</Button>
            <Button onClick={() => { setCommentTask(detailTask); setDetailTask(null); setCommentInput(''); }}>
              <MessageSquare className="size-3.5" /> 去评论
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 评论弹窗 */}
      <Dialog open={!!commentTask} onOpenChange={(o) => !o && setCommentTask(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="size-4 text-primary" /> 任务评论
            </DialogTitle>
            <DialogDescription>{commentTask?.title}</DialogDescription>
          </DialogHeader>
          {commentTask && (
            <div className="space-y-3">
              <div className="max-h-64 space-y-3 overflow-y-auto pr-1">
                <CollabTaskCommentList comments={commentList} loading={commentsLoading} emptyText="暂无评论，来发表第一条吧" />
              </div>
              <div className="flex items-end gap-2">
                <Textarea
                  rows={2}
                  value={commentInput}
                  placeholder="输入评论，Ctrl + Enter 快速发送"
                  className="flex-1"
                  onChange={(e) => setCommentInput(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') handleSendComment();
                  }}
                />
                <Button size="sm" onClick={handleSendComment} disabled={sending}>
                  {sending ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />} 发送
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
