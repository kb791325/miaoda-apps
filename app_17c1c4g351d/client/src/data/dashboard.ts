// EXPORTS: IDashboardSummary, IDailyStat, IChannelGmv, IAlertItem, MOCK_DASHBOARD_SUMMARY, MOCK_DAILY_STATS, MOCK_CHANNEL_GMV, MOCK_ALERTS
export interface IDashboardSummary {
  id: string
  gmv: number
  gmvChange: number
  orders: number
  ordersChange: number
  avgOrderValue: number
  avgOrderValueChange: number
  conversionRate: number
  conversionRateChange: number
  refundRate: number
  refundRateChange: number
  grossMargin: number
  grossMarginChange: number
}

export interface IDailyStat {
  date: string
  gmv: number
  orders: number
  avgOrderValue: number
  conversionRate: number
  refundRate: number
  grossMargin: number
}

export interface IChannelGmv {
  id: string
  name: string
  value: number
  percentage: number
}

export interface IAlertItem {
  id: string
  title: string
  desc: string
  level: 'danger' | 'warning'
  category: 'refund' | 'inventory' | 'traffic' | 'profit'
}

export const MOCK_DASHBOARD_SUMMARY: IDashboardSummary = {
  id: '1',
  gmv: 68520,
  gmvChange: 12.5,
  orders: 428,
  ordersChange: 8.3,
  avgOrderValue: 160.1,
  avgOrderValueChange: 3.9,
  conversionRate: 3.2,
  conversionRateChange: -0.5,
  refundRate: 6.2,
  refundRateChange: 15.7,
  grossMargin: 42.8,
  grossMarginChange: 2.1,
}

