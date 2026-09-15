import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@client/src/components/ui/dialog';
import { Button } from '@client/src/components/ui/button';
import { Label } from '@client/src/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import { Calendar, Users, PlayCircle, Hash } from 'lucide-react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';
import type { CreateInventoryTaskResponse } from '@shared/api.interface';
import { createInventoryTask } from '@client/src/api/inventory';

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (task: CreateInventoryTaskResponse) => void;
}

const MONTH_OPTIONS = (() => {
  const now = new Date();
  const year = now.getFullYear();
  return Array.from({ length: 12 }, (_, i) => {
    const m = String(i + 1).padStart(2, '0');
    return `${year}-${m}`;
  });
})();

const SCOPE_OPTIONS = [
  { value: 'all', label: '全部资产' },
  { value: 'department', label: '按部门' },
  { value: 'floor', label: '按楼层' },
  { value: 'asset_type', label: '按类目' },
  { value: 'owner', label: '按归属人' },
];

const ASSIGNEE_OPTIONS = [
  { value: 'asset_owner', label: '资产负责人' },
  { value: 'admin', label: '管理员统一盘点' },
  { value: 'department_head', label: '部门负责人' },
];

export function CreateTaskDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateTaskDialogProps) {
  const defaultMonth = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);
  const [month, setMonth] = useState(defaultMonth);
  const [scope, setScope] = useState<string>('all');
  const [assigneeType, setAssigneeType] = useState('asset_owner');
  const [submitting, setSubmitting] = useState(false);

  const previewNo = `CK-${month.replace('-', '')}-XXXX`;
  const defaultTaskName = `${month} 固定资产盘点`;

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const [year, monthStr] = month.split('-');
      const res = await createInventoryTask({
        taskName: defaultTaskName,
        checkYear: Number(year),
        checkMonth: month,
        scopeType: scope as 'all' | 'department' | 'owner' | 'floor' | 'asset_type',
      });
      onCreated(res);
      onOpenChange(false);
    } catch (err) {
      logger.error('create task failed', err as Error);
      toast.error('创建盘点任务失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg rounded-sm">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            <PlayCircle className="size-4 text-primary" />
            创建盘点任务
          </DialogTitle>
          <DialogDescription className="text-xs">
            配置盘点范围与负责人，系统将自动分配盘点任务
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="bg-primary/5 border border-primary/20 rounded-sm p-3">
            <div className="flex items-center gap-2 text-xs text-foreground mb-1.5">
              <Hash className="size-3.5 text-primary" />
              <span className="font-medium">任务编号</span>
            </div>
            <div className="font-mono text-sm text-foreground">
              {previewNo}
            </div>
            <div className="text-xs text-muted-foreground mt-1.5">
              创建时由系统自动生成，序号按当月已创建任务数递增
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">盘点月份</Label>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTH_OPTIONS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">盘点范围</Label>
              <Select value={scope} onValueChange={setScope}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCOPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Users className="size-3.5" />
              指派方式
            </Label>
            <Select value={assigneeType} onValueChange={setAssigneeType}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ASSIGNEE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="bg-muted/30 border border-border rounded-sm p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="size-3.5" />
              <span>本次盘点将基于当前资产快照执行</span>
            </div>
          </div>

          <div className="text-xs text-muted-foreground">
            创建后，系统将基于当前固定资产清单生成盘点明细，资产较多时可能需要数秒。
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="rounded-sm"
            disabled={submitting}
          >
            取消
          </Button>
          <Button size="sm" onClick={handleSubmit} className="rounded-sm" disabled={submitting}>
            {submitting ? '正在生成检查项...' : '创建任务'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
