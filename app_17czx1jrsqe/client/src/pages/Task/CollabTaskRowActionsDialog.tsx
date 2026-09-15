import { useEffect, useState } from 'react';
import { CalendarClock, Loader2, Percent, User } from 'lucide-react';
import { toast } from 'sonner';
import dayjs from 'dayjs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { collabTasksApi } from '@/api';
import { extractErrorMessage } from '@/lib/error-utils';

export interface CollabTask {
  id: number;
  task_no: string;
  title: string;
  owner: string;
  collaborators: string;
  deadline: string;
  priority: string;
  status: string;
  progress: number;
  description?: string;
}

export interface EmployeeOption {
  name: string;
  department: string;
}

export type RowActionMode = 'owner' | 'progress' | 'deadline';

interface CollabTaskRowActionsDialogProps {
  task: CollabTask | null;
  mode: RowActionMode | null;
  employees: EmployeeOption[];
  onClose: () => void;
  onSuccess: () => void;
}

const MODE_META: Record<RowActionMode, { title: string; description: string; icon: React.ReactNode }> = {
  owner: { title: '分配负责人', description: '从员工列表中选择新的任务负责人', icon: <User className="size-4 text-primary" /> },
  progress: { title: '更新进度', description: '填写 0-100 之间的整数进度', icon: <Percent className="size-4 text-primary" /> },
  deadline: { title: '修改截止日期', description: '选择新的任务截止日期', icon: <CalendarClock className="size-4 text-primary" /> },
};

export default function CollabTaskRowActionsDialog({
  task,
  mode,
  employees,
  onClose,
  onSuccess,
}: CollabTaskRowActionsDialogProps) {
  const [owner, setOwner] = useState('');
  const [progress, setProgress] = useState('');
  const [deadline, setDeadline] = useState<Date | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!task || !mode) return;
    if (mode === 'owner') setOwner(task.owner || '');
    if (mode === 'progress') setProgress(String(task.progress ?? 0));
    if (mode === 'deadline') setDeadline(task.deadline ? dayjs(task.deadline).toDate() : undefined);
  }, [task, mode]);

  if (!task || !mode) return null;

  const meta = MODE_META[mode];

  const buildPatch = (): Record<string, unknown> | null => {
    if (mode === 'owner') {
      if (!owner) {
        toast.warning('请选择负责人');
        return null;
      }
      return { owner };
    }
    if (mode === 'progress') {
      const n = Number(progress.trim());
      if (progress.trim() === '' || Number.isNaN(n) || n < 0 || n > 100) {
        toast.warning('请输入 0-100 之间的进度值');
        return null;
      }
      return { progress: Math.round(n) };
    }
    if (!deadline) {
      toast.warning('请选择截止日期');
      return null;
    }
    return { deadline: dayjs(deadline).format('YYYY-MM-DD') };
  };

  const handleConfirm = async () => {
    if (saving) return;
    const patch = buildPatch();
    if (!patch) return;
    setSaving(true);
    try {
      const res = await collabTasksApi.update(task.id, patch);
      if (res.code === 0) {
        toast.success(`${meta.title}成功`);
        onSuccess();
      } else {
        toast.error(res.message || `${meta.title}失败`);
      }
    } catch (e) {
      toast.error(extractErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o: boolean) => { if (!o && !saving) onClose(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">{meta.icon} {meta.title}</DialogTitle>
          <DialogDescription>
            {task.task_no} · {task.title}（{meta.description}）
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {mode === 'owner' && (
            <div className="space-y-2">
              <Label>负责人</Label>
              <Select value={owner} onValueChange={setOwner}>
                <SelectTrigger><SelectValue placeholder="请选择负责人" /></SelectTrigger>
                <SelectContent>
                  {employees.map((e: EmployeeOption) => (
                    <SelectItem key={`${e.name}-${e.department}`} value={e.name}>
                      {e.name}{e.department ? ` · ${e.department}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {mode === 'progress' && (
            <div className="space-y-2">
              <Label>进度（%）</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={progress}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProgress(e.target.value)}
                placeholder="0-100"
              />
            </div>
          )}

          {mode === 'deadline' && (
            <div className="space-y-2">
              <Label>截止日期</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start font-normal">
                    <CalendarClock className="size-3.5" />
                    {deadline ? dayjs(deadline).format('YYYY-MM-DD') : '选择日期'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={deadline} onSelect={setDeadline} />
                </PopoverContent>
              </Popover>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>取消</Button>
          <Button onClick={handleConfirm} disabled={saving}>
            {saving && <Loader2 className="mr-1.5 size-4 animate-spin" />}
            确认
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
