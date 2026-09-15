import dayjs from 'dayjs';

/** 财务统计日期区间（YYYY-MM-DD 闭区间） */
export interface FinanceDateRange {
  startDate: string;
  endDate: string;
}

/** 时间范围预设 */
export type DateRangePreset = 'today' | 'month' | 'year' | 'custom';

const DAY_FORMAT: string = 'YYYY-MM-DD';

/** 金额展示（千分位 + 2 位小数）：¥1,234.56 */
export function formatMoney(amount: number): string {
  return `¥${Number(amount ?? 0).toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** 利润率展示：12.3% */
export function formatPercent(rate: number): string {
  return `${Number(rate ?? 0).toFixed(1)}%`;
}

/** 预设区间：今日 / 本月（月初至今）/ 本年（年初至今） */
export function getPresetRange(preset: DateRangePreset): FinanceDateRange {
  const today: string = dayjs().format(DAY_FORMAT);
  if (preset === 'today') {
    return { startDate: today, endDate: today };
  }
  if (preset === 'month') {
    return {
      startDate: dayjs().startOf('month').format(DAY_FORMAT),
      endDate: today,
    };
  }
  return {
    startDate: dayjs().startOf('year').format(DAY_FORMAT),
    endDate: today,
  };
}

/** 默认区间：本月 */
export function getDefaultRange(): FinanceDateRange {
  return getPresetRange('month');
}

/** 趋势图 x 轴标签：YYYY-MM-DD → MM-DD，其余（周/月键）原样 */
export function formatPeriodLabel(period: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/u.test(period)) {
    return period.slice(5).replace('-', '/');
  }
  return period;
}
