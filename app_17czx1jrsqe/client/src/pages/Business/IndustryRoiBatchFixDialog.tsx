import { useState } from 'react';
import { Loader2, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { industryRoisApi } from '@/api';

interface FixFieldDef {
  key: 'roi_base' | 'avg_cpc' | 'avg_cvr';
  label: string;
}

const FIX_FIELDS: FixFieldDef[] = [
  { key: 'roi_base', label: 'ROI基准' },
  { key: 'avg_cpc', label: '平均CPC' },
  { key: 'avg_cvr', label: '平均CVR' },
];

export interface IndustryRoiBatchFixDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  records: Record<string, unknown>[];
  onDone: (success: number, fail: number) => void;
}

export default function IndustryRoiBatchFixDialog({
  open,
  onOpenChange,
  records,
  onDone,
}: IndustryRoiBatchFixDialogProps) {
  const [fieldKey, setFieldKey] = useState<string>('roi_base');
  const [mode, setMode] = useState<'set' | 'percent'>('set');
  const [value, setValue] = useState('');
  const [running, setRunning] = useState(false);

  const field = FIX_FIELDS.find((f: FixFieldDef) => f.key === fieldKey) ?? FIX_FIELDS[0];

  const buildPatch = (record: Record<string, unknown>): Record<string, unknown> | null => {
    const raw = value.trim();
    if (raw === '' || Number.isNaN(Number(raw))) return null;
    if (mode === 'set') {
      return { [field.key]: Number(raw) };
    }
    const pct = Number(raw);
    const cur = Number(record[field.key]);
    if (Number.isNaN(cur)) return null;
    return { [field.key]: Number((cur * (1 + pct / 100)).toFixed(4)) };
  };

  const handleConfirm = async () => {
    if (running || records.length === 0) return;
    if (value.trim() === '' || Number.isNaN(Number(value.trim()))) {
      toast.error('请输入合法数字');
      return;
    }
    setRunning(true);
    let success = 0;
    let fail = 0;
    for (const record of records) {
      const patch = buildPatch(record);
      if (!patch) {
        fail += 1;
        continue;
      }
      try {
        const res = await industryRoisApi.update(String(record.id), patch);
        if (res.code === 0) success += 1;
        else fail += 1;
      } catch {
        fail += 1;
      }
    }
    setRunning(false);
    if (fail > 0) {
      toast.warning(`批量修正完成：成功 ${success} 行，失败 ${fail} 行`);
    } else {
      toast.success(`批量修正完成：成功更新 ${success} 行`);
    }
    onDone(success, fail);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o: boolean) => { if (!running) onOpenChange(o); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>批量修正ROI数据</DialogTitle>
          <DialogDescription>
            将对已勾选的 {records.length} 行统一修正指定字段，修正结果逐行真实写入数据表
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>修正字段</Label>
            <Select value={fieldKey} onValueChange={setFieldKey}>
              <SelectTrigger><SelectValue placeholder="请选择字段" /></SelectTrigger>
              <SelectContent>
                {FIX_FIELDS.map((f: FixFieldDef) => (
                  <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>修正方式</Label>
            <Select value={mode} onValueChange={(v: string) => setMode(v === 'percent' ? 'percent' : 'set')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="set">直接设值</SelectItem>
                <SelectItem value="percent">按比例 ±% 调整</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{mode === 'set' ? '目标值' : '调整百分比（%）'}</Label>
            <Input
              type="number"
              value={value}
              placeholder={mode === 'set' ? '如 1.85' : '如 10 或 -5'}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setValue(e.target.value)}
            />
          </div>
          {mode === 'percent' && (
            <div className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              按各行当前值计算：新值 = 当前值 ×（1 + 百分比 / 100），结果保留 4 位小数
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" disabled={running} onClick={() => onOpenChange(false)}>取消</Button>
          <Button disabled={running || records.length === 0} onClick={handleConfirm}>
            {running ? <Loader2 className="mr-1 size-3.5 animate-spin" /> : <Wand2 className="mr-1 size-3.5" />}
            确认修正
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
