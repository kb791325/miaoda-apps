/**
 * 绩效核算共享口径（前后端同源引用，禁止两端各写一份）
 */

export interface PerfMetricItem {
  name: string;
  weight: number;
  target?: string;
  actual?: string;
  rule?: string;
  score: number;
  rate?: number | null;
  /** 手动覆盖得分：为 true 时 itemEffectiveScore 直接取 score，忽略完成率折算 */
  manualScore?: boolean;
}

export interface PerfMetricDetail {
  result: PerfMetricItem[];
  manage: PerfMetricItem[];
  addScore: number;
  addReason: string;
  minusScore: number;
  minusReason: string;
  selfNote?: string;
  superiorNote?: string;
}

export type PerfGrade = 'A' | 'B' | 'C' | 'D';

export const RESULT_WEIGHT_TOTAL = 90;
export const MANAGE_WEIGHT_TOTAL = 10;
export const TOTAL_MAX = 150;
export const PASS_LINE = 60;

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function round1(n: number): number {
  return Math.round((n + Number.EPSILON) * 10) / 10;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}

/** 解析为有限数字，否则 null（区分"未填"与 0） */
export function numOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

export function toNum(v: unknown, fallback = 0): number {
  const n = numOrNull(v);
  return n === null ? fallback : n;
}

/** 实际值输入净化：仅保留数字、小数点、负号（输入百分号等符号只取数字） */
export function sanitizeNumberInput(text: string): string {
  return text.replace(/[^0-9.\-]/g, '');
}

/** 提取文本中的首个数值："100通/天"→100、"≤5%"→5、"满分10"→10；解析不出返回 null */
export function parseFirstNumber(text: string | undefined | null): number | null {
  if (!text) return null;
  const m = String(text).match(/-?\d+(?:\.\d+)?/);
  if (!m) return null;
  const n = Number(m[0]);
  return Number.isFinite(n) ? n : null;
}

/** 方向判定：目标值以 ≤/<= /不超过/越小越好 开头，或评分规则以 ≤ 开头 → 逆向（越小越好） */
export function isReverseMetric(target?: string, rule?: string): boolean {
  const t = (target ?? '').trim();
  const r = (rule ?? '').trim();
  return ['≤', '<=', '不超过', '越小越好'].some((p: string) => t.startsWith(p)) || r.startsWith('≤');
}

/**
 * 按目标值/实际值自动算完成率(%)：正向=实际/目标，逆向=目标/实际，保留1位小数。
 * 目标或实际解析不出数值返回 null（显示"—"）；逆向且实际为0不计算返回 null；正向实际为0得0%。
 */
export function calcAutoRate(target?: string, actual?: string, rule?: string): number | null {
  const goal = parseFirstNumber(target);
  const act = parseFirstNumber(actual);
  if (goal === null || act === null || goal === 0) return null;
  if (isReverseMetric(target, rule)) {
    if (act === 0) return null;
    return round1((goal / act) * 100);
  }
  if (act === 0) return 0;
  return round1((act / goal) * 100);
}

/** 完成率→单项得分：=完成率(小数)×权重，>100%封顶=权重满分，负值按0；无完成率返回 null */
export function autoScoreFromRate(rate: number | null, weight: number): number | null {
  if (rate === null) return null;
  const full = clamp(toNum(weight), 0, TOTAL_MAX);
  return round2(clamp((full * rate) / 100, 0, full));
}

/** 单项折算后满分 = 权重值（权重为百分数数值） */
export function itemFullScore(item: PerfMetricItem): number {
  return clamp(toNum(item.weight), 0, TOTAL_MAX);
}

/** 单项得分：手动覆盖优先；否则填了完成率按 满分×完成率 折算，否则取直接得分；均裁剪到 [0, 满分] */
export function itemEffectiveScore(item: PerfMetricItem): number {
  const full = itemFullScore(item);
  if (item.manualScore) return round2(clamp(toNum(item.score), 0, full));
  const rate = numOrNull(item.rate);
  if (rate !== null) return round2(clamp((full * rate) / 100, 0, full));
  return round2(clamp(toNum(item.score), 0, full));
}

