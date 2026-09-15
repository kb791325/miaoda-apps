import {
  emptyDetail,
  numOrNull,
  parseMetricDetail,
  serializeMetricDetail,
  type PerfMetricDetail,
  type PerfMetricItem,
} from '@shared/performance-calc';

export interface SalaryRecord {
  employee_name?: string;
  base_salary?: number;
  perf_salary?: number;
  subsidy?: number;
  deduction?: number;
  salary_month?: string;
}

export interface PerformanceFormState {
  employeeName: string;
  department: string;
  period: string;
  mode: string;
  attendDays: string;
  result: PerfMetricItem[];
  manage: PerfMetricItem[];
  addScore: string;
  addReason: string;
  minusScore: string;
  minusReason: string;
  selfScore: string;
  selfNote: string;
  superiorScore: string;
  superiorNote: string;
  remark: string;
}

export const DEFAULT_RESULT_ROWS: PerfMetricItem[] = [
  {
    name: '团队成员接通过程量',
    weight: 27,
    target: '100通/天',
    actual: '',
    rule: '日均≥100→30;≥90→27;≥80→24;<80按比例',
    score: 0,
    rate: null,
  },
  {
    name: '团队有效加微数',
    weight: 45,
    target: '8个/天',
    actual: '',
    rule: '日均≥8→45;≥7→40;≥6→35;<6按比例',
    score: 0,
    rate: null,
  },
  {
    name: '团队流失率',
    weight: 18,
    target: '≤5%',
    actual: '',
    rule: '≤5%→18;≤8%→15;≤12%→12;>12%按比例',
    score: 0,
    rate: null,
  },
];

export const DEFAULT_MANAGE_ROWS: PerfMetricItem[] = [
  { name: '管理指标', weight: 10, target: '管理到位、制度落地', actual: '', rule: '满分10', score: 10, rate: null },
];

export function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function defaultFormState(): PerformanceFormState {
  return {
    employeeName: '',
    department: '',
    period: currentMonth(),
    mode: 'KPI',
    attendDays: '',
    result: DEFAULT_RESULT_ROWS.map((it: PerfMetricItem) => ({ ...it })),
    manage: DEFAULT_MANAGE_ROWS.map((it: PerfMetricItem) => ({ ...it })),
    addScore: '',
    addReason: '',
    minusScore: '',
    minusReason: '',
    selfScore: '',
    selfNote: '',
    superiorScore: '',
    superiorNote: '',
    remark: '',
  };
}

/** 编辑回显：优先从「指标明细」JSON 还原，缺失时回落到默认行 */
export function formStateFromRecord(record: Record<string, unknown>): PerformanceFormState {
  const base = defaultFormState();
  const detail: PerfMetricDetail | null = parseMetricDetail(record['metric_detail']);
  return {
    ...base,
    employeeName: String(record['employee_name'] ?? ''),
    department: String(record['department'] ?? ''),
    period: String(record['period'] ?? base.period),
    mode: record['mode'] === 'OKR' ? 'OKR' : 'KPI',
    attendDays: record['attend_days'] !== undefined && record['attend_days'] !== null ? String(record['attend_days']) : '',
    result: detail && detail.result.length > 0 ? detail.result : base.result,
    manage: detail && detail.manage.length > 0 ? detail.manage : base.manage,
    addScore: detail && detail.addScore !== 0 ? String(detail.addScore) : '',
    addReason: detail?.addReason ?? '',
    minusScore: detail && detail.minusScore !== 0 ? String(detail.minusScore) : '',
    minusReason: detail?.minusReason ?? '',
    selfScore: record['self_score'] !== undefined && record['self_score'] !== null ? String(record['self_score']) : '',
    selfNote: detail?.selfNote ?? '',
    superiorScore:
      record['superior_score'] !== undefined && record['superior_score'] !== null ? String(record['superior_score']) : '',
    superiorNote: detail?.superiorNote ?? '',
    remark: String(record['remark'] ?? ''),
  };
}

export function buildDetail(state: PerformanceFormState): PerfMetricDetail {
  return {
    result: state.result,
    manage: state.manage,
    addScore: numOrNull(state.addScore) ?? 0,
    addReason: state.addReason.trim(),
    minusScore: numOrNull(state.minusScore) ?? 0,
    minusReason: state.minusReason.trim(),
    selfNote: state.selfNote.trim(),
    superiorNote: state.superiorNote.trim(),
  };
}

export function emptyDetailForRows(): PerfMetricDetail {
  return emptyDetail();
}

/** 提交实体字段（camelCase，由 FieldMap 映射到中文列） */
export function buildPerformancePayload(
  state: PerformanceFormState,
  computed: {
    resultScore: number;
    manageScore: number;
    total: number;
    grade: string;
    perfStd: number;
    perfSalary: number;
    baseSalary: number;
    commission: number;
  },
  status: string,
): Record<string, unknown> {
  return {
    employee_name: state.employeeName.trim(),
    department: state.department.trim(),
    period: state.period.trim(),
    mode: state.mode,
    attend_days: numOrNull(state.attendDays) ?? 0,
    metric_detail: serializeMetricDetail(buildDetail(state)),
    result_score: computed.resultScore,
    manage_score: computed.manageScore,
    add_score: numOrNull(state.addScore) ?? 0,
    minus_score: numOrNull(state.minusScore) ?? 0,
    self_score: numOrNull(state.selfScore) ?? 0,
    superior_score: numOrNull(state.superiorScore) ?? 0,
    perf_std_snapshot: computed.perfStd,
    calc_perf_salary: computed.perfSalary,
    base_salary_snapshot: computed.baseSalary,
    commission_snapshot: computed.commission,
    score: computed.total,
    grade: computed.grade,
    status,
    remark: state.remark.trim(),
  };
}
