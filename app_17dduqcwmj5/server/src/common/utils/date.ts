/**
 * 业务日期工具：上海（Asia/Shanghai）业务日界与空时间守卫。
 * 统一使用 UTC+8 固定偏移计算，避免容器时区为 UTC 时与上海日界错位。
 */

const SHANGHAI_UTC_OFFSET_MILLIS: number = 8 * 60 * 60 * 1000;

const DAY_PATTERN: RegExp = /^\d{4}-\d{2}-\d{2}$/u;
const HM_PATTERN: RegExp = /^([01]\d|2[0-3]):[0-5]\d$/u;

/** 校验 YYYY-MM-DD 日期串（格式合法且可解析） */
export function isValidDay(value: string): boolean {
  if (!DAY_PATTERN.test(value)) {
    return false;
  }
  return !Number.isNaN(new Date(`${value}T00:00:00Z`).getTime());
}

/** 校验 HH:mm 时间串 */
export function isValidHm(value: string): boolean {
  return HM_PATTERN.test(value);
}

/** 校验可解析的日期时间串（timestamptz 入参） */
export function isValidDateTime(value: string): boolean {
  return typeof value === 'string' && !Number.isNaN(new Date(value).getTime());
}

/**
 * 将可空时间转为 ISO 字符串；过滤 1970 epoch 假值与无效 Date，返回 null。
 */
export function toIsoOrNull(d: Date | null | undefined): string | null {
  if (!d) {
    return null;
  }
  const time: number = d.getTime();
  if (!Number.isFinite(time) || time <= 0 || d.getUTCFullYear() < 2000) {
    return null;
  }
  return d.toISOString();
}

/**
 * 返回上海当日日期键（YYYY-MM-DD）。
 */
export function shanghaiDayKey(now?: Date): string {
  const base: Date = now ?? new Date();
  const shanghaiNow: Date = new Date(
    base.getTime() + SHANGHAI_UTC_OFFSET_MILLIS,
  );
  const year: number = shanghaiNow.getUTCFullYear();
  const month: string = String(shanghaiNow.getUTCMonth() + 1).padStart(2, '0');
  const day: string = String(shanghaiNow.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 返回上海日界对应的 UTC 起止时刻：[start, end)，end 为次日 00:00（上海时间）。
 */
export function shanghaiDayRange(now?: Date): { start: Date; end: Date } {
  const base: Date = now ?? new Date();
  const shanghaiNow: Date = new Date(
    base.getTime() + SHANGHAI_UTC_OFFSET_MILLIS,
  );
  const year: number = shanghaiNow.getUTCFullYear();
  const month: number = shanghaiNow.getUTCMonth();
  const day: number = shanghaiNow.getUTCDate();
  const start: Date = new Date(Date.UTC(year, month, day));
  const end: Date = new Date(Date.UTC(year, month, day + 1));
  return { start, end };
}