function sumItems(items: PerfMetricItem[]): number {
  return round2(items.reduce((sum, it) => sum + itemEffectiveScore(it), 0));
}

export function gradeOf(total: number): PerfGrade {
  if (total >= 90) return 'A';
  if (total >= 80) return 'B';
  if (total >= 60) return 'C';
  return 'D';
}

export interface PerfScoreResult {
  resultScore: number;
  manageScore: number;
  addScore: number;
  minusScore: number;
  total: number;
  grade: PerfGrade;
}

/** 总分：填了上级评分则以上级评分为准（仍裁剪 [0,150]），否则系统算分 */
export function calcScores(detail: PerfMetricDetail, superiorScore: number | null): PerfScoreResult {
  const resultScore = sumItems(detail.result || []);
  const manageScore = sumItems(detail.manage || []);
  const addScore = round2(clamp(toNum(detail.addScore), 0, 9999));
  const minusScore = round2(clamp(toNum(detail.minusScore), 0, 9999));
  const raw = round2(resultScore + manageScore + addScore - minusScore);
  const total =
    superiorScore !== null
      ? round2(clamp(superiorScore, 0, TOTAL_MAX))
      : clamp(raw, 0, TOTAL_MAX);
  return { resultScore, manageScore, addScore, minusScore, total, grade: gradeOf(total) };
}

/** 绩效工资：总分<60 为 0，否则 标准×(总分/100) */
export function calcPerfSalary(total: number, standard: number): {
  coefficient: number;
  perfSalary: number;
} {
  const coefficient = total / 100;
  const perfSalary = total < PASS_LINE ? 0 : round2(standard * coefficient);
  return { coefficient, perfSalary };
}

/** 实发工资 = 基本 + 补贴 + 绩效 − 扣款 */
export function calcActualSalary(base: number, subsidy: number, perf: number, deduction: number): number {
  return round2(toNum(base) + toNum(subsidy) + toNum(perf) - toNum(deduction));
}

export function emptyDetail(): PerfMetricDetail {
  return { result: [], manage: [], addScore: 0, addReason: '', minusScore: 0, minusReason: '' };
}

function sanitizeItem(raw: unknown): PerfMetricItem {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    name: typeof o.name === 'string' ? o.name : '',
    weight: toNum(o.weight),
    target: typeof o.target === 'string' ? o.target : '',
    actual: typeof o.actual === 'string' ? o.actual : '',
    rule: typeof o.rule === 'string' ? o.rule : '',
    score: toNum(o.score),
    rate: numOrNull(o.rate),
    manualScore: o.manualScore === true,
  };
}

/** 安全解析「指标明细」JSON 列，结构非法返回 null */
export function parseMetricDetail(text: unknown): PerfMetricDetail | null {
  if (typeof text !== 'string' || !text.trim()) return null;
  try {
    const raw = JSON.parse(text) as Record<string, unknown>;
    if (!raw || typeof raw !== 'object') return null;
    return {
      result: Array.isArray(raw.result) ? (raw.result as unknown[]).map(sanitizeItem) : [],
      manage: Array.isArray(raw.manage) ? (raw.manage as unknown[]).map(sanitizeItem) : [],
      addScore: toNum(raw.addScore),
      addReason: typeof raw.addReason === 'string' ? raw.addReason : '',
      minusScore: toNum(raw.minusScore),
      minusReason: typeof raw.minusReason === 'string' ? raw.minusReason : '',
      selfNote: typeof raw.selfNote === 'string' ? raw.selfNote : '',
      superiorNote: typeof raw.superiorNote === 'string' ? raw.superiorNote : '',
    };
  } catch {
    return null;
  }
}

export function serializeMetricDetail(detail: PerfMetricDetail): string {
  return JSON.stringify(detail);
}

