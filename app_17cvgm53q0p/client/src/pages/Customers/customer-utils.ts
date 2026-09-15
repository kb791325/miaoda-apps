import dayjs from 'dayjs';

/** 从 axios 错误中提取提示信息 */
export function extractErrorMessage(error: unknown): string {
  if (typeof error !== 'object' || error === null) {
    return '操作失败，请稍后重试';
  }
  const err = error as {
    response?: { data?: { error?: { message?: string } } };
    message?: string;
  };
  return (
    err.response?.data?.error?.message ??
    err.message ??
    '操作失败，请稍后重试'
  );
}

/** 金额格式化：¥1,234.5 */
export function formatAmount(value: number): string {
  return `¥${value.toLocaleString('zh-CN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  })}`;
}

/** 时间格式化：YYYY-MM-DD HH:mm */
export function formatDateTime(value: string): string {
  if (!value) return '-';
  return dayjs(value).format('YYYY-MM-DD HH:mm');
}

/** 日期格式化：YYYY-MM-DD */
export function formatDate(value: string): string {
  if (!value) return '-';
  return dayjs(value).format('YYYY-MM-DD');
}

/** 下次跟进时间是否为今天或已过期 */
export function isFollowUpDue(value: string): boolean {
  if (!value) return false;
  return dayjs(value).isBefore(dayjs().endOf('day'));
}
