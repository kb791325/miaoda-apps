/**
 * 通用格式化工具函数
 */

/**
 * 千分位金额格式化
 * @param amount 金额数值
 * @param decimals 小数位数，默认2位
 */
export function formatAmount(amount: number, decimals = 2): string {
  return amount.toLocaleString('zh-CN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * 带人民币符号的金额格式化
 * @param amount 金额数值
 */
export function formatCurrency(amount: number): string {
  return `¥${formatAmount(amount)}`;
}

/**
 * 千分位整数格式化（无小数位）
 * @param value 数值
 */
export function formatNumber(value: number): string {
  return value.toLocaleString('zh-CN');
}

/**
 * 日期格式化 YYYY-MM-DD
 * @param date 日期字符串或 Date 对象
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '-';
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
