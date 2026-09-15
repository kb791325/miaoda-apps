import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, Save } from 'lucide-react';
import {
  Drawer, DrawerClose, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle, DrawerDescription,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { CommissionRuleForm, type Rule, type Tier } from './CommissionRuleForm';
import { commissionRulesApi } from '@/api';
import { formatAmount } from '@/lib/format';
import {
  calcCommissionByRule, parseTiersSafe, pickCommissionRule,
  validateTiers, isRuleActive, type CommissionTier,
} from '@shared/commission-calc';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bizType: string; // 'ad' | 'video'
  bizLabel: string;
}

const emptyTier = (): Tier => ({
  id: `t_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, min: 0, max: null, rate: 0,
});

function asRuleList(value: unknown): Rule[] {
  if (Array.isArray(value)) return value as Rule[];
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    for (const key of ['list', 'records', 'data']) {
      const inner = obj[key];
      if (Array.isArray(inner)) return inner as Rule[];
    }
  }
  return [];
}

const isNewRule = (rule: Rule | null): boolean =>
  !!rule && typeof rule.id === 'number' && rule.id < 0;

const toTiers = (raw: unknown): Tier[] => {
  const parsed: CommissionTier[] = parseTiersSafe(raw);
  if (parsed.length === 0) return [emptyTier()];
  return parsed.map((t: CommissionTier, i: number) => ({
    id: `t_${i}_${Math.random().toString(36).slice(2, 7)}`,
    min: t.min, max: t.max, rate: t.rate,
  }));
};

const normDept = (value: unknown): string => {
  const s = String(value ?? '').trim();
  return !s || s === 'all' ? '全部部门' : s;
};

export default function CommissionRuleDrawer({ open, onOpenChange, bizType, bizLabel }: Props) {
  const [rules, setRules] = useState<Rule[]>([]);
  const [activeId, setActiveId] = useState<string | number | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState<Rule | null>(null);
  const [calcDemo, setCalcDemo] = useState<{ amount: string; result: string | null }>({ amount: '', result: null });

  const loadRules = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const res = await commissionRulesApi.all({ biz_type: bizType });
      const list: Rule[] = asRuleList(res?.data)
        .filter((r: Rule) => {
          const bt = String(r?.biz_type ?? '');
          return bt === bizType || bt.includes(bizType);
        })
        .map((r: Rule) => ({
          ...r,
          tiers: toTiers(r.tiers),
          applicable_dept: normDept(r.applicable_dept),
          status: isRuleActive(r.status) ? 'active' : 'inactive',
        }));
      setRules(list);
      if (list.length > 0) {
        if (activeId === null || !list.some((r: Rule) => r.id === activeId)) {
          setActiveId(list[0].id);
          setEditing({ ...list[0], tiers: list[0].tiers.map((t: Tier) => ({ ...t })) });
        }
      } else {
        setActiveId(null);
        setEditing(null);
      }
    } catch {
      setLoadError(true);
      toast.error('加载规则失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadRules();
      setCalcDemo({ amount: '', result: null });
    }
  }, [open, bizType]);

  const validationReason = useMemo(() => {
    if (!editing) return null;
    if (!editing.rule_name.trim()) return '规则名称必填';
    return validateTiers(editing.tiers.map((t: Tier) => ({ min: t.min, max: t.max, rate: t.rate })));
  }, [editing]);

  const selectRule = (rule: Rule) => {
    setActiveId(rule.id);
    setEditing({ ...rule, tiers: rule.tiers.map((t: Tier) => ({ ...t })) });
    setCalcDemo({ amount: '', result: null });
  };

  const addNewRule = () => {
    const newRule: Rule = {
      id: -Date.now(),
      rule_name: `新${bizLabel}提成规则`,
      biz_type: bizType,
      calc_mode: '阶梯累进',
      base_type: '消耗金额',
      applicable_dept: '全部部门',
      status: 'active',
      tiers: [
        { id: 't1', min: 0, max: 100000, rate: 3 },
        { id: 't2', min: 100000, max: 500000, rate: 5 },
        { id: 't3', min: 500000, max: null, rate: 8 },
      ],
    };
    setRules((prev: Rule[]) => [...prev, newRule]);
    setActiveId(newRule.id);
    setEditing(newRule);
  };

  const updateField = <K extends keyof Rule>(key: K, value: Rule[K]) => {
    if (!editing) return;
    setEditing({ ...editing, [key]: value });
  };

  const addTier = () => {
    if (!editing) return;
    const tiers = [...editing.tiers, emptyTier()];
    if (tiers.length >= 2) {
      const prev = tiers[tiers.length - 2];
      tiers[tiers.length - 1].min = prev.max ?? prev.min + 10000;
    }
    setEditing({ ...editing, tiers });
  };

  const removeTier = (tierId: string) => {
    if (!editing || editing.tiers.length <= 1) return;
    setEditing({ ...editing, tiers: editing.tiers.filter((t: Tier) => t.id !== tierId) });
  };

  const updateTier = (tierId: string, field: keyof Tier, value: string) => {
    if (!editing) return;
    const num = Number(value);
    setEditing({
      ...editing,
      tiers: editing.tiers.map((t: Tier) =>
        t.id === tierId
          ? { ...t, [field]: field === 'max' && value === '' ? null : Number.isFinite(num) ? num : t[field] }
          : t,
      ),
    });
  };

  const handleCalcDemo = (val: string) => {
    setCalcDemo({ amount: val, result: null });
    if (!editing) return;
    const num = Number(val);
    if (!Number.isFinite(num) || num < 0) return;
    const { commission, rate } = calcCommissionByRule(editing.calc_mode, editing.tiers, num);
    const modeText = editing.calc_mode === '整体一档' ? '整单按档计提' : '阶梯分段累加';
    setCalcDemo({
      amount: val,
      result: `提成金额：${formatAmount(commission)} 元（综合比例 ${rate}%，${modeText}）`,
    });
  };

  const handleSave = async () => {
    if (!editing || validationReason) return;
    setSaving(true);
    try {
      const data = {
        rule_name: editing.rule_name.trim(),
        biz_type: editing.biz_type,
        calc_mode: editing.calc_mode,
        base_type: editing.base_type,
        applicable_dept: normDept(editing.applicable_dept),
        status: editing.status === 'active' ? '启用' : '停用',
        tiers: JSON.stringify(editing.tiers.map(({ id: _id, ...rest }: Tier) => rest)),
      };
      const res = isNewRule(editing)
        ? await commissionRulesApi.create(data)
        : await commissionRulesApi.update(editing.id, data);
      if (res.code === 0) {
        toast.success('规则已保存');
        loadRules();
      } else {
        toast.error(res.message || '保存失败');
      }
    } catch {
      toast.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editing) return;
    if (isNewRule(editing)) {
      const remaining = rules.filter((r: Rule) => r.id !== editing.id);
      setRules(remaining);
      if (remaining.length > 0) {
        setActiveId(remaining[0].id);
        setEditing(remaining[0]);
      } else {
        setActiveId(null);
        setEditing(null);
      }
      return;
    }
    setDeleting(true);
    try {
      const res = await commissionRulesApi.remove(editing.id);
      if (res.code === 0) {
        toast.success('规则已删除');
        const remaining = rules.filter((r: Rule) => r.id !== editing.id);
        setRules(remaining);
        if (remaining.length > 0) {
          setActiveId(remaining[0].id);
          setEditing(remaining[0]);
        } else {
          setActiveId(null);
          setEditing(null);
        }
      } else {
        toast.error(res.message || '删除失败');
      }
    } catch {
      toast.error('删除失败');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent
        className="flex h-full flex-col overflow-hidden"
        style={{ width: 'min(960px, 94vw)', maxWidth: 'min(960px, 94vw)' }}
      >
        <DrawerHeader className="shrink-0 border-b">
          <DrawerTitle>{bizLabel}提成规则配置</DrawerTitle>
          <DrawerDescription>管理阶梯提成规则，支持多档阶梯计算和整体档位计算</DrawerDescription>
        </DrawerHeader>
        <div className="flex min-h-0 flex-1 overflow-hidden px-6">
          <aside className="flex w-56 shrink-0 flex-col gap-2 border-r pr-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">规则列表</span>
              <Button size="sm" variant="outline" className="h-7 px-2" onClick={addNewRule}>
                <Plus className="mr-1 size-3" /> 新增
              </Button>
            </div>
            <div className="min-h-0 flex-1 space-y-1 overflow-y-auto">
              {loading ? (
                <div className="py-8 text-center text-sm text-muted-foreground">加载中...</div>
              ) : loadError ? (
                <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
                  <span>加载失败</span>
                  <Button size="sm" variant="outline" className="h-7 px-2" onClick={loadRules}>
                    点击重试
                  </Button>
                </div>
              ) : rules.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">暂无提成规则，点击新增</div>
              ) : (
                rules.map((r: Rule) => (
                  <button
                    key={r.id}
                    type="button"
                    className={`w-full rounded-md border p-2 text-left text-sm transition ${
                      r.id === activeId
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border hover:border-border/80 hover:bg-muted/30'
                    }`}
                    onClick={() => selectRule(r)}
                  >
                    <div className="truncate font-medium">{r.rule_name}</div>
                    <div className="mt-0.5 flex items-center justify-between text-xs text-muted-foreground">
                      <span className="truncate">{r.calc_mode === '整体一档' ? '整体档位' : '阶梯累计'}</span>
                      <span className={r.status === 'active' ? 'text-emerald-600' : 'text-muted-foreground'}>
                        {r.status === 'active' ? '启用' : '停用'}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </aside>

          <div className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto py-4 pl-4">
            {editing ? (
              <CommissionRuleForm
                editing={editing}
                validationReason={validationReason}
                onFieldChange={updateField}
                onAddTier={addTier}
                onRemoveTier={removeTier}
                onTierChange={updateTier}
                calcDemo={calcDemo}
                onCalcDemo={handleCalcDemo}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                请选择或新增规则
              </div>
            )}
          </div>
        </div>
        <DrawerFooter className="shrink-0 flex-row items-center justify-between gap-3 border-t bg-background pb-20 pt-4">
          <div className="flex items-center gap-3">
            {editing && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive"
                disabled={deleting || saving}
                onClick={handleDelete}
              >
                <Trash2 className="mr-1 size-3.5" /> 删除规则
              </Button>
            )}
          </div>
          <div className="flex shrink-0 gap-2">
            <DrawerClose asChild>
              <Button type="button" variant="outline">取消</Button>
            </DrawerClose>
            <Button type="button" onClick={handleSave} disabled={saving || !editing || !!validationReason}>
              <Save className="mr-1 size-3.5" /> 保存规则
            </Button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

export type { Rule, Tier };
export { pickCommissionRule };
