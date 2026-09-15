import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  autoScoreFromRate,
  calcAutoRate,
  itemEffectiveScore,
  numOrNull,
  round2,
  sanitizeNumberInput,
  type PerfMetricItem,
} from '@shared/performance-calc';

interface PerformanceMetricEditorProps {
  title: string;
  rows: PerfMetricItem[];
  onChange: (rows: PerfMetricItem[]) => void;
  weightExpect: number;
  minRows?: number;
}

const HEAD = ['指标名称', '权重%', '目标值', '实际值', '完成率%', '得分', '评分规则'];

export default function PerformanceMetricEditor({ title, rows, onChange, weightExpect, minRows = 0 }: PerformanceMetricEditorProps) {
  const patch = (idx: number, p: Partial<PerfMetricItem>) =>
    onChange(rows.map((it: PerfMetricItem, i: number) => (i === idx ? { ...it, ...p } : it)));
  /** 改目标/实际/权重后恢复自动重算：重算完成率与得分；完成率算不出时得分保留原值可手填 */
  const patchAuto = (it: PerfMetricItem, p: Partial<PerfMetricItem>): Partial<PerfMetricItem> => {
    const merged: PerfMetricItem = { ...it, ...p, manualScore: false };
    const rate = calcAutoRate(merged.target, merged.actual, merged.rule);
    const auto = autoScoreFromRate(rate, merged.weight);
    return { ...p, manualScore: false, rate, score: auto !== null ? auto : merged.score };
  };
  const addRow = () =>
    onChange([...rows, { name: '', weight: 0, target: '', actual: '', rule: '', score: 0, rate: null }]);
  const removeRow = (idx: number) => {
    if (rows.length <= minRows) return;
    onChange(rows.filter((_: PerfMetricItem, i: number) => i !== idx));
  };
  const weightTotal = round2(rows.reduce((s: number, it: PerfMetricItem) => s + (Number(it.weight) || 0), 0));
  const groupScore = round2(rows.reduce((s: number, it: PerfMetricItem) => s + itemEffectiveScore(it), 0));
  const weightOff = weightTotal !== weightExpect;

  return (
    <div className="rounded-lg border p-3 space-y-2">
      <div className="flex items-center justify-between">
        <Label>{title}</Label>
        <Button type="button" variant="outline" size="sm" onClick={addRow}>
          <Plus className="size-3.5" />添加
        </Button>
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[640px] space-y-1.5">
          <div className="flex items-center gap-2 px-1 text-xs text-muted-foreground">
            <span className="flex-1">{HEAD[0]}</span>
            <span className="w-14">{HEAD[1]}</span>
            <span className="w-24">{HEAD[2]}</span>
            <span className="w-24">{HEAD[3]}</span>
            <span className="w-16">{HEAD[4]}</span>
            <span className="w-16">{HEAD[5]}</span>
            <span className="w-32">{HEAD[6]}</span>
            <span className="w-9" />
          </div>
          {rows.map((it: PerfMetricItem, idx: number) => (
            <div key={idx} className="flex items-center gap-2">
              <Input className="flex-1" value={it.name} placeholder="指标名称" onChange={(e) => patch(idx, { name: e.target.value })} />
              <Input className="w-14" type="number" min={0} title="权重(%)" value={it.weight} onChange={(e) => patch(idx, patchAuto(it, { weight: Number(e.target.value) || 0 }))} />
              <Input className="w-24" value={it.target ?? ''} placeholder="目标值" onChange={(e) => patch(idx, patchAuto(it, { target: e.target.value }))} />
              <Input className="w-24" value={it.actual ?? ''} placeholder="只填数字" title="实际值（只填数字，如 105 或 4.2）" onChange={(e) => patch(idx, patchAuto(it, { actual: sanitizeNumberInput(e.target.value) }))} />
              <span className="w-16 text-center text-xs tabular-nums" title="按目标/实际自动计算，只读">
                {(() => {
                  const r = numOrNull(it.rate);
                  return r === null ? '—' : `${r.toFixed(1)}%`;
                })()}
              </span>
              <Input className="w-16" type="number" min={0} step="0.01" title="单项得分（默认按完成率自动，可手动覆盖；改实际值/目标/权重后恢复自动）" value={it.score} onChange={(e) => patch(idx, { score: Number(e.target.value) || 0, manualScore: true })} />
              <Input className="w-32" value={it.rule ?? ''} placeholder="评分规则" onChange={(e) => patch(idx, { rule: e.target.value })} />
              <Button type="button" variant="ghost" size="icon" disabled={rows.length <= minRows} onClick={() => removeRow(idx)}>
                <Trash2 className="size-3.5 text-red-500" />
              </Button>
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className={weightOff ? 'text-amber-600' : 'text-muted-foreground'}>
          权重合计 {weightTotal}%（期望 {weightExpect}%）
        </span>
        <span className="text-muted-foreground">小计 {groupScore.toFixed(2)} 分</span>
      </div>
    </div>
  );
}
