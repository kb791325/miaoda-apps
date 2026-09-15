import { formatUserName } from './user-names';
// EXPORTS: formatMoney, formatMoneyCompact, optionMeta, formatFieldValue, formatDisplayValue, isPersonField
import type { IFieldConfig } from '@/config/modules';
import { formatDateTimeFull } from './mt-client';

export function formatMoney(value: unknown): string {
  if (value === null || value === undefined) return '—';
  const n = Number(value);
  if (Number.isNaN(n)) return '—';
  return `¥${n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** 大额紧凑显示: 860000 -> ¥86.0万 */
export function formatMoneyCompact(value: unknown): string {
  const n = Number(value ?? 0);
  if (Number.isNaN(n)) return '¥0';
  if (Math.abs(n) >= 10000) return `¥${(n / 10000).toFixed(1)}万`;
  return formatMoney(n);
}

/** 百分比格式化: 0.4 → 40%, 40 → 40% */
export function formatPercent(value: unknown): string {
  if (value === null || value === undefined) return '—';
  const n = Number(value);
  if (Number.isNaN(n)) return '—';
  if (n > 1 && n <= 100) return `${n.toFixed(0)}%`;
  return `${(n * 100).toFixed(1)}%`;
}

/** 手机号脱敏: 186****4403, 非11位或无值显示 — */
export function formatPhone(value: unknown): string {
  if (value === null || value === undefined) return '—';
  const s = String(value);
  if (s.length !== 11) return '—';
  return `${s.slice(0, 3)}****${s.slice(-4)}`;
}

/** 日期格式化到月: 时间戳(ms)或日期字符串 → YYYY-MM */
export function formatMonth(value: unknown): string {
  if (value === null || value === undefined) return '—';
  const d = new Date(value as string | number);
  if (Number.isNaN(d.getTime())) return '—';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

const TONE_CLASS: Record<string, string> = {
  success: 'border-success/40 bg-success/10 text-success',
  warning: 'border-warning/40 bg-warning/10 text-warning',
  destructive: 'border-destructive/40 bg-destructive/10 text-destructive',
  info: 'border-info/40 bg-info/10 text-info',
  secondary: 'border-border bg-muted text-muted-foreground',
};

/** select 字段值的展示元信息 (label + 语义色) */
export function optionMeta(field: IFieldConfig, value: unknown): { label: string; className: string } {
  const raw = value === undefined || value === null ? '' : String(value);
  const matched = field.options?.find((o) => o.value === raw);
  if (matched) {
    return { label: matched.label, className: TONE_CLASS[matched.tone ?? 'secondary'] ?? TONE_CLASS.secondary };
  }
  return { label: raw, className: TONE_CLASS.secondary };
}

/** 判定是否为人员字段 (owner/assignee/handler/creator/modifier/applicant/operator/approver 等) */
export function isPersonField(fieldKey: string): boolean {
  const lower = fieldKey.toLowerCase();
  const personKeys = ['owner', 'assignee', 'handler', 'applicant', 'creator', 'modifier', 'operator', 'approver', 'purchaser', 'stockkeeper', 'submitter', 'director', 'partner', 'sales', 'contact', 'manager', 'cameraman', 'editor'];
  return personKeys.some((k) => lower === k || lower.includes(k));
}

/** 判断值是否为毫秒时间戳 (13位数字，2000-2100年范围) */
function isMillisTimestamp(v: unknown): v is number {
  return typeof v === 'number' && v > 946684800000 && v < 4102444800000;
}

/** 判断值是否为秒级时间戳 (10位数字，2000-2100年范围) */
function isSecondsTimestamp(v: unknown): v is number {
  return typeof v === 'number' && v > 946684800 && v < 4102444800;
}

/** 判断值是否像人员 ID（纯数字字符串 ≥ 10 位 或 纯数字 number ≥ 10 位） */
function looksLikeUserId(raw: unknown): boolean {
  if (typeof raw === 'number') return raw >= 1_000_000_000;
  if (typeof raw === 'string') return /^\d{10,}$/.test(raw);
  return false;
}

/**
 * 统一字段值格式化（全局渲染层，所有模块的列表/详情/跨表Tab共用）
 * - null/undefined/空字符串 → '—'
 * - 毫秒时间戳(13位) → yyyy-MM-dd HH:mm
 * - 秒级时间戳(10位) → yyyy-MM-dd HH:mm
 * - 10+位纯数字ID → formatUserName 转换（无映射则原样返回）
 * - 其他 → String()
 */
export function formatDisplayValue(raw: unknown): string {
  if (raw === undefined || raw === null || raw === '') return '—';

  if (isMillisTimestamp(raw)) return formatDateTimeFull(raw);
  if (isSecondsTimestamp(raw)) return formatDateTimeFull(raw * 1000);

  const str = typeof raw === 'string' ? raw : String(raw);

  // 看起来像人员 ID（10+位纯数字，且不是已格式化的日期字符串）
  if (looksLikeUserId(raw) && !str.includes('-') && !str.includes(':')) {
    return formatUserName(str);
  }

  return str;
}

export function formatFieldValue(field: IFieldConfig, raw: string | number | undefined | null): string {
  return formatFieldValueDisplay(field, raw);
}

/** 格式化字段值 (含人员字段 ID → 名称转换、时间戳格式化) */
export function formatFieldValueDisplay(field: IFieldConfig, raw: string | number | undefined | null): string {
  if (raw === undefined || raw === null || raw === '') return '—';
  if (field.type === 'select') {
    const meta = optionMeta(field, raw);
    return meta.label;
  }
  if (field.money && !field.percent) return formatMoney(raw);
  if (field.percent || field.type === 'percent') {
    const n = Number(raw ?? 0);
    if (Number.isNaN(n)) return '—';
    if (n > 1 && n <= 100) return `${n.toFixed(0)}%`;
    return `${(n * 100).toFixed(2)}%`;
  }
  // 人员字段: 尝试 ID → 名称转换
  if (isPersonField(field.key)) return formatUserName(raw);
  // 统一兜底：时间戳 / 人员ID
  return formatDisplayValue(raw);
}