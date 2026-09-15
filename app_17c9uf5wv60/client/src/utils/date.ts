import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

const BEIJING_TZ = 'Asia/Shanghai';

export function formatBeijingTime(
  date: string | Date | undefined | null,
  format: string = 'YYYY-MM-DD HH:mm',
): string {
  if (!date) return '-';
  const d = dayjs(date).tz(BEIJING_TZ);
  if (!d.isValid()) return '-';
  return d.format(format);
}

export function formatBeijingDate(
  date: string | Date | undefined | null,
): string {
  return formatBeijingTime(date, 'YYYY-MM-DD');
}
