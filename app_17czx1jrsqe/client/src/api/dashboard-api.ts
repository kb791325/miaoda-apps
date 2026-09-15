/**
 * Dashboard API 适配层
 * 把服务端 /api/dashboard/* 返回的 snake_case 字段，转成前端 camelCase 字段
 * （前端 DashboardPage 用的是 camelCase，服务端聚合接口用 snake_case）
 */

import { apiGet } from './request';
import type {
  DashboardSummary,
  DashboardRealtime,
  DashboardCharts,
  DashboardRankings,
  TargetItem,
  DashboardPerformance,
} from './types';

function mapSummary(data: any): DashboardSummary {
  return {
    yesterdayConsume: data.yesterday_consume ?? 0,
    yesterdayBonus: data.yesterday_grant ?? 0,
    weekConsume: data.week_consume ?? 0,
    monthConsume: data.period_consume ?? data.month_consume ?? 0,
    newOpenThisMonth: data.month_new_orders ?? 0,
    dayGrowth: data.yesterday_growth ?? 0,
    weekGrowth: data.week_growth ?? 0,
    monthGrowth: data.period_growth ?? data.month_growth ?? 0,
    newOpenGrowth: data.new_open_growth ?? 0,
    updateTime: data.updated_at ?? '',
  };
}

function mapRealtime(data: any): DashboardRealtime {
  const raw = data || {};
  return {
    categories: {
      '内部端口': raw.inner_port ?? 0,
      '外部端口': raw.outer_port ?? 0,
      '集团': raw.group ?? 0,
    },
    total: raw.total ?? 0,
    updateTime: raw.updated_at ?? '',
  };
}

function extractName(v: any): string {
  if (typeof v === 'string') return v;
  if (Array.isArray(v) && v.length > 0) {
    const first = v[0];
    if (typeof first === 'string') return first;
    if (first && typeof first === 'object' && 'text' in first) return String(first.text || '');
  }
  if (v && typeof v === 'object' && 'text' in v) return String(v.text || '');
  return '';
}

function mapCharts(data: any): DashboardCharts {
  const extractPie = (arr: any[] = []) =>
    arr.map((d: any) => ({
      name: extractName(d.name),
      value: Number(d.value) || 0,
    }));
  return {
    groupPie: extractPie(data.group_consume),
    salesBar: (data.sales_consume || []).map((d: any) => ({
      name: extractName(d.name),
      value: Number(d.value) || 0,
    })),
    portPie: extractPie(data.port_consume),
    deptPie: extractPie(data.dept_consume),
    portProfit: extractPie(
      (data.port_profit || []).map((d: any) => ({
        name: extractName(d.name),
        value: Number(d.profit ?? d.value ?? 0),
      })),
    ),
    trendLine: data.trend_line || [],
    timeDimension: data.time_dim ?? 'month',
  };
}

function mapRankings(data: any): DashboardRankings {
  const mapList = (arr: any[] = []) =>
    arr.map((r: any, i: number) => {
      const rawName = extractName(r.name);
      const rawTotal = r.value ?? r.total_consume ?? 0;
      const rawInner = r.inner_consume ?? r.inner ?? 0;
      const rawOuter = r.outer_consume ?? r.outer ?? 0;
      return {
        rank: r.rank ?? i + 1,
        name: rawName,
        total_consume: rawTotal,
        inner_consume: rawInner,
        outer_consume: rawOuter,
        count: r.count ?? 0,
        dept: r.dept ?? '',
      };
    });
  return {
    salesRank: mapList(data.sales),
    groupRank: mapList(data.group),
    portRank: mapList(data.port),
    industryRank: mapList(data.industry),
    newOpenRank: mapList(data.new_open),
  };
}

function mapTargets(data: any): TargetItem[] {
  const list = Array.isArray(data) ? data : data?.list ?? data?.items ?? [];
  return list.map((t: any) => {
    const yearTarget = t.annual_target ?? t.year_target ?? t.yearTarget ?? 0;
    const yearDone = t.actual ?? t.year_actual ?? t.yearDone ?? 0;
    const yearRate = t.rate ?? t.year_rate ?? t.yearRate ?? (yearTarget ? (yearDone / yearTarget) * 100 : 0);
    const monthTarget = t.month_target ?? t.monthTarget ?? 0;
    const monthDone = t.month_actual ?? t.monthDone ?? 0;
    const monthRate = t.month_rate ?? t.monthRate ?? (monthTarget ? (monthDone / monthTarget) * 100 : 0);
    return {
      department: extractName(t.department ?? t.dept ?? ''),
      yearTarget,
      yearDone,
      yearRate,
      monthTarget,
      monthDone,
      monthRate,
    };
  });
}

function mapPerformance(data: any): DashboardPerformance {
  const members = Array.isArray(data?.members) ? data.members : [];
  const tasks = data?.tasks || {};
  return {
    avgScore: data?.avg_score ?? 0,
    totalEmployees: members.length,
    totalTasks: tasks.total ?? 0,
    totalConfirmed: tasks.confirmed ?? 0,
    pendingCount: tasks.pending ?? 0,
    perfList: members.map((m: any, i: number) => ({
      id: m.id ?? m.name ?? `perf-${i}`,
      name: extractName(m.name),
      department: extractName(m.department),
      position: extractName(m.position),
      score: m.score ?? 0,
      level: m.level || m.status || 'B',
      taskCount: m.task_count ?? 0,
      confirmedCount: m.confirmed_count ?? 0,
    })),
  };
}

export const dashboardApi = {
  getSummary: (range = 'month') =>
    apiGet<any>(`/dashboard/summary?range=${range}`).then((res) => {
      if (res.code !== 0) return res as any;
      return { ...res, data: mapSummary(res.data) };
    }),
  getRealtime: () =>
    apiGet<any>('/dashboard/realtime').then((res) => {
      if (res.code !== 0) return res as any;
      return { ...res, data: mapRealtime(res.data) };
    }),
  getCharts: (timeDim: string) =>
    apiGet<any>(`/dashboard/charts?time_dim=${timeDim}`).then((res) => {
      if (res.code !== 0) return res as any;
      return { ...res, data: mapCharts(res.data) };
    }),
  getRankings: (port: string, timeDim: string) => {
    // 前端中文标签 → 后端枚举值映射
    const portMap: Record<string, string> = {
      'all': 'all',
      '全部': 'all',
      'inner': 'inner',
      'inner_port': 'inner',
      '内部端口': 'inner',
      'outer': 'outer',
      'outer_port': 'outer',
      '外部端口': 'outer',
    };
    const portVal = portMap[port] ?? port;
    return apiGet<any>(`/dashboard/rankings?port=${portVal}&time_dim=${timeDim}`).then((res) => {
      if (res.code !== 0) return res as any;
      return { ...res, data: mapRankings(res.data) };
    });
  },
  getTargets: () =>
    apiGet<any>('/dashboard/targets').then((res) => {
      if (res.code !== 0) return res as any;
      return { ...res, data: mapTargets(res.data) };
    }),
  getPerformance: () =>
    apiGet<any>('/dashboard/performance').then((res) => {
      if (res.code !== 0) return res as any;
      return { ...res, data: mapPerformance(res.data) };
    }),
};
