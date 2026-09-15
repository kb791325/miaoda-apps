import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

export interface Tier {
  id: string;
  min: number;
  max: number | null;
  rate: number;
}

export interface Rule {
  id: number | string;
  rule_name: string;
  biz_type: string;
  calc_mode: string;
  base_type: string;
  applicable_dept: string;
  status: 'active' | 'inactive';
  tiers: Tier[];
}

const BASE_OPTS = [
  { label: '消耗金额', value: '消耗金额' },
  { label: '业绩金额', value: '业绩金额' },
  { label: '回款金额', value: '回款金额' },
  { label: '充值金额', value: '充值金额' },
  { label: '订单金额', value: '订单金额' },
];

const DEPT_OPTS = [
  { label: '全部部门', value: '全部部门' },
  { label: '商务一部', value: '商务一部' },
  { label: '商务二部', value: '商务二部' },
  { label: '商务三部', value: '商务三部' },
  { label: '视频部', value: '视频部' },
];

export interface CommissionRuleFormProps {
  editing: Rule;
  validationReason: string | null;
  onFieldChange: <K extends keyof Rule>(key: K, value: Rule[K]) => void;
  onAddTier: () => void;
  onRemoveTier: (tierId: string) => void;
  onTierChange: (tierId: string, field: keyof Tier, value: string) => void;
  calcDemo: { amount: string; result: string | null };
  onCalcDemo: (val: string) => void;
}

export function CommissionRuleForm({
  editing,
  validationReason,
  onFieldChange,
  onAddTier,
  onRemoveTier,
  onTierChange,
  calcDemo,
  onCalcDemo,
}: CommissionRuleFormProps) {
  const isOverall = editing.calc_mode === '整体一档';
  const modeHint = isOverall
    ? '整体档位口径：业绩金额落入哪一档，即用该档比例 × 整单业绩金额一次性计提（不分段）。'
    : '阶梯累计口径：金额按档分段，各段分别按本档比例计提后累加。';
  return (
    <div className="space-y-5 pb-4">
      <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2">
        <div className="min-w-0 space-y-1.5 md:col-span-2">
          <Label>规则名称 <span className="text-destructive">*</span></Label>
          <Input
            value={editing.rule_name}
            onChange={(e) => onFieldChange('rule_name', e.target.value)}
            placeholder="请输入规则名称"
          />
        </div>
        <div className="min-w-0 space-y-1.5">
          <Label>计算方式</Label>
          <Select value={editing.calc_mode} onValueChange={(v) => onFieldChange('calc_mode', v)}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="阶梯累进">阶梯累计（分段计算）</SelectItem>
              <SelectItem value="整体一档">整体档位（整单按档计提）</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-0 space-y-1.5">
          <Label>计算基数</Label>
          <Select value={editing.base_type} onValueChange={(v) => onFieldChange('base_type', v)}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {BASE_OPTS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-0 space-y-1.5">
          <Label>适用部门</Label>
          <Select value={editing.applicable_dept || '全部部门'} onValueChange={(v) => onFieldChange('applicable_dept', v)}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {DEPT_OPTS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 pt-5">
          <Switch
            checked={editing.status === 'active'}
            onCheckedChange={(v) => onFieldChange('status', v ? 'active' : 'inactive')}
          />
          <Label className="!mb-0">{editing.status === 'active' ? '已启用' : '已停用'}</Label>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">
            阶梯档位 {isOverall ? '（整体档位）' : '（分段累计）'}
          </Label>
          <Button size="sm" variant="outline" className="h-7" onClick={onAddTier}>
            <Plus className="mr-1 size-3" /> 添加档位
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">{modeHint}</p>
        {validationReason ? (
          <p className="text-xs font-medium text-destructive">保存前需修正：{validationReason}</p>
        ) : null}
        <div className="space-y-2">
          {editing.tiers.map((t, idx) => (
            <div
              key={t.id}
              className="grid min-w-0 grid-cols-[1fr_1fr_1fr_auto] items-end gap-2 rounded-md border border-border/60 p-2"
            >
              <div className="min-w-0 space-y-1">
                <Label className="whitespace-nowrap text-xs">第{idx + 1}档 起（≥）</Label>
                <Input
                  type="number"
                  className="h-8 w-full min-w-0"
                  value={t.min}
                  onChange={(e) => onTierChange(t.id, 'min', e.target.value)}
                />
              </div>
              <div className="min-w-0 space-y-1">
                <Label className="whitespace-nowrap text-xs">止（不含）</Label>
                <Input
                  type="number"
                  className="h-8 w-full min-w-0"
                  value={t.max === null ? '' : t.max}
                  placeholder="不设上限"
                  onChange={(e) => onTierChange(t.id, 'max', e.target.value)}
                />
              </div>
              <div className="min-w-0 space-y-1">
                <Label className="whitespace-nowrap text-xs">比例（%）</Label>
                <Input
                  type="number"
                  step="0.1"
                  className="h-8 w-full min-w-0"
                  value={t.rate}
                  onChange={(e) => onTierChange(t.id, 'rate', e.target.value)}
                />
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => onRemoveTier(t.id)}
                disabled={editing.tiers.length <= 1}
                aria-label={`删除第${idx + 1}档`}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-md border border-primary/20 bg-primary/5 p-4">
        <Label className="text-sm font-medium text-primary">
          快速试算（{isOverall ? '整单按档计提' : '阶梯分段累加'}）
        </Label>
        <Input
          type="number"
          placeholder="输入业绩金额（元）"
          value={calcDemo.amount}
          onChange={(e) => onCalcDemo(e.target.value)}
          className="mt-2 w-full min-w-0"
        />
        {calcDemo.result ? (
          <div className="mt-2 text-sm font-medium text-primary">{calcDemo.result}</div>
        ) : null}
      </div>
    </div>
  );
}
