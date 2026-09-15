import { useCallback, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Briefcase, Calendar, ChevronRight, GripVertical, LayoutList, LayoutDashboard, MessageSquare, Plus, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useModuleData } from '@/lib/data-service';
import { updateRecordInBitable } from '@/lib/mt-client';
import { recordAuditLog } from '@/lib/audit-log';
import { val } from '@/lib/analytics';
import { formatUserName } from '@/lib/user-names';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const COLUMNS = [
  { key: '待处理', label: '待处理', color: 'bg-muted' },
  { key: '进行中', label: '进行中', color: 'bg-blue-50' },
  { key: '已完成', label: '已完成', color: 'bg-green-50' },
  { key: '已取消', label: '已取消', color: 'bg-slate-100' },
] as const;

const PRIORITY_BADGE: Record<string, { variant: 'default' | 'secondary' | 'outline'; label: string }> = {
  高: { variant: 'default', label: '高' },
  中: { variant: 'secondary', label: '中' },
  低: { variant: 'outline', label: '低' },
};

/** 任务中心 · 协作任务看板(按状态分列 + 拖拽移动 + 评论) */
export default function KanbanBoardPage() {
  const { records, loading, update } = useModuleData('task');
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [commentOpen, setCommentOpen] = useState(false);
  const [commentRecord, setCommentRecord] = useState<{ id: string; title: string } | null>(null);
  const [commentText, setCommentText] = useState('');

  const columns = useMemo(() => {
    const map: Record<string, typeof records> = {};
    COLUMNS.forEach((col) => { map[col.key] = []; });
    records.forEach((r) => {
      const status = val(r, 'task', '任务状态') || '待处理';
      if (map[status]) map[status].push(r);
      else map['待处理'].push(r);
    });
    return map;
  }, [records]);

  const handleDragStart = useCallback((recordId: string) => {
    setDraggingId(recordId);
  }, []);

  const handleDrop = useCallback(async (colKey: string) => {
    if (!draggingId) return;
    setDragOverCol(null);
    try {
      await updateRecordInBitable('task', draggingId, { '任务状态': colKey });
      update(draggingId, { '任务状态': colKey });
      recordAuditLog({ action: '状态流转', module: 'task', description: `任务移至「${colKey}」列` });
      toast.success(`已移至「${colKey}」`);
    } catch {
      toast.error('移动失败，请重试');
    }
    setDraggingId(null);
  }, [draggingId, update]);

  const openComment = (r: typeof records[number]) => {
    setCommentRecord({ id: r.recordId, title: val(r, 'task', '任务名称') || '未命名任务' });
    setCommentText('');
    setCommentOpen(true);
  };

  const submitComment = async () => {
    if (!commentRecord || !commentText.trim()) return;
    recordAuditLog({ action: '评论', module: 'task', description: `任务「${commentRecord.title}」新增评论: ${commentText.slice(0, 20)}...` });
    toast.success('评论已记录');
    setCommentOpen(false);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-56" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-[400px]" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">协作任务看板</h2>
          <p className="mt-1 text-sm text-muted-foreground">拖拽卡片移动任务状态，点击可查看详情或评论</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border border-border/60 bg-muted/50 p-0.5">
            <Button
              variant={viewMode === 'kanban' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-8"
              onClick={() => setViewMode('kanban')}
            >
              <LayoutDashboard className="size-4" />
              看板
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-8"
              onClick={() => setViewMode('list')}
            >
              <LayoutList className="size-4" />
              列表
            </Button>
          </div>
          <Button asChild size="sm">
            <Link to="/tasks/new"><Plus className="size-4" />新建任务</Link>
          </Button>
        </div>
      </div>

      {viewMode === 'list' ? (
        <Card>
          <CardContent className="p-0">
            <div className="w-full overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">任务名称</TableHead>
                    <TableHead className="whitespace-nowrap">状态</TableHead>
                    <TableHead className="whitespace-nowrap">优先级</TableHead>
                    <TableHead className="whitespace-nowrap">负责人</TableHead>
                    <TableHead className="whitespace-nowrap">截止日期</TableHead>
                    <TableHead className="whitespace-nowrap">关联模块</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((r) => {
                    const status = val(r, 'task', '任务状态') || '—';
                    const priority = val(r, 'task', '优先级') || '—';
                    const owner = val(r, 'task', '负责人') || '';
                    const due = val(r, 'task', '截止日期') || '';
                    const overdue = due && status !== '已完成' && status !== '已取消' && due < new Date().toISOString().slice(0, 10);
                    return (
                      <TableRow key={r.recordId} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/tasks/${r.recordId}`)}>
                        <TableCell className="font-medium">
                          <span className="block truncate max-w-[200px]">{val(r, 'task', '任务名称') || '未命名任务'}</span>
                        </TableCell>
                        <TableCell><Badge variant="secondary" className="text-xs">{status}</Badge></TableCell>
                        <TableCell>
                          <Badge variant={priority === '高' ? 'default' : priority === '中' ? 'secondary' : 'outline'} className="text-xs">{priority}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">{formatUserName(owner)}</TableCell>
                        <TableCell className={overdue ? 'font-medium text-destructive' : 'text-muted-foreground'}>
                          {due || '—'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{val(r, 'task', '关联模块') || '—'}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {COLUMNS.map((col) => {
          const items = columns[col.key] ?? [];
          const isOver = dragOverCol === col.key;
          return (
            <div
              key={col.key}
              className={`flex flex-col rounded-lg border ${isOver ? 'border-primary ring-2 ring-primary/20' : 'border-border/60'} ${col.color} min-h-[300px]`}
              onDragOver={(e) => { e.preventDefault(); setDragOverCol(col.key); }}
              onDragLeave={() => setDragOverCol(null)}
              onDrop={() => { void handleDrop(col.key); }}
            >
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{col.label}</span>
                  <Badge variant="secondary" className="text-[10px]">{items.length}</Badge>
                </div>
              </div>
              <div className="flex-1 space-y-2 px-2 pb-2">
                {items.map((r) => {
                  const priority = val(r, 'task', '优先级');
                  const pMeta = PRIORITY_BADGE[priority] ?? PRIORITY_BADGE.低;
                  const due = val(r, 'task', '截止日期');
                  const overdue = due && col.key !== '已完成' && col.key !== '已取消' && due < new Date().toISOString().slice(0, 10);
                  return (
                    <Card
                      key={r.recordId}
                      className={`cursor-grab transition-shadow active:cursor-grabbing ${draggingId === r.recordId ? 'opacity-50' : 'hover:shadow-sm'}`}
                      draggable
                      onDragStart={() => handleDragStart(r.recordId)}
                    >
                      <CardContent className="space-y-2 p-3">
                        <div className="flex items-start gap-2">
                          <GripVertical className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/50" />
                          <Link to={`/tasks/${r.recordId}`} className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium leading-snug hover:text-primary">
                              {val(r, 'task', '任务名称') || '未命名任务'}
                            </p>
                          </Link>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                          <Badge variant={pMeta.variant} className="text-[10px]">{pMeta.label}</Badge>
                          {val(r, 'task', '关联模块') ? (
                            <Badge variant="outline" className="text-[10px]">{val(r, 'task', '关联模块')}</Badge>
                          ) : null}
                          {due ? (
                            <span className={`inline-flex items-center gap-1 ${overdue ? 'font-medium text-destructive' : 'text-muted-foreground'}`}>
                              <Calendar className="size-3" />{due}
                            </span>
                          ) : null}
                        </div>
                        <div className="flex items-center justify-between border-t border-border/30 pt-2">
                          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                            <User className="size-3" />{formatUserName(val(r, 'task', '负责人') || '')}
                          </span>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-6"
                              onClick={(e) => { e.preventDefault(); openComment(r); }}
                            >
                              <MessageSquare className="size-3.5 text-muted-foreground" />
                            </Button>
                            <Link to={`/tasks/${r.recordId}`} className="flex items-center">
                              <ChevronRight className="size-3.5 text-muted-foreground/50" />
                            </Link>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                {items.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Briefcase className="size-6 text-muted-foreground/30" />
                    <p className="mt-2 text-xs text-muted-foreground">暂无任务</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      )}

      {/* 评论弹窗 */}
      <Dialog open={commentOpen} onOpenChange={setCommentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>评论任务</DialogTitle>
            <DialogDescription>{commentRecord?.title}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <Input
              placeholder="输入评论内容..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCommentOpen(false)}>取消</Button>
            <Button onClick={submitComment}>提交评论</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}