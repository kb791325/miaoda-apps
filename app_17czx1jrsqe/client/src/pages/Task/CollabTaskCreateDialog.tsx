import { useEffect, useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { t } from '@/lib/i18n';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';

const PRIORITY_OPTIONS = ['高', '中', '低'];
const STATUS_OPTIONS = ['未开始', '进行中', '已完成', '已延期'];

const emptyForm = {
  title: '',
  owner: '',
  collaborators: '',
  priority: '中',
  deadline: '',
  status: '未开始',
  description: '',
};

function toDate(value: string): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return isNaN(d.getTime()) ? undefined : d;
}

export default function CollabTaskCreateDialog({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({ ...emptyForm });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [creating, setCreating] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({ ...emptyForm });
      setErrors({});
      setCalendarOpen(false);
    }
  }, [open]);

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!form.title.trim()) next.title = '请输入任务标题';
    if (!form.owner.trim()) next.owner = '请输入负责人';
    if (!form.deadline) next.deadline = '请选择截止日期';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleCreate = async () => {
    if (!validate()) return;
    setCreating(true);
    try {
      const res = await collabTasksApi.create({
        task_no: `TK${Date.now().toString().slice(-8)}`,
        title: form.title.trim(),
        owner: form.owner.trim(),
        collaborators: form.collaborators.trim() || form.owner.trim(),
        deadline: form.deadline,
        priority: form.priority,
        progress: 0,
        status: form.status,
        description: form.description.trim(),
      });
      if (res.code === 0) {
        toast.success('协作任务创建成功');
        onSuccess();
      } else {
        toast.error(res.message || '创建失败');
      }
    } catch (e) {
      toast.error(extractErrorMessage(e));
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>新建协作任务</DialogTitle>
          <DialogDescription>填写任务信息并分配负责人</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>任务标题 <span className="text-destructive">*</span></Label>
            <Input
              value={form.title}
              placeholder="如：Q3 行业投放素材整理"
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
            {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>负责人 <span className="text-destructive">*</span></Label>
              <Input
                value={form.owner}
                placeholder="负责人姓名"
                onChange={(e) => setForm((f) => ({ ...f, owner: e.target.value }))}
              />
              {errors.owner && <p className="text-xs text-destructive">{errors.owner}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>协作人</Label>
              <Input
                value={form.collaborators}
                placeholder="多人用顿号分隔，默认同负责人"
                onChange={(e) => setForm((f) => ({ ...f, collaborators: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>优先级</Label>
              <Select value={form.priority} onValueChange={(v) => setForm((f) => ({ ...f, priority: v }))}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((p: string) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>状态</Label>
              <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s: string) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>截止日期 <span className="text-destructive">*</span></Label>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start font-normal">
                  <CalendarIcon className="mr-2 size-4 text-muted-foreground" />
                  {form.deadline || '选择日期'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={toDate(form.deadline)}
                  onSelect={(d) => {
                    if (d) {
                      setForm((f) => ({ ...f, deadline: format(d, 'yyyy-MM-dd') }));
                      setCalendarOpen(false);
                    }
                  }}
                />
              </PopoverContent>
            </Popover>
            {errors.deadline && <p className="text-xs text-destructive">{errors.deadline}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>任务描述</Label>
            <Textarea
              rows={3}
              value={form.description}
              placeholder="补充任务背景、目标与验收标准（选填）"
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t('取消')}</Button>
          <Button onClick={handleCreate} disabled={creating}>
            {creating ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : <Plus className="size-4" />}
            {t('创建任务')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
