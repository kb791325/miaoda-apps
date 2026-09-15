// 分析仪表盘通用聚合工具: 统一按字段「中文 label」反查前端 key 后取值, 避免依赖自动生成的 f-key
import { MODULES } from '@/config/modules';
import type { IBizRecord } from '@/data/mt-records';

/** 按中文列名取该模块配置中的前端 key */
export function keyOf(moduleKey: string, label: string): string | undefined {
  return MODULES[moduleKey]?.fields.find((f) => f.label === label)?.key;
}

/** 取某条记录指定中文列的值(字符串) */
export function val(record: IBizRecord, moduleKey: string, label: string): string {
  const k = keyOf(moduleKey, label);
  return k === undefined ? '' : String(record.values[k] ?? '');
}

/** 取数值 */
export function num(record: IBizRecord, moduleKey: string, label: string): number {
  const k = keyOf(moduleKey, label);
  if (k === undefined) return 0;
  const v = record.values[k];
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export interface NameValue {
  name: string;
  value: number;
}

/** 按某列分组计数(空值归入「未填写」并默认丢弃) */
export function groupCount(records: IBizRecord[], moduleKey: string, label: string, dropEmpty = true): NameValue[] {
  const map = new Map<string, number>();
  for (const r of records) {
    const v = val(r, moduleKey, label);
    if (!v) {
      if (dropEmpty) continue;
    }
    map.set(v || '未填写', (map.get(v || '未填写') ?? 0) + 1);
  }
  return [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

/** 对某数值列求和 */
export function sumField(records: IBizRecord[], moduleKey: string, label: string): number {
  return records.reduce((s, r) => s + num(r, moduleKey, label), 0);
}

/** 按某列分组后对数值列求和 */
export function groupSum(records: IBizRecord[], moduleKey: string, groupLabel: string, valueLabel: string): NameValue[] {
  const map = new Map<string, number>();
  for (const r of records) {
    const g = val(r, moduleKey, groupLabel) || '未填写';
    map.set(g, (map.get(g) ?? 0) + num(r, moduleKey, valueLabel));
  }
  return [...map.entries()].map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 })).sort((a, b) => b.value - a.value);
}

/** 近 N 个月时间轴标签(yyyy-MM) */
export function recentMonths(n: number): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return out;
}

/** 按日期列(yyyy-MM-dd)归月统计: countMode=true 计数, 否则对 valueLabel 求和 */
export function monthly(
  records: IBizRecord[],
  moduleKey: string,
  dateLabel: string,
  months: string[],
  valueLabel?: string,
): number[] {
  const bucket = new Map<string, number>();
  for (const r of records) {
    const m = val(r, moduleKey, dateLabel).slice(0, 7);
    if (!m) continue;
    const inc = valueLabel ? num(r, moduleKey, valueLabel) : 1;
    bucket.set(m, (bucket.get(m) ?? 0) + inc);
  }
  return months.map((m) => Math.round((bucket.get(m) ?? 0) * 100) / 100);
}
