/**
 * 通用格式化工具函数
 */

/** 金额格式化：千分位 + 2位小数 + 可选前缀 */
export function formatAmount(value: number | string | undefined | null, prefix = '¥'): string {
  if (value === undefined || value === null || value === '') return `${prefix}0.00`;
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return `${prefix}0.00`;
  return `${prefix}${num.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** 整数金额（不带小数） */
export function formatInt(value: number | string | undefined | null, prefix = ''): string {
  if (value === undefined || value === null || value === '') return `${prefix}0`;
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return `${prefix}0`;
  return `${prefix}${Math.round(num).toLocaleString('zh-CN')}`;
}

/** 日期时间格式化 YYYY-MM-DD HH:mm:ss */
export function formatDateTime(d: Date | string | number | undefined | null): string {
  if (d === undefined || d === null || d === '') return '';
  const date = typeof d === 'string' || typeof d === 'number' ? new Date(d) : d;
  if (isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');
  return `${y}-${m}-${day} ${h}:${mi}:${s}`;
}

/** 日期格式化 YYYY-MM-DD */
export function formatDate(d: Date | string | number | undefined | null): string {
  if (d === undefined || d === null || d === '') return '';
  return formatDateTime(d).slice(0, 10);
}

/** 百分比格式化 */
export function formatPercent(value: number | undefined | null, digits = 1): string {
  if (value === undefined || value === null || isNaN(value)) return '0%';
  let v = value;
  if (v > 0 && v <= 1) v = v * 100;
  return `${v.toFixed(digits)}%`;
}

/** 手机号脱敏 */
export function maskPhone(phone: string): string {
  if (!phone || phone.length < 7) return phone || '';
  return phone.slice(0, 3) + '****' + phone.slice(-4);
}

/** 银行账号脱敏 */
export function maskBankAccount(account: string): string {
  if (!account || account.length < 8) return account || '';
  return account.slice(0, 4) + ' **** **** ' + account.slice(-4);
}
