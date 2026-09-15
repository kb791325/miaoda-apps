import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { MoreHorizontal, Pause, Play, Plus, RotateCcw, Search, SquareSlash } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import ReportCard from '@/components/ReportCard';
import SectionHeader from '@/components/SectionHeader';
import { TaskStatusBadge } from '@/components/StatusBadge';
import {
  ITask,
  IMAGE_MODEL_OPTIONS,
  RESOLUTION_OPTIONS,
  TASK_STATUS_OPTIONS,
  TTS_VOICE_OPTIONS,
  VIDEO_MODEL_OPTIONS,
} from '@/data/tasks';
import { addTask, loadTaskFilter, persistErrorText, saveTaskFilter, useWorkshop } from '@/lib/store';
import { transitionTask } from '@/lib/task-actions';

function CreateTaskDialog({ open, onOpenChange, defaultScript }: { open: boolean; onOpenChange: (v: boolean) => void; defaultScript: string }) {
  const { scripts } = useWorkshop();
  const scriptTitles = scripts.map((s) => s.scriptTitle);

  const [taskName, setTaskName] = useState('');
  const [linkedScript, setLinkedScript] = useState('');
  const [videoModel, setVideoModel] = useState('Seedance');
  const [imageModel, setImageModel] = useState('Seedream');
  const [ttsVoice, setTtsVoice] = useState('温柔女声');
  const [resolution, setResolution] = useState('1080P');
  const [estimated, setEstimated] = useState('');
  const [notes, setNotes] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (open) {
      setTaskName('');
      setLinkedScript(defaultScript || scriptTitles[0] || '');
      setVideoModel('Seedance');
      setImageModel('Seedream');
      setTtsVoice('温柔女声');
      setResolution('1080P');
      setEstimated('');
      setNotes('');
    }
  }, [open, defaultScript]);

  async function handleCreate() {
    if (!taskName.trim()) {
      toast.error('请填写任务名称');
      return;
    }
    if (!linkedScript) {
      toast.error('请选择关联脚本');
      return;
    }
    setCreating(true);
    try {
      // 先写入多维表格，成功后才更新 UI / 关闭弹窗；失败保留表单供重试
      await addTask({
      taskName: taskName.trim(),
      status: 'pending',
      currentStage: '待生成',
      progressPercent: 0,
      linkedScript,
      videoModel,
      imageModel,
      ttsVoice,
      resolution,
      referenceImage: '',
      segmentVideos: [],
      finalVideo: '',
      estimatedFinishTime: estimated ? estimated.replace('T', ' ') : '',
      actualFinishTime: '',
      errorLog: '',
      notes: notes.trim(),
      });
      toast.success('任务已创建，状态：待生成');
      onOpenChange(false);
    } catch (error) {
      toast.error(persistErrorText(error, '任务创建失败，表单已保留'));
    } finally {
      setCreating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] gap-0 overflow-y-auto rounded-none p-6 sm:max-w-2xl">
        <DialogHeader className="mb-4 text-left">
          <DialogTitle className="text-sm font-bold text-slate-800">新建生成任务</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-1.5 md:col-span-2">
            <Label className="text-[10px] font-black uppercase tracking-tight text-slate-400">任务名称 *</Label>
            <Input value={taskName} onChange={(e) => setTaskName(e.target.value)} placeholder="如：AI教程视频生成04" className="rounded-none" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase tracking-tight text-slate-400">关联脚本 *</Label>
            <Select value={linkedScript} onValueChange={setLinkedScript}>
              <SelectTrigger className="w-full rounded-none"><SelectValue placeholder="选择脚本" /></SelectTrigger>
              <SelectContent className="rounded-none">
                {scriptTitles.length === 0 ? <SelectItem value="暂无脚本" disabled>暂无脚本</SelectItem> : scriptTitles.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase tracking-tight text-slate-400">视频生成模型</Label>
            <Select value={videoModel} onValueChange={setVideoModel}>
              <SelectTrigger className="w-full rounded-none"><SelectValue /></SelectTrigger>
              <SelectContent className="rounded-none">
                {VIDEO_MODEL_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase tracking-tight text-slate-400">图像生成模型</Label>
            <Select value={imageModel} onValueChange={setImageModel}>
              <SelectTrigger className="w-full rounded-none"><SelectValue /></SelectTrigger>
              <SelectContent className="rounded-none">
                {IMAGE_MODEL_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase tracking-tight text-slate-400">TTS 音色</Label>
            <Select value={ttsVoice} onValueChange={setTtsVoice}>
              <SelectTrigger className="w-full rounded-none"><SelectValue /></SelectTrigger>
              <SelectContent className="rounded-none">
                {TTS_VOICE_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase tracking-tight text-slate-400">分辨率</Label>
            <Select value={resolution} onValueChange={setResolution}>
              <SelectTrigger className="w-full rounded-none"><SelectValue /></SelectTrigger>
              <SelectContent className="rounded-none">
                {RESOLUTION_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase tracking-tight text-slate-400">预计完成时间（可选）</Label>
            <Input type="datetime-local" value={estimated} onChange={(e) => setEstimated(e.target.value)} className="rounded-none" />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label className="text-[10px] font-black uppercase tracking-tight text-slate-400">备注</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="任务备注信息" className="min-h-14 rounded-none" />
          </div>
        </div>

        <DialogFooter className="mt-5">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-none">取消</Button>
          <Button type="button" onClick={handleCreate} disabled={creating} className="rounded-none">{creating ? '创建中…' : '创建任务'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function TaskLibraryPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { tasks } = useWorkshop();
  const [searchParams] = useSearchParams();
  const [statusFilter, setStatusFilter] = useState(() => {
    const q = searchParams.get('status');
    return q && TASK_STATUS_OPTIONS.some((o) => o.value === q) ? q : loadTaskFilter();
  });
  const [keyword, setKeyword] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [defaultScript, setDefaultScript] = useState('');

  useEffect(() => {
    const linked = (location.state as { linkedScript?: string } | null)?.linkedScript;
    if (linked) {
      setDefaultScript(linked);
      setCreateOpen(true);
    }
  }, [location.state]);

  useEffect(() => {
    saveTaskFilter(statusFilter);
  }, [statusFilter]);

  const filtered = useMemo(() => {
    const kw = keyword.trim();
    return tasks.filter(
      (t) =>
        (statusFilter === 'all' || t.status === statusFilter) &&
        (!kw || t.taskName.toLowerCase().includes(kw.toLowerCase()) || t.linkedScript.toLowerCase().includes(kw.toLowerCase())),
    );
  }, [tasks, statusFilter, keyword]);

  const statusCount = useMemo(() => {
    const map: Record<string, number> = { all: tasks.length };
    TASK_STATUS_OPTIONS.forEach((o) => {
      map[o.value] = tasks.filter((t) => t.status === o.value).length;
    });
    return map;
  }, [tasks]);

  function actionFor(task: ITask): { action: 'start' | 'pause' | 'resume' | 'retry'; label: string } | null {
    switch (task.status) {
      case 'pending': return { action: 'start', label: '开始任务' };
      case 'running': return { action: 'pause', label: '暂停' };
      case 'paused': return { action: 'resume', label: '继续' };
      case 'failed': return { action: 'retry', label: '重试' };
      default: return null;
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <SectionHeader number="02" title="生成任务表" subtitle="AI video generation pipeline" />
        <Button type="button" className="mb-6 shrink-0 rounded-none" onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" /> 新建任务
        </Button>
      </div>

      {/* 筛选面板 */}
      <ReportCard className="p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative w-full md:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="搜索任务名称 / 关联脚本" className="rounded-none pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full rounded-none md:w-40"><SelectValue /></SelectTrigger>
            <SelectContent className="rounded-none">
              <SelectItem value="all">全部状态（{statusCount.all}）</SelectItem>
              {TASK_STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}（{statusCount[o.value] ?? 0}）</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="ml-auto text-[10px] font-bold text-slate-400">
            共 {filtered.length} / {tasks.length} 个任务（筛选条件已本地记忆）
          </div>
        </div>
      </ReportCard>

      {/* 任务表格 */}
      <ReportCard className="p-0">
        <div className="w-full overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-[#E2E8F0] hover:bg-transparent">
                <TableHead className="whitespace-nowrap py-2 text-[9px] font-black uppercase text-slate-400">任务名称</TableHead>
                <TableHead className="whitespace-nowrap text-[9px] font-black uppercase text-slate-400">状态</TableHead>
                <TableHead className="whitespace-nowrap text-[9px] font-black uppercase text-slate-400">当前阶段</TableHead>
                <TableHead className="whitespace-nowrap text-[9px] font-black uppercase text-slate-400">进度</TableHead>
                <TableHead className="whitespace-nowrap text-[9px] font-black uppercase text-slate-400">关联脚本</TableHead>
                <TableHead className="whitespace-nowrap text-[9px] font-black uppercase text-slate-400">视频模型</TableHead>
                <TableHead className="whitespace-nowrap text-[9px] font-black uppercase text-slate-400">预计完成</TableHead>
                <TableHead className="whitespace-nowrap text-right text-[9px] font-black uppercase text-slate-400">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-[11px] font-medium text-slate-400">当前筛选条件下没有任务</TableCell>
                </TableRow>
              ) : (
                filtered.map((task) => {
                  const act = actionFor(task);
                  return (
                    <TableRow key={task.id} className="border-b border-[#E2E8F0] transition-colors hover:bg-slate-50">
                      <TableCell className="max-w-[180px] py-2.5">
                        <Link to={`/tasks/${task.id}`} className="truncate text-xs font-bold text-[#0033A0] hover:underline">
                          {task.taskName}
                        </Link>
                      </TableCell>
                      <TableCell><TaskStatusBadge status={task.status} /></TableCell>
                      <TableCell><span className="text-[11px] font-medium text-slate-600">{task.currentStage}</span></TableCell>
                      <TableCell className="min-w-[120px]">
                        <div className="flex items-center gap-2">
                          <div className="h-1 w-16 bg-slate-100">
                            <div className={`h-full ${task.status === 'failed' ? 'bg-[#EF4444]' : 'bg-[#0033A0]'}`} style={{ width: `${task.progressPercent}%` }} />
                          </div>
                          <span className="text-xs font-mono text-slate-500">{task.progressPercent}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[150px]"><span className="block truncate text-[11px] font-medium text-slate-600">{task.linkedScript}</span></TableCell>
                      <TableCell><span className="text-[11px] font-medium text-slate-600">{task.videoModel}</span></TableCell>
                      <TableCell className="whitespace-nowrap text-[11px] font-medium text-slate-400">{task.estimatedFinishTime || '—'}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button type="button" variant="ghost" size="icon" className="size-7 rounded-none">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-none">
                            <DropdownMenuItem onClick={() => navigate(`/tasks/${task.id}`)}>查看详情</DropdownMenuItem>
                            {act && (
                              <DropdownMenuItem onClick={() => { void (async () => { await transitionTask(task, act.action); })(); }}>
                                {act.action === 'start' && <Play className="size-3.5" />}
                                {act.action === 'pause' && <Pause className="size-3.5" />}
                                {act.action === 'resume' && <Play className="size-3.5" />}
                                {act.action === 'retry' && <RotateCcw className="size-3.5" />}
                                {act.label}
                              </DropdownMenuItem>
                            )}
                            {task.status !== 'cancelled' && task.status !== 'completed' && (
                              <DropdownMenuItem className="text-[#EF4444]" onClick={() => { void (async () => { await transitionTask(task, 'cancel'); })(); }}>
                                <SquareSlash className="size-3.5" /> 取消任务
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </ReportCard>
      <CreateTaskDialog open={createOpen} onOpenChange={setCreateOpen} defaultScript={defaultScript} />
    </div>
  );
}
