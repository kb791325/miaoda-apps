import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { extractErrorMessage } from '@/lib/error-utils';
import { employeesApi, performancesApi } from '@/api';
import { apiGet } from '@/api/request';
import PerformanceMetricEditor from './PerformanceMetricEditor';
import PerformanceSummaryPanel from './PerformanceSummaryPanel';
import {
  buildPerformancePayload, defaultFormState, formStateFromRecord,
  type PerformanceFormState,
} from './performance-form';
import {
  calcPayrollStructure,
  calcScores,
  numOrNull,
  round2,
  type PayrollPreview,
} from '@shared/performance-calc';

interface EmployeeLite {
  name: string;
  department?: string;
  perfStd: number | null;
}

interface PerformanceDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: Record<string, any> | null;
  onSaved: () => void;
}

export default function PerformanceDialog({ open, onOpenChange, editing, onSaved }: PerformanceDialogProps) {
  const [state, setState] = useState<PerformanceFormState>(() => defaultFormState());
  const [employees, setEmployees] = useState<EmployeeLite[]>([]);
  const [empOpen, setEmpOpen] = useState(false);
  const [preview, setPreview] = useState<PayrollPreview | null>(null);
  const [baseEdit, setBaseEdit] = useState('0');
  const [commissionEdit, setCommissionEdit] = useState('0');
  const [salaryLoading, setSalaryLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const set = (patch: Partial<PerformanceFormState>) => setState((prev: PerformanceFormState) => ({ ...prev, ...patch }));

  useEffect(() => {
    if (!open) return;
    setState(editing ? formStateFromRecord(editing) : defaultFormState());
    setPreview(null);
    employeesApi.list({ page: 1, pageSize: 500 }).then((res: any) => {
      if (!open) return;
      const list: any[] = res.code === 0 ? (res.data?.list ?? []) : [];
      setEmployees(list.map((emp: any): EmployeeLite => ({
        name: String(emp.name ?? ''),
        department: emp.department ?? undefined,
        perfStd: numOrNull(emp.perf_std),
      })).filter((emp: EmployeeLite) => emp.name.length > 0));
    }).catch(() => undefined);
  }, [open, editing]);

  const employeeName = state.employeeName.trim();
  const profile = useMemo<EmployeeLite | null>(
    () => employees.find((emp: EmployeeLite) => emp.name === employeeName) ?? null,
    [employees, employeeName],
  );

  useEffect(() => {
    if (!open || employeeName.length === 0 || state.period.trim().length === 0) {
      setPreview(null);
      return;
    }
    let cancelled = false;
    setSalaryLoading(true);
    apiGet('/performance/payroll-preview', { employeeName, period: state.period.trim() })
      .then((res: any) => {
        if (cancelled) return;
        const data = res.code === 0 ? (res.data as PayrollPreview) : null;
        setPreview(data);
        setBaseEdit(String(data?.baseSalary ?? 0));
        setCommissionEdit(String(data?.commission ?? 0));
        setSalaryLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setPreview(null);
        setSalaryLoading(false);
      });
    return () => { cancelled = true; };
  }, [open, employeeName, state.period]);

  const superiorScore = numOrNull(state.superiorScore);
  const scores = useMemo(() => calcScores({
    result: state.result,
    manage: state.manage,
    addScore: numOrNull(state.addScore) ?? 0,
    addReason: state.addReason,
    minusScore: numOrNull(state.minusScore) ?? 0,
    minusReason: state.minusReason,
  }, superiorScore), [state, superiorScore]);

  const structure = useMemo(() => calcPayrollStructure({
    baseSalary: numOrNull(baseEdit) ?? 0,
    commission: numOrNull(commissionEdit) ?? 0,
    allowance: preview?.allowance ?? 0,
    otherDeduction: preview?.deduction ?? 0,
    totalScore: scores.total,
  }), [baseEdit, commissionEdit, preview, scores.total]);

  const pickEmployee = (emp: EmployeeLite) => {
    set({ employeeName: emp.name, department: emp.department ?? '' });
    setEmpOpen(false);
  };

  const handleSubmit = async () => {
    if (employeeName.length === 0) { toast.warning('请选择员工'); return; }
    if (state.department.trim().length === 0) { toast.warning('请确认部门'); return; }
    if (!/^\d{4}-\d{2}$/.test(state.period.trim())) { toast.warning('考核周期格式须为 YYYY-MM'); return; }
    const self = numOrNull(state.selfScore);
    if (self !== null && (self < 0 || self > 100)) { toast.warning('自评分须在 0-100 之间'); return; }
    const superior = numOrNull(state.superiorScore);
    if (superior !== null && (superior < 0 || superior > 100)) { toast.warning('上级评分须在 0-100 之间'); return; }
    setSaving(true);
    const status = editing ? String(editing.status ?? 'pending') : 'pending';
    const body = buildPerformancePayload(
      state,
      {
        resultScore: scores.resultScore,
        manageScore: scores.manageScore,
        total: scores.total,
        grade: scores.grade,
        perfStd: profile?.perfStd ?? round2(structure.perfSalary),
        perfSalary: structure.perfSalary,
        baseSalary: numOrNull(baseEdit) ?? 0,
        commission: numOrNull(commissionEdit) ?? 0,
      },
      status,
    );
    try {
      const res = editing
        ? await performancesApi.update(editing.id, body)
        : await performancesApi.create(body);
      if (res.code !== 0) {
        toast.error(res.message || '保存失败');
        return;
      }
      toast.success(editing ? '考核已更新' : '考核发起成功，绩效状态为待确认');
      onSaved();
      onOpenChange(false);
    } catch (e) {
      toast.error(extractErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? `编辑考核：${employeeName || ''}` : '发起绩效考核'}</DialogTitle>
          <DialogDescription>逐项录入指标与得分，系统实时核算总分、等级与绩效工资（确认后联动工资）</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>员工 <span className="text-red-500">*</span></Label>
              <Popover open={empOpen} onOpenChange={setEmpOpen}>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" role="combobox" className="w-full justify-between font-normal">
                    {employeeName || '选择员工'}
                    <ChevronsUpDown className="size-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-0" align="start">
                  <Command>
                    <CommandInput placeholder="搜索姓名/部门" />
                    <CommandEmpty>无匹配员工</CommandEmpty>
                    <CommandGroup className="max-h-56 overflow-y-auto">
                      {employees.map((emp: EmployeeLite) => (
                        <CommandItem key={emp.name} value={`${emp.name} ${emp.department ?? ''}`} onSelect={() => pickEmployee(emp)}>
                          <Check className={emp.name === employeeName ? 'size-4' : 'size-4 opacity-0'} />
                          {emp.name}{emp.department ? ` · ${emp.department}` : ''}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1.5">
              <Label>部门 <span className="text-red-500">*</span></Label>
              <Input value={state.department} placeholder="选中员工后自动带出" onChange={(e) => set({ department: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>考核月份 <span className="text-red-500">*</span></Label>
              <Input value={state.period} placeholder="如 2026-09" onChange={(e) => set({ period: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>出勤天数</Label>
              <Input type="number" min={0} value={state.attendDays} placeholder="选填" onChange={(e) => set({ attendDays: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>考核模式</Label>
              <Select value={state.mode} onValueChange={(v: string) => set({ mode: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="KPI">KPI</SelectItem>
                  <SelectItem value="OKR">OKR</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>备注</Label>
              <Textarea value={state.remark} placeholder="可选" onChange={(e) => set({ remark: e.target.value })} />
            </div>
          </div>

          <PerformanceMetricEditor
            title="结果指标（权重90%，折算后满分90）"
            rows={state.result}
            onChange={(rows) => set({ result: rows })}
            weightExpect={90}
            minRows={1}
          />
          <PerformanceMetricEditor
            title="管理指标（满分10）"
            rows={state.manage}
            onChange={(rows) => set({ manage: rows })}
            weightExpect={10}
            minRows={1}
          />

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 rounded-lg border p-3">
              <Label>增值加分</Label>
              <Input type="number" min={0} step="0.01" value={state.addScore} onChange={(e) => set({ addScore: e.target.value })} />
              <Input value={state.addReason} placeholder="加分理由" onChange={(e) => set({ addReason: e.target.value })} />
            </div>
            <div className="space-y-1.5 rounded-lg border p-3">
              <Label>制约扣分</Label>
              <Input type="number" min={0} step="0.01" value={state.minusScore} onChange={(e) => set({ minusScore: e.target.value })} />
              <Input value={state.minusReason} placeholder="扣分理由" onChange={(e) => set({ minusReason: e.target.value })} />
            </div>
            <div className="space-y-1.5 rounded-lg border p-3">
              <Label>自评分（0-100，仅记录不参与工资）</Label>
              <Input type="number" min={0} max={100} step="0.01" value={state.selfScore} onChange={(e) => set({ selfScore: e.target.value })} />
              <Textarea value={state.selfNote} placeholder="自评说明" onChange={(e) => set({ selfNote: e.target.value })} />
            </div>
            <div className="space-y-1.5 rounded-lg border p-3">
              <Label>上级评分（0-100，可选，填了以该值为最终总分）</Label>
              <Input type="number" min={0} max={100} step="0.01" value={state.superiorScore} onChange={(e) => set({ superiorScore: e.target.value })} />
              <Textarea value={state.superiorNote} placeholder="上级评定说明" onChange={(e) => set({ superiorNote: e.target.value })} />
            </div>
          </div>

          <PerformanceSummaryPanel
            scores={scores}
            structure={structure}
            preview={preview}
            previewLoading={salaryLoading}
            employeePicked={employeeName.length > 0}
            period={state.period.trim() || '当月'}
            baseEdit={baseEdit}
            commissionEdit={commissionEdit}
            onBaseChange={setBaseEdit}
            onCommissionChange={setCommissionEdit}
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>取消</Button>
          <Button type="button" disabled={saving} onClick={handleSubmit}>
            {saving ? '保存中...' : (editing ? '保存修改' : '确认发起')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