/** 薪资结构常量（弹窗预览、payroll-preview 接口、确认联动写回三处共用） */
export const PAYROLL_CONSTANTS = {
  PERF_RATIO: 0.2,
  SB_BASE_FLOOR: 3500,
  SOCIAL_RATE: 0.105,
  FUND_RATE: 0.1,
  TAX_THRESHOLD: 5000,
} as const;

/** 工资薪金月度税率表（应纳税所得额区间上限 → 税率/速算扣除数） */
export const MONTHLY_TAX_BRACKETS: Array<{ limit: number; rate: number; quickDeduction: number }> = [
  { limit: 3000, rate: 0.03, quickDeduction: 0 },
  { limit: 12000, rate: 0.1, quickDeduction: 210 },
  { limit: 25000, rate: 0.2, quickDeduction: 1410 },
  { limit: 35000, rate: 0.25, quickDeduction: 2660 },
  { limit: 55000, rate: 0.3, quickDeduction: 4410 },
  { limit: 80000, rate: 0.35, quickDeduction: 7160 },
  { limit: Infinity, rate: 0.45, quickDeduction: 15160 },
];

export interface PayrollStructureInput {
  baseSalary: number;
  commission: number;
  allowance: number;
  otherDeduction: number;
  totalScore: number;
  /** 恢复满额场景：直接指定绩效工资，跳过 总分×20% 计算 */
  perfSalaryOverride?: number;
}

export interface PayrollStructureResult {
  perfSalary: number;
  sbBase: number;
  gross: number;
  social: number;
  fund: number;
  taxable: number;
  tax: number;
  net: number;
}

function monthlyTax(taxable: number): number {
  for (const b of MONTHLY_TAX_BRACKETS) {
    if (taxable <= b.limit) return round2(Math.max(0, taxable * b.rate - b.quickDeduction));
  }
  return 0;
}

/**
 * 完整薪资结构（唯一口径）：
 * 绩效工资 = 基本工资×20%×(总分/100)，总分<60 为 0；
 * 社保基数 = max(基本工资, 3500)；应发 = 基本+提成+绩效+补贴；
 * 社保 10.5%、公积金 10% 按社保基数；应税 = 应发−社保−公积金−5000；
 * 个税按月度税率表；实发 = 应发−社保−公积金−个税−其他扣款。
 */
export function calcPayrollStructure(input: PayrollStructureInput): PayrollStructureResult {
  const base = toNum(input.baseSalary);
  const commission = toNum(input.commission);
  const allowance = toNum(input.allowance);
  const otherDeduction = toNum(input.otherDeduction);
  const total = toNum(input.totalScore);
  const perfSalary =
    input.perfSalaryOverride !== undefined
      ? round2(Math.max(0, toNum(input.perfSalaryOverride)))
      : total < PASS_LINE ? 0 : round2(base * PAYROLL_CONSTANTS.PERF_RATIO * (total / 100));
  const sbBase = round2(Math.max(base, PAYROLL_CONSTANTS.SB_BASE_FLOOR));
  const gross = round2(base + commission + perfSalary + allowance);
  const social = round2(sbBase * PAYROLL_CONSTANTS.SOCIAL_RATE);
  const fund = round2(sbBase * PAYROLL_CONSTANTS.FUND_RATE);
  const taxable = round2(gross - social - fund - PAYROLL_CONSTANTS.TAX_THRESHOLD);
  const tax = taxable <= 0 ? 0 : monthlyTax(taxable);
  const net = round2(gross - social - fund - tax - otherDeduction);
  return { perfSalary, sbBase, gross, social, fund, taxable, tax, net };
}

/** 薪资预览（弹窗实时预览与确认联动同一取数口径）：返回工资单原始项 + 按总分算出的完整结构 */
export interface PayrollPreview {
  baseSalary: number;
  commission: number;
  allowance: number;
  /** 工资单既有「扣款」列，静默并入实发计算 */
  deduction: number;
  /** 按当前总分计算的完整结构（前端改基本/提成/总分后本地重算，同一函数） */
  structure: PayrollStructureResult;
  /** 是否找到当月工资单 */
  foundPayroll: boolean;
}