// 近30天每日经营数据（GMV 2万-8万波动，有增长趋势）
export const MOCK_DAILY_STATS: IDailyStat[] = [
  { date: '01-01', gmv: 22000, orders: 145, avgOrderValue: 151.7, conversionRate: 2.8, refundRate: 4.2, grossMargin: 38.5 },
  { date: '01-02', gmv: 25800, orders: 168, avgOrderValue: 153.6, conversionRate: 2.9, refundRate: 4.5, grossMargin: 39.1 },
  { date: '01-03', gmv: 24100, orders: 156, avgOrderValue: 154.5, conversionRate: 2.7, refundRate: 4.8, grossMargin: 38.8 },
  { date: '01-04', gmv: 28500, orders: 182, avgOrderValue: 156.6, conversionRate: 3.0, refundRate: 4.3, grossMargin: 39.5 },
  { date: '01-05', gmv: 31200, orders: 198, avgOrderValue: 157.6, conversionRate: 3.1, refundRate: 4.6, grossMargin: 40.2 },
  { date: '01-06', gmv: 29800, orders: 189, avgOrderValue: 157.7, conversionRate: 2.9, refundRate: 5.1, grossMargin: 39.8 },
  { date: '01-07', gmv: 33500, orders: 210, avgOrderValue: 159.5, conversionRate: 3.2, refundRate: 4.9, grossMargin: 40.5 },
  { date: '01-08', gmv: 35200, orders: 221, avgOrderValue: 159.3, conversionRate: 3.0, refundRate: 5.2, grossMargin: 40.1 },
  { date: '01-09', gmv: 32800, orders: 205, avgOrderValue: 160.0, conversionRate: 2.8, refundRate: 5.5, grossMargin: 39.7 },
  { date: '01-10', gmv: 37600, orders: 235, avgOrderValue: 160.0, conversionRate: 3.3, refundRate: 4.8, grossMargin: 41.0 },
  { date: '01-11', gmv: 39100, orders: 242, avgOrderValue: 161.6, conversionRate: 3.1, refundRate: 5.0, grossMargin: 40.8 },
  { date: '01-12', gmv: 36500, orders: 228, avgOrderValue: 160.1, conversionRate: 2.9, refundRate: 5.3, grossMargin: 40.2 },
  { date: '01-13', gmv: 41200, orders: 255, avgOrderValue: 161.6, conversionRate: 3.2, refundRate: 5.1, grossMargin: 41.5 },
  { date: '01-14', gmv: 43800, orders: 270, avgOrderValue: 162.2, conversionRate: 3.4, refundRate: 4.7, grossMargin: 42.0 },
  { date: '01-15', gmv: 40500, orders: 250, avgOrderValue: 162.0, conversionRate: 3.0, refundRate: 5.4, grossMargin: 41.2 },
  { date: '01-16', gmv: 45200, orders: 278, avgOrderValue: 162.6, conversionRate: 3.3, refundRate: 5.0, grossMargin: 42.3 },
  { date: '01-17', gmv: 48100, orders: 295, avgOrderValue: 163.1, conversionRate: 3.5, refundRate: 4.6, grossMargin: 43.0 },
  { date: '01-18', gmv: 46300, orders: 284, avgOrderValue: 163.0, conversionRate: 3.2, refundRate: 5.2, grossMargin: 42.5 },
  { date: '01-19', gmv: 51200, orders: 312, avgOrderValue: 164.1, conversionRate: 3.4, refundRate: 4.9, grossMargin: 43.2 },
  { date: '01-20', gmv: 53800, orders: 328, avgOrderValue: 164.0, conversionRate: 3.6, refundRate: 4.5, grossMargin: 43.8 },
  { date: '01-21', gmv: 50200, orders: 306, avgOrderValue: 164.1, conversionRate: 3.1, refundRate: 5.3, grossMargin: 42.9 },
  { date: '01-22', gmv: 55600, orders: 338, avgOrderValue: 164.5, conversionRate: 3.5, refundRate: 5.0, grossMargin: 44.0 },
  { date: '01-23', gmv: 58200, orders: 352, avgOrderValue: 165.3, conversionRate: 3.7, refundRate: 4.8, grossMargin: 44.5 },
  { date: '01-24', gmv: 54800, orders: 332, avgOrderValue: 165.1, conversionRate: 3.3, refundRate: 5.5, grossMargin: 43.6 },
  { date: '01-25', gmv: 60500, orders: 368, avgOrderValue: 164.4, conversionRate: 3.6, refundRate: 5.2, grossMargin: 44.8 },
  { date: '01-26', gmv: 62800, orders: 380, avgOrderValue: 165.3, conversionRate: 3.8, refundRate: 4.9, grossMargin: 45.2 },
  { date: '01-27', gmv: 59100, orders: 358, avgOrderValue: 165.1, conversionRate: 3.4, refundRate: 5.6, grossMargin: 44.1 },
  { date: '01-28', gmv: 65300, orders: 395, avgOrderValue: 165.3, conversionRate: 3.7, refundRate: 5.8, grossMargin: 43.5 },
  { date: '01-29', gmv: 72100, orders: 435, avgOrderValue: 165.7, conversionRate: 4.0, refundRate: 6.0, grossMargin: 43.2 },
  { date: '01-30', gmv: 68520, orders: 428, avgOrderValue: 160.1, conversionRate: 3.2, refundRate: 6.2, grossMargin: 42.8 },
]

export const MOCK_CHANNEL_GMV: IChannelGmv[] = [
  { id: '1', name: '自然流量', value: 24680, percentage: 36 },
  { id: '2', name: '直通车', value: 18450, percentage: 27 },
  { id: '3', name: '千川', value: 15080, percentage: 22 },
  { id: '4', name: '达人带货', value: 10310, percentage: 15 },
]

export const MOCK_ALERTS: IAlertItem[] = [
  {
    id: '1',
    title: '退款率超标',
    desc: '退款率突增至6.2%，高于警戒线5%',
    level: 'danger',
    category: 'refund',
  },
  {
    id: '2',
    title: '库存预警',
    desc: 'A款连衣裙库存仅剩3天，建议尽快补货',
    level: 'danger',
    category: 'inventory',
  },
  {
    id: '3',
    title: '转化率下降',
    desc: '移动端转化率环比下降8%，需检查详情页',
    level: 'warning',
    category: 'traffic',
  },
  {
    id: '4',
    title: '投放ROI偏低',
    desc: '直通车ROI跌至1.8，低于盈亏平衡线2.0',
    level: 'warning',
    category: 'profit',
  },
]