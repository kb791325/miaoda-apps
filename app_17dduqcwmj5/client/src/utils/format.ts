import dayjs from 'dayjs';

export type DateInput = string | number | Date | null | undefined;

/** 格式化为 YYYY-MM-DD；空值/无效返回 '-' */
export const formatDate = (v: DateInput): string => {
  if (v === null || v === undefined || v === '') {
    return '-';
  }
  const parsed: dayjs.Dayjs = dayjs(v);
  return parsed.isValid() ? parsed.format('YYYY-MM-DD') : '-';
};

/** 格式化为 YYYY-MM-DD HH:mm；空值/无效返回 '-' */
export const formatDateTime = (v: DateInput): string => {
  if (v === null || v === undefined || v === '') {
    return '-';
  }
  const parsed: dayjs.Dayjs = dayjs(v);
  return parsed.isValid() ? parsed.format('YYYY-MM-DD HH:mm') : '-';
};

/**
 * 格式化百分比：入参为 0~100 的百分数（如 16.67 → '16.67%'）。
 * 0~1 小数比率需先在数据来源侧换算为百分数再传入。
 * 空值 / 非法值返回 '-'；去除末尾多余的 0。
 */
export const formatPercent = (
  value: number | null | undefined,
  digits: number = 1,
): string => {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '-';
  }
  const fixed: string = value.toFixed(digits);
  const trimmed: string = fixed.includes('.')
    ? fixed.replace(/0+$/u, '').replace(/[.]$/u, '')
    : fixed;
  return `${trimmed}%`;
};
