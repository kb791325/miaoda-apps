import { useState, useEffect, useCallback } from 'react';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogDescription,
} from '@client/src/components/ui/dialog';
import { Progress } from '@client/src/components/ui/progress';
import { Badge } from '@client/src/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import {
  Plus,
  Search,
  ClipboardList,
  CheckCircle,
  ChevronUp,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import {
  getInventoryTasks,
  getInventoryChecks,
  completeInventoryTask,
  regenerateInventoryChecks,
  resetInventoryChecks,
  clearAllInventoryTasks,
} from '@client/src/api/inventory';
import { InventoryTaskCard } from './InventoryTaskCard';
import { CreateTaskDialog } from './CreateTaskDialog';
import { CheckExecutionTable } from './CheckExecutionTable';
import { DiffSummaryPanel } from './DiffSummaryPanel';
import type {
  InventoryTaskItem,
  InventoryCheckItem,
} from '@shared/api.interface';

const STATUS_OPTIONS = [
  { value: '', label: '全部状态' },
  { value: 'pending', label: '待开始' },
  { value: 'in_progress', label: '进行中' },
  { value: 'completed', label: '已完成' },
  { value: 'abnormal', label: '异常' },
];

const InventoryChecksPage = () => {
  const [tasks, setTasks] = useState<InventoryTaskItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [checks, setChecks] = useState<InventoryCheckItem[]>([]);
  const [checksLoading, setChecksLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [clearAllDialogOpen, setClearAllDialogOpen] = useState(false);
  const [clearingAll, setClearingAll] = useState(false);

  const selectedTask = tasks.find((t) => t.id === selectedTaskId) || null;

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (statusFilter) params.status = statusFilter;
      if (monthFilter) params.checkMonth = monthFilter;
      if (searchQuery) params.keyword = searchQuery;
      const res = await getInventoryTasks(params);
      setTasks(res.items || []);
    } catch (err) {
      logger.error('load tasks failed', err as Error);
      toast.error('加载盘点任务失败');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, monthFilter, searchQuery]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const loadChecks = useCallback(
    async (taskId: string) => {
      setChecksLoading(true);
      try {
        const res = await getInventoryChecks(taskId);
        setChecks(res.items || []);
      } catch (err) {
        logger.error('load checks failed', err as Error);
        toast.error('加载盘点明细失败');
      } finally {
        setChecksLoading(false);
      }
    },
    []
  );

  const handleSelectTask = (task: InventoryTaskItem) => {
    if (selectedTaskId === task.id) {
      setSelectedTaskId(null);
      setChecks([]);
      setShowSummary(false);
    } else {
      setSelectedTaskId(task.id);
      setShowSummary(task.status === 'completed');
      loadChecks(task.id);
    }
  };

  const handleCreated = async (task: { id: string; taskNo: string; totalCount: number }) => {
    setSelectedTaskId(task.id);
    setShowSummary(false);
    toast.success(`任务创建成功，已生成 ${task.totalCount} 条检查项`);
    try {
      await loadTasks();
    } catch (err) {
      logger.error('reload tasks failed', err as Error);
      toast.error('刷新任务列表失败');
    }
    loadChecks(task.id);
  };

  const handleCheckUpdated = (item: InventoryCheckItem) => {
    setChecks((prev) => prev.map((c) => (c.id === item.id ? item : c)));
  };

  const handleCompleteTask = async () => {
    if (!selectedTaskId) return;
    setCompleting(true);
    try {
      const res = await completeInventoryTask(selectedTaskId);
      const lines = [
        `盘点任务已提交完成`,
        `已盘点 ${res.checkedCount} / ${res.totalCount} 项`,
        `已更新 ${res.updatedAssetCount} 条固定资产数据`,
      ];
      if (res.unmatchedAssetCount > 0) {
        lines.push(`${res.unmatchedAssetCount} 条资产未匹配`);
      }
      toast.success(lines.join('，'));
      setCompleteDialogOpen(false);
      setShowSummary(true);
      loadTasks();
      loadChecks(selectedTaskId);
    } catch {
      toast.error('提交失败，请重试');
    } finally {
      setCompleting(false);
    }
  };

  const handleDiffConfirmed = (item: InventoryCheckItem) => {
    setChecks((prev) => prev.map((c) => (c.id === item.id ? item : c)));
  };

  const handleRegenerateChecks = async () => {
    if (!selectedTaskId) return;
    setRegenerating(true);
    try {
      const res = await regenerateInventoryChecks(selectedTaskId);
      toast.success(`已重新生成 ${res.totalCount} 条检查项`);
      await loadTasks();
      loadChecks(selectedTaskId);
    } catch (err) {
      logger.error('regenerate checks failed', err as Error);
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || '重新生成检查项失败';
      toast.error(msg);
    } finally {
      setRegenerating(false);
    }
  };

  const handleResetChecks = async () => {
    if (!selectedTaskId) return;
    setResetting(true);
    try {
      const res = await resetInventoryChecks(selectedTaskId);
      toast.success(`盘点已重置，共 ${res.resetCount} 条检查项恢复为待盘点`);
      setResetDialogOpen(false);
      await loadTasks();
      loadChecks(selectedTaskId);
    } catch (err) {
      logger.error('reset checks failed', err as Error);
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || '重置盘点失败';
      toast.error(msg);
    } finally {
      setResetting(false);
    }
  };

  const handleClearAll = async () => {
    setClearingAll(true);
    try {
      const res = await clearAllInventoryTasks();
      toast.success(`已清空 ${res.deletedCount} 个盘点任务`);
      setClearAllDialogOpen(false);
      setSelectedTaskId(null);
      setChecks([]);
      setShowSummary(false);
      await loadTasks();
    } catch (err) {
      logger.error('clear all tasks failed', err as Error);
      toast.error('清空失败');
    } finally {
      setClearingAll(false);
    }
  };

  const checkedCount = checks.filter(
    (c) => c.status !== 'pending' && c.status !== 'unchecked'
  ).length;
  const totalCount = checks.length;

  const taskCompleted = selectedTask?.status === 'completed' || showSummary;

  return (
    <div className="space-y-4">
      {/* 顶部标题栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ClipboardList className="size-5 text-primary" />
          <h1 className="text-xl font-semibold text-foreground mb-6">
            资产盘点执行
          </h1>
          <Badge
            variant="outline"
            className="rounded-sm border-border bg-muted text-muted-foreground font-normal"
          >
            共 {tasks.length} 个任务
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setClearAllDialogOpen(true)}
            className="rounded-sm text-muted-foreground hover:text-destructive"
          >
            清空所有盘点数据
          </Button>
          <Button
            onClick={() => setCreateOpen(true)}
            className="rounded-sm"
            data-ai-section-type="button"
          >
            <Plus className="size-4" />
            创建盘点任务
          </Button>
        </div>
      </div>

      {/* 筛选栏 */}
      <div className="flex items-center gap-3 p-3 rounded-sm border border-border bg-card">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">状态：</span>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[120px] h-9 rounded-sm">
              <SelectValue placeholder="全部状态" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">月份：</span>
          <Input
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            placeholder="YYYY-MM"
            className="w-[130px] h-9 rounded-sm font-mono"
          />
        </div>

        <div className="flex-1 max-w-xs ml-auto">
          <div className="relative">
            <Search className="size-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索盘点单号..."
              className="pl-8 h-9 rounded-sm"
            />
          </div>
        </div>
      </div>

      {/* 任务卡片列表 */}
      {loading ? (
        <div className="py-12 text-center text-muted-foreground">
          加载中...
        </div>
      ) : tasks.length === 0 ? (
        <div className="py-12 text-center rounded-sm border border-dashed border-border bg-card text-muted-foreground">
          暂无盘点任务，点击「创建盘点任务」开始
        </div>
      ) : (
        <div
          className="grid grid-cols-3 gap-4"
          data-ai-section-type="card-list"
        >
          {tasks.map((task) => (
            <InventoryTaskCard
              key={task.id}
              task={task}
              selected={selectedTaskId === task.id}
              onClick={() => handleSelectTask(task)}
            />
          ))}
        </div>
      )}

      {/* 盘点执行区 */}
      {selectedTask && (
        <div className="mt-4 rounded-sm border border-primary bg-card overflow-hidden">
          {/* 顶部信息栏 */}
          <div className="flex items-center justify-between px-4 py-3 bg-primary/10 border-b border-primary">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <ClipboardList className="size-4 text-primary" />
                <span className="font-mono text-lg font-semibold text-foreground">
                  {selectedTask.taskNo}
                </span>
              </div>
              <Badge
                variant="outline"
                className="rounded-sm border-border bg-card text-muted-foreground"
              >
                {selectedTask.checkMonth}
              </Badge>
              <div className="flex items-center gap-2 w-[200px]">
                <Progress
                  value={
                    totalCount > 0
                      ? (checkedCount / totalCount) * 100
                      : 0
                  }
                  className="h-1.5 flex-1 rounded-none bg-muted"
                />
                <span className="text-xs font-mono text-muted-foreground min-w-[40px] text-right">
                  {checkedCount}/{totalCount}
                </span>
              </div>
              {selectedTask.status === 'completed' && (
                <Badge
                  variant="outline"
                  className="rounded-sm bg-success/10 text-success border-success/30"
                >
                  <CheckCircle className="size-3 mr-1" />
                  已完成
                </Badge>
              )}
            </div>
             <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setResetDialogOpen(true)}
                  disabled={resetting}
                  className="rounded-sm"
                >
                  <RefreshCw className={`size-3.5 mr-1.5 ${resetting ? 'animate-spin' : ''}`} />
                  重置盘点
                </Button>
                {!taskCompleted && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRegenerateChecks}
                      disabled={regenerating}
                      className="rounded-sm"
                    >
                      <RefreshCw className={`size-3.5 mr-1.5 ${regenerating ? 'animate-spin' : ''}`} />
                      重新生成
                    </Button>
                    <Button
                      onClick={() => setCompleteDialogOpen(true)}
                      size="sm"
                      className="rounded-sm"
                    >
                      <CheckCircle className="size-4" />
                      全部完成并提交
                    </Button>
                  </>
                )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedTaskId(null);
                  setChecks([]);
                  setShowSummary(false);
                }}
                className="rounded-sm"
              >
                <ChevronUp className="size-4" />
                收起
              </Button>
            </div>
          </div>

           <div className="p-4 space-y-4">
             {checksLoading ? (
               <div className="py-12 text-center text-muted-foreground">
                 加载盘点明细中...
               </div>
             ) : checks.length === 0 && !showSummary && !taskCompleted ? (
               <div className="py-16 flex flex-col items-center gap-3 text-center border border-dashed border-border rounded-sm bg-muted/20">
                 <ClipboardList className="size-8 text-muted-foreground/50" />
                 <div className="text-sm text-muted-foreground">
                   暂无盘点检查项
                 </div>
                 <div className="text-xs text-muted-foreground/70">
                   当前任务尚未生成检查项，可从固定资产表重新拉取生成
                 </div>
                 <Button
                   size="sm"
                   onClick={handleRegenerateChecks}
                   disabled={regenerating}
                   className="rounded-sm mt-1"
                 >
                   <RefreshCw className={`size-3.5 mr-1.5 ${regenerating ? 'animate-spin' : ''}`} />
                   {regenerating ? '生成中...' : '重新生成检查项'}
                 </Button>
               </div>
             ) : showSummary || taskCompleted ? (
              <DiffSummaryPanel
                checks={checks}
                totalCount={totalCount}
                checkedCount={checkedCount}
                onConfirmed={handleDiffConfirmed}
              />
            ) : (
              <>
                <CheckExecutionTable
                  checks={checks}
                  loading={checksLoading}
                  taskCompleted={taskCompleted}
                  onUpdated={handleCheckUpdated}
                />

                <div className="flex justify-end pt-2">
                  <Button
                    onClick={() => setCompleteDialogOpen(true)}
                    className="rounded-sm"
                  >
                    <CheckCircle className="size-4" />
                    全部完成并提交
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 创建任务弹窗 */}
      <CreateTaskDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={handleCreated}
      />

      {/* 完成确认弹窗 */}
      <Dialog
        open={completeDialogOpen}
        onOpenChange={setCompleteDialogOpen}
      >
        <DialogContent className="max-w-md rounded-sm">
          <DialogHeader>
            <DialogTitle>确认完成盘点</DialogTitle>
            <DialogDescription>
              提交后盘点任务将标记为已完成，无法继续修改盘点数据。
              当前已完成 {checkedCount} / {totalCount} 项。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" className="rounded-sm">
                取消
              </Button>
            </DialogClose>
            <Button
              onClick={handleCompleteTask}
              disabled={completing}
              className="rounded-sm"
            >
              {completing ? '提交中...' : '确认提交'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 重置盘点确认弹窗 */}
      <Dialog
        open={resetDialogOpen}
        onOpenChange={setResetDialogOpen}
      >
        <DialogContent className="max-w-md rounded-sm">
          <DialogHeader>
            <DialogTitle>确认重置盘点</DialogTitle>
            <DialogDescription>
              确定要重置当前盘点任务吗？所有检查项的实盘数量将被清空，状态恢复为待盘点，任务重回进行中。此操作不影响固定资产数据。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" className="rounded-sm">
                取消
              </Button>
            </DialogClose>
            <Button
              onClick={handleResetChecks}
              disabled={resetting}
              className="rounded-sm bg-warning hover:bg-warning/90 text-warning-foreground"
            >
              {resetting ? '重置中...' : '确认重置'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 清空所有盘点数据确认弹窗 */}
      <Dialog
        open={clearAllDialogOpen}
        onOpenChange={setClearAllDialogOpen}
      >
        <DialogContent className="max-w-md rounded-sm">
          <DialogHeader>
            <DialogTitle>清空所有盘点数据</DialogTitle>
            <DialogDescription>
              确定要清空所有盘点任务和检查项吗？所有数据将被删除，此操作不可恢复。
              当前共 {tasks.length} 个盘点任务。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" className="rounded-sm">
                取消
              </Button>
            </DialogClose>
            <Button
              onClick={handleClearAll}
              disabled={clearingAll}
              className="rounded-sm bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {clearingAll ? '清空中...' : '确认清空'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InventoryChecksPage;
