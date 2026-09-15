/**
 * 行业大盘：共享类型 + 纯聚合函数。
 * 数据全部来自真实多维表（财务-消耗 / 客户管理 / 业务-行业ROI），禁止任何随机数。
 */

export type TimeDim = 'day' | 'week' | 'month' | 'year';

export interface NormalizedConsume {
  industry: string;
  amount: number;
  dateKey: string; // YYYY-MM-DD
}

export interface RoiBaseline {
  industry: string;
  avgCpc: number;
  roiBase: number;
}

export interface OverviewRaw {
  consumes: NormalizedConsume[];
  roiBaselines: RoiBaseline[];
}

export interface PieItem {
  name: string;
  value: number;
}

export interface TrendSeries {
  name: string;
  data: number[];
}

export interface TrendResult {
  labels: string[];
  series: TrendSeries[];
}

export interface CostItem {
  name: string;
  avgCpc: number | null;
  roiBase: number | null;
  actualConsume: number | null; // null = 该行业所选周期暂无消耗数据
}

export interface OverviewComputed {
  trend: TrendResult;
  pieData: PieItem[];
  costItems: CostItem[];
  total: number;
}

const pad2 = (n: number): string => String(n).padStart(2, '0');

const fmtDate = (d: Date): string =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

export const dimRange = (dim: TimeDim): { start: string; end: string } => {
  const today = new Date();
  const todayKey = fmtDate(today);
  if (dim === 'day') return { start: todayKey, end: todayKey };
  if (dim === 'week') {
    const s = new Date(today);
    s.setDate(s.getDate() - 6);
    return { start: fmtDate(s), end: todayKey };
  }
  if (dim === 'month') {
    const s = new Date(today);
    s.setDate(s.getDate() - 29);
    return { start: fmtDate(s), end: todayKey };
  }
  return { start: `${today.getFullYear()}-01-01`, end: todayKey };
};

const bucketKeys = (
  dim: TimeDim,
  range: { start: string; end: string },
): { keys: string[]; labels: string[] } => {
  if (dim === 'day') return { keys: [range.start], labels: ['今日'] };
  if (dim === 'week' || dim === 'month') {
    const days = dim === 'week' ? 7 : 30;
    const s = new Date(`${range.start}T00:00:00`);
    const keys: string[] = [];
    const labels: string[] = [];
    for (let i = 0; i < days; i += 1) {
      const d = new Date(s);
      d.setDate(d.getDate() + i);
      keys.push(fmtDate(d));
      labels.push(`${d.getMonth() + 1}/${d.getDate()}`);
    }
    return { keys, labels };
  }
  const year = Number(range.start.slice(0, 4));
  const keys: string[] = [];
  const labels: string[] = [];
  for (let m = 1; m <= 12; m += 1) {
    keys.push(`${year}-${pad2(m)}`);
    labels.push(`${m}月`);
  }
  return { keys, labels };
};

const rowBucketKey = (dateKey: string, dim: TimeDim): string =>
  dim === 'year' ? dateKey.slice(0, 7) : dateKey;

/** 行业消耗占比：环形图 ≤5 类，超出合并为「其他」 */
export const aggregateByIndustry = (byIndustry: Map<string, number>): PieItem[] => {
  const entries = [...byIndustry.entries()]
    .filter(([, v]: [string, number]) => v > 0)
    .sort((a: [string, number], b: [string, number]) => b[1] - a[1]);
  const top = entries
    .slice(0, 4)
    .map(([name, value]: [string, number]) => ({ name, value: Math.round(value * 100) / 100 }));
  const rest = entries.slice(4).reduce((acc: number, [, v]: [string, number]) => acc + v, 0);
  if (rest > 0) top.push({ name: '其他', value: Math.round(rest * 100) / 100 });
  return top;
};

/** 行业消耗趋势：消耗 Top4 行业 × 时间桶折线 */
export const aggregateTrend = (
  rows: NormalizedConsume[],
  dim: TimeDim,
  range: { start: string; end: string },
): TrendResult => {
  const { keys, labels } = bucketKeys(dim, range);
  const bucketIndex = new Map<string, number>(keys.map((k: string, i: number) => [k, i]));
  const totals = new Map<string, number>();
  rows.forEach((r: NormalizedConsume) => {
    totals.set(r.industry, (totals.get(r.industry) ?? 0) + r.amount);
  });
  const top: string[] = [...totals.entries()]
    .sort((a: [string, number], b: [string, number]) => b[1] - a[1])
    .slice(0, 4)
    .map(([name]: [string, number]) => name);
  const indexes = new Map<string, number>(top.map((name: string, i: number) => [name, i]));
  const seriesData: number[][] = top.map(() => keys.map(() => 0));
  rows.forEach((r: NormalizedConsume) => {
    const idx = indexes.get(r.industry);
    const bi = bucketIndex.get(rowBucketKey(r.dateKey, dim));
    if (idx === undefined || bi === undefined) return;
    seriesData[idx][bi] += r.amount;
  });
  return {
    labels,
    series: top.map((name: string, i: number) => ({ name, data: seriesData[i] })),
  };
};

/** 按时间维度聚合：趋势 / 占比 / 流量成本 / 周期总消耗 */
export const computeOverview = (raw: OverviewRaw, dim: TimeDim): OverviewComputed => {
  const range = dimRange(dim);
  const inRange = raw.consumes.filter(
    (r: NormalizedConsume) => r.dateKey >= range.start && r.dateKey <= range.end,
  );
  const total = inRange.reduce((acc: number, r: NormalizedConsume) => acc + r.amount, 0);
  const byIndustry = new Map<string, number>();
  inRange.forEach((r: NormalizedConsume) => {
    byIndustry.set(r.industry, (byIndustry.get(r.industry) ?? 0) + r.amount);
  });
  return {
    trend: aggregateTrend(inRange, dim, range),
    pieData: aggregateByIndustry(byIndustry),
    costItems: raw.roiBaselines.map((b: RoiBaseline): CostItem => ({
      name: b.industry,
      avgCpc: b.avgCpc > 0 ? b.avgCpc : null,
      roiBase: b.roiBase > 0 ? b.roiBase : null,
      actualConsume: byIndustry.get(b.industry) ?? null,
    })),
    total,
  };
};
