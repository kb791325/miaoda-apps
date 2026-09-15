// 各一级模块下的分析/仪表盘型子页面(非数据表列表, 而是聚合图表页)
export interface AnalyticsEntry {
  path: string;
  label: string;
}

export const ANALYTICS_NAV: Record<string, AnalyticsEntry[]> = {
  customer: [{ path: '/analytics/customer', label: '转化分析' }],
  finance: [{ path: '/analytics/finance', label: '财务仪表盘' }],
  hr: [{ path: '/analytics/hr', label: '人资看板' }],
};
