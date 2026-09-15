// EXPORTS: IAfterSaleOrder, MOCK_AFTERSALE_ORDERS, MOCK_REFUND_RATE_TREND, MOCK_REASON_CATEGORY
export interface IAfterSaleOrder {
  id: string
  orderNo: string
  productId: string
  productName: string
  reason: '质量问题' | '物流问题' | '描述不符' | '七天无理由' | '其他'
  refundAmount: number
  status: '待处理' | '处理中' | '已完成' | '已拒绝'
  processDuration: number
  isOverdue: boolean
}

export const MOCK_AFTERSALE_ORDERS: IAfterSaleOrder[] = [
  {
    id: '1',
    orderNo: 'DD20240115001',
    productId: 'P001',
    productName: '纯棉修身T恤',
    reason: '质量问题',
    refundAmount: 89,
    status: '待处理',
    processDuration: 2.5,
    isOverdue: false,
  },
  {
    id: '2',
    orderNo: 'DD20240115002',
    productId: 'P003',
    productName: '保湿精华液',
    reason: '七天无理由',
    refundAmount: 168,
    status: '处理中',
    processDuration: 12,
    isOverdue: false,
  },
  {
    id: '3',
    orderNo: 'DD20240114003',
    productId: 'P005',
    productName: '坚果礼盒装',
    reason: '物流问题',
    refundAmount: 128,
    status: '已完成',
    processDuration: 4.8,
    isOverdue: false,
  },
  {
    id: '4',
    orderNo: 'DD20240114004',
    productId: 'P007',
    productName: '北欧风台灯',
    reason: '描述不符',
    refundAmount: 199,
    status: '待处理',
    processDuration: 26,
    isOverdue: true,
  },
  {
    id: '5',
    orderNo: 'DD20240114005',
    productId: 'P002',
    productName: '牛仔外套',
    reason: '其他',
    refundAmount: 259,
    status: '已拒绝',
    processDuration: 8,
    isOverdue: false,
  },
]

export const MOCK_REFUND_RATE_TREND = [
  { date: '01-09', rate: 4.2 },
  { date: '01-10', rate: 4.8 },
  { date: '01-11', rate: 5.1 },
  { date: '01-12', rate: 4.5 },
  { date: '01-13', rate: 5.8 },
  { date: '01-14', rate: 6.2 },
  { date: '01-15', rate: 5.5 },
]

export const MOCK_REASON_CATEGORY = [
  { reason: '质量问题', count: 8 },
  { reason: '物流问题', count: 5 },
  { reason: '描述不符', count: 3 },
  { reason: '七天无理由', count: 12 },
  { reason: '其他', count: 4 },
]