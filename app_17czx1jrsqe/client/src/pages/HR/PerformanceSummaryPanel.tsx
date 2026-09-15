import { Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import StatusBadge from '@/components/StatusBadge';
import { formatAmount } from '@/lib/format';
import { round2, sanitizeNumberInput, type PayrollPreview, type PayrollStructureResult, type PerfGrade, type PerfScoreResult } from '@shared/performance-calc';

export const GRADE_VARIANT: Record<PerfGrade, 'success' | 'info' | 'warning' | 'danger'> = {
  A: 'success',
  B: 'info',
  C: 'warning',
  D: 'danger',
};

export function fmtScore(v: number | null | undefined): string {
  return v === null || v === undefined ? '-' : round2(v).toFixed(2);
}

interface PerformanceSummaryPanelProps {
  scores: PerfScoreResult;
  structure: PayrollStructureResult;
  preview: PayrollPreview | null;
  previewLoading: boolean;
  employeePicked: boolean;
  period: string;
  baseEdit: string;
  commissionEdit: string;
  onBaseChange: (v: string) => void;
  onCommissionChange: (v: string) => void;
}

function DetailRow({ label, sub, value, tone }: { label: string; sub?: string; value: number; tone?: 'negative' | 'net' }) {
  const text = tone === 'negative' && value !== 0 ? `-${formatAmount(Math.abs(value))}` : formatAmount(value);
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-muted-foreground">
        {label}
        {sub && <span className="ml-1 text-xs text-muted-foreground/70">{sub}</span>}
      </span>
      <span className={`tabular-nums ${tone === 'negative' ? 'text-red-600' : ''} ${tone === 'net' ? 'text-base font-semibold text-emerald-600' : ''}`}>
        {text}
      </span>
    </div>
  );
}

export default function PerformanceSummaryPanel({
  scores, structure, preview, previewLoading, employeePicked, period,
  baseEdit, commissionEdit, onBaseChange, onCommissionChange,
}: PerformanceSummaryPanelProps) {
  const hint = !employeePicked
    ? '请先选择员工，各项按 ¥0.00 计'
    : previewLoading
      ? ''
      : preview === null
        ? '薪资数据加载失败，各项按 ¥0.00 计'
        : !preview.foundPayroll
          ? `未找到${period}工资单，按0计`
          : '';

  const perfHint = scores.total < 60 ? '总分低于60，绩效工资按0计' : '绩效 = 基本工资 × 20% × (总分/100)';

  return (
    <div className="rounded-lg border bg-accent/40 p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium">评定规则得分</span>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="text-muted-foreground">结果分 {fmtScore(scores.resultScore)}</span>
          <span className="text-muted-foreground">管理分 {fmtScore(scores.manageScore)}</span>
          <span className="text-muted-foreground">加分 {fmtScore(scores.addScore)}</span>
          <span className="text-muted-foreground">扣分 {fmtScore(scores.minusScore)}</span>
          <span className="text-lg font-semibold tabular-nums">{fmtScore(scores.total)} 分</span>
          <StatusBadge status={scores.grade} variant={GRADE_VARIANT[scores.grade]} />
        </div>
      </div>

      <div className="border-t pt-2 space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">薪资设置</span>
          {previewLoading && (
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />查询薪资...
            </span>
          )}
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label>基本工资 <span className="text-red-500">*</span></Label>
            <Input value={baseEdit} inputMode="decimal" placeholder="0.00" onChange={(e) => onBaseChange(sanitizeNumberInput(e.target.value))} />
          </div>
          <div className="space-y-1">
            <Label>提成</Label>
            <Input value={commissionEdit} inputMode="decimal" placeholder="0.00" onChange={(e) => onCommissionChange(sanitizeNumberInput(e.target.value))} />
          </div>
          <div className="space-y-1">
            <Label>绩效工资（自动）</Label>
            <div className="flex h-9 items-center rounded-md border bg-muted/40 px-3 tabular-nums">{formatAmount(structure.perfSalary)}</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-x-4 text-xs text-muted-foreground">
          <span>社保基数下限 3500</span>
          <span>{perfHint}</span>
        </div>
      </div>

      <div className="border-t pt-2 space-y-1.5 text-sm">
        <div className="text-sm font-medium">薪资计算明细（自动计算）</div>
        <div className="grid grid-cols-1 gap-y-1.5">
          <DetailRow label="社保缴费基数" value={structure.sbBase} />
          <DetailRow label="应发工资" sub="基本+提成+绩效+补贴" value={structure.gross} />
          <DetailRow label="社保扣款" sub="10.5%" value={structure.social} tone="negative" />
          <DetailRow label="公积金" sub="10%" value={structure.fund} tone="negative" />
          <DetailRow label="应纳税所得额" sub="应发−社保−公积金−5000" value={structure.taxable} />
          <DetailRow label="个税" sub="月度税率表" value={structure.tax} />
        </div>
        <div className="flex items-baseline justify-between border-t pt-1.5">
          <span className="font-medium">实发工资</span>
          <span className="text-lg font-bold tabular-nums text-emerald-600">{formatAmount(structure.net)}</span>
        </div>
        {hint.length > 0 && <div className="text-xs text-muted-foreground">{hint}</div>}
      </div>
    </div>
  );
}
