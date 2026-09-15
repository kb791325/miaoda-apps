import type { ResponseTimeStats, ThroughputStats } from '@shared/api.interface';

export function buildTimeSeries(
  stats: ResponseTimeStats | null,
  hours: number,
): { time: string; p50: number; p95: number; p99: number }[] {
  if (!stats) return [];
  const now = new Date();
  const result: { time: string; p50: number; p95: number; p99: number }[] = [];
  for (let i = hours - 1; i >= 0; i -= 1) {
    const t = new Date(now.getTime() - i * 3600000);
    const timeLabel = `${String(t.getHours()).padStart(2, '0')}:00`;
    result.push({
      time: timeLabel,
      p50: Math.round(stats.p50Ms * (0.7 + Math.random() * 0.6)),
      p95: Math.round(stats.p95Ms * (0.7 + Math.random() * 0.6)),
      p99: Math.round(stats.p99Ms * (0.7 + Math.random() * 0.6)),
    });
  }
  return result;
}

export function buildThroughputSeries(
  stats: ThroughputStats | null,
  hours: number,
): { time: string; qps: number }[] {
  if (!stats) return [];
  const now = new Date();
  const result: { time: string; qps: number }[] = [];
  for (let i = hours - 1; i >= 0; i -= 1) {
    const t = new Date(now.getTime() - i * 3600000);
    const timeLabel = `${String(t.getHours()).padStart(2, '0')}:00`;
    result.push({
      time: timeLabel,
      qps: Math.round(stats.currentQps * (0.4 + Math.random() * 1.2)),
    });
  }
  return result;
}