// EXPORTS: IGridCard, MOCK_GRID_CARDS
export interface IGridCard {
  id: string
  title: string
  value: string
  growthRate: number
  trend: 'up' | 'down'
  icon: string
  unit: string
}

export const MOCK_GRID_CARDS: IGridCard[] = [
  {
    id: '1',
    title: '昨日消耗',
    value: '2,856,420.00',
    growthRate: 12.5,
    trend: 'up',
    icon: 'DataLine',
    unit: '¥'
  },
  {
    id: '2',
    title: '昨日赠款',
    value: '186,500.00',
    growthRate: 8.3,
    trend: 'up',
    icon: 'Wallet',
    unit: '¥'
  },
  {
    id: '3',
    title: '本周消耗',
    value: '18,234,560.00',
    growthRate: -3.2,
    trend: 'down',
    icon: 'TrendCharts',
    unit: '¥'
  },
  {
    id: '4',
    title: '本月消耗',
    value: '76,892,100.00',
    growthRate: 15.7,
    trend: 'up',
    icon: 'PieChart',
    unit: '¥'
  },
  {
    id: '5',
    title: '本月新开单',
    value: '128',
    growthRate: 22.0,
    trend: 'up',
    icon: 'DocumentAdd',
    unit: '单'
  }
]