import { useState, useMemo, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { CalendarClock, CheckCircle2, Circle, Loader, Play, Check, X, Square, CheckSquareIcon, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { toast } from 'sonner';
import { MODULES } from '@/config/modules';
import { useModuleData } from '@/lib/data-service';
import { val } from '@/lib/analytics';
import { formatUserName } from '@/lib/user-names';
import { recordAuditLog } from '@/lib/audit-log';
import {
  fetchAllApprovals,
  approveRecord,
  rejectRecord,
  getApprovalDetailUrl,
  ApprovalActionError,
  type ApprovalItem,
  type ApprovalFetchResult,
} from '@/lib/approval-cross-table';

const STATUS_TABS = ['全部', '待处理', '进行中', '已完成', '已取消'] as const;
const PRIORITY_TONE: Record<string, string> = { 高: 'bg-red-50 text-red-600', 中: 'bg-amber-50 text-amber-600', 低: 'bg-slate-100 text-slate-500' };
const STATUS_ICON: Record<string, typeof Circle> = { 待处理: Circle, 进行中: Play, 已完成: CheckCircle2, 已取消: Loader };

/** 任务中心 · 我的待办(左侧分类导航 + Tab + 批量处理 + 审批弹窗) */
export default function MyTodoPage() {
  const { records, loading } = useModuleData('task');
  const [tab, setTab] = useState<string>('全部');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [approvalRecord, setApprovalRecord] = useState<ApprovalItem | null>(null);
  const [approvalComment, setApprovalComment] = useState('');
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [approvalsLoading, setApprovalsLoading] = useState(true);

  const route = MODULES.task.route;

  const loadApprovals = useCallback(async () => {
    setApprovalsLoading(true);
    try {
      const result: ApprovalFetchResult = await fetchAllApprovals();
      setApprovals(result.items);
    } catch {
      setApprovals([]);
    } finally {
      setApprovalsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadApprovals();
  }, [loadApprovals]);

  const list = useMemo(() => {
    const filtered = tab === '全部' ? records : records.filter((r) => val(r, 'task', '任务状态') === tab);
    const order: Record<string, number> = { 进行中: 0, 待处理: 1, 已完成: 2, 已取消: 3 };
    return [...filtered].sort((a, b) => {
      const sa = order[val(a, 'task', '任务状态')] ?? 9;
      const sb = order[val(b, 'task', '任务状态')] ?? 9;
      if (sa !== sb) return sa - sb;
      return val(a, 'task', '截止日期').localeCompare(val(b, 'task', '截止日期'));
    });
  }, [records, tab]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { 全部: records.length };
    for (const t of STATUS_TABS) if (t !== '全部') c[t] = records.filter((r) => val(r, 'task', '任务状态') === t).length;
    return c;
  }, [records]);

  const approvalCount = approvals.length;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === list.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(list.map((r) => r.recordId)));
    }
  };

  const handleBatchMarkDone = async () => {
    if (selectedIds.size === 0) { toast.info('请先选择待办事项'); return; }
    let done = 0;
    for (const id of selectedIds) {
      try {
        await (await import('@/lib/mt-client')).updateRecordInBitable('task', id, { '任务状态': '已完成' });
        done++;
      } catch (e) { /* skip */ }
    }
    recordAuditLog({ action: '状态变更', module: 'task', description: `批量完成 ${done} 个待办任务` });
    toast.success(`已批量完成 ${done} 个待办任务`);
    setSelectedIds(new Set());
  };

  const handleApprove = async () => {
    if (!approvalRecord) return;
    try {
      await approveRecord(approvalRecord);
      recordAuditLog({ action: '审批', module: 'task', description: `审批通过: ${approvalRecord.title}` });
      toast.success('已审批通过');
      setApprovals((prev) => prev.filter((i) => i.recordId !== approvalRecord.recordId || i.config.moduleKey !== approvalRecord.config.moduleKey));
      setApprovalOpen(false);
    } catch (e) {
      toast.error(e instanceof ApprovalActionError ? e.message : '审批失败，请重试');
    }
  };

  const handleReject = async () => {
    if (!approvalRecord) return;
    try {
      await rejectRecord(approvalRecord);
      recordAuditLog({ action: '审批', module: 'task', description: `审批驳回: ${approvalRecord.title}` });
      toast.success('已驳回');
      setApprovals((prev) => prev.filter((i) => i.recordId !== approvalRecord.recordId || i.config.moduleKey !== approvalRecord.config.moduleKey));
      setApprovalOpen(false);
    } catch (e) {
      toast.error(e instanceof ApprovalActionError ? e.message : '驳回失败，请重试');
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-10 w-full max-w-xl" />
        {Array.from({ length: 4 }).map((_, i) => (<Skeleton key={i} className="h-20" />))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">我的待办</h2>
        <p className="mt-1 text-sm text-muted-foreground">跨模块协作任务按状态聚合，支持批量处理与审批</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[200px_1fr]">
        {/* 左侧分类导航 */}
        <aside className="hidden lg:block">
          <Card>
            <CardContent className="space-y-1 p-2">
              {STATUS_TABS.map((t) => (
                <NavLink key={t} active={tab === t} onClick={() => { setTab(t); setSelectedIds(new Set()); }}>
                  {t}
                  <Badge variant="secondary" className="ml-auto px-1.5 py-0 text-[10px]">{counts[t] ?? 0}</Badge>
                </NavLink>
              ))}
              <div className="my-2 border-t border-border/50" />
              <NavLink
                active={false}
                onClick={() => {
                  if (approvals.length > 0) setApprovalOpen(true);
                }}
              >
                待审批
                <Badge variant="destructive" className="ml-auto px-1.5 py-0 text-[10px]">{approvalsLoading ? '…' : approvalCount}</Badge>
              </NavLink>
            </CardContent>
          </Card>

          {/* 审批待办卡片流 */}
          {!approvalsLoading && approvals.length > 0 && (
            <div className="mt-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground px-1">审批待办</p>
              {approvals.map((item) => (
                <button
                  key={`${item.config.moduleKey}:${item.recordId}`}
                  type="button"
                  className="w-full text-left rounded-md border border-border bg-card p-2.5 hover:border-primary/40 transition-colors"
                  onClick={() => { setApprovalRecord(item); setApprovalOpen(true); }}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium truncate flex-1">{item.title}</span>
                    <Badge variant="secondary" className="text-[10px] px-1 py-0 shrink-0">{item.typeLabel}</Badge>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span>{item.submitter}</span>
                    <span>·</span>
                    <Badge variant="outline" className="text-[10px] px-1 py-0 border-amber-300 bg-amber-50 text-amber-700">{item.status}</Badge>
                  </div>
                </button>
              ))}
            </div>
          )}
        </aside>

        {/* 右侧主区 */}
        <div className="min-w-0 space-y-4">
          <Tabs value={tab} onValueChange={(v) => { setTab(v); setSelectedIds(new Set()); }}>
            <TabsList className="flex-wrap lg:hidden">
              {STATUS_TABS.map((t) => (
                <TabsTrigger key={t} value={t}>
                  {t}
                  <Badge variant="secondary" className="ml-1.5 px-1.5 py-0 text-[10px]">{counts[t] ?? 0}</Badge>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {/* 移动端审批待办 */}
          {!approvalsLoading && approvals.length > 0 && (
            <div className="lg:hidden space-y-2">
              <p className="text-xs font-medium text-muted-foreground">审批待办 ({approvalCount})</p>
              {approvals.map((item) => (
                <Card key={`${item.config.moduleKey}:${item.recordId}`} className="hover:border-primary/40 transition-colors">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        className="text-left text-sm font-medium text-primary hover:underline"
                        onClick={() => { setApprovalRecord(item); setApprovalOpen(true); }}
                      >
                        {item.title}
                      </button>
                      <Badge variant="secondary" className="text-[10px] shrink-0">{item.typeLabel}</Badge>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span>{item.submitter}</span>
                      <Badge variant="outline" className="text-[10px] px-1 py-0 border-amber-300 bg-amber-50 text-amber-700">{item.status}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* 批量操作栏 */}
          {list.length > 0 && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={toggleSelectAll}>
                {selectedIds.size === list.length ? <CheckSquareIcon className="size-4" /> : <Square className="size-4" />}
                <span className="ml-1.5">{selectedIds.size === list.length ? '取消全选' : '全选'}</span>
              </Button>
              {selectedIds.size > 0 && (
                <Button variant="default" size="sm" onClick={handleBatchMarkDone}>
                  <Check className="size-4" />
                  <span className="ml-1.5">批量完成 ({selectedIds.size})</span>
                </Button>
              )}
              <span className="ml-auto text-xs text-muted-foreground">共 {list.length} 项</span>
            </div>
          )}

          {list.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <CheckCircle2 className="size-8 text-muted-foreground/50" />
                <EmptyTitle>暂无任务</EmptyTitle>
                <EmptyDescription>当前分类下没有待办事项</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {list.map((r) => {
                const status = val(r, 'task', '任务状态') || '待处理';
                const priority = val(r, 'task', '优先级');
                const Icon = STATUS_ICON[status] ?? Circle;
                const due = val(r, 'task', '截止日期');
                const overdue = due && status !== '已完成' && status !== '已取消' && due < new Date().toISOString().slice(0, 10);
                const isSelected = selectedIds.has(r.recordId);
                return (
                  <Card key={r.recordId} className={`transition-colors hover:border-primary/40 ${isSelected ? 'border-primary ring-1 ring-primary/20' : ''}`}>
                    <CardContent className="flex items-start gap-3 p-4">
                      <button type="button" className="mt-0.5 shrink-0" onClick={(e) => { e.preventDefault(); toggleSelect(r.recordId); }}>
                        {isSelected ? <CheckSquareIcon className="size-4 text-primary" /> : <Square className="size-4 text-muted-foreground" />}
                      </button>
                      <Link to={`${route}/${r.recordId}`} className="flex min-w-0 flex-1 items-start gap-3">
                        <Icon className={`mt-0.5 size-4 shrink-0 ${status === '已完成' ? 'text-success' : 'text-primary'}`} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-sm font-medium">{val(r, 'task', '任务名称')}</span>
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                            <Badge variant="outline" className="gap-1 text-[11px]">
                              <Icon className="size-3" />{status}
                            </Badge>
                            {priority ? <span className={`rounded px-1.5 py-0.5 font-medium ${PRIORITY_TONE[priority] ?? 'bg-slate-100 text-slate-500'}`}>{priority}优先级</span> : null}
                            {val(r, 'task', '关联模块') ? <Badge variant="secondary" className="text-[11px]">{val(r, 'task', '关联模块')}</Badge> : null}
                            {due ? (
                              <span className={`inline-flex items-center gap-1 ${overdue ? 'font-medium text-destructive' : ''}`}>
                                <CalendarClock className="size-3" />{due}{overdue ? '（已逾期）' : ''}
                              </span>
                            ) : null}
                            {val(r, 'task', '负责人') ? <span>负责人：{formatUserName(val(r, 'task', '负责人'))}</span> : null}
                          </div>
                        </div>
                        <ChevronRight className="size-4 shrink-0 self-center text-muted-foreground/50" />
                      </Link>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* 审批弹窗 */}
          <Dialog open={approvalOpen} onOpenChange={setApprovalOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {approvalRecord ? `审批: ${approvalRecord.typeLabel} - ${approvalRecord.title}` : '审批'}
                </DialogTitle>
                <DialogDescription>
                  {approvalRecord ? `${approvalRecord.submitter} · ${approvalRecord.status}` : ''}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-4">
                <p className="text-sm text-muted-foreground">{approvalRecord?.title}</p>
                <Textarea
                  placeholder="审批意见（可选）"
                  value={approvalComment}
                  onChange={(e) => setApprovalComment(e.target.value)}
                  rows={3}
                />
              </div>
              <DialogFooter className="flex gap-2">
                <Button variant="outline" onClick={() => setApprovalOpen(false)}>取消</Button>
                <Button variant="destructive" onClick={handleReject}><X className="size-4" />驳回</Button>
                <Button onClick={handleApprove}><Check className="size-4" />通过</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}

/** 左侧导航项 */
function NavLink({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors ${
        active ? 'bg-accent font-medium text-accent-foreground' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
      }`}
    >
      {children}
    </button>
  );
}